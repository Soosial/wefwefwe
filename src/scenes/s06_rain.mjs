// Scene 6 — Rain. Gemini sits alone by the sagging lantern. Top-down: the puddle shows the memory of the
// first spark (bright Gemini handing fire to little Clawd and Codex) until a tear breaks the image. One ember remains.
import { hillSet, AMB, STAGE_X, gy, clamp, track, osc, hash, phase } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { lantern, tag, caption, rain, splashes, sparkle } from '../world/props.mjs';
import { Surface, rect, pset, hex, mix, glow, line, col, cr, cg, cb, bayer, disc, ring } from '../core/fb.mjs';
import { cloudSea } from '../world/sky.mjs';
import { noise2, fbm } from '../core/math.mjs';

const GX = 420, LX = 392;
export const SFX = [
  [0, 'rain', { dur: 13.2, gain: 0.85 }],
  [1.2, 'thunder'],
  [5.35, 'whooshSoft'],
  [6.3, 'shimmer', { dur: 2.4 }],
  [8.9, 'drip'],
  [8.98, 'rippleSwell'],
  [9.95, 'whooshSoft', { pitch: 0.8 }],
  [10.6, 'emberFlicker', { dur: 2.3 }],
  [11.7, 'sniff'],
];

const RAIN_CLOUD = ['#1a2030', '#252d42', '#323c56', '#465070'];
const memA = new Surface(200, 130), memB = new Surface(200, 130);

function drawMemory(t) {
  // A: gray Gemini looking up from the water. B: the bright memory of the first spark.
  memA.d.fill(0); memB.d.fill(0);
  drawGemini(memA, 100, 118, { scale: 2, hover: 0, sat: 0.1, sharp: 0.84, R: 24, eyes: 'sad', mouth: 'frown', shadow: false });
  drawGemini(memB, 100, 118, { scale: 2, hover: 0, eyes: 'happy', mouth: 'open', handL: [2, -6], handR: [-2, -6], shadow: false });
  drawClawd(memB, 30, 124, { eyes: 'star', mouth: 'open', armR: -6, shadow: false });
  drawCodex(memB, 172, 124, { screen: { mode: 'face', face: 'happy' }, handL: [-2, -8], shadow: false });
  const sx = 100, sy = 58;
  memB.flag = 2;
  for (let i = 0; i < 4; i++) {
    const a = t * 1.6 + i * Math.PI / 2;
    for (let j = 1; j <= 9; j++) pset(memB, sx + Math.cos(a) * j, sy + Math.sin(a) * j, j < 4 ? '#ffffff' : ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i]);
  }
  disc(memB, sx, sy, 3, '#fffbe6');
  memB.flag = 1;
}

function puddleTopDown(f, s, t) {
  const W = s.w, H = s.h;
  drawMemory(t);
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

export default {
  id: 'rain', dur: 13,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    const top = t >= 5.5 && t < 10;
    if (top) {
      const s = f.camera(240, 135, 1);
      puddleTopDown(f, s, t);
      rain(s, t, { n: 90, speed: 120, slant: 0, len: 2, c: '#9fb0d8', alpha: 0.35 });
      caption(f.ui, '...остался совсем один.', t, 6.2, 9.6);
      f.ambient = null;
      f.bloomOpts = { strength: 0.8 };
      f.gradeOpts = { sat: 0.9, contrast: 1.05 };
      f.vig = 0.55;
      f.fade = Math.max(1 - phase(t, 5.5, 5.9), phase(t, 9.7, 10)) * 0.9;
      return;
    }
    const close = t >= 10;
    const zoom = close ? track(t, [[10, 2.2], [13, 2.5]]) : track(t, [[0, 1.12], [5.5, 1.6, 'inOutSine']]);
    const cx = close ? GX + 2 : track(t, [[0, 452], [5.5, 424, 'inOutSine']]);
    const cy = close ? gy(GX) - 22 : track(t, [[0, 140], [5.5, 168, 'inOutSine']]);
    const s = f.camera(cx, cy, zoom);
    const flash = t > 1.2 && t < 1.55 ? (1 - (t - 1.2) / 0.35) : 0;
    f.ambient = [AMB.rain[0] + flash * 0.6, AMB.rain[1] + flash * 0.6, AMB.rain[2] + flash * 0.7];
    hillSet(f, s, t, {
      sky: 'rain', starCount: 0, milky: 0, signFront: 'ОКТЯБРЬ', villageLights: 0, wind: 2.2, flowers: 0.02,
      cloudCols: RAIN_CLOUD, cloudFill: '#1a2030', cloudCols2: ['#20283a', '#2c3550', '#3a4664', '#4e5a7c'],
      islandTop: '#2c3448', islandBody: '#1c2232', islandDark: '#151a28', fall: '#56607e',
      beforeFar: (S) => {
        cloudSea(S, t, { y: -46, h: 90, parallax: 0.1, speed: 5, seed: 21, colors: ['#151a28', '#1e2536', '#283048', '#38425e'] });
        if (t > 1.15 && t < 1.45) S.with({ flag: 2 }, () => {
          let x = 300 - S.tx * 0.1, y = 30;
          for (let k = 0; k < 9; k++) { const nx = x + (hash(k + 5) - 0.5) * 16, ny = y + 10; line(S, x, y, nx, ny, '#e6f0ff'); x = nx; y = ny; }
        });
      },
    });
    lantern(s, LX, gy(LX), { w: 28, h: 32, paper: '#b8b4ac', lit: 0, t, deflate: 1, noGlow: true });
    tag(s, LX + 2, gy(LX) - 6, 'COMING SOON', { ink: '#8a3a32', paper: '#c8c2b4' });
    // puddle
    const px = GX + 24, py = gy(GX + 24) + 2;
    f.after.push((S) => {
      for (let dy = 0; dy < 4; dy++) {
        const half = 18 * Math.sqrt(1 - (dy / 4) ** 2);
        for (let x = Math.round(px - half); x < Math.round(px + half); x++) {
          const sx = x - S.tx, sy = py + dy - S.ty;
          if (sx < 0 || sy < 0 || sx >= S.w || sy >= S.h) continue;
          const ry = py - dy * 3 - 2 - S.ty;
          let c = ry >= 0 && ry < S.h ? S.d[ry * S.w + Math.min(S.w - 1, Math.max(0, sx + Math.round(Math.sin(t * 7 + dy) * 1)))] : hex('#20283a');
          S.d[sy * S.w + sx] = mix(c, '#202a44', 0.45 + dy * 0.08);
        }
      }
    });
    // Gemini, curled up
    const ember = close;
    const sat = 0.12, eyes = close ? (t > 11.6 && t < 12.1 ? 'blink' : 'teary') : t > 4.4 ? 'sad' : 'half';
    drawGemini(s, GX, gy(GX), {
      hover: 0.5, sat, sharp: 0.84, R: 24, sy: 0.93, sx: 1.04, eyes, mouth: 'frown', tears: close ? 1 : t > 3 ? 0.5 : 0,
      lookY: 1, look: t > 4.4 && !close ? 1 : 0, handL: [4, 3], handR: [-4, 3], shadowY: gy(GX) + 1, shadowW: 22,
    });
    if (ember) {
      const fl = 0.45 + 0.35 * noise2(t * 3, 1, 2) - 0.3 * phase(t, 11.8, 12.3) + 0.35 * phase(t, 12.5, 12.9);
      const ex = GX, ey = gy(GX) - 15;
      const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
      sparkle(s, ex, ey, fl > 0.55 ? 2 : 1, cols[Math.floor(t * 5) % 4], clamp(fl + 0.2));
      glow(s, ex, ey, 14, '#fff0c8', 0.6 * fl, 5);
      f.light(ex, ey, 30, '#fff0c8', 0.9 * fl);
    }
    rain(s, t, { n: close ? 160 : 340, speed: 300, slant: 0.22, len: close ? 4 : 6, c: '#9fb0d8', alpha: 0.5 });
    splashes(s, t, gy, { n: 30, c: '#9fb0d8' });
    caption(f.ui, 'Тот, кто зажёг самую первую искру...', t, 0.8, 5.3);
    f.bloomOpts = { strength: 0.6 };
    f.gradeOpts = { sat: 0.55, contrast: 1.06, tint: [0.92, 0.97, 1.08] };
    f.vig = 0.5;
    f.fade = phase(t, 9.9, 10.0) * (1 - phase(t, 10.0, 10.4)) * 0.8 + phase(t, 12.4, 13) * 0.3;
    if (flash) { f.fadeColor = 0xffe8f0ff; f.fade = flash * 0.5; }
  },
};
