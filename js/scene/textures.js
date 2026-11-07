// Procedural canvas textures. Everything is drawn in code, so there are no external image files to license.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Small seeded RNG so textures look the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function finish(c, { repeat = [1, 1], srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Lacquered wood: base colour plus soft grain streaks. */
export function woodTexture(base = '#6b2a17', grain = 'rgba(0,0,0,0.18)', seed = 1, repeat = [1, 1]) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = grain;
    g.lineWidth = 0.5 + r() * 2;
    g.beginPath();
    const x = r() * 256;
    g.moveTo(x, 0);
    for (let y = 0; y <= 256; y += 16) g.lineTo(x + Math.sin(y * 0.04 + i) * 4 * r(), y);
    g.stroke();
  }
  // Lacquer sheen
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.08)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return finish(c, { repeat });
}

/** Curved clay roof tiles (ngói), rows of half-cylinders seen from above. */
export function roofTileTexture(repeat = [6, 3]) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#5b2316'; g.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) {
    const grad = g.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#3e160d');
    grad.addColorStop(0.5, '#8a3b22');
    grad.addColorStop(1, '#3e160d');
    g.fillStyle = grad; g.fillRect(x, 0, 16, 128);
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 3);
  return finish(c, { repeat });
}

/** Bamboo blind (mành tre): thin horizontal slats with dark gaps and binding strings. */
export function bambooBlindTexture(repeat = [1, 1]) {
  const [c, g] = canvas(512, 512);
  const r = rng(7);
  g.fillStyle = '#0f1a15'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    const shade = 34 + r() * 22;
    g.fillStyle = `rgb(${shade * 0.55 | 0},${shade * 0.95 | 0},${shade * 0.75 | 0})`;
    g.fillRect(0, y, 512, 4);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(0, y, 512, 1);
  }
  g.fillStyle = 'rgba(20,10,5,0.8)';
  for (let x = 32; x < 512; x += 64) g.fillRect(x, 0, 3, 512);
  return finish(c, { repeat });
}

/** Red banner with gold border, cloud scroll and a stylised dragon pair (original drawing). */
export function bannerTexture() {
  const [c, g] = canvas(1024, 160);
  const grad = g.createLinearGradient(0, 0, 0, 160);
  grad.addColorStop(0, '#9d2315'); grad.addColorStop(1, '#6d140c');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 160);
  g.strokeStyle = '#e0ad4b'; g.lineWidth = 8; g.strokeRect(8, 8, 1008, 144);
  g.lineWidth = 2; g.strokeRect(20, 20, 984, 120);
  g.strokeStyle = '#f1d08a'; g.lineWidth = 6; g.lineCap = 'round';
  // Two mirrored serpentine dragons facing a central pearl.
  for (const dir of [-1, 1]) {
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = 512 + dir * (60 + t * 360);
      const y = 80 + Math.sin(t * Math.PI * 3) * 32 * (1 - t * 0.4);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    // head
    g.beginPath(); g.arc(512 + dir * 70, 80, 16, 0, Math.PI * 2); g.stroke();
    // spines
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const x = 512 + dir * (60 + t * 360);
      const y = 80 + Math.sin(t * Math.PI * 3) * 32 * (1 - t * 0.4);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + dir * 6, y - 16); g.stroke();
    }
  }
  // Pearl with flames
  g.fillStyle = '#f1d08a';
  g.beginPath(); g.arc(512, 80, 18, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#f1d08a'; g.lineWidth = 3;
  for (let a = 0; a < 8; a++) {
    const ang = a / 8 * Math.PI * 2;
    g.beginPath();
    g.moveTo(512 + Math.cos(ang) * 22, 80 + Math.sin(ang) * 22);
    g.lineTo(512 + Math.cos(ang) * 34, 80 + Math.sin(ang) * 34);
    g.stroke();
  }
  return finish(c, { repeat: [1, 1] });
}

/** Gold fringe / tassels hanging under the banner, with alpha. */
export function fringeTexture() {
  const [c, g] = canvas(512, 64);
  g.clearRect(0, 0, 512, 64);
  for (let x = 2; x < 512; x += 8) {
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#f1d08a'); grad.addColorStop(1, 'rgba(176,112,40,0.9)');
    g.fillStyle = grad;
    g.fillRect(x, 0, 4, 54 + (x % 24 === 2 ? 8 : 0));
  }
  g.fillStyle = '#b8212a'; g.fillRect(0, 0, 512, 8);
  const t = finish(c, { repeat: [6, 1] });
  return t;
}

/** Five-colour festival flag (cờ ngũ sắc): coloured bands with a contrasting border. */
export function flagTexture(seed = 0) {
  const [c, g] = canvas(64, 256);
  const palettes = [
    ['#c8272b', '#e9b23a', '#2b7a3d', '#2f4f9e', '#f2efe6'],
    ['#e9b23a', '#c8272b', '#2f4f9e', '#2b7a3d', '#f2efe6'],
  ];
  const cols = palettes[seed % palettes.length];
  cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 51, 64, 52); });
  g.strokeStyle = '#7a1a10'; g.lineWidth = 8; g.strokeRect(0, 0, 64, 256);
  return finish(c);
}

/** Stone/brick pond rim. */
export function stoneTexture(repeat = [10, 1]) {
  const [c, g] = canvas(256, 64);
  const r = rng(3);
  g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 256, 64);
  for (let row = 0; row < 2; row++) {
    for (let x = (row % 2) * -32; x < 256; x += 64) {
      const s = 60 + r() * 30;
      g.fillStyle = `rgb(${s + 30 | 0},${s | 0},${s - 10 | 0})`;
      g.fillRect(x + 2, row * 32 + 2, 60, 28);
    }
  }
  return finish(c, { repeat });
}

/** Red skirt drape for side musician platforms (with vertical pleats). */
export function drapeTexture(repeat = [8, 1]) {
  const [c, g] = canvas(128, 128);
  for (let x = 0; x < 128; x++) {
    const v = 0.65 + 0.35 * Math.sin(x / 128 * Math.PI * 4);
    g.fillStyle = `rgb(${150 * v | 0},${22 * v | 0},${18 * v | 0})`;
    g.fillRect(x, 0, 1, 128);
  }
  g.fillStyle = '#e0ad4b'; g.fillRect(0, 0, 128, 8);
  return finish(c, { repeat });
}
