// Qwen — purple logo-creature with white emblem stripes. Secondary character: the sneaky distiller.
import { createGrid, fillRect, set, shade, outline, stampHand } from '../core/sprite.mjs';
import { drawEye, drawBrow, drawMouth, palette, makeChar } from './common.mjs';

export const QWEN_PAL = {
  O: '#1f0d5c', o: '#6339e6', h: '#8b6dff', s: '#4521c2', W: '#fdfcff', L: '#d6caff',
  k: '#1a0f45', w: '#fdfcff', p: '#f7a8c4', m: '#1a0f45', q: '#e8606a', t: '#9fd8ff', T: '#e6f6ff',
  G: '#0c0a14', g: '#3a3550', c: '#ff9a52',
  M: '#3a2414', H: '#1c1626', R: '#c0392b', B: '#d8483a', N: '#f2a0a0', X: '#9a9284', C: '#2f6fd6', V: '#1f4fa6', Y: '#ffd23a',
};
// Disguise pieces (shape coordinates): mustache, nose, beard, tophat, beret, cap, monocle
function disguise(g, list, rect, put, fy) {
  const has = (k) => list.includes(k);
  if (has('beard')) { rect(21, 29 + fy, 11, 4, 'X'); rect(22, 33 + fy, 9, 2, 'X'); rect(24, 35 + fy, 5, 1, 'X'); }
  if (has('mustache')) {
    rect(22, 26 + fy, 4, 1, 'M'); rect(27, 26 + fy, 4, 1, 'M'); rect(20, 27 + fy, 13, 1, 'M');
    put(19, 26 + fy, 'M'); put(33, 26 + fy, 'M'); put(18, 25 + fy, 'M'); put(34, 25 + fy, 'M');
  }
  if (has('nose')) { rect(24, 23 + fy, 5, 3, 'N'); put(25, 23 + fy, 'w'); }
  if (has('monocle')) { for (const [dx, dy] of [[0, -1], [1, -1], [2, -1], [3, -1], [-1, 0], [4, 0], [-1, 1], [4, 1], [-1, 2], [4, 2], [-1, 3], [4, 3], [0, 4], [1, 4], [2, 4], [3, 4]]) put(28 + dx, 20 + dy + fy, 'Y'); rect(32, 25 + fy, 1, 6, 'Y'); }
  if (has('tophat')) { rect(12, -1, 22, 2, 'H'); rect(15, -11, 16, 10, 'H'); rect(15, -4, 16, 2, 'R'); rect(16, -10, 2, 5, 'g'); }
  if (has('beret')) { rect(13, -3, 20, 3, 'B'); rect(15, -5, 16, 2, 'B'); rect(22, -7, 2, 2, 'B'); rect(14, -3, 4, 1, 'R'); }
  if (has('cap')) { rect(15, -6, 15, 6, 'C'); rect(17, -7, 11, 1, 'C'); rect(28, -1, 12, 2, 'V'); put(22, -8, 'V'); }
}

const SHAPE = [
  '..................ooooooooo.........................',
  '..................oooooooooo........................',
  '.................ooWooooooooo.......................',
  '.................oWWWoooooooo.......................',
  '................oWWWWooooooooo......................',
  '...............ooWWWWWoooooooo......................',
  '...............oWWWWWWooooooooooooooooooooooo.......',
  '..............ooWWWWWWWooooooooooooooooooooooo......',
  '..............oWWWWWWWoooooooooooooooooooooooo......',
  '.............oWWWWWWWWooooooooooooooooooooooooo.....',
  '.............oWWWWWWWoooooooooooooooooooooooooo.....',
  '............oWWWWWWWoooooooooooooooooooooooooooo....',
  '....oooooooooWWWWWWWoooooooooooooooooooooooooooo....',
  '...oooooooooWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWoo...',
  '...ooWWWWWWWoWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo....',
  '..ooooWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWoo....',
  '..ooooWWWWWWWoWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo.....',
  '.ooooooWWWWWWWoWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWo......',
  'ooooooooWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWoo......',
  'ooooooooWWWWWWWooooooooooooooooooooooWWWWWWWo.......',
  'oooooooooWWWWWWWooooooooooooooooooooWWWWWWWWoo......',
  '.ooooooooWWWWWWWooooooooooooooooooooWWWWWWWWWo......',
  '.oooooooooWWWWWWWooooooooooooooooooWWWWWWWWWWWo.....',
  '..oooooooooWWWWWWWoooooooooooooooooWWWWWWWWWWWo.....',
  '...ooooooooWWWWWWWooooooooooooooooWWWWWWWWWWWWWo....',
  '...oooooooooWWWWWWWooooooooooooooWWWWWWWWWWWWWWoo...',
  '....ooooooooWWWWWWWooooooooooooooWWWWWWWoWWWWWWWo...',
  '....oooooooooWWWWWWWooooooooooooWWWWWWWooWWWWWWWoo..',
  '.....ooooooooWWWWWWWooooooooooooWWWWWWWoooWWWWWWWo..',
  '......ooooooooWWWWWWWooooooooooWWWWWWWooooWWWWWWWWo.',
  '......oooooooooWWWWWWWoooooooooWWWWWWWoooooWWWWWWWoo',
  '.......ooooooooWWWWWWWooooooooWWWWWWWoooooooWWWWWWoo',
  '.......oooooooooWWWWWWWooooooWWWWWWWoooooooooooooooo',
  '......ooooooooooWWWWWWWooooooWWWWWWWooooooooooooooo.',
  '.....ooooooooooooWWWWWWWooooWWWWWWWoooooooooooooooo.',
  '.....oooooooooooooWWWWWWooooWWWWWWWooooooooooooooo..',
  '....ooooooooooooooWWWWWWWooWWWWWWWooooooooooooooo...',
  '....oooooooooooooooWWWWWWWoWWWWWWWooooooooooooooo...',
  '....oooooooWWWWWWWWWWWWWWoWWWWWWWooooooooooooooo....',
  '....oooooooWWWWWWWWWWWWWWWWWWWWWooooooooo...........',
  '.....oooooWWWWWWWWWWWWWWoWWWWWWWoooooooo............',
  '......ooooWWWWWWWWWWWWWWWWWWWWWooooooooo............',
  '......oooWWWWWWWWWWWWWWoWWWWWWWoooooooo.............',
  '.......ooWWWWWWWWWWWWWoWWWWWWWoooooooo..............',
  '.......ooooooooooooooooWWWWWWooooooooo..............',
  '......................ooWWWWWoooooooo...............',
  '.......................oWWWWooooooooo...............',
  '........................oWWWoooooooo................',
  '........................oWWooooooooo................',
  '.........................oWoooooooo.................',
  '.........................oooooooooo.................',
];
const SW = SHAPE[0].length, SH = SHAPE.length;
const OX = 9, OY = 14;
export const QWEN_W = SW + OX * 2, QWEN_H = SH + OY + 8;

function grid(p) {
  const g = createGrid(QWEN_W, QWEN_H);
  const sx = p.sx ?? 1, sy = p.sy ?? 1;
  const bob = p.bob | 0;
  // anchor scaling at bottom-centre of the shape
  const cx0 = SW / 2, by0 = SH;
  const at = (x, y) => {
    const u = Math.floor((x + 0.5 - cx0) / sx + cx0), v = Math.floor((y + 0.5 - by0) / sy + by0);
    return (SHAPE[v] && SHAPE[v][u]) || '.';
  };
  const put = (x, y, ch) => set(g, x + OX, y + OY - bob, ch);
  const rect = (x, y, w, h, ch) => fillRect(g, x + OX, y + OY - bob, w, h, ch);
  for (let y = -6; y < SH; y++) for (let x = -6; x < SW + 6; x++) { const ch = at(x, y); if (ch !== '.') put(x, y, ch); }
  // tiny tiptoe feet
  if (p.feet) {
    const [l0, l1] = p.feet === true ? [0, 0] : p.feet;
    rect(24, SH - l0, 4, 3 + bob, 'o');
    rect(31, SH - l1, 4, 3 + bob, 'o');
  }
  shade(g);
  for (let y = -6; y < SH; y++) for (let x = -6; x < SW + 6; x++) {
    const ch = at(x, y);
    if (ch === 'o') {
      const seam = (at(x - 1, y) === 'W' && at(x + 1, y) === 'W') || (at(x, y - 1) === 'W' && at(x, y + 1) === 'W');
      if (seam) put(x, y, 'L');
    } else if (ch === 'W' && (at(x + 1, y) === 'o' || at(x, y + 1) === 'o')) put(x, y, 'L');
  }
  // stolen orange stripe after drinking the distillate
  if (p.orange) for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const gy = y + OY - bob, gx = x + OX;
    if (g[gy] && (g[gy][gx] === 'W' || g[gy][gx] === 'L') && ((x + y * 2) % 7 < p.orange * 7)) g[gy][gx] = 'c';
  }
  const fy = Math.round((sy - 1) * -20); // face follows squash a little
  const hand = { o: 'o', h: 'h', s: 's' };
  const hL = p.handL || [0, 0], hR = p.handR || [0, 0];
  const probe = () => g.map((r) => [...r]);
  const lx = stampHand(probe(), 8 + OX, 30 + OY - bob + fy, 6, -1, hand, 'O', false);
  const rx = stampHand(probe(), 42 + OX, 30 + OY - bob + fy, 6, 1, hand, 'O', false);
  stampHand(g, lx + hL[0], 30 + OY - bob + fy + hL[1], 6, -1, hand, 'O', true);
  stampHand(g, rx + hR[0], 30 + OY - bob + fy + hR[1], 6, 1, hand, 'O', true);
  const eyes = p.eyes || 'open', look = p.look | 0;
  for (let side = 0; side < 2; side++) {
    const ex = (side ? 28 : 20) + look;
    const g2 = { x: ex + OX, y: 20 + OY - bob + fy };
    drawEye(g, g2.x, g2.y, 4, 6, side ? (p.eyeR || eyes) : (p.eyeL || eyes), side, 'o');
    drawBrow(g, g2.x, g2.y, 4, side, p.brow, 'k');
  }
  if (p.glasses) {
    rect(18 + look, 20 + fy, 7, 5, 'G'); rect(27 + look, 20 + fy, 7, 5, 'G'); rect(25 + look, 21 + fy, 2, 1, 'G');
    rect(19 + look, 21 + fy, 2, 1, 'g'); rect(28 + look, 21 + fy, 2, 1, 'g');
    if (p.glasses === 'slip') { rect(18 + look, 25 + fy, 16, 1, 'G'); }
  }
  const blush = p.blush ?? 1;
  if (blush) { rect(19, 26 + fy, 2, 1, 'p'); rect(31, 26 + fy, 2, 1, 'p'); }
  drawMouth(g, 26 + OX, 27 + OY - bob + fy, p.mouth || 'smile', false);
  if (p.disguise) disguise(g, p.disguise, rect, put, fy);
  if (!p.noOutline) outline(g);
  return { g, ax: OX + 30, ay: OY + SH + (p.feet ? 3 : 0) };
}

const base = makeChar('qwen', grid, (p) => palette(QWEN_PAL, { sat: p.sat, bright: p.bright, tint: p.tint }),
  ['sx', 'sy', 'bob', 'feet', 'orange', 'handL', 'handR', 'brow', 'disguise', 'eyes', 'eyeL', 'eyeR', 'look', 'glasses', 'mouth', 'blush'],
  ['sat', 'bright', 'tint'], null, { h: 'o', s: 'o', L: 'W' });

export function drawQwen(s, x, y, p = {}) {
  const q = (v, st) => (v === undefined ? v : Math.round(v / st) * st);
  return base(s, Math.round(x), Math.round(y), { ...p, sx: q(p.sx, 0.02), sy: q(p.sy, 0.02), orange: q(p.orange, 0.1) });
}
