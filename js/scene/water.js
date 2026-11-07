// Interactive water surface.
//
// Technique: a CPU height-field wave simulation (discrete 2D wave equation on a ~200x120 grid)
// is uploaded every frame as a half-float texture. The water mesh displaces its vertices from it
// and computes normals in the fragment shader. Three.js' Reflector renders a mirrored view of the
// stage that the shader distorts with those normals, so ripples bend the reflections of the
// pavilion and the puppet. This is far cheaper than a fluid simulation and reads well on screen.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { STAGE } from './stage.js';

const CELL = 0.15;

export class WaterSim {
  constructor(width, depth) {
    this.width = width;
    this.depth = depth;
    this.nx = Math.round(width / CELL);
    this.nz = Math.round(depth / CELL);
    const n = this.nx * this.nz;
    this.cur = new Float32Array(n);
    this.prev = new Float32Array(n);
    this.half = new Uint16Array(n);
    this.texture = new THREE.DataTexture(this.half, this.nx, this.nz, THREE.RedFormat, THREE.HalfFloatType);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.needsUpdate = true;
    this.c2 = 0.22;       // wave speed² (stable below 0.5)
    this.damping = 0.986;
  }

  /** World (x, z) → grid coordinates. Row 0 is the front edge (v = 0 in the plane's UVs). */
  toGrid(x, z) {
    const u = (x + this.width / 2) / this.width;
    const v = 0.5 - (z - STAGE.waterCenterZ) / this.depth;
    return [u * (this.nx - 1), v * (this.nz - 1)];
  }

  /** Push the surface down (amount > 0) inside a soft disc. */
  disturb(x, z, radius, amount) {
    const [gx, gz] = this.toGrid(x, z);
    const r = Math.max(1, radius / CELL);
    const x0 = Math.max(1, Math.floor(gx - r)), x1 = Math.min(this.nx - 2, Math.ceil(gx + r));
    const z0 = Math.max(1, Math.floor(gz - r)), z1 = Math.min(this.nz - 2, Math.ceil(gz + r));
    for (let j = z0; j <= z1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d = Math.hypot(i - gx, j - gz) / r;
        if (d < 1) this.cur[j * this.nx + i] -= amount * (0.5 + 0.5 * Math.cos(d * Math.PI));
      }
    }
  }

  heightAt(x, z) {
    const [gx, gz] = this.toGrid(x, z);
    const i = Math.min(this.nx - 1, Math.max(0, Math.round(gx)));
    const j = Math.min(this.nz - 1, Math.max(0, Math.round(gz)));
    return this.cur[j * this.nx + i];
  }

  step() {
    const { nx, nz, cur, prev, c2, damping } = this;
    for (let j = 1; j < nz - 1; j++) {
      const row = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const k = row + i;
        const h = cur[k];
        const lap = cur[k - 1] + cur[k + 1] + cur[k - nx] + cur[k + nx] - 4 * h;
        prev[k] = (2 * h - prev[k] + c2 * lap) * damping;
      }
    }
    // swap
    this.prev = cur;
    this.cur = prev;
  }

  upload() {
    const { cur, half } = this;
    const toHalf = THREE.DataUtils.toHalfFloat;
    for (let i = 0; i < cur.length; i++) half[i] = toHalf(cur[i]);
    this.texture.needsUpdate = true;
  }
}

const waterShader = {
  name: 'PuppetWater',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uHeight: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uCell: { value: CELL },
    uTime: { value: 0 },
    uLightPos: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
    uLightColor: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
    uDeep: { value: new THREE.Color(0x0a1f18) },
    uShallow: { value: new THREE.Color(0x2c5a45) },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    uniform sampler2D uHeight;
    uniform float uTime;
    varying vec4 vReflUv;
    varying vec2 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = uv;
      vec3 p = position;
      float h = texture2D(uHeight, uv).r;
      // gentle ambient swell so the surface is never perfectly still
      float swell = sin(p.x * 0.7 + uTime * 0.9) * 0.012 + sin(p.y * 1.1 - uTime * 0.7) * 0.01;
      p.z += h + swell;
      vReflUv = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(p, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform sampler2D uHeight;
    uniform vec2 uTexel;
    uniform float uCell;
    uniform float uTime;
    uniform vec3 uLightPos[4];
    uniform vec3 uLightColor[4];
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    varying vec4 vReflUv;
    varying vec2 vUv;
    varying vec3 vWorld;

    float hgt(vec2 uv) { return texture2D(uHeight, uv).r; }

    void main() {
      // Normal from the simulated height field (central differences)
      float hL = hgt(vUv - vec2(uTexel.x, 0.0));
      float hR = hgt(vUv + vec2(uTexel.x, 0.0));
      float hD = hgt(vUv - vec2(0.0, uTexel.y));
      float hU = hgt(vUv + vec2(0.0, uTexel.y));
      float dx = (hR - hL) / (2.0 * uCell);
      float dy = (hU - hD) / (2.0 * uCell);
      // Fine procedural detail ripples
      vec2 q = vWorld.xz;
      dx += 0.035 * cos(q.x * 3.1 + uTime * 1.3) + 0.02 * cos(q.x * 7.3 - q.y * 2.0 + uTime * 2.1);
      dy += 0.035 * cos(q.y * 2.7 - uTime * 1.1) + 0.02 * cos(q.y * 6.1 + q.x * 1.7 - uTime * 1.7);
      // plane-local (x, y, z-up) → world: (x, z, -y)
      vec3 N = normalize(vec3(-dx, 1.0, dy));

      vec3 V = normalize(cameraPosition - vWorld);
      float fres = 0.08 + 0.92 * pow(1.0 - max(dot(N, V), 0.0), 3.0);

      vec4 ruv = vReflUv;
      ruv.xy += N.xz * 0.9 * ruv.w * 0.12;
      vec3 refl = texture2DProj(tDiffuse, ruv).rgb;

      float depthMix = smoothstep(-9.0, 8.0, vWorld.z);
      vec3 body = mix(uDeep, uShallow, 0.35 + 0.3 * depthMix);

      vec3 col = mix(body, refl, clamp(fres * 1.05, 0.0, 0.92));

      // Specular glints from the stage lights
      for (int i = 0; i < 4; i++) {
        vec3 L = normalize(uLightPos[i] - vWorld);
        vec3 H = normalize(L + V);
        float s = pow(max(dot(N, H), 0.0), 180.0);
        col += uLightColor[i] * s * 1.6;
      }
      // Crests catch a little light (foam hint)
      float crest = smoothstep(0.025, 0.09, abs(hgt(vUv)));
      col += vec3(0.55, 0.6, 0.5) * crest * 0.25;

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

export function buildWater(scene, waterLights) {
  const { waterWidth: W, waterDepth: D, waterCenterZ } = STAGE;
  const sim = new WaterSim(W, D);
  const geo = new THREE.PlaneGeometry(W, D, sim.nx - 1, sim.nz - 1);
  const pr = Math.min(window.devicePixelRatio, 2);
  const mirror = new Reflector(geo, {
    shader: waterShader,
    textureWidth: Math.max(1, Math.floor(window.innerWidth * pr * 0.6)),
    textureHeight: Math.max(1, Math.floor(window.innerHeight * pr * 0.6)),
    clipBias: 0.003,
    color: 0xffffff,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, 0, waterCenterZ);
  scene.add(mirror);

  // Reflector clones uniforms (and textures), so bind our live objects explicitly.
  const u = mirror.material.uniforms;
  u.uHeight.value = sim.texture;
  u.uTexel.value.set(1 / sim.nx, 1 / sim.nz);
  waterLights.slice(0, 4).forEach((l, i) => {
    u.uLightPos.value[i].copy(l.pos);
    u.uLightColor.value[i].copy(l.color);
  });

  return {
    sim,
    mesh: mirror,
    update(t) { u.uTime.value = t; },
    resize(w, h) {
      const r = Math.min(window.devicePixelRatio, 2) * 0.6;
      mirror.getRenderTarget().setSize(Math.max(1, Math.floor(w * r)), Math.max(1, Math.floor(h * r)));
    },
  };
}
