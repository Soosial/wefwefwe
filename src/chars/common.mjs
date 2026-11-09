// Shared face parts + character factory helpers.
import { set, fillRect, get, cached, toSprite, blit, groundShadow } from '../core/sprite.mjs';
import { hex, desat, mix, mul } from '../core/fb.mjs';
import { fonts } from '../core/font.mjs';

// Generic eye in a w x h box at (ex, ey). side: 0 = left eye (inner edge on the right), 1 = right eye.
// body: char used to "erase" back to body color.
export function drawEye(g, ex, ey, w, h, style, side, body = 'o') {
  const inner = side === 0 ? 1 : -1; // direction towards the face center
  const k = 'k', wh = 'w';
  const big = w >= 6;
  const hl = () => {
    fillRect(g, ex + (big ? 1 : 0), ey + (big ? 1 : 0), 2, 2, wh);
    set(g, ex + w - (big ? 2 : 1), ey + h - (big ? 3 : 2), wh);
  };
  switch (style) {
    case 'blink':
      fillRect(g, ex, ey + h - (big ? 3 : 2), w, big ? 2 : 1, k);
      break;
    case 'closed': // content closed eyes: a little smile-shaped arc
      for (let x = 0; x < w; x++) set(g, ex + x, ey + h - 2 - (x === 0 || x === w - 1 ? 1 : 0), k);
      if (big) for (let x = 1; x < w - 1; x++) set(g, ex + x, ey + h - 1 - (x === 1 || x === w - 2 ? 1 : 0), k);
      break;
    case 'happy': { // ^ ^
      const m = Math.floor(w / 2);
      const top = ey + (big ? 2 : 1);
      if (big) {
        fillRect(g, ex + m - 1, top, 2, 1, k);
        fillRect(g, ex + m - 2, top + 1, 4, 1, k);
        set(g, ex + 1, top + 2, k); set(g, ex + 2, top + 2, k); set(g, ex + w - 2, top + 2, k); set(g, ex + w - 3, top + 2, k);
        set(g, ex, top + 3, k); set(g, ex + 1, top + 3, k); set(g, ex + w - 1, top + 3, k); set(g, ex + w - 2, top + 3, k);
      } else {
        fillRect(g, ex + 1, top, w - 2, 1, k);
        set(g, ex, top + 1, k); set(g, ex + w - 1, top + 1, k);
        set(g, ex, top + 2, k); set(g, ex + w - 1, top + 2, k);
      }
      break;
    }
    case 'laugh': { // > <
      const cy = ey + Math.floor(h / 2);
      for (let i = 0; i < (big ? 4 : 3); i++) {
        const x = side === 0 ? ex + i : ex + w - 1 - i;
        set(g, x, cy - (big ? 2 : 1) + i, k);
        set(g, x, cy + (big ? 2 : 1) - i, k);
        if (big) { set(g, x + (side === 0 ? 1 : -1), cy - 2 + i, k); set(g, x + (side === 0 ? 1 : -1), cy + 2 - i, k); }
      }
      break;
    }
    case 'shock': {
      fillRect(g, ex, ey, w, h, 'w');
      const pw = big ? 2 : 2, ph = big ? 3 : 2;
      fillRect(g, ex + Math.floor((w - pw) / 2), ey + Math.floor((h - ph) / 2), pw, ph, k);
      break;
    }
    case 'dot':
      fillRect(g, ex + Math.floor(w / 2) - 1, ey + Math.floor(h / 2) - 1, 2, 2, k);
      break;
    case 'half': // tired / heavy lids
      fillRect(g, ex, ey + Math.ceil(h / 2) - 1, w, Math.floor(h / 2) + 1, k);
      set(g, ex + (big ? 1 : 0), ey + Math.ceil(h / 2), wh);
      break;
    case 'sad': // droopy: outer top corner cut + glossy
      fillRect(g, ex, ey + 1, w, h - 1, k);
      for (let i = 0; i < (big ? 3 : 2); i++) set(g, side === 0 ? ex + i : ex + w - 1 - i, ey + 1, body);
      if (big) set(g, side === 0 ? ex : ex + w - 1, ey + 2, body);
      fillRect(g, ex + (big ? 2 : 1), ey + (big ? 3 : 2), 2, 2, wh);
      set(g, ex + (big ? 1 : 1), ey + h - 2, wh);
      if (big) set(g, ex + w - 2, ey + h - 2, wh);
      break;
    case 'teary':
      fillRect(g, ex, ey, w, h, k);
      for (let i = 0; i < (big ? 2 : 1); i++) set(g, side === 0 ? ex + i : ex + w - 1 - i, ey, body);
      fillRect(g, ex + (big ? 1 : 0), ey + 1, big ? 3 : 2, big ? 3 : 2, wh);
      fillRect(g, ex + w - (big ? 3 : 2), ey + h - (big ? 3 : 2), 2, big ? 2 : 1, wh);
      fillRect(g, ex, ey + h - 1, w, 1, 't');
      break;
    case 'angry': // inner top corner cut
      fillRect(g, ex, ey, w, h, k);
      for (let i = 0; i < (big ? 3 : 2); i++) for (let j = 0; j <= (big ? 2 - i : 1 - i); j++)
        set(g, side === 0 ? ex + w - 1 - i : ex + i, ey + j, body);
      set(g, ex + (side === 0 ? (big ? 1 : 0) : w - (big ? 3 : 2)), ey + (big ? 3 : 2), wh);
      break;
    case 'star': // sparkly admiration
      fillRect(g, ex, ey, w, h, k);
      if (big) {
        set(g, ex + 2, ey + 1, wh); fillRect(g, ex + 1, ey + 2, 3, 1, wh); set(g, ex + 2, ey + 3, wh);
        set(g, ex + 4, ey + 5, wh); set(g, ex + 3, ey + 6, wh);
      } else {
        set(g, ex + 1, ey, wh); fillRect(g, ex, ey + 1, 3, 1, wh); set(g, ex + 1, ey + 2, wh); set(g, ex + 3, ey + 4, wh);
      }
      break;
    case 'squint':
      fillRect(g, ex, ey + h - (big ? 4 : 3), w, big ? 3 : 2, k);
      set(g, ex + 1, ey + h - (big ? 4 : 3), wh);
      break;
    case 'wince': { // shut tight  >  <
      const cy = ey + Math.floor(h / 2);
      fillRect(g, ex, cy, w, 1, k);
      set(g, side === 0 ? ex : ex + w - 1, cy - 1, k);
      set(g, side === 0 ? ex : ex + w - 1, cy + 1, k);
      break;
    }
    case 'up': // looking up
      fillRect(g, ex, ey, w, h, k);
      fillRect(g, ex + (big ? 1 : 0), ey, 2, 2, wh);
      break;
    case 'open':
    default:
      fillRect(g, ex, ey, w, h, k);
      hl();
  }
}

export function drawTears(g, ex, ey, w, h, amt) {
  if (!amt) return;
  const n = Math.round(amt * 6);
  for (let i = 0; i < n; i++) set(g, ex + 1, ey + h + i, i % 2 ? 'T' : 't');
}

// mouth anchored with (cx = center column between the two mouth corners, my = top row)
export function drawMouth(g, cx, my, style, big = true) {
  const m = 'm';
  switch (style) {
    case 'none': break;
    case 'flat': fillRect(g, cx - 2, my + 1, 4, 1, m); break;
    case 'frown': set(g, cx - 3, my + 1, m); set(g, cx + 2, my + 1, m); fillRect(g, cx - 2, my, 4, 1, m); break;
    case 'o': fillRect(g, cx - 1, my, 2, 2, m); break;
    case 'open': fillRect(g, cx - 2, my, 4, 3, m); fillRect(g, cx - 1, my + 2, 2, 1, 'q'); break;
    case 'shout': fillRect(g, cx - 2, my - 1, 4, 4, m); fillRect(g, cx - 1, my + 2, 2, 1, 'q'); break;
    case 'big': fillRect(g, cx - 4, my, 8, 1, m); fillRect(g, cx - 3, my + 1, 6, 1, m); fillRect(g, cx - 2, my + 2, 4, 1, 'q'); set(g, cx - 3, my + 2, m); set(g, cx + 2, my + 2, m); break;
    case 'grin': set(g, cx - 4, my, m); set(g, cx + 3, my, m); fillRect(g, cx - 3, my + 1, 6, 1, m); break;
    case 'wobble': for (let i = -3; i <= 2; i++) set(g, cx + i, my + ((i & 1) ? 0 : 1), m); break;
    case 'cat': set(g, cx - 3, my, m); set(g, cx - 2, my + 1, m); set(g, cx - 1, my, m); set(g, cx, my, m); set(g, cx + 1, my + 1, m); set(g, cx + 2, my, m); break;
    case 'smirk': set(g, cx + 2, my, m); fillRect(g, cx - 2, my + 1, 4, 1, m); break;
    case 'teeth': fillRect(g, cx - 3, my, 6, 3, m); fillRect(g, cx - 2, my + 1, 4, 1, 'w'); break;
    case 'smile':
    default:
      if (big) { set(g, cx - 3, my, m); set(g, cx + 2, my, m); fillRect(g, cx - 2, my + 1, 4, 1, m); }
      else { set(g, cx - 2, my, m); set(g, cx + 1, my, m); fillRect(g, cx - 1, my + 1, 2, 1, m); }
  }
}

// Render a short string with the tiny font into a char grid
export function gridText(g, str, x, y, ch, font = 'tiny') {
  const f = fonts[font];
  let cx = x;
  for (const c of str) {
    const gl = f.glyphs[c] || f.glyphs[c.toUpperCase()] || f.glyphs['?'];
    for (let r = 0; r < gl.h; r++) for (let q = 0; q < gl.w; q++) if (gl.bits[r][q]) set(g, cx + gl.x + q, y + (gl.y - f.capTop) + r, ch);
    cx += gl.a;
  }
  return cx - x;
}
export function gridTextWidth(str, font = 'tiny') {
  const f = fonts[font];
  let w = 0;
  for (const c of str) w += (f.glyphs[c] || f.glyphs['?']).a;
  return w - 1;
}

// palette transform: saturation, brightness, tint
export function palette(base, o = {}) {
  const out = {};
  for (const k in base) {
    let c = hex(base[k]);
    if (o.sat !== undefined && o.sat !== 1) c = desat(c, 1 - o.sat);
    if (o.tint) c = mix(c, o.tint[0], o.tint[1]);
    if (o.bright !== undefined && o.bright !== 1) c = mul(c, o.bright);
    out[k] = c;
  }
  return out;
}

const q = (v, step = 0.05) => Math.round((v ?? 0) / step) * step;
// grid params: arrays and most scalars must be integer pixel offsets; shape params stay fractional (quantized)
const FLOAT = new Set(['sharp', 'R', 'sx', 'sy', 'rot', 'cy', 'tears', 'orange', 'tail', 'fin', 'core']);
function norm(k, v) {
  if (typeof v === 'number') return FLOAT.has(k) ? Math.round(v * 100) / 100 : Math.round(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'number' ? Math.round(x) : x));
  return v;
}

// makeChar: gridFn(pose) -> { g, ax, ay }, palFn(pose) -> palette
export function makeChar(ns, gridFn, palFn, gridKeys, palKeys, emissive = null) {
  return function drawChar(s, x, y, p0 = {}) {
    const p = { ...p0 };
    for (const k of gridKeys) if (p[k] !== undefined && p[k] !== null) p[k] = norm(k, p[k]);
    const gk = gridKeys.map((k) => JSON.stringify(p[k] ?? null)).join('|');
    const pk = palKeys.map((k) => (typeof p[k] === 'number' ? q(p[k]) : JSON.stringify(p[k] ?? null))).join('|');
    const built = cached(ns + ':g', gk, () => gridFn(p));
    const spr = cached(ns + ':s', gk + '#' + pk, () => toSprite(built.g, palFn(p), built.ax, built.ay, emissive));
    if (p.shadow !== false && p.shadowY !== undefined) groundShadow(s, x, p.shadowY, p.shadowW ?? spr.w * 0.55, p.shadowA ?? 0.45);
    blit(s, spr, x, y, { flip: p.flip, alpha: p.alpha, flash: p.flash, tint: p.tintBlit, dark: p.dark, sil: p.sil, scale: p.scale, clipY: p.clipY });
    return spr;
  };
}
