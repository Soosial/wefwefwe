// Clawd — orange 4-legged crab-blob (Claude). Parametric port of the reference sprite.
import { createGrid, fillRect, set, shade, outline } from '../core/sprite.mjs';
import { drawEye, drawMouth, drawTears, palette, makeChar } from './common.mjs';

export const CLAWD_PAL = {
  O: '#5e2716', o: '#d97757', h: '#f0a07c', s: '#b0573a', S: '#8f4127', k: '#1a1113', w: '#fff6ee',
  p: '#f6a08e', m: '#5a2416', q: '#e8606a', t: '#8fd0ff', T: '#e6f6ff',
};
const OX = 4, OY = 8;
export const CLAWD_W = 64, CLAWD_H = 50;

function grid(p) {
  const g = createGrid(CLAWD_W, CLAWD_H);
  const sq = p.sq | 0, bob = p.bob | 0;
  const bw = 42 + 2 * sq, bh = 27 - sq;
  const bx = OX + 7 - sq, by = OY + 1 + sq - bob;
  const cx = OX + 28;
  fillRect(g, bx, by, bw, bh);
  const aL = p.armL | 0, aR = p.armR | 0, xL = p.armLx | 0, xR = p.armRx | 0;
  fillRect(g, bx - 6 - xL, by + 8 + aL, 6 + xL, 9);
  fillRect(g, bx + bw, by + 8 + aR, 6 + xR, 9);
  const legC = [-16.5, -8.5, 8.5, 16.5];
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const lx = Math.round(cx + legC[i] * (bw / 42) - 2.5) + ((p.legDx && p.legDx[i]) | 0);
    const lift = (p.legs && p.legs[i]) | 0;
    const top = by + bh, bottom = OY + 38 - lift;
    if (bottom > top) fillRect(g, lx, top, 5, bottom - top);
    legs.push([lx, top]);
  }
  shade(g);
  for (const [lx, top] of legs) fillRect(g, lx, top, 5, 1, 'S');
  // soft ambient occlusion along the belly between the legs
  for (let x = bx + 2; x < bx + bw - 2; x++) if (g[by + bh - 1][x] === 's' || g[by + bh - 1][x] === 'o') set(g, x, by + bh - 1, (x & 1) ? 'S' : 's');
  fillRect(g, bx + 3, by + 2, 4, 1, 'w');
  set(g, bx + 3, by + 3, 'w');
  const k = bw / 42;
  const eyes = p.eyes || 'open';
  const look = p.look | 0, lookY = p.lookY | 0;
  for (let side = 0; side < 2; side++) {
    const ecx = cx + (side ? 11 : -11) * k;
    const ex = Math.round(ecx - 3) + look, ey = by + 5 + lookY;
    drawEye(g, ex, ey, 6, 8, side === 0 ? (p.eyeL || eyes) : (p.eyeR || eyes), side);
    if (p.tears) drawTears(g, ex + (side ? 3 : 1), ey, 2, 8, p.tears);
  }
  const blush = p.blush ?? 1;
  if (blush) {
    for (const side of [0, 1]) {
      const bcx = Math.round(cx + (side ? 17 : -17) * k);
      fillRect(g, bcx - 2, by + 14, 4 + (blush > 1 ? 1 : 0), 2 + (blush > 1 ? 1 : 0), 'p');
      set(g, bcx - 3, by + 15, 'p');
      set(g, bcx + 2 + (blush > 1 ? 1 : 0), by + 14, 'p');
    }
  }
  drawMouth(g, cx, by + 14 + (p.mouthY | 0), p.mouth || 'smile', true);
  outline(g);
  return { g, ax: OX + 28, ay: OY + 39 };
}

const base = makeChar('clawd', grid, (p) => palette(CLAWD_PAL, { sat: p.sat, bright: p.bright, tint: p.tint }),
  ['sq', 'bob', 'legs', 'legDx', 'armL', 'armR', 'armLx', 'armRx', 'eyes', 'eyeL', 'eyeR', 'look', 'lookY', 'mouth', 'mouthY', 'blush', 'tears'],
  ['sat', 'bright', 'tint']);

// walk cycle helper: phase in cycles (1 cycle = 4 frames)
export function clawdWalk(ph) {
  const f = ((Math.floor(ph * 4) % 4) + 4) % 4;
  if (f === 0) return { legs: [2, 0, 2, 0], legDx: [1, 0, 1, 0], bob: 0 };
  if (f === 1) return { legs: [0, 0, 0, 0], legDx: [0, 0, 0, 0], bob: 1 };
  if (f === 2) return { legs: [0, 2, 0, 2], legDx: [0, 1, 0, 1], bob: 0 };
  return { legs: [0, 0, 0, 0], legDx: [0, 0, 0, 0], bob: 1 };
}

export const drawClawd = (s, x, y, p = {}) => base(s, Math.round(x), Math.round(y), p);
