// Rival models (DeepSeek whale, Kimi) and the crowd of tiny "users". Same pipeline/style as heroes.
import { createGrid, fillRect, set, shade, outline, stampHand } from '../core/sprite.mjs';
import { drawEye, drawBrow, drawTears, drawMouth, palette, makeChar } from './common.mjs';
import { hash } from '../core/math.mjs';
import { hsl } from '../core/fb.mjs';

// ---------------- DeepSeek whale ----------------
export const WHALE_PAL = {
  O: '#0f1a5c', o: '#4d6bfe', h: '#86a0ff', s: '#3550d8', S: '#2a3fb0', b: '#e4eaff', c: '#b4c2f4',
  k: '#0e1238', w: '#ffffff', p: '#ff9fc0', m: '#0f1a5c', q: '#e8606a', d: '#2a1038', j: '#8fd8ff', J: '#e6f8ff', t: '#9fd8ff', T: '#e6f6ff',
};
const WW = 96, WH = 62, WOY = 14;
// cute DeepSeek whale facing left: big round head, pale pleated belly, curled tail with two flukes, water spout
function whaleGrid(p) {
  const g = createGrid(WW, WH);
  const tail = p.tail ?? 0, Y = (y) => y + WOY;
  const x0 = 5, x1 = 66, cy = 28;
  for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / (x1 - x0);
    const up = 17 * Math.sqrt(Math.min(1, u * 2.6)) * (1 - 0.62 * Math.pow(Math.max(0, (u - 0.32) / 0.68), 1.5));
    const dn = 13 * Math.sqrt(Math.min(1, u * 3.4)) * (1 - 0.72 * Math.pow(Math.max(0, (u - 0.42) / 0.58), 1.3));
    for (let y = Math.round(cy - up); y <= Math.round(cy + dn); y++) set(g, x, Y(y), 'o');
  }
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, x = 62 + u * 14, y = cy - 4 - u * u * 13 + tail * 2 * u, th = 8 - u * 4.5;
    for (let dy = -th / 2; dy <= th / 2; dy += 0.5) set(g, Math.round(x), Y(Math.round(y + dy)), 'o');
  }
  const lobe = (ax, ay, bx, by, wd) => {
    const nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny);
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, hw = wd * Math.sin(Math.PI * Math.min(1, u * 1.15));
      for (let k = -hw; k <= hw; k += 0.5) set(g, Math.round(x + (nx / nl) * k), Y(Math.round(y + (ny / nl) * k)), 'o');
    }
  };
  const fx = 76, fy = cy - 17 + Math.round(tail * 2);
  lobe(fx, fy, fx + 5, fy - 11 - Math.round(tail), 3.2);
  lobe(fx, fy, fx + 12, fy - 2 + Math.round(tail), 3.2);
  const fl = p.fin ?? 0;
  lobe(32, cy + 9, 41 + Math.round(fl * 2), cy + 16 - Math.round(fl * 5), 2.6);
  shade(g);
  for (let x = x0; x <= 52; x++) for (let y = 0; y < WH; y++) {
    const ch = g[y][x];
    if (ch !== 'o' && ch !== 'h' && ch !== 's') continue;
    const yy = y - WOY, line = cy + 4 + Math.max(0, (14 - x) * 0.35) - Math.max(0, x - 38) * 0.25;
    if (yy < line) continue;
    g[y][x] = Math.round(yy - line) % 3 === 2 && x > 12 && x < 46 ? 'c' : ch === 's' ? 'c' : 'b';
  }
  const eyes = p.eyes || 'open', lk = p.look | 0;
  drawEye(g, 17 + lk, Y(19), 4, 6, eyes, 0, 'o');
  drawBrow(g, 17 + lk, Y(19), 4, 0, p.brow, 'k');
  if (p.tears) drawTears(g, 18, Y(19), 4, 6, p.tears);
  fillRect(g, 21, Y(27), 3, 2, 'p');
  const mouth = p.mouth || 'smile';
  if (mouth === 'laugh' || mouth === 'open') {
    const depth = mouth === 'laugh' ? 5 : 3;
    for (let x = 6; x <= 19; x++) {
      const a = Math.sin(((x - 6) / 13) * Math.PI);
      for (let y = 0; y <= Math.round(a * depth); y++) set(g, x, Y(30 + y), y >= Math.round(a * depth) - 1 && x > 9 && x < 17 ? 'q' : 'd');
    }
  } else if (mouth === 'flat') fillRect(g, 6, Y(31), 12, 1, 'm');
  else if (mouth === 'o') fillRect(g, 8, Y(30), 3, 3, 'd');
  else for (let x = 6; x <= 18; x++) set(g, x, Y(31 - (x > 15 ? x - 15 : 0)), 'm');
  fillRect(g, 25, Y(cy - 16), 2, 1, 'S');
  const sp = p.spout ?? 0;
  if (sp > 0) {
    const hgt = Math.round(10 * sp), ph = p.spoutPh ?? 0;
    for (let k = 0; k < hgt; k++) { set(g, 25, Y(cy - 17 - k), 'j'); set(g, 26, Y(cy - 17 - k), k % 2 ? 'J' : 'j'); }
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.38, r = 3 + ((i + ph) % 3);
      set(g, Math.round(25.5 + Math.cos(a) * r * 1.4), Y(cy - 17 - hgt + Math.round(Math.sin(a) * r * 0.6) + 1), i % 2 ? 'J' : 'j');
    }
  }
  if (!p.noOutline) outline(g);
  return { g, ax: 36, ay: Y(cy + 14) };
}
const whaleBase = makeChar('whale', whaleGrid, (p) => palette(WHALE_PAL, { sat: p.sat, bright: p.bright }), ['tail', 'fin', 'eyes', 'brow', 'look', 'mouth', 'tears', 'spout', 'spoutPh'], ['sat', 'bright'], null, { h: 'o', s: 'o', S: 'o', c: 'b' });
export const drawWhale = (s, x, y, p = {}) => whaleBase(s, Math.round(x), Math.round(y), { ...p, tail: Math.round((p.tail ?? 0) * 4) / 4, fin: Math.round((p.fin ?? 0) * 3) / 3, spout: Math.round((p.spout ?? 0) * 5) / 5, spoutPh: Math.floor(p.spoutPh ?? 0) % 3 });

// ---------------- Kimi (Moonshot) ----------------
export const KIMI_PAL = { O: '#07080d', o: '#4a5270', h: '#6c76a0', s: '#363c56', W: '#f4f6ff', L: '#c9cfe6', B: '#2f8dff', b: '#9cc8ff', k: '#07080d', w: '#ffffff', p: '#ff9fc0', m: '#07080d', q: '#e8606a' };
function kimiGrid(p) {
  const g = createGrid(56, 56);
  const sq = p.sq ?? 0;
  const cx = 28, cy = 30 + sq, rx = 18 + sq, ry = 17 - sq;
  for (let y = 0; y < 56; y++) for (let x = 0; x < 56; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dx) ** 4 + Math.abs(dy) ** 4 <= 1) set(g, x, y, 'o');
  }
  shade(g);
  // white K emblem (left) + blue dot (top right)
  const kx = cx - 12, ky = cy - 12;
  fillRect(g, kx, ky, 3, 11, 'W');
  for (let i = 0; i < 6; i++) { fillRect(g, kx + 3 + i, ky + 5 - i, 2, 1, 'W'); fillRect(g, kx + 3 + i, ky + 5 + i, 2, 1, 'W'); }
  fillRect(g, kx, ky + 10, 3, 1, 'L');
  const dxp = cx + 9, dyp = cy - 12;
  fillRect(g, dxp, dyp + 1, 5, 3, 'B'); fillRect(g, dxp + 1, dyp, 3, 5, 'B'); set(g, dxp + 1, dyp + 1, 'b');
  const hand = { o: 'o', h: 'h', s: 's' };
  const hL = p.handL || [0, 0], hR = p.handR || [0, 0];
  stampHand(g, cx - rx - 3 + hL[0], cy + 3 + hL[1], 6, -1, hand, 'O', true);
  stampHand(g, cx + rx - 3 + hR[0], cy + 3 + hR[1], 6, 1, hand, 'O', true);
  const eyes = p.eyes || 'open';
  drawEye(g, cx - 7, cy + 1, 4, 6, eyes, 0, 'o');
  drawBrow(g, cx - 7, cy + 1, 4, 0, p.brow, 'W');
  drawBrow(g, cx + 3, cy + 1, 4, 1, p.brow, 'W');
  drawEye(g, cx + 3, cy + 1, 4, 6, eyes, 1, 'o');
  fillRect(g, cx - 10, cy + 8, 2, 1, 'p'); fillRect(g, cx + 8, cy + 8, 2, 1, 'p');
  drawMouth(g, cx, cy + 8, p.mouth || 'smile', false);
  if (!p.noOutline) outline(g);
  return { g, ax: cx, ay: cy + ry + 1 };
}
const kimiBase = makeChar('kimi', kimiGrid, (p) => palette(KIMI_PAL, { sat: p.sat, bright: p.bright }), ['sq', 'handL', 'handR', 'eyes', 'brow', 'mouth'], ['sat', 'bright'], ['B', 'b'], { h: 'o', s: 'o', L: 'W' });
export const drawKimi = (s, x, y, p = {}) => kimiBase(s, Math.round(x), Math.round(y), p);


// ---------------- crowd "users" ----------------
function userGrid(p) {
  const seed = p.seed | 0;
  const w = 11 + Math.floor(hash(seed * 3 + 1) * 4), h = 10 + Math.floor(hash(seed * 5 + 2) * 3);
  const g = createGrid(w + 4, h + 6);
  const cx = (w + 4) / 2, cy = h / 2 + 4;
  for (let y = 0; y < h + 6; y++) for (let x = 0; x < w + 4; x++) {
    const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h / 2);
    if (dx * dx + dy * dy * (dy > 0 ? 1.4 : 1) <= 1) set(g, x, y, 'o');
  }
  const ear = Math.floor(hash(seed * 7 + 3) * 4);
  if (ear === 1) { set(g, Math.floor(cx - 3), Math.floor(cy - h / 2) - 1, 'o'); set(g, Math.floor(cx + 2), Math.floor(cy - h / 2) - 1, 'o'); }
  if (ear === 2) { set(g, Math.floor(cx), Math.floor(cy - h / 2) - 1, 'o'); set(g, Math.floor(cx), Math.floor(cy - h / 2) - 2, 'o'); set(g, Math.floor(cx), Math.floor(cy - h / 2) - 3, 'a'); }
  shade(g);
  const ey = Math.floor(cy - 1), lk = p.look | 0;
  const e = p.eyes || 'open';
  if (e === 'happy') { set(g, Math.floor(cx - 3) + lk, ey, 'k'); set(g, Math.floor(cx - 2) + lk, ey - 1, 'k'); set(g, Math.floor(cx + 1) + lk, ey - 1, 'k'); set(g, Math.floor(cx + 2) + lk, ey, 'k'); }
  else if (e === 'closed') { set(g, Math.floor(cx - 3) + lk, ey + 1, 'k'); set(g, Math.floor(cx - 2) + lk, ey + 1, 'k'); set(g, Math.floor(cx + 1) + lk, ey + 1, 'k'); set(g, Math.floor(cx + 2) + lk, ey + 1, 'k'); }
  else { fillRect(g, Math.floor(cx - 3) + lk, ey, 1, 2, 'k'); fillRect(g, Math.floor(cx + 2) + lk, ey, 1, 2, 'k'); }
  if (p.mouth === 'o') set(g, Math.floor(cx) + lk, ey + 3, 'k');
  set(g, Math.floor(cx - 4) + lk, ey + 2, 'p'); set(g, Math.floor(cx + 3) + lk, ey + 2, 'p');
  if (!p.noOutline) outline(g);
  return { g, ax: Math.floor(cx), ay: Math.floor(cy + h / 2) + 1 };
}
const userPal = (p) => {
  const hue = hash((p.seed | 0) * 11 + 5) * 360;
  const sat = 0.45 + hash((p.seed | 0) * 13) * 0.3;
  return palette({ O: hsl(hue, 0.5, 0.14), o: hsl(hue, sat, 0.62), h: hsl(hue + 10, sat, 0.76), s: hsl(hue - 12, sat, 0.48), k: '#141018', p: '#ff9fc0', a: '#ffe27a' }, { bright: p.bright, sat: p.sat });
};
const userBase = makeChar('user', userGrid, userPal, ['seed', 'eyes', 'look', 'mouth'], ['seed', 'bright', 'sat']);
export const drawUser = (s, x, y, p = {}) => userBase(s, Math.round(x), Math.round(y), p);
