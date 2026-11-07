// Rồng (Dragon): a long segmented body that weaves in and out of the water behind its head.
// Segments that dip below the surface are hidden by the opaque water, which gives the classic
// "swimming through the waves" look. Signature: rears up and sprays water.
import * as THREE from 'three';
import { neutralPose, smooth, windowed } from './pose.js';
import { lacquer, shadowed, dive } from './children.js';

const N = 13;

function build() {
  const green = lacquer(0x2f7a3e);
  const gold = lacquer(0xd9a441, { metalness: 0.5 });
  const red = lacquer(0xc8301f);
  const white = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.4 });
  const black = lacquer(0x0d0a09);

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  // Body segments with red dorsal fins and gold belly bands
  const segs = [];
  for (let i = 0; i < N; i++) {
    const r = 0.25 * (1 - (i / N) * 0.62);
    const s = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), i % 2 ? gold : green));
    s.scale.set(1, 1, 1.25);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, r * 1.3, 6), red);
    fin.position.y = r * 0.95;
    fin.rotation.x = -0.5;
    s.add(fin);
    spin.add(s);
    segs.push({ mesh: s, r });
  }
  // Tail fin
  const tail = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), red));
  tail.scale.set(1.6, 1, 0.25);
  segs[N - 1].mesh.add(tail);
  tail.position.set(0, 0.05, -0.3);
  tail.rotation.x = -Math.PI / 2 - 0.4;

  // Head
  const head = new THREE.Group();
  spin.add(head);
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), green));
  skull.scale.set(0.95, 0.85, 1.15);
  head.add(skull);
  const snout = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.36), green));
  snout.position.set(0, -0.02, 0.32);
  head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), gold);
  nose.scale.set(1.5, 0.8, 0.9);
  nose.position.set(0, 0.04, 0.5);
  head.add(nose);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.12);
  head.add(jaw);
  const jawMesh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.38), red));
  jawMesh.position.set(0, -0.02, 0.2);
  jaw.add(jawMesh);
  for (const sx of [-1, 1]) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), white);
    tooth.position.set(sx * 0.09, 0.04, 0.36);
    jaw.add(tooth);
    // bulging eyes
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), white);
    eye.position.set(sx * 0.15, 0.13, 0.16);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), black);
    pupil.position.set(sx * 0.17, 0.14, 0.225);
    head.add(pupil);
    const brow = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), red);
    brow.position.set(sx * 0.15, 0.22, 0.1);
    brow.rotation.set(-1.2, 0, sx * -0.6);
    head.add(brow);
    // gold antler-like horns swept back
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.42, 8), gold);
    horn.position.set(sx * 0.12, 0.32, -0.12);
    horn.rotation.set(-0.9, 0, sx * -0.3);
    head.add(horn);
    // long whiskers
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.13, 0.0, 0.48),
      new THREE.Vector3(sx * 0.35, 0.05, 0.42),
      new THREE.Vector3(sx * 0.55, -0.1, 0.25),
      new THREE.Vector3(sx * 0.62, -0.25, 0.05),
    ]);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.012, 6), gold));
  }
  // red mane
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), red);
    m.position.set((i - 2) * 0.06, 0.12 - Math.abs(i - 2) * 0.03, -0.24);
    m.rotation.set(-2.2, 0, (i - 2) * 0.3);
    head.add(m);
  }

  return {
    root,
    applyPose(p, t = 0) {
      spin.rotation.y = p.spin;
      spin.position.y = p.lift;
      const U = 0.22 + p.undulate * 0.32;
      const speed = 3.0;
      for (let i = 0; i < N; i++) {
        const d = i * 0.27;
        const z = 0.45 - d;
        const y = 0.62 + U * Math.sin(t * speed - i * 0.75) - d * 0.015;
        const x = Math.sin(t * 1.4 - i * 0.5) * 0.07 * (1 + p.undulate) + p.bend * d * d * 0.12;
        const { mesh } = segs[i];
        mesh.position.set(x, y, z);
        // orient along the wave
        const dy = U * Math.cos(t * speed - i * 0.75) * 0.75 / 0.27;
        mesh.rotation.set(Math.atan(dy) * 0.6, p.bend * d * 0.2, 0);
      }
      head.position.set(0, 0.95 + U * 0.45 * Math.sin(t * speed + 0.75), 0.75);
      head.rotation.set(p.headX, p.headY, p.headZ);
      jaw.rotation.x = Math.max(0, p.jaw) * 0.7;
    },
  };
}

function idle(out, t, { speed, localX, turn }) {
  const n = neutralPose();
  n.undulate = 0.35 + speed * 0.9;
  n.headX = Math.sin(t * 1.5) * 0.1 - 0.05;
  n.headY = Math.sin(t * 0.8) * 0.25 - localX * 0.3;
  n.headZ = Math.sin(t * 1.5) * 0.05;
  n.bend = (turn || 0) * 0.9;
  n.jaw = 0.15 + Math.sin(t * 2) * 0.1;
  Object.assign(out, n);
  return out;
}

const wave = {
  label: 'The dragon roars',
  duration: 2.0,
  pose(u, t, s) {
    const roar = windowed(s, 0.2, 1.8, 0.3);
    return { headX: -0.55 * roar, jaw: 1 * roar, headZ: 0.08 * Math.sin(s * 30) * roar, undulate: 0.9 };
  },
};

const jump = {
  pose(p) {
    const up = Math.sin(p * Math.PI);
    return { headX: -0.4 * up + 0.4 * (p > 0.5 ? up : 0), undulate: 1.2, jaw: 0.5 * up };
  },
};

const perform = {
  label: 'The dragon sprays water',
  duration: 5.2,
  // Water sprayed from the mouth: f = forward distance, h = height of the mouth
  sprays: [{ t: 0.9, f: 1.2, h: 1.25, s: 1 }, { t: 1.4, f: 1.2, h: 1.25, s: 1 }, { t: 1.9, f: 1.2, h: 1.25, s: 1.2 }, { t: 2.4, f: 1.2, h: 1.25, s: 1.2 }],
  pose(u, t, s) {
    const out = {};
    const a = windowed(s, 0.2, 2.9, 0.3);  // rear up and spray
    const b = windowed(s, 2.8, 4.4, 0.25); // spinning swim
    const c = windowed(s, 4.3, 5.2, 0.2);  // bow
    out.headX = -0.45 * a + 0.4 * c;
    out.jaw = 1 * a;
    out.lift = 0.35 * a;
    out.undulate = 0.5 + 0.8 * b;
    out.headY = 0.15 * Math.sin(s * 4) * a;
    out.spin = smooth(2.9, 4.3, s) * Math.PI * 2;
    return out;
  },
};

export const dragon = {
  id: 'dragon',
  name: 'Rồng',
  nameEn: 'The Dragon',
  blurb: 'A green-and-gold dragon whose long body weaves in and out of the waves.',
  signature: 'Rears up and sprays water',
  speed: 1.15,
  top: 1.45,
  seat: { z: -0.15, y: 0.5 },   // where a rider sits on its back
  portrait: { pos: [3.2, 1.8, 4.2], look: [0, 0.75, -0.9] },
  build,
  idle,
  actions: { wave, jump, dive: dive('It'), perform },
};
