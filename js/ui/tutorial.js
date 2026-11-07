// Interactive tutorial: each step watches the puppet's stats and moves on once the player has
// actually performed the movement, so it teaches by doing rather than by reading.
const STEPS = [
  {
    text: 'Hold <b>W A S D</b> to glide across the water. Let go and the puppet keeps drifting a little, as a real one does.',
    touch: 'Drag the <b>Glide</b> joystick (bottom left) to move across the water. Let go and the puppet keeps drifting a little, as a real one does.',
    keys: [['KeyW', 'W'], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D']],
    progress: (s, b) => (s.distance - b.distance) / 6,
  },
  {
    text: 'Use <b>↑</b> and <b>↓</b> to rise and sink. Sink all the way down to hide under the surface.',
    touch: 'Hold <b>Rise</b> and <b>Sink</b> (the bar on the right). Sink all the way down to hide under the surface.',
    keys: [['ArrowUp', '↑'], ['ArrowDown', '↓']],
    onStart: (s) => { s.hMin = 0; s.hMax = 0; },
    progress: (s) => (s.hMax - s.hMin) / 1.5,
  },
  {
    text: 'Use <b>←</b> and <b>→</b> to turn. Spin on the spot and listen to the water swirl.',
    touch: 'Hold a <b>Turn</b> button (above the joystick) to spin on the spot and listen to the water swirl.',
    keys: [['ArrowLeft', '←'], ['ArrowRight', '→']],
    progress: (s, b) => (s.turned - b.turned) / (Math.PI * 1.5),
  },
  {
    text: 'Press <b>Space</b> to jump. Jump while gliding to spin in the air.',
    touch: 'Tap the red <b>Jump</b> button. Jump while gliding to spin in the air.',
    keys: [['Space', 'Space']],
    progress: (s, b) => (s.jumps - b.jumps) / 2,
  },
  {
    text: 'Press <b>Q</b> to greet the audience.',
    touch: 'Tap <b>Greet</b> to greet the audience.',
    keys: [['KeyQ', 'Q']],
    progress: (s, b) => s.wave - b.wave,
  },
  {
    text: 'Press <b>F</b> to dive. Keep gliding while under water to pop up somewhere new.',
    touch: 'Tap <b>Dive</b>. Keep gliding while under water to pop up somewhere new.',
    keys: [['KeyF', 'F']],
    progress: (s, b) => s.dive - b.dive,
    delay: 2.8,
  },
  {
    text: 'Press <b>E</b> for your puppet’s signature move.',
    touch: 'Tap <b>Signature</b> (the gold star) for your puppet’s signature move.',
    keys: [['KeyE', 'E']],
    progress: (s, b) => s.perform - b.perform,
    delay: 6.0,
  },
  {
    text: 'You are ready! If your puppet wanders off, the <b>Reset</b> button at the top brings it back. The stage is yours.',
    keys: [],
    final: true,
  },
];

export class Tutorial {
  constructor(el, onDone) {
    this.el = el;
    this.onDone = onDone;
    this.text = el.querySelector('#tut-text');
    this.count = el.querySelector('#tut-count');
    this.keys = el.querySelector('#tut-keys');
    this.bar = el.querySelector('#tut-bar');
    this.next = el.querySelector('#btn-tut-next');
    this.active = false;
  }

  start(stats) {
    this.active = true;
    this.el.hidden = false;
    this.show(0, stats);
  }

  stop() {
    this.active = false;
    this.el.hidden = true;
  }

  show(i, stats) {
    this.i = i;
    if (STEPS[i].onStart) STEPS[i].onStart(stats);
    this.base = { ...stats };
    this.doneAt = null;
    const step = STEPS[i];
    this.count.textContent = `Step ${i + 1} of ${STEPS.length}`;
    this.text.innerHTML = document.body.classList.contains('touch') && step.touch ? step.touch : step.text;
    this.keys.innerHTML = step.keys.map(([code, label]) => `<kbd data-key="${code}" class="${label.length > 1 && label !== '↑' && label !== '↓' && label !== '←' && label !== '→' ? 'kbd-wide' : ''}">${label}</kbd>`).join('');
    this.el.classList.remove('done');
    this.bar.style.width = `${(i / (STEPS.length - 1)) * 100}%`;
    this.next.hidden = !step.final;
    if (step.final) this.next.focus({ preventScroll: true });
  }

  /** Called every frame. now is seconds; returns true when the step just completed. */
  update(stats, now) {
    if (!this.active) return false;
    const step = STEPS[this.i];
    if (step.final) return false;
    const p = Math.max(0, Math.min(1, step.progress(stats, this.base)));
    const total = STEPS.length - 1;
    this.bar.style.width = `${((this.i + p) / total) * 100}%`;
    if (p >= 1 && this.doneAt === null) {
      this.doneAt = now;
      this.el.classList.add('done');
      this.keys.querySelectorAll('kbd').forEach((k) => k.classList.add('done'));
      return true;
    }
    // Give the player time to enjoy the action before moving on
    if (this.doneAt !== null && now - this.doneAt > (step.delay || 1.0)) {
      this.show(this.i + 1, stats);
    }
    return false;
  }

  /** Highlight keys in the tutorial card as they are pressed. */
  setPressed(code, down) {
    const k = this.keys.querySelector(`kbd[data-key="${code}"]`);
    if (k) k.classList.toggle('pressed', down);
  }
}
