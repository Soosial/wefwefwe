// Math, easing, deterministic noise and keyframe helpers. Everything is a pure function of time
// so any frame can be rendered independently (parallel segment rendering relies on this).
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const fract = (v) => v - Math.floor(v);
export const sgn = (v) => (v < 0 ? -1 : 1);

export const ease = {
  linear: (t) => t,
  step: (t) => (t < 1 ? 0 : 1),
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function mixVal(a, b, e) {
  if (typeof a === 'number') return a + (b - a) * e;
  if (Array.isArray(a)) return a.map((v, i) => (typeof v === 'number' ? v + (b[i] - v) * e : e < 1 ? v : b[i]));
  if (a && typeof a === 'object') {
    const o = {};
    for (const k in a) o[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * e : e < 1 ? a[k] : b[k];
    return o;
  }
  return e < 1 ? a : b;
}

// keys: [[time, value, easeOfSegmentEndingHere?], ...]
export function track(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k[0]) {
      const p = keys[i - 1];
      const span = k[0] - p[0];
      const u = span <= 0 ? 1 : (t - p[0]) / span;
      return mixVal(p[1], k[1], (ease[k[2] || 'inOutQuad'] || ease.linear)(u));
    }
  }
  return keys[keys.length - 1][1];
}

// Discrete keys: value of the last key whose time <= t
export function pick(t, keys, def) {
  let v = def;
  for (const k of keys) if (t >= k[0]) v = k[1];
  return v;
}

export const phase = (t, a, b, e = 'linear') => (ease[e] || ease.linear)(inv(a, b, t));
export const within = (t, a, b) => t >= a && t < b;
export const osc = (t, f, p = 0) => Math.sin((t * f + p) * TAU);
// time quantized to an animation frame rate (pixel-art "on twos" feel)
export const qt = (t, fps = 12) => Math.floor(t * fps) / fps;

export function hash(n) {
  n = n | 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
export const hash2 = (x, y, s = 0) => hash((Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0);
export const hrange = (n, a, b) => a + (b - a) * hash(n);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function noise1(x, s = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash2(i, s, 7), hash2(i + 1, s, 7), u);
}
export function noise2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm(x, y, oct = 4, s = 0) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    v += amp * noise2(x * f, y * f, s + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return v / norm;
}

// damped spring response for overshoot-y settles: 0 -> 1
export function spring(t, freq = 3, damp = 4) {
  if (t <= 0) return 0;
  return 1 - Math.exp(-damp * t) * Math.cos(TAU * freq * t);
}

// parabolic hop: returns height (>=0) for a hop of duration d and height h starting at t0
export function hop(t, t0, d, h) {
  const u = (t - t0) / d;
  if (u < 0 || u > 1) return 0;
  return 4 * h * u * (1 - u);
}
