// The two village children of "Nhi Đồng Hý Thủy" (Children Bathing in the Pond).
// Both share one articulated body (hip → body → head, shoulder → elbow → hand) built from
// primitives; the boy and girl differ in costume, hair, build and their signature water play.
import * as THREE from 'three';
import { neutralPose, smooth, windowed } from './pose.js';

const TAU = Math.PI * 2;

function lacquer(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.18, ...extra });
}
const shadowed = (m) => { m.castShadow = true; return m; };

/** Place a feature on the head sphere (lat/lon in radians, lon 0 = facing forward). */
function onSphere(mesh, r, lat, lon, lift = 0.004) {
  const n = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
  mesh.position.copy(n).multiplyScalar(r + lift);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  return mesh;
}

function buildChild(kind) {
  const girl = kind === 'girl';
  const skin = lacquer(0xf4dccb);
  const tummy = lacquer(0xf6d2bf);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.8, roughness: 0.3 });
  const black = lacquer(0x0d0a09, { roughness: 0.25 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x9a1b1b, roughness: 0.5, side: THREE.DoubleSide });
  const lipMat = lacquer(0xd2453f);
  const white = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.4 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xf2a49a, roughness: 0.6, transparent: true, opacity: girl ? 0.95 : 0.8 });
  const joint = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.6 });
  const clothA = lacquer(girl ? 0xb8221a : 0x8e2414, { roughness: 0.45, clearcoat: 0.6 });  // girl's top / khố
  const clothB = lacquer(girl ? 0x16120f : 0x8e2414, { roughness: 0.5, clearcoat: 0.5 });  // girl's black skirt / khố
  const sash = lacquer(0x1f8a4c, { roughness: 0.4, clearcoat: 0.7 });                       // girl's green sash

  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  for (const sx of [-1, 1]) {
    const leg = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(girl ? 0.095 : 0.11, 0.32, 6, 12), skin));
    leg.position.set(sx * 0.16, 0.28, 0);
    spin.add(leg);
  }

  // ---- Body ----
  const body = new THREE.Group();
  body.position.y = 0.55;
  spin.add(body);
  const bellyR = girl ? 0.36 : 0.43;
  // The girl wears a full red top over chest and tummy (like the lacquered village-girl puppets)
  const bellyMesh = shadowed(new THREE.Mesh(new THREE.SphereGeometry(bellyR, 32, 24), girl ? clothA : tummy));
  bellyMesh.position.set(0, 0.32, girl ? 0.0 : 0.03);
  body.add(bellyMesh);
  if (!girl) {
    const navel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a5040 }));
    navel.position.set(0, -0.06, bellyR);
    bellyMesh.add(navel);
  }
  const chest = shadowed(new THREE.Mesh(new THREE.SphereGeometry(girl ? 0.3 : 0.34, 28, 20), girl ? clothA : skin));
  chest.position.set(0, 0.62, -0.02);
  chest.scale.set(1.08, 0.9, 0.95);
  body.add(chest);

  if (girl) {
    // Plain red top (chest and tummy are red above); green sash tied at the waist, with a knot in front
    const sashBand = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.055, 10, 36), sash));
    sashBand.rotation.x = Math.PI / 2; sashBand.position.y = 0.17;
    sashBand.scale.set(1, 1, 1.4);
    body.add(sashBand);
    const knot = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), sash));
    knot.position.set(0, 0.15, 0.37);
    knot.scale.set(1.3, 0.9, 0.6);
    body.add(knot);
    for (const sx of [-1, 1]) {
      const tail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.02), sash));
      tail.position.set(sx * 0.05, 0.03, 0.375);
      tail.rotation.z = sx * 0.18;
      body.add(tail);
    }
    // Long black wrap skirt down into the water
    const skirt = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.46, 0.55, 28, 1, true), clothB));
    skirt.position.y = -0.08;
    body.add(skirt);
  } else {
    // Khố: loincloth with gold waistband and front flap
    const wrap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.26, 28, 1, true), clothA));
    wrap.position.y = 0.04;
    body.add(wrap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.03, 8, 32), gold);
    band.rotation.x = Math.PI / 2; band.position.y = 0.17;
    body.add(band);
    const flap = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.04), clothB));
    flap.position.set(0, -0.08, 0.44); flap.rotation.x = -0.12;
    body.add(flap);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.04, 0.05), gold);
    trim.position.set(0, -0.28, 0.455);
    body.add(trim);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), skin);
  neck.position.y = 0.88;
  body.add(neck);

  // ---- Head ----
  const head = new THREE.Group();
  head.position.y = 0.88;
  body.add(head);
  const HR = girl ? 0.32 : 0.34;
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(HR, 36, 28), skin));
  skull.position.y = 0.3;
  skull.scale.set(1.04, 1, 0.97);
  head.add(skull);
  const face = new THREE.Group();
  skull.add(face);

  for (const sx of [-1, 1]) {
    face.add(onSphere(new THREE.Mesh(new THREE.TorusGeometry(girl ? 0.045 : 0.052, 0.014, 6, 16, Math.PI), black), HR, 0.12, sx * 0.33));
    const brow = onSphere(new THREE.Mesh(new THREE.TorusGeometry(0.07, girl ? 0.008 : 0.011, 6, 16, Math.PI), black), HR, 0.31, sx * 0.34);
    brow.rotateZ(sx * -0.12);
    face.add(brow);
    face.add(onSphere(new THREE.Mesh(new THREE.CircleGeometry(girl ? 0.07 : 0.06, 16), blush), HR, -0.12, sx * 0.56, 0.006));
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skin);
    ear.scale.set(0.45, 1, 0.8);
    ear.position.set(sx * HR, 0, 0);
    face.add(ear);
  }
  const mouthW = girl ? 0.09 : 0.13;
  const mouth = onSphere(new THREE.Mesh(new THREE.CircleGeometry(mouthW, 28, Math.PI, Math.PI), mouthMat), HR, -0.24, 0, 0.012);
  mouth.scale.set(girl ? 1.1 : 1.35, girl ? 0.8 : 1, 1);
  face.add(mouth);
  face.add(onSphere(new THREE.Mesh(new THREE.PlaneGeometry(mouthW * 2.2, 0.03), white), HR, -0.255, 0, 0.016));
  const lip = onSphere(new THREE.Mesh(new THREE.TorusGeometry(mouthW, 0.012, 6, 24, Math.PI), lipMat), HR, -0.24, 0, 0.012);
  lip.scale.copy(mouth.scale);
  lip.rotateZ(Math.PI);
  face.add(lip);
  face.add(onSphere(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin), HR, -0.04, 0, -0.01));

  if (girl) {
    // Black hair cap with a fringe, two buns tied with red ribbons
    const cap = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.05, 32, 16, 0, TAU, 0, Math.PI * 0.52), black);
    cap.rotation.x = -0.35;
    cap.position.y = 0.01;
    face.add(cap);
    for (const sx of [-1, 1]) {
      const bun = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), black));
      bun.position.set(sx * HR * 0.78, HR * 0.72, -0.05);
      face.add(bun);
      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 16), clothA);
      ribbon.position.set(sx * HR * 0.7, HR * 0.62, -0.03);
      ribbon.rotation.set(0.4, sx * 0.9, 0);
      face.add(ribbon);
    }
  } else {
    // A single tuft of hair on the forehead (chỏm tóc)
    const tuft = onSphere(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), black), HR, 0.95, 0, -0.03);
    tuft.scale.set(1.0, 1.2, 0.45);
    face.add(tuft);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 12, Math.PI * 1.3), black);
    curl.position.set(0, HR * 0.98, HR * 0.42);
    curl.rotation.set(0, Math.PI / 2, 0.4);
    face.add(curl);
  }

  // ---- Arms ----
  const arms = {};
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * (girl ? 0.33 : 0.37), 0.66, 0);
    body.add(shoulder);
    // bare shoulders: the girl's top is sleeveless
    shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), skin));
    const upper = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(girl ? 0.065 : 0.075, 0.2, 6, 12), skin));
    upper.position.y = -0.16;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    shoulder.add(elbow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 16), joint);
    ring.rotation.x = Math.PI / 2;
    elbow.add(ring);
    const fore = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(girl ? 0.06 : 0.068, 0.18, 6, 12), skin));
    fore.position.y = -0.15;
    elbow.add(fore);
    const hand = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), skin));
    hand.position.y = -0.32;
    hand.scale.set(0.85, 1.1, 0.7);
    elbow.add(hand);
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
      bellyMesh.scale.set(p.belly, 1 / Math.sqrt(p.belly), p.belly * 0.94);
    },
  };
}

// ---- Movement styles: the boy is bouncy and stompy, the girl sways and glides ----

/** Boy: bobs up and down, rocks side to side as if stomping, arms swing wide. */
function boyIdle(out, t, { speed, localX, localZ }) {
  const n = neutralPose();
  // Fixed rhythms: only the amplitude follows speed (changing the frequency made the puppet jitter)
  const bounce = Math.abs(Math.sin(t * 3.4));
  n.lift = bounce * (0.03 + speed * 0.05);
  n.bodyZ = Math.sin(t * 1.7) * (0.06 + speed * 0.08) - localX * 0.1;
  n.bodyX = localZ * 0.12 + bounce * 0.02;
  n.headZ = Math.sin(t * 1.3 + 0.6) * 0.1;
  n.headX = Math.sin(t * 5.2) * 0.04 - 0.04;
  n.headY = Math.sin(t * 0.7) * 0.15;
  const swing = Math.sin(t * 7) * 0.8 * speed;
  n.shLz = 0.4 + Math.sin(t * 2.6) * 0.08 + speed * 0.3;
  n.shRz = -0.4 - Math.sin(t * 2.6 + 1) * 0.08 - speed * 0.3;
  n.shLx = -0.1 + swing;
  n.shRx = -0.1 - swing;
  n.elLx = -0.5; n.elRx = -0.5;
  n.belly = 1 + bounce * 0.03;
  Object.assign(out, n);
  return out;
}

/** Girl: slow side-to-side sway, hands soft in front, arms float out like wings as she glides. */
function girlIdle(out, t, { speed, localX, localZ }) {
  const n = neutralPose();
  const sway = Math.sin(t * 1.1);
  n.bodyZ = sway * 0.07 - localX * 0.06;
  n.bodyY = Math.sin(t * 0.55) * 0.12;
  n.bodyX = localZ * 0.05;
  n.headZ = -sway * 0.12 + 0.05;           // head tilts against the sway
  n.headX = 0.04;
  n.headY = Math.sin(t * 0.55 + 1) * 0.1;
  n.lift = (0.5 + 0.5 * Math.sin(t * 2.2)) * 0.02;
  const glide = Math.min(1, speed * 1.4);
  // Resting: hands folded softly at the waist. Gliding: arms open out to the sides.
  n.shLx = -0.55 * (1 - glide) - 0.15 * glide;
  n.shRx = -0.55 * (1 - glide) - 0.15 * glide;
  n.shLz = -0.08 * (1 - glide) + (1.0 + Math.sin(t * 3) * 0.12) * glide;
  n.shRz = 0.08 * (1 - glide) - (1.0 + Math.sin(t * 3 + 1.5) * 0.12) * glide;
  n.elLx = -1.15 * (1 - glide) - 0.25 * glide;
  n.elRx = -1.15 * (1 - glide) - 0.25 * glide;
  n.elLz = 0.2 * glide * Math.sin(t * 3);
  n.elRz = -0.2 * glide * Math.sin(t * 3 + 1.5);
  Object.assign(out, n);
  return out;
}

const boyWave = {
  label: 'He waves to the audience',
  duration: 2.2,
  pose(u, t) {
    // big, whole-arm wave with a little hop in it
    const flick = Math.sin(t * 11);
    return { shRz: -2.6 - 0.25 * flick, shRx: -0.2, elRz: -0.3 - 0.5 * (0.5 + 0.5 * flick), headZ: -0.2, headY: -0.15, bodyZ: -0.1 + 0.05 * flick, lift: 0.06 * Math.abs(flick) };
  },
};

const girlWave = {
  label: 'She waves shyly',
  duration: 2.4,
  pose(u, t) {
    // small wave beside the cheek with the left hand, the other hand at the chest, head tilted
    const flick = Math.sin(t * 9);
    return {
      shLz: 0.55, shLx: -0.9, elLx: -1.9, elLz: 0.25 * flick,
      shRx: -0.6, shRz: 0.1, elRx: -1.4,
      headZ: 0.22, headY: 0.15, bodyZ: 0.06,
    };
  },
};

const boyJump = {
  pose(p) {
    // tucks in: knees-up feel, fists up, head back laughing
    const up = Math.sin(p * Math.PI);
    return {
      shLz: 0.4 + 1.9 * up, shRz: -0.4 - 1.9 * up, elLx: -0.2 - 0.8 * up, elRx: -0.2 - 0.8 * up,
      headX: -0.3 * up, bodyX: -0.12 * up, belly: 1 - 0.05 * up,
    };
  },
};

const girlJump = {
  pose(p) {
    // arms open like wings, body arches gracefully
    const up = Math.sin(p * Math.PI);
    return {
      shLz: 0.3 + 1.3 * up, shRz: -0.3 - 1.3 * up, shLx: -0.2 * up, shRx: -0.2 * up,
      elLx: -0.1, elRx: -0.1, elLz: 0.3 * up, elRz: -0.3 * up,
      headX: -0.2 * up, bodyX: -0.15 * up,
    };
  },
};

const dive = (name) => ({
  label: `${name} dives into the pond`,
  duration: 2.8,
  depth(u) {
    const down = smooth(0.0, 0.2, u);
    const up = smooth(0.52, 0.78, u);
    const bob = Math.sin(smooth(0.78, 1.0, u) * Math.PI) * 0.18;
    return -2.6 * down + 2.6 * up + bob;
  },
  pose(u) {
    const going = 1 - smooth(0.45, 0.6, u);
    return {
      shLz: 2.8 * going + 1.5 * (1 - going), shRz: -(2.8 * going + 1.5 * (1 - going)),
      elLx: -0.1, elRx: -0.1, bodyX: 0.25 * going, headX: 0.3 * going - 0.2 * (1 - going),
      spin: smooth(0.55, 0.95, u) * TAU,
    };
  },
});

// Boy: pats his tummy laughing, slaps the water with both hands, spins, bows ------------
const boyPerform = {
  label: 'Belly-laugh water slap',
  duration: 6.0,
  // Moments when hands hit the water: f = distance in front of the puppet
  splashes: [
    { t: 1.95, f: 0.45, s: 0.8 }, { t: 2.45, f: 0.45, s: 0.8 },
    { t: 2.95, f: 0.45, s: 0.9 }, { t: 3.45, f: 0.45, s: 1.1 },
  ],
  sprays: [{ t: 2.0, f: 0.5, h: 0.5, s: 0.6 }, { t: 3.0, f: 0.5, h: 0.5, s: 0.6 }, { t: 3.5, f: 0.5, h: 0.5, s: 0.8 }],
  pose(u, t, s) {
    const out = {};
    const a = windowed(s, 0, 1.6, 0.25);       // tummy pat + laugh
    const pat = Math.sin(s * 18);
    const b = windowed(s, 1.5, 3.7, 0.25);     // slap the water, alternating hands
    const ph = ((s - 1.45) / 0.5) % 1;         // one slap per half second
    const lift = Math.sin(Math.min(1, ph) * Math.PI);  // 0 at the slap, 1 raised
    const left = Math.floor((s - 1.45) / 0.5) % 2 === 0;
    const c = windowed(s, 3.6, 4.8, 0.2);      // spin
    const d = windowed(s, 4.7, 6.0, 0.25);     // bow
    const raiseL = left ? lift : 0.3, raiseR = left ? 0.3 : lift;
    out.shLx = -0.75 * a + (-0.5 - 1.6 * raiseL) * b - 0.9 * d;
    out.shRx = -0.75 * a + (-0.5 - 1.6 * raiseR) * b - 0.9 * d;
    out.shLz = 0.15 * a + 0.35 * b + 1.55 * c + 0.3 * d;
    out.shRz = -0.15 * a - 0.35 * b - 1.55 * c - 0.3 * d;
    out.elLx = (-1.3 - 0.35 * pat) * a - 0.4 * raiseL * b - 0.4 * d;
    out.elRx = (-1.3 + 0.35 * pat) * a - 0.4 * raiseR * b - 0.4 * d;
    out.headX = (-0.3 + 0.06 * Math.sin(s * 22)) * a + 0.15 * b + 0.35 * d;
    out.bodyX = -0.08 * a + 0.22 * b + 0.5 * d;
    out.bodyZ = (left ? 0.1 : -0.1) * b;
    out.belly = 1 + 0.05 * Math.sin(s * 22) * a;
    out.spin = smooth(3.7, 4.65, s) * TAU;
    return out;
  },
};

// Girl: scoops water and tosses it up, twirls twice, bows with folded hands -------------
const girlPerform = {
  label: 'Water toss and twirl',
  duration: 5.6,
  splashes: [{ t: 0.85, f: 0.3, s: 1.0 }, { t: 1.85, f: 0.3, s: 1.2 }],
  // the thrown water arcs forward, far enough to reach someone standing beside her
  sprays: [{ t: 0.9, f: 0.4, h: 1.1, s: 0.8 }, { t: 1.9, f: 0.4, h: 1.1, s: 1.0 }],
  pose(u, t, s) {
    const out = {};
    const a = windowed(s, 0, 2.3, 0.2);        // scoop + toss, twice
    const cyc = (s % 1.0);                     // 0..1 per toss
    const scoop = 1 - smooth(0.35, 0.85, cyc); // 1 = hands down in the water, 0 = thrown up
    const b = windowed(s, 2.2, 4.1, 0.2);      // twirl
    const c = windowed(s, 4.0, 5.6, 0.25);     // bow, hands folded at the chest
    out.shLx = (-0.35 - 2.4 * (1 - scoop)) * a - 1.05 * c;
    out.shRx = (-0.35 - 2.4 * (1 - scoop)) * a - 1.05 * c;
    out.shLz = 0.15 * a + 1.35 * b - 0.32 * c;
    out.shRz = -0.15 * a - 1.35 * b + 0.32 * c;
    out.elLx = -0.3 * a - 0.2 * b - 0.95 * c;
    out.elRx = -0.3 * a - 0.2 * b - 0.95 * c;
    out.bodyX = 0.35 * scoop * a + 0.45 * c;
    out.headX = (0.25 * scoop - 0.3 * (1 - scoop)) * a + 0.3 * c;
    out.headZ = 0.15 * Math.sin(s * 6) * b;
    out.lift = 0.1 * Math.abs(Math.sin(s * 6)) * b;
    out.spin = smooth(2.3, 4.0, s) * TAU * 2;
    return out;
  },
};

// Helpers shared with the other puppets
export { lacquer, onSphere, shadowed, dive };

export const boy = {
  id: 'boy',
  name: 'Cậu Bé',
  nameEn: 'The Boy',
  blurb: 'A round-bellied village boy with a tuft of hair who laughs louder than he splashes.',
  signature: 'Belly-laugh water slap',
  build: () => buildChild('boy'),
  idle: boyIdle,
  actions: { wave: boyWave, jump: boyJump, dive: dive('He'), perform: boyPerform },
};

export const girl = {
  id: 'girl',
  name: 'Cô Bé',
  nameEn: 'The Girl',
  blurb: 'A village girl in a sleeveless red top with a green sash, her hair in two buns, quick to toss water at the sky.',
  signature: 'Water toss and twirl',
  build: () => buildChild('girl'),
  idle: girlIdle,
  actions: { wave: girlWave, jump: girlJump, dive: dive('She'), perform: girlPerform },
};
