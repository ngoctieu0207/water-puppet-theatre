// Ông Đồ: the old village scholar in a dark robe (áo the) and khăn xếp turban, with a long white
// beard and a brush pen. He moves slowly, hands behind his back; his signature is writing
// calligraphy in the air.
import * as THREE from 'three';
import { neutralPose, smooth, windowed } from './pose.js';
import { lacquer, onSphere, shadowed, dive } from './children.js';

function build() {
  const skin = lacquer(0xf1d6bf);
  const robe = lacquer(0x1d2a4a, { roughness: 0.55, clearcoat: 0.4 });    // dark indigo áo the
  const robeIn = lacquer(0xe9e2cf, { roughness: 0.6, clearcoat: 0.2 });   // white inner layer
  const hat = lacquer(0x111111, { roughness: 0.35 });
  const beardMat = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8 });
  const black = lacquer(0x0d0a09);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.8, roughness: 0.3 });
  const lipMat = lacquer(0xb8433b);
  const blush = new THREE.MeshStandardMaterial({ color: 0xeba596, roughness: 0.6, transparent: true, opacity: 0.6 });
  const wood = lacquer(0x6b3a1f);

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  const body = new THREE.Group();
  body.position.y = 0.55;
  spin.add(body);

  // Long robe: flared skirt down into the water, torso, white collar
  const skirt = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.95, 28, 1, true), robe));
  skirt.position.y = -0.15;
  body.add(skirt);
  const torso = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.75, 24), robe));
  torso.position.y = 0.6;
  body.add(torso);
  const shoulders = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), robe));
  shoulders.position.y = 0.96;
  shoulders.scale.set(1.15, 0.45, 1);
  body.add(shoulders);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 20), robeIn);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.03;
  body.add(collar);
  // Diagonal front opening of the robe with gold buttons
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.02), robeIn);
  placket.position.set(0.08, 0.72, 0.29);
  placket.rotation.z = 0.25;
  body.add(placket);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), gold);
    b.position.set(0.15 - i * 0.03, 0.9 - i * 0.16, 0.3);
    body.add(b);
  }

  // Head
  const head = new THREE.Group();
  head.position.y = 1.05;
  body.add(head);
  const HR = 0.27;
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(HR, 32, 24), skin));
  skull.position.y = 0.26;
  skull.scale.set(1, 1.08, 0.97);
  head.add(skull);
  const face = new THREE.Group();
  skull.add(face);
  for (const sx of [-1, 1]) {
    // gentle closed smiling eyes and bushy white brows
    face.add(onSphere(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.011, 6, 14, Math.PI), black), HR, 0.1, sx * 0.33));
    const brow = onSphere(new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 4, 8), beardMat), HR, 0.27, sx * 0.34, 0.01);
    brow.rotateZ(Math.PI / 2 + sx * 0.25);
    face.add(brow);
    face.add(onSphere(new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), blush), HR, -0.1, sx * 0.55, 0.006));
    // drooping moustache
    const mo = onSphere(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 4, 8), beardMat), HR, -0.25, sx * 0.14, 0.015);
    mo.rotateZ(Math.PI / 2 - sx * 0.6);
    face.add(mo);
  }
  face.add(onSphere(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin), HR, -0.06, 0, -0.01));
  const lip = onSphere(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 16, Math.PI), lipMat), HR, -0.32, 0, 0.01);
  lip.rotateZ(Math.PI);
  face.add(lip);
  // Long pointed white beard
  const beard = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 14), beardMat));
  beard.rotation.x = Math.PI;
  beard.position.set(0, -0.42, 0.17);
  face.add(beard);
  // Khăn xếp: a wrapped turban, stacked rings
  for (let i = 0; i < 4; i++) {
    const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(HR * 0.98 - i * 0.012, 0.045, 8, 28), hat));
    ring.rotation.x = Math.PI / 2 - 0.12;
    ring.position.set(0, 0.1 + i * 0.065, -0.01);
    face.add(ring);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.95, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hat);
  crown.position.y = 0.3;
  crown.scale.y = 0.35;
  face.add(crown);

  // Arms in wide sleeves; the right hand holds a brush pen
  const arms = {};
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.31, 0.93, 0);
    body.add(shoulder);
    const sleeve = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.34, 12), robe));
    sleeve.position.y = -0.17;
    shoulder.add(sleeve);
    const elbow = new THREE.Group();
    elbow.position.y = -0.33;
    shoulder.add(elbow);
    const cuff = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.28, 12), robe));
    cuff.position.y = -0.14;
    elbow.add(cuff);
    const hand = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), skin));
    hand.position.y = -0.32;
    elbow.add(hand);
    if (sx < 0) {
      const brush = new THREE.Group();
      brush.position.y = -0.32;
      elbow.add(brush);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), wood);
      stick.position.set(0, -0.08, 0.06);
      stick.rotation.x = 1.2;
      brush.add(stick);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 8), black);
      tip.position.set(0, -0.15, 0.22);
      tip.rotation.x = 1.2 + Math.PI;
      brush.add(tip);
    }
    arms[side] = { shoulder, elbow };
  }

  return {
    root,
    applyPose(p) {
      spin.rotation.y = p.spin;
      spin.position.y = p.lift;
      body.rotation.set(p.bodyX, p.bodyY, p.bodyZ);
      head.rotation.set(p.headX, p.headY, p.headZ);
      arms.L.shoulder.rotation.set(p.shLx, 0, p.shLz);
      arms.R.shoulder.rotation.set(p.shRx, 0, p.shRz);
      arms.L.elbow.rotation.set(p.elLx, 0, p.elLz);
      arms.R.elbow.rotation.set(p.elRx, 0, p.elRz);
    },
  };
}

/** Slow and dignified: slight stoop, hands clasped behind the back, a nodding stroll. */
function idle(out, t, { speed, localX, localZ }) {
  const n = neutralPose();
  n.bodyX = 0.1 + localZ * 0.05;
  n.bodyZ = Math.sin(t * 0.9) * 0.03 - localX * 0.05;
  n.headX = 0.05 + Math.sin(t * 1.8) * 0.03 * (0.3 + speed);
  n.headY = Math.sin(t * 0.45) * 0.18;
  n.headZ = Math.sin(t * 0.9) * 0.04;
  n.lift = Math.abs(Math.sin(t * 1.8)) * 0.02 * speed;
  // hands behind the back
  n.shLx = 0.45; n.shRx = 0.45;
  n.shLz = 0.12; n.shRz = -0.12;
  n.elLx = -0.3; n.elRx = -0.3;
  n.elLz = -0.5; n.elRz = 0.5;
  Object.assign(out, n);
  return out;
}

const wave = {
  label: 'Ông Đồ nods a greeting',
  duration: 2.4,
  pose(u, t, s) {
    // raises the brush hand, nods twice
    const nod = windowed(s, 0.3, 2.1, 0.3) * Math.max(0, Math.sin((s - 0.3) * Math.PI * 2));
    return { shRx: -1.0, shRz: -0.3, elRx: -1.2, headX: 0.35 * nod, bodyX: 0.2 + 0.15 * nod };
  },
};

const jump = {
  pose(p) {
    // a startled little hop, holding his turban
    const up = Math.sin(p * Math.PI);
    return { shLx: -2.2 * up, shLz: 0.5, elLx: -1.6 * up, shRz: -0.9 * up, headX: -0.15 * up };
  },
};

const perform = {
  label: 'Ông Đồ writes calligraphy',
  duration: 5.6,
  pose(u, t, s) {
    const out = {};
    const a = windowed(s, 0, 4.0, 0.3);       // writing strokes in the air
    const b = windowed(s, 3.8, 5.6, 0.3);     // stroke the beard, deep bow
    // Brush hand traces looping strokes; left hand holds the sleeve back
    const k = s * 3.2;
    out.shRx = (-1.25 + 0.35 * Math.sin(k)) * a - 0.4 * b;
    out.shRz = (-0.45 + 0.35 * Math.cos(k * 0.5)) * a;
    out.elRx = (-0.6 - 0.4 * Math.sin(k * 2)) * a - 1.4 * b;
    out.shLx = -0.6 * a - 0.5 * b;
    out.shLz = -0.1 * a;
    out.elLx = -1.3 * a - 1.5 * b;
    out.headX = 0.3 * a + 0.3 * b;
    out.headY = -0.25 * Math.sin(k * 0.5) * a;
    out.bodyX = 0.15 * a + 0.55 * smooth(4.4, 5.0, s) * b;
    out.bodyZ = 0.05 * Math.sin(k) * a;
    return out;
  },
};

export const elder = {
  id: 'elder',
  name: 'Ông Đồ',
  nameEn: 'The Old Scholar',
  blurb: 'A white-bearded village scholar in a dark robe and khăn xếp. Slow, wise and very polite.',
  signature: 'Calligraphy in the air',
  speed: 0.65,
  top: 1.75,
  portrait: { pos: [0, 1.6, 5.6], look: [0, 1.25, 0] },
  build,
  idle,
  actions: { wave, jump, dive: dive('He'), perform },
};
