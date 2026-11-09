// Terrain & set dressing: ground with animated grass, hills, the old festival tree, stage rock, signpost, bushes, string lights.
import { Surface, hex, mix, col, bayer, rect, disc, pset, line, poly, glow, ellipse, pdith } from '../core/fb.mjs';
import { hash, hash2, fbm, noise2, noise1, clamp } from '../core/math.mjs';
import { text, textWidth } from '../core/font.mjs';

export const GRASS = { hi: '#a7e07a', top: '#7cc85d', base: '#55a64c', shade: '#3f8443', dark: '#2c6238', dirt: '#7a5638', dirt2: '#5c3f2a', dirt3: '#432c1f', stone: '#8c8a9a' };

// ground: fn(wx) -> ground y (world). Draws grass/dirt for the visible columns.
export function ground(s, t, fn, o = {}) {
  const P = { ...GRASS, ...(o.pal || {}) };
  const C = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, hex(v)]));
  const wind = o.wind ?? 1;
  const flowers = o.flowers ?? 0.06;
  for (let x = 0; x < s.w; x++) {
    const wx = x + s.tx;
    const gy = Math.round(fn(wx));
    const sy0 = gy - s.ty;
    for (let sy = Math.max(0, sy0); sy < s.h; sy++) {
      const d = sy - sy0;
      const wy = sy + s.ty;
      let c;
      if (d === 0) c = C.hi;
      else if (d < 3) c = C.top;
      else if (d < 6) c = bayer(wx, wy) < (d - 2) / 4 ? C.base : C.top;
      else if (d < 10) c = bayer(wx, wy) < (d - 6) / 4 ? C.shade : C.base;
      else if (d < 13) c = bayer(wx, wy) < (d - 10) / 3 ? C.dirt : C.shade;
      else {
        const n = hash2(wx >> 1, wy >> 1, 31);
        c = n < 0.015 ? C.stone : n < 0.12 ? C.dirt2 : d > 40 ? (bayer(wx, wy) < clamp((d - 40) / 40) ? C.dirt3 : C.dirt2) : C.dirt;
        if (d > 13 && d < 15 && hash2(wx, 3, 8) < 0.5) c = C.dark;
      }
      const i = sy * s.w + x;
      s.d[i] = c; s.m[i] = 1;
    }
    // grass blades
    const h1 = hash2(wx, 0, 41);
    if (h1 < (o.blades ?? 0.55)) {
      const bh = 1 + Math.floor(hash2(wx, 1, 41) * (o.bladeH ?? 4));
      const sway = Math.sin(t * 2.2 + wx * 0.15) * wind * (bh / 4);
      for (let k = 1; k <= bh; k++) {
        const px = x + Math.round(sway * (k / bh));
        const py = sy0 - k;
        if (px < 0 || px >= s.w || py < 0 || py >= s.h) continue;
        s.d[py * s.w + px] = k === bh ? C.hi : C.top; s.m[py * s.w + px] = 1;
      }
    }
    if (hash2(wx, 2, 41) < flowers) {
      const fc = ['#ff8fb0', '#ffe066', '#ffffff', '#9fd0ff', '#ffb36b'][Math.floor(hash2(wx, 3, 41) * 5)];
      const py = sy0 - 2 - Math.floor(hash2(wx, 4, 41) * 2);
      const sway = Math.round(Math.sin(t * 2 + wx * 0.2) * 0.6 * wind);
      if (py - 1 >= 0 && py < s.h) {
        pset(s, wx + sway, py + s.ty, hex(fc));
        pset(s, wx, py + 1 + s.ty, C.top);
      }
    }
  }
}

// distant hill silhouette band (unlit, painted in final colors)
export function hills(s, o) {
  const p = o.parallax ?? 0.3, base = o.base, amp = o.amp ?? 20, seed = o.seed ?? 1;
  const c = hex(o.color), rim = o.rim ? hex(o.rim) : null, dots = o.lights;
  for (let x = 0; x < s.w; x++) {
    const wx = x + s.tx * p;
    const hgt = base - (Math.sin(wx * (o.freq ?? 0.008) + seed) * 0.6 + noise1(wx * 0.02, seed) * 0.8 - 0.4) * amp - s.ty * (o.py ?? p * 0.5);
    const y0 = Math.max(0, Math.round(hgt));
    for (let y = y0; y < s.h; y++) { s.d[y * s.w + x] = c; s.m[y * s.w + x] = o.flag ?? 0; }
    if (rim && y0 < s.h && y0 >= 0) s.d[y0 * s.w + x] = rim;
    if (dots && hash2(Math.floor(wx), seed, 99) < dots && y0 + 4 < s.h) {
      const yy = y0 + 3 + Math.floor(hash2(Math.floor(wx), seed, 98) * 8);
      if (yy < s.h) { s.d[yy * s.w + x] = hex('#ffcf7a'); s.m[yy * s.w + x] = 2; }
    }
  }
}

// ---------- the old tree (precomputed sprite) ----------
let TREE = null;
export function treeSprite() {
  if (TREE) return TREE;
  const w = 200, h = 190;
  const S = new Surface(w, h);
  S.d.fill(0); S.flag = 1;
  const bark = ['#4a3224', '#6b4a32', '#8a6544', '#a47d55'].map(hex);
  const leaf = ['#1d4a2c', '#2a6a3a', '#3f8f4a', '#5fb35a', '#8fd27a'].map(hex);
  // trunk with flared roots
  for (let y = 70; y < h; y++) {
    const u = (y - 70) / (h - 70);
    const half = 7 + u * u * 16 + (y > h - 12 ? (y - (h - 12)) * 1.6 : 0);
    const cx = 100 + Math.sin(u * 3) * 3;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      if (x < 0 || x >= w) continue;
      const k = (x - (cx - half)) / (2 * half);
      let c = k < 0.18 ? bark[2] : k < 0.3 ? (bayer(x, y) < 0.5 ? bark[2] : bark[1]) : k > 0.75 ? bark[0] : bark[1];
      if (hash2(x, y >> 2, 3) < 0.12) c = bark[0];
      if (k > 0.1 && k < 0.2 && hash2(x, y, 4) < 0.3) c = bark[3];
      S.d[y * w + x] = c; S.m[y * w + x] = 1;
    }
  }
  // branches
  const br = [[100, 95, 60, 62, 5], [100, 92, 144, 58, 5], [98, 100, 40, 88, 3], [102, 98, 162, 84, 3], [100, 85, 100, 40, 5]];
  for (const [x0, y0, x1, y1, th] of br) {
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 6;
      const r = th * (1 - u * 0.6);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const px = Math.round(x + dx), py = Math.round(y + dy);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        S.d[py * w + px] = dy < -r * 0.3 ? bark[2] : dy > r * 0.4 ? bark[0] : bark[1]; S.m[py * w + px] = 1;
      }
    }
  }
  // canopy clusters
  const cl = [[100, 48, 34], [62, 58, 26], [140, 56, 28], [80, 30, 24], [122, 28, 24], [40, 78, 18], [164, 76, 18], [100, 74, 24], [70, 80, 18], [132, 82, 18], [100, 16, 18]];
  const inside = (x, y) => { for (const [cx, cy, r] of cl) { const d = Math.hypot(x - cx, (y - cy) * 1.15) - r + noise2(x / 5, y / 5, 7) * 6; if (d < 0) return [cx, cy, r]; } return null; };
  for (let y = 0; y < 110; y++) for (let x = 0; x < w; x++) {
    const c0 = inside(x, y);
    if (!c0) continue;
    const [cx, cy, r] = c0;
    const nx = (x - cx) / r, ny = (y - cy) / r;
    let l = 0.55 - nx * 0.35 - ny * 0.45 + (noise2(x / 3, y / 3, 11) - 0.5) * 0.5;
    l += (fbm(x / 9, y / 9, 3, 2) - 0.5) * 0.4;
    const q = clamp(l) * 4.2 + bayer(x, y) * 0.8 - 0.4;
    const idx = clamp(Math.floor(q), 0, 4);
    S.d[y * w + x] = leaf[idx]; S.m[y * w + x] = 1;
  }
  // outline canopy & trunk
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (S.d[y * w + x] >>> 24) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && (S.d[yy * w + xx] >>> 24)) { out.push(y * w + x); break; }
    }
  }
  for (const i of out) { S.d[i] = hex('#10261a'); S.m[i] = 1; }
  TREE = S;
  return S;
}
// anchors for lantern strings etc. in tree-local coords
export const TREE_ANCHORS = [[42, 92], [70, 96], [100, 99], [132, 96], [160, 92], [56, 70], [146, 70]];

// ---------- stage rock ----------
export function stageRock(s, x, y, w = 84) {
  const top = hex('#9a98ac'), hi = hex('#c6c4d6'), side = hex('#6e6a82'), dark = hex('#4b4760'), moss = hex('#5cab4f'), out = hex('#2a2638');
  const hgt = 16;
  for (let dy = 0; dy < hgt; dy++) {
    const inset = dy < 3 ? 3 - dy : dy > hgt - 4 ? 0 : 0;
    const half = w / 2 - inset + (dy > 5 ? Math.min(4, (dy - 5) * 0.5) : 0);
    for (let dx = -Math.round(half); dx <= Math.round(half); dx++) {
      let c = dy < 4 ? (dy === 0 ? hi : top) : dy < 7 ? (bayer(dx, dy) < 0.5 ? top : side) : dy < 12 ? side : dark;
      if (dy < 2 && hash2(dx, 1, 5) < 0.25) c = moss;
      if (dy >= 4 && hash2(dx >> 1, dy >> 1, 6) < 0.08) c = dark;
      if (Math.abs(dx) >= Math.round(half) - 0) c = out;
      pset(s, x + dx, y + dy, c);
    }
  }
  rect(s, x - w / 2 - 1, y + hgt, w + 6, 1, out);
}

// ---------- wooden signpost with flippable board ----------
// flip: 1 = front, -1 = back (board width scales with |flip|)
export function signpost(s, x, y, front, back = '', o = {}) {
  const post = ['#5a3d26', '#7a5636', '#9a7048'].map(hex);
  rect(s, x - 2, y - 40, 4, 40, post[1]);
  rect(s, x - 2, y - 40, 1, 40, post[2]);
  rect(s, x + 1, y - 40, 1, 40, post[0]);
  const flip = o.flip ?? 1;
  const bw = o.w ?? 70, bh = 16;
  const ww = Math.max(1, Math.round(bw * Math.abs(flip)));
  const bx = x - Math.round(ww / 2), by = y - 46;
  const plank = ['#7a5232', '#a8774a', '#c9965f', '#e0b37a'].map(hex);
  for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < ww; xx++) {
    let c = yy === 0 ? plank[3] : yy === bh - 1 ? plank[0] : yy === 7 ? plank[1] : plank[2];
    if (xx === 0 || xx === ww - 1) c = plank[0];
    if (hash2(Math.floor(xx / Math.max(0.2, Math.abs(flip))), yy, 9) < 0.06) c = plank[1];
    pset(s, bx + xx, by + yy, c);
  }
  if (Math.abs(flip) > 0.85) {
    const str = flip > 0 ? front : back;
    const col2 = o.textColor ?? (flip > 0 ? '#4a2c18' : '#2a1a10');
    if (str) text(s, str, x, by + 5, { align: 'center', color: col2, font: o.font || 'tiny' });
    pset(s, bx + 2, by + 2, plank[0]); pset(s, bx + ww - 3, by + 2, plank[0]);
  }
}

// ---------- bush (precomputed per seed) ----------
const bushCache = new Map();
export function bush(s, x, y, w = 40, seed = 1, rustle = 0) {
  const key = w + ':' + seed;
  let B = bushCache.get(key);
  if (!B) {
    const h = Math.round(w * 0.6);
    B = new Surface(w + 4, h + 2);
    B.d.fill(0);
    const leaf = ['#1d4a2c', '#2a6a3a', '#3f8f4a', '#5fb35a', '#8fd27a'].map(hex);
    const blobs = [];
    for (let i = 0; i < 6; i++) blobs.push([4 + hash2(i, seed, 1) * (w - 8) + 2, h * 0.45 + hash2(i, seed, 2) * h * 0.3, h * 0.35 + hash2(i, seed, 3) * h * 0.25]);
    for (let yy = 0; yy < h + 2; yy++) for (let xx = 0; xx < w + 4; xx++) {
      let hit = null;
      for (const b of blobs) if (Math.hypot(xx - b[0], (yy - b[1]) * 1.2) < b[2] + noise2(xx / 3, yy / 3, seed) * 3) { hit = b; break; }
      if (!hit && yy > h * 0.7 && xx > 3 && xx < w + 1) hit = [w / 2, h, h];
      if (!hit) continue;
      const l = 0.6 - (xx - hit[0]) / hit[2] * 0.3 - (yy - hit[1]) / hit[2] * 0.5 + (noise2(xx / 2, yy / 2, seed + 3) - 0.5) * 0.6;
      B.d[yy * B.w + xx] = leaf[clamp(Math.floor(clamp(l) * 4.2 + bayer(xx, yy) * 0.8 - 0.4), 0, 4)];
      B.m[yy * B.w + xx] = 1;
    }
    const out = [];
    for (let yy = 0; yy < B.h; yy++) for (let xx = 0; xx < B.w; xx++) {
      if (B.d[yy * B.w + xx] >>> 24) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = xx + dx, b = yy + dy; if (a >= 0 && b >= 0 && a < B.w && b < B.h && (B.d[b * B.w + a] >>> 24)) { out.push(yy * B.w + xx); break; } }
    }
    for (const i of out) { B.d[i] = hex('#10261a'); B.m[i] = 1; }
    bushCache.set(key, B);
  }
  const ox = Math.round(x - B.w / 2), oy = Math.round(y - B.h);
  for (let yy = 0; yy < B.h; yy++) {
    const shift = rustle ? Math.round(Math.sin(yy * 0.9 + rustle * 25) * rustle * (1 - yy / B.h) * 2) : 0;
    for (let xx = 0; xx < B.w; xx++) {
      const c = B.d[yy * B.w + xx];
      if (c >>> 24) pset(s, ox + xx + shift, oy + yy, c);
    }
  }
}

// string of little festival bulbs along a sagging curve
export function stringLights(s, t, x0, y0, x1, y1, sag = 14, o = {}) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
  const wire = hex(o.wire ?? '#2b2236');
  let prev = null;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag;
    const p = [Math.round(x), Math.round(y)];
    if (prev) line(s, prev[0], prev[1], p[0], p[1], wire);
    prev = p;
    pts.push(p);
  }
  const cols = (o.colors ?? ['#ffcf6b', '#ff8a7a', '#8fe3ff', '#b7ff8a', '#ffb3f0']).map(hex);
  const step = o.step ?? 8;
  const bulbs = [];
  for (let i = step / 2; i < pts.length; i += step / 2) {
    const [x, y] = pts[Math.floor(i)];
    const k = Math.floor(i / (step / 2));
    const c = cols[k % cols.length];
    const on = 0.6 + 0.4 * Math.sin(t * 3 + k * 1.7);
    s.with({ flag: 2 }, () => { pset(s, x, y + 1, mix(c, '#ffffff', on * 0.3)); pset(s, x, y + 2, c); });
    bulbs.push([x, y + 2, c, on]);
  }
  return bulbs;
}

export function rock(s, x, y, w = 12, h = 7, seed = 1) {
  const c = ['#4b4760', '#6e6a82', '#9a98ac', '#c6c4d6'].map(hex);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    const nx = (dx + 0.5 - w / 2) / (w / 2), ny = (dy + 0.5 - h) / h;
    if (nx * nx + ny * ny > 1) continue;
    const l = 0.5 - nx * 0.4 - (ny + 0.5) * 0.6 + (hash2(dx, dy, seed) - 0.5) * 0.3;
    pset(s, x - w / 2 + dx, y - h + dy, c[clamp(Math.floor(l * 3.5 + bayer(dx, dy) * 0.6), 0, 3)]);
  }
}
