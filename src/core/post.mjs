// Post-processing on the low-res world surface + final resample to 1920x1080.
import { col, cr, cg, cb, hex, bayer, W, H } from './fb.mjs';
import { clamp } from './math.mjs';

export const OW = 1920, OH = 1080, K = OW / W; // 4x

let LB = null; // light accumulation buffer
// lights: [{x, y, r, c: '#hex', k}] in world coords. amb: [r,g,b] multipliers. bands: quantization levels (0 = smooth)
export function applyLighting(s, amb, lights = [], bands = 7) {
  const n = s.w * s.h;
  if (!LB || LB.length < n * 3) LB = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { LB[i * 3] = amb[0]; LB[i * 3 + 1] = amb[1]; LB[i * 3 + 2] = amb[2]; }
  for (const L of lights) {
    const c = hex(L.c || '#ffffff');
    const k = L.k ?? 1;
    const lr = (cr(c) / 255) * k, lg = (cg(c) / 255) * k, lb = (cb(c) / 255) * k;
    const lx = L.x - s.tx, ly = L.y - s.ty, r = L.r;
    const x0 = Math.max(0, Math.floor(lx - r)), x1 = Math.min(s.w - 1, Math.ceil(lx + r));
    const y0 = Math.max(0, Math.floor(ly - r)), y1 = Math.min(s.h - 1, Math.ceil(ly + r));
    const sy = L.sy ?? 1; // vertical squash of the light pool
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - lx, dy = (y + 0.5 - ly) / sy;
      const d2 = (dx * dx + dy * dy) / (r * r);
      if (d2 >= 1) continue;
      const f = (1 - d2) * (1 - d2);
      const i = (y * s.w + x) * 3;
      LB[i] += lr * f; LB[i + 1] += lg * f; LB[i + 2] += lb * f;
    }
  }
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const i = y * s.w + x;
    if (!(s.m[i] & 1)) continue;
    let r = LB[i * 3], g = LB[i * 3 + 1], b = LB[i * 3 + 2];
    if (bands) {
      const t = bayer(x + s.tx, y + s.ty);
      r = Math.floor(r * bands + t) / bands; g = Math.floor(g * bands + t) / bands; b = Math.floor(b * bands + t) / bands;
    }
    const d = s.d[i];
    s.d[i] = col(Math.min(255, cr(d) * r), Math.min(255, cg(d) * g), Math.min(255, cb(d) * b));
  }
}

let BA = null, BB = null;
// bloom from emissive pixels (flag bit 1) and/or very bright pixels
export function bloom(s, o = {}) {
  const strength = o.strength ?? 0.7, thr = o.threshold ?? 0.55, rad = o.radius ?? 5, all = o.all ?? false;
  const bw = Math.ceil(s.w / 2), bh = Math.ceil(s.h / 2), n = bw * bh;
  if (!BA || BA.length < n * 3) { BA = new Float32Array(n * 3); BB = new Float32Array(n * 3); }
  BA.fill(0, 0, n * 3);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const i = y * s.w + x;
    if (!all && !(s.m[i] & 2)) continue;
    const c = s.d[i];
    const r = cr(c) / 255, g = cg(c) / 255, b = cb(c) / 255;
    const l = Math.max(r, g, b);
    if (l < thr) continue;
    const k = (l - thr) / (1 - thr) * 0.25;
    const j = ((y >> 1) * bw + (x >> 1)) * 3;
    BA[j] += r * k; BA[j + 1] += g * k; BA[j + 2] += b * k;
  }
  const blurH = (src, dst) => {
    for (let y = 0; y < bh; y++) {
      let ar = 0, ag = 0, ab = 0;
      const o0 = y * bw;
      for (let x = -rad; x <= rad; x++) { const xx = clamp(x, 0, bw - 1); ar += src[(o0 + xx) * 3]; ag += src[(o0 + xx) * 3 + 1]; ab += src[(o0 + xx) * 3 + 2]; }
      for (let x = 0; x < bw; x++) {
        const j = (o0 + x) * 3;
        dst[j] = ar / (2 * rad + 1); dst[j + 1] = ag / (2 * rad + 1); dst[j + 2] = ab / (2 * rad + 1);
        const xo = clamp(x - rad, 0, bw - 1), xi = clamp(x + rad + 1, 0, bw - 1);
        ar += src[(o0 + xi) * 3] - src[(o0 + xo) * 3];
        ag += src[(o0 + xi) * 3 + 1] - src[(o0 + xo) * 3 + 1];
        ab += src[(o0 + xi) * 3 + 2] - src[(o0 + xo) * 3 + 2];
      }
    }
  };
  const blurV = (src, dst) => {
    for (let x = 0; x < bw; x++) {
      let ar = 0, ag = 0, ab = 0;
      for (let y = -rad; y <= rad; y++) { const yy = clamp(y, 0, bh - 1); const j = (yy * bw + x) * 3; ar += src[j]; ag += src[j + 1]; ab += src[j + 2]; }
      for (let y = 0; y < bh; y++) {
        const j = (y * bw + x) * 3;
        dst[j] = ar / (2 * rad + 1); dst[j + 1] = ag / (2 * rad + 1); dst[j + 2] = ab / (2 * rad + 1);
        const yo = clamp(y - rad, 0, bh - 1), yi = clamp(y + rad + 1, 0, bh - 1);
        const jo = (yo * bw + x) * 3, ji = (yi * bw + x) * 3;
        ar += src[ji] - src[jo]; ag += src[ji + 1] - src[jo + 1]; ab += src[ji + 2] - src[jo + 2];
      }
    }
  };
  blurH(BA, BB); blurV(BB, BA); blurH(BA, BB); blurV(BB, BA);
  const st = strength * 255 * 4;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    // bilinear upsample of the half-res bloom
    const fx = (x - 0.5) / 2, fy = (y - 0.5) / 2;
    const x0 = clamp(Math.floor(fx), 0, bw - 1), y0 = clamp(Math.floor(fy), 0, bh - 1);
    const x1 = Math.min(bw - 1, x0 + 1), y1 = Math.min(bh - 1, y0 + 1);
    const tx = clamp(fx - x0), ty = clamp(fy - y0);
    const a = (y0 * bw + x0) * 3, b = (y0 * bw + x1) * 3, c = (y1 * bw + x0) * 3, d = (y1 * bw + x1) * 3;
    const w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty;
    const r = (BA[a] * w0 + BA[b] * w1 + BA[c] * w2 + BA[d] * w3) * st;
    const g = (BA[a + 1] * w0 + BA[b + 1] * w1 + BA[c + 1] * w2 + BA[d + 1] * w3) * st;
    const bl = (BA[a + 2] * w0 + BA[b + 2] * w1 + BA[c + 2] * w2 + BA[d + 2] * w3) * st;
    if (r + g + bl < 1.5) continue;
    const i = y * s.w + x, p = s.d[i];
    s.d[i] = col(Math.min(255, cr(p) + r), Math.min(255, cg(p) + g), Math.min(255, cb(p) + bl));
  }
}

// Color grade: { sat, contrast, bright, tint:[r,g,b] mult, lift:[r,g,b] add (0..255), gamma }
export function grade(s, g) {
  if (!g) return;
  const sat = g.sat ?? 1, con = g.contrast ?? 1, br = g.bright ?? 1, gam = g.gamma ?? 1;
  const tint = g.tint || [1, 1, 1], lift = g.lift || [0, 0, 0];
  const lut = [0, 1, 2].map((ch) => {
    const t = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let x = v / 255;
      x = Math.pow(x, 1 / gam);
      x = (x - 0.5) * con + 0.5;
      x = x * br * tint[ch] + lift[ch] / 255;
      t[v] = clamp(Math.round(x * 255), 0, 255);
    }
    return t;
  });
  const n = s.w * s.h;
  for (let i = 0; i < n; i++) {
    const c = s.d[i];
    let r = cr(c), gg = cg(c), b = cb(c);
    if (sat !== 1) {
      const l = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = clamp(l + (r - l) * sat, 0, 255); gg = clamp(l + (gg - l) * sat, 0, 255); b = clamp(l + (b - l) * sat, 0, 255);
    }
    s.d[i] = col(lut[0][r | 0], lut[1][gg | 0], lut[2][b | 0]);
  }
}

export function vignette(s, k = 0.35, zoom = 1, fx = 0, fy = 0) {
  if (k <= 0) return;
  const vw = W / zoom, vh = H / zoom;
  for (let y = 0; y < s.h; y++) {
    const v = (y + 0.5 - fy) / vh - 0.5;
    for (let x = 0; x < s.w; x++) {
      const u = (x + 0.5 - fx) / vw - 0.5;
      const d = Math.sqrt(u * u * 1.0 + v * v * 1.6);
      const f = 1 - k * clamp((d - 0.32) / 0.45) ** 1.5;
      if (f >= 0.999) continue;
      const i = y * s.w + x, c = s.d[i];
      s.d[i] = col(cr(c) * f, cg(c) * f, cb(c) * f);
    }
  }
}

// Resample world surface to the 1920x1080 output with fractional camera offset + zoom.
const colMap = new Int32Array(OW);
export function resample(out, src, fracX = 0, fracY = 0, zoom = 1) {
  const sc = K * zoom;
  for (let X = 0; X < OW; X++) colMap[X] = Math.min(src.w - 1, Math.floor(fracX + X / sc));
  let prev = -1;
  const d = src.d;
  for (let Y = 0; Y < OH; Y++) {
    const sy = Math.min(src.h - 1, Math.floor(fracY + Y / sc));
    const o = Y * OW;
    if (sy === prev) { out.copyWithin(o, o - OW, o); continue; }
    prev = sy;
    const so = sy * src.w;
    for (let X = 0; X < OW; X++) out[o + X] = d[so + colMap[X]] | 0xff000000;
  }
}

// Composite 480x270 UI surface (alpha in top byte, 0 = transparent) at 4x
export function compositeUI(out, ui) {
  for (let y = 0; y < ui.h; y++) for (let x = 0; x < ui.w; x++) {
    const c = ui.d[y * ui.w + x];
    const a = c >>> 24;
    if (!a) continue;
    const o = y * K * OW + x * K;
    if (a >= 255) {
      for (let r = 0; r < K; r++) out.fill(c, o + r * OW, o + r * OW + K);
    } else {
      const t = a / 255;
      for (let r = 0; r < K; r++) for (let q = 0; q < K; q++) {
        const j = o + r * OW + q, p = out[j];
        out[j] = col(cr(p) + (cr(c) - cr(p)) * t, cg(p) + (cg(c) - cg(p)) * t, cb(p) + (cb(c) - cb(p)) * t);
      }
    }
  }
}

// Mask-based combine at output resolution with a low-res (480x270) decision function
export function combine(outA, outB, maskFn) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!maskFn(x, y)) continue;
    const o = y * K * OW + x * K;
    for (let r = 0; r < K; r++) {
      const j = o + r * OW;
      outA.set(outB.subarray(j, j + K), j);
    }
  }
}

export function fadeOut(out, k, color = 0xff000000) {
  if (k <= 0) return;
  const R = cr(color), G = cg(color), B = cb(color);
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    out[i] = col(cr(c) + (R - cr(c)) * k, cg(c) + (G - cg(c)) * k, cb(c) + (B - cb(c)) * k);
  }
}
