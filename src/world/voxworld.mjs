// Voxel world builders: floating islands (grass/dirt/rock strata, trees, houses, lamps, pads, scoreboard, bunting,
// pond, waterfall, vines, crystals), the Summit spire, cloud puffs, vehicles (balloon, rocket, star-glider, paper plane,
// crescent), the "COMING SOON" crate, voxel text and sprite->voxel character models.
import { VoxModel, SOLID, EMIT, LEAF, WATER, CLOUD, GLOW } from '../core/vox.mjs';
import { Surface, hex, mix } from '../core/fb.mjs';
import { clamp, fbm, hash2, noise2 } from '../core/math.mjs';
import { fonts } from '../core/font.mjs';
import { cached } from '../core/sprite.mjs';

export const PAL = {
  grass: ['#3d8a48', '#4b9e4c', '#5db357', '#78c865'], grassEdge: '#2f7340',
  dirt: ['#8a6040', '#74502f', '#5f4128'],
  rock: ['#a49cb8', '#8d86a4', '#77708e', '#625c7a', '#4d4864', '#3a3650'],
  flower: ['#ff8fb0', '#ffe066', '#ffffff', '#9fd0ff', '#ffb36b', '#d08cff'],
  leaf: ['#25643a', '#337d42', '#46994c', '#62b458', '#86cc6c'],
  blossom: ['#c85a84', '#e57ea6', '#f7a3c3', '#ffc8dc'],
  autumn: ['#a8481e', '#d0622a', '#e8a33a', '#f2c84b'],
  pine: ['#1d5233', '#28683e', '#357e4a', '#46944f'],
  trunk: ['#4e3522', '#644530', '#7d5a3c'],
  wall: ['#f3e6cc', '#e8d6b6'], timber: '#7a5232', door: '#4e3220', stone: ['#9c9aac', '#82808f'],
  roofs: [['#b8382a', '#d8574a'], ['#2f68c8', '#4f86e2'], ['#d89430', '#f0b452'], ['#7348c4', '#9168de'], ['#2a8e62', '#46ae80']],
};
const pick = (arr, h) => arr[clamp(Math.floor(h * arr.length), 0, arr.length - 1)];

// ---------------- voxel text (XY plane, facing -z) ----------------
export function voxText(M, str, x, y, z, c, o = {}) {
  const f = fonts[o.font || 'tiny'], sc = o.scale ?? 1, depth = o.depth ?? 1;
  let w = 0;
  for (const ch of str) w += (f.glyphs[ch] || f.glyphs['?']).a * sc;
  let cx = o.align === 'center' ? Math.round(x - w / 2) : x;
  for (const ch of str) {
    const g = f.glyphs[ch] || f.glyphs[ch.toUpperCase()] || f.glyphs['?'];
    for (let r = 0; r < g.h; r++) for (let q = 0; q < g.w; q++) {
      if (!g.bits[r][q]) continue;
      for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) for (let dz = 0; dz < depth; dz++)
        M.set(cx + (g.x + q) * sc + a, y - ((g.y - f.capTop) + r) * sc - b, z + dz, c, o.m ?? SOLID);
    }
    cx += g.a * sc;
  }
  return w;
}

// ---------------- island & decorations ----------------
function gY(M, x, z) {
  x = Math.floor(x); z = Math.floor(z);
  if (x < 0 || z < 0 || x >= M.w || z >= M.d) return -1;
  return M.top[z * M.w + x];
}

export function addTree(M, x, z, o = {}) {
  x = Math.floor(x); z = Math.floor(z);
  const g0 = gY(M, x, z);
  if (g0 < 0) return;
  const kind = o.kind ?? 'oak', th = o.h ?? 12, r = o.r ?? 7, seed = o.seed ?? (x * 31 + z * 7);
  const T = PAL.trunk;
  if (kind === 'pine') {
    for (let y = 1; y <= th + r * 2; y++) M.set(x, g0 + y, z, T[1]);
    for (let k = 0; k < 4; k++) {
      const rk = r * (1 - k * 0.22), yb = g0 + th * 0.45 + k * r * 0.62;
      for (let dy = 0; dy < r * 0.9; dy++) {
        const rr = rk * (1 - dy / (r * 0.95));
        for (let dz = -Math.ceil(rr); dz <= rr; dz++) for (let dx = -Math.ceil(rr); dx <= rr; dx++) {
          if (dx * dx + dz * dz > rr * rr) continue;
          const hh = hash2(x + dx, z + dz, Math.floor(yb + dy) + seed);
          if (dx * dx + dz * dz > (rr - 1) * (rr - 1) && hh < 0.25) continue;
          M.set(x + dx, yb + dy, z + dz, PAL.pine[clamp(Math.floor(dy / (r * 0.9) * 2 + hh * 1.6 + (dx < 0 ? 0.6 : 0)), 0, 3)], LEAF);
        }
      }
    }
    return;
  }
  for (let y = 1; y <= th; y++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) M.set(x + ox, g0 + y, z + oz, T[(ox + oz + (y >> 2)) % 3]);
  // roots
  for (const [ox, oz] of [[-1, 0], [2, 1], [0, 2], [1, -1]]) M.set(x + ox, g0 + 1, z + oz, T[0]);
  // two branches
  M.line(x, g0 + th * 0.65, z, x - r * 0.6, g0 + th + 1, z, T[1]);
  M.line(x + 1, g0 + th * 0.7, z + 1, x + 1 + r * 0.6, g0 + th + 2, z + 1, T[1]);
  const pal = kind === 'blossom' ? PAL.blossom : kind === 'autumn' ? PAL.autumn : PAL.leaf;
  const cy = g0 + th + r * 0.45, cx = x + 1, cz = z + 1;
  const blobs = [[0, 0, 0, 1], [-r * 0.55, -r * 0.25, r * 0.2, 0.7], [r * 0.55, -r * 0.2, -r * 0.2, 0.7], [0, r * 0.35, 0, 0.72], [r * 0.1, -r * 0.2, r * 0.55, 0.65], [-r * 0.2, -r * 0.1, -r * 0.6, 0.65]];
  for (const [bx, by, bz, k] of blobs) {
    const rr = r * k;
    M.ellipsoid(cx + bx, cy + by, cz + bz, rr, rr * 0.85, rr, (vx, vy, vz, u) => {
      const hh = hash2(vx * 3 + vz, vy, seed);
      if (u > 0.72 && hh < 0.28) return null;
      const lv = 0.45 + (vy - cy) / (2.6 * r) + (cx - vx) * 0.03 + (hh - 0.5) * 0.45 + (fbm(vx * 0.3, vz * 0.3 + vy * 0.2, 2, seed) - 0.5) * 0.5;
      if (kind === 'blossom' && hh > 0.985) return '#ffffff';
      if (kind === 'oak' && hh > 0.993) return '#e8443a'; // apples
      return pick(pal, lv);
    }, LEAF);
  }
}

export function addHouse(M, x0, z0, o = {}) {
  x0 = Math.floor(x0); z0 = Math.floor(z0);
  const w = o.w ?? 15, d = o.d ?? 12, hgt = o.h ?? 12, roof = PAL.roofs[(o.roof ?? 0) % PAL.roofs.length], night = !!o.night;
  let fy = -1;
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) fy = Math.max(fy, gY(M, x, z));
  if (fy < 0) return;
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) { const gg = gY(M, x, z); if (gg < 0) continue; for (let y = Math.max(gg + 1, fy - 8); y <= fy; y++) M.set(x, y, z, PAL.stone[(x + z) % 2]); }
  const glass = night ? '#ffd27a' : '#9cc8ec', gm = night ? EMIT : SOLID;
  for (let y = fy + 1; y <= fy + hgt; y++) for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
    const edgeX = x === x0 || x === x0 + w - 1, edgeZ = z === z0 || z === z0 + d - 1;
    if (!edgeX && !edgeZ) continue;
    let c = PAL.wall[(y + (x >> 2)) % 2 === 0 ? 0 : 1];
    if ((edgeX && edgeZ) || y === fy + hgt || y === fy + 1) c = PAL.timber;
    M.set(x, y, z, c);
  }
  // door + windows on the front (z0) face
  const dx0 = x0 + Math.floor(w / 2) - 1;
  for (let y = fy + 1; y <= fy + 7; y++) for (let x = dx0; x < dx0 + 3; x++) M.set(x, y, z0, y === fy + 7 ? PAL.timber : PAL.door);
  M.set(dx0 + 2, fy + 4, z0 - 1, '#d8b04a');
  for (const wx of [x0 + 2, x0 + w - 5]) for (let y = fy + 5; y <= fy + 7; y++) for (let x = wx; x < wx + 3; x++) M.set(x, y, z0, (x === wx + 1 || y === fy + 6) && !night ? '#e8f4ff' : glass, gm);
  for (const sx of [x0, x0 + w - 1]) for (let y = fy + 5; y <= fy + 7; y++) for (let z = z0 + 4; z < z0 + 7; z++) M.set(sx, y, z, glass, gm);
  // flower boxes
  for (const wx of [x0 + 2, x0 + w - 5]) for (let x = wx; x < wx + 3; x++) { M.set(x, fy + 4, z0 - 1, PAL.timber); M.set(x, fy + 5, z0 - 1, pick(PAL.flower, hash2(x, z0, 3))); }
  // stepped gable roof along x
  const kMax = Math.ceil((d + 1) / 2);
  for (let k = 0; k <= kMax; k++) {
    const y = fy + hgt + 1 + k, za = z0 - 1 + k, zb = z0 + d - k;
    if (za > zb) break;
    for (let z = za; z <= zb; z++) for (let x = x0 - 1; x <= x0 + w; x++) {
      const edge = z === za || z === zb;
      M.set(x, y, z, edge ? roof[k % 2] : mix(roof[0], '#000000', 0.18));
    }
    for (let z = za + 1; z < zb; z++) for (const gx of [x0, x0 + w - 1]) M.set(gx, y, z, PAL.wall[0]);
  }
  // chimney
  const chx = x0 + w - 4, chz = z0 + Math.floor(d / 2) + 1;
  for (let y = fy + hgt + 2; y <= fy + hgt + kMax + 3; y++) { M.set(chx, y, chz, '#8c5a48'); M.set(chx + 1, y, chz, '#7a4a3a'); }
  M.set(chx, fy + hgt + kMax + 4, chz, '#3a3040'); M.set(chx + 1, fy + hgt + kMax + 4, chz, '#3a3040');
}

export function addLamp(M, x, z, night) {
  const g0 = gY(M, x, z);
  if (g0 < 0) return;
  for (let y = 1; y <= 8; y++) M.set(x, g0 + y, z, '#3a3a48');
  M.set(x, g0 + 9, z, night ? '#ffd27a' : '#f6e2a8', night ? EMIT : SOLID);
  M.set(x, g0 + 10, z, '#3a3a48');
}

export function addPad(M, x, z, r, ring, o = {}) {
  const g0 = gY(M, x, z);
  if (g0 < 0) return;
  const rings = Array.isArray(ring) ? ring : [ring];
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const dd = Math.hypot(dx, dz);
    if (dd > r) continue;
    const yy = Math.max(g0, gY(M, x + dx, z + dz));
    const gg = gY(M, x + dx, z + dz); if (gg < 0) continue;
    for (let y = Math.max(gg + 1, g0 - 6); y <= g0 + 1; y++) M.set(x + dx, y, z + dz, PAL.stone[1]);
    let c = PAL.stone[(Math.floor(dd) % 3 === 0) ? 1 : 0];
    if (dd > r - 2.2 && dd <= r - 0.8) c = rings.length > 1 ? rings[Math.floor(((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)) * rings.length) % rings.length] : rings[0];
    M.set(x + dx, g0 + 1, z + dz, c);
    void yy;
  }
  M.top[Math.floor(z) * M.w + Math.floor(x)] = g0 + 1;
}

export function addScoreboard(M, x, z, night) {
  const g0 = gY(M, x, z);
  if (g0 < 0) return;
  const W = 34, H = 20;
  for (let y = 1; y <= 30; y++) for (const px of [x - W / 2 - 1, x + W / 2]) { M.set(px, g0 + y, z, PAL.timber); M.set(px, g0 + y, z + 1, PAL.timber); }
  for (let y = 10; y < 10 + H; y++) for (let xx = x - W / 2; xx < x + W / 2; xx++) {
    const edge = y === 10 || y === 9 + H || xx === x - W / 2 || xx === x + W / 2 - 1;
    M.set(xx, g0 + y, z, edge ? '#5a3d26' : '#1e2233');
    M.set(xx, g0 + y, z + 1, '#2a2e40');
  }
  // rows of flaps (bright cells) — the readable board is drawn in 2D shots
  for (let row = 0; row < 4; row++) for (let k = 0; k < 13; k++) {
    const y = g0 + 26 - row * 4, xx = x - W / 2 + 3 + k * 2.2;
    const on = hash2(row, k, 3) < 0.75;
    if (on) { M.set(xx, y, z - 1, row === 0 ? '#ffcf6b' : '#e8ecff', night ? EMIT : GLOW); M.set(xx, y - 1, z - 1, row === 0 ? '#e0a84a' : '#b8c0e0', night ? EMIT : GLOW); }
  }
  for (let xx = x - W / 2 - 2; xx <= x + W / 2 + 1; xx++) M.set(xx, g0 + 31, z, '#b8382a');
}

export function addBunting(M, x0, y0, z0, x1, y1, z1, sag = 4) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 1.2);
  const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#ff8fb0', '#ffffff'];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * sag;
    M.set(x, y, z, '#3a2e30');
    if (i % 4 === 1) { const c = cols[(i >> 2) % cols.length]; M.set(x, y - 1, z, c); M.set(x + 1, y - 1, z, c); M.set(x, y - 2, z, c); }
  }
}

export function makeIsland(o = {}) {
  const seed = o.seed ?? 1, R = o.r ?? 40, topH = o.top ?? 4, under = o.under ?? Math.round(R * 0.8), head = o.head ?? 34, below = o.below ?? 0;
  const W = Math.ceil(2 * R + 12), D = W, base = Math.ceil(below + under + 2), H = Math.ceil(base + topH + 6 + head);
  const M = new VoxModel(W, H, D);
  const cx = W / 2, cz = D / 2;
  const top = new Int16Array(W * D).fill(-1);
  const flatK = o.flat ?? 0;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dz = z + 0.5 - cz, dist = Math.hypot(dx, dz);
    if (dist > R * 1.2) continue;
    const a = Math.atan2(dz, dx);
    const rr = R * (0.88 + 0.12 * (noise2(Math.cos(a) * 1.8 + seed * 3.1, Math.sin(a) * 1.8 + seed, seed) * 2 - 1) + 0.04 * Math.sin(a * 3 + seed));
    if (dist > rr) continue;
    const u = dist / rr;
    const dome = topH * ((1 - u * u) * (1 - flatK) + flatK * (u < 0.86 ? 1 : 1 - (u - 0.86) / 0.14));
    const sh = base + dome + (fbm(x * 0.06, z * 0.06, 3, seed + 3) - 0.5) * (o.rough ?? 2.2);
    const dep = under * Math.pow(Math.max(0, 1 - u), 0.75) * (0.55 + 0.6 * fbm(x * 0.07, z * 0.07, 3, seed + 7)) + 2;
    const y1 = Math.floor(sh), y0 = Math.max(0, Math.floor(base - dep));
    for (let y = y0; y <= y1; y++) {
      const dT = y1 - y;
      let c;
      if (dT === 0) {
        const gv = fbm(x * 0.11, z * 0.11, 2, seed + 11) + (hash2(x, z, seed) - 0.5) * 0.22;
        c = u > 0.95 ? PAL.grassEdge : pick(PAL.grass, gv * 1.25 - 0.12);
      } else if (dT === 1) c = u > 0.9 ? PAL.grassEdge : PAL.grass[0];
      else if (dT <= 4) c = PAL.dirt[hash2(x * 3 + y, z, seed) < 0.22 ? 1 : 0];
      else if (dT === 5) c = PAL.dirt[2];
      else {
        const kk = (base - y) / under;
        const band = Math.sin(y * 0.75 + fbm(x * 0.05, z * 0.05, 2, seed) * 6) * 0.3;
        c = pick(PAL.rock, kk * 0.95 + band * 0.18 + (hash2(x + y * 7, z, seed) - 0.5) * 0.14);
      }
      M.set(x, y, z, c);
    }
    top[z * W + x] = y1;
  }
  M.top = top; M.cx = cx; M.cz = cz; M.base = base; M.R = R;
  M.pivot = [cx, base, cz];
  M.groundAt = (dx, dz) => gY(M, cx + dx, cz + dz) - base + 1; // world y offset of the walkable surface
  const P = (dx, dz) => [cx + dx, cz + dz];
  // vines on the rim and crystals underneath
  for (let z = 1; z < D - 1; z++) for (let x = 1; x < W - 1; x++) {
    const y1 = top[z * W + x];
    if (y1 < 0) continue;
    for (const [ex, ez] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (top[(z + ez) * W + x + ex] >= 0) continue;
      if (hash2(x, z, seed + 21) > (o.vines ?? 0.12)) continue;
      const len = 3 + Math.floor(hash2(x, z, seed + 22) * 10);
      for (let k = 1; k <= len; k++) if (!M.solid(x + ex, y1 - k, z + ez)) M.set(x + ex, y1 - k, z + ez, PAL.leaf[k % 3 === 0 ? 2 : 1], LEAF);
    }
  }
  for (let i = 0; i < (o.crystals ?? 6); i++) {
    const a = hash2(i, seed, 31) * Math.PI * 2, rr = R * 0.5 * hash2(i, seed, 32);
    const x = Math.floor(cx + Math.cos(a) * rr), z = Math.floor(cz + Math.sin(a) * rr);
    let yb = -1;
    for (let y = 0; y < base; y++) if (M.solid(x, y, z)) { yb = y; break; }
    if (yb <= 1) continue;
    const len = 2 + Math.floor(hash2(i, seed, 33) * 4);
    for (let k = 1; k <= len; k++) M.set(x, yb - k, z, k === len ? '#e6fbff' : '#7fd8f0', EMIT);
  }
  const night = !!o.night;
  if (o.pond) {
    const [px, pz] = P(o.pond.dx, o.pond.dz), pr = o.pond.r;
    for (let dz = -pr - 1; dz <= pr + 1; dz++) for (let dx = -pr - 1; dx <= pr + 1; dx++) {
      const dd = Math.hypot(dx, dz), x = Math.floor(px + dx), z = Math.floor(pz + dz), g0 = gY(M, x, z);
      if (g0 < 0) continue;
      if (dd <= pr) { M.set(x, g0, z, '#3f86d8', WATER); if (dd < pr - 2) M.set(x, g0 - 1, z, '#2f6cc0', WATER); }
      else if (dd <= pr + 1) M.set(x, g0 + 1, z, PAL.stone[hash2(x, z, 4) < 0.5 ? 0 : 1]);
    }
  }
  for (const fl of o.falls || []) {
    const a = fl.a;
    let rx = 0, rz = 0;
    for (let rr = R * 0.6; rr < R * 1.25; rr += 0.5) {
      const x = Math.floor(cx + Math.cos(a) * rr), z = Math.floor(cz + Math.sin(a) * rr);
      if (gY(M, x, z) < 0) { rx = x; rz = z; break; }
    }
    const yTop = gY(M, rx - Math.round(Math.cos(a) * 2), rz - Math.round(Math.sin(a) * 2));
    for (let y = Math.max(0, Math.round(base - under * 0.3)); y <= yTop; y++) for (let k = -2; k <= 2; k++) {
      const x = rx + Math.round(-Math.sin(a) * k), z = rz + Math.round(Math.cos(a) * k);
      if (!M.solid(x, y, z)) M.set(x, y, z, Math.abs(k) < 2 ? (y > yTop - 2 ? "#e8f6ff" : "#9fd4ff") : "#6fb4f0", WATER);
    }
  }
  for (const h of o.houses || []) { const [x, z] = P(h.dx, h.dz); addHouse(M, x, z, { ...h, night }); }
  for (const p of o.pads || []) { const [x, z] = P(p.dx, p.dz); addPad(M, x, z, p.r ?? 10, p.ring); }
  if (o.scoreboard) { const [x, z] = P(o.scoreboard.dx, o.scoreboard.dz); addScoreboard(M, x, z, night); }
  for (const t of o.trees || []) { const [x, z] = P(t.dx, t.dz); addTree(M, x, z, t); }
  for (const l of o.lamps || []) { const [x, z] = P(l[0], l[1]); addLamp(M, x, z, night); }
  for (const bu of o.bunting || []) {
    const [ax, az] = P(bu[0], bu[1]), [bx, bz] = P(bu[2], bu[3]);
    const ya = gY(M, ax, az), yb = gY(M, bx, bz);
    if (ya < 0 || yb < 0) continue;
    for (let y = 1; y <= 26; y++) { M.set(ax, ya + y, az, PAL.timber); M.set(bx, yb + y, bz, PAL.timber); }
    addBunting(M, ax, ya + 26, az, bx, yb + 26, bz, bu[4] ?? 4);
  }
  // flowers, bushes, rocks on free grass
  const fd = o.flowers ?? 0.04;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const y1 = top[z * W + x];
    if (y1 < 0 || M.solid(x, y1 + 1, z) || M.m[x + W * (y1 + H * z)] === WATER) continue;
    const c0 = M.c[x + W * (y1 + H * z)];
    if (!PAL.grass.some((g) => hex(g) === c0)) continue;
    const hh = hash2(x, z, seed + 41);
    if (hh < fd) { M.set(x, y1 + 1, z, pick(PAL.flower, hash2(x, z, seed + 42)), SOLID); if (hh < fd * 0.3) M.set(x, y1 + 1, z, PAL.leaf[3], LEAF), M.set(x, y1 + 2, z, pick(PAL.flower, hash2(x, z, seed + 43))); }
    else if (hh < fd + (o.tufts ?? 0.05)) M.set(x, y1 + 1, z, PAL.grass[3], LEAF);
    else if (hh > 1 - (o.bushes ?? 0.0025)) M.ellipsoid(x, y1 + 2, z, 2.6, 2.2, 2.6, (vx, vy, vz) => pick(PAL.leaf, 0.4 + (vy - y1) * 0.12 + hash2(vx, vz, vy) * 0.3), LEAF);
    else if (hh > 1 - (o.bushes ?? 0.0025) - (o.rocks ?? 0.0015)) M.ellipsoid(x, y1 + 1, z, 2, 1.5, 1.7, (vx, vy) => pick(PAL.rock, 0.2 + (y1 + 2 - vy) * 0.2));
  }
  return M;
}

// ---------------- named islands of the shared world ----------------
export const LAUNCH = {
  r: 84,
  pads: { clawd: [-30, -26], codex: [0, -32], gemini: [30, -26] },
  scoreboard: [0, 22], tree: [-58, -16],
};
export function launchIsland(night = false) {
  return cached('island', 'launch' + night, () => makeIsland({
    seed: 3, r: 84, top: 3, under: 64, head: 50, flat: 0.75, below: 34, night, vines: 0.1, crystals: 16, flowers: 0.035,
    pads: [{ dx: -30, dz: -26, ring: '#d97757' }, { dx: 0, dz: -32, ring: '#5a7cff' }, { dx: 30, dz: -26, ring: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'] }],
    scoreboard: { dx: 0, dz: 22 },
    houses: [{ dx: -64, dz: 14, roof: 0 }, { dx: -46, dz: 40, roof: 2, w: 13 }, { dx: 38, dz: 34, roof: 1 }, { dx: 56, dz: 6, roof: 3, w: 13, d: 11 }, { dx: -18, dz: 56, roof: 4, w: 13 }, { dx: 14, dz: 54, roof: 0, w: 12, d: 10 }],
    trees: [{ dx: -58, dz: -16, h: 15, r: 10 }, { dx: 62, dz: -30, kind: 'blossom', h: 11, r: 8 }, { dx: 70, dz: 30, kind: 'blossom', h: 10, r: 7 }, { dx: -72, dz: 40, kind: 'pine', h: 8, r: 6 }, { dx: 44, dz: 66, kind: 'pine', h: 9, r: 6 }, { dx: -36, dz: 68, kind: 'oak', h: 10, r: 7 }],
    lamps: [[-16, -12], [16, -12], [-44, -6], [44, -6], [-20, 34], [24, 32]],
    bunting: [[-46, -58, 46, -58, 5]],

    pond: { dx: -46, dz: 18, r: 5 },
  }));
}
export function grovIsland(night = false) {
  return cached('island', 'grove' + night, () => makeIsland({
    seed: 11, r: 46, top: 6, under: 44, head: 34, below: 30, night, crystals: 8, flowers: 0.08,
    trees: [{ dx: -14, dz: 6, kind: 'blossom', h: 11, r: 8 }, { dx: 16, dz: -8, kind: 'blossom', h: 9, r: 7 }, { dx: 6, dz: 22, kind: 'blossom', h: 10, r: 7 }, { dx: -24, dz: -18, kind: 'oak', h: 9, r: 6 }],
    pond: { dx: 10, dz: 6, r: 6 }, lamps: [[-4, -14]],
  }));
}
export function forestIsland(night = false) {
  return cached('island', 'forest' + night, () => makeIsland({
    seed: 17, r: 52, top: 8, under: 50, head: 36, night, crystals: 6, flowers: 0.02,
    trees: [[-18, -10], [8, -22], [22, 4], [-4, 18], [-28, 14], [26, -26], [-10, -30], [30, 24]].map(([dx, dz], i) => ({ dx, dz, kind: 'pine', h: 8 + (i % 3) * 2, r: 6 + (i % 2) })),
    houses: [{ dx: -6, dz: -6, roof: 2, w: 12, d: 10, h: 10 }],
  }));
}
export function meadowIsland(night = false) {
  return cached('island', 'meadow' + night, () => makeIsland({
    seed: 23, r: 66, top: 4, under: 52, head: 30, flat: 0.5, night, crystals: 10, flowers: 0.11, tufts: 0.08,
    trees: [{ dx: -40, dz: 20, kind: 'oak', h: 12, r: 8 }, { dx: 44, dz: 28, kind: 'blossom', h: 10, r: 7 }, { dx: 30, dz: -40, kind: 'autumn', h: 11, r: 7 }],
    lamps: [[-10, 0], [12, 4]],
  }));
}
export function rockIsland(seed, r, night = false) {
  return cached('island', 'rock' + seed + ':' + r + night, () => makeIsland({ seed, r, top: 5, under: r, head: 22, night, crystals: 4, flowers: 0.05,
    trees: hash2(seed, 1, 1) < 0.7 ? [{ dx: 0, dz: 0, kind: hash2(seed, 2, 2) < 0.5 ? 'pine' : 'blossom', h: 8, r: 6 }] : [],
    houses: r > 28 && hash2(seed, 3, 3) < 0.6 ? [{ dx: -8, dz: -10, roof: seed % 5, w: 12, d: 10, h: 10 }] : [] }));
}

// ---------------- the Summit ----------------
// emissive star crystal centred at (cx, sy, cz)
function addStar(M, cx, sy, cz) {
  for (let z = -12; z <= 12; z++) for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) {
    const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
    const v = Math.min(ax + ay * 0.28 + az * 0.28 <= 3.2 ? 1 : 9, ay + ax * 0.28 + az * 0.28 <= 12 * 0.95 && ax + az < 4.5 ? 1 : 9, az + ax * 0.3 + ay * 0.3 <= 3 ? 1 : 9);
    const star = ay <= 12 - (ax + az) * 2.6 || ax <= 9 - (ay + az) * 2.4 || az <= 6 - (ax + ay) * 2.2;
    if (!star && v === 9) continue;
    const k = (ax + ay + az) / 12;
    M.set(cx + x, sy + y, cz + z, k < 0.25 ? '#ffffff' : k < 0.5 ? '#fff2b0' : '#ffd25a', EMIT);
  }
}

// close-up set: the snowy plateau on top of the Summit with the star crystal on a pedestal. The pivot sits at plateau
// level, so pos.y is the walkable height; the cliffs go ~100 units down and are meant to sink into a cloud sea.
export function makeSummitTop(night = false) {
  return cached('summitTop', 'v' + night, () => {
    const R0 = 46, TOPY = 100, W = 156, D = W, H = TOPY + 34, cx = W / 2, cz = D / 2;
    const M = new VoxModel(W, H, D);
    const top = new Int16Array(W * D).fill(-1);
    const ROCK = PAL.rock.map(hex), SNOW = [hex('#f6f9ff'), hex('#e4eafa'), hex('#d4dcf2')];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz, dd = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
      const rr = R0 * (0.9 + 0.1 * (noise2(Math.cos(a) * 2 + 3, Math.sin(a) * 2, 5) * 2 - 1));
      let h = dd <= rr ? TOPY + Math.round((fbm(x * 0.07, z * 0.07, 3, 9) - 0.5) * 3) - (dd > rr - 3 ? 1 : 0)
        : Math.round(TOPY - 1 - (dd - rr) * 3.4 - (fbm(x * 0.05, z * 0.05, 3, 4) - 0.5) * 14);
      if (h < 0) continue;
      top[z * W + x] = h;
      for (let y = 0; y <= h; y++) {
        const depth = h - y;
        let c;
        if (depth < 2 && (dd <= rr || (depth < 1 && hash2(x, z, 8) < 0.7))) c = SNOW[hash2(x, z, y) < 0.1 ? 1 : depth];
        else c = ROCK[clamp(Math.floor((0.15 + (y % 9 < 2 ? 0.18 : 0) + hash2(x >> 1, y >> 1, z >> 1) * 0.3 + (1 - y / TOPY) * 0.35) * ROCK.length), 0, ROCK.length - 1)];
        M.set(x, y, z, c);
      }
    }
    // a few snowy boulders on the rim of the plateau
    for (let i = 0; i < 9; i++) {
      const a = hash2(i, 3, 7) * Math.PI * 2, r = R0 * (0.72 + hash2(i, 4, 7) * 0.16);
      const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r, by = top[Math.floor(bz) * W + Math.floor(bx)];
      if (by < TOPY - 4) continue;
      const s = 2 + hash2(i, 5, 7) * 2.5;
      M.ellipsoid(bx, by + s * 0.6, bz, s, s * 0.8, s, (vx, vy) => (vy > by + s * 0.9 ? SNOW[0] : ROCK[2 + (vy & 1)]));
    }
    // pedestal + star crystal in the middle
    const ty = top[Math.floor(cz) * W + Math.floor(cx)];
    for (let y = ty + 1; y <= ty + 6; y++) for (let z = -6; z <= 6; z++) for (let x = -6; x <= 6; x++) {
      const r = Math.hypot(x, z), lim = 5.6 - (y - ty - 1) * 0.35;
      if (r <= lim) M.set(cx + x, y, cz + z, y === ty + 6 ? '#d6d2e4' : r > lim - 1 ? ROCK[3] : ROCK[1]);
    }
    addStar(M, cx, ty + 20, cz);
    M.pivot = [cx, TOPY, cz];
    M.top = top;
    M.starY = ty + 20 - TOPY;
    M.groundAt = (dx, dz) => { const v = top[Math.floor(cz + dz) * W + Math.floor(cx + dx)]; return (v >= 0 ? v : 0) - TOPY + 1; };
    return M;
  });
}

// pennant on a pole; cols = colour or list of colours (vertical bands)
export function makePennant(cols) {
  return cached('pennant', JSON.stringify(cols), () => {
    const M = new VoxModel(16, 30, 2), cs = Array.isArray(cols) ? cols : [cols];
    for (let y = 0; y < 30; y++) M.set(1, y, 0, y > 27 ? '#ffd25a' : '#6a4a30');
    for (let j = 0; j <= 9; j++) {
      const w = Math.round(13 * (1 - Math.abs(j - 4.5) / 5));
      for (let x = 0; x < w; x++) M.set(2 + x, 27 - j, 0, cs[Math.min(cs.length - 1, Math.floor((x / 13) * cs.length))]);
    }
    M.pivot = [1.5, 0, 1];
    return M;
  });
}

// small paper lantern (emissive)
export function makeLantern3D() {
  return cached('veh', 'lantern3d', () => {
    const M = new VoxModel(9, 13, 9);
    M.ellipsoid(4.5, 6.5, 4.5, 3.7, 4.6, 3.7, (x, y) => (y > 9 ? '#c8602a' : y > 6 ? '#e8823a' : '#f8a050'), EMIT);
    M.box(2, 1, 2, 7, 2, 7, '#5a2a14'); M.box(3, 11, 3, 6, 13, 6, '#5a2a14');
    M.pivot = [4.5, 0, 4.5];
    return M;
  });
}

// Gemini 4 Carbon: a long carbon-weave delta with a glass canopy, a thin four-colour stripe and twin blue engines (nose +z)
export function makeCarbon() {
  return cached('veh', 'carbon', () => {
    const L = 66, S = 54, W = S + 6, H = 22, D = L + 8, cx = W / 2, M = new VoxModel(W, H, D);
    const weave = (x, z) => ((((x >> 1) + (z >> 1)) & 1) ? '#1a1d25' : '#2b2f3b');
    const G4 = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];
    for (let z = 6; z < 6 + L; z++) {
      const u = (z - 6) / L, half = (S / 2) * Math.pow(1 - u, 1.3) + 1.2;
      for (let x = 0; x < W; x++) {
        const dxw = Math.abs(x + 0.5 - cx);
        if (dxw > half) continue;
        let c = weave(x, z);
        if (dxw > half - 1.4) c = '#555b6b';
        else if (z >= 10 && z <= 13) c = G4[z - 10];
        M.set(x, 8 + Math.floor(dxw * 0.07), z, c);
      }
    }
    for (let z = 2; z < 4 + L; z++) {
      const u = z / (L + 4), r = 4.6 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5 + 0.25) * (1 - u * 0.6);
      for (let y = 5; y < 16; y++) for (let x = Math.floor(cx - 6); x < cx + 6; x++) {
        const d = Math.hypot((x + 0.5 - cx) / 1.15, (y + 0.5 - 9.5) / 0.9);
        if (d > r) continue;
        const canopy = u > 0.5 && u < 0.78 && y > 10;
        M.set(x, y, z, canopy ? (y > 12 ? '#c8f4ff' : '#7fd0ff') : weave(x, z + y), canopy ? GLOW : SOLID);
      }
    }
    for (const ex of [-7, 7]) for (let z = 0; z < 16; z++) for (let y = 4; y < 14; y++) for (let x = Math.floor(cx + ex - 4); x < cx + ex + 4; x++) {
      const dd = Math.hypot(x + 0.5 - (cx + ex), y + 0.5 - 8.5);
      if (dd > 3.7) continue;
      if (z < 2) M.set(x, y, z, dd < 1.6 ? '#ffffff' : dd < 2.8 ? '#bfe8ff' : '#5ab0ff', EMIT);
      else M.set(x, y, z, z === 3 ? '#6a7080' : '#3a3e4a');
    }
    for (const fx of [-10, 10]) for (let z = 3; z < 19; z++) for (let y = 9; y < 11 + (19 - z) * 0.55; y++) M.set(cx + fx, y, z, y > 9 + (19 - z) * 0.55 ? '#555b6b' : '#2b2f3b');
    M.pivot = [cx, 0, D / 2];
    return M;
  });
}

// night test stand for Carbon: hazard-striped pad, two lattice towers, a beam with floodlights, a "TEST" sign
export function makeTestRig() {
  return cached('veh', 'testrig', () => {
    const W = 104, H = 66, D = 70, M = new VoxModel(W, H, D);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const rim = x < 4 || z < 4 || x >= W - 4 || z >= D - 4;
      const c = rim ? ((((x + z) >> 2) & 1) ? '#f2c230' : '#22242c') : hash2(x, z, 4) < 0.1 ? '#5e6270' : (((x >> 3) + (z >> 3)) & 1 ? '#727684' : '#7a7e8c');
      M.set(x, 0, z, c); M.set(x, 1, z, c);
    }
    const tower = (x0, z0) => {
      for (let y = 2; y < 58; y++) {
        for (const [dx, dz] of [[0, 0], [5, 0], [0, 5], [5, 5]]) M.set(x0 + dx, y, z0 + dz, '#c8ccd8');
        const ph = y % 6;
        M.set(x0 + ph, y, z0, '#8a90a0'); M.set(x0 + 5 - ph, y, z0 + 5, '#8a90a0'); M.set(x0, y, z0 + ph, '#8a90a0'); M.set(x0 + 5, y, z0 + 5 - ph, '#8a90a0');
        if (y % 6 === 0) for (let k = 0; k <= 5; k++) { M.set(x0 + k, y, z0, '#9aa0b0'); M.set(x0 + k, y, z0 + 5, '#9aa0b0'); }
        if (y % 14 === 7) M.set(x0 + 2, y, z0 - 1, '#ff3a3a', EMIT);
      }
    };
    tower(6, D - 14); tower(W - 12, D - 14);
    for (let x = 6; x < W - 6; x++) for (let y = 55; y < 59; y++) M.set(x, y, D - 12, y === 55 || y === 58 ? '#9aa0b0' : '#c8ccd8');
    for (const lx of [26, 52, 78]) { M.box(lx - 3, 50, D - 16, lx + 4, 55, D - 11, '#3a3e4a'); M.box(lx - 2, 51, D - 17, lx + 3, 54, D - 16, '#fff6d8', EMIT); }
    // sign board on the left tower
    M.box(14, 30, D - 15, 40, 40, D - 14, '#22242c');
    voxText(M, 'TEST', 27, 32, D - 16, '#f2c230', { align: 'center', font: 'press' });
    // cradle arms for the ship
    for (const ax of [W / 2 - 18, W / 2 + 18]) { M.box(ax - 2, 2, D / 2 - 6, ax + 2, 8, D / 2 + 6, '#5e6270'); M.box(ax - 3, 8, D / 2 - 6, ax + 3, 9, D / 2 + 6, '#f2c230'); }
    M.pivot = [W / 2, 0, D / 2];
    return M;
  });
}

export function makeSummit(night = false) {
  return cached('summit', 'v' + night, () => {
    const W = 104, H = 196, D = 104, cx = W / 2, cz = D / 2;
    const M = new VoxModel(W, H, D);
    const topY = H - 26;
    for (let y = 0; y < topY; y++) {
      const u = y / topY;
      const terrace = y > 14 && y < topY - 30 && y % 28 < 3;
      const r0 = 48 * Math.pow(1 - u, 1.15) + 3.5 + (terrace ? 4 : 0);
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dz = z + 0.5 - cz, dd = Math.hypot(dx, dz);
        if (dd > r0 + 4) continue;
        const a = Math.atan2(dz, dx);
        const rr = r0 * (0.86 + 0.14 * (noise2(Math.cos(a) * 2.2 + y * 0.04, Math.sin(a) * 2.2, 7) * 2 - 1));
        if (dd > rr) continue;
        let c;
        const above = M.solid(x, y + 1, z);
        if (u > 0.62) c = hash2(x, y, z) < 0.12 ? PAL.rock[2] : (y % 3 === 0 ? '#e6ecff' : '#f8faff');
        else c = pick(PAL.rock, 0.15 + (1 - u) * 0.5 + Math.sin(y * 0.5 + a * 2) * 0.12 + (hash2(x + y, z, 9) - 0.5) * 0.15);
        if (terrace && y % 28 === 2 && u < 0.62) c = pick(PAL.grass, hash2(x, z, y));
        void above;
        M.set(x, y, z, c);
      }
    }
    // little lantern lights along the terraces
    for (let i = 0; i < 60; i++) {
      const y = 16 + 28 * Math.floor(hash2(i, 1, 5) * 5) + 3, a = hash2(i, 2, 5) * Math.PI * 2;
      if (y > topY - 30) continue;
      const r0 = 48 * Math.pow(1 - y / topY, 1.15) + 7;
      M.set(cx + Math.cos(a) * r0, y, cz + Math.sin(a) * r0, night ? '#ffd27a' : '#f6c870', night ? EMIT : SOLID);
    }
    // the star crystal on top
    const sy = topY + 12;
    addStar(M, cx, sy, cz);
    M.pivot = [cx, 0, cz];
    M.starY = sy;
    return M;
  });
}

export function makeCloudPuff(seed, r = 14) {
  return cached('cloud', seed + ':' + r, () => {
    const W = Math.ceil(r * 4.2), H = Math.ceil(r * 1.9), D = Math.ceil(r * 2.6);
    const M = new VoxModel(W, H, D);
    const balls = [];
    for (let i = 0; i < 7; i++) balls.push([W / 2 + (hash2(i, seed, 1) - 0.5) * r * 2.4, r * (0.55 + hash2(i, seed, 2) * 0.45), D / 2 + (hash2(i, seed, 3) - 0.5) * r * 0.9, r * (0.45 + hash2(i, seed, 4) * 0.5)]);
    for (const [bx, by, bz, br] of balls) M.ellipsoid(bx, by, bz, br, br * 0.9, br, (x, y) => (y < 2 ? null : y > by + br * 0.2 ? '#ffffff' : y > by - br * 0.4 ? '#eef0fb' : '#cfd4ec'), CLOUD);
    M.pivot = [W / 2, 0, D / 2];
    return M;
  });
}

// ---------------- vehicles ----------------
export function makeBalloon() {
  return cached('veh', 'balloon', () => {
    const W = 44, H = 68, D = 44, cx = 22, cz = 22, M = new VoxModel(W, H, D);
    const ecy = 46, rx = 18, ry = 20;
    for (let y = 22; y < H; y++) {
      const yy = y + 0.5 - ecy;
      let r;
      if (yy >= -ry * 0.35) r = rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2));
      else { const r1 = rx * Math.sqrt(1 - 0.35 * 0.35), y1 = -ry * 0.35, y0 = 26 - ecy; r = 5 + (r1 - 5) * clamp((yy - y0) / (y1 - y0)) ** 0.85; }
      if (y < 26) r = 5;
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dz = z + 0.5 - cz, dd = Math.hypot(dx, dz);
        if (dd > r || (y >= 26 && dd < r - 2.2 && y < H - 3)) continue;
        const a = Math.atan2(dz, dx), gore = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 12) % 2;
        let c = gore ? '#d97757' : '#f6e7cf';
        if (yy > ry * 0.8) c = '#c4643f';
        if (y < 26) c = '#8a3a22';
        if (Math.abs(yy + 1) < 0.8) c = '#7a3218';
        M.set(x, y, z, c);
      }
    }
    // ropes and basket (hollow so the rider shows)
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.line(cx + sx * 5, 22, cz + sz * 5, cx + sx * 6, 12, cz + sz * 6, '#6a4a30');
    for (let y = 1; y <= 11; y++) for (let z = cz - 7; z <= cz + 7; z++) for (let x = cx - 7; x <= cx + 7; x++) {
      const wall = x === cx - 7 || x === cx + 7 || z === cz - 7 || z === cz + 7 || y === 1;
      if (!wall) continue;
      let c = (x + y + z) % 2 ? '#b07a40' : '#9a6634';
      if (y === 11 || y === 6) c = '#6a4220';
      M.set(x, y, z, c);
    }
    // burner with a four-colour flame (Gemini's fire, revealed later)
    M.box(cx - 2, 17, cz - 2, cx + 2, 19, cz + 2, '#4a4a58');
    const fl = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
    for (let i = 0; i < 4; i++) { M.set(cx - 1 + (i % 2), 20 + (i >> 1), cz - 1 + (i >> 1), fl[i], EMIT); }
    M.set(cx, 22, cz, '#fff4c0', EMIT);
    M.pivot = [cx, 1, cz];
    M.seat = [0, 2, 0];
    return M;
  });
}

export function makeRocket() {
  return cached('veh', 'rocket', () => {
    const W = 34, H = 76, D = 34, cx = 17, cz = 17, M = new VoxModel(W, H, D);
    for (let y = 0; y < H; y++) {
      let r;
      if (y < 8) r = 5 + y * 0.12;
      else if (y < 58) r = 9 + Math.sin(((y - 8) / 50) * Math.PI) * 0.8;
      else r = 9 * Math.pow(1 - (y - 58) / 17, 0.75);
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dz = z + 0.5 - cz, dd = Math.hypot(dx, dz);
        if (dd > r) continue;
        let c;
        if (y < 8) c = dd > r - 1 ? '#5a5e70' : '#3a3e50';
        else if (y >= 58) c = y > 71 ? '#ff6a5a' : '#4a6cff';
        else c = (y >= 18 && y <= 21) || (y >= 50 && y <= 52) ? '#4a6cff' : (Math.atan2(dz, dx) > 2.2 ? '#d8e0f8' : '#eef2ff');
        M.set(x, y, z, c);
      }
    }
    // fins
    for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let y = 2; y < 22; y++) {
      const ext = 9 + (22 - y) * 0.32;
      for (let k = 8; k < ext; k++) for (const t of [0, 1]) M.set(cx + fx * k + (fz ? t : 0), y, cz + fz * k + (fx ? t : 0), y < 4 ? '#1c2a80' : '#2a3fb0');
    }
    // open cockpit on the front (-z) side for the rider
    for (let y = 36; y < 52; y++) for (let x = cx - 6; x <= cx + 6; x++) for (let z = 0; z < cz - 1; z++) M.del(x, y, z);
    for (let x = cx - 7; x <= cx + 7; x++) { M.set(x, 35, cz - 9, '#9aa4c8'); M.set(x, 52, cz - 9, '#9aa4c8'); }
    for (let y = 35; y <= 52; y++) { M.set(cx - 7, y, cz - 9, '#9aa4c8'); M.set(cx + 7, y, cz - 9, '#9aa4c8'); }
    // portholes
    for (const [px, py] of [[1, 28], [-1, 28]]) for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) M.set(cx + px * 9.5, py + j, cz + k, '#9fe8ff', GLOW);
    M.pivot = [cx, 0, cz];
    M.seat = [0, 36, -4];
    return M;
  });
}

export function makeGlider() {
  return cached('veh', 'glider', () => {
    const S = 76, L = 38, W = S + 6, H = 26, D = L + 18, cx = W / 2, M = new VoxModel(W, H, D);
    const cols = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];
    for (let z = 8; z < 8 + L; z++) {
      const u = (z - 8) / L, half = (S / 2) * (1 - u) + 1.5;
      for (let x = 0; x < W; x++) {
        const dxw = Math.abs(x + 0.5 - cx);
        if (dxw > half) continue;
        const y = 15 + Math.floor(dxw * 0.12);
        const band = Math.floor(((x - (cx - S / 2)) / S) * 4);
        let c = cols[clamp(band, 0, 3)];
        if (dxw > half - 1.6 || z === 8) c = '#1a1f4d';
        else if ((z - 8) % 9 === 0) c = mix(c, '#ffffff', 0.25);
        M.set(x, y, z, c);
        if (dxw > half - 1.6) M.set(x, y + 1, z, '#2a2f6a');
      }
    }
    for (let z = 4; z < 10 + L; z++) { M.set(cx, 14, z, '#2a2f6a'); M.set(cx - 1, 14, z, '#2a2f6a'); }
    // argon engine pod at the back
    for (let z = 0; z < 13; z++) for (let y = 7; y < 16; y++) for (let x = cx - 5; x < cx + 5; x++) {
      const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - 11.5);
      if (dd > 4.6) continue;
      let c = '#5a5e74', m = SOLID;
      if (z < 2) { c = dd < 2.2 ? '#ffffff' : dd < 3.6 ? '#d8c8ff' : '#9a84ff'; m = EMIT; }
      else if (z === 6) c = '#b9a4ff';
      M.set(x, y, z, c, m);
    }
    // harness down to the pilot
    M.line(cx, 13, 26, cx, 4, 24, '#2a2f6a');
    M.pivot = [cx, 0, D / 2];
    M.seat = [0, 0, 24 - D / 2];
    return M;
  });
}

export function makePlane() {
  return cached('veh', 'plane', () => {
    const L = 26, S = 22, W = S + 4, H = 12, D = L + 2, cx = W / 2, M = new VoxModel(W, H, D);
    for (let z = 1; z <= L; z++) {
      const u = (z - 1) / L, half = (S / 2) * Math.pow(1 - u, 1.1) + 0.6;
      for (let x = 0; x < W; x++) {
        const xo = x + 0.5 - cx, a = Math.abs(xo);
        if (a > half) continue;
        const y = 5 + Math.floor(a * 0.32);
        let c = a < 1 ? '#d8d6cc' : '#fbfaf2';
        if (Math.abs(a - half * 0.55) < 0.9 && u < 0.8) c = '#ffd23a';
        M.set(x, y, z, c);
      }
      if (u > 0.12 && u < 0.85) for (let y = 2; y <= 4; y++) M.set(cx, y + Math.floor(u * 1.5), z, '#eeeae0');
    }
    M.pivot = [cx, 4, D / 2];
    return M;
  });
}

export function makeCrescent() {
  return cached('veh', 'crescent', () => {
    const W = 36, H = 36, D = 10, R = 16, M = new VoxModel(W, H, D);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = Math.hypot(x + 0.5 - 18, y + 0.5 - 18), b = Math.hypot(x + 0.5 - 25, y + 0.5 - 22);
      if (a > R || b < R * 0.85) continue;
      for (let z = 2; z < 8; z++) M.set(x, y, z, hash2(x >> 1, y >> 1, 5) < 0.1 ? '#e8cf7a' : z === 2 ? '#fff4c8' : '#ffe9a8');
    }
    M.pivot = [18, 2, 5];
    return M;
  });
}

// the long-awaited crate; stage adds time: 1 dust+web, 2 nest, 3 leaves
export function makeCrate(stage = 0) {
  return cached('crate', 's' + stage, () => {
    const S = 30, M = new VoxModel(S + 4, S + 12, S + 4), o = 2;
    for (let z = o; z < o + S; z++) for (let y = 0; y < S; y++) for (let x = o; x < o + S; x++) {
      const ex = x === o || x === o + S - 1, ey = y === 0 || y === S - 1, ez = z === o || z === o + S - 1;
      if (!ex && !ey && !ez) continue;
      const edges = (ex ? 1 : 0) + (ey ? 1 : 0) + (ez ? 1 : 0);
      let c = y % 5 === 4 ? '#8a6036' : (hash2(x, y, z) < 0.15 ? '#a87a46' : '#b88a52');
      if (edges >= 2) c = '#6a4626';
      if (edges === 3 || (edges === 2 && (y < 3 || y > S - 4))) c = '#8a8ea0';
      if (stage >= 1 && ey && y === S - 1 && hash2(x, z, 7) < 0.35) c = '#c8bca8';
      M.set(x, y, z, c);
    }
    voxText(M, '3.5', o + S / 2, 22, o - 0, '#3a2414', { align: 'center', font: 'press' });
    voxText(M, 'PRO', o + S / 2, 12, o - 0, '#3a2414', { align: 'center', font: 'press' });
    // red tag
    for (let y = 2; y < 8; y++) for (let x = o + S - 9; x < o + S - 2; x++) M.set(x, y, o - 1, y === 2 || y === 7 ? '#c0392b' : '#fbf6ea');
    if (stage >= 1) for (let k = 0; k < 7; k++) { M.set(o + k, S - 1 - k, o - 1, '#e8e8f0'); M.set(o + S - 1 - k, S - 1 - k, o - 1, '#e8e8f0'); }
    if (stage >= 2) {
      const nx = o + S / 2, nz = o + S / 2;
      for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; M.set(nx + Math.cos(t) * 5, S, nz + Math.sin(t) * 5, a % 2 ? '#8a6a3a' : '#6a4a22'); M.set(nx + Math.cos(t) * 4, S + 1, nz + Math.sin(t) * 4, '#9a7a46'); }
      M.ellipsoid(nx, S + 3, nz, 2.5, 2.2, 2.5, '#5a9ad8');
      M.set(nx - 1, S + 4, nz - 2, '#151a3d'); M.set(nx, S + 3, nz - 3, '#f6b040');
    }
    if (stage >= 3) for (let i = 0; i < 40; i++) { const x = o + hash2(i, 1, 9) * S, z = o + hash2(i, 2, 9) * S; M.set(x, S, z, pick(PAL.autumn, hash2(i, 3, 9))); }
    M.pivot = [o + S / 2, 0, o + S / 2];
    return M;
  });
}

// ---------------- characters as voxel figures ----------------
const DUMMY = new Surface(1, 1);
function extrude(F, Fl, maxD, minD, flip) {
  const w = F.w, h = F.h, dist = new Float32Array(w * h).fill(1e9);
  for (let i = 0; i < w * h; i++) if (!(F.d[i] >>> 24)) dist[i] = 0;
  const pass = (x, y, dx, dy, c) => { const nx = x + dx, ny = y + dy; const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : dist[ny * w + nx]; if (v + c < dist[y * w + x]) dist[y * w + x] = v + c; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { pass(x, y, -1, 0, 1); pass(x, y, 0, -1, 1); pass(x, y, -1, -1, 1.4); pass(x, y, 1, -1, 1.4); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { pass(x, y, 1, 0, 1); pass(x, y, 0, 1, 1); pass(x, y, 1, 1, 1.4); pass(x, y, -1, 1, 1.4); }
  const M = new VoxModel(w, h, maxD);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = F.d[i];
    if (!(c >>> 24)) continue;
    const cf = Fl.d[i] || c;
    const th = clamp(Math.round(minD + Math.sqrt(Math.min(1, dist[i] / 8)) * (maxD - minD)), minD, maxD);
    const z0 = Math.floor((maxD - th) / 2), vx = flip ? w - 1 - x : x, vy = h - 1 - y;
    const em = F.em && F.em[i];
    for (let z = z0; z < z0 + th; z++) M.set(vx, vy, z, z === z0 ? c : cf, em && z === z0 ? EMIT : SOLID);
  }
  M.pivot = [flip ? w - F.ax : F.ax, h - F.ay, maxD / 2];
  return M.finalize();
}
// draw: a character draw function; pose: its parameters
export function charVox(name, draw, pose, o = {}) {
  const key = name + JSON.stringify(pose) + ':' + (o.depth ?? 12) + (o.flip ? 'f' : '');
  return cached('charvox', key, () => {
    const front = draw(DUMMY, 0, 0, { ...pose, noOutline: true, shadow: false, flip: false });
    const flat = draw(DUMMY, 0, 0, { ...pose, noOutline: true, flat: true, shadow: false, flip: false });
    return extrude(front, flat, o.depth ?? 12, o.minDepth ?? 4, o.flip);
  });
}
