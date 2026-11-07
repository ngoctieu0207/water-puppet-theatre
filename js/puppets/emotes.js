// Shared "acting" moves used by the story mode: scold, sad, love, laugh and fly away.
// They are written in terms of the common pose keys, so every puppet can play them: humans use
// their arms and head; the creatures react with whatever joints they have (head, neck, wings, jaw).
import { smooth, windowed } from './pose.js';

export const EMOTES = {
  scold: {
    label: 'Says no!',
    duration: 2.6,
    pose(u, t, s) {
      const w = windowed(s, 0.1, 2.5, 0.25);
      const shake = Math.sin(s * 9) * 0.35 * w;
      const wag = Math.sin(s * 12) * 0.45 * w;
      return {
        headY: shake, headX: -0.05, bodyX: -0.12 * w,
        shRx: -1.35 * w, shRz: -0.35 * w, elRx: -0.8 * w, elRz: wag,   // wagging finger
        shLx: 0.45, shLz: 0.12, elLx: -0.3, elLz: -0.5,                 // other hand behind the back
        jaw: 0.6 * w, neck: -0.2 * w, wingL: 0.9 * w + 0.3 * Math.abs(wag), wingR: 0.9 * w + 0.3 * Math.abs(wag),
      };
    },
  },
  sad: {
    label: 'Feels sad…',
    duration: 3.0,
    pose(u, t, s) {
      const w = windowed(s, 0.1, 2.9, 0.4);
      const sob = Math.sin(s * 14) * 0.03 * w;
      return {
        headX: 0.55 * w, headZ: 0.1 * w, bodyX: 0.32 * w + sob, lift: -0.12 * w,
        shLx: -1.2 * w, shRx: -1.2 * w, shLz: -0.15 * w, shRz: 0.15 * w,
        elLx: -1.7 * w, elRx: -1.7 * w,                                  // hands to the face
        neck: 0.6 * w, wingL: -0.15 * w, wingR: -0.15 * w, jaw: 0, tail: -0.3 * w, undulate: 0.1,
      };
    },
  },
  love: {
    label: 'Love',
    duration: 3.2,
    hearts: [0.4, 1.0, 1.6, 2.2],
    pose(u, t, s) {
      const w = windowed(s, 0.1, 3.1, 0.3);
      const sway = Math.sin(s * 2.4) * 0.12 * w;
      return {
        shLx: -0.95 * w, shLz: -0.38 * w, elLx: -1.35 * w,               // hands on the heart
        shRx: -0.95 * w, shRz: 0.38 * w, elRx: -1.35 * w,
        headZ: 0.25 * w + sway, bodyZ: sway, lift: 0.04 * w,
        wingL: 0.6 * w, wingR: 0.6 * w, neck: 0.25 * w, tail: 0.5 * w,
      };
    },
  },
  laugh: {
    label: 'Ha ha!',
    duration: 2.4,
    pose(u, t, s) {
      const w = windowed(s, 0.05, 2.35, 0.2);
      const shake = Math.sin(s * 20) * 0.06 * w;
      return {
        headX: -0.35 * w + shake, belly: 1 + 0.05 * Math.sin(s * 22) * w,
        shLz: 0.5 * w, shRz: -0.5 * w, shLx: -0.6 * w, shRx: -0.6 * w, elLx: -1.4 * w, elRx: -1.4 * w,
        lift: Math.abs(Math.sin(s * 10)) * 0.05 * w, jaw: 0.6 * w,
        wingL: 0.5 * w + Math.abs(Math.sin(s * 10)) * 0.4, wingR: 0.5 * w + Math.abs(Math.sin(s * 10)) * 0.4,
      };
    },
  },
  fly: {
    label: 'Flies up to the sky!',
    duration: 4.4,
    vanish: true,   // when it ends, the puppet is gone (hidden under the water again)
    // Height offset (world units) added to the puppet's base height
    depth(u) { return Math.pow(smooth(0.06, 1, u), 1.8) * 14; },
    pose(u, t, s) {
      const flap = 0.8 + 0.8 * Math.sin(s * 14);
      return {
        shLz: 2.6, shRz: -2.6, elLx: -0.1, elRx: -0.1, headX: -0.3, bodyX: -0.15,
        wingL: flap, wingR: flap, tail: 0.7, neck: -0.3, undulate: 1.4, jaw: 0.4,
        spin: smooth(0.1, 0.9, u) * Math.PI * 2,
      };
    },
  },
};
