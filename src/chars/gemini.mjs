// Gemini — four-colour sparkle star. Shape is re-rasterized from its superellipse formula every pose,
// so it can spin, stretch, sharpen (confidence) or round off and desaturate (sadness) while staying pixel-crisp.
import { createGrid, fillRect, set, shade, outline, stampHand } from '../core/sprite.mjs';
import { drawEye, drawBrow, drawMouth, drawTears, palette, makeChar } from './common.mjs';

export const GEM_PAL = {
  O: '#1a1f4d',
  ro: '#ea4335', rh: '#ff7a6b', rs: '#b3261e',
  yo: '#fbbc04', yh: '#ffd95a', ys: '#d08d00',
  go: '#34a853', gh: '#6fd08a', gs: '#1e7a3a',
  bo: '#4285f4', bh: '#7fb0ff', bs: '#2c5fc7',
  ao: '#b9a4ff', ah: '#f1ecff', as: '#8a73ff', // argon glow core (Gemini 4)
  k: '#151a3d', w: '#fdfcff', p: '#f7a8c4', m: '#151a3d', q: '#e8606a', t: '#9fd8ff', T: '#e6f6ff',
};
const SIZE = 80, C = 40;
const OFF = C - 28; // reference coordinates were for a 56px grid centred on 28

function grid(p) {
  const g = createGrid(SIZE, SIZE);
  const P = p.sharp ?? 0.68, R = p.R ?? 26.5, sx = p.sx ?? 1, sy = p.sy ?? 1, rot = p.rot ?? 0;
  const lim = R ** P;
  const cs = Math.cos(-rot), sn = Math.sin(-rot);
  const local = (x, y) => {
    const dx0 = x + 0.5 - C, dy0 = y + 0.5 - C - (p.cy ?? 0);
    return [(dx0 * cs - dy0 * sn) / sx, (dx0 * sn + dy0 * cs) / sy];
  };
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const [dx, dy] = local(x, y);
    if (Math.abs(dx) ** P + Math.abs(dy) ** P <= lim) set(g, x, y, 'o');
  }
  shade(g);
  const core = p.core ?? 0; // argon core radius (Gemini 4 glow)
  const regionAt = (x, y) => {
    const [dx, dy] = local(x, y);
    const checker = (x + y) % 2 === 0;
    const dist = Math.hypot(dx, dy);
    if (core && (dist < core || (dist < core + 2 && checker))) return 'a';
    if (dist < 8 || (dist < 10 && checker)) return 'b';
    const vertical = Math.abs(dy) >= Math.abs(dx);
    const nearDiagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) < 2 && checker;
    const useVertical = nearDiagonal ? !vertical : vertical;
    if (useVertical) return dy < 0 ? 'r' : 'g';
    return dx < 0 ? 'y' : 'b';
  };
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const t = g[y][x];
    if (t === 'o' || t === 'h' || t === 's') g[y][x] = regionAt(x, y) + t;
  }
  const faceY = Math.round(p.cy ?? 0) - (p.bob | 0);
  if (p.hands !== false) {
    const hL = p.handL || [0, 0], hR = p.handR || [0, 0];
    const lx = stampHand(createProbe(g), 20 + OFF, 33 + OFF + faceY, 6, -1, {}, 'O', false);
    const rx = stampHand(createProbe(g), 30 + OFF, 33 + OFF + faceY, 6, 1, {}, 'O', false);
    stampHand(g, lx + hL[0], 33 + OFF + faceY + hL[1], 6, -1, { o: 'yo', h: 'yh', s: 'ys' }, 'O', true);
    stampHand(g, rx + hR[0], 33 + OFF + faceY + hR[1], 6, 1, { o: 'bo', h: 'bh', s: 'bs' }, 'O', true);
  }
  if (p.face !== false) {
    const eyes = p.eyes || 'open';
    const look = p.look | 0, lookY = p.lookY | 0;
    for (let side = 0; side < 2; side++) {
      const ex = (side ? 32 : 20) + OFF + look, ey = 23 + OFF + faceY + lookY;
      drawEye(g, ex, ey, 4, 6, side ? (p.eyeR || eyes) : (p.eyeL || eyes), side, 'bo');
      drawBrow(g, ex, ey, 4, side, p.brow, 'k');
      if (p.tears) drawTears(g, ex + (side ? 2 : 1), ey, 2, 6, p.tears);
    }
    const blush = p.blush ?? 1;
    if (blush) { fillRect(g, 17 + OFF, 30 + OFF + faceY, 3, 2, 'p'); fillRect(g, 36 + OFF, 30 + OFF + faceY, 3, 2, 'p'); if (blush > 1) { set(g, 16 + OFF, 31 + OFF + faceY, 'p'); set(g, 39 + OFF, 31 + OFF + faceY, 'p'); } }
    drawMouth(g, 28 + OFF, 30 + OFF + faceY, p.mouth || 'smile', false);
  }
  if (!p.noOutline) outline(g);
  return { g, ax: C, ay: Math.round(C + 28 * (p.sy ?? 1)) };
}
// stampHand probing (auto placement) must not modify the real grid
function createProbe(g) { return g.map((r) => [...r]); }

const base = makeChar('gemini', grid, (p) => palette(GEM_PAL, { sat: p.sat, bright: p.bright, tint: p.tint }),
  ['sharp', 'R', 'sx', 'sy', 'rot', 'cy', 'bob', 'core', 'hands', 'handL', 'handR', 'face', 'brow', 'eyes', 'eyeL', 'eyeR', 'look', 'lookY', 'mouth', 'blush', 'tears'],
  ['sat', 'bright', 'tint'], ['ao', 'ah', 'as'], { rh: 'ro', rs: 'ro', yh: 'yo', ys: 'yo', gh: 'go', gs: 'go', bh: 'bo', bs: 'bo', ah: 'ao', as: 'ao' });

// x,y = point on the ground under Gemini (it floats; hover is drawn above y)
export function drawGemini(s, x, y, p = {}) {
  const q = (v, st) => (v === undefined ? v : Math.round(v / st) * st);
  const pp = { ...p, rot: q(p.rot, 0.02), sharp: q(p.sharp, 0.01), sx: q(p.sx, 0.02), sy: q(p.sy, 0.02), R: q(p.R, 0.5) };
  return base(s, Math.round(x), Math.round(y - (p.hover ?? 6)), pp);
}
