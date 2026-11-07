// The theatre: water pavilion (thủy đình), bamboo blind, side wings, musician platforms,
// festival flags and stage lighting. All geometry is procedural.
import * as THREE from 'three';
import {
  woodTexture, roofTileTexture, bambooBlindTexture, bannerTexture,
  fringeTexture, flagTexture, stoneTexture, drapeTexture,
} from './textures.js';

export const STAGE = {
  waterWidth: 30,
  waterDepth: 18,
  waterCenterZ: -0.5,
  blindZ: -6,
  // Playable area for the puppet (x, z)
  bounds: { minX: -9, maxX: 9, minZ: -5.2, maxZ: 5 },
};

const mat = {};
function materials() {
  if (mat.ready) return mat;
  mat.lacquer = new THREE.MeshPhysicalMaterial({ map: woodTexture('#8a1c12', 'rgba(0,0,0,0.15)', 2), roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  mat.darkWood = new THREE.MeshStandardMaterial({ map: woodTexture('#3b1d12', 'rgba(0,0,0,0.25)', 4, [2, 2]), roughness: 0.7 });
  mat.gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.85, roughness: 0.3, emissive: 0x3a2508, emissiveIntensity: 0.4 });
  const tiles = roofTileTexture([8, 2]);
  mat.roof = new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.75, side: THREE.DoubleSide });
  mat.roofUnder = new THREE.MeshStandardMaterial({ map: woodTexture('#5c1d12', 'rgba(0,0,0,0.2)', 5, [4, 1]), roughness: 0.6, side: THREE.DoubleSide });
  mat.blind = new THREE.MeshStandardMaterial({ map: bambooBlindTexture([3, 1]), roughness: 0.9 });
  mat.banner = new THREE.MeshStandardMaterial({ map: bannerTexture(), roughness: 0.6, emissive: 0x220806, emissiveIntensity: 0.6 });
  mat.fringe = new THREE.MeshStandardMaterial({ map: fringeTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.4 });
  mat.stone = new THREE.MeshStandardMaterial({ map: stoneTexture([14, 1]), roughness: 0.9 });
  mat.drape = new THREE.MeshStandardMaterial({ map: drapeTexture([10, 1]), roughness: 0.8 });
  mat.room = new THREE.MeshStandardMaterial({ color: 0x0b0807, roughness: 1, side: THREE.BackSide });
  mat.lantern = new THREE.MeshStandardMaterial({ color: 0xd8321e, emissive: 0xff4a1c, emissiveIntensity: 1.4, roughness: 0.5 });
  mat.drumSkin = new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.8 });
  mat.ready = true;
  return mat;
}

/**
 * Curved Vietnamese roof: two slopes whose eave corners sweep upwards (đầu đao).
 * Built from segmented planes whose vertices are bent in code.
 */
function makeRoof({ w, d, h, curl = 0.7, sag = 0.18, ornament = true }) {
  const m = materials();
  const g = new THREE.Group();
  const segX = 32, segS = 6;
  for (const side of [1, -1]) {
    const geo = new THREE.PlaneGeometry(1, 1, segX, segS);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5;          // 0..1 along width
      const s = p.getY(i) + 0.5;          // 0 eave .. 1 ridge
      const x = (u - 0.5) * w;
      const edge = Math.pow(Math.abs(u - 0.5) * 2, 3);
      const z = side * (1 - s) * (d / 2) * (1 + edge * 0.12);
      const y = s * h - Math.sin(s * Math.PI) * sag + curl * edge * (1 - s) * (1 - s);
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    const top = new THREE.Mesh(geo, m.roof);
    top.castShadow = true; top.receiveShadow = true;
    g.add(top);
    // Thin gold eave line
    const eave = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.06, 0.06), m.gold);
    eave.position.set(0, 0.0, side * d / 2);
    g.add(eave);
  }
  // Ridge beam with upturned dragon-tail ends
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.16, 0.2), m.roofUnder);
  ridge.position.y = h + 0.02;
  g.add(ridge);
  for (const sx of [-1, 1]) {
    // Upswept ridge ends
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), m.gold);
    horn.position.set(sx * w * 0.4, h + 0.22, 0);
    horn.rotation.z = -sx * 0.55;
    g.add(horn);
    // Gold flourish at each upturned eave corner
    for (const sz of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), m.gold);
      tip.position.set(sx * w / 2, curl + 0.12, sz * (d / 2) * 1.12);
      tip.rotation.z = -sx * 0.7;
      g.add(tip);
    }
  }
  if (!ornament) return addUnderside(g, w, d, m);
  // Central ornament: a gold sun disc with rays on the ridge
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20), m.gold);
  disc.rotation.x = Math.PI / 2;
  disc.position.y = h + 0.42;
  g.add(disc);
  for (let i = 0; i < 8; i++) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), m.gold);
    const a = (i / 8) * Math.PI * 2;
    ray.position.set(Math.cos(a) * 0.34, h + 0.42 + Math.sin(a) * 0.34, 0);
    ray.rotation.z = a - Math.PI / 2;
    g.add(ray);
  }
  return addUnderside(g, w, d, m);
}

// Underside / soffit so the roof reads as solid from below
function addUnderside(g, w, d, m) {
  const under = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, d * 0.95), m.roofUnder);
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.05;
  g.add(under);
  return g;
}

function column(height, radius = 0.14, material) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, height, 14), material || materials().lacquer);
  c.position.y = height / 2;
  c.castShadow = true;
  return c;
}

function lantern() {
  const m = materials();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), m.lantern);
  body.scale.y = 1.25;
  g.add(body);
  for (const y of [0.28, -0.28]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 12), m.gold);
    cap.position.y = y;
    g.add(cap);
  }
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.3, 6), m.gold);
  tassel.position.y = -0.45;
  g.add(tassel);
  return g;
}

function drum(radius = 0.35, height = 0.5) {
  const m = materials();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20, 1, true), m.lacquer);
  g.add(body);
  for (const y of [height / 2, -height / 2]) {
    const skin = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), m.drumSkin);
    skin.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2;
    skin.position.y = y;
    g.add(skin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 24), m.gold);
    rim.rotation.x = Math.PI / 2; rim.position.y = y;
    g.add(rim);
  }
  return g;
}

/** A pole with a waving five-colour flag. Returns { group, update(t) }. */
function flag(height = 3.2, seed = 0) {
  const m = materials();
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, height, 8), m.darkWood);
  pole.position.y = height / 2;
  g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m.gold);
  knob.position.y = height + 0.05;
  g.add(knob);
  const geo = new THREE.PlaneGeometry(0.55, 1.6, 6, 10);
  geo.translate(0.3, -0.8, 0);
  const base = geo.attributes.position.array.slice();
  const flagMat = new THREE.MeshStandardMaterial({ map: flagTexture(seed), side: THREE.DoubleSide, roughness: 0.8 });
  const cloth = new THREE.Mesh(geo, flagMat);
  cloth.position.y = height - 0.05;
  cloth.castShadow = true;
  g.add(cloth);
  const phase = seed * 1.7;
  return {
    group: g,
    update(t) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const k = x / 0.6;
        p.setZ(i, Math.sin(t * 2.2 + x * 6 + y * 1.5 + phase) * 0.08 * k);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

/** Fake volumetric beam: an additive, open cone. */
function lightBeam(color, length, radius) {
  const geo = new THREE.CylinderGeometry(0.15, radius, length, 24, 1, true);
  geo.translate(0, -length / 2, 0);
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geo, m);
}

export function buildStage(scene) {
  const m = materials();
  const root = new THREE.Group();
  scene.add(root);
  const animated = [];

  // ---- Theatre room (dark box) ----
  const room = new THREE.Mesh(new THREE.BoxGeometry(70, 26, 60), m.room);
  room.position.set(0, 10, -6);
  root.add(room);

  // ---- Main pavilion ----
  const pav = new THREE.Group();
  pav.position.z = STAGE.blindZ;
  root.add(pav);

  // Front columns rising out of the water
  const colX = [-5.2, -2.6, 2.6, 5.2];
  for (const x of colX) {
    const c = column(3.6, 0.16);
    c.position.x = x; c.position.y = -0.4 + 1.8;
    pav.add(c);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.2, 12), m.gold);
    base.position.set(x, 3.15, 0);
    pav.add(base);
  }
  // Back columns
  for (const x of [-5.2, 5.2]) {
    const c = column(3.6, 0.16);
    c.position.set(x, 1.4, -3.2);
    pav.add(c);
  }

  // Bamboo blind spanning the front: puppets emerge from beneath it.
  const blind = new THREE.Mesh(new THREE.PlaneGeometry(10.1, 2.35), m.blind);
  blind.position.set(0, 1.2, -0.05);
  blind.receiveShadow = true;
  pav.add(blind);
  // Dark interior behind the blind
  const interior = new THREE.Mesh(new THREE.BoxGeometry(10.4, 3.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x050403, side: THREE.BackSide }));
  interior.position.set(0, 1.4, -1.7);
  pav.add(interior);

  // Red banner with gold dragon motif + gold fringe
  const banner = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.8, 0.08), [m.lacquer, m.lacquer, m.lacquer, m.lacquer, m.banner, m.lacquer]);
  banner.position.set(0, 2.82, 0.05);
  pav.add(banner);
  const fringe = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 0.36), m.fringe);
  fringe.position.set(0, 2.25, 0.11);
  pav.add(fringe);

  // Side panels with round lattice windows
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.12), m.darkWood);
    panel.position.set(sx * 5.95, 1.6, -0.02);
    panel.castShadow = true;
    pav.add(panel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 32), m.gold);
    ring.position.set(sx * 5.95, 1.75, 0.08);
    pav.add(ring);
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.03, 0.03), m.gold);
      bar.position.copy(ring.position);
      bar.rotation.z = (i / 4) * Math.PI;
      pav.add(bar);
    }
  }

  // Lower roof
  const roof1 = makeRoof({ w: 13.4, d: 4.8, h: 1.25, curl: 0.75 });
  roof1.position.set(0, 3.3, -1.5);
  pav.add(roof1);
  // Mid storey wall with gold trim
  const mid = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.0, 2.2), m.lacquer);
  mid.position.set(0, 4.75, -1.5);
  mid.castShadow = true;
  pav.add(mid);
  const midTrim = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.07, 2.3), m.gold);
  midTrim.position.set(0, 5.22, -1.5);
  pav.add(midTrim);
  for (let i = -3; i <= 3; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.04), m.gold);
    post.position.set(i * 0.9, 4.75, -0.38);
    pav.add(post);
  }
  // Upper roof
  const roof2 = makeRoof({ w: 8.4, d: 3.3, h: 1.05, curl: 0.6 });
  roof2.position.set(0, 5.25, -1.5);
  pav.add(roof2);

  // Lanterns at the eaves
  const lanternPositions = [[-6.2, 2.85, 0.9], [6.2, 2.85, 0.9]];
  for (const [x, y, z] of lanternPositions) {
    const l = lantern();
    l.position.set(x, y, z);
    pav.add(l);
    animated.push((t) => { l.rotation.z = Math.sin(t * 1.3 + x) * 0.05; });
  }

  // ---- Side wings ----
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(sx * 8.9, 0, STAGE.blindZ + 0.6);
    root.add(wing);
    for (const x of [-1.5, 1.5]) {
      const c = column(2.6, 0.12);
      c.position.set(x, 1.0, 0);
      wing.add(c);
    }
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.75), m.blind);
    wb.position.set(0, 0.85, -0.1);
    wing.add(wb);
    const wingBanner = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.35, 0.06), m.lacquer);
    wingBanner.position.set(0, 1.95, 0);
    wing.add(wingBanner);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.05, 0.08), m.gold);
    trim.position.set(0, 1.78, 0.01);
    wing.add(trim);
    const r = makeRoof({ w: 4.6, d: 2.6, h: 0.75, curl: 0.45, ornament: false });
    r.position.set(0, 2.25, -0.8);
    wing.add(r);
  }

  // ---- Pond rim (front and sides) ----
  const rimFront = new THREE.Mesh(new THREE.BoxGeometry(STAGE.waterWidth + 1, 0.5, 0.6), m.stone);
  rimFront.position.set(0, -0.05, STAGE.waterCenterZ + STAGE.waterDepth / 2 + 0.25);
  rimFront.receiveShadow = true;
  root.add(rimFront);

  // ---- Musician platforms with red skirts (left & right) ----
  for (const sx of [-1, 1]) {
    const plat = new THREE.Group();
    plat.position.set(sx * 13.2, 0, -0.5);
    root.add(plat);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 13), m.darkWood);
    top.position.y = 0.85;
    top.receiveShadow = true;
    plat.add(top);
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.95), m.drape);
    skirt.rotation.y = -sx * Math.PI / 2;
    skirt.position.set(-sx * 1.6, 0.38, 0);
    plat.add(skirt);
    const d1 = drum(0.38, 0.55); d1.position.set(sx * 0.3, 1.2, -3.5); plat.add(d1);
    const d2 = drum(0.28, 0.42); d2.position.set(sx * 0.6, 1.12, -2.4); plat.add(d2);
    const d3 = drum(0.45, 0.35); d3.position.set(sx * 0.2, 1.1, 1.5); d3.rotation.z = 0.25 * sx; plat.add(d3);
    // A low bench where the musicians would sit
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 3), m.lacquer);
    bench.position.set(sx * 0.6, 1.06, 3.5);
    plat.add(bench);

    for (let i = 0; i < 3; i++) {
      const f = flag(3.0 + (i % 2) * 0.5, i + (sx > 0 ? 3 : 0));
      f.group.position.set(-sx * 1.45, 0.9, -5 + i * 3.2);
      if (sx > 0) f.group.rotation.y = Math.PI;
      plat.add(f.group);
      animated.push(f.update);
    }
  }
  // Tall flags flanking the pavilion
  for (const sx of [-1, 1]) {
    const f = flag(4.6, sx > 0 ? 1 : 2);
    f.group.position.set(sx * 6.9, -0.3, STAGE.blindZ + 0.2);
    if (sx > 0) f.group.rotation.y = Math.PI;
    root.add(f.group);
    animated.push(f.update);
  }

  // ---- Lighting ----
  scene.add(new THREE.HemisphereLight(0x4a3a5a, 0x0d1a14, 0.35));

  // Warm key spot from the front, casting shadows
  const key = new THREE.SpotLight(0xffd7a0, 260, 45, Math.PI / 7, 0.55, 1.6);
  key.position.set(0, 13, 14);
  key.target.position.set(0, 0.5, -1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.camera.near = 5; key.shadow.camera.far = 40;
  scene.add(key, key.target);

  // Coloured overhead stage lights like the theatre's lighting rig (red, amber, blue)
  const rig = [
    { c: 0xff3a3a, x: -5, tx: -3 },
    { c: 0xffb43a, x: 0, tx: 0 },
    { c: 0x3a6dff, x: 5, tx: 3 },
  ];
  for (const r of rig) {
    const s = new THREE.SpotLight(r.c, 140, 30, Math.PI / 9, 0.6, 1.5);
    s.position.set(r.x, 15, -1);
    s.target.position.set(r.tx, 2.5, STAGE.blindZ);
    scene.add(s, s.target);
    const beam = lightBeam(r.c, 14, 2.3);
    beam.position.copy(s.position);
    beam.lookAt(s.target.position);
    beam.rotateX(-Math.PI / 2);
    root.add(beam);
  }

  // Lantern glow
  const lanternLights = [];
  for (const [x, y, z] of lanternPositions) {
    const pl = new THREE.PointLight(0xff6a2a, 6, 9, 1.6);
    pl.position.set(x, y, STAGE.blindZ + z);
    scene.add(pl);
    lanternLights.push(pl);
  }

  // Lights the water shader uses for its highlights (world positions + colours)
  const waterLights = [
    { pos: key.position.clone(), color: new THREE.Color(0xffd7a0).multiplyScalar(1.0) },
    { pos: new THREE.Vector3(-5, 15, -1), color: new THREE.Color(0xff3a3a).multiplyScalar(0.6) },
    { pos: new THREE.Vector3(5, 15, -1), color: new THREE.Color(0x3a6dff).multiplyScalar(0.6) },
    { pos: lanternLights[0].position.clone(), color: new THREE.Color(0xff6a2a).multiplyScalar(0.7) },
  ];

  return {
    root,
    waterLights,
    update(t) { for (const fn of animated) fn(t); },
  };
}
