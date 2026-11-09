// The 2D launch field: sky by time of day, the Summit on the horizon, far islands, cloud sea, the village,
// launch pads, the split-flap scoreboard, balloon/rocket/crate props, bunting and emotes.
import { hex, mix, rect, pset, pdith, line, poly, glow, disc, ellipse, bayer, Surface, draw } from '../core/fb.mjs';
import { clamp, hash, hash2, noise1, TAU } from '../core/math.mjs';
import { text, textWidth } from '../core/font.mjs';
import { skyGradient, stars, milkyWay, cloudSea, farIslands, moon } from './sky.mjs';
import { ground, hills, treeSprite } from './land.mjs';
import { tag } from './props.mjs';

export const TOD = {
  morning: { sky: [[0, '#3f6fd0'], [0.55, '#86b8f0'], [0.85, '#cfe6ff'], [1, '#fff1d8']], amb: [1, 0.98, 0.95], cloud: ['#9aa8d8', '#b8c6ee', '#d8e2f8', '#f2f6ff'], far: ['#8a9ad0', '#a8b6e4'], summit: '#8a96d8', isl: ['#7aa86a', '#6e7aa8', '#5a6290', '#cfe6ff'], stars: 0 },
  day: { sky: [[0, '#3a68cc'], [0.6, '#7fb2ee'], [1, '#d8ecff']], amb: [1, 1, 1], cloud: ['#a0aedc', '#bccaf0', '#dde6fa', '#f6f9ff'], far: ['#8a9ad0', '#a8b6e4'], summit: '#8a96d8', isl: ['#7aa86a', '#6e7aa8', '#5a6290', '#cfe6ff'], stars: 0 },
  sunset: { sky: [[0, '#2a2a6a'], [0.45, '#7a4a9a'], [0.75, '#e0708a'], [0.9, '#ffa860'], [1, '#ffd890']], amb: [1, 0.78, 0.72], cloud: ['#6a4a7a', '#a0608a', '#d8889a', '#f4b8a0'], far: ['#5a3a6a', '#7a4a7a'], summit: '#6a4a8a', isl: ['#5a5a4a', '#5a3a6a', '#4a2e5a', '#ffb890'], stars: 0.2 },
  night: { sky: [[0, '#070a24'], [0.45, '#151a4a'], [0.8, '#2d2462'], [1, '#4a2f6e']], amb: [0.6, 0.6, 0.9], cloud: ['#2a2a62', '#3e4284', '#5a60a8', '#8890d0'], far: ['#1d2150', '#262a62'], summit: '#2a2e64', isl: ['#3b4a86', '#232858', '#191c46', '#8fa6e8'], stars: 1 },
  rain: { sky: [[0, '#0b0f1c'], [0.5, '#161d30'], [1, '#2a3246']], amb: [0.42, 0.46, 0.6], cloud: ['#1a2030', '#252d42', '#323c56', '#465070'], far: ['#1a2030', '#232a3c'], summit: '#262c3e', isl: ['#2c3448', '#1c2232', '#151a28', '#56607e'], stars: 0 },
  dawn: { sky: [[0, '#2a3f7a'], [0.35, '#6a6ab0'], [0.65, '#e79aa8'], [0.85, '#ffc38a'], [1, '#ffe2a6']], amb: [1, 0.86, 0.84], cloud: ['#c98aa0', '#e0a8b0', '#f4c8b8', '#fff0d8'], far: ['#8a6a9a', '#a888b0'], summit: '#9a7ab0', isl: ['#9a7aa8', '#7a5a90', '#5e4478', '#ffe2c0'], stars: 0.15 },
};
export const fieldY = (x) => 214 + 1.5 * Math.sin(x / 41) + 1 * Math.sin(x / 13.7);
export const fy = (x) => Math.round(fieldY(x));
export const PADS = { clawd: 360, codex: 470, gemini: 580 };
export const BOARD_X = 712, TREE_X = 236;

// ---------------- the Summit on the horizon ----------------
export function summit2D(s, t, o = {}) {
  const p = o.parallax ?? 0.05, x0 = Math.round((o.x ?? 330) - s.tx * p), base = Math.round((o.y ?? 196) - s.ty * p * 0.5);
  const c = hex(o.color ?? '#8a96d8'), snow = mix(c, '#ffffff', 0.55), dark = mix(c, '#000000', 0.18);
  const H = o.h ?? 170;
  for (let y = 0; y < H; y++) {
    const u = y / H, half = 70 * Math.pow(1 - u, 1.25) + 2 + (y % 30 < 3 && u < 0.7 ? 4 : 0) + Math.sin(y * 0.37) * 1.5;
    const sy = base - y;
    if (sy < 0 || sy >= s.h) continue;
    for (let dx = -Math.round(half); dx <= Math.round(half); dx++) {
      const px = x0 + dx;
      if (px < 0 || px >= s.w) continue;
      let cc = dx > half * 0.25 ? dark : c;
      if (u > 0.62 && (dx < half * 0.4 || bayer(px, sy) < 0.5)) cc = snow;
      s.d[sy * s.w + px] = cc; s.m[sy * s.w + px] = 0;
    }
  }
  const sx = x0, sy = base - H - 8;
  glow(s, sx + s.tx, sy + s.ty, 34, o.starGlow ?? '#ffe6a0', 0.55 * (o.k ?? 1), 6);
  s.with({ flag: 2 }, () => {
    const r = 6 + Math.round(Math.sin(t * 2) * 0.6);
    for (let i = -r; i <= r; i++) { pset(s, sx + i + s.tx, sy + s.ty, '#fff4c0'); pset(s, sx + s.tx, sy + i + s.ty, '#fff4c0'); }
    for (let i = -2; i <= 2; i++) { pset(s, sx + i + s.tx, sy + i + s.ty, '#ffd25a'); pset(s, sx + i + s.tx, sy - i + s.ty, '#ffd25a'); }
    disc(s, sx + s.tx, sy + s.ty, 1.6, '#ffffff');
  });
}

// ---------------- village houses (pixel art) ----------------
const ROOFS = [['#b8382a', '#d8574a'], ['#2f68c8', '#4f86e2'], ['#d89430', '#f0b452'], ['#7348c4', '#9168de'], ['#2a8e62', '#46ae80']];
export function house2D(s, t, x, y, w, h, roof, night, seed = 0) {
  const R = ROOFS[roof % ROOFS.length];
  const wall = ['#f3e6cc', '#e2cfae'], timber = '#7a5232';
  rect(s, x, y - h, w, h, wall[0]);
  rect(s, x + w - 3, y - h, 3, h, wall[1]);
  rect(s, x, y - h, w, 1, timber); rect(s, x, y - 1, w, 1, timber); rect(s, x, y - h, 1, h, timber); rect(s, x + w - 1, y - h, 1, h, timber);
  const dw = 5, dx = x + Math.floor(w / 2) - 2;
  rect(s, dx, y - 9, dw, 8, '#4e3220'); rect(s, dx, y - 9, dw, 1, timber); pset(s, dx + 3, y - 5, '#d8b04a');
  for (const wx of [x + 3, x + w - 8]) {
    const lit = night && hash(seed + wx) < 0.8;
    s.with({ flag: lit ? 2 : s.flag }, () => { rect(s, wx, y - h + 4, 5, 4, lit ? '#ffd27a' : '#9cc8ec'); if (!lit) pset(s, wx + 1, y - h + 5, '#e8f4ff'); });
    rect(s, wx + 2, y - h + 4, 1, 4, timber); rect(s, wx, y - h + 6, 5, 1, timber);
    rect(s, wx - 1, y - h + 8, 7, 1, timber);
    for (let k = 0; k < 5; k++) pset(s, wx + k, y - h + 9, ['#ff8fb0', '#ffe066', '#ffffff'][(k + seed) % 3]);
  }
  const rh = Math.round(w * 0.45);
  for (let k = 0; k < rh; k++) {
    const yy = y - h - 1 - k, half = w / 2 + 2 - (k * (w / 2 + 2)) / rh;
    rect(s, Math.round(x + w / 2 - half), yy, Math.round(half * 2), 1, k % 2 ? R[0] : R[1]);
    pset(s, Math.round(x + w / 2 - half), yy, mix(R[0], '#000000', 0.3));
  }
  const cx2 = x + w - 7;
  rect(s, cx2, y - h - rh + 1, 3, Math.round(rh * 0.6), '#8c5a48');
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.35 + i / 4 + hash(seed) * 0.5) % 1;
    disc(s, cx2 + 1 + Math.sin(u * 6 + seed) * 2 + u * 6, y - h - rh - 2 - u * 18, 1 + u * 2.2, night ? '#5a5a7a' : '#e8ecf6', (1 - u) * 0.8);
  }
  if (night && seed % 2) glow(s, x + w / 2, y - h / 2, w, '#ffcf7a', 0.15, 4);
}

export function village(s, t, o = {}) {
  const night = !!o.night;
  s.with({ parallax: o.parallax ?? 0.82, parallaxY: o.py ?? 0.82 }, () => {
    const y0 = o.y ?? 200;
    const L = [[150, 34, 22, 0], [196, 30, 20, 2], [560, 36, 24, 1], [612, 28, 19, 3], [660, 32, 22, 4], [96, 28, 18, 1], [728, 30, 20, 0]];
    for (const [x, w, h, r] of L) house2D(s, t, x, y0 + (r % 2), w, h, r, night, x);
  });
}

// ---------------- launch pad ----------------
export function pad2D(s, x, y, ring, o = {}) {
  const rx = o.rx ?? 30, ry = o.ry ?? 6;
  ellipse(s, x, y + 2, rx + 2, ry + 1.5, '#4b4760');
  ellipse(s, x, y + 1, rx, ry, '#8c8a9a');
  ellipse(s, x, y, rx - 1, ry - 1, '#a8a6b8');
  const cols = Array.isArray(ring) ? ring.map(hex) : [hex(ring)];
  for (let a = 0; a < TAU; a += 0.02) {
    const px = Math.round(x + Math.cos(a) * (rx - 5)), py = Math.round(y + Math.sin(a) * (ry - 2));
    pset(s, px, py, cols[Math.floor(((a + Math.PI * 0.5) / TAU) * cols.length) % cols.length]);
  }
}

// ---------------- split-flap scoreboard ----------------
// rows: [{ rank, name, col }] ; flips: [{ t0, row, from }] ; (x, y) = bottom centre of the posts
export function board2D(s, t, x, y, rows, o = {}) {
  const cw = 6, ch = 9, cols = o.cols ?? 17, rowH = 11;
  const bw = cols * cw + 26, bh = rows.length * rowH + 22;
  const bx = Math.round(x - bw / 2), by = Math.round(y - (o.lift ?? 34) - bh);
  for (const px of [bx + 6, bx + bw - 9]) { rect(s, px, by + bh - 2, 3, y - by - bh + 2, '#5a3d26'); rect(s, px, by + bh - 2, 1, y - by - bh + 2, '#8a6040'); }
  rect(s, bx - 2, by - 2, bw + 4, bh + 4, '#5a3d26');
  rect(s, bx - 2, by - 2, bw + 4, 1, '#8a6040');
  rect(s, bx, by, bw, bh, '#1a1e2c');
  rect(s, bx + 2, by + 2, bw - 4, 11, '#b8382a');
  s.with({ flag: 2 }, () => text(s, o.title ?? 'ТАБЛО ВЕРШИНЫ', x, by + 5, { align: 'center', color: '#fff2d8' }));
  rows.forEach((r, ri) => {
    const ry = by + 16 + ri * rowH;
    const flip = (o.flips || []).filter((f) => f.row === ri && t >= f.t0).pop();
    const hi = o.highlight === ri;
    if (hi) rect(s, bx + 1, ry - 1, bw - 2, rowH, mix('#1a1e2c', r.col || '#ffffff', 0.25 + 0.1 * Math.sin(t * 8)));
    rect(s, bx + 4, ry + 1, 4, 6, r.col || '#888888');
    const str = String(r.rank ?? ri + 1).padStart(1) + ' ' + r.name;
    const prev = flip ? String(r.rank ?? ri + 1) + ' ' + flip.from : str;
    for (let c = 0; c < cols - 2; c++) {
      const cx = bx + 11 + c * cw;
      rect(s, cx, ry, cw - 1, ch, '#262b3c');
      rect(s, cx, ry + 4, cw - 1, 1, '#11141e');
      let chs = str[c] || ' ', flipping = false;
      if (flip) {
        const a = flip.t0 + c * 0.035, b = a + 0.32;
        if (t < a) chs = prev[c] || ' ';
        else if (t < b) { flipping = true; const k = Math.floor(t * 30 + c); chs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[hash2(k, c, ri) * 36 | 0]; }
      }
      if (chs !== ' ') s.with({ flag: 2 }, () => text(s, chs, cx + Math.floor((cw - 1 - textWidth(chs)) / 2), ry + 2, { color: flipping ? '#9aa0b8' : hi ? '#ffffff' : r.textCol ?? '#f6ecd0' }));
      if (flipping && Math.floor(t * 30 + c) % 2) rect(s, cx, ry, cw - 1, 4, '#3a4054');
    }
  });
  return { bx, by, bw, bh };
}

// ---------------- the 3.5 PRO crate (2D) ----------------
export function crate2D(s, t, x, y, stage = 0, o = {}) {
  const w = o.w ?? 36, h = o.h ?? 32, x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
  rect(s, x0, y0, w, h, '#b88a52');
  for (let k = 0; k < h; k += 5) rect(s, x0, y0 + k, w, 1, '#8a6036');
  rect(s, x0, y0, 3, h, '#6a4626'); rect(s, x0 + w - 3, y0, 3, h, '#6a4626'); rect(s, x0, y0, w, 3, '#6a4626'); rect(s, x0, y0 + h - 3, w, 3, '#6a4626');
  line(s, x0 + 3, y0 + 3, x0 + w - 4, y0 + h - 4, '#7a5230'); line(s, x0 + 3, y0 + h - 4, x0 + w - 4, y0 + 3, '#7a5230');
  for (const [cx, cy] of [[x0, y0], [x0 + w - 3, y0], [x0, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) rect(s, cx, cy, 3, 3, '#9a9eb0');
  rect(s, x0 + 5, y0 + 7, w - 10, 18, '#c8a070');
  text(s, '3.5', x, y0 + 9, { align: 'center', font: 'press', color: '#3a2414' });
  text(s, 'PRO', x, y0 + 18, { align: 'center', color: '#3a2414' });
  if (stage >= 1) {
    for (let k = 0; k < 9; k++) { pdith(s, x0 + 3 + k, y0 + 3 + k, '#e8e8f0', 0.8); pdith(s, x0 + w - 4 - k, y0 + 3 + k, '#e8e8f0', 0.8); }
    line(s, x0 + 3, y0 + 9, x0 + 9, y0 + 3, '#e8e8f0', 0.7);
    for (let k = 0; k < w; k += 2) if (hash(k + 7) < 0.6) pset(s, x0 + k, y0 - 1, '#c8bca8');
  }
  if (stage >= 2) {
    ellipse(s, x - 6, y0 - 2, 8, 3, '#6a4a22'); ellipse(s, x - 6, y0 - 3, 6, 2, '#9a7a46');
    const bob = Math.round(Math.sin(t * 5) * 0.6);
    disc(s, x - 6, y0 - 7 + bob, 3, '#5a9ad8'); pset(s, x - 8, y0 - 8 + bob, '#151a3d'); pset(s, x - 10, y0 - 7 + bob, '#f6b040'); pset(s, x - 11, y0 - 7 + bob, '#f6b040');
  }
  if (stage >= 3) for (let k = 0; k < 14; k++) pset(s, x0 + hash(k) * w, y0 - 1 + (hash(k + 3) < 0.5 ? 0 : -1), ['#a8481e', '#d0622a', '#e8a33a', '#f2c84b'][k % 4]);
  if (o.tag !== false) {
    const sw = Math.round(Math.sin(t * 2.2) * 1.2);
    tag(s, x + w / 2 - 4 + sw, y0 + 12, o.tagText ?? 'COMING SOON', { ink: '#c0392b', string: [x + w / 2 - 6, y0 + 8] });
  }
}

// ---------------- balloon & rocket on their pads (2D) ----------------
export function balloon2D(s, t, x, y, o = {}) {
  const lift = o.lift ?? 0, by = y - lift;
  const ecy = by - 66, rx = 26, ry = 30;
  for (let dy = -ry; dy <= ry + 14; dy++) {
    let half;
    if (dy <= ry * 0.4) half = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
    else { const h0 = rx * Math.sqrt(1 - 0.16), k = (dy - ry * 0.4) / (ry * 0.6 + 14); half = h0 + (7 - h0) * k; }
    for (let dx = -Math.round(half); dx <= Math.round(half); dx++) {
      const u = dx / Math.max(1, half);
      const gore = Math.floor((Math.asin(clamp(u, -1, 1)) / Math.PI + 0.5) * 8) % 2;
      let c = gore ? '#d97757' : '#f6e7cf';
      const l = -u * 0.45 - dy / ry * 0.35;
      if (l < -0.25) c = gore ? '#b0573a' : '#d8c4a4';
      else if (l > 0.35 && bayer(x + dx, ecy + dy) < 0.6) c = gore ? '#f0a07c' : '#fffaf0';
      if (Math.abs(dx) >= Math.round(half) - 0) c = '#6b2e1c';
      pset(s, x + dx, ecy + dy, c);
    }
  }
  rect(s, x - 26, ecy - 1, 53, 1, '#8a3a22');
  if (o.label) text(s, o.label, x, ecy - 4, { align: 'center', font: 'press', color: '#fff6e8', outline: '#6b2e1c' });
  const sk = ecy + ry + 14;
  for (const dx of [-7, 7]) line(s, x + dx, sk, x + dx * 1.3, by - 13, '#6a4a30');
  const fl = o.flame ?? 0.5;
  if (fl > 0) {
    s.with({ flag: 2 }, () => {
      const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
      for (let i = 0; i < 4; i++) { const hgt = Math.round((3 + 3 * fl) * (0.6 + 0.4 * Math.sin(t * 13 + i * 1.7))); rect(s, x - 2 + i, sk - 1 - hgt + 4, 1, hgt, cols[i]); }
    });
    glow(s, x, sk - 2, 16, '#ffcf8a', 0.5 * fl, 5);
  }
  rect(s, x - 10, by - 13, 21, 12, '#9a6634');
  for (let k = 0; k < 21; k += 2) rect(s, x - 10 + k, by - 13, 1, 12, '#b07a40');
  rect(s, x - 11, by - 14, 23, 2, '#6a4220'); rect(s, x - 10, by - 2, 21, 1, '#6a4220');
}
export function rocket2D(s, t, x, y, o = {}) {
  const lift = o.lift ?? 0, by = y - lift;
  const H = 84, r = 12;
  for (let k = 0; k < H; k++) {
    const yy = by - 8 - k, u = k / H;
    let half = u < 0.72 ? r : r * Math.pow(1 - (u - 0.72) / 0.28, 0.7);
    for (let dx = -Math.round(half); dx <= Math.round(half); dx++) {
      let c = u > 0.72 ? (u > 0.95 ? '#ff6a5a' : '#4a6cff') : '#eef2ff';
      if (u <= 0.72 && ((k > 14 && k < 19) || (k > 54 && k < 57))) c = '#4a6cff';
      if (dx > half * 0.45) c = mix(c, '#3a4a9a', 0.35);
      else if (dx < -half * 0.55) c = mix(c, '#ffffff', 0.4);
      if (Math.abs(dx) === Math.round(half)) c = '#0b1240';
      pset(s, x + dx, yy, c);
    }
  }
  for (const sd of [-1, 1]) poly(s, [[x + sd * r, by - 8], [x + sd * (r + 9), by + 2], [x + sd * (r + 9), by - 6], [x + sd * r, by - 26]], '#2a3fb0');
  rect(s, x - 6, by - 8, 13, 8, '#5a5e70');
  rect(s, x - 7, by - 58, 15, 18, '#0f1533');
  if (o.label) s.with({ flag: 2 }, () => { const str = o.label; for (let i = 0; i < str.length; i++) text(s, str[i], x, by - 50 + i * 8 - str.length * 4 + 30, { align: 'center', color: '#4a6cff' }); });
  const fire = o.fire ?? 0;
  if (fire > 0) {
    s.with({ flag: 2 }, () => {
      for (let i = 0; i < 40; i++) {
        const u = hash(i + Math.floor(t * 30) * 7), a = (hash(i * 3) - 0.5) * 0.6;
        const L = 6 + u * 26 * fire;
        line(s, x, by, x + Math.sin(a) * L, by + Math.cos(a) * L, u < 0.3 ? '#ffffff' : u < 0.7 ? '#ffd24a' : '#ff7a2a', 0.85);
      }
    });
    glow(s, x, by + 8, 40 * fire, '#ffb84a', 0.8 * fire, 6);
  }
}

// ---------------- bunting ----------------
export function bunting2D(s, t, x0, y0, x1, y1, sag = 10) {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 2));
  const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#ff8fb0', '#ffffff'];
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag;
    if (prev) line(s, prev[0], prev[1], x, y, '#3a2e30');
    prev = [x, y];
    if (i % 4 === 2) {
      const c = cols[(i >> 2) % cols.length], sw = Math.round(Math.sin(t * 3 + i) * 0.8);
      poly(s, [[x - 3, y], [x + 3, y], [x + sw, y + 7]], c);
    }
  }
}

// ---------------- the whole set ----------------
// blend two time-of-day palettes (keys or objects); k is quantised so cached cloud layers stay bounded
const S5 = (st) => {
  const out = [];
  for (let k = 0; k < 5; k++) {
    const u = k / 4;
    let i = 0;
    while (i < st.length - 2 && u > st[i + 1][0]) i++;
    const a = st[i], b = st[i + 1];
    out.push([u, mix(hex(a[1]), hex(b[1]), clamp((u - a[0]) / (b[0] - a[0] || 1)))]);
  }
  return out;
};
export function mixTOD(a, b, k) {
  if (typeof a === 'string') a = TOD[a];
  if (typeof b === 'string') b = TOD[b];
  k = Math.round(clamp(k) * 16) / 16;
  if (k <= 0) return a;
  if (k >= 1) return b;
  const mc = (u, v) => mix(hex(u), hex(v), k), A = S5(a.sky), B = S5(b.sky);
  return {
    sky: A.map(([u, c], i) => [u, mix(c, B[i][1], k)]), amb: a.amb.map((v, i) => v + (b.amb[i] - v) * k),
    cloud: a.cloud.map((c, i) => mc(c, b.cloud[i])), far: a.far.map((c, i) => mc(c, b.far[i])), summit: mc(a.summit, b.summit),
    isl: a.isl.map((c, i) => mc(c, b.isl[i])), stars: (a.stars ?? 0) + ((b.stars ?? 0) - (a.stars ?? 0)) * k,
  };
}

export function fieldSet(f, s, t, o = {}) {
  const P = o.pal || TOD[o.tod || 'morning'];
  skyGradient(s, P.sky, 22, s.ty * 0.06);
  if (P.stars) { milkyWay(s, { k: 0.7 * P.stars, maxY: 200 }); stars(s, t, { count: 300, seed: 3, parallax: 0.05, bright: P.stars }); }
  if (o.moon) moon(s, Math.round(o.moon[0] - s.tx * 0.04), Math.round(o.moon[1] - s.ty * 0.04), o.moon[2] ?? 9);
  if (o.sun) { glow(s, o.sun[0] + s.tx * 0.96, o.sun[1] + s.ty * 0.96, 120, o.sunGlow ?? '#ffd8a0', 0.45, 7); glow(s, o.sun[0] + s.tx * 0.96, o.sun[1] + s.ty * 0.96, 18, '#fff8e0', 0.9, 5); }
  if (o.beforeFar) o.beforeFar(s);
  if (o.summit !== false) summit2D(s, t, { color: P.summit, x: o.summitX ?? 330, k: o.summitK ?? 1 });
  farIslands(s, t, { parallax: 0.12, top: P.isl[0], body: P.isl[1], dark: P.isl[2], fall: P.isl[3] });
  cloudSea(s, t, { y: 172 - s.ty * 0.25, parallax: 0.2, speed: 3, seed: 5, h: 80, colors: P.cloud, fill: P.cloud[0] });
  hills(s, { parallax: 0.35, base: 192, amp: 12, seed: 3, color: P.far[0], rim: P.far[1], py: 0.3 });
  village(s, t, { night: o.night ?? o.tod === 'night', y: 206 });
  if (o.tree !== false) { const T = treeSprite(); draw(s, T, TREE_X - 100, fy(TREE_X) - T.h + 4, { flag: 1 }); }
  if (o.beforeGround) o.beforeGround(s);
  ground(s, t, fieldY, { wind: o.wind ?? 1, flowers: o.flowers ?? 0.06, pal: o.groundPal });
  if (o.pads !== false) { pad2D(s, PADS.clawd, fy(PADS.clawd) + 2, '#d97757'); pad2D(s, PADS.codex, fy(PADS.codex) + 2, '#5a7cff'); pad2D(s, PADS.gemini, fy(PADS.gemini) + 2, ['#ea4335', '#fbbc04', '#34a853', '#4285f4']); }
  if (o.bunting !== false) {
    for (const px of [300, 640]) { rect(s, px - 1, fy(px) - 70, 3, 70, '#5a3d26'); rect(s, px - 1, fy(px) - 70, 1, 70, '#8a6040'); }
    bunting2D(s, t, 300, fy(300) - 68, 640, fy(640) - 68, 14);
  }
  f.ambient = P.amb;
}

// ---------------- Gemini 4 Argon glider (2D, 3/4 view) ----------------
// (x, y) = point under the glider; o: parked (legs), engine 0..1 (violet exhaust), bank (px of wing tilt), build 0..1
export function glider2D(s, t, x, y, o = {}) {
  x = Math.round(x); y = Math.round(y);
  const w = o.w ?? 74, half = w / 2, bank = o.bank ?? 0, build = o.build ?? 1;
  const cols = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'].map(hex), navy = hex('#1a1f4d');
  const cy = y - (o.parked === false ? 0 : 9);
  if (o.parked !== false) for (const lx of [-18, 17]) { rect(s, x + lx, cy + 2, 2, 7, '#3a3f5a'); rect(s, x + lx - 4, y - 1, 10, 2, '#2a2f4a'); }
  // engine pod under the centre, violet argon glow at the back
  rect(s, x - 6, cy + 1, 12, 5, '#5a5e74'); rect(s, x - 6, cy + 1, 12, 1, '#8a8ea4'); rect(s, x - 6, cy + 5, 12, 1, '#3a3e54');
  const e = o.engine ?? 0;
  if (e > 0) s.with({ flag: 2 }, () => {
    for (let i = 0; i < 3 + e * 10; i++) { const k = hash2(i, Math.floor(t * 20), 3); pset(s, x - 7 - i, cy + 2 + Math.round((k - 0.5) * 3 * (i / 6)), i < 2 ? '#ffffff' : k < 0.5 ? '#d8c8ff' : '#9a84ff'); }
    glow(s, x - 8 + s.tx, cy + 3 + s.ty, 10 + e * 8, '#b9a4ff', 0.5 * e, 4);
  });
  for (let dx = -Math.round(half); dx <= Math.round(half); dx++) {
    const u = (dx + half) / w;
    if (u > build) continue;
    const a = Math.abs(dx) / half, top = Math.round(cy - 7 + a * 7 + (dx / half) * bank), th = Math.max(2, Math.round(6 - a * 4));
    const c = cols[clamp(Math.floor(u * 4), 0, 3)];
    pset(s, x + dx, top - 1, navy);
    for (let k = 0; k < th; k++) pset(s, x + dx, top + k, k === 0 ? mix(c, '#ffffff', 0.35) : k === th - 1 ? mix(c, '#000000', 0.25) : c);
    pset(s, x + dx, top + th, navy);
  }
  if (build >= 1) { pset(s, x - Math.round(half) - 1, cy + 1 - Math.round(bank), navy); pset(s, x + Math.round(half) + 1, cy + 1 + Math.round(bank), navy); }
  if (o.label) text(s, o.label, x, y + 4, { align: 'center', color: '#fff6e0', outline: '#1a1f4d' });
}

// ---------------- emotes ----------------
const EM = {
  '!': ['.##.', '.##.', '.##.', '.##.', '....', '.##.'],
  '?': ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
  sweat: ['..#..', '.###.', '#####', '##.##', '.###.'],
  vein: ['##.##', '#...#', '.....', '#...#', '##.##'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  note: ['..##', '..#.', '..#.', '###.', '###.'],
  dots: ['#.#.#'],
  idea: ['.###.', '#####', '#####', '.###.', '.#.#.', '.###.'],
};
const EMC = { '!': '#ff5a4a', '?': '#ffd23a', sweat: '#7fd0ff', vein: '#ff4a5a', heart: '#ff6a9a', note: '#ffd27a', dots: '#ffffff', idea: '#ffe66a' };
export function emote(s, x, y, kind, age = 1, o = {}) {
  if (age < 0) return;
  const pop = age < 0.12 ? -3 * Math.sin((age / 0.12) * Math.PI) : 0;
  const bob = Math.round(Math.sin(age * 5) * (o.bob ?? 0.8));
  x = Math.round(x); y = Math.round(y + pop + bob);
  if (kind === 'gloom') {
    for (let i = 0; i < 5; i++) for (let k = 0; k < 9 + (i % 2) * 3; k++) pdith(s, x - 8 + i * 4, y + k - ((age * 6 + i) % 3), '#6a6a9a', 0.55);
    return;
  }
  if (kind === 'zzz') {
    for (let i = 0; i < 3; i++) { const u = ((age * 0.6 + i / 3) % 1); text(s, i % 2 ? 'z' : 'Z', x + u * 10, y - u * 16, { color: '#cfd8ff', outline: '#1a1a30', alpha: Math.sin(u * Math.PI) }); }
    return;
  }
  if (kind === 'sparkle') { for (let i = 0; i < 3; i++) { const a = age * 3 + i * 2.1; pset(s, x + Math.cos(a) * 6, y + Math.sin(a) * 4, '#ffffff'); } return; }
  const bm = EM[kind];
  if (!bm) return;
  const c = hex(o.color ?? EMC[kind]), dark = hex('#1a1426');
  const w = bm[0].length, h = bm.length, x0 = x - Math.floor(w / 2), y0 = y - h;
  s.with({ flag: 2 }, () => {
    bm.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch !== '#') return;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const r2 = bm[j + dy], c2 = r2 && r2[i + dx]; if (c2 !== '#') pset(s, x0 + i + dx, y0 + j + dy, dark); }
    }));
    bm.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') pset(s, x0 + i, y0 + j, j === 0 && kind === 'idea' ? '#ffffff' : c); }));
    if (kind === 'sweat') pset(s, x0 + 1, y0 + 2, '#ffffff');
  });
  if (kind === 'idea') glow(s, x + s.tx, y - 3 + s.ty, 12, '#fff2a0', 0.5, 4);
}
