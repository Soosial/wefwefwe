// Software 3D for the "pixel 3D" shots: camera, voxel-model raycaster (DDA), billboards with z-buffer,
// and a VoxelSpace (Comanche-style) heightfield renderer for island flyovers.
import { col, cr, cg, cb, hex, bayer, mix } from './fb.mjs';
import { clamp, fbm, noise2, hash2 } from './math.mjs';

export class Cam3 {
  constructor(o = {}) {
    this.w = o.w ?? 480; this.h = o.h ?? 270;
    this.set(o.pos ?? [0, 0, -10], o.yaw ?? 0, o.pitch ?? 0, o.fov ?? 0.9, o.roll ?? 0);
  }
  set(pos, yaw, pitch, fov = this.fov, roll = 0) {
    this.pos = pos; this.yaw = yaw; this.pitch = pitch; this.fov = fov; this.roll = roll;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    this.f = [sy * cp, sp, cy * cp];
    let r = [cy, 0, -sy];
    let u = [-sy * sp, cp, -cy * sp];
    if (roll) {
      const cr2 = Math.cos(roll), sr = Math.sin(roll);
      const r2 = r.map((v, i) => v * cr2 + u[i] * sr), u2 = u.map((v, i) => u[i] * cr2 - r[i] * sr);
      r = r2; u = u2;
    }
    this.r = r; this.u = u;
    this.focal = (this.h / 2) / Math.tan(fov / 2);
    return this;
  }
  lookAt(pos, target, fov = this.fov, roll = 0) {
    const d = [target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]];
    const yaw = Math.atan2(d[0], d[2]), pitch = Math.atan2(d[1], Math.hypot(d[0], d[2]));
    return this.set(pos, yaw, pitch, fov, roll);
  }
  project(p) {
    const x = p[0] - this.pos[0], y = p[1] - this.pos[1], z = p[2] - this.pos[2];
    const zc = x * this.f[0] + y * this.f[1] + z * this.f[2];
    const xc = x * this.r[0] + y * this.r[1] + z * this.r[2];
    const yc = x * this.u[0] + y * this.u[1] + z * this.u[2];
    if (zc <= 0.05) return null;
    return [this.w / 2 + (xc * this.focal) / zc, this.h / 2 - (yc * this.focal) / zc, zc];
  }
  dir(sx, sy) {
    const a = sx + 0.5 - this.w / 2, b = -(sy + 0.5 - this.h / 2), F = this.focal;
    const d = [this.f[0] * F + this.r[0] * a + this.u[0] * b, this.f[1] * F + this.r[1] * a + this.u[1] * b, this.f[2] * F + this.r[2] * a + this.u[2] * b];
    const l = Math.hypot(d[0], d[1], d[2]);
    return [d[0] / l, d[1] / l, d[2] / l];
  }
}

// ---------- voxel models ----------
export function makeVolume(w, h, d) { return { w, h, d, data: new Uint32Array(w * h * d) }; }

// Extrude a sprite ({w,h,d:Uint32Array}) into a pillowy voxel model. maxDepth in voxels.
export function spriteToVoxels(spr, maxDepth = 10, minDepth = 2) {
  const { w, h } = spr;
  // distance-to-edge transform (chamfer)
  const dist = new Float32Array(w * h).fill(1e9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!(spr.d[y * w + x] >>> 24)) dist[y * w + x] = 0;
  const pass = (x, y, dx, dy, c) => { const i = y * w + x; const nx = x + dx, ny = y + dy; const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : dist[ny * w + nx]; if (v + c < dist[i]) dist[i] = v + c; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { pass(x, y, -1, 0, 1); pass(x, y, 0, -1, 1); pass(x, y, -1, -1, 1.4); pass(x, y, 1, -1, 1.4); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { pass(x, y, 1, 0, 1); pass(x, y, 0, 1, 1); pass(x, y, 1, 1, 1.4); pass(x, y, -1, 1, 1.4); }
  const D = maxDepth;
  const V = makeVolume(w, h, D);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = spr.d[y * w + x];
    if (!(c >>> 24)) continue;
    const th = clamp(Math.round(minDepth + Math.sqrt(dist[y * w + x]) * (D - minDepth) / 4), minDepth, D);
    const z0 = Math.floor((D - th) / 2);
    const vy = h - 1 - y;
    for (let z = z0; z < z0 + th; z++) V.data[x + w * (vy + h * z)] = c;
  }
  return V;
}

// Rotation helpers: R = Ry(yaw) * Rx(pitch) * Rz(roll)
export function rotMat(yaw = 0, pitch = 0, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr2 = Math.cos(roll), sr = Math.sin(roll);
  // columns are local axes in world space
  const Rz = [[cr2, -sr, 0], [sr, cr2, 0], [0, 0, 1]];
  const Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const m = (A, B) => A.map((r, i) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  return m(Ry, m(Rx, Rz));
}

// models: [{ vol, pos:[x,y,z], rot:3x3, scale, light? , emissive? }]
// Renders into surface s (screen space, ignores s.tx/ty) with z-buffer zb (Float32Array s.w*s.h).
export function renderVoxels(s, zb, cam, models, o = {}) {
  const L = o.light ?? normalize([-0.5, 0.7, -0.6]);
  const amb = o.ambient ?? 0.45, diff = o.diffuse ?? 0.75;
  const rimC = o.rim ? hex(o.rim) : 0, rimK = o.rimK ?? 0.35;
  for (const M of models) {
    const { vol, pos, rot, scale } = M;
    const { w, h, d, data } = vol;
    // screen bbox of the model's corners
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, any = false;
    for (let i = 0; i < 8; i++) {
      const lx = (i & 1 ? w : 0) - w / 2, ly = (i & 2 ? h : 0) - h / 2, lz = (i & 4 ? d : 0) - d / 2;
      const wp = [pos[0] + (rot[0][0] * lx + rot[0][1] * ly + rot[0][2] * lz) * scale, pos[1] + (rot[1][0] * lx + rot[1][1] * ly + rot[1][2] * lz) * scale, pos[2] + (rot[2][0] * lx + rot[2][1] * ly + rot[2][2] * lz) * scale];
      const p = cam.project(wp);
      if (!p) { any = false; minX = 0; minY = 0; maxX = s.w - 1; maxY = s.h - 1; break; }
      any = true;
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    const x0 = clamp(Math.floor(minX) - 1, 0, s.w - 1), x1 = clamp(Math.ceil(maxX) + 1, 0, s.w - 1);
    const y0 = clamp(Math.floor(minY) - 1, 0, s.h - 1), y1 = clamp(Math.ceil(maxY) + 1, 0, s.h - 1);
    // inverse transform: local = R^T (p - pos) / scale + half
    const RT = [[rot[0][0], rot[1][0], rot[2][0]], [rot[0][1], rot[1][1], rot[2][1]], [rot[0][2], rot[1][2], rot[2][2]]];
    const oc = [cam.pos[0] - pos[0], cam.pos[1] - pos[1], cam.pos[2] - pos[2]];
    const oL = [(RT[0][0] * oc[0] + RT[0][1] * oc[1] + RT[0][2] * oc[2]) / scale + w / 2, (RT[1][0] * oc[0] + RT[1][1] * oc[1] + RT[1][2] * oc[2]) / scale + h / 2, (RT[2][0] * oc[0] + RT[2][1] * oc[1] + RT[2][2] * oc[2]) / scale + d / 2];
    const ML = M.light ? normalize(M.light) : L;
    const tint = M.tint ? hex(M.tint[0]) : 0, tintK = M.tint ? M.tint[1] : 0;
    for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) {
      const dw = cam.dir(sx, sy);
      const dl = [(RT[0][0] * dw[0] + RT[0][1] * dw[1] + RT[0][2] * dw[2]) / scale, (RT[1][0] * dw[0] + RT[1][1] * dw[1] + RT[1][2] * dw[2]) / scale, (RT[2][0] * dw[0] + RT[2][1] * dw[1] + RT[2][2] * dw[2]) / scale];
      // slab intersection
      let tmin = 0, tmax = 1e9;
      const B = [w, h, d];
      let ok = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(dl[a]) < 1e-9) { if (oL[a] < 0 || oL[a] > B[a]) { ok = false; break; } continue; }
        let t1 = (0 - oL[a]) / dl[a], t2 = (B[a] - oL[a]) / dl[a];
        if (t1 > t2) { const q = t1; t1 = t2; t2 = q; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) { ok = false; break; }
      }
      if (!ok) continue;
      const zi = sy * s.w + sx;
      if (tmin >= zb[zi]) continue;
      // DDA
      const te = tmin + 1e-4;
      let vx = Math.floor(oL[0] + dl[0] * te), vy = Math.floor(oL[1] + dl[1] * te), vz = Math.floor(oL[2] + dl[2] * te);
      vx = clamp(vx, 0, w - 1); vy = clamp(vy, 0, h - 1); vz = clamp(vz, 0, d - 1);
      const stX = dl[0] > 0 ? 1 : -1, stY = dl[1] > 0 ? 1 : -1, stZ = dl[2] > 0 ? 1 : -1;
      const tdX = Math.abs(1 / dl[0]), tdY = Math.abs(1 / dl[1]), tdZ = Math.abs(1 / dl[2]);
      let tmX = dl[0] !== 0 ? ((stX > 0 ? vx + 1 : vx) - oL[0]) / dl[0] : 1e9;
      let tmY = dl[1] !== 0 ? ((stY > 0 ? vy + 1 : vy) - oL[1]) / dl[1] : 1e9;
      let tmZ = dl[2] !== 0 ? ((stZ > 0 ? vz + 1 : vz) - oL[2]) / dl[2] : 1e9;
      // entering face axis
      let axis = 0;
      { const ex = (oL[0] + dl[0] * te), ey = (oL[1] + dl[1] * te), ez = (oL[2] + dl[2] * te);
        const fx = Math.min(Math.abs(ex), Math.abs(ex - w)), fy = Math.min(Math.abs(ey), Math.abs(ey - h)), fz = Math.min(Math.abs(ez), Math.abs(ez - d));
        axis = fx <= fy && fx <= fz ? 0 : fy <= fz ? 1 : 2; }
      let tcur = tmin, hit = 0;
      for (let n = 0; n < 400; n++) {
        if (vx < 0 || vy < 0 || vz < 0 || vx >= w || vy >= h || vz >= d) break;
        const c = data[vx + w * (vy + h * vz)];
        if (c) { hit = c; break; }
        if (tmX < tmY && tmX < tmZ) { vx += stX; tcur = tmX; tmX += tdX; axis = 0; }
        else if (tmY < tmZ) { vy += stY; tcur = tmY; tmY += tdY; axis = 1; }
        else { vz += stZ; tcur = tmZ; tmZ += tdZ; axis = 2; }
      }
      if (!hit) continue;
      const tw = tcur * scale; // world distance along ray (dw normalized, dl scaled by 1/scale)
      if (tw >= zb[zi]) continue;
      zb[zi] = tw;
      // normal in local space
      const nl = [0, 0, 0];
      nl[axis] = axis === 0 ? -stX : axis === 1 ? -stY : -stZ;
      const nw = [rot[0][0] * nl[0] + rot[0][1] * nl[1] + rot[0][2] * nl[2], rot[1][0] * nl[0] + rot[1][1] * nl[1] + rot[1][2] * nl[2], rot[2][0] * nl[0] + rot[2][1] * nl[1] + rot[2][2] * nl[2]];
      let lam = Math.max(0, nw[0] * ML[0] + nw[1] * ML[1] + nw[2] * ML[2]);
      let k = (M.ambient ?? amb) + (M.diffuse ?? diff) * lam;
      k = Math.floor(k * 6 + bayer(sx, sy) * 0.7) / 6; // banded voxel shading
      let c = hit;
      if (tintK) c = mix(c, tint, tintK);
      let r = cr(c) * k, g = cg(c) * k, b = cb(c) * k;
      // rim light on faces facing away from the camera direction
      const facing = -(nw[0] * dw[0] + nw[1] * dw[1] + nw[2] * dw[2]);
      if (rimC && facing < 0.35) { const q = (0.35 - facing) * rimK * 2.5; r += cr(rimC) * q; g += cg(rimC) * q; b += cb(rimC) * q; }
      if (M.emissive) { r += cr(c) * M.emissive; g += cg(c) * M.emissive; b += cb(c) * M.emissive; }
      s.d[zi] = col(Math.min(255, r), Math.min(255, g), Math.min(255, b));
      s.m[zi] = M.flag ?? 1;
    }
  }
}

export function normalize(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

// Billboard a sprite at world position p with world-space height hw. Depth tested.
export function billboard(s, zb, cam, p, spr, hw, o = {}) {
  const P = cam.project(p);
  if (!P) return null;
  const sc = (hw * cam.focal) / P[2] / spr.h;
  if (sc < 0.02) return P;
  const ow = Math.max(1, Math.round(spr.w * sc)), oh = Math.max(1, Math.round(spr.h * sc));
  const left = Math.round(P[0] - (spr.ax ?? spr.w / 2) * sc), top = Math.round(P[1] - (spr.ay ?? spr.h) * sc);
  const a = o.alpha ?? 1;
  for (let y = 0; y < oh; y++) {
    const sy = top + y;
    if (sy < 0 || sy >= s.h) continue;
    const srcY = Math.min(spr.h - 1, Math.floor(y / sc));
    for (let x = 0; x < ow; x++) {
      const sx = left + x;
      if (sx < 0 || sx >= s.w) continue;
      const c = spr.d[srcY * spr.w + Math.min(spr.w - 1, Math.floor(x / sc))];
      if (!(c >>> 24)) continue;
      const zi = sy * s.w + sx;
      if (P[2] >= zb[zi]) continue;
      if (a < 1 && bayer(sx, sy) >= a) continue;
      zb[zi] = P[2];
      s.d[zi] = o.dark ? col(cr(c) * o.dark, cg(c) * o.dark, cb(c) * o.dark) : c;
      s.m[zi] = o.flag ?? 1;
    }
  }
  return [P[0], P[1], P[2], sc];
}

// ---------- VoxelSpace terrain ----------
// terrain: { size, hm: Float32Array, cm: Uint32Array, em?: Uint8Array }
export function voxelSpace(s, cam, T, o = {}) {
  const W = s.w, H = s.h;
  const ybuf = new Int32Array(W).fill(H);
  const yaw = cam.yaw;
  const sinA = Math.sin(yaw), cosA = Math.cos(yaw);
  const px = cam.pos[0], py = cam.pos[2], ph = cam.pos[1];
  const horizon = o.horizon ?? H * 0.35;
  const scaleH = o.scaleH ?? 240;
  const maxD = o.dist ?? 900;
  const fogC = hex(o.fog ?? '#2a2a62'), fogStart = o.fogStart ?? 0.35;
  const N = T.size, mask = N - 1;
  let z = 1, dz = 0.5;
  const fovk = o.fovk ?? 1;
  while (z < maxD) {
    // frustum line at distance z (right vector = (cosA, -sinA), forward = (sinA, cosA))
    const lx = px + sinA * z - cosA * z * fovk, ly = py + cosA * z + sinA * z * fovk;
    const rx = px + sinA * z + cosA * z * fovk, ry = py + cosA * z - sinA * z * fovk;
    const dx = (rx - lx) / W, dy = (ry - ly) / W;
    let x = lx, y = ly;
    const invz = 1 / z;
    const fog = clamp((z / maxD - fogStart) / (1 - fogStart));
    for (let i = 0; i < W; i++) {
      const fx0 = Math.floor(x), fy0 = Math.floor(y);
      const inside = !T.chm || (fx0 >= 0 && fy0 >= 0 && fx0 < N && fy0 < N);
      const ix = fx0 & mask, iy = fy0 & mask;
      const k = iy * N + ix;
      const hgt = inside ? T.hm[k] : T.chm[k];
      const hs = Math.floor((ph - hgt) * invz * scaleH + horizon);
      if (hs < ybuf[i]) {
        let c = inside ? T.cm[k] : T.ccm[k];
        const fq = Math.floor(fog * 6 + bayer(i, hs) * 0.9) / 6;
        if (fq > 0) c = mix(c, fogC, fq);
        const top = Math.max(0, hs);
        const em = T.em && T.em[k] ? 2 : 1;
        // top 2px keep the surface colour, the rest of a tall segment is a darker cliff wall
        const wall = ybuf[i] - top > 3 ? mix(c, '#141430', 0.5) : c;
        for (let yy = top; yy < ybuf[i]; yy++) { s.d[yy * W + i] = yy - top < 2 ? c : wall; s.m[yy * W + i] = em; }
        ybuf[i] = top;
      }
      x += dx; y += dy;
    }
    z += dz;
    dz += 0.012;
  }
  return ybuf;
}

// Procedural floating island over a sea of clouds. day: 0 night .. 1 dawn
export function buildIsland(size = 512) {
  const N = size, hm = new Float32Array(N * N), chm = new Float32Array(N * N), kind = new Uint8Array(N * N);
  const cx = N / 2, cy = N / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - cx) / (N * 0.3), dy = (y - cy) / (N * 0.26);
    const r = Math.hypot(dx, dy);
    const n = fbm(x / 60, y / 60, 5, 21);
    const edge = 1 - r + (n - 0.5) * 0.22;
    chm[y * N + x] = -14 + fbm(x / 30, y / 30, 4, 77) * 9 + fbm(x / 9, y / 9, 2, 7) * 2;
    const i = y * N + x;
    if (edge > 0) {
      const hill = 26 * Math.exp(-(((x - cx - 10) / 40) ** 2 + ((y - cy + 6) / 36) ** 2));
      hm[i] = 34 + Math.min(1, edge * 6) * 10 + fbm(x / 24, y / 24, 4, 5) * 10 + hill;
      kind[i] = 1;
    } else {
      // cloud sea: low flat billows well below the island top
      hm[i] = chm[i];
      kind[i] = 0;
    }
  }
  return { size: N, hm, chm, kind };
}
// colourize island for a palette: { grass:[..], cliff, cloud:[..], lights }
export function paintIsland(I, pal, o = {}) {
  const N = I.size;
  const cm = new Uint32Array(N * N), em = new Uint8Array(N * N), ccm = new Uint32Array(N * N);
  const cloudC = (hh, sh, x, y) => cl[clamp(Math.floor(((hh + 14) / 11) * 1.6 + sh * 2.6 + bayer(x, y) * 0.7), 0, cl.length - 1)];
  const g = pal.grass.map(hex), cl = pal.cloud.map(hex);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const h = I.hm[i];
    const sx = I.hm[y * N + ((x + 1) & (N - 1))] - I.hm[y * N + ((x - 1) & (N - 1))];
    const sy2 = I.hm[((y + 1) & (N - 1)) * N + x] - I.hm[((y - 1) & (N - 1)) * N + x];
    const shade = clamp(0.55 - sx * 0.12 + sy2 * 0.08, 0, 1);
    if (I.kind[i]) {
      let idx = clamp(Math.floor(shade * 4 + bayer(x, y) * 0.8), 0, 3);
      let c = g[idx];
      // trees (dark clumps) & paths
      const tr = fbm(x / 7, y / 7, 2, 44);
      if (tr > 0.62 && h < 85) c = mix(g[0], '#0e2a1a', 0.35);
      if (Math.abs(fbm(x / 40, y / 40, 2, 3) - 0.5) < 0.012) c = hex(pal.path ?? '#b08a5a');
      // village lights / lanterns
      if (o.lights && hash2(x, y, 9) < o.lights && h < 80) { c = hex(hash2(x, y, 10) < 0.5 ? '#ffd27a' : '#ff9a5a'); em[i] = 1; }
      cm[i] = c;
    } else {
      cm[i] = cloudC(h, shade, x, y);
    }
  }
  if (I.chm) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const H0 = I.chm;
    const sx = H0[y * N + ((x + 1) & (N - 1))] - H0[y * N + ((x - 1) & (N - 1))];
    const sy2 = H0[((y + 1) & (N - 1)) * N + x] - H0[((y - 1) & (N - 1)) * N + x];
    ccm[y * N + x] = cloudC(H0[y * N + x], clamp(0.55 - sx * 0.12 + sy2 * 0.08, 0, 1), x, y);
  }
  return { size: N, hm: I.hm, cm, em, chm: I.chm, ccm };
}
