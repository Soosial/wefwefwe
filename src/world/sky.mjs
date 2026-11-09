// Sky layers: dithered gradients, parallax star fields, milky way, cloud sea, floating islands, aurora.
import { Surface, hex, mix, col, cr, cg, cb, bayer, rect, disc, glow, pset, pdith, line } from '../core/fb.mjs';
import { hash, hash2, fbm, noise2, clamp, TAU } from '../core/math.mjs';

export const SKIES = {
  night: [[0, '#070a24'], [0.45, '#151a4a'], [0.8, '#2d2462'], [1, '#4a2f6e']],
  prologue: [[0, '#05061a'], [0.5, '#0f1236'], [0.85, '#21204e'], [1, '#33295c']],
  festival: [[0, '#0a0b2e'], [0.4, '#1c1d58'], [0.75, '#3b2b72'], [1, '#6a3a7a']],
  rain: [[0, '#0b0f1c'], [0.5, '#161d30'], [1, '#2a3246']],
  clearing: [[0, '#090d2a'], [0.5, '#16204c'], [0.85, '#27366a'], [1, '#3a4b7e']],
  dawn: [[0, '#2a3f7a'], [0.35, '#6a6ab0'], [0.65, '#e79aa8'], [0.85, '#ffc38a'], [1, '#ffe2a6']],
  morning: [[0, '#4f86d9'], [0.6, '#8cc0f0'], [1, '#d7ecff']],
  deep: [[0, '#02030c'], [0.6, '#080a26'], [1, '#14123a']],
};

// screen-space gradient (ignores camera translation)
export function skyGradient(s, stops, levels = 20, yShift = 0) {
  const st = stops.map(([t, c]) => [t, hex(c)]);
  const H = s.h;
  for (let y = 0; y < H; y++) {
    const t = clamp((y + yShift) / (H - 1));
    let i = 0;
    while (i < st.length - 2 && t > st[i + 1][0]) i++;
    const a = st[i], b = st[i + 1];
    const u = clamp((t - a[0]) / (b[0] - a[0] || 1));
    const q = u * levels, base = Math.floor(q), fr = q - base;
    const ca = mix(a[1], b[1], base / levels), cbb = mix(a[1], b[1], Math.min(1, (base + 1) / levels));
    const o = y * s.w;
    for (let x = 0; x < s.w; x++) { s.d[o + x] = bayer(x, y) < fr ? cbb : ca; s.m[o + x] = 0; }
  }
}

// parallax starfield. cam = [left, top] of view (world). p = parallax factor
export function stars(s, t, o = {}) {
  const n = o.count ?? 260, seed = o.seed ?? 1, p = o.parallax ?? 0.05;
  const TW = 1200, TH = o.height ?? 300;
  const ox = (s.tx * p) % TW, oy = s.ty * p * 0.5;
  const bright = o.bright ?? 1, maxY = o.maxY ?? s.h;
  for (let i = 0; i < n; i++) {
    const hx = hash2(i, seed, 1), hy = hash2(i, seed, 2), hb = hash2(i, seed, 3), hc = hash2(i, seed, 4);
    let x = Math.floor(hx * TW - ox);
    x = ((x % TW) + TW) % TW;
    if (x >= s.w) continue;
    const y = Math.floor(Math.pow(hy, o.bias ?? 1.25) * TH - oy);
    if (y < 0 || y >= maxY) continue;
    const tw = 0.65 + 0.35 * Math.sin(t * (1.5 + hc * 3) + i);
    let lv = (hb < 0.75 ? 0.35 + hb * 0.5 : 0.85) * tw * bright * (o.fade ? o.fade(x, y) : 1);
    if (lv <= 0.05) continue;
    const tint = hc < 0.15 ? [255, 214, 170] : hc < 0.35 ? [176, 200, 255] : [255, 255, 255];
    const i0 = y * s.w + x;
    const d = s.d[i0];
    const add = (j, k) => {
      if (j < 0 || j >= s.d.length) return;
      const q = s.d[j];
      s.d[j] = col(Math.min(255, cr(q) + tint[0] * k), Math.min(255, cg(q) + tint[1] * k), Math.min(255, cb(q) + tint[2] * k));
      s.m[j] = 2;
    };
    add(i0, lv);
    if (hb > 0.93) { // twinkly cross star
      const k = lv * 0.55;
      if (x > 0) add(i0 - 1, k); if (x < s.w - 1) add(i0 + 1, k);
      if (y > 0) add(i0 - s.w, k); if (y < s.h - 1) add(i0 + s.w, k);
      if (hb > 0.975 && tw > 0.8) { if (x > 1) add(i0 - 2, k * 0.4); if (x < s.w - 2) add(i0 + 2, k * 0.4); if (y > 1) add(i0 - 2 * s.w, k * 0.4); if (y < s.h - 2) add(i0 + 2 * s.w, k * 0.4); }
    }
    void d;
  }
}

// precomputed milky way band texture
let MW = null;
function milkyTex() {
  if (MW) return MW;
  const w = 900, h = 300;
  MW = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const band = (y - (h * 0.65 - x * 0.28)) / 60;
    const b = Math.exp(-band * band);
    const n = fbm(x / 70, y / 40, 4, 9);
    const dark = fbm(x / 25 + 3, y / 18, 3, 13);
    MW[y * w + x] = clamp(b * (n * 1.2 - 0.25) - Math.max(0, dark - 0.6) * b * 0.8);
  }
  MW.w = w; MW.h = h;
  return MW;
}
export function milkyWay(s, o = {}) {
  const tex = milkyTex();
  const p = o.parallax ?? 0.04, k = o.k ?? 1;
  const ox = Math.floor(s.tx * p + (o.x ?? 120)), oy = Math.floor(s.ty * p * 0.5 + (o.y ?? 0));
  const c1 = [120, 110, 200], c2 = [255, 210, 230];
  for (let y = 0; y < Math.min(s.h, o.maxY ?? s.h); y++) {
    const ty = y + oy;
    if (ty < 0 || ty >= tex.h) continue;
    for (let x = 0; x < s.w; x++) {
      const tx = ((x + ox) % tex.w + tex.w) % tex.w;
      const v = tex[ty * tex.w + tx] * k;
      if (v <= 0.02) continue;
      const q = Math.floor(v * 6 + bayer(x, y)) / 6; // banded glow
      if (q <= 0) continue;
      const i = y * s.w + x, d = s.d[i];
      const mixk = clamp(v * 1.5);
      s.d[i] = col(Math.min(255, cr(d) + (c1[0] + (c2[0] - c1[0]) * mixk) * q * 0.35), Math.min(255, cg(d) + (c1[1] + (c2[1] - c1[1]) * mixk) * q * 0.3), Math.min(255, cb(d) + (c1[2] + (c2[2] - c1[2]) * mixk) * q * 0.4));
      if (v > 0.35 && hash2(tx, ty, 77) < (v - 0.35) * 0.05) s.d[i] = col(220, 215, 255);
    }
  }
}

// ---------- cloud sea: precomputed tileable layers of puffs ----------
const cloudCache = new Map();
function cloudLayer(seed, w, h, colors) {
  const key = seed + ':' + w + ':' + h + ':' + colors.join(',');
  if (cloudCache.has(key)) return cloudCache.get(key);
  const L = new Surface(w, h);
  L.d.fill(0); L.flag = 1;
  const [shadow, mid, light, rim] = colors.map(hex);
  // heightfield of puffs
  const top = new Float32Array(w).fill(h);
  const puffs = [];
  for (let i = 0; i < Math.floor(w / 14); i++) {
    const x = (i * 14 + hash2(i, seed, 1) * 10) % w;
    const r = 10 + hash2(i, seed, 2) * 18;
    const y = h * 0.35 + hash2(i, seed, 3) * h * 0.35;
    puffs.push([x, y, r]);
  }
  for (let x = 0; x < w; x++) for (const [px, py, r] of puffs) {
    for (const off of [-w, 0, w]) {
      const dx = x + 0.5 - (px + off);
      if (Math.abs(dx) < r) top[x] = Math.min(top[x], py - Math.sqrt(r * r - dx * dx));
    }
  }
  for (let x = 0; x < w; x++) {
    const t0 = Math.max(0, Math.round(top[x]));
    for (let y = t0; y < h; y++) {
      const depth = y - t0;
      // light from above-left: rim at top edge, then light, mid, shadow lower down
      let c;
      const slope = top[(x + 1) % w] - top[(x - 1 + w) % w];
      if (depth === 0) c = rim;
      else if (depth < 3 + (slope > 0 ? 2 : 0)) c = (depth === 2 && bayer(x, y) < 0.5) ? mid : light;
      else if (depth < 9) c = bayer(x, y) < (depth - 3) / 6 ? mid : light;
      else if (depth < 18) c = bayer(x, y) < (depth - 9) / 9 ? shadow : mid;
      else c = shadow;
      L.d[y * w + x] = c;
      L.m[y * w + x] = 1;
    }
  }
  cloudCache.set(key, L);
  return L;
}
// draw a horizontally scrolling cloud layer; y is screen-space top of the layer
export function cloudSea(s, t, o = {}) {
  const w = 640, h = o.h ?? 70;
  const L = cloudLayer(o.seed ?? 3, w, h, o.colors ?? ['#3a3a78', '#565a9a', '#7a80c0', '#a9b0e8']);
  const p = o.parallax ?? 0.3;
  const sx = Math.floor(s.tx * p + t * (o.speed ?? 2)) ;
  const y0 = Math.round((o.y ?? 200) - s.ty * (o.parallaxY ?? 0));
  for (let y = 0; y < h; y++) {
    const dy = y0 + y;
    if (dy < 0 || dy >= s.h) continue;
    for (let x = 0; x < s.w; x++) {
      const lx = (((x + sx) % w) + w) % w;
      const c = L.d[y * w + lx];
      if (!(c >>> 24)) continue;
      const i = dy * s.w + x;
      s.d[i] = c; s.m[i] = o.flag ?? 0;
    }
    // below the layer fill with shadow color
  }
  if (o.fill) for (let y = y0 + h; y < s.h; y++) if (y >= 0) { s.d.fill(hex(o.fill), y * s.w, (y + 1) * s.w); s.m.fill(o.flag ?? 0, y * s.w, (y + 1) * s.w); }
}

// small floating islands in the distance with little waterfalls
export function farIslands(s, t, o = {}) {
  const p = o.parallax ?? 0.15;
  const items = o.items ?? [[60, 120, 34], [330, 96, 22], [420, 140, 40], [700, 110, 28], [-200, 130, 30]];
  const top = hex(o.top ?? '#3b4a86'), body = hex(o.body ?? '#262b5c'), dark = hex(o.dark ?? '#1a1d44'), fall = hex(o.fall ?? '#8fa6e8');
  const rockHi = mix(body, top, 0.35);
  for (const [wx, wy, r] of items) {
    const x = Math.round(wx - s.tx * p), y = Math.round(wy - s.ty * p * 0.5);
    if (x + r < -10 || x - r > s.w + 10) continue;
    // body: jagged rocky underside (irregular stalactite profile), lit from the upper left
    const depth = r * 0.75;
    for (let dx = -r; dx <= r; dx++) {
      const u = dx / r;
      const prof = depth * Math.pow(Math.max(0, 1 - u * u), 0.7) * (0.65 + 0.35 * noise2(dx * 0.35, wx, 3)) + (hash2(dx >> 1, wx, 5) < 0.12 ? 3 : 0);
      for (let dy = 0; dy < prof; dy++) {
        const px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
        const v = dy / Math.max(1, prof);
        let c = u < -0.35 && v < 0.6 ? (bayer(px, py) < 0.5 ? rockHi : body) : u > 0.25 || v > 0.75 ? dark : body;
        if (dy === Math.floor(prof) - 1) c = dark;
        s.d[py * s.w + px] = c; s.m[py * s.w + px] = 0;
      }
    }
    // grassy top cap
    for (let dx = -r; dx <= r; dx++) for (let dy = -3; dy <= 0; dy++) {
      const px = x + dx, py = y + dy + Math.round(Math.abs(dx) * 0.06);
      if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
      if (dy === -3 && hash2(dx, wx, 9) < 0.6) continue;
      s.d[py * s.w + px] = top; s.m[py * s.w + px] = 0;
    }
    // tiny trees
    for (let k = 0; k < Math.floor(r / 9); k++) {
      const tx = x - r + 6 + Math.floor(hash2(k, wx, 3) * (2 * r - 12)), ty = y - 3;
      for (let j = 0; j < 5; j++) for (let i = -2 + Math.floor(j / 2); i <= 2 - Math.floor(j / 2); i++) {
        const px = tx + i, py = ty - j;
        if (px >= 0 && py >= 0 && px < s.w && py < s.h) { s.d[py * s.w + px] = dark; s.m[py * s.w + px] = 0; }
      }
    }
    // waterfall: thin, fading, broken into drifting mist
    if (r > 25) {
      const fx = x + Math.round(r * 0.45);
      for (let py = y; py < Math.min(s.h, y + 46); py++) {
        if (py < 0) continue;
        const a = (1 - (py - y) / 46) * 0.55;
        const spread = Math.floor((py - y) / 16);
        for (let dx = -spread; dx <= 1 + spread; dx++) {
          const px = fx + dx;
          if (px < 0 || px >= s.w) continue;
          const fl = hash2(px, Math.floor(py - t * 24), 4) < 0.6;
          if (fl && bayer(px, py) < a) { s.d[py * s.w + px] = mix(s.d[py * s.w + px], fall, 0.6); s.m[py * s.w + px] = 0; }
        }
      }
    }
  }
}

export function aurora(s, t, o = {}) {
  const k = o.k ?? 0.5, y0 = o.y ?? 40;
  const c1 = [60, 255, 170], c2 = [120, 140, 255];
  for (let x = 0; x < s.w; x++) {
    const wx = x + s.tx * 0.05;
    const top = y0 + Math.sin(wx * 0.012 + t * 0.3) * 14 + Math.sin(wx * 0.031 - t * 0.5) * 6;
    const len = 34 + Math.sin(wx * 0.02 + t * 0.4) * 14;
    const inten = (0.5 + 0.5 * Math.sin(wx * 0.05 + t * 0.8)) * k;
    for (let y = Math.max(0, Math.floor(top)); y < Math.min(s.h, top + len); y++) {
      const u = (y - top) / len;
      const a = inten * (1 - u) * Math.min(1, u * 6);
      if (a < 0.03) continue;
      const q = Math.floor(a * 5 + bayer(x, y)) / 5;
      if (q <= 0) continue;
      const i = y * s.w + x, d = s.d[i];
      const m2 = u;
      s.d[i] = col(Math.min(255, cr(d) + (c1[0] + (c2[0] - c1[0]) * m2) * q * 0.4), Math.min(255, cg(d) + (c1[1] + (c2[1] - c1[1]) * m2) * q * 0.4), Math.min(255, cb(d) + (c1[2] + (c2[2] - c1[2]) * m2) * q * 0.4));
    }
  }
}

// moon disc with craters (screen space)
export function moon(s, x, y, r, o = {}) {
  const lit = hex(o.lit ?? '#fff3cf'), mid = hex(o.mid ?? '#e8d49c'), dark = hex(o.dark ?? '#c2a970');
  glow(s, x + s.tx, y + s.ty, r * 4, o.glowC ?? '#8a7cc0', 0.35, 6);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = Math.hypot(dx + 0.5, dy + 0.5);
    if (d > r) continue;
    const px = x + dx, py = y + dy;
    if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
    const sh = (dx + dy) / (r * 1.6);
    let c = sh < 0.1 ? lit : sh < 0.5 ? (bayer(px, py) < (sh - 0.1) / 0.4 ? mid : lit) : mid;
    if (noise2(dx / 3 + 9, dy / 3 + 2, 5) > 0.68) c = dark;
    s.d[py * s.w + px] = c; s.m[py * s.w + px] = 2;
  }
}

export function shootingStar(s, t, t0, x0, y0, dx = 120, dy = 40, dur = 0.7) {
  const u = (t - t0) / dur;
  if (u < 0 || u > 1) return;
  const hx = x0 + dx * u, hy = y0 + dy * u;
  for (let i = 0; i < 18; i++) {
    const k = i / 18;
    const px = Math.round(hx - dx * 0.18 * k), py = Math.round(hy - dy * 0.18 * k);
    const a = (1 - k) * Math.sin(u * Math.PI);
    if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
    if (bayer(px, py) < a + 0.2) { s.d[py * s.w + px] = col(255, 255, 255 - 40 * k); s.m[py * s.w + px] = 2; }
  }
}
export { TAU };
