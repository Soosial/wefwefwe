// Rival models (DeepSeek whale, Kimi, Z/GLM) and the crowd of tiny "users". Same pipeline/style as heroes.
import { createGrid, fillRect, set, shade, outline, stampHand } from '../core/sprite.mjs';
import { drawEye, drawMouth, palette, makeChar } from './common.mjs';
import { hash } from '../core/math.mjs';
import { hsl } from '../core/fb.mjs';

// ---------------- DeepSeek whale ----------------
export const WHALE_PAL = {
  O: '#101a5c', o: '#4d6bfe', h: '#8aa0ff', s: '#3550d8', S: '#2a3fb0', b: '#c9d4ff', c: '#9fb0f2',
  k: '#0e1238', w: '#ffffff', p: '#ff9fc0', m: '#101a5c', q: '#e8606a', d: '#2a1030',
};
const WW = 92, WH = 52;
function whaleGrid(p) {
  const g = createGrid(WW, WH);
  const tail = p.tail ?? 0; // -1..1 fluke bend
  const cx = 56, cy = 26, rx = 28, ry = 15;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    // slightly flatter belly, rounder head
    const P = dx > 0 ? 2.2 : 2.0;
    if (Math.abs(dx) ** P + Math.abs(dy) ** 2.1 <= 1) set(g, x, y, 'o');
  }
  // tail stalk tapering from body to flukes, bending with `tail`
  for (let x = 12; x <= 34; x++) {
    const u = (34 - x) / 22; // 0 at body, 1 at flukes
    const half = 8 - u * 5.5;
    const yc = cy - 2 + Math.round(tail * 5 * u * u) - u * 3;
    for (let y = Math.round(yc - half); y <= Math.round(yc + half); y++) set(g, x, y, 'o');
  }
  // flukes
  const fy = cy - 5 + Math.round(tail * 6);
  for (let i = 0; i < 11; i++) {
    const x = 13 - i;
    const spread = 2 + i * 0.9;
    for (let y = Math.round(fy - spread - 3 - tail * i * 0.5); y <= Math.round(fy - spread + 1 - tail * i * 0.3); y++) set(g, x, y, 'o');
    for (let y = Math.round(fy + spread - 1 - tail * i * 0.3); y <= Math.round(fy + spread + 3 - tail * i * 0.5); y++) set(g, x, y, 'o');
  }
  // flipper
  const fl = p.fin ?? 0;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4 - (i >> 2); j++) set(g, 50 - i + Math.round(fl * i * 0.3), 38 + i + j - Math.round(fl * i * 0.6), 'o');
  shade(g);
  // belly + pleats
  for (let y = 0; y < WH; y++) for (let x = 30; x < WW; x++) {
    const t = g[y][x];
    if (t !== 'o' && t !== 'h' && t !== 's') continue;
    const line = cy + 5 - (x - 30) * 0.08;
    if (y >= line) g[y][x] = t === 's' ? 'c' : ((y - Math.round(line)) % 3 === 2 && x > 38 && x < 78 ? 'c' : 'b');
  }
  // eye, blush, mouth
  const eyes = p.eyes || 'open';
  drawEye(g, 66, 17 + (p.look ? 0 : 0), 4, 6, eyes, 0, 'o');
  if (p.eye2) drawEye(g, 74, 17, 3, 5, eyes, 1, 'o');
  fillRect(g, 70, 26, 4, 2, 'p');
  const mouth = p.mouth || 'smile';
  if (mouth === 'laugh' || mouth === 'open') {
    for (let x = 60; x <= 83; x++) {
      const top = 29 - Math.round((x - 60) * 0.12);
      const depth = mouth === 'laugh' ? Math.round(Math.sin(((x - 60) / 23) * Math.PI) * 5) : Math.round(Math.sin(((x - 60) / 23) * Math.PI) * 3);
      for (let y = top; y <= top + depth; y++) set(g, x, y, y >= top + depth - 1 && x > 66 && x < 80 ? 'q' : 'd');
    }
  } else {
    for (let x = 60; x <= 82; x++) set(g, x, 29 - Math.round((x - 60) * 0.12) + (x < 63 ? 1 : 0), 'm');
  }
  // blowhole
  fillRect(g, 61, 11, 3, 1, 'S');
  outline(g);
  return { g, ax: 56, ay: 46 };
}
const whaleBase = makeChar('whale', whaleGrid, (p) => palette(WHALE_PAL, { sat: p.sat, bright: p.bright }), ['tail', 'fin', 'eyes', 'eye2', 'mouth'], ['sat', 'bright']);
export const drawWhale = (s, x, y, p = {}) => whaleBase(s, Math.round(x), Math.round(y), { ...p, tail: Math.round((p.tail ?? 0) * 4) / 4, fin: Math.round((p.fin ?? 0) * 3) / 3 });

// ---------------- Kimi (Moonshot) ----------------
export const KIMI_PAL = { O: '#07080d', o: '#353b51', h: '#565f80', s: '#242939', W: '#f4f6ff', L: '#c9cfe6', B: '#2f8dff', b: '#9cc8ff', k: '#07080d', w: '#ffffff', p: '#ff9fc0', m: '#07080d', q: '#e8606a' };
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
  drawEye(g, cx + 3, cy + 1, 4, 6, eyes, 1, 'o');
  fillRect(g, cx - 10, cy + 8, 2, 1, 'p'); fillRect(g, cx + 8, cy + 8, 2, 1, 'p');
  drawMouth(g, cx, cy + 8, p.mouth || 'smile', false);
  outline(g);
  return { g, ax: cx, ay: cy + ry + 1 };
}
const kimiBase = makeChar('kimi', kimiGrid, (p) => palette(KIMI_PAL, { sat: p.sat, bright: p.bright }), ['sq', 'handL', 'handR', 'eyes', 'mouth'], ['sat', 'bright'], ['B', 'b']);
export const drawKimi = (s, x, y, p = {}) => kimiBase(s, Math.round(x), Math.round(y), p);

// ---------------- Z (GLM / Zhipu) ----------------
export const Z_PAL = { O: '#121633', o: '#e3e8f6', h: '#ffffff', s: '#b4bdd8', Z: '#2346d6', z: '#5d7bff', k: '#121633', w: '#ffffff', p: '#ff9fc0', m: '#121633', q: '#e8606a' };
function zGrid(p) {
  const g = createGrid(52, 52);
  const sq = p.sq ?? 0;
  const cx = 26, cy = 28 + sq, rx = 16 + sq, ry = 16 - sq;
  for (let y = 0; y < 52; y++) for (let x = 0; x < 52; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dx) ** 3.2 + Math.abs(dy) ** 3.2 <= 1) set(g, x, y, 'o');
  }
  // little antenna-zigzag on top
  set(g, cx + 1, cy - ry - 1, 'o'); set(g, cx + 2, cy - ry - 2, 'o'); set(g, cx + 1, cy - ry - 3, 'o'); set(g, cx + 2, cy - ry - 4, 'o');
  shade(g);
  const zx = cx - 7, zy = cy - 12;
  fillRect(g, zx, zy, 14, 2, 'Z');
  for (let i = 0; i < 6; i++) fillRect(g, zx + 11 - i * 2, zy + 2 + i, 3, 1, 'Z');
  fillRect(g, zx, zy + 8, 14, 2, 'Z');
  fillRect(g, zx, zy, 14, 1, 'z');
  const hand = { o: 'o', h: 'h', s: 's' };
  const hL = p.handL || [0, 0], hR = p.handR || [0, 0];
  stampHand(g, cx - rx - 3 + hL[0], cy + 4 + hL[1], 6, -1, hand, 'O', true);
  stampHand(g, cx + rx - 3 + hR[0], cy + 4 + hR[1], 6, 1, hand, 'O', true);
  const eyes = p.eyes || 'open';
  drawEye(g, cx - 7, cy + 1, 4, 6, eyes, 0, 'o');
  drawEye(g, cx + 3, cy + 1, 4, 6, eyes, 1, 'o');
  fillRect(g, cx - 10, cy + 8, 2, 1, 'p'); fillRect(g, cx + 8, cy + 8, 2, 1, 'p');
  drawMouth(g, cx, cy + 8, p.mouth || 'smile', false);
  outline(g);
  return { g, ax: cx, ay: cy + ry + 1 };
}
const zBase = makeChar('z', zGrid, (p) => palette(Z_PAL, { sat: p.sat, bright: p.bright }), ['sq', 'handL', 'handR', 'eyes', 'mouth'], ['sat', 'bright']);
export const drawZ = (s, x, y, p = {}) => zBase(s, Math.round(x), Math.round(y), p);

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
  outline(g);
  return { g, ax: Math.floor(cx), ay: Math.floor(cy + h / 2) + 1 };
}
const userPal = (p) => {
  const hue = hash((p.seed | 0) * 11 + 5) * 360;
  const sat = 0.45 + hash((p.seed | 0) * 13) * 0.3;
  return palette({ O: hsl(hue, 0.5, 0.14), o: hsl(hue, sat, 0.62), h: hsl(hue + 10, sat, 0.76), s: hsl(hue - 12, sat, 0.48), k: '#141018', p: '#ff9fc0', a: '#ffe27a' }, { bright: p.bright, sat: p.sat });
};
const userBase = makeChar('user', userGrid, userPal, ['seed', 'eyes', 'look', 'mouth'], ['seed', 'bright', 'sat']);
export const drawUser = (s, x, y, p = {}) => userBase(s, Math.round(x), Math.round(y), p);
