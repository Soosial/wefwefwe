// Codex — blue terminal-faced robot (OpenAI). The face screen can show prompt, emoticons or text.
import { createGrid, fillRect, set, shade, outline } from '../core/sprite.mjs';
import { palette, makeChar, gridText, gridTextWidth } from './common.mjs';

export const CODEX_PAL = {
  O: '#0b1240', o: '#5a7cff', h: '#93adff', s: '#3d57dc', S: '#2b3fb0', k: '#0f1533', g: '#2a3468',
  e: '#9fe0ff', E: '#e8fbff', r: '#ff5a5a', R: '#3a0d14', G: '#7dffb0', y: '#ffd95a', w: '#ffffff', p: '#ff9ad5',
};
const OX = 6, OY = 10;
export const CODEX_W = 68, CODEX_H = 66;

const FACES = {
  // 32x16 screen-local pixel art faces, drawn with 'e'
  happy: (g, X, Y) => { caret(g, X + 5, Y + 5); caret(g, X + 19, Y + 5); fillRect(g, X + 13, Y + 11, 6, 1, 'e'); set(g, X + 12, Y + 10, 'e'); set(g, X + 19, Y + 10, 'e'); },
  wide: (g, X, Y) => { ringE(g, X + 6, Y + 3); ringE(g, X + 19, Y + 3); fillRect(g, X + 14, Y + 12, 4, 1, 'e'); },
  angry: (g, X, Y) => { chev(g, X + 6, Y + 3, 1); chev(g, X + 20, Y + 3, -1); fillRect(g, X + 13, Y + 12, 6, 1, 'e'); },
  sad: (g, X, Y) => { fillRect(g, X + 5, Y + 4, 7, 2, 'e'); fillRect(g, X + 8, Y + 6, 2, 6, 'e'); fillRect(g, X + 20, Y + 4, 7, 2, 'e'); fillRect(g, X + 23, Y + 6, 2, 6, 'e'); fillRect(g, X + 13, Y + 12, 6, 1, 'e'); },
  squint: (g, X, Y) => { fillRect(g, X + 5, Y + 7, 7, 2, 'e'); fillRect(g, X + 20, Y + 7, 7, 2, 'e'); },
  heart: (g, X, Y) => { heart(g, X + 4, Y + 4); heart(g, X + 19, Y + 4); },
  eyes: (g, X, Y) => { fillRect(g, X + 8, Y + 3, 3, 8, 'e'); fillRect(g, X + 21, Y + 3, 3, 8, 'e'); set(g, X + 8, Y + 3, 'E'); set(g, X + 21, Y + 3, 'E'); },
  wink: (g, X, Y) => { caret(g, X + 5, Y + 5); fillRect(g, X + 20, Y + 7, 7, 2, 'e'); fillRect(g, X + 13, Y + 12, 6, 1, 'e'); },
  smug: (g, X, Y) => { fillRect(g, X + 5, Y + 6, 7, 2, 'e'); fillRect(g, X + 20, Y + 6, 7, 2, 'e'); fillRect(g, X + 7, Y + 8, 4, 2, 'e'); fillRect(g, X + 22, Y + 8, 4, 2, 'e'); fillRect(g, X + 14, Y + 12, 5, 1, 'e'); set(g, X + 19, Y + 11, 'e'); },
};
function caret(g, x, y) { // ^ 8 wide, 2px strokes
  fillRect(g, x + 3, y, 2, 1, 'e'); fillRect(g, x + 2, y + 1, 4, 1, 'e');
  fillRect(g, x + 1, y + 2, 2, 1, 'e'); fillRect(g, x + 5, y + 2, 2, 1, 'e');
  fillRect(g, x, y + 3, 2, 1, 'e'); fillRect(g, x + 6, y + 3, 2, 1, 'e');
}
function ringE(g, x, y) { fillRect(g, x + 1, y, 5, 1, 'e'); fillRect(g, x + 1, y + 7, 5, 1, 'e'); fillRect(g, x, y + 1, 1, 6, 'e'); fillRect(g, x + 6, y + 1, 1, 6, 'e'); fillRect(g, x + 2, y + 3, 2, 2, 'E'); }
function chev(g, x, y, d) { for (let i = 0; i < 4; i++) { fillRect(g, d > 0 ? x + i * 2 - 0 : x + 6 - i * 2, y + i, 2, 1, 'e'); fillRect(g, d > 0 ? x + i * 2 : x + 6 - i * 2, y + 7 - i, 2, 1, 'e'); } }
function heart(g, x, y) { fillRect(g, x + 1, y, 3, 1, 'r'); fillRect(g, x + 5, y, 3, 1, 'r'); fillRect(g, x, y + 1, 9, 3, 'r'); fillRect(g, x + 1, y + 4, 7, 1, 'r'); fillRect(g, x + 2, y + 5, 5, 1, 'r'); fillRect(g, x + 3, y + 6, 3, 1, 'r'); set(g, x + 4, y + 7, 'r'); set(g, x + 1, y + 1, 'w'); }

function grid(p) {
  const g = createGrid(CODEX_W, CODEX_H);
  const sq = p.sq | 0, bob = p.bob | 0, tb = p.tb | 0;
  const X = (x) => OX + x, Y = (y) => OY + y - bob;
  const hw = 44 + 2 * sq, hh = 26 - sq;
  const hx = X(6 - sq), hy = Y(7 + sq);
  fillRect(g, X(22) + tb, hy - 6, 12, 2);
  fillRect(g, X(18) + tb, hy - 4, 20, 4);
  fillRect(g, hx + 2, hy - 2, 8, 2);
  fillRect(g, hx + hw - 10, hy - 2, 8, 2);
  fillRect(g, hx, hy, hw, hh);
  fillRect(g, X(18), Y(34), 20, 12);
  // feet (extend upward when bobbing so they stay attached)
  const lift = p.feet || [0, 0];
  const fdx = p.feetDx || [0, 0];
  fillRect(g, X(19) + fdx[0], OY + 46 - lift[0] - bob, 6, 6 + bob);
  fillRect(g, X(31) + fdx[1], OY + 46 - lift[1] - bob, 6, 6 + bob);
  shade(g);
  fillRect(g, hx + 10, hy, 2, 2, 's');
  fillRect(g, hx + hw - 12, hy, 2, 2, 's');
  fillRect(g, X(18), Y(45), 20, 1, 'S');
  // screen
  const sx = hx + 6 + sq, sy = hy + 5;
  const scr = p.screen || { mode: 'prompt' };
  const bg = scr.mode === 'red' ? 'R' : scr.mode === 'white' ? 'E' : 'k';
  fillRect(g, sx, sy, 32, 16, bg);
  for (const [cx, cy] of [[0, 0], [30, 0], [0, 14], [30, 14]]) fillRect(g, sx + cx, sy + cy, 2, 2, 'o');
  if (scr.mode !== 'white') { fillRect(g, sx + 2, sy + 2, 4, 1, 'g'); fillRect(g, sx + 2, sy + 3, 1, 2, 'g'); set(g, sx + 29, sy + 13, 'g'); }
  if (scr.mode === 'prompt') {
    [0, 1, 2, 3, 4, 4, 3, 2, 1, 0].forEach((o, i) => fillRect(g, sx + 6 + o, sy + 4 + i, 2, 1, 'e'));
    if (scr.cursor !== false) fillRect(g, sx + 18, sy + 8, 8, 2, 'e');
  } else if (scr.mode === 'face') {
    (FACES[scr.face] || FACES.eyes)(g, sx, sy);
  } else if (scr.mode === 'text' || scr.mode === 'red') {
    const lines = scr.lines || [];
    const ch = scr.color || (scr.mode === 'red' ? 'r' : 'e');
    const lh = 7;
    const top = sy + Math.round((16 - lines.length * lh + 2) / 2);
    lines.forEach((ln, i) => {
      const w = gridTextWidth(ln);
      const x0 = scr.left ? sx + 3 : sx + Math.round((32 - w) / 2);
      const wEnd = gridText(g, ln, x0, top + i * lh, ch);
      if (scr.cursor && i === lines.length - 1) fillRect(g, x0 + wEnd + 1, top + i * lh + 4, 3, 1, ch);
    });
  }
  // floating mitten hands (Rayman-style), offsets relative to rest pose
  const hL = p.handL || [0, 0], hR = p.handR || [0, 0];
  const hand = (x, y) => {
    fillRect(g, x, y, 6, 6, 'o');
    fillRect(g, x, y, 6, 1, 'h'); fillRect(g, x, y, 1, 6, 'h');
    fillRect(g, x + 5, y + 1, 1, 5, 's'); fillRect(g, x + 1, y + 5, 5, 1, 's');
  };
  // clear hand area of body pixels so the hand outline reads on top
  const hands = [[X(11) + hL[0], Y(37) + hL[1]], [X(39) + hR[0], Y(37) + hR[1]]];
  for (const [x, y] of hands) hand(x, y);
  outline(g);
  // seam outline where hands overlap the body
  for (const [x, y] of hands) {
    for (let i = -1; i <= 6; i++) for (const [qx, qy] of [[x + i, y - 1], [x + i, y + 6], [x - 1, y + i], [x + 6, y + i]]) {
      if (qy >= 0 && qy < g.length && qx >= 0 && qx < g[0].length && g[qy][qx] !== '.' && g[qy][qx] !== 'O') g[qy][qx] = 'O';
    }
  }
  return { g, ax: OX + 28, ay: OY + 52 };
}

const base = makeChar('codex', grid, (p) => palette(CODEX_PAL, { sat: p.sat, bright: p.bright, tint: p.tint }),
  ['sq', 'bob', 'tb', 'feet', 'feetDx', 'handL', 'handR', 'screen'], ['sat', 'bright', 'tint'], ['e', 'E', 'r', 'G', 'y']);

export function codexWalk(ph) {
  const f = ((Math.floor(ph * 4) % 4) + 4) % 4;
  return [
    { feet: [2, 0], feetDx: [1, 0], bob: 0, tb: 0 },
    { feet: [0, 0], feetDx: [0, 0], bob: 1, tb: -1 },
    { feet: [0, 2], feetDx: [0, 1], bob: 0, tb: 0 },
    { feet: [0, 0], feetDx: [0, 0], bob: 1, tb: 1 },
  ][f];
}

export const drawCodex = (s, x, y, p = {}) => base(s, Math.round(x), Math.round(y), p);
