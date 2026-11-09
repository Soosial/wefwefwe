// Bitmap text from the pre-rasterized pixel fonts (Tiny5 8px, Press Start 2P 8px).
import { readFileSync } from 'node:fs';
import { hex, pset, pdith } from './fb.mjs';

const FONTS = JSON.parse(readFileSync(new URL('../../assets/fonts.json', import.meta.url), 'utf8'));
for (const f of Object.values(FONTS)) {
  const caps = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => f.glyphs[c]).filter(Boolean);
  f.capTop = Math.min(...caps.map((g) => g.y));
  f.capH = Math.max(...caps.map((g) => g.y + g.h)) - f.capTop;
  f.lineH = f.name === 'tiny' ? 8 : 10;
  for (const g of Object.values(f.glyphs)) g.bits = g.r.map((row) => [...row].map((b) => b === '1'));
}
export const fonts = FONTS;

const glyphOf = (f, ch) => f.glyphs[ch] || f.glyphs[ch.toUpperCase()] || f.glyphs['?'];

export function textWidth(str, o = {}) {
  const f = FONTS[o.font || 'tiny'];
  const sc = o.scale || 1, sp = o.spacing || 0;
  let w = 0;
  for (const ch of str) w += (glyphOf(f, ch).a + sp) * sc;
  return Math.max(0, w - sp * sc);
}

export function wrap(str, maxW, o = {}) {
  const out = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (textWidth(t, o) > maxW && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// Draw a single line. (x, y) = top-left of cap height. Returns advance width.
// o: font, color, scale, align, chars (typewriter count), outline, shadow, alpha, spacing, wave(t)
export function text(s, str, x, y, o = {}) {
  const f = FONTS[o.font || 'tiny'];
  const sc = o.scale || 1, sp = o.spacing || 0;
  const c = hex(o.color || '#ffffff');
  const w = textWidth(str, o);
  let cx = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const chars = o.chars ?? Infinity;
  const alpha = o.alpha ?? 1;
  const passes = [];
  if (o.outline) {
    const oc = hex(o.outline);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) passes.push([dx * sc, dy * sc, oc]);
  }
  if (o.shadow) passes.push([sc, sc, hex(o.shadow)]);
  passes.push([0, 0, c]);
  let i = 0;
  const glyphs = [];
  for (const ch of str) {
    if (i >= chars) break;
    const g = glyphOf(f, ch);
    const dy = o.wave ? Math.round(Math.sin(o.wave * 6 + i * 0.7) * 1.2) : 0;
    const colr = o.colors ? hex(o.colors[i % o.colors.length]) : null;
    glyphs.push([g, cx, dy, colr]);
    cx += (g.a + sp) * sc;
    i++;
  }
  for (const [px, py, pc] of passes) {
    for (const [g, gx, dy, colr] of glyphs) {
      const top = Math.round(y) + (g.y - f.capTop) * sc + dy;
      const usec = pc === c && colr !== null ? colr : pc;
      for (let r = 0; r < g.h; r++) for (let q = 0; q < g.w; q++) {
        if (!g.bits[r][q]) continue;
        for (let yy = 0; yy < sc; yy++) for (let xx = 0; xx < sc; xx++) {
          const X = gx + (g.x + q) * sc + xx + px, Y = top + r * sc + yy + py;
          if (alpha >= 1) pset(s, X, Y, usec); else pdith(s, X, Y, usec, alpha);
        }
      }
    }
  }
  return w;
}

// Multi-line block, y = top of first line
export function textBlock(s, lines, x, y, o = {}) {
  const f = FONTS[o.font || 'tiny'];
  const lh = (o.lineH || f.lineH) * (o.scale || 1);
  let used = 0;
  lines.forEach((ln, i) => {
    const remaining = (o.chars ?? Infinity) - used;
    if (remaining <= 0) return;
    text(s, ln, x, y + i * lh, { ...o, chars: remaining });
    used += [...ln].length;
  });
  return lines.length * lh;
}
