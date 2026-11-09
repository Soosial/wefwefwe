// Props & effects: lanterns, notes, sparkles, sparklers, celestial releases, tags, jar, distiller, leaf umbrella,
// polaroid, firewall, rain/splashes/puddles, confetti, dust, fireflies, speech bubbles and captions.
import { Surface, hex, mix, col, cr, cg, cb, bayer, rect, disc, pset, pdith, padd, line, poly, glow, ellipse, ring, thickLine } from '../core/fb.mjs';
import { hash, hash2, noise2, noise1, clamp, TAU, lerp } from '../core/math.mjs';
import { text, textWidth, textBlock, wrap } from '../core/font.mjs';

// ---------------- paper sky lantern ----------------
// (x, y) = bottom centre (opening). o: w, h, paper, lit (0..1), label, labelColor, t, deflate (0..1), patch (Gemini colours)
export function lantern(s, x, y, o = {}) {
  const w = o.w ?? 18, h0 = o.h ?? 22, t = o.t ?? 0, lit = o.lit ?? 1;
  const def = o.deflate ?? 0;
  const h = Math.max(4, Math.round(h0 * (1 - def * 0.8)));
  const paper = hex(o.paper ?? '#ff9a4a');
  const dark = mix(paper, '#2a1020', 0.55), light = mix(paper, '#fff6d8', 0.7);
  const patch = o.patch ? ['#4285f4', '#ea4335', '#fbbc04', '#34a853'].map(hex) : null;
  const flick = 0.92 + 0.08 * Math.sin(t * 23 + (o.seed ?? 0) * 7) * Math.sin(t * 9.3);
  const sag = def * 6;
  x = Math.round(x); y = Math.round(y);
  s.with({ flag: lit > 0.05 ? 2 : 1 }, () => {
    for (let r = 0; r < h; r++) {
      const v = r / (h - 1); // 0 top .. 1 bottom
      let half = (w / 2) * (1 - v * 0.22) + (def ? Math.sin(v * 9 + t * 8) * def * 1.5 : 0);
      if (r === 0) half -= 2; else if (r === 1) half -= 1;
      const top = y - h + r + (def ? Math.round(sag * Math.sin(Math.PI * 0.5)) * 0 : 0);
      for (let dx = -Math.round(half); dx < Math.round(half); dx++) {
        const u = (dx + half) / (2 * half);
        let base = paper;
        if (patch) base = patch[clamp(Math.floor(u * 4), 0, 3)];
        let l = lit * flick * (0.4 + 0.5 * v) * (1 - Math.abs(u - 0.5) * 0.8);
        if (lit <= 0.05) l = 0.66 - 0.22 * v - Math.abs(u - 0.5) * 0.45;
        l = Math.floor(l * 4 + bayer(x + dx, top) * 0.9) / 4;
        let c = mix(mix(base, '#2a1020', 0.45), mix(base, '#fff0c0', 0.4), clamp(l));
        const rib = Math.round(half * 2 / 4);
        if (rib > 2 && (dx + Math.round(half)) % rib === 0 && Math.abs(dx) > 1) c = mix(c, dark, 0.35);
        if (r === 0 || dx === -Math.round(half) || dx === Math.round(half) - 1) c = mix(c, dark, 0.6);
        if (def > 0 && hash2(dx, r, 3) < def * 0.3) c = mix(c, dark, 0.4);
        pset(s, x + dx, top, c);
      }
    }
    // bottom rim + flame
    const bw = Math.round(w * 0.78);
    rect(s, x - Math.round(bw / 2), y, bw, 1, mix(dark, '#000000', 0.3));
    if (lit > 0.05 && def < 0.5) {
      const fl = Math.sin(t * 17 + (o.seed ?? 0)) > 0 ? 1 : 0;
      rect(s, x - 1, y - 2 - fl, 2, 2 + fl, '#fff4c0');
      pset(s, x, y - 3 - fl, '#ffd36b');
    }
  });
  if (lit > 0.05 && !o.noGlow) glow(s, x, y - h / 2, w * 1.5, o.glowC ?? paper, 0.22 * lit * (1 - def), 5);
  if (o.label && def < 0.4 && h > 10) {
    const lines = Array.isArray(o.label) ? o.label : [o.label];
    const lc = o.labelColor ?? mix(paper, '#2a1020', 0.75);
    lines.forEach((ln, i) => text(s, ln, x, y - h + Math.round(h / 2) - lines.length * 4 + i * 8 + 1, { align: 'center', color: lc }));
  }
}

// ---------------- music notes ----------------
const NOTES = [
  ['...#...', '...##..', '...#.#.', '...#..#', '...#...', '.###...', '####...', '####...', '.##....'],
  ['...######', '...######', '...#....#', '...#....#', '...#....#', '.###..###', '####.####', '####.####', '.##...##.'],
  ['...#.', '...#.', '...#.', '...#.', '...#.', '.###.', '####.', '####.', '.##..'],
];
export function note(s, x, y, kind = 0, c = '#ffb36b', o = {}) {
  const bm = NOTES[kind % 3];
  const cc = hex(c), hi = mix(cc, '#ffffff', 0.55);
  const a = o.alpha ?? 1;
  s.with({ flag: 2 }, () => {
    bm.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch !== '#') return;
      const px = Math.round(x) + rx - 3, py = Math.round(y) + ry - 8;
      const cc2 = (ry === 6 && rx === 1) || (rx === 3 && ry < 2) ? hi : cc;
      if (a >= 1) pset(s, px, py, cc2); else pdith(s, px, py, cc2, a);
    }));
  });
  if (o.glow !== false) glow(s, x, y - 4, 9, c, 0.22 * a, 4);
}

// ---------------- sparkle ----------------
export function sparkle(s, x, y, size = 2, c = '#ffffff', k = 1) {
  x = Math.round(x); y = Math.round(y);
  const cc = hex(c), core = mix(cc, '#ffffff', 0.7);
  s.with({ flag: 2 }, () => {
    pset(s, x, y, core);
    for (let i = 1; i <= size; i++) {
      const a = 1 - (i - 1) / (size + 0.5);
      for (const [dx, dy] of [[i, 0], [-i, 0], [0, i], [0, -i]]) pdith(s, x + dx, y + dy, cc, a * k);
    }
    if (size >= 3) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) pdith(s, x + dx, y + dy, cc, 0.6 * k);
  });
  if (size >= 2) glow(s, x, y, size * 3, c, 0.25 * k, 4);
}

// ---------------- sparkler ("Flash") ----------------
// (x, y) = handle bottom. burn 0..1. lit bool. Returns burning point.
export function sparkler(s, t, x, y, o = {}) {
  const len = o.len ?? 26, ang = o.ang ?? -0.25, burn = clamp(o.burn ?? 0);
  const dx = Math.sin(ang), dy = -Math.cos(ang);
  const handle = 0.32;
  const bu = 1 - burn * (1 - handle); // burning point position along stick (1 = tip)
  for (let i = 0; i <= len; i++) {
    const u = i / len;
    const px = Math.round(x + dx * i), py = Math.round(y + dy * i);
    let c = u < handle ? '#9a9aa8' : u < bu ? '#7a6a5a' : '#2a2626';
    if (u > handle && u < bu && (i & 1)) c = '#8c7b68';
    pset(s, px, py, hex(c));
  }
  const bx = x + dx * len * bu, by = y + dy * len * bu;
  if (o.lit && burn < 1) {
    const fr = Math.floor(t * 30);
    const n = o.sparks ?? 26;
    s.with({ flag: 2 }, () => {
      for (let i = 0; i < n; i++) {
        const h1 = hash2(i, fr, o.seed ?? 3), h2 = hash2(i, fr, 9), h3 = hash2(i, fr, 17);
        const a = h1 * TAU, L = 3 + h2 * (o.size ?? 9);
        const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L + L * L * 0.02;
        const c = h3 < 0.3 ? '#ffffff' : h3 < 0.7 ? '#fff0a0' : '#ffb347';
        line(s, bx + Math.cos(a) * 2, by + Math.sin(a) * 2, ex, ey, hex(c), 0.85);
        if (h2 > 0.7) { // branching crackle
          const a2 = a + (h3 - 0.5) * 1.6;
          line(s, ex, ey, ex + Math.cos(a2) * 3, ey + Math.sin(a2) * 3, hex('#ffe08a'), 0.7);
          pset(s, ex + Math.cos(a2) * 4, ey + Math.sin(a2) * 4, hex('#ffffff'));
        }
      }
      disc(s, bx, by, 1.6, '#ffffff');
    });
    glow(s, bx, by, 22, o.glowC ?? '#ffe6a0', 0.75, 6);
  } else if (o.smoke && burn >= 1) {
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.8 + i * 0.25) % 1);
      pdith(s, bx + Math.sin(u * 6 + i) * 2, by - u * 14, hex('#8a8aa0'), (1 - u) * 0.6);
    }
  }
  return [bx, by];
}

// ---------------- Codex's celestial releases ----------------
export function sun(s, t, x, y, r, o = {}) {
  const k = o.k ?? 1;
  glow(s, x, y, r * 4.5, '#ffb84a', 0.55 * k, 7);
  glow(s, x, y, r * 2.2, '#fff0b0', 0.5 * k, 6);
  s.with({ flag: 2 }, () => {
    const n = 12, rot = t * 0.25;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU, long = i % 2 === 0;
      const r0 = r + 2, r1 = r + (long ? r * 0.75 : r * 0.45) * (0.9 + 0.1 * Math.sin(t * 3 + i));
      const w = long ? 0.13 : 0.1;
      poly(s, [[x + Math.cos(a - w) * r0, y + Math.sin(a - w) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a + w) * r0, y + Math.sin(a + w) * r0]], long ? '#ffcf4a' : '#ffa83a');
    }
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx + 0.5, dy + 0.5) / r;
      if (d > 1) continue;
      const l = 1 - d * 0.8 - (dx + dy) / (r * 6);
      const q = Math.floor(l * 4 + bayer(x + dx, y + dy) * 0.9);
      pset(s, x + dx, y + dy, ['#ff9a2a', '#ffc23a', '#ffe36a', '#fff3b0', '#fffbe6'][clamp(q, 0, 4)]);
    }
  });
}
export function luna(s, t, x, y, r, o = {}) {
  glow(s, x, y, r * 3.2, '#b9c8ff', 0.35 * (o.k ?? 1), 6);
  s.with({ flag: 2 }, () => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx + 0.5, dy + 0.5);
      if (d > r) continue;
      if (Math.hypot(dx + 0.5 - r * 0.55, dy + 0.5 - r * 0.25) < r * 0.85) continue; // crescent bite
      const l = 1 - d / r * 0.6 + (noise2(dx / 2, dy / 2, 4) > 0.7 ? -0.25 : 0);
      pset(s, x + dx, y + dy, ['#9aa6d8', '#c8d0f4', '#eef0ff', '#ffffff'][clamp(Math.floor(l * 3.6 + bayer(dx, dy) * 0.6), 0, 3)]);
    }
  });
}
export function astraStar(s, t, x, y, r, o = {}) {
  const tw = 0.85 + 0.15 * Math.sin(t * 4);
  const c = o.c ?? '#cfe6ff';
  glow(s, x, y, r * 4, c, 0.5 * (o.k ?? 1), 7);
  s.with({ flag: 2 }, () => {
    const L = r * 2.4 * tw, Ls = r * 1.1 * tw;
    for (const [ax, ay, len] of [[1, 0, L], [-1, 0, L], [0, 1, L], [0, -1, L], [0.7, 0.7, Ls], [-0.7, 0.7, Ls], [0.7, -0.7, Ls], [-0.7, -0.7, Ls]]) {
      for (let i = 0; i < len; i++) {
        const a = 1 - i / len;
        const px = x + ax * i, py = y + ay * i;
        pdith(s, px, py, hex(i < r * 0.6 ? '#ffffff' : c), a + 0.15);
        if (i < len * 0.45 && len === L) { pdith(s, px + ay, py + ax, hex(c), a * 0.6); pdith(s, px - ay, py - ax, hex(c), a * 0.6); }
      }
    }
    disc(s, x, y, r * 0.55, '#ffffff');
  });
}

// ---------------- paper tag ----------------
export function tag(s, x, y, str, o = {}) {
  const w = textWidth(str) + 8, h = 11;
  const paper = hex(o.paper ?? '#f3ead2'), edge = hex('#b8a98a'), ink = hex(o.ink ?? '#c0392b');
  const x0 = Math.round(x - w / 2), y0 = Math.round(y);
  rect(s, x0, y0, w, h, paper);
  rect(s, x0, y0 + h - 1, w, 1, edge);
  rect(s, x0 + w - 1, y0, 1, h, edge);
  pset(s, x0 + 3, y0 + 2, edge);
  text(s, str, x0 + 6, y0 + 3, { color: ink });
  if (o.string) line(s, x0 + 3, y0 + 2, o.string[0], o.string[1], hex('#d8d0c0'));
}

// ---------------- firefly jar ----------------
export function jar(s, t, x, y, n = 12, o = {}) {
  const w = 18, h = 22;
  const glass = hex('#bfe0ff'), glass2 = hex('#7fa6d0'), lid = hex('#8a5a3a'), lid2 = hex('#b07a50');
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
  rect(s, x0 + 2, y0 - 3, w - 4, 3, lid); rect(s, x0 + 2, y0 - 3, w - 4, 1, lid2);
  const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
  for (let i = 0; i < n; i++) {
    const px = x + Math.sin(t * (1 + hash(i) ) + i * 2.1) * (w / 2 - 4);
    const py = y - 4 - ((Math.sin(t * (0.7 + hash(i + 9)) + i) + 1) / 2) * (h - 8);
    const on = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.3);
    s.with({ flag: 2 }, () => { pset(s, px, py, hex(cols[i % 4])); if (on > 0.6) pset(s, px, py - 1, mix(cols[i % 4], '#ffffff', 0.6)); });
  }
  if (n > 0) glow(s, x, y - h / 2, 22, '#fff2c0', Math.min(0.8, n * 0.04) * (o.k ?? 1), 5);
  // glass outline + shine
  for (let yy = 0; yy < h; yy++) { pset(s, x0, y0 + yy, glass2); pset(s, x0 + w - 1, y0 + yy, glass2); }
  rect(s, x0 + 1, y0 + h - 1, w - 2, 1, glass2);
  rect(s, x0 + 1, y0, w - 2, 1, glass2);
  for (let yy = 3; yy < h - 4; yy++) pdith(s, x0 + 2, y0 + yy, glass, 0.8);
  pset(s, x0 + 3, y0 + 2, glass);
}

// ---------------- Qwen's distiller backpack ----------------
// (x, y) = flask centre. o: fx, fy (funnel tip), level 0..1, counter (number), t, glow
export function distiller(s, t, x, y, o = {}) {
  const r = o.r ?? 8;
  const glass = hex('#d8ecff'), glassD = hex('#7fa6d0'), cu = hex('#d07a3a'), cuD = hex('#8a4a22'), hose = hex('#4a5a50'), hoseH = hex('#6f8576');
  const liq = hex(o.liquid ?? '#ff9a52'), liqH = hex('#ffd0a0');
  x = Math.round(x); y = Math.round(y);
  // hose (quadratic curve) from coil top to funnel
  const sx = x + 2, sy = y - r - 10;
  const fx = o.fx ?? x + 30, fy = o.fy ?? y - 30;
  const mx = (sx + fx) / 2, my = Math.min(sy, fy) - 10 + (o.sag ?? 0);
  let prev = null;
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const px = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * fx;
    const py = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * fy;
    if (prev) { line(s, prev[0], prev[1], px, py, hose); line(s, prev[0], prev[1] + 1, px, py + 1, hose); line(s, prev[0], prev[1] - 1, px, py - 1, hoseH); }
    // things travelling up the hose
    if (o.flow && hash2(i, Math.floor(t * 12), 5) < 0.12) s.with({ flag: 2 }, () => pset(s, px, py, hex('#ffcf8a')));
    prev = [px, py];
  }
  // funnel (cone opening up-right towards the target)
  const fa = o.fang ?? -0.9;
  for (let i = 0; i < 9; i++) {
    const half = 1 + i * 0.6;
    const cx2 = fx + Math.cos(fa) * i, cy2 = fy + Math.sin(fa) * i;
    for (let k = -half; k <= half; k++) pset(s, cx2 - Math.sin(fa) * k, cy2 + Math.cos(fa) * k, k < -half + 1 ? hex('#e6ecf5') : k > half - 1.2 ? hex('#5a6070') : hex('#a8b0c0'));
  }
  // copper coil
  for (let i = 0; i < 14; i++) {
    const py = y - r - 2 - i * 0.7;
    const px = x + 2 + Math.round(Math.sin(i * 1.4) * 3);
    pset(s, px, py, i % 2 ? cu : cuD); pset(s, px + 1, py, cu);
  }
  // flask
  rect(s, x - 2, y - r - 4, 5, 4, glassD);
  rect(s, x - 1, y - r - 6, 3, 2, hex('#a07a50'));
  const level = clamp(o.level ?? 0.5);
  s.with({ flag: 2 }, () => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx + 0.5, dy + 0.5);
      if (d > r) continue;
      const px = x + dx, py = y + dy;
      if (d > r - 1) { pset(s, px, py, glassD); continue; }
      const filled = (dy + r) / (2 * r) > 1 - level;
      if (filled) {
        let c = (dy + dx) % 5 === 0 && d < r - 2 ? liqH : liq;
        if (hash2(dx, dy + Math.floor(t * 10), 3) < 0.04) c = liqH;
        pset(s, px, py, c);
      } else if (dx === -r + 2 && dy < 0) pset(s, px, py, glass);
    }
  });
  if (level > 0) glow(s, x, y + 2, 18, o.liquid ?? '#ff9a52', 0.45 * level, 5);
  // bubbles
  for (let i = 0; i < 4 && level > 0.1; i++) {
    const u = (t * 0.9 + i * 0.27) % 1;
    const by = y + r - 2 - u * (2 * r * level - 2);
    s.with({ flag: 2 }, () => pset(s, x - 3 + i * 2, by, liqH));
  }
  // counter display
  if (o.counter !== undefined) {
    const str = String(Math.floor(o.counter)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const w = textWidth(str) + 4;
    rect(s, x - w / 2, y + r + 2, w, 9, hex('#0c0f0c'));
    s.with({ flag: 2 }, () => text(s, str, x - w / 2 + 2, y + r + 4, { color: '#7dff9a' }));
  }
  return { fx, fy };
}

// ---------------- leaf umbrella ----------------
export function leafUmbrella(s, x, y, o = {}) {
  const w = o.w ?? 56, h = o.h ?? 16, tilt = o.tilt ?? 0;
  const cols = ['#1d4a2c', '#2f7a3d', '#46a04e', '#7ccf6a', '#b4ea94'].map(hex);
  // stem
  line(s, x, y, x + Math.round(tilt * 4), y - (o.stem ?? 22), hex('#3a6a2a'));
  const cx = x + Math.round(tilt * 4), cy = y - (o.stem ?? 22);
  for (let dy = -h; dy <= 2; dy++) for (let dx = -w / 2; dx <= w / 2; dx++) {
    const u = dx / (w / 2), v = (dy + h) / h;
    const edge = Math.sqrt(Math.max(0, 1 - u * u)) * (1 - Math.abs(u) * 0.15) * h * 0.95;
    if (-dy > edge || dy > 2 - Math.abs(u) * 3) continue;
    const yy = Math.round(cy + dy + u * tilt * 6);
    const xx = Math.round(cx + dx);
    let l = 0.65 - u * 0.25 - (dy + h) / h * 0.35;
    if (Math.abs(dx) < 1) l -= 0.3; // central vein
    if (Math.abs((dx - (dy + h) * 0.9) % 9) < 1 && dy < 0) l -= 0.15;
    if (-dy > edge - 1) l = 0.05;
    pset(s, xx, yy, cols[clamp(Math.floor(l * 4.5 + bayer(xx, yy) * 0.7), 0, 4)]);
  }
}

// ---------------- polaroid photo ----------------
export function polaroid(s, x, y, o = {}, content = null) {
  const w = o.w ?? 46, h = o.h ?? 54, iw = w - 6, ih = w - 8;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  rect(s, x0 + 2, y0 + 2, w, h, hex('#00000066') & 0x66000000 ? hex('#1a1424') : hex('#1a1424'));
  rect(s, x0, y0, w, h, hex('#fbf8f0'));
  rect(s, x0, y0 + h - 1, w, 1, hex('#c9c2b0'));
  rect(s, x0 + 3, y0 + 3, iw, ih, hex('#141a33'));
  if (content) content(x0 + 3, y0 + 3, iw, ih);
  if (o.caption) text(s, o.caption, x0 + w / 2, y0 + ih + 7, { align: 'center', color: '#2a2440' });
}

// ---------------- firewall: brick wall crowned with flames ----------------
export function firewall(s, t, x, y, w, h, o = {}) {
  const rise = clamp(o.rise ?? 1);
  const wh = Math.round(h * rise);
  const brick = ['#5a1a14', '#8a2a1e', '#b0402a', '#d8643a'].map(hex), mortar = hex('#2a0c0a');
  for (let yy = 0; yy < wh; yy++) for (let xx = 0; xx < w; xx++) {
    const row = Math.floor(yy / 5), off = row % 2 ? 4 : 0;
    const inB = (yy % 5) !== 4 && ((xx + off) % 9) !== 8;
    let c = mortar;
    if (inB) {
      const bx = Math.floor((xx + off) / 9);
      const lv = (yy % 5 === 0 ? 2 : 1) + (hash2(bx, row, 5) < 0.3 ? -1 : 0) + ((xx + off) % 9 === 0 ? 1 : 0);
      c = brick[clamp(lv, 0, 3)];
    }
    s.with({ flag: 2 }, () => pset(s, x + xx, y - yy, c));
  }
  if (o.label) s.with({ flag: 2 }, () => text(s, o.label, x + w / 2, y - wh + 4, { align: 'center', color: '#ffd9a0', font: o.font }));
  // flames
  const fcol = ['#5a0c0a', '#a8201a', '#e8441e', '#ff8a2a', '#ffcc4a', '#fff4c0'].map(hex);
  s.with({ flag: 2 }, () => {
    for (let xx = -2; xx < w + 2; xx++) {
      const n = noise2((x + xx) * 0.18, t * 4.5, 3) * 0.7 + noise2((x + xx) * 0.5, t * 9, 7) * 0.3;
      const fh = (o.flame ?? 22) * rise * (0.35 + n);
      for (let k = 0; k < fh; k++) {
        const u = k / fh;
        const lv = clamp(Math.floor((1 - u) * 5.5 + bayer(x + xx, y - wh - k) * 1.2 - 0.6), 0, 5);
        if (u > 0.85 && bayer(x + xx, y - wh - k) < (u - 0.85) * 6) continue;
        pset(s, x + xx, y - wh - k, fcol[lv]);
      }
    }
    // embers
    for (let i = 0; i < 18; i++) {
      const u = (t * 0.7 + hash(i)) % 1;
      const ex = x + hash(i + 50) * w + Math.sin(t * 3 + i) * 3, ey = y - wh - u * (o.flame ?? 22) * 2.2;
      if (u < 0.9) pset(s, ex, ey, fcol[4 - Math.floor(u * 3)]);
    }
  });
  glow(s, x + w / 2, y - wh, w * 1.1, '#ff6a2a', 0.7 * rise, 6);
}

// ---------------- rain ----------------
export function rain(s, t, o = {}) {
  const mask = o.mask;
  const n = o.n ?? 220, sp = o.speed ?? 260, slant = o.slant ?? 0.3, len = o.len ?? 4;
  const c = hex(o.c ?? '#a9c2ff'), a = o.alpha ?? 0.7;
  const H = s.h + 40;
  for (let i = 0; i < n; i++) {
    const v = sp * (0.8 + hash(i * 3) * 0.4);
    const y = ((hash(i * 7 + 1) * H + t * v) % H) - 20;
    const x = ((hash(i * 11 + 2) * (s.w + 80) - y * slant) % (s.w + 80) + s.w + 80) % (s.w + 80) - 40;
    for (let k = 0; k < len; k++) {
      const px = Math.round(x + k * slant), py = Math.round(y + k);
      if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
      if (mask && mask(px + s.tx, py + s.ty)) continue;
      if (bayer(px, py) < a) { s.d[py * s.w + px] = mix(s.d[py * s.w + px], c, 0.75); }
    }
  }
}
export function splashes(s, t, gy, o = {}) {
  const n = o.n ?? 26, rate = o.rate ?? 3;
  const c = hex(o.c ?? '#c7d8ff');
  for (let i = 0; i < n; i++) {
    const cyc = Math.floor(t * rate + hash(i));
    const ph = (t * rate + hash(i)) % 1;
    const wx = s.tx + hash2(i, cyc, 5) * s.w;
    const y = (typeof gy === 'function' ? gy(wx) : gy) - 1;
    if (ph < 0.15) { pset(s, wx, y, c); }
    else if (ph < 0.3) { pset(s, wx - 1, y - 1, c); pset(s, wx + 1, y - 1, c); }
    else if (ph < 0.42) { pset(s, wx - 2, y - 1, c); pset(s, wx + 2, y - 1, c); pset(s, wx - 2, y, c); pset(s, wx + 2, y, c); }
  }
}
// puddle surface with reflection of what's above (call in ctx.after so it reflects lit pixels)
export function puddleReflect(s, t, x, y, rx, ry, o = {}) {
  const x0 = Math.round(x - rx) - s.tx, x1 = Math.round(x + rx) - s.tx, y0 = Math.round(y) - s.ty;
  const tint = hex(o.tint ?? '#5a78b8');
  for (let dy = 0; dy < ry; dy++) {
    const half = rx * Math.sqrt(1 - (dy / ry) ** 2);
    for (let sx = Math.round(x - half) - s.tx; sx < Math.round(x + half) - s.tx; sx++) {
      const sy = y0 + dy;
      if (sx < 0 || sy < 0 || sx >= s.w || sy >= s.h) continue;
      const ripple = Math.round(Math.sin((sy + t * 6) * 1.3 + sx * 0.05) * (o.ripple ?? 1));
      const ry2 = y0 - dy * (o.stretch ?? 2) - 1;
      const rxp = clamp(sx + ripple, 0, s.w - 1);
      let c = ry2 >= 0 && ry2 < s.h ? s.d[ry2 * s.w + rxp] : tint;
      c = mix(c, tint, 0.35 + dy / ry * 0.25);
      if (dy === 0) c = mix(c, '#c8d8ff', 0.3);
      s.d[sy * s.w + sx] = c;
    }
  }
  // ripples rings
  for (const [rt, rxp] of o.rings ?? []) {
    const u = (t - rt) / 1.2;
    if (u < 0 || u > 1) continue;
    const rr = 2 + u * rx * 0.7;
    for (let a = 0; a < TAU; a += 0.15) {
      const px = rxp + Math.cos(a) * rr, py = y + ry * 0.45 + Math.sin(a) * rr * 0.3;
      if (Math.abs(px - x) / rx + Math.abs(py - y - ry * 0.4) / ry < 1.05) pdith(s, px, py, hex('#dfe8ff'), 1 - u);
    }
  }
}

// ---------------- confetti / dust / fireflies / embers ----------------
export function confetti(s, t, t0, x, y, o = {}) {
  const u = t - t0;
  if (u < 0 || u > (o.life ?? 3)) return;
  const n = o.n ?? 60;
  const cols = (o.colors ?? ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#ff9ad5', '#ffffff', '#ff9a4a']).map(hex);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hash(i * 3 + (o.seed ?? 0)) - 0.5) * (o.spread ?? 2.2);
    const v = (o.v ?? 120) * (0.5 + hash(i * 5 + 1) * 0.7);
    let px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 0.5 * 160 * u * u;
    const drag = Math.min(u, 0.9);
    px += Math.sin(t * 6 + i) * 4 * drag;
    if (py > y + 80) continue;
    const c = cols[i % cols.length];
    const flip = Math.floor(t * 12 + i) % 2;
    s.with({ flag: 2 }, () => { pset(s, px, py, c); if (flip) pset(s, px + 1, py, c); else pset(s, px, py + 1, c); });
  }
}
export function dust(s, t, t0, x, y, o = {}) {
  const u = (t - t0) / (o.life ?? 0.6);
  if (u < 0 || u > 1) return;
  const c = hex(o.c ?? '#d8cfc0');
  const n = o.n ?? 5;
  for (let i = 0; i < n; i++) {
    const dir = (o.dir ?? 0) !== 0 ? o.dir : (i % 2 ? 1 : -1);
    const px = x + dir * (4 + i * 3) * u * (o.spread ?? 1) + (i - n / 2) * 2;
    const py = y - 2 - u * 5 * hash(i + 3);
    disc(s, px, py, (1.5 + hash(i) * 2) * (0.6 + u), c, (1 - u) * 0.8);
  }
}
export function fireflies(s, t, x0, y0, w, h, n = 14, o = {}) {
  const c = hex(o.c ?? '#d8ff7a');
  for (let i = 0; i < n; i++) {
    const px = x0 + (noise1(t * 0.25 + i * 10, 3) * 1.4 - 0.2) * w;
    const py = y0 + (noise1(t * 0.2 + i * 7 + 100, 4) * 1.4 - 0.2) * h;
    const on = Math.sin(t * (1.5 + hash(i) * 2) + i * 2) * 0.5 + 0.5;
    if (on < 0.25) continue;
    s.with({ flag: 2 }, () => pset(s, px, py, mix('#6a8a3a', c, on)));
    glow(s, px, py, 5, o.c ?? '#d8ff7a', 0.35 * on, 3);
  }
}
export function embers(s, t, x, y, n, o = {}) {
  const cols = (o.colors ?? ['#ea4335', '#fbbc04', '#34a853', '#4285f4']).map(hex);
  for (let i = 0; i < n; i++) {
    const u = ((t * (o.speed ?? 0.4) + hash(i * 7)) % 1);
    const px = x + (hash(i) - 0.5) * (o.w ?? 30) + Math.sin(t * 2 + i) * 3;
    const py = y - u * (o.h ?? 40);
    const a = Math.sin(u * Math.PI);
    s.with({ flag: 2 }, () => pdith(s, px, py, cols[i % cols.length], a + 0.2));
  }
}

// ---------------- UI: speech bubbles & captions (draw on the 480x270 UI surface) ----------------
const INK = '#1b1730', PAPER = '#fffdf6';
// (x, y) = tail tip. o: lines|text, t (age, for pop), chars, style ('speech'|'thought'|'shout'), dir (-1 box left of tail, 1 right, 0 centred), icon(fn(s, x, y)) with iconW/iconH
export function bubble(ui, x, y, o = {}) {
  const lines = o.lines ?? (o.text ? wrap(o.text, o.maxW ?? 120) : []);
  const tw = Math.max(o.iconW ?? 0, ...lines.map((l) => textWidth(l)));
  const th = lines.length * 8 + (o.icon ? (o.iconH ?? 0) + (lines.length ? 3 : 0) : 0) - (lines.length ? 2 : 0);
  const pad = 4;
  let bw = tw + pad * 2, bh = th + pad * 2;
  const age = o.t ?? 1;
  const pop = age < 0.08 ? 0.35 : age < 0.16 ? 1.12 : 1;
  if (age < 0) return;
  bw = Math.max(8, Math.round(bw * pop)); bh = Math.max(6, Math.round(bh * pop));
  const dir = o.dir ?? 0;
  const jitter = o.style === 'shout' ? Math.round(Math.sin(age * 60) * 1) : 0;
  let bx = Math.round(dir === 0 ? x - bw / 2 : dir < 0 ? x - bw + 6 : x - 6) + jitter;
  const by = Math.round(y - 5 - bh);
  bx = clamp(bx, 2, ui.w - bw - 2);
  const ink = hex(INK), paper = hex(o.paper ?? PAPER);
  ui.flag = 0;
  // body with 1px rounded corners + outline
  rect(ui, bx + 1, by, bw - 2, bh, paper);
  rect(ui, bx, by + 1, bw, bh - 2, paper);
  rect(ui, bx + 2, by - 1, bw - 4, 1, ink); rect(ui, bx + 2, by + bh, bw - 4, 1, ink);
  rect(ui, bx - 1, by + 2, 1, bh - 4, ink); rect(ui, bx + bw, by + 2, 1, bh - 4, ink);
  pset(ui, bx, by, ink); pset(ui, bx + bw - 1, by, ink); pset(ui, bx, by + bh - 1, ink); pset(ui, bx + bw - 1, by + bh - 1, ink);
  pset(ui, bx + 1, by, ink) ; pset(ui, bx + bw - 2, by, ink);
  rect(ui, bx + 1, by, bw - 2, 1, paper);
  pset(ui, bx + 1, by - 1 + 1, paper);
  // drop shadow
  rect(ui, bx + 1, by + bh + 1, bw - 2, 1, hex('#0e0b1a'));
  if (o.style === 'thought') {
    disc(ui, x + 0.5, y - 1.5, 1.5, paper); ring(ui, x + 0.5, y - 1.5, 1.6, ink, 1);
    disc(ui, x + 2.5 - dir, y - 5, 2, paper);
  } else {
    // tail
    const tx = clamp(x, bx + 3, bx + bw - 4);
    for (let i = 0; i < 5; i++) {
      const xx = Math.round(tx + (x - tx) * (i / 5));
      rect(ui, xx - Math.max(0, 2 - Math.floor(i / 2)), by + bh + i, Math.max(1, 5 - i), 1, paper);
      pset(ui, xx - Math.max(0, 2 - Math.floor(i / 2)) - 1, by + bh + i, ink);
      pset(ui, xx - Math.max(0, 2 - Math.floor(i / 2)) + Math.max(1, 5 - i), by + bh + i, ink);
    }
    pset(ui, Math.round(x), by + bh + 5, ink);
  }
  if (pop !== 1) return;
  let cy = by + pad;
  if (o.icon) { o.icon(ui, bx + Math.round(bw / 2), cy, age); cy += (o.iconH ?? 0) + 3; }
  textBlock(ui, lines, bx + pad + (dir === 0 && o.center !== false ? Math.round((tw - Math.max(...lines.map((l) => textWidth(l)), 0)) / 2) : 0), cy, { color: o.ink ?? INK, chars: o.chars });
}

// storybook caption at the bottom: visible within [t0, t1]
export function caption(ui, str, t, t0, t1, o = {}) {
  const a = clamp((t - t0) / 0.5) * clamp((t1 - t) / 0.5);
  if (a <= 0) return;
  const lines = Array.isArray(str) ? str : [str];
  const y = o.y ?? 236;
  lines.forEach((ln, i) => text(ui, ln, o.x ?? 240, y + i * 11, { align: 'center', color: o.color ?? '#f6ecff', outline: o.outline ?? '#120d22', alpha: a, font: o.font, scale: o.scale }));
}

// product label that fades in near a sky object
export function skyLabel(ui, x, y, str, c, a, o = {}) {
  if (a <= 0) return;
  const w = textWidth(str);
  text(ui, str, x, y, { align: 'center', color: c, outline: '#0b0820', alpha: a, font: o.font });
  if (o.line !== false) rect(ui, Math.round(x - w / 2), y + 7, Math.round(w * clamp(a * 1.3)), 1, hex(c), a);
}
