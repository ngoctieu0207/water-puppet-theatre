// Phượng Hoàng (Phoenix): a bird with a long S-shaped neck, crest, fan-shaped wings and long
// tail plumes. Signature: spreads its wings and twirls in a dance.
import * as THREE from 'three';
import { neutralPose, smooth, windowed } from './pose.js';
import { lacquer, shadowed, dive } from './children.js';

function featherFan(len, width, count, colors) {
  // Several long thin feathers fanning out from one point, as one group
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(width, len, 4, 8), lacquer(colors[i % colors.length], { roughness: 0.45 }));
    f.scale.z = 0.25;
    f.position.y = len / 2;
    const holder = new THREE.Group();
    holder.rotation.z = (i / (count - 1) - 0.5) * 1.1;
    holder.add(f);
    f.castShadow = true;
    g.add(holder);
  }
  return g;
}

function build() {
  const red = lacquer(0xc8301f);
  const orange = lacquer(0xe5782a);
  const gold = lacquer(0xe0ad4b, { metalness: 0.4 });
  const green = lacquer(0x2b8a5a);
  const blue = lacquer(0x2f5fa8);
  const black = lacquer(0x0d0a09);
  const white = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.4 });

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const body = new THREE.Group();
  body.position.y = 0.55;
  spin.add(body);

  const torso = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), red));
  torso.scale.set(0.85, 0.75, 1.15);
  body.add(torso);
  const breast = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), gold));
  breast.position.set(0, 0.06, 0.2);
  breast.scale.set(0.9, 0.95, 0.8);
  body.add(breast);

  // Neck: two joints so it can curve like an S
  const neck = new THREE.Group();
  neck.position.set(0, 0.2, 0.28);
  body.add(neck);
  const n1 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.38, 12), gold));
  n1.position.y = 0.19;
  neck.add(n1);
  const neck2 = new THREE.Group();
  neck2.position.y = 0.36;
  neck.add(neck2);
  const n2 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.32, 12), orange));
  n2.position.y = 0.16;
  neck2.add(n2);

  const head = new THREE.Group();
  head.position.y = 0.34;
  neck2.add(head);
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), red));
  skull.scale.set(0.9, 1, 1.2);
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 10), gold);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.02, 0.2);
  head.add(beak);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), white);
    eye.position.set(sx * 0.085, 0.04, 0.07);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), black);
    pupil.position.set(sx * 0.1, 0.045, 0.09);
    head.add(pupil);
  }
  const crest = featherFan(0.22, 0.025, 5, [0xe0ad4b, 0xc8301f, 0x2b8a5a]);
  crest.position.set(0, 0.1, -0.02);
  crest.rotation.x = -0.5;
  head.add(crest);
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), red);
  wattle.position.set(0, -0.1, 0.12);
  wattle.scale.y = 1.6;
  head.add(wattle);

  // Wings: a fan of long feathers on each shoulder
  const wings = {};
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.28, 0.12, 0.02);
    body.add(pivot);
    const fan = featherFan(0.62, 0.05, 6, [0xe0ad4b, 0xc8301f, 0xe5782a, 0x2b8a5a]);
    fan.rotation.z = -sx * Math.PI / 2;    // point outwards
    fan.rotation.y = sx * 0.2;
    pivot.add(fan);
    wings[side] = pivot;
  }

  // Long tail plumes sweeping back and up
  const tail = new THREE.Group();
  tail.position.set(0, 0.05, -0.36);
  body.add(tail);
  const plumes = featherFan(1.1, 0.045, 7, [0xc8301f, 0x2b8a5a, 0xe0ad4b, 0x2f5fa8]);
  plumes.rotation.x = -1.9;
  tail.add(plumes);
  // "eye" spots at the plume tips
  plumes.children.forEach((holder) => {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), blue);
    spot.scale.z = 0.3;
    spot.position.y = 1.15;
    holder.add(spot);
  });

  return {
    root,
    applyPose(p) {
      spin.rotation.y = p.spin;
      spin.position.y = p.lift;
      body.rotation.set(p.bodyX, p.bodyY, p.bodyZ);
      neck.rotation.x = 0.35 + p.neck;
      neck2.rotation.x = -0.75 - p.neck * 0.5;
      head.rotation.set(p.headX + 0.3, p.headY, p.headZ);
      // wingL/wingR: 0 folded, 1 level, 1.6 raised high
      wings.L.rotation.set(0, -0.9 * (1 - Math.min(1, p.wingL)), 0.9 - p.wingL * 1.1);
      wings.R.rotation.set(0, 0.9 * (1 - Math.min(1, p.wingR)), -0.9 + p.wingR * 1.1);
      tail.rotation.x = -0.15 - p.tail * 0.5;
      plumes.scale.x = 1 + p.tail * 0.6;
    },
  };
}

function idle(out, t, { speed, localX, localZ }) {
  const n = neutralPose();
  const flap = Math.sin(t * 7) * 0.35 * speed;
  n.wingL = 0.1 + Math.sin(t * 1.6) * 0.05 + speed * 0.6 + flap;
  n.wingR = 0.1 + Math.sin(t * 1.6) * 0.05 + speed * 0.6 + flap;
  n.neck = Math.sin(t * 1.2) * 0.12 + localZ * 0.2;
  n.headY = Math.sin(t * 0.8) * 0.3 - localX * 0.3;
  n.headX = Math.sin(t * 2.4) * 0.08;
  n.bodyZ = Math.sin(t * 1.2) * 0.05 - localX * 0.08;
  n.bodyX = localZ * 0.1;
  n.tail = 0.15 + Math.sin(t * 1.0) * 0.1;
  n.lift = Math.sin(t * 2.4) * 0.02;
  Object.assign(out, n);
  return out;
}

const wave = {
  label: 'The phoenix flaps its wings',
  duration: 2.0,
  pose(u, t, s) {
    const f = 0.8 + 0.8 * Math.sin(s * 16);
    return { wingL: f, wingR: f, neck: -0.2, headX: -0.3, lift: 0.08 * (1 + Math.sin(s * 16)) };
  },
};

const jump = {
  pose(p) {
    const f = 0.8 + 0.8 * Math.sin(p * Math.PI * 6);
    return { wingL: f, wingR: f, tail: 0.6, neck: -0.25, headX: -0.2 };
  },
};

const perform = {
  label: 'The phoenix dances',
  duration: 5.6,
  pose(u, t, s) {
    const out = {};
    const a = windowed(s, 0.0, 1.6, 0.3);   // wings spread, tail fanned, head raised
    const b = windowed(s, 1.5, 4.0, 0.3);   // twirl with slow flapping
    const c = windowed(s, 3.9, 5.6, 0.3);   // graceful bow
    const slow = Math.sin(s * 5);
    out.wingL = 1.5 * a + (1.1 + 0.4 * slow) * b + 0.9 * c;
    out.wingR = 1.5 * a + (1.1 + 0.4 * slow) * b + 0.9 * c;
    out.tail = 1 * a + 0.8 * b + 0.4 * c;
    out.neck = -0.3 * a + 0.1 * b + 0.6 * c;
    out.headX = -0.35 * a + 0.4 * c;
    out.bodyX = 0.3 * c;
    out.lift = 0.15 * a + 0.1 * Math.abs(slow) * b;
    out.spin = smooth(1.6, 3.9, s) * Math.PI * 4;
    return out;
  },
};

export const phoenix = {
  id: 'phoenix',
  name: 'Phượng Hoàng',
  nameEn: 'The Phoenix',
  blurb: 'A red-and-gold bird with a crest and long tail plumes, as graceful as the dragon is wild.',
  signature: 'Wing-spread twirling dance',
  speed: 1.0,
  top: 1.75,
  seat: { z: -0.1, y: 0.6 },
  portrait: { pos: [2.2, 1.6, 4.8], look: [0, 0.95, -0.3] },
  build,
  idle,
  actions: { wave, jump, dive: dive('It'), perform },
};
