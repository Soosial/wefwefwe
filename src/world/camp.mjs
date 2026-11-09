// Clawd's camp: pines, tent, campfire, log. Used by the spy and ambush scenes.
import { hex, mix, rect, pset, poly, glow, bayer, line, disc } from '../core/fb.mjs';
import { hash, hash2, noise2, clamp } from '../core/math.mjs';
import { skyGradient, stars, milkyWay, moon, SKIES } from './sky.mjs';
import { ground, hills, bush } from './land.mjs';

export const campY = (x) => 204 + 3 * Math.sin(x / 47) + 1.5 * Math.sin(x / 17);
export const cgy = (x) => Math.round(campY(x));

function pine(s, x, y, h, c, rim) {
  const C = hex(c), R = rim ? hex(rim) : null;
  rect(s, x - 1, y - 6, 3, 6, mix(C, '#000000', 0.2));
  const tiers = 4;
  for (let k = 0; k < tiers; k++) {
    const ty = y - 4 - k * (h / tiers) * 0.8, th = (h / tiers) * 1.3, tw = (h * 0.42) * (1 - k / (tiers + 1));
    poly(s, [[x - tw, ty], [x + tw, ty], [x, ty - th]], C);
    if (R) line(s, x, ty - th, x - tw, ty, R);
  }
}

// layered pine forest silhouettes with parallax
export function forest(s, o) {
  const p = o.parallax, base = o.base, c = o.color, n = o.n ?? 40, rim = o.rim;
  s.with({ parallax: p, parallaxY: o.py ?? p * 0.5, flag: 0 }, () => {
    for (let i = 0; i < n; i++) {
      const x = -200 + i * (o.step ?? 26) + hash2(i, o.seed, 1) * 14;
      const h = (o.h ?? 50) * (0.7 + hash2(i, o.seed, 2) * 0.6);
      pine(s, x, base + hash2(i, o.seed, 3) * 6, h, c, rim);
    }
    rect(s, -400, base + 4, 2400, 400, c);
  });
}

export function tent(s, x, y, w = 56, h = 40, open = 0.6) {
  const cols = ['#7a3420', '#b35a3c', '#d97757', '#f0a07c'].map(hex);
  const apex = [x, y - h], L = [x - w / 2, y], R = [x + w / 2, y];
  poly(s, [apex, L, R], cols[1]);
  poly(s, [apex, [x - w * 0.16, y], R], cols[2]);
  for (let i = 0; i < 6; i++) line(s, x, y - h, x + w / 2 - i * 2, y, cols[3], 0.5);
  // dark opening flap
  poly(s, [[x, y - h * 0.62], [x - w * 0.12 * open, y], [x + w * 0.12, y]], hex('#2a120c'));
  line(s, x, y - h, x - w / 2, y, cols[0]);
  line(s, x, y - h, x + w / 2, y, cols[0]);
  rect(s, x - w / 2 - 2, y, w + 4, 1, cols[0]);
  // little pennant
  line(s, x, y - h, x, y - h - 8, hex('#5a3d26'));
  poly(s, [[x + 1, y - h - 8], [x + 7, y - h - 6], [x + 1, y - h - 4]], hex('#ffcf6b'));
}

export function campfire(s, t, x, y, k = 1) {
  const logC = ['#3a2416', '#5a3a22', '#7a5232'].map(hex);
  for (const [dx, dy, w] of [[-7, -1, 14], [-6, -3, 12]]) { rect(s, x + dx, y + dy, w, 2, logC[1]); rect(s, x + dx, y + dy, w, 1, logC[2]); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; disc(s, x + Math.cos(a) * 9, y + 1 + Math.sin(a) * 2, 1.6, '#6e6a82'); }
  if (k <= 0.02) return [x, y - 4];
  const fcol = ['#a8201a', '#e8441e', '#ff8a2a', '#ffcc4a', '#fff4c0'].map(hex);
  s.with({ flag: 2 }, () => {
    for (let dx = -6; dx <= 6; dx++) {
      const n = noise2((x + dx) * 0.35, t * 5, 4) * 0.7 + noise2((x + dx) * 0.9, t * 11, 8) * 0.3;
      const fh = (16 - Math.abs(dx) * 1.9) * (0.5 + n) * k;
      for (let j = 0; j < fh; j++) {
        const u = j / fh;
        const lv = clamp(Math.floor((1 - u) * 4.6 + bayer(x + dx, y - j) * 1.1 - 0.5 - Math.abs(dx) * 0.15), 0, 4);
        if (u > 0.8 && bayer(x + dx, y - j) < (u - 0.8) * 5) continue;
        pset(s, x + dx, y - 3 - j, fcol[lv]);
      }
    }
    for (let i = 0; i < 8; i++) {
      const u = (t * 0.6 + hash(i)) % 1;
      pset(s, x + (hash(i + 3) - 0.5) * 10 + Math.sin(t * 3 + i) * 3, y - 6 - u * 30, fcol[3 - Math.floor(u * 3)]);
    }
  });
  glow(s, x, y - 8, 30, '#ff9a4a', 0.5 * k, 6);
  return [x, y - 8];
}

export function campSet(f, s, t, o = {}) {
  skyGradient(s, SKIES[o.sky || 'night'], 22, s.ty * 0.08);
  if (o.milky !== 0) milkyWay(s, { k: o.milky ?? 0.8, x: 40, maxY: 200 });
  if (o.starCount !== 0) stars(s, t, { count: o.starCount ?? 300, seed: 7, parallax: 0.04, bright: o.starBright ?? 1 });
  if (o.moon !== false) moon(s, Math.round(380 - s.tx * 0.04), Math.round(40 - s.ty * 0.04), 12);
  if (o.beforeFar) o.beforeFar(s);
  hills(s, { parallax: 0.2, base: 150, amp: 26, seed: 11, color: o.far ?? '#1c2152', rim: '#2b3270', py: 0.2, freq: 0.012 });
  forest(s, { parallax: 0.45, base: 176, color: o.forest1 ?? '#171b44', rim: '#262c62', seed: 3, h: 46, step: 22 });
  forest(s, { parallax: 0.75, base: 196, color: o.forest2 ?? '#11142f', rim: '#1f2450', seed: 5, h: 60, step: 30 });
  if (o.beforeGround) o.beforeGround(s);
  ground(s, t, campY, { wind: 0.6, flowers: 0.03 });
  if (o.tent !== false) tent(s, 712, cgy(712) + 1, 60, 44, 0.6);
  // log seat
  const lx = 592;
  rect(s, lx - 14, cgy(lx) - 5, 28, 5, '#5a3a22'); rect(s, lx - 14, cgy(lx) - 5, 28, 1, '#8a6040'); rect(s, lx + 12, cgy(lx) - 5, 2, 5, '#c8a070');
}
export { bush };
