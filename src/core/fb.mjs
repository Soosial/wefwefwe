// Low-resolution framebuffer ("Surface") with packed ABGR pixels, a per-pixel material flag
// (bit0 = lit by scene lights, bit1 = emissive / bloom source) and pixel-art primitives.
import { clamp } from './math.mjs';

export const W = 480;
export const H = 270;

export const col = (r, g, b, a = 255) =>
  (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
export const cr = (c) => c & 255;
export const cg = (c) => (c >>> 8) & 255;
export const cb = (c) => (c >>> 16) & 255;
export const ca = (c) => c >>> 24;

const hexCache = new Map();
export function hex(h) {
  if (typeof h === 'number') return h;
  let v = hexCache.get(h);
  if (v !== undefined) return v;
  const s = h.replace('#', '');
  v = col(parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255);
  hexCache.set(h, v);
  return v;
}
export const rgbArr = (c) => [cr(c), cg(c), cb(c)];
export function mix(c1, c2, t) {
  c1 = hex(c1); c2 = hex(c2);
  if (t <= 0) return c1;
  if (t >= 1) return c2;
  return col(cr(c1) + (cr(c2) - cr(c1)) * t, cg(c1) + (cg(c2) - cg(c1)) * t, cb(c1) + (cb(c2) - cb(c1)) * t, ca(c1) + (ca(c2) - ca(c1)) * t);
}
export function mul(c, k) {
  c = hex(c);
  return col(clamp(cr(c) * k, 0, 255), clamp(cg(c) * k, 0, 255), clamp(cb(c) * k, 0, 255), ca(c));
}
export function addc(c, r, g, b) {
  c = hex(c);
  return col(clamp(cr(c) + r, 0, 255), clamp(cg(c) + g, 0, 255), clamp(cb(c) + b, 0, 255), ca(c));
}
export const luma = (c) => 0.299 * cr(c) + 0.587 * cg(c) + 0.114 * cb(c);
export function desat(c, amt) {
  c = hex(c);
  const l = luma(c);
  return col(cr(c) + (l - cr(c)) * amt, cg(c) + (l - cg(c)) * amt, cb(c) + (l - cb(c)) * amt, ca(c));
}
export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return col(f(0), f(8), f(4));
}

export const BAYER4 = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16));
export const bayer = (x, y) => BAYER4[((y & 3) << 2) | (x & 3)];
export const dith = (x, y, a) => a > 0 && (a >= 1 || bayer(x, y) < a);

export class Surface {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint32Array(w * h);
    this.m = new Uint8Array(w * h);
    this.tx = 0; // world -> surface translation (camera)
    this.ty = 0;
    this.flag = 1; // material flag written by primitives
  }
  clear(c = 0xff000000, flag = 0) {
    this.d.fill(hex(c));
    this.m.fill(flag);
  }
  get(x, y) {
    x = Math.floor(x - this.tx); y = Math.floor(y - this.ty);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
  // run fn with a temporary flag / translation
  with(opts, fn) {
    const f = this.flag, tx = this.tx, ty = this.ty;
    if (opts.flag !== undefined) this.flag = opts.flag;
    if (opts.dx !== undefined) this.tx = tx - opts.dx;
    if (opts.dy !== undefined) this.ty = ty - opts.dy;
    if (opts.parallax !== undefined) { this.tx = Math.round(tx * opts.parallax); this.ty = Math.round(ty * (opts.parallaxY ?? opts.parallax)); }
    try { fn(); } finally { this.flag = f; this.tx = tx; this.ty = ty; }
  }
}

// ---------- pixel ops ----------
export function pset(s, x, y, c) {
  if (typeof c === "string") c = hex(c);
  x = Math.floor(x) - s.tx; y = Math.floor(y) - s.ty;
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return;
  const i = y * s.w + x;
  s.d[i] = c; s.m[i] = s.flag;
}
export function pblend(s, x, y, c, a) {
  if (typeof c === "string") c = hex(c);
  x = Math.floor(x) - s.tx; y = Math.floor(y) - s.ty;
  if (x < 0 || y < 0 || x >= s.w || y >= s.h || a <= 0) return;
  const i = y * s.w + x;
  if (a >= 1) { s.d[i] = c; s.m[i] = s.flag; return; }
  const d = s.d[i];
  s.d[i] = col(cr(d) + (cr(c) - cr(d)) * a, cg(d) + (cg(c) - cg(d)) * a, cb(d) + (cb(c) - cb(d)) * a);
}
export function padd(s, x, y, r, g, b) {
  x = Math.floor(x) - s.tx; y = Math.floor(y) - s.ty;
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return;
  const i = y * s.w + x, d = s.d[i];
  s.d[i] = col(Math.min(255, cr(d) + r), Math.min(255, cg(d) + g), Math.min(255, cb(d) + b));
}
// dithered alpha set (keeps crisp pixel look)
export function pdith(s, x, y, c, a) {
  if (typeof c === "string") c = hex(c);
  const wx = Math.floor(x), wy = Math.floor(y);
  if (a >= 1 || (a > 0 && bayer(wx, wy) < a)) pset(s, wx, wy, c);
}

// ---------- shapes ----------
export function rect(s, x, y, w, h, c, a = 1) {
  c = hex(c);
  let x0 = Math.floor(x) - s.tx, y0 = Math.floor(y) - s.ty;
  let x1 = x0 + Math.round(w), y1 = y0 + Math.round(h);
  if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
  if (x1 > s.w) x1 = s.w; if (y1 > s.h) y1 = s.h;
  if (x1 <= x0 || y1 <= y0 || a <= 0) return;
  const f = s.flag;
  for (let yy = y0; yy < y1; yy++) {
    const o = yy * s.w;
    if (a >= 1) { s.d.fill(c, o + x0, o + x1); s.m.fill(f, o + x0, o + x1); continue; }
    for (let xx = x0; xx < x1; xx++) if (bayer(xx + s.tx, yy + s.ty) < a) { s.d[o + xx] = c; s.m[o + xx] = f; }
  }
}
// smooth alpha rectangle (for overlays / fades)
export function rectBlend(s, x, y, w, h, c, a) {
  c = hex(c);
  let x0 = Math.floor(x) - s.tx, y0 = Math.floor(y) - s.ty;
  let x1 = x0 + Math.round(w), y1 = y0 + Math.round(h);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(s.w, x1); y1 = Math.min(s.h, y1);
  const r = cr(c), g = cg(c), b = cb(c);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const i = yy * s.w + xx, d = s.d[i];
    s.d[i] = col(cr(d) + (r - cr(d)) * a, cg(d) + (g - cg(d)) * a, cb(d) + (b - cb(d)) * a);
  }
}
export const hline = (s, x, y, w, c, a = 1) => rect(s, x, y, w, 1, c, a);
export const vline = (s, x, y, h, c, a = 1) => rect(s, x, y, 1, h, c, a);

export function line(s, x0, y0, x1, y1, c, a = 1) {
  c = hex(c);
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 4000; n++) {
    if (a >= 1) pset(s, x0, y0, c); else pdith(s, x0, y0, c, a);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
export function thickLine(s, x0, y0, x1, y1, c, w = 2) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    disc(s, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c);
  }
}

export function disc(s, cx, cy, r, c, a = 1) {
  c = hex(c);
  const r2 = r * r;
  const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    const span = r2 - dy * dy;
    if (span < 0) continue;
    const hw = Math.sqrt(span);
    const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
    if (xb > xa) rect(s, xa, y, xb - xa, 1, c, a);
  }
}
export function ellipse(s, cx, cy, rx, ry, c, a = 1) {
  c = hex(c);
  if (rx <= 0 || ry <= 0) return;
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    const dy = (y + 0.5 - cy) / ry;
    const span = 1 - dy * dy;
    if (span < 0) continue;
    const hw = Math.sqrt(span) * rx;
    const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
    if (xb > xa) rect(s, xa, y, xb - xa, 1, c, a);
  }
}
export function ring(s, cx, cy, r, c, th = 1, a = 1) {
  c = hex(c);
  const ro = r + th / 2, ri = Math.max(0, r - th / 2);
  const y0 = Math.floor(cy - ro), y1 = Math.ceil(cy + ro);
  const x0 = Math.floor(cx - ro), x1 = Math.ceil(cx + ro);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= ro && d >= ri) { if (a >= 1) pset(s, x, y, c); else pdith(s, x, y, c, a); }
  }
}
export function ellipseRing(s, cx, cy, rx, ry, c, a = 1) {
  c = hex(c);
  const n = Math.max(12, Math.ceil((rx + ry) * 3));
  let px = null, py = null;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(t) * rx), y = Math.round(cy + Math.sin(t) * ry);
    if (x !== px || y !== py) { if (a >= 1) pset(s, x, y, c); else pdith(s, x, y, c, a); }
    px = x; py = y;
  }
}

// scanline polygon fill, pts = [[x,y],...]
export function poly(s, pts, c, a = 1) {
  c = hex(c);
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  minY = Math.floor(minY); maxY = Math.ceil(maxY);
  const xs = [];
  for (let y = minY; y <= maxY; y++) {
    const sy = y + 0.5;
    xs.length = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= sy && q[1] > sy) || (q[1] <= sy && p[1] > sy)) xs.push(p[0] + ((sy - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((u, v) => u - v);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
      if (xb > xa) rect(s, xa, y, xb - xa, 1, c, a);
    }
  }
}

// additive soft light blob (smooth falloff, optionally banded for a pixel look)
export function glow(s, cx, cy, r, c, k = 1, bands = 0) {
  c = hex(c);
  const R = cr(c) * k, G = cg(c) * k, B = cb(c) * k;
  const x0 = Math.floor(cx - r) - s.tx, x1 = Math.ceil(cx + r) - s.tx;
  const y0 = Math.floor(cy - r) - s.ty, y1 = Math.ceil(cy + r) - s.ty;
  const ccx = cx - s.tx, ccy = cy - s.ty;
  for (let y = Math.max(0, y0); y <= Math.min(s.h - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(s.w - 1, x1); x++) {
      const d = Math.hypot(x + 0.5 - ccx, y + 0.5 - ccy) / r;
      if (d >= 1) continue;
      let f = (1 - d) * (1 - d);
      if (bands > 0) f = Math.floor(f * bands + bayer(x + s.tx, y + s.ty)) / bands;
      if (f <= 0) continue;
      const i = y * s.w + x, d0 = s.d[i];
      s.d[i] = col(Math.min(255, cr(d0) + R * f), Math.min(255, cg(d0) + G * f), Math.min(255, cb(d0) + B * f));
    }
  }
}

// vertical gradient through color stops [[t, color], ...] with ordered dithering between quantized steps
export function gradV(s, x, y, w, h, stops, levels = 24) {
  const x0 = Math.max(0, Math.floor(x) - s.tx), x1 = Math.min(s.w, Math.floor(x) - s.tx + w);
  const y0 = Math.floor(y) - s.ty;
  const st = stops.map(([t, c]) => [t, hex(c)]);
  for (let yy = 0; yy < h; yy++) {
    const sy = y0 + yy;
    if (sy < 0 || sy >= s.h) continue;
    const t = h <= 1 ? 0 : yy / (h - 1);
    let i = 0;
    while (i < st.length - 2 && t > st[i + 1][0]) i++;
    const a = st[i], b = st[i + 1];
    const u = clamp((t - a[0]) / (b[0] - a[0] || 1));
    const q = u * levels, base = Math.floor(q), fr = q - base;
    const o = sy * s.w;
    for (let xx = x0; xx < x1; xx++) {
      const lv = (base + (bayer(xx + s.tx, sy + s.ty) < fr ? 1 : 0)) / levels;
      s.d[o + xx] = mix(a[1], b[1], lv);
      s.m[o + xx] = s.flag;
    }
  }
}

// copy src surface into dst at (x, y) (world coords), transparent where alpha == 0
export function draw(s, src, x, y, opts = {}) {
  const ox = Math.floor(x) - s.tx, oy = Math.floor(y) - s.ty;
  const a = opts.alpha ?? 1;
  for (let yy = 0; yy < src.h; yy++) {
    const dy = oy + yy;
    if (dy < 0 || dy >= s.h) continue;
    for (let xx = 0; xx < src.w; xx++) {
      const dx = ox + xx;
      if (dx < 0 || dx >= s.w) continue;
      const c = src.d[yy * src.w + xx];
      if (!(c >>> 24)) continue;
      if (a < 1 && bayer(dx, dy) >= a) continue;
      const i = dy * s.w + dx;
      s.d[i] = c;
      s.m[i] = opts.flag ?? src.m[yy * src.w + xx];
    }
  }
}
