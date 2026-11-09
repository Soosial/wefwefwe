// Voxel engine v2 ("pixel 3D"): voxel models with Chebyshev distance fields for empty-space skipping, per-pixel
// ray casting with sun shadows, smooth AO, hemisphere light, sky/stars/sun, cloud sea, fog into the sky,
// blob shadows, 3D sprites/points, silhouette outlines and god rays. Depth everywhere = distance along the ray.
import { col, cr, cg, cb, hex, mix, bayer, desat } from './fb.mjs';
import { clamp, hash2 } from './math.mjs';
import { Cam3, rotMat } from './three.mjs';

export { Cam3, rotMat };
export const SOLID = 1, EMIT = 2, LEAF = 3, WATER = 4, CLOUD = 5, GLOW = 6;
const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

export class VoxModel {
  constructor(w, h, d) {
    this.w = Math.ceil(w); this.h = Math.ceil(h); this.d = Math.ceil(d);
    const n = this.w * this.h * this.d;
    this.c = new Uint32Array(n);
    this.m = new Uint8Array(n);
    this.dist = null;
  }
  inb(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d; }
  set(x, y, z, c, m = SOLID) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d || c === null || c === undefined) return;
    const i = x + this.w * (y + this.h * z);
    this.c[i] = typeof c === 'number' ? c : hex(c);
    this.m[i] = m;
    this.dist = null;
  }
  del(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (!this.inb(x, y, z)) return;
    const i = x + this.w * (y + this.h * z);
    this.c[i] = 0; this.m[i] = 0; this.dist = null;
  }
  mat(x, y, z) { return this.inb(x, y, z) ? this.m[x + this.w * (y + this.h * z)] : 0; }
  solid(x, y, z) { return this.mat(Math.floor(x), Math.floor(y), Math.floor(z)) !== 0; }
  // c: colour or fn(x, y, z) -> colour|null
  box(x0, y0, z0, x1, y1, z1, c, m = SOLID) {
    for (let z = Math.floor(z0); z < z1; z++) for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++)
      this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c, m);
  }
  ellipsoid(cx, cy, cz, rx, ry, rz, c, m = SOLID) {
    for (let z = Math.floor(cz - rz); z <= cz + rz; z++) for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const u = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + ((z + 0.5 - cz) / rz) ** 2;
      if (u <= 1) this.set(x, y, z, typeof c === 'function' ? c(x, y, z, u) : c, m);
    }
  }
  line(x0, y0, z0, x1, y1, z1, c, m = SOLID) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 1.5));
    for (let i = 0; i <= n; i++) { const u = i / n; this.set(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, z0 + (z1 - z0) * u, c, m); }
  }
  // exact chessboard distance to the nearest solid voxel (two raster passes over the 26-neighbourhood)
  finalize(cap = 60) {
    const { w, h, d } = this, n = w * h * d, D = new Uint8Array(n), sy = w, sz = w * h;
    for (let i = 0; i < n; i++) D[i] = this.m[i] ? 0 : cap;
    for (let z = 0; z < d; z++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = x + sy * y + sz * z;
      let v = D[i];
      if (v === 0) continue;
      for (let dz = -1; dz <= 0; dz++) {
        const zz = z + dz;
        if (zz < 0) continue;
        for (let dy = -1; dy <= 1; dy++) {
          if (dz === 0 && dy > 0) break;
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dz === 0 && dy === 0 && dx >= 0) break;
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const u = D[xx + sy * yy + sz * zz] + 1;
            if (u < v) v = u;
          }
        }
      }
      D[i] = v;
    }
    for (let z = d - 1; z >= 0; z--) for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = x + sy * y + sz * z;
      let v = D[i];
      if (v === 0) continue;
      for (let dz = 1; dz >= 0; dz--) {
        const zz = z + dz;
        if (zz >= d) continue;
        for (let dy = 1; dy >= -1; dy--) {
          if (dz === 0 && dy < 0) break;
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = 1; dx >= -1; dx--) {
            if (dz === 0 && dy === 0 && dx <= 0) break;
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const u = D[xx + sy * yy + sz * zz] + 1;
            if (u < v) v = u;
          }
        }
      }
      D[i] = v;
    }
    this.dist = D;
    return this;
  }
}

// ---------------- buffers ----------------
let B = null;
function bufs(n) {
  if (B && B.n === n) return B;
  B = { n, dir: new Float32Array(n * 3), z: new Float32Array(n), id: new Uint16Array(n), sky: new Uint32Array(n), col: new Uint32Array(n), ray: new Float32Array(n) };
  return B;
}
export const buffers = () => B;

const lutCache = new Map();
function getLut(stops, L = 40) {
  const key = JSON.stringify(stops);
  let out = lutCache.get(key);
  if (out) return out;
  const st = stops.map(([t, c]) => [t, hex(c)]);
  out = new Uint32Array(L + 1);
  for (let k = 0; k <= L; k++) {
    const t = k / L;
    let i = 0;
    while (i < st.length - 2 && t > st[i + 1][0]) i++;
    const a = st[i], b = st[i + 1];
    out[k] = mix(a[1], b[1], clamp((t - a[0]) / (b[0] - a[0] || 1)));
  }
  lutCache.set(key, out);
  return out;
}

// periodic fbm texture for the cloud sea
let CT = null;
function cloudTex() {
  if (CT) return CT;
  const N = 256;
  CT = new Float32Array(N * N);
  const pn = (x, y, P, s) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const h = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P, s);
    return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v) + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, amp = 0.55, norm = 0;
    for (let o = 0; o < 5; o++) { const P = 4 << o; v += amp * pn((x / N) * P, (y / N) * P, P, o * 13 + 5); norm += amp; amp *= 0.5; }
    CT[y * N + x] = v / norm;
  }
  return CT;
}
function ctex(u, v) {
  const x = Math.floor(u), y = Math.floor(v), fx = u - x, fy = v - y;
  const x0 = x & 255, y0 = y & 255, x1 = (x + 1) & 255, y1 = (y + 1) & 255;
  return (CT[y0 * 256 + x0] * (1 - fx) + CT[y0 * 256 + x1] * fx) * (1 - fy) + (CT[y1 * 256 + x0] * (1 - fx) + CT[y1 * 256 + x1] * fx) * fy;
}

function solidAt(M, x, y, z) {
  if (x < 0 || y < 0 || z < 0 || x >= M.w || y >= M.h || z >= M.d) return 0;
  const m = M.m[x + M.w * (y + M.h * z)];
  return m !== 0 && m !== EMIT && m !== CLOUD ? 1 : 0;
}

// shadow ray in model space, returns true when blocked
function shadowHit(M, px, py, pz, dx, dy, dz) {
  const w = M.w, h = M.h, d = M.d, MM = M.m, DS = M.dist;
  let vx = Math.floor(px), vy = Math.floor(py), vz = Math.floor(pz);
  if (vx < 0 || vy < 0 || vz < 0 || vx >= w || vy >= h || vz >= d) return false;
  const stx = dx > 0 ? 1 : -1, sty = dy > 0 ? 1 : -1, stz = dz > 0 ? 1 : -1;
  const ix = dx !== 0 ? 1 / dx : 1e30, iy = dy !== 0 ? 1 / dy : 1e30, iz = dz !== 0 ? 1 / dz : 1e30;
  const tdx = Math.abs(ix), tdy = Math.abs(iy), tdz = Math.abs(iz);
  const invMax = 1 / Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  let t = 0;
  let tmx = dx > 0 ? (vx + 1 - px) * ix : dx < 0 ? (vx - px) * ix : 1e30;
  let tmy = dy > 0 ? (vy + 1 - py) * iy : dy < 0 ? (vy - py) * iy : 1e30;
  let tmz = dz > 0 ? (vz + 1 - pz) * iz : dz < 0 ? (vz - pz) * iz : 1e30;
  for (let it = 0; it < 600; it++) {
    const vi = vx + w * (vy + h * vz);
    const mm = MM[vi];
    if (mm !== 0 && it > 0 && mm !== EMIT && mm !== CLOUD && mm !== WATER) return true;
    const dd = DS[vi];
    if (dd > 2) {
      t += (dd - 1) * invMax;
      vx = Math.floor(px + dx * t); vy = Math.floor(py + dy * t); vz = Math.floor(pz + dz * t);
      if (vx < 0 || vy < 0 || vz < 0 || vx >= w || vy >= h || vz >= d) return false;
      tmx = dx > 0 ? (vx + 1 - px) * ix : dx < 0 ? (vx - px) * ix : 1e30;
      tmy = dy > 0 ? (vy + 1 - py) * iy : dy < 0 ? (vy - py) * iy : 1e30;
      tmz = dz > 0 ? (vz + 1 - pz) * iz : dz < 0 ? (vz - pz) * iz : 1e30;
      continue;
    }
    if (tmx < tmy) {
      if (tmx < tmz) { vx += stx; t = tmx; tmx += tdx; if (vx < 0 || vx >= w) return false; }
      else { vz += stz; t = tmz; tmz += tdz; if (vz < 0 || vz >= d) return false; }
    } else if (tmy < tmz) { vy += sty; t = tmy; tmy += tdy; if (vy < 0 || vy >= h) return false; }
    else { vz += stz; t = tmz; tmz += tdz; if (vz < 0 || vz >= d) return false; }
  }
  return false;
}

function castModel(s, cam, b, inst, L, time) {
  const M = inst.model;
  if (!M.dist) M.finalize();
  const W = s.w, H = s.h, DIR = b.dir, Z = b.z, ID = b.id, SKY = b.sky;
  const w = M.w, h = M.h, d = M.d, MC = M.c, MM = M.m, DS = M.dist;
  const R = inst.rot || IDENT, sc = inst.scale ?? 1, P = inst.pos, pv = inst.pivot || M.pivot || [w / 2, 0, d / 2];
  const r00 = R[0][0], r01 = R[0][1], r02 = R[0][2], r10 = R[1][0], r11 = R[1][1], r12 = R[1][2], r20 = R[2][0], r21 = R[2][1], r22 = R[2][2];
  const qx = cam.pos[0] - P[0], qy = cam.pos[1] - P[1], qz = cam.pos[2] - P[2];
  const ox = (r00 * qx + r10 * qy + r20 * qz) / sc + pv[0], oy = (r01 * qx + r11 * qy + r21 * qz) / sc + pv[1], oz = (r02 * qx + r12 * qy + r22 * qz) / sc + pv[2];
  const S = inst.lightDir || L.sun;
  const slx = r00 * S[0] + r10 * S[1] + r20 * S[2], sly = r01 * S[0] + r11 * S[1] + r21 * S[2], slz = r02 * S[0] + r12 * S[1] + r22 * S[2];
  // screen-space bounds of the model box
  let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
  {
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9, ok = true;
    for (let k = 0; k < 8; k++) {
      const lx = ((k & 1) ? w : 0) - pv[0], ly = ((k & 2) ? h : 0) - pv[1], lz = ((k & 4) ? d : 0) - pv[2];
      const pr = cam.project([P[0] + (r00 * lx + r01 * ly + r02 * lz) * sc, P[1] + (r10 * lx + r11 * ly + r12 * lz) * sc, P[2] + (r20 * lx + r21 * ly + r22 * lz) * sc]);
      if (!pr) { ok = false; break; }
      if (pr[0] < mnx) mnx = pr[0]; if (pr[0] > mxx) mxx = pr[0]; if (pr[1] < mny) mny = pr[1]; if (pr[1] > mxy) mxy = pr[1];
    }
    if (ok) {
      x0 = Math.max(0, Math.floor(mnx) - 1); x1 = Math.min(W - 1, Math.ceil(mxx) + 1);
      y0 = Math.max(0, Math.floor(mny) - 1); y1 = Math.min(H - 1, Math.ceil(mxy) + 1);
      if (x0 > x1 || y0 > y1) return;
    }
  }
  const sat = inst.sat ?? 1, bright = inst.bright ?? 1, flash = inst.flash ?? 0, alpha = inst.alpha ?? 1;
  const tint = inst.tint ? hex(inst.tint[0]) : 0, tintK = inst.tint ? inst.tint[1] : 0;
  const shadows = L.shadows !== false && inst.shadow !== false;
  const amb = L.amb, gnd = L.gnd, sunC = L.sunC, aoK0 = L.ao ?? 0.16;
  const fogNear = L.fogNear ?? 1e9, fogFar = L.fogFar ?? 2e9, fogMax = (L.fogMax ?? 1) * (inst.fog ?? 1);
  const id = inst.id ?? 2;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, k = i * 3;
    if (alpha < 1 && bayer(x, y) >= alpha) continue;
    const wx = DIR[k], wy = DIR[k + 1], wz = DIR[k + 2];
    const lx = (r00 * wx + r10 * wy + r20 * wz) / sc, ly = (r01 * wx + r11 * wy + r21 * wz) / sc, lz = (r02 * wx + r12 * wy + r22 * wz) / sc;
    let t0 = 0, t1 = Z[i], ax = -1;
    if (lx !== 0) { let ta = -ox / lx, tb = (w - ox) / lx; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) { t0 = ta; ax = 0; } if (tb < t1) t1 = tb; } else if (ox < 0 || ox >= w) continue;
    if (ly !== 0) { let ta = -oy / ly, tb = (h - oy) / ly; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) { t0 = ta; ax = 1; } if (tb < t1) t1 = tb; } else if (oy < 0 || oy >= h) continue;
    if (lz !== 0) { let ta = -oz / lz, tb = (d - oz) / lz; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) { t0 = ta; ax = 2; } if (tb < t1) t1 = tb; } else if (oz < 0 || oz >= d) continue;
    if (t0 >= t1) continue;
    let t = t0 + 1e-5;
    let vx = Math.floor(ox + lx * t), vy = Math.floor(oy + ly * t), vz = Math.floor(oz + lz * t);
    if (vx < 0) vx = 0; else if (vx >= w) vx = w - 1;
    if (vy < 0) vy = 0; else if (vy >= h) vy = h - 1;
    if (vz < 0) vz = 0; else if (vz >= d) vz = d - 1;
    const stx = lx > 0 ? 1 : -1, sty = ly > 0 ? 1 : -1, stz = lz > 0 ? 1 : -1;
    const ix = lx !== 0 ? 1 / lx : 1e30, iy = ly !== 0 ? 1 / ly : 1e30, iz = lz !== 0 ? 1 / lz : 1e30;
    const tdx = Math.abs(ix), tdy = Math.abs(iy), tdz = Math.abs(iz);
    let tmx = lx > 0 ? (vx + 1 - ox) * ix : lx < 0 ? (vx - ox) * ix : 1e30;
    let tmy = ly > 0 ? (vy + 1 - oy) * iy : ly < 0 ? (vy - oy) * iy : 1e30;
    let tmz = lz > 0 ? (vz + 1 - oz) * iz : lz < 0 ? (vz - oz) * iz : 1e30;
    const invMax = 1 / Math.max(Math.abs(lx), Math.abs(ly), Math.abs(lz));
    let hit = -1, axis = ax;
    for (let it = 0; it < 3000; it++) {
      const vi = vx + w * (vy + h * vz);
      if (MM[vi] !== 0) { hit = vi; break; }
      const dd = DS[vi];
      if (dd > 2) {
        t += (dd - 1) * invMax;
        if (t >= t1) break;
        vx = Math.floor(ox + lx * t); vy = Math.floor(oy + ly * t); vz = Math.floor(oz + lz * t);
        if (vx < 0 || vy < 0 || vz < 0 || vx >= w || vy >= h || vz >= d) break;
        tmx = lx > 0 ? (vx + 1 - ox) * ix : lx < 0 ? (vx - ox) * ix : 1e30;
        tmy = ly > 0 ? (vy + 1 - oy) * iy : ly < 0 ? (vy - oy) * iy : 1e30;
        tmz = lz > 0 ? (vz + 1 - oz) * iz : lz < 0 ? (vz - oz) * iz : 1e30;
        continue;
      }
      if (tmx < tmy) {
        if (tmx < tmz) { vx += stx; t = tmx; tmx += tdx; axis = 0; if (vx < 0 || vx >= w) break; }
        else { vz += stz; t = tmz; tmz += tdz; axis = 2; if (vz < 0 || vz >= d) break; }
      } else if (tmy < tmz) { vy += sty; t = tmy; tmy += tdy; axis = 1; if (vy < 0 || vy >= h) break; }
      else { vz += stz; t = tmz; tmz += tdz; axis = 2; if (vz < 0 || vz >= d) break; }
      if (t >= t1) break;
    }
    if (hit < 0 || t >= t1) continue;
    if (axis < 0) { const a0 = Math.abs(lx), a1 = Math.abs(ly), a2 = Math.abs(lz); axis = a0 >= a1 && a0 >= a2 ? 0 : a1 >= a2 ? 1 : 2; }
    const nlx = axis === 0 ? -stx : 0, nly = axis === 1 ? -sty : 0, nlz = axis === 2 ? -stz : 0;
    const hx = ox + lx * t, hy = oy + ly * t, hz = oz + lz * t;
    // smooth ambient occlusion from the 8 voxels around the air cell in front of the face
    const ax_ = vx + nlx, ay_ = vy + nly, az_ = vz + nlz;
    let ux = 0, uy = 0, uz = 0, vx2 = 0, vy2 = 0, vz2 = 0, fu, fv;
    if (axis === 0) { uy = 1; vz2 = 1; fu = hy - Math.floor(hy); fv = hz - Math.floor(hz); }
    else if (axis === 1) { ux = 1; vz2 = 1; fu = hx - Math.floor(hx); fv = hz - Math.floor(hz); }
    else { ux = 1; vy2 = 1; fu = hx - Math.floor(hx); fv = hy - Math.floor(hy); }
    const sp = solidAt(M, ax_ + ux, ay_ + uy, az_ + uz), sn = solidAt(M, ax_ - ux, ay_ - uy, az_ - uz);
    const tp = solidAt(M, ax_ + vx2, ay_ + vy2, az_ + vz2), tn = solidAt(M, ax_ - vx2, ay_ - vy2, az_ - vz2);
    const app = sp && tp ? 3 : sp + tp + solidAt(M, ax_ + ux + vx2, ay_ + uy + vy2, az_ + uz + vz2);
    const apn = sp && tn ? 3 : sp + tn + solidAt(M, ax_ + ux - vx2, ay_ + uy - vy2, az_ + uz - vz2);
    const anp = sn && tp ? 3 : sn + tp + solidAt(M, ax_ - ux + vx2, ay_ - uy + vy2, az_ - uz + vz2);
    const ann = sn && tn ? 3 : sn + tn + solidAt(M, ax_ - ux - vx2, ay_ - uy - vy2, az_ - uz - vz2);
    const occ = ann * (1 - fu) * (1 - fv) + apn * fu * (1 - fv) + anp * (1 - fu) * fv + app * fu * fv;
    const aoK = 1 - occ * aoK0;
    const mat = MM[hit];
    let lit = 1;
    if (shadows && mat !== EMIT) {
      const ndlL = nlx * slx + nly * sly + nlz * slz;
      if (ndlL <= 0.0) lit = 0;
      else if (shadowHit(M, hx + nlx * 0.02, hy + nly * 0.02, hz + nlz * 0.02, slx, sly, slz)) lit = 0;
    }
    const sg = axis === 0 ? nlx : axis === 1 ? nly : nlz;
    const nwx = R[0][axis] * sg, nwy = R[1][axis] * sg, nwz = R[2][axis] * sg;
    const ndl = Math.max(0, nwx * S[0] + nwy * S[1] + nwz * S[2]);
    let base = MC[hit];
    if (sat !== 1) base = desat(base, 1 - sat);
    if (tintK) base = mix(base, tint, tintK);
    let r, g, bl, flag = 1;
    const bq = bayer(x, y) * 0.85;
    if (mat === EMIT) {
      r = cr(base) * 1.1 * bright; g = cg(base) * 1.1 * bright; bl = cb(base) * 1.1 * bright; flag = 2;
    } else {
      const hemi = 0.5 + 0.5 * nwy, sl = lit * ndl;
      let lr = (amb[0] * hemi + gnd[0] * (1 - hemi)) * aoK + sunC[0] * sl * (0.55 + 0.45 * aoK);
      let lg = (amb[1] * hemi + gnd[1] * (1 - hemi)) * aoK + sunC[1] * sl * (0.55 + 0.45 * aoK);
      let lb = (amb[2] * hemi + gnd[2] * (1 - hemi)) * aoK + sunC[2] * sl * (0.55 + 0.45 * aoK);
      if (mat === CLOUD) { lr = lr * 0.55 + 0.5; lg = lg * 0.55 + 0.5; lb = lb * 0.55 + 0.52; }
      if (mat === GLOW) { lr = Math.max(lr, 1); lg = Math.max(lg, 1); lb = Math.max(lb, 1); flag = 2; }
      lr = Math.floor(lr * bright * 7 + bq) / 7; lg = Math.floor(lg * bright * 7 + bq) / 7; lb = Math.floor(lb * bright * 7 + bq) / 7;
      r = cr(base) * lr; g = cg(base) * lg; bl = cb(base) * lb;
      if (mat === WATER) {
        const st = hash2(vx * 3 + vz, Math.floor(vy * 0.7 + time * 9), vz) ;
        if (axis !== 1 && st < 0.25) { r = r * 0.8 + 50; g = g * 0.8 + 60; bl = bl * 0.8 + 70; }
        if (axis === 1 && nly > 0 && hash2(vx + Math.floor(time * 3), vz, 5) < 0.035) { r = 255; g = 255; bl = 255; flag = 2; }
      }
    }
    if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; bl += (255 - bl) * flash; }
    let c = col(r > 255 ? 255 : r, g > 255 ? 255 : g, bl > 255 ? 255 : bl);
    if (t > fogNear) {
      const f = clamp((t - fogNear) / (fogFar - fogNear)) * fogMax;
      const fq = Math.floor(f * 6 + bayer(x, y) * 0.95) / 6;
      if (fq > 0) c = mix(c, SKY[i], fq > 1 ? 1 : fq);
    }
    s.d[i] = c; s.m[i] = flag; Z[i] = t; ID[i] = id;
  }
}

const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const rgbK = (c, k = 1) => { const h = hex(c); return [(cr(h) / 255) * k, (cg(h) / 255) * k, (cb(h) / 255) * k]; };

// sc: { sky:{stops, sun, sunColor, sunSize, glow, glowK, glowPow, stars, horizon, span},
//       light:{sun, sunColor, sunK, amb, ambK, gnd, gndK, shadows, ao, fogNear, fogFar, fogMax},
//       clouds:{y, colors, scale, speed, fogNear, fogFar}, models:[inst], blobs:[{p, r, k, drop, id}],
//       sprites:[{p, spr, hw, alpha, flag}], points:[{p, c, size, flag}], outline:true, outlineK, rays:{k, color} }
export function render3D(s, cam, sc, time = 0) {
  const W = s.w, H = s.h, n = W * H, b = bufs(n);
  const DIR = b.dir, Z = b.z, ID = b.id, SKY = b.sky;
  const F = cam.f, RR = cam.r, U = cam.u, foc = cam.focal;
  for (let y = 0, k = 0; y < H; y++) {
    const bv = -(y + 0.5 - H / 2);
    for (let x = 0; x < W; x++, k += 3) {
      const a = x + 0.5 - W / 2;
      const dx = F[0] * foc + RR[0] * a + U[0] * bv, dy = F[1] * foc + RR[1] * a + U[1] * bv, dz = F[2] * foc + RR[2] * a + U[2] * bv;
      const l = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      DIR[k] = dx * l; DIR[k + 1] = dy * l; DIR[k + 2] = dz * l;
    }
  }
  // ---- sky ----
  const sk = sc.sky;
  const LUT = getLut(sk.stops), LL = LUT.length - 1;
  const sun = sk.sun ? norm3(sk.sun) : null;
  const sunCos = Math.cos(sk.sunSize ?? 0.03), sunCol = hex(sk.sunColor ?? '#fff4d8'), glowC = hex(sk.glow ?? '#ffcf8a');
  const gk = sk.glowK ?? 0.5, gp = sk.glowPow ?? 8, stars = sk.stars ?? 0, hor = sk.horizon ?? 0.05, span = sk.span ?? 0.8;
  for (let i = 0, k = 0; i < n; i++, k += 3) {
    const x = i % W, y = (i / W) | 0;
    const dx = DIR[k], dy = DIR[k + 1], dz = DIR[k + 2];
    const e = clamp((dy + hor) / span);
    const q = (1 - e) * LL, q0 = Math.floor(q);
    let c = LUT[Math.min(LL, q0 + (bayer(x, y) < q - q0 ? 1 : 0))];
    let flag = 0;
    if (sun) {
      const sd = dx * sun[0] + dy * sun[1] + dz * sun[2];
      if (sd > 0) {
        let g = Math.pow(sd, gp) * gk + Math.pow(sd, gp * 12) * gk * 0.8;
        g = Math.floor(g * 7 + bayer(x, y)) / 7;
        if (g > 0) c = col(Math.min(255, cr(c) + cr(glowC) * g), Math.min(255, cg(c) + cg(glowC) * g), Math.min(255, cb(c) + cb(glowC) * g));
        if (sd > sunCos) { c = sunCol; flag = 2; }
      }
    }
    if (stars > 0 && dy > -0.04) {
      const lon = Math.atan2(dx, dz), lat = Math.asin(Math.max(-1, Math.min(1, dy)));
      const cx = Math.floor(lon * 240), cy = Math.floor(lat * 240);
      const h = hash2(cx, cy, 91);
      if (h < 0.0075 * stars) {
        const tw = 0.6 + 0.4 * Math.sin(time * (1.5 + h * 600) + cx * 0.7);
        const kk = (h < 0.002 * stars ? 1 : 0.5) * tw * clamp(e * 2.5);
        c = col(Math.min(255, cr(c) + 255 * kk), Math.min(255, cg(c) + 245 * kk), Math.min(255, cb(c) + 235 * kk));
        flag = 2;
      }
    }
    SKY[i] = c; s.d[i] = c; s.m[i] = flag; Z[i] = Infinity; ID[i] = 0;
  }
  // ---- light rig ----
  const lt = sc.light || {};
  const L = {
    sun: norm3(lt.sun || sk.sun || [0.4, 0.8, -0.4]),
    sunC: rgbK(lt.sunColor || '#fff0d8', lt.sunK ?? 0.75), amb: rgbK(lt.amb || '#b8c8ff', lt.ambK ?? 0.55), gnd: rgbK(lt.gnd || '#7a6a88', lt.gndK ?? 0.45),
    shadows: lt.shadows, ao: lt.ao, fogNear: lt.fogNear, fogFar: lt.fogFar, fogMax: lt.fogMax,
  };
  // ---- cloud sea ----
  if (sc.clouds && cam.pos[1] > sc.clouds.y) {
    cloudTex();
    const cl = sc.clouds, pal = cl.colors.map(hex), np = pal.length, scl = cl.scale ?? 0.35, cy = cl.y;
    const offX = time * (cl.speed ?? 3), sv = L.sun, fn = cl.fogNear ?? 150, ff = cl.fogFar ?? 1500;
    for (let i = 0, k = 0; i < n; i++, k += 3) {
      const dy = DIR[k + 1];
      if (dy > -0.002) continue;
      const t = (cy - cam.pos[1]) / dy;
      if (t >= Z[i]) continue;
      const u = (cam.pos[0] + DIR[k] * t + offX) * scl, v = (cam.pos[2] + DIR[k + 2] * t) * scl;
      const h0 = ctex(u, v), h1 = ctex(u + sv[0] * 4, v + sv[2] * 4);
      const lv = (h0 - 0.32) * 2.6 + (h0 - h1) * 5 + (ctex(u * 3.1 + 40, v * 3.1) - 0.5) * 0.35;
      const x = i % W, y = (i / W) | 0;
      let c = pal[clamp(Math.floor(lv * np + bayer(x, y) * 0.9), 0, np - 1)];
      const f = clamp((t - fn) / (ff - fn));
      const fq = Math.floor(f * 7 + bayer(x, y)) / 7;
      if (fq > 0) c = mix(c, SKY[i], fq > 1 ? 1 : fq);
      s.d[i] = c; s.m[i] = 0; Z[i] = t; ID[i] = 1;
    }
  }
  // ---- models, near to far ----
  const models = (sc.models || []).filter(Boolean).map((m) => ({ m, dd: (m.pos[0] - cam.pos[0]) ** 2 + (m.pos[1] - cam.pos[1]) ** 2 + (m.pos[2] - cam.pos[2]) ** 2 }));
  models.sort((a, b2) => a.dd - b2.dd);
  for (const { m } of models) castModel(s, cam, b, m, L, time);
  // ---- blob shadows ----
  for (const bs of sc.blobs || []) {
    const [px, py, pz] = bs.p, r = bs.r, kk = bs.k ?? 0.5, drop = bs.drop ?? 80;
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9, ok = true;
    for (const [ex, ey, ez] of [[-r, 0, -r], [r, 0, -r], [-r, 0, r], [r, 0, r], [-r, -drop, -r], [r, -drop, -r], [-r, -drop, r], [r, -drop, r]]) {
      const pr = cam.project([px + ex, py + ey, pz + ez]);
      if (!pr) { ok = false; break; }
      mnx = Math.min(mnx, pr[0]); mxx = Math.max(mxx, pr[0]); mny = Math.min(mny, pr[1]); mxy = Math.max(mxy, pr[1]);
    }
    const xa = ok ? Math.max(0, Math.floor(mnx)) : 0, xb = ok ? Math.min(W - 1, Math.ceil(mxx)) : W - 1;
    const ya = ok ? Math.max(0, Math.floor(mny)) : 0, yb = ok ? Math.min(H - 1, Math.ceil(mxy)) : H - 1;
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const i = y * W + x;
      if (ID[i] < 2 || ID[i] === bs.id) continue;
      const t = Z[i], k = i * 3;
      const hx = cam.pos[0] + DIR[k] * t, hy = cam.pos[1] + DIR[k + 1] * t, hz = cam.pos[2] + DIR[k + 2] * t;
      if (hy > py + 1 || hy < py - drop) continue;
      const q = ((hx - px) ** 2 + (hz - pz) ** 2) / (r * r);
      if (q > 1) continue;
      if (bayer(x, y) < (1 - q) * 1.6) { const c = s.d[i]; s.d[i] = col(cr(c) * (1 - kk), cg(c) * (1 - kk), cb(c) * (1 - kk * 0.8)); }
    }
  }
  // ---- sprites & points (depth tested) ----
  for (const sp of sc.sprites || []) {
    const pr = cam.project(sp.p);
    if (!pr) continue;
    const dist = Math.hypot(sp.p[0] - cam.pos[0], sp.p[1] - cam.pos[1], sp.p[2] - cam.pos[2]);
    const spr = sp.spr, scale = (sp.hw * cam.focal) / pr[2] / spr.h;
    if (scale < 0.03) continue;
    const ow = Math.max(1, Math.round(spr.w * scale)), oh = Math.max(1, Math.round(spr.h * scale));
    const left = Math.round(pr[0] - (spr.ax ?? spr.w / 2) * scale), top = Math.round(pr[1] - (spr.ay ?? spr.h) * scale);
    const a = sp.alpha ?? 1;
    for (let yy = 0; yy < oh; yy++) {
      const y = top + yy;
      if (y < 0 || y >= H) continue;
      const sy = Math.min(spr.h - 1, Math.floor(yy / scale));
      for (let xx = 0; xx < ow; xx++) {
        const x = left + xx;
        if (x < 0 || x >= W) continue;
        const c = spr.d[sy * spr.w + Math.min(spr.w - 1, Math.floor((sp.flip ? ow - 1 - xx : xx) / scale))];
        if (!(c >>> 24)) continue;
        const i = y * W + x;
        if (dist >= Z[i] || (a < 1 && bayer(x, y) >= a)) continue;
        s.d[i] = c; s.m[i] = sp.flag ?? 1; Z[i] = dist; ID[i] = sp.id ?? 0;
      }
    }
  }
  for (const pt of sc.points || []) {
    const pr = cam.project(pt.p);
    if (!pr) continue;
    const dist = Math.hypot(pt.p[0] - cam.pos[0], pt.p[1] - cam.pos[1], pt.p[2] - cam.pos[2]);
    const sz = Math.max(1, Math.round(((pt.size ?? 1) * cam.focal) / pr[2]));
    const c = hex(pt.c);
    for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) {
      const x = Math.round(pr[0] - sz / 2) + xx, y = Math.round(pr[1] - sz / 2) + yy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (dist >= Z[i]) continue;
      if (pt.a !== undefined && pt.a < 1 && bayer(x, y) >= pt.a) continue;
      s.d[i] = c; s.m[i] = pt.flag ?? 2;
    }
  }
  // ---- god rays from the sun ----
  if (sc.rays && sun) {
    const sp = cam.project([cam.pos[0] + sun[0] * 1e5, cam.pos[1] + sun[1] * 1e5, cam.pos[2] + sun[2] * 1e5]);
    if (sp) {
      const RB = b.ray, rc = hex(sc.rays.color ?? '#ffd9a0'), rk = sc.rays.k ?? 0.5;
      for (let i = 0; i < n; i++) RB[i] = ID[i] === 0 ? (cr(s.d[i]) + cg(s.d[i]) + cb(s.d[i])) / 765 : 0;
      const NS = 14;
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x++) {
        let acc = 0, wsum = 0;
        for (let k2 = 1; k2 <= NS; k2++) {
          const u = k2 / NS * 0.65;
          const xs = Math.round(x + (sp[0] - x) * u), ys = Math.round(y + (sp[1] - y) * u);
          const wgt = 1 - u;
          wsum += wgt;
          if (xs >= 0 && ys >= 0 && xs < W && ys < H) acc += RB[ys * W + xs] * wgt;
        }
        let v = (acc / wsum) * rk;
        v = Math.floor(v * 8 + bayer(x, y)) / 8;
        if (v <= 0) continue;
        const i = y * W + x, c = s.d[i];
        s.d[i] = col(Math.min(255, cr(c) + cr(rc) * v), Math.min(255, cg(c) + cg(rc) * v), Math.min(255, cb(c) + cb(rc) * v));
      }
    }
  }
  // ---- pixel-art outlines on silhouettes and big depth creases (faded with fog) ----
  if (sc.outline !== false) {
    const COL = b.col;
    COL.set(s.d);
    const ok = sc.outlineK ?? 0.32;
    const fN = L.fogNear ?? 1e9, fF = L.fogFar ?? 2e9, fM = L.fogMax ?? 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, zi = Z[i], idi = ID[i];
      let bj = -1, bz = zi;
      for (let q = 0; q < 4; q++) {
        let j;
        if (q === 0) { if (x === 0) continue; j = i - 1; } else if (q === 1) { if (x === W - 1) continue; j = i + 1; } else if (q === 2) { if (y === 0) continue; j = i - W; } else { if (y === H - 1) continue; j = i + W; }
        const idj = ID[j], zj = Z[j];
        if (idj < 2) continue;
        if ((idj !== idi && zj < bz * 0.985) || (idj === idi && zj < zi - Math.max(3, zi * 0.06) && zj < bz)) { bj = j; bz = zj; }
      }
      if (bj >= 0) {
        const c = COL[bj], f = clamp((bz - fN) / (fF - fN)) * fM;
        const dark = col(cr(c) * ok, cg(c) * ok, cb(c) * ok + 6);
        s.d[i] = f > 0.02 ? mix(dark, COL[i], Math.min(1, f * 1.15)) : dark; s.m[i] = 0;
      }
    }
  }
  return b;
}

// orbit/dolly helpers
export function lookCam(W, H, pos, target, fov = 0.9, roll = 0) {
  const cam = new Cam3({ w: W, h: H });
  cam.lookAt(pos, target, fov, roll);
  return cam;
}
