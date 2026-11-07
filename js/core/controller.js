// Puppet movement and action logic. Runs on a fixed 60 Hz tick and only reads the input bitmask,
// so the same inputs always give the same performance. The story mode relies on that: a script
// becomes a list of input masks per puppet.
import { BIT } from './input.js';
import { neutralPose, blendPose, smooth } from '../puppets/pose.js';
import { EMOTES } from '../puppets/emotes.js';

// Story-only acting moves, triggered by their own bits
const EMOTE_BITS = [['fly', BIT.Fly], ['scold', BIT.Scold], ['sad', BIT.Sad], ['love', BIT.Love], ['laugh', BIT.Laugh]];

export const DT = 1 / 60;
const MAX_SPEED = 3.4;
const ACCEL = 6.5;        // response when pushing
const DECEL = 3.2;        // glide-out when released (water drag)
const TURN_SPEED = 2.8;
const H_MIN = -2.1;       // fully hidden under water
const H_MAX = 0.05;       // highest: feet just touching the surface (a puppet never leaves the water)
const H_DEFAULT = -0.35;
const PUPPET_TOP = 1.85;  // height of the head above the puppet's base
const GRAVITY = 15;
const JUMP_V = 5.6;

const ease = (k, dt) => 1 - Math.exp(-k * dt);
export const HAND_GAP = 1.55;   // distance between two puppets holding hands (their arms meet in the middle)

/** Start or stop two puppets holding hands. The follower walks beside the leader. */
export function holdHands(leader, follower) {
  leader.holding = follower;
  follower.handOf = leader;
  follower.mount = null;
}
export function releaseHands(c) {
  const other = c.holding || c.handOf;
  if (other) { other.holding = null; other.handOf = null; }
  c.holding = null; c.handOf = null;
}

export class PuppetController {
  constructor(def, bounds) {
    this.def = def;
    this.bounds = bounds;
    this.maxSpeed = MAX_SPEED * (def.speed || 1);
    this.top = def.top || PUPPET_TOP;
    this.home = { x: 0, z: 1.5, height: H_DEFAULT };
    this.events = [];
    this.stats = { distance: 0, turned: 0, hMin: 0, hMax: 0, jumps: 0, wave: 0, perform: 0, dive: 0 };
    this.pose = neutralPose();
    this._base = neutralPose();
    this.reset();
  }

  /** Reset to the home position, or restore a full snapshot from getState(). */
  reset(snapshot) {
    const h = this.home;
    Object.assign(this, {
      x: h.x, z: h.z, vx: 0, vz: 0, yaw: 0, yawVel: 0,
      height: h.height, targetHeight: h.height,
      jumpY: 0, jumpV: 0, airborne: false, airT: 0, jumpSpin: 0,
      action: null, time: 0, prevMask: 0, submerged: false, bumpCooldown: 0,
      mount: null, vanished: false,
      handOf: null,    // holding hands: this puppet walks beside handOf (the leader)
      holding: null,   // holding hands: the partner walking beside this puppet
    });
    if (snapshot) Object.assign(this, snapshot, { action: snapshot.action && { ...snapshot.action } });
    // A puppet that starts hidden under the water has not "just dived"
    this.submerged = this.baseY() + this.top < -0.05;
    this.prev = { x: this.x, z: this.z, yaw: this.yaw, baseY: this.baseY() };
    this.lastBaseY = this.baseY();
  }

  getState() {
    const keys = ['x', 'z', 'vx', 'vz', 'yaw', 'yawVel', 'height', 'targetHeight', 'jumpY', 'jumpV',
      'airborne', 'airT', 'jumpSpin', 'time', 'prevMask', 'submerged', 'bumpCooldown'];
    const s = {};
    for (const k of keys) s[k] = this[k];
    s.action = this.action && { ...this.action };
    return s;
  }

  /** The puppet's own action, or a shared acting move (scold, sad, love, laugh, fly). */
  actionDef(name) { return this.def.actions[name] || EMOTES[name]; }

  diveDepth() {
    const a = this.action;
    if (!a) return 0;
    const d = this.actionDef(a.name);
    return d.depth ? d.depth(Math.min(1, a.t / d.duration)) : 0;
  }

  baseY() { return this.height + this.jumpY + this.diveDepth(); }

  emit(e) { this.events.push(e); }

  /** Hide the puppet under the water without a splash (after flying away). */
  vanish() {
    this.action = null;
    this.height = this.targetHeight = H_MIN;
    this.jumpY = 0; this.airborne = false; this.vx = this.vz = 0;
    this.submerged = true;
    this.vanished = true;
    this.lastBaseY = this.baseY();
    this.prev = { x: this.x, z: this.z, yaw: this.yaw, baseY: this.baseY() };
  }

  tick(mask) {
    const dt = DT;
    this.prev = { x: this.x, z: this.z, yaw: this.yaw, baseY: this.baseY() };
    const pressed = mask & ~this.prevMask;
    this.prevMask = mask;
    this.time += dt;
    const held = (b) => (mask & b) !== 0;
    const hit = (b) => (pressed & b) !== 0;
    if (held(BIT.ArrowUp)) this.vanished = false;

    // ---- Holding hands: walk beside the leader, on its right-hand side as the audience sees it ----
    if (this.handOf) {
      const l = this.handOf;
      const side = HAND_GAP;
      const rx = Math.cos(l.yaw), rz = -Math.sin(l.yaw);   // the leader's local +x in world space
      this.prev = { x: this.x, z: this.z, yaw: this.yaw, baseY: this.baseY() };
      this.yaw = l.yaw; this.yawVel = l.yawVel;
      this.x = l.x + rx * side;
      this.z = l.z + rz * side;
      this.vx = l.vx; this.vz = l.vz;
      this.prev = { x: l.prev.x + Math.cos(l.prev.yaw) * side, z: l.prev.z - Math.sin(l.prev.yaw) * side, yaw: l.prev.yaw, baseY: this.prev.baseY };
      const ih2 = (held(BIT.ArrowUp) ? 1 : 0) - (held(BIT.ArrowDown) ? 1 : 0);
      this.targetHeight = Math.min(H_MAX, Math.max(H_MIN, this.targetHeight + ih2 * 1.6 * dt));
      this.height += (this.targetHeight - this.height) * ease(7, dt);
      if (this.action) {
        this.action.t += dt;
        if (this.action.t >= this.actionDef(this.action.name).duration) this.action = null;
      }
      for (const [name, bit] of EMOTE_BITS) if (hit(bit) && name !== 'fly') this.startAction(name);
      if (hit(BIT.KeyQ)) this.startAction('wave');
      if (this.inWater() && Math.hypot(this.vx, this.vz) > 0.15) this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.42, amt: Math.hypot(this.vx, this.vz) * 0.0055 });
      this.lastBaseY = this.baseY();
      return;
    }

    // ---- Riding: sit on the mount's back and go wherever it goes ----
    if (this.mount) {
      const m = this.mount;
      if (m.vanished) { this.mount = null; this.vanish(); return; }
      const seat = m.def.seat || { z: 0, y: 0.6 };
      this.yaw = m.yaw;
      this.x = m.x + Math.sin(m.yaw) * seat.z;
      this.z = m.z + Math.cos(m.yaw) * seat.z;
      this.vx = m.vx; this.vz = m.vz; this.yawVel = m.yawVel;
      this.jumpY = 0; this.airborne = false;
      this.height = this.targetHeight = m.baseY() + seat.y;
      this.prev = { x: m.prev.x + Math.sin(m.prev.yaw) * seat.z, z: m.prev.z + Math.cos(m.prev.yaw) * seat.z, yaw: m.prev.yaw, baseY: m.prev.baseY + seat.y };
      this.lastBaseY = this.baseY();
      this.submerged = this.baseY() + this.top < -0.05;
      if (this.action) {
        this.action.t += dt;
        if (this.action.t >= this.actionDef(this.action.name).duration) this.action = null;
      }
      for (const [name, bit] of EMOTE_BITS) if (hit(bit) && name !== 'fly') this.startAction(name);
      if (hit(BIT.KeyQ)) this.startAction('wave');
      return;
    }

    // ---- Glide (screen-relative: the camera is fixed like a theatre seat) ----
    let ix = (held(BIT.KeyD) ? 1 : 0) - (held(BIT.KeyA) ? 1 : 0);
    let iz = (held(BIT.KeyS) ? 1 : 0) - (held(BIT.KeyW) ? 1 : 0);
    const len = Math.hypot(ix, iz);
    if (len > 0) { ix /= len; iz /= len; }
    const k = ease(len > 0 ? ACCEL : DECEL, dt);
    this.vx += (ix * this.maxSpeed - this.vx) * k;
    this.vz += (iz * this.maxSpeed - this.vz) * k;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.stats.distance += Math.hypot(this.vx, this.vz) * dt;

    // Stage boundaries
    const b = this.bounds;
    let bumped = false;
    if (this.x < b.minX) { this.x = b.minX; this.vx = Math.max(0, this.vx); bumped = true; }
    if (this.x > b.maxX) { this.x = b.maxX; this.vx = Math.min(0, this.vx); bumped = true; }
    if (this.z < b.minZ) { this.z = b.minZ; this.vz = Math.max(0, this.vz); bumped = true; }
    if (this.z > b.maxZ) { this.z = b.maxZ; this.vz = Math.min(0, this.vz); bumped = true; }
    this.bumpCooldown -= dt;
    if (bumped && this.bumpCooldown <= 0 && this.inWater()) {
      this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.6, amt: 0.04 });
      this.emit({ type: 'bump' });
      this.bumpCooldown = 0.6;
    }

    // ---- Turn ----
    const iy = (held(BIT.ArrowRight) ? 1 : 0) - (held(BIT.ArrowLeft) ? 1 : 0);
    this.yawVel += (-iy * TURN_SPEED - this.yawVel) * ease(iy ? 8 : 5, dt);
    this.yaw += this.yawVel * dt;
    this.stats.turned += Math.abs(this.yawVel * dt);

    // ---- Rise / sink ----
    const ih = (held(BIT.ArrowUp) ? 1 : 0) - (held(BIT.ArrowDown) ? 1 : 0);
    this.targetHeight = Math.min(H_MAX, Math.max(H_MIN, this.targetHeight + ih * 1.6 * dt));
    this.height += (this.targetHeight - this.height) * ease(7, dt);
    this.stats.hMin = Math.min(this.stats.hMin, this.height - H_DEFAULT);
    this.stats.hMax = Math.max(this.stats.hMax, this.height - H_DEFAULT);

    // ---- Actions ----
    if (this.action) {
      this.action.t += dt;
      const def = this.actionDef(this.action.name);
      // Hearts rising from a puppet in love
      if (def.hearts) {
        for (const ht of def.hearts) {
          if (this.action.t - dt < ht && this.action.t >= ht) this.emit({ type: 'hearts', x: this.x, y: this.baseY() + this.top + 0.2, z: this.z });
        }
      }
      // Water play: the hands hit / throw water at set moments of the performance
      if (def.splashes && this.inWater()) {
        for (const sp of def.splashes) {
          if (this.action.t - dt < sp.t && this.action.t >= sp.t) {
            const sx = this.x + Math.sin(this.yaw) * sp.f, sz = this.z + Math.cos(this.yaw) * sp.f;
            this.emit({ type: 'splash', x: sx, z: sz, strength: sp.s });
            this.emit({ type: 'ripple', x: sx, z: sz, r: 0.5, amt: 0.07 * sp.s });
            this.emit({ type: 'toss', strength: sp.s });
          }
        }
      }
      // Water sprayed from the mouth (dragon): a fountain arcing forward
      if (def.sprays && this.baseY() + this.top > 0.2) {
        for (const sp of def.sprays) {
          if (this.action.t - dt < sp.t && this.action.t >= sp.t) {
            const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
            this.emit({ type: 'spray', x: this.x + fx * sp.f, y: this.baseY() + sp.h, z: this.z + fz * sp.f, dx: fx, dz: fz, strength: sp.s });
            this.emit({ type: 'toss', strength: 0.6 * sp.s });
          }
        }
      }
      if (this.action.t >= def.duration) {
        this.action = null;
        if (def.vanish) { this.vanish(); return; }
      }
    }
    // A new action interrupts the current one (so the controls never feel ignored),
    // except a dive or a flight, which must finish.
    if (!this.action || (this.action.name !== 'dive' && this.action.name !== 'fly')) {
      if (hit(BIT.KeyQ)) this.startAction('wave');
      else if (hit(BIT.KeyE)) this.startAction('perform');
      else if (hit(BIT.KeyF) && !this.airborne) this.startAction('dive');
      else {
        for (const [name, bit] of EMOTE_BITS) {
          if (hit(bit) && !(name === 'fly' && this.airborne)) { this.startAction(name); break; }
        }
      }
    }

    // ---- Jump ----
    if (hit(BIT.Space) && !this.airborne && !(this.action && this.action.name === 'dive') && this.height > -1.2) {
      this.airborne = true;
      this.jumpV = JUMP_V;
      this.airT = 0;
      this.jumpSpin = Math.hypot(this.vx, this.vz) > 1.2 ? (this.vx >= 0 ? 1 : -1) : 0;
      this.stats.jumps++;
      this.emit({ type: 'splash', x: this.x, z: this.z, strength: 0.6 });
      this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.6, amt: 0.08 });
      this.emit({ type: 'jump' });
    }
    if (this.airborne) {
      this.airT += dt;
      this.jumpV -= GRAVITY * dt;
      this.jumpY += this.jumpV * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0; this.airborne = false;
        this.emit({ type: 'splash', x: this.x, z: this.z, strength: 1.3 });
        this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.8, amt: 0.16 });
        this.emit({ type: 'land' });
      }
    }

    // ---- Water response ----
    const y = this.baseY();
    const dy = y - this.lastBaseY;
    this.lastBaseY = y;
    if (this.inWater()) {
      const speed = Math.hypot(this.vx, this.vz);
      if (speed > 0.15) this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.42, amt: speed * 0.0055 });
      if (Math.abs(dy) > 0.004) this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.5, amt: Math.min(0.06, Math.abs(dy) * 0.35) });
      if (Math.abs(this.yawVel) > 0.5) this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.55, amt: Math.abs(this.yawVel) * 0.0016 });
      // the puppeteer's small hand movements keep the puppet bobbing
      if (Math.floor(this.time / 1.3) !== Math.floor((this.time - dt) / 1.3)) {
        this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.45, amt: 0.012 });
      }
    }
    const submerged = y + this.top < -0.05;
    if (submerged !== this.submerged) {
      this.submerged = submerged;
      this.emit({ type: 'splash', x: this.x, z: this.z, strength: submerged ? 0.7 : 0.9 });
      this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.8, amt: 0.1 });
      this.emit({ type: submerged ? 'submerge' : 'emerge' });
    }
  }

  startAction(name) {
    const def = this.actionDef(name);
    if (!def) return;
    this.action = { name, t: 0 };
    if (name in this.stats) this.stats[name]++;
    this.emit({ type: 'action', name, label: def.label });
    if (name === 'fly' && this.inWater()) {
      this.emit({ type: 'splash', x: this.x, z: this.z, strength: 1.2 });
      this.emit({ type: 'ripple', x: this.x, z: this.z, r: 0.9, amt: 0.14 });
      this.emit({ type: 'jump' });
    }
  }

  inWater() {
    const y = this.baseY();
    return y < 0.12 && y + this.top > 0;
  }

  /** Interpolated transform for rendering between two ticks. */
  transform(alpha) {
    const p = this.prev;
    const lerp = (a, b) => a + (b - a) * alpha;
    return { x: lerp(p.x, this.x), z: lerp(p.z, this.z), yaw: lerp(p.yaw, this.yaw), y: lerp(p.baseY, this.baseY()) };
  }

  /** Blend the idle pose with any running action and the jump. t is the render clock. */
  computePose(t, alpha) {
    const A = this.def.actions;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const localX = (this.vx * cy - this.vz * sy) / this.maxSpeed;
    const localZ = (this.vx * sy + this.vz * cy) / this.maxSpeed;
    const speed = Math.min(1, Math.hypot(this.vx, this.vz) / this.maxSpeed);
    this.def.idle(this._base, t, { speed, localX, localZ, turn: this.yawVel / TURN_SPEED });
    const out = this.pose;
    Object.assign(out, this._base);

    if (this.action) {
      const def = this.actionDef(this.action.name);
      const local = Math.min(def.duration, this.action.t + alpha * DT);
      const u = local / def.duration;
      const fade = Math.min(0.25, def.duration * 0.15);
      const w = smooth(0, fade, local) * (1 - smooth(def.duration - fade, def.duration, local));
      const target = def.pose(u, t, local);
      // spin must not fade back, or the puppet would "unwind"
      const spin = target.spin;
      blendPose(out, out, target, w);
      if (spin !== undefined) out.spin = spin;
    }
    if (this.airborne && A.jump) {
      const total = (2 * JUMP_V) / GRAVITY;
      const p = Math.min(1, this.airT / total);
      blendPose(out, out, A.jump.pose(p), 1);
      if (this.jumpSpin) out.spin += this.jumpSpin * smooth(0.05, 0.9, p) * Math.PI * 2;
    }
    // Holding hands: the inner arm reaches out sideways to meet the partner's hand.
    // The leader's partner stands on its local +x side, so the leader uses its left arm (L, +x)
    // and the follower its right arm (R, −x).
    if (this.holding) {
      out.shLz = 0.8; out.shLx = -0.12; out.elLx = -0.05; out.elLz = 0.05;
      out.headZ += 0.08; out.headY += 0.2;
      out.spin = 0;
    }
    if (this.handOf) {
      out.shRz = -0.8; out.shRx = -0.12; out.elRx = -0.05; out.elRz = -0.05;
      out.headZ -= 0.08; out.headY -= 0.2;
      out.spin = 0;
    }
    return out;
  }
}

export const HEIGHT = { MIN: H_MIN, MAX: H_MAX, DEFAULT: H_DEFAULT };
