// Rùa Vàng (Golden Turtle): a domed golden shell, a long neck and four paddling flippers.
// Calm and slow. Signature: rises high, raises its head and spins the shell, then bows.
import * as THREE from 'three';
import { neutralPose, smooth, windowed } from './pose.js';
import { lacquer, shadowed, dive } from './children.js';

function build() {
  const shellMat = lacquer(0xc9952f, { metalness: 0.45 });
  const plate = lacquer(0x8a5a1c, { metalness: 0.3 });
  const skin = lacquer(0x6f8a3a);
  const black = lacquer(0x0d0a09);
  const white = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.4 });

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const body = new THREE.Group();
  body.position.y = 0.42;
  spin.add(body);

  const shell = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellMat));
  shell.scale.set(1, 0.6, 1.2);
  body.add(shell);
  // hexagon plates on the shell
  const plates = [[0, 0.36, 0], [0.26, 0.28, 0.25], [-0.26, 0.28, 0.25], [0.26, 0.28, -0.25], [-0.26, 0.28, -0.25], [0, 0.3, 0.4], [0, 0.3, -0.4]];
  for (const [x, y, z] of plates) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 6), plate);
    p.position.set(x, y, z);
    p.lookAt(x * 3, y * 3 + 0.5, z * 3);
    p.rotateX(Math.PI / 2);
    body.add(p);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 32), plate);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1.2, 1);
  body.add(rim);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 0.12, 24), lacquer(0xe8d39a));
  belly.scale.z = 1.2;
  belly.position.y = -0.05;
  body.add(belly);

  // Neck + head
  const neck = new THREE.Group();
  neck.position.set(0, 0.08, 0.68);
  body.add(neck);
  const neckMesh = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, 10), skin));
  neckMesh.rotation.x = Math.PI / 2 - 0.6;
  neckMesh.position.set(0, 0.1, 0.12);
  neck.add(neckMesh);
  const head = new THREE.Group();
  head.position.set(0, 0.24, 0.3);
  neck.add(head);
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin));
  skull.scale.set(1, 0.85, 1.25);
  head.add(skull);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), white);
    eye.position.set(sx * 0.1, 0.05, 0.1);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), black);
    pupil.position.set(sx * 0.115, 0.055, 0.13);
    head.add(pupil);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 12, Math.PI), black);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.03, 0.19);
  head.add(smile);

  // Flippers
  const flippers = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.5, -0.02, sz * 0.42);
    body.add(pivot);
    const f = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), skin));
    f.scale.set(1.4, 0.25, 0.6);
    f.position.x = sx * 0.18;
    pivot.add(f);
    flippers.push({ pivot, sx, sz });
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), skin);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, -0.02, -0.75);
  body.add(tail);

  return {
    root,
    applyPose(p, t = 0) {
      spin.rotation.y = p.spin;
      spin.position.y = p.lift;
      body.rotation.set(p.bodyX, p.bodyY, p.bodyZ);
      neck.rotation.x = -p.neck;
      head.rotation.set(p.headX, p.headY, p.headZ);
      const paddle = p.wingL; // paddling amount
      for (const { pivot, sx, sz } of flippers) {
        const ph = t * 5 + (sx * sz > 0 ? 0 : Math.PI);
        pivot.rotation.y = sx * Math.sin(ph) * 0.5 * paddle;
        pivot.rotation.z = sx * (0.1 + Math.cos(ph) * 0.15 * paddle);
      }
    },
  };
}

function idle(out, t, { speed, localX, localZ }) {
  const n = neutralPose();
  n.wingL = 0.3 + speed * 1.2;
  n.neck = 0.1 + Math.sin(t * 0.9) * 0.1;
  n.headY = Math.sin(t * 0.6) * 0.35 - localX * 0.3;
  n.headX = Math.sin(t * 1.8) * 0.06;
  n.bodyX = -localZ * 0.06 + Math.sin(t * 1.3) * 0.03;
  n.bodyZ = -localX * 0.08 + Math.sin(t * 1.3 + 1) * 0.03;
  n.lift = -0.05 + Math.sin(t * 1.3) * 0.02;
  Object.assign(out, n);
  return out;
}

const wave = {
  label: 'The turtle nods hello',
  duration: 2.0,
  pose(u, t, s) {
    const nod = windowed(s, 0.2, 1.8, 0.3) * Math.max(0, Math.sin(s * 7));
    return { neck: 0.5, headX: 0.4 * nod, wingL: 1.4 };
  },
};

const jump = {
  pose(p) {
    const up = Math.sin(p * Math.PI);
    return { neck: 0.6 * up, headX: -0.3 * up, wingL: 2, bodyX: -0.3 * up };
  },
};

const perform = {
  label: 'The golden turtle rises',
  duration: 5.4,
  pose(u, t, s) {
    const out = {};
    const a = windowed(s, 0.0, 2.2, 0.3);   // rises tall, head high
    const b = windowed(s, 2.0, 4.0, 0.3);   // spins its shell
    const c = windowed(s, 3.9, 5.4, 0.3);   // bows its head
    out.lift = 0.45 * a + 0.2 * b;
    out.neck = 0.7 * a + 0.3 * b - 0.4 * c;
    out.headX = -0.35 * a + 0.5 * c;
    out.bodyX = -0.45 * a + 0.2 * c;
    out.wingL = 1.5 * a + 2 * b;
    out.spin = smooth(2.1, 3.9, s) * Math.PI * 2;
    return out;
  },
};

export const turtle = {
  id: 'turtle',
  name: 'Rùa Vàng',
  nameEn: 'The Golden Turtle',
  blurb: 'A calm, wise turtle with a shining golden shell, one of the four sacred creatures with the dragon and phoenix.',
  signature: 'Rises from the water and spins its shell',
  speed: 0.7,
  top: 1.2,
  seat: { z: -0.05, y: 0.62 },
  portrait: { pos: [2.4, 1.8, 3.6], look: [0, 0.45, 0] },
  build,
  idle,
  actions: { wave, jump, dive: dive('It'), perform },
};
