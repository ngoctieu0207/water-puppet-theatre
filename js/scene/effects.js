// Splash droplets: a pooled THREE.Points system updated on the CPU.
// Each droplet that falls back into the pond leaves a tiny ripple in the water simulation.
import * as THREE from 'three';

const MAX = 900;

/** Little red hearts that float up from a puppet in love (sprites with a canvas-drawn heart). */
export class Hearts {
  constructor(scene) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ff4d6d';
    g.beginPath();
    g.moveTo(32, 56);
    g.bezierCurveTo(4, 36, 6, 10, 22, 10);
    g.bezierCurveTo(28, 10, 32, 15, 32, 20);
    g.bezierCurveTo(32, 15, 36, 10, 42, 10);
    g.bezierCurveTo(58, 10, 60, 36, 32, 56);
    g.fill();
    g.strokeStyle = '#ffd6de'; g.lineWidth = 3; g.stroke();
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.scene = scene;
    this.items = [];
  }

  burst(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false }));
      s.position.set(x + (Math.random() - 0.5) * 0.5, y + Math.random() * 0.2, z + (Math.random() - 0.5) * 0.3);
      const size = 0.22 + Math.random() * 0.14;
      s.scale.set(size, size, 1);
      this.scene.add(s);
      this.items.push({ s, life: 1.6 + Math.random() * 0.6, age: 0, drift: (Math.random() - 0.5) * 0.4, phase: Math.random() * 6 });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const h = this.items[i];
      h.age += dt;
      h.s.position.y += dt * 0.55;
      h.s.position.x += Math.sin(h.age * 3 + h.phase) * dt * 0.25 + h.drift * dt;
      h.s.material.opacity = Math.min(1, h.age * 4) * Math.max(0, 1 - h.age / h.life);
      if (h.age >= h.life) {
        this.scene.remove(h.s);
        h.s.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const h of this.items) { this.scene.remove(h.s); h.s.material.dispose(); }
    this.items.length = 0;
  }
}

export class Splashes {
  constructor(scene, sim) {
    this.sim = sim;
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.alive = new Float32Array(MAX);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlive', new THREE.BufferAttribute(this.alive, 1));
    this.geo = geo;

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: window.innerHeight / 2 } },
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aAlive;
        uniform float uScale;
        varying float vAlive;
        void main() {
          vAlive = aAlive;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aAlive > 0.0 ? aSize * uScale / -mv.z : 0.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vAlive;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.1, d) * vAlive;
          // bright core, cool rim
          vec3 col = mix(vec3(0.75, 0.9, 0.85), vec3(1.0, 0.97, 0.9), smoothstep(0.35, 0.0, d));
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    this.material = mat;
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** Burst of droplets at (x, z). strength ~0.3 (small) to 1.5 (big landing). */
  burst(x, z, strength = 1, radius = 0.35) {
    const n = Math.floor(18 + 55 * strength);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      const a = Math.random() * Math.PI * 2;
      const r = radius * Math.sqrt(Math.random());
      const out = (0.6 + Math.random() * 1.8) * strength;
      this.pos[i * 3] = x + Math.cos(a) * r;
      this.pos[i * 3 + 1] = 0.05;
      this.pos[i * 3 + 2] = z + Math.sin(a) * r;
      this.vel[i * 3] = Math.cos(a) * out;
      this.vel[i * 3 + 1] = (1.8 + Math.random() * 3.2) * Math.min(1.4, 0.5 + strength);
      this.vel[i * 3 + 2] = Math.sin(a) * out;
      this.life[i] = 1;
      this.size[i] = 0.04 + Math.random() * 0.07;
      this.alive[i] = 1;
    }
  }

  /** A jet of water from a point (e.g. the dragon's mouth) arcing forward along (dx, dz). */
  spray(x, y, z, dx, dz, strength = 1) {
    const n = Math.floor(40 * strength);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      const spread = 0.35;
      const sp = 3.2 + Math.random() * 1.6;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = (dx + (Math.random() - 0.5) * spread) * sp;
      this.vel[i * 3 + 1] = 2.2 + Math.random() * 2.2;
      this.vel[i * 3 + 2] = (dz + (Math.random() - 0.5) * spread) * sp;
      this.life[i] = 1.4;
      this.size[i] = 0.05 + Math.random() * 0.07;
      this.alive[i] = 1;
    }
  }

  update(dt) {
    const { pos, vel, life, alive, sim } = this;
    let drips = 0;
    for (let i = 0; i < MAX; i++) {
      if (alive[i] <= 0) continue;
      vel[i * 3 + 1] -= 9.8 * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      life[i] -= dt * 0.6;
      if (pos[i * 3 + 1] < 0 && vel[i * 3 + 1] < 0) {
        // droplet re-enters the water: tiny ripple (capped per frame for cost)
        if (drips++ < 40) sim.disturb(pos[i * 3], pos[i * 3 + 2], 0.12, 0.006);
        alive[i] = 0;
      } else if (life[i] <= 0) {
        alive[i] = 0;
      } else {
        alive[i] = Math.min(1, life[i] * 2);
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlive.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }

  resize(h) { this.material.uniforms.uScale.value = h / 2; }

  clear() { this.alive.fill(0); }
}
