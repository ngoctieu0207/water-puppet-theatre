// Entry point: builds the scene, runs the fixed-step simulation loop and wires up the interface.
//
// Screens: landing (about water puppetry) → mode choice → either
//   "Be the puppeteer": puppet selection → tutorial → free performance, or
//   "Tell a story": type a script → the cast performs it.
import * as THREE from 'three';
import { buildStage, STAGE } from './scene/stage.js';
import { buildWater } from './scene/water.js';
import { Splashes, Hearts } from './scene/effects.js';
import { PUPPETS, getPuppet } from './puppets/registry.js';
import { Input, BIT } from './core/input.js';
import { PuppetController, DT } from './core/controller.js';
import { Sound, SONG_INFO } from './core/audio.js';
import { Tutorial } from './ui/tutorial.js';
import { wantsTouch, setupTouch } from './ui/touch.js';
import { parseStory, buildStory, StoryRunner, EXAMPLES } from './story/story.js';

window.__booted = true;
clearTimeout(window.__bootTimer);

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail(reason) {
  $('loading').hidden = true;
  $('fallback-reason').textContent = reason;
  $('fallback').hidden = false;
}

// ---------------------------------------------------------------- renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('stage-canvas'), antialias: true, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 is not available.');
} catch (e) {
  fail('Your browser could not create a WebGL 2 context. ' + (e.message || ''));
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070505);
scene.fog = new THREE.Fog(0x070505, 26, 55);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 120);

// ---------------------------------------------------------------- build
$('loading-text').textContent = 'Raising the pavilion…';
const stage = buildStage(scene);
$('loading-text').textContent = 'Filling the pond…';
const water = buildWater(scene, stage.waterLights);
const splashes = new Splashes(scene, water.sim);
const hearts = new Hearts(scene);
const input = new Input();
const sound = new Sound();

// ---------------------------------------------------------------- actors
// An actor is one puppet on stage: its definition, its 3D model and its controller.
let actors = [];
const DEFAULT_HOME = { x: 0, z: 1.5, height: -0.35 };

function setCast(ids, homes = {}) {
  const next = [];
  for (const id of ids) {
    let a = actors.find((x) => x.id === id && !next.includes(x));
    if (!a) {
      const def = getPuppet(id);
      const puppet = def.build();
      scene.add(puppet.root);
      a = { id, def, puppet, controller: new PuppetController(def, STAGE.bounds), lastSpin: null };
    }
    a.controller.home = { ...DEFAULT_HOME, ...(homes[id] || {}) };
    a.controller.reset();
    a.controller.events.length = 0;
    a.lastSpin = null;
    next.push(a);
  }
  for (const a of actors) if (!next.includes(a)) scene.remove(a.puppet.root);
  actors = next;
  splashes.clear();
  hearts.clear();
}
const player = () => actors[0];

// ---------------------------------------------------------------- state
const state = {
  mode: 'loading',   // loading | landing | modes | select | story-edit | tutorial | perform | story | story-end
  paused: false,
  selected: null,
  story: null,       // { runner, demo, mood }
  storyText: '',
  music: { story: 'auto', play: 'festival' },   // chosen in the music pickers
};
const playing = () => state.mode === 'tutorial' || state.mode === 'perform';
const onStage = () => playing() || state.mode === 'story';

// ---------------------------------------------------------------- camera
const CAM_PLAY = { pos: new THREE.Vector3(0, 4.6, 12.6), look: new THREE.Vector3(0, 1.3, -1.6) };
const CAM_STORY = { pos: new THREE.Vector3(0, 5.2, 14.5), look: new THREE.Vector3(0, 1.2, -1.8) };
const CAM_INTRO = { pos: new THREE.Vector3(6.5, 3.2, 10.5), look: new THREE.Vector3(-1.5, 1.8, -4) };
const camPos = CAM_INTRO.pos.clone();
const camLook = CAM_INTRO.look.clone();
const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
function updateCamera(t, dt) {
  const target = playing() ? CAM_PLAY : state.mode === 'story' || state.mode === 'story-end' ? CAM_STORY : CAM_INTRO;
  tmpPos.copy(target.pos);
  tmpLook.copy(target.look);
  if (!reducedMotion) {
    if (target === CAM_INTRO) { tmpPos.x += Math.sin(t * 0.12) * 1.5; tmpPos.y += Math.sin(t * 0.2) * 0.25; }
    else if (playing() && player()) { tmpLook.x += player().controller.x * 0.12; tmpPos.x += player().controller.x * 0.06; }
  }
  const k = 1 - Math.exp(-dt * (target === CAM_INTRO ? 0.8 : 1.8));
  camPos.lerp(tmpPos, k);
  camLook.lerp(tmpLook, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// ---------------------------------------------------------------- controller events → water + sound
function handleEvents(controller) {
  const audible = onStage();   // the background demo plays silently under the music
  for (const e of controller.events) {
    switch (e.type) {
      case 'ripple': water.sim.disturb(e.x, e.z, e.r, e.amt); break;
      case 'splash':
        splashes.burst(e.x, e.z, e.strength);
        water.sim.disturb(e.x, e.z, 0.7, 0.05 * e.strength);
        break;
      case 'spray': splashes.spray(e.x, e.y, e.z, e.dx, e.dz, e.strength); break;
      case 'hearts': hearts.burst(e.x, e.y, e.z); break;
      case 'jump': if (audible) sound.splash(0.6); break;
      case 'land': if (audible) sound.splash(1.3); break;
      case 'toss': if (audible) sound.splash(0.7 * e.strength); break;
      case 'submerge': if (audible) sound.plunge(1); break;
      case 'emerge': if (audible) sound.emerge(1); break;
      case 'action': if (e.label && playing()) toast(e.label); break;
      default: break;
    }
  }
  controller.events.length = 0;
}

// ---------------------------------------------------------------- stories
const DEMO_STORY = 'The dragon appears and swims around. The phoenix appears and dances. The boy rises and jumps. The girl appears and splashes the boy. The turtle rises and spins. The scholar appears and writes calligraphy. The dragon sprays the phoenix. Everyone spins together. Everyone dives.';

function startStory(text, demo) {
  const story = buildStory(parseStory(text), getPuppet);
  setCast(story.cast, story.homes);
  state.story = { runner: new StoryRunner(story), demo, mood: story.mood };
  if (!demo) sound.setSong(state.music.story === 'auto' ? story.mood : state.music.story);
}

function storyMasks() {
  const s = state.story;
  if (!s) return null;
  if (s.runner.done) {
    if (s.demo) { startStory(DEMO_STORY, true); return storyMasks(); }
    finishStory();
    return null;
  }
  const byId = Object.fromEntries(actors.map((a) => [a.id, a.controller]));
  const m = s.runner.tick(byId);
  return actors.map((a) => m[a.id] || 0);
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let acc = 0;
let renderTime = 0;
let effectiveMask = 0;
const keyEls = [...document.querySelectorAll('#keyguide kbd[data-key]')];
let lastGuideMask = -1;

function stepSimulation() {
  let masks;
  if (state.story && (state.mode !== 'tutorial' && state.mode !== 'perform')) masks = storyMasks();
  if (!masks) masks = actors.map((a, i) => (i === 0 && playing() && input.enabled ? input.read() : 0));
  effectiveMask = playing() ? masks[0] : 0;
  actors.forEach((a, i) => { a.controller.tick(masks[i] || 0); handleEvents(a.controller); });
  water.sim.step();
}

/** Swirl sound follows the fastest-spinning puppet that is standing in the water. */
function updateSwirl(dt) {
  let amount = 0;
  for (const a of actors) {
    const total = a.puppet.root.rotation.y + a.controller.pose.spin;
    if (a.lastSpin !== null && dt > 0) {
      const rate = Math.abs(total - a.lastSpin) / dt;
      if (a.controller.inWater() && !a.controller.airborne) amount = Math.max(amount, (rate - 1.0) / 6);
    }
    a.lastSpin = total;
  }
  sound.setSwirl(onStage() && !state.paused ? amount : 0);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!state.paused && state.mode !== 'loading') {
    acc += dt;
    renderTime += dt;
    let n = 0;
    while (acc >= DT && n < 6) { stepSimulation(); acc -= DT; n++; }
    if (n === 6) acc = 0;
    water.sim.upload();
    splashes.update(dt);
    hearts.update(dt);
    stage.update(renderTime);
    water.update(renderTime);
  }
  const alpha = acc / DT;
  for (const a of actors) {
    const tr = a.controller.transform(alpha);
    a.puppet.root.position.set(tr.x, tr.y, tr.z);
    a.puppet.root.rotation.y = tr.yaw;
    a.puppet.applyPose(a.controller.computePose(renderTime, alpha), renderTime);
  }
  updateSwirl(state.paused ? 0 : dt);
  updateCamera(renderTime, state.paused ? 0 : dt);

  if (effectiveMask !== lastGuideMask && playing()) {
    for (const k of keyEls) k.classList.toggle('pressed', (effectiveMask & BIT[k.dataset.key]) !== 0);
    lastGuideMask = effectiveMask;
  }
  if (tutorial.active && !state.paused && player()) tutorial.update(player().controller.stats, renderTime);

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- portraits
const portraits = {};
function portrait(p) {
  if (p.id in portraits) return portraits[p.id];
  let url = null;
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(360, 220);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffeedd, 0x223322, 1.4));
    const d = new THREE.DirectionalLight(0xffe0b0, 2.2); d.position.set(2, 3, 4); s.add(d);
    const obj = p.build();
    const pose = p.idle({}, 0.6, { speed: 0, localX: 0, localZ: 0, turn: 0 });
    obj.applyPose(pose, 0.6);
    obj.root.rotation.y = -0.35;
    s.add(obj.root);
    const cfg = p.portrait || { pos: [0, 1.5, 5.4], look: [0, 1.15, 0] };
    const cam = new THREE.PerspectiveCamera(30, 360 / 220, 0.1, 20);
    cam.position.set(...cfg.pos); cam.lookAt(...cfg.look);
    r.render(s, cam);
    url = r.domElement.toDataURL();
    r.dispose(); r.forceContextLoss();
  } catch (e) { /* the card simply shows no picture */ }
  return (portraits[p.id] = url);
}

// ---------------------------------------------------------------- screens
const tutorial = new Tutorial($('tutorial'), () => enterPerform());

// Tablets: on-screen joystick and buttons instead of the keyboard guide
const touchMode = wantsTouch();
document.body.classList.toggle('touch', touchMode);
setupTouch($('touch-controls'), input);
input.listeners.add((code, down) => tutorial.setPressed(code, down));

const OVERLAYS = ['landing', 'modes', 'select', 'story-editor', 'story-end', 'pause'];
function showOnly(...ids) {
  for (const id of OVERLAYS) $(id).hidden = !ids.includes(id);
  $('hud').hidden = !ids.includes('hud');
}

function backgroundDemo() {
  // The cast keeps performing silently behind the menus, to the calm village tune
  if (!state.story || !state.story.demo) startStory(DEMO_STORY, true);
  sound.setSong('calm');
}

function enterLanding() {
  state.mode = 'landing';
  state.paused = false;
  input.enabled = false; input.clear();
  tutorial.stop();
  sound.suspend(false);
  showOnly('landing');
  $('landing').scrollTop = 0;
  backgroundDemo();
}

function enterModes() {
  sound.unlock();
  state.mode = 'modes';
  state.paused = false;
  input.enabled = false; input.clear();
  tutorial.stop();
  sound.suspend(false);
  showOnly('modes');
  backgroundDemo();
  $('mode-play').focus({ preventScroll: true });
}

function enterSelect() {
  state.mode = 'select';
  showOnly('select');
  backgroundDemo();
  renderCards();
}

function beginPlay(withTutorial) {
  sound.unlock();
  state.story = null;
  setCast([state.selected]);
  sound.setSong(state.music.play);
  state.mode = withTutorial ? 'tutorial' : 'perform';
  state.paused = false;
  sound.suspend(false);
  showOnly('hud');
  $('btn-reset').hidden = false;
  $('keyguide').hidden = false;
  $('touch-controls').hidden = !touchMode;
  input.enabled = true; input.clear();
  if (document.activeElement) document.activeElement.blur();
  if (withTutorial) tutorial.start(player().controller.stats); else tutorial.stop();
  setGuide(!withTutorial);
  setModeBadge();
  toast(withTutorial ? 'Learn the moves' : 'The stage is yours');
}

function enterPerform() {
  tutorial.stop();
  setGuide(true);
  state.mode = 'perform';
  setModeBadge();
  toast('The stage is yours');
  if (document.activeElement) document.activeElement.blur();
}

// Music pickers: "Auto" (story only) or one of the four pieces. Clicking one plays it as a preview.
function renderMusicPickers() {
  document.querySelectorAll('.music-pick').forEach((wrap) => {
    const ctx = wrap.dataset.context;
    const options = ctx === 'story'
      ? [['auto', { name: 'Auto', vi: 'Tự chọn', icon: '✨', desc: 'Picks the piece that fits your story: battle drums for a fight, a quiet tune for a sad night…' }], ...Object.entries(SONG_INFO)]
      : Object.entries(SONG_INFO);
    wrap.innerHTML = '<div class="mp-head"><h3>Music</h3><span>Tap one to listen</span></div><div class="mp-list"></div>';
    const list = wrap.querySelector('.mp-list');
    for (const [key, info] of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mp-item';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(state.music[ctx] === key));
      b.innerHTML = '<span class="mp-name"></span><span class="mp-vi"></span><span class="mp-desc"></span>';
      b.querySelector('.mp-name').textContent = info.name;
      b.querySelector('.mp-vi').textContent = info.vi;
      b.querySelector('.mp-desc').textContent = info.desc;
      b.addEventListener('click', () => {
        state.music[ctx] = key;
        sound.unlock();
        if (!sound.musicOn) toggleSound();
        sound.setSong(key === 'auto' ? 'calm' : key);
        renderMusicPickers();
      });
      list.appendChild(b);
    }
  });
}
renderMusicPickers();

function enterStoryEditor() {
  state.mode = 'story-edit';
  showOnly('story-editor');
  backgroundDemo();
  $('story-text').value = state.storyText;
  updatePreview();
  $('story-text').focus({ preventScroll: true });
}

function playStory() {
  const text = $('story-text').value.trim() || state.storyText;
  if (!text) return;
  state.storyText = text;
  // Nothing we can act out? Say so instead of playing an empty stage.
  if (!parseStory(text).beats.some((b) => b.actions.length && b.subjects.length)) {
    if (state.mode === 'story-edit') {
      $('story-hint').textContent = 'The puppets could not find anything to do. Try naming a character and an action, e.g. “The dragon appears and dances.”';
    }
    return;
  }
  sound.unlock();
  startStory(text, false);
  state.mode = 'story';
  state.paused = false;
  sound.suspend(false);
  input.enabled = false; input.clear();
  tutorial.stop();
  showOnly('hud');
  $('btn-reset').hidden = true;
  $('keyguide').hidden = true;
  $('touch-controls').hidden = true;
  setModeBadge();
  if (document.activeElement) document.activeElement.blur();
}

function finishStory() {
  state.mode = 'story-end';
  state.story = null;
  showOnly('story-end');
  $('btn-story-again').focus({ preventScroll: true });
}

function setModeBadge() {
  $('hud-mode').textContent = { tutorial: 'Tutorial', perform: 'Performance', story: 'Story' }[state.mode] || '';
}

function setPaused(p) {
  if (!onStage()) return;
  state.paused = p;
  $('pause').hidden = !p;
  const story = state.mode === 'story';
  document.querySelectorAll('.js-play-only').forEach((b) => { b.hidden = story; });
  document.querySelectorAll('.js-story-only').forEach((b) => { b.hidden = !story; });
  input.enabled = !p && playing();
  input.clear();
  sound.setSwirl(0);
  sound.suspend(p);
  clock.getDelta();
  if (p) $('btn-resume').focus({ preventScroll: true });
  else if (document.activeElement) document.activeElement.blur();
}

function setGuide(open) {
  $('keyguide').classList.toggle('collapsed', !open);
  $('btn-keyguide').setAttribute('aria-expanded', String(open));
}

function toggleSound() {
  sound.unlock();
  const on = !sound.musicOn;
  sound.setMusic(on);
  sound.setSfx(on);
  document.querySelectorAll('.js-sound').forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.lbl').textContent = on ? 'Sound on' : 'Sound off';
  });
}

function renderCards() {
  const wrap = $('puppet-cards');
  wrap.innerHTML = '';
  for (const p of PUPPETS) {
    const url = portrait(p);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-pressed', String(state.selected === p.id));
    btn.innerHTML = `
      <div class="card-portrait">${url ? `<img src="${url}" alt="" width="360" height="220" style="width:100%;height:100%;object-fit:cover">` : ''}</div>
      <h3>${p.nameEn}</h3>
      <div class="vi">${p.name}</div>
      <p>${p.blurb}</p>
      <p style="margin-top:6px"><strong>E:</strong> ${p.signature}</p>`;
    btn.addEventListener('click', () => {
      state.selected = p.id;
      renderCards();
      $('btn-begin-tutorial').focus();
    });
    wrap.appendChild(btn);
  }
  $('btn-begin-tutorial').disabled = !state.selected;
  $('btn-skip-tutorial').disabled = !state.selected;
}

// Story editor: type (or pick an example) and press Perform
$('story-chars').textContent = PUPPETS.map((p) => `${p.nameEn.replace('The ', '')} (${p.name})`).join(' · ');
const examplesEl = document.querySelector('.examples');
for (const ex of EXAMPLES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.textContent = ex.title;
  b.addEventListener('click', () => { $('story-text').value = ex.text; updatePreview(); $('story-text').focus(); });
  examplesEl.appendChild(b);
}

function updatePreview() {
  $('btn-story-play').disabled = !$('story-text').value.trim();
  $('story-hint').textContent = '';
}
$('story-text').addEventListener('input', updatePreview);
// Ctrl/Cmd + Enter performs straight away
$('story-text').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); playStory(); } });

// ---------------------------------------------------------------- wiring
document.querySelectorAll('.js-enter').forEach((b) => b.addEventListener('click', enterModes));
document.querySelectorAll('.js-sound').forEach((b) => b.addEventListener('click', toggleSound));
$('btn-modes-back').addEventListener('click', enterLanding);
$('mode-play').addEventListener('click', enterSelect);
$('mode-story').addEventListener('click', enterStoryEditor);
$('btn-select-back').addEventListener('click', enterModes);
$('btn-begin-tutorial').addEventListener('click', () => beginPlay(true));
$('btn-skip-tutorial').addEventListener('click', () => beginPlay(false));
$('btn-story-back').addEventListener('click', enterModes);
$('btn-story-play').addEventListener('click', playStory);
$('btn-story-again').addEventListener('click', playStory);
$('btn-story-edit').addEventListener('click', enterStoryEditor);
$('btn-story-modes').addEventListener('click', enterModes);
$('btn-tut-skip').addEventListener('click', enterPerform);
$('btn-tut-next').addEventListener('click', enterPerform);
$('btn-reset').addEventListener('click', () => {
  if (!player()) return;
  player().controller.reset();
  splashes.burst(player().controller.x, player().controller.z, 0.5);
  toast('Reset');
});
$('btn-pause').addEventListener('click', () => setPaused(true));
$('btn-keyguide').addEventListener('click', () => setGuide($('keyguide').classList.contains('collapsed')));
$('btn-resume').addEventListener('click', () => setPaused(false));
$('btn-pause-tutorial').addEventListener('click', () => beginPlay(true));
$('btn-pause-howto').addEventListener('click', () => $('dlg-howto').showModal());
$('btn-pause-select').addEventListener('click', () => { tutorial.stop(); state.paused = false; enterSelect(); });
$('btn-pause-story').addEventListener('click', () => { state.paused = false; sound.suspend(false); state.story = null; enterStoryEditor(); });
$('btn-pause-modes').addEventListener('click', () => { state.story = null; enterModes(); });
$('btn-pause-home').addEventListener('click', () => { state.story = null; enterLanding(); });

// On-screen buttons should not keep focus (Space would press them again)
document.querySelectorAll('.hud-btn').forEach((b) => b.addEventListener('mouseup', () => b.blur()));

// Esc pauses (a convention, not something to learn)
input.commands.set('Escape', () => { if (!onStage()) return false; setPaused(!state.paused); });

// Browsers only allow audio after an interaction: start the music on the first one.
const firstGesture = () => { sound.unlock(); window.removeEventListener('pointerdown', firstGesture); window.removeEventListener('keydown', firstGesture); };
window.addEventListener('pointerdown', firstGesture);
window.addEventListener('keydown', firstGesture);

window.addEventListener('blur', () => { if (onStage() && !state.paused) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && onStage() && !state.paused) setPaused(true); });

function onResize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w / h < 1.3 ? 52 : 40;
  camera.updateProjectionMatrix();
  water.resize(w, h);
  splashes.resize(h);
}
window.addEventListener('resize', onResize);
onResize();

// ---------------------------------------------------------------- start
$('loading-text').textContent = 'Waking the puppets…';
try { renderer.compile(scene, camera); } catch (e) { /* compiles lazily on first frame */ }
$('loading').hidden = true;
enterLanding();
frame();

// Handle for debugging and automated testing from the browser console.
window.__theatre = {
  state, tutorial, input, sound, parseStory,
  get actors() { return actors; },
  get controller() { return player() && player().controller; },
  /** Advance the simulation by n ticks without waiting for animation frames. */
  advance(n) {
    for (let i = 0; i < n; i++) {
      stepSimulation();
      renderTime += DT;
      splashes.update(DT);
      if (tutorial.active && player()) tutorial.update(player().controller.stats, renderTime);
    }
    water.sim.upload();
  },
};
