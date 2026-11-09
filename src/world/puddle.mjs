// Top-down puddle used by the rain scene: a still water surface that shows a memory surface (memB) and
// the present reflection (memA); a falling tear sends a ripple that breaks the memory.
import { hex, mix, pset, glow, bayer, disc, ring, Surface } from '../core/fb.mjs';
import { clamp, hash, phase, noise2, fbm } from '../core/math.mjs';

export const memA = new Surface(200, 130), memB = new Surface(200, 130);

export function puddleTopDown(f, s, t, mem) {
  const W = s.w, H = s.h;
  (mem || drawMemory)(t);
  const morph = phase(t, 6.3, 7.1) * (1 - phase(t, 9.0, 9.7));
  const tearR = t > 8.98 ? (t - 8.98) * 120 : -1;
  const drops = [];
  for (let i = 0; i < 14; i++) { const ph = (t * 0.9 + hash(i)) % 1; drops.push([hash(i * 7 + Math.floor(t * 0.9 + hash(i))) * W, hash(i * 13 + Math.floor(t * 0.9 + hash(i))) * H, ph]); }
  const water = hex('#141c30'), water2 = hex('#1e2a46'), sky = hex('#3a4868');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x - W / 2) / (W * 0.47), ny = (y - H / 2) / (H * 0.46);
    const edge = nx * nx + ny * ny + (noise2(x * 0.05, y * 0.05, 3) - 0.5) * 0.35;
    const i = y * W + x;
    if (edge > 1) { // wet soil and grass around the puddle
      const g = fbm(x * 0.08, y * 0.08, 3, 5);
      const c = edge < 1.08 ? '#2a2420' : g > 0.55 ? '#2f5a34' : g > 0.45 ? '#264a2c' : '#3a2e24';
      s.d[i] = mix(hex(c), '#1a2030', 0.35); s.m[i] = 0;
      if (hash(x * 977 + y * 131) < 0.02) s.d[i] = hex('#4a7a4a');
      continue;
    }
    // ripple distortion from rain and the tear
    let ox = Math.sin(y * 0.18 + t * 2.2) * 1.2 + Math.sin(x * 0.07 - t * 1.3) * 0.8;
    let oy = Math.sin(x * 0.15 + t * 1.8) * 0.8;
    if (tearR > 0) {
      const d = Math.hypot(x - W / 2, y - H / 2 + 6);
      const w = Math.exp(-((d - tearR) ** 2) / 120) * 6 * Math.max(0, 1 - (t - 8.98) / 1.2);
      ox += w * (x - W / 2) / (d + 1); oy += w * (y - H / 2) / (d + 1);
    }
    const mx = Math.round(x - W / 2 + 100 + ox), my = Math.round(y - H / 2 + 66 + oy);
    let c = mix(water, water2, clamp(0.5 + ny * 0.4 + (noise2(x * 0.03, y * 0.03 + t * 0.2, 9) - 0.5) * 0.6));
    if (mx >= 0 && my >= 0 && mx < 200 && my < 130) {
      const useB = bayer(x, y) < morph;
      const src = useB ? memB : memA;
      const p = src.d[my * 200 + mx];
      if (p >>> 24) c = mix(p, useB ? '#28305a' : '#1a2440', useB ? 0.18 : 0.38);
      if (useB && (src.m[my * 200 + mx] & 2)) s.m[i] = 2;
    }
    if (bayer(x, y) < 0.06 && noise2(x * 0.02 + t * 0.1, y * 0.2, 4) > 0.62) c = mix(c, sky, 0.6);
    s.d[i] = c;
  }
  for (const [x, y, ph] of drops) ring(s, x, y, 1 + ph * 14, mix('#8fa6e8', '#141c30', ph), 1, (1 - ph) * 0.7);
  // the tear falling into the middle
  if (t > 8.55 && t < 8.98) {
    const u = phase(t, 8.55, 8.98, 'inQuad');
    const ty = -6 + (H / 2 - 6 + 6) * u;
    disc(s, W / 2, ty, 2.2, '#bfe6ff'); pset(s, W / 2 - 1, ty - 1, '#ffffff');
  }
  if (tearR > 0 && tearR < 260) ring(s, W / 2, H / 2 - 6, tearR, '#cfe0ff', 1, Math.max(0, 1 - tearR / 260));
  glow(s, W / 2, H / 2 - 30, 60, '#fff2c8', 0.35 * morph, 6);
}
