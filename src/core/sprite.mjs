// Character-grid pixel art pipeline (ported from the reference sprite sheet) + sprite blitting.
import { hex, bayer, col, cr, cg, cb, mix } from './fb.mjs';

export const EMPTY = '.';
export const createGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill(EMPTY));
export const inBounds = (g, x, y) => y >= 0 && y < g.length && x >= 0 && x < g[0].length;
export const set = (g, x, y, ch) => { if (inBounds(g, x, y)) g[y][x] = ch; };
export const get = (g, x, y) => (inBounds(g, x, y) ? g[y][x] : EMPTY);
export function fillRect(g, x, y, w, h, ch = 'o') {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(g, xx, yy, ch);
}
export const isSolid = (g, x, y) => inBounds(g, x, y) && g[y][x] !== EMPTY;
export function run(g, x, y, dx, dy) {
  let n = 0;
  while (isSolid(g, x + dx * (n + 1), y + dy * (n + 1))) n++;
  return n + 1;
}
export function replaceAll(g, from, to) {
  for (const row of g) for (let x = 0; x < row.length; x++) if (row[x] === from) row[x] = to;
}

// Reference shading: top/left rims lit, bottom/right rims shaded, checker-dithered transitions.
export function shade(g, base = 'o', light = 'h', dark = 's') {
  const out = g.map((r) => [...r]);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y][x] !== base) continue;
    const top = run(g, x, y, 0, -1), left = run(g, x, y, -1, 0);
    const right = run(g, x, y, 1, 0), bottom = run(g, x, y, 0, 1);
    const checker = (x + y) % 2 === 0;
    if (top === 1 || left === 1) out[y][x] = light;
    else if (right <= 2 || bottom <= 2) out[y][x] = dark;
    else if (top === 2 && checker) out[y][x] = light;
    else if ((right === 3 || bottom === 3) && checker) out[y][x] = dark;
  }
  g.forEach((row, y) => row.forEach((_, x) => (g[y][x] = out[y][x])));
}

export function outline(g, ch = 'O') {
  const t = [];
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y][x] !== EMPTY) continue;
    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1 && !hit; dx++)
      if (isSolid(g, x + dx, y + dy) && g[y + dy][x + dx] !== ch) hit = true;
    if (hit) t.push([x, y]);
  }
  t.forEach(([x, y]) => (g[y][x] = ch));
}

// Rounded mitten hand with seam outline against the body (reference algorithm, optional fixed placement)
export function stampHand(g, x, y, size, dir, tones, seam = 'O', fixed = false) {
  const cells = [];
  for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++)
    if (!((xx === 0 || xx === size - 1) && (yy === 0 || yy === size - 1))) cells.push([xx, yy]);
  const has = new Set(cells.map(([cx, cy]) => cx + ',' + cy));
  const inHand = (cx, cy) => has.has(cx + ',' + cy);
  const overlap = (ox) => cells.filter(([cx, cy]) => isSolid(g, ox + cx, y + cy)).length;
  let ox = x;
  if (!fixed) while (overlap(ox) > cells.length / 2 && ox > -size && ox < g[0].length) ox += dir;
  for (const [cx, cy] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = cx + dx, ny = cy + dy;
    if (!inHand(nx, ny) && isSolid(g, ox + nx, y + ny)) set(g, ox + nx, y + ny, seam);
  }
  for (const [cx, cy] of cells) {
    const tone = !inHand(cx, cy - 1) || !inHand(cx - 1, cy) ? tones.h : !inHand(cx, cy + 1) || !inHand(cx + 1, cy) ? tones.s : tones.o;
    set(g, ox + cx, y + cy, tone);
  }
  return ox;
}

// ---------- sprites ----------
// sprite: { w, h, d: Uint32Array (0 = transparent), ax, ay (anchor), em?: Uint8Array emissive mask }
export function toSprite(g, pal, ax, ay, emissiveKeys = null) {
  const h = g.length, w = g[0].length;
  const d = new Uint32Array(w * h);
  const em = emissiveKeys ? new Uint8Array(w * h) : null;
  const cache = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = g[y][x];
    if (ch === EMPTY) continue;
    let c = cache[ch];
    if (c === undefined) c = cache[ch] = pal[ch] !== undefined ? hex(pal[ch]) : 0;
    d[y * w + x] = c;
    if (em && emissiveKeys.includes(ch)) em[y * w + x] = 1;
  }
  return { w, h, d, em, ax: ax ?? (w >> 1), ay: ay ?? h };
}

export function blankSprite(w, h, ax, ay) {
  return { w, h, d: new Uint32Array(w * h), ax: ax ?? (w >> 1), ay: ay ?? h };
}

const caches = new Map();
export function cached(ns, key, build) {
  let m = caches.get(ns);
  if (!m) caches.set(ns, (m = new Map()));
  let v = m.get(key);
  if (v === undefined) {
    if (m.size > 4000) m.clear();
    v = build();
    m.set(key, v);
  }
  return v;
}

// Blit sprite with its anchor at world (x, y).
// o: flip, scale, alpha (dithered), flash (0..1 to white), tint [color, amt], dark (brightness mult),
//    sil (silhouette color), flag (material), clipY (only rows with world y < clipY are drawn)
export function blit(s, spr, x, y, o = {}) {
  if (!spr) return;
  const sc = o.scale ?? 1;
  const flip = !!o.flip;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  const flag = o.flag ?? s.flag;
  const tintC = o.tint ? hex(o.tint[0]) : 0, tintA = o.tint ? o.tint[1] : 0;
  const flash = o.flash ?? 0, dark = o.dark ?? 1;
  const sil = o.sil !== undefined ? hex(o.sil) : null;
  const ow = Math.max(1, Math.round(spr.w * sc)), oh = Math.max(1, Math.round(spr.h * sc));
  const left = Math.round(x - spr.ax * sc), top = Math.round(y - spr.ay * sc);
  const fast = sc === 1 && !flash && !tintA && dark === 1 && sil === null;
  for (let yy = 0; yy < oh; yy++) {
    const wy = top + yy;
    if (o.clipY !== undefined && wy >= o.clipY) break;
    const sy = wy - s.ty;
    if (sy < 0 || sy >= s.h) continue;
    const srcY = sc === 1 ? yy : Math.min(spr.h - 1, Math.floor(yy / sc));
    for (let xx = 0; xx < ow; xx++) {
      const wx = left + xx;
      const sx = wx - s.tx;
      if (sx < 0 || sx >= s.w) continue;
      let srcX = sc === 1 ? xx : Math.min(spr.w - 1, Math.floor(xx / sc));
      if (flip) srcX = spr.w - 1 - srcX;
      const si = srcY * spr.w + srcX;
      let c = spr.d[si];
      if (!(c >>> 24)) continue;
      if (alpha < 1 && bayer(wx, wy) >= alpha) continue;
      if (!fast) {
        if (sil !== null) c = sil;
        else {
          if (tintA) c = mix(c, tintC, tintA);
          if (dark !== 1) c = col(Math.min(255, cr(c) * dark), Math.min(255, cg(c) * dark), Math.min(255, cb(c) * dark));
          if (flash) c = mix(c, 0xffffffff, flash);
        }
      }
      const i = sy * s.w + sx;
      s.d[i] = c;
      s.m[i] = spr.em && spr.em[si] ? 2 : flag;
    }
  }
}

// Render a sprite's silhouette shadow (dithered ellipse) on the ground
export function groundShadow(s, x, y, w, alpha = 0.35, color = '#000000') {
  const c = hex(color);
  const rx = w / 2;
  for (let yy = -1; yy <= 1; yy++) {
    const ww = yy === 0 ? rx : rx * 0.75;
    for (let xx = Math.round(x - ww); xx < Math.round(x + ww); xx++) {
      const wx = xx, wy = Math.round(y) + yy;
      const sx = wx - s.tx, sy = wy - s.ty;
      if (sx < 0 || sy < 0 || sx >= s.w || sy >= s.h) continue;
      if (bayer(wx, wy) < alpha) {
        const i = sy * s.w + sx;
        s.d[i] = mix(s.d[i], c, 0.55);
      }
    }
  }
}
