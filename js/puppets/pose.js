// A pose is a flat set of joint angles (radians) plus a few scalars.
// Every puppet maps these onto its own joints, so animations can be blended generically.
export const POSE_KEYS = [
  'spin', 'lift',
  'bodyX', 'bodyY', 'bodyZ',
  'headX', 'headY', 'headZ',
  'shLx', 'shLz', 'shRx', 'shRz',
  'elLx', 'elLz', 'elRx', 'elRz',
  'belly',
  // creature joints (ignored by humans)
  'undulate', 'jaw', 'bend', 'wingL', 'wingR', 'neck', 'tail',
];

export function neutralPose() {
  const p = {};
  for (const k of POSE_KEYS) p[k] = 0;
  p.belly = 1;
  return p;
}

/** out = lerp(a, b, w). Keys missing in b are left as in a. */
export function blendPose(out, a, b, w) {
  for (const k of POSE_KEYS) {
    const bv = b[k];
    out[k] = bv === undefined ? a[k] : a[k] + (bv - a[k]) * w;
  }
  return out;
}

export function copyPose(out, src) {
  for (const k of POSE_KEYS) out[k] = src[k];
  return out;
}

export const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 0→1→0 window with soft edges (fade in seconds, relative to total length). */
export const windowed = (t, start, end, fade) =>
  smooth(start, start + fade, t) * (1 - smooth(end - fade, end, t));
