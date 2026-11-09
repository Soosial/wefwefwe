// The 2D top of the Summit: sky by time of day (field palettes), far islands and the cloud sea below,
// a snowy plateau that ends in cliffs on both sides, the star crystal on its pedestal and planted pennants.
import { hex, mix, rect, pset, glow, disc, line, poly } from '../core/fb.mjs';
import { clamp, hash } from '../core/math.mjs';
import { skyGradient, stars, milkyWay, cloudSea, farIslands } from './sky.mjs';
import { ground } from './land.mjs';
import { TOD } from './field.mjs';

export const CRYSTAL_X = 480;
const edge = (x) => (x < 300 ? ((300 - x) / 9) ** 2 : 0) + (x > 668 ? ((x - 668) / 9) ** 2 : 0);
export const summitY = (x) => 208 + 1.6 * Math.sin(x / 29) + 1 * Math.sin(x / 11.3) + edge(x);
export const sy = (x) => Math.round(summitY(x));
const SNOW = { hi: '#ffffff', top: '#f2f5ff', base: '#dde3f4', shade: '#bcc3dc', dark: '#8a88a8', dirt: '#8d86a4', dirt2: '#77708e', dirt3: '#5d5878', stone: '#a49cb8' };
const G4 = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];

// big four-point star crystal on a stone pedestal; k = glow strength
export function crystal2D(f, s, t, x, y, k = 1) {
  rect(s, x - 12, y - 13, 25, 13, '#77708e'); rect(s, x - 12, y - 13, 25, 2, '#d6d2e4'); rect(s, x + 7, y - 11, 5, 11, '#5d5878');
  rect(s, x - 15, y - 2, 31, 2, '#5d5878');
  const cy = y - 48 + Math.round(Math.sin(t * 1.6) * 1.2);
  glow(s, x + s.tx, cy + s.ty, 90, '#ffe6a0', 0.45 * k, 7);
  s.with({ flag: 2 }, () => {
    const R = 24;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const inStar = ax * 0.28 + ay <= R * (1 - ax / (R * 0.27)) || ay * 0.28 + ax <= R * 0.72 * (1 - ay / (R * 0.27));
      if (!inStar) continue;
      const q = (ax + ay) / R;
      pset(s, x + dx, cy + dy, q < 0.18 ? '#ffffff' : q < 0.42 ? '#fff2b0' : dx < 0 ? '#ffe07a' : '#ffc94a');
    }
  });
  f.light(x, cy, 120, '#ffe2a0', 0.75 * k);
  return [x, cy];
}

// pennant on a pole: cols = colour or list (Gemini bands); rise 0..1 = planting animation
export function pennant2D(s, t, x, y, cols, rise = 1, seed = 0) {
  if (rise <= 0) return;
  const h = Math.round(34 * clamp(rise)), cs = Array.isArray(cols) ? cols : [cols];
  rect(s, x, y - h, 2, h, '#6a4a30'); rect(s, x, y - h, 1, h, '#8a6a48'); pset(s, x, y - h - 1, '#ffd25a'); pset(s, x + 1, y - h - 1, '#ffd25a');
  if (rise < 0.6) return;
  for (let j = 0; j < 11; j++) {
    const w = Math.round(15 * (1 - Math.abs(j - 5) / 5.6));
    for (let i = 0; i < w; i++) {
      const wave = Math.round(Math.sin(t * 6 + i * 0.5 + seed) * (i / 15) * 1.6);
      pset(s, x + 2 + i, y - h + 1 + j + wave, cs[Math.min(cs.length - 1, Math.floor((i / 15) * cs.length))]);
    }
  }
}

export function summitSet(f, s, t, o = {}) {
  const P = o.pal || TOD[o.tod || 'sunset'];
  skyGradient(s, o.sky ?? P.sky, 22, s.ty * 0.05 - 24);
  if (P.stars || o.stars) { milkyWay(s, { k: 0.7 * (o.stars ?? P.stars), maxY: 200 }); stars(s, t, { count: 320, seed: 7, parallax: 0.04, bright: o.stars ?? P.stars }); }
  if (o.sun) { glow(s, o.sun[0] + s.tx * 0.96, o.sun[1] + s.ty * 0.96, 140, o.sunGlow ?? '#ffc890', 0.5, 7); glow(s, o.sun[0] + s.tx * 0.96, o.sun[1] + s.ty * 0.96, 20, '#fff8e0', 0.95, 5); }
  if (o.beforeFar) o.beforeFar(s);
  // we are above everything: the cloud sea sits at eye level and the islands float just above it
  cloudSea(s, t, { y: 176 - s.ty * 0.2, parallax: 0.15, speed: 2, seed: 9, h: 90, colors: P.cloud, fill: P.cloud[0] });
  farIslands(s, t, { parallax: 0.1, items: [[40, 168, 14], [250, 174, 9], [430, 164, 16], [650, 172, 11], [780, 166, 15], [-160, 170, 12]], top: P.isl[0], body: P.isl[1], dark: P.isl[2], fall: P.isl[3] });
  if (o.beforeGround) o.beforeGround(s);
  ground(s, t, summitY, { wind: 0.4, flowers: 0, pal: SNOW });
  // rocks along the plateau rims
  for (const [rx, w] of [[318, 10], [336, 6], [640, 8], [655, 12]]) {
    const ry = sy(rx);
    rect(s, rx - w / 2, ry - 4, w, 5, '#77708e'); rect(s, rx - w / 2, ry - 5, w - 1, 2, '#f2f5ff'); rect(s, rx + w / 2 - 2, ry - 3, 2, 4, '#5d5878');
  }
  for (const p of o.pennants || []) pennant2D(s, t, p.x, sy(p.x) + 1, p.cols, p.rise ?? 1, p.x);
  const c = o.crystal !== false ? crystal2D(f, s, t, CRYSTAL_X, sy(CRYSTAL_X) + 1, o.crystalK ?? 1) : null;
  f.ambient = o.amb ?? P.amb;
  return c;
}
export { G4 };
