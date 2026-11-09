// Scene 9 — Comeback. Time-lapse: the three build a giant four-colour lantern; Gemini lights it with the spark
// from Clawd's lantern; pixel-3D (VoxelSpace) flight following it over the floating island; it becomes the "Gemini 4" star.
import { hillSet, crowd, say, label, skyLights, SKY, AMB, gy, TREE_X, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { lantern, caption, sparkle, confetti } from '../world/props.mjs';
import { skyGradient, stars, milkyWay, SKIES } from '../world/sky.mjs';
import { Surface, rect, pset, hex, mix, glow, line, ring } from '../core/fb.mjs';
import { blit } from '../core/sprite.mjs';
import { text, textWidth } from '../core/font.mjs';
import { buildIsland, paintIsland, voxelSpace } from '../core/three.mjs';
import { ease, TAU } from '../core/math.mjs';

const LX = 578; // build site, under the tree
export const SFX = [
  [0.0, 'workshop', { dur: 6.2 }],
  [0.15, 'whooshSoft', { pitch: 1.3 }], [1.6, 'whooshSoft', { pitch: 1.4 }], [3.1, 'whooshSoft', { pitch: 1.5 }], [4.6, 'whooshSoft', { pitch: 1.6 }],
  [5.4, 'chime', { pitch: 1.2 }],
  [6.6, 'crowdAmb', { dur: 3.2, gain: 0.5 }],
  [7.6, 'babble', { who: 'gemini', n: 3 }],
  [8.2, 'ignite', { gain: 0.9 }],
  [8.25, 'magicRise', { dur: 1.4 }],
  [9.2, 'cheer', { dur: 2.0, k: 0.9 }],
  [9.6, 'flyWind', { dur: 5.0 }],
  [14.6, 'whooshSoft'],
  [15.55, 'starBurst'],
  [15.7, 'cheer', { dur: 2.3, k: 1.4 }],
  [16.0, 'firework', { pan: -0.5 }], [16.5, 'firework', { pan: 0.5, pitch: 1.2 }], [17.0, 'firework', { pan: -0.2, pitch: 0.9 }],
];

let ISLAND = null, LSPR = null;
function island() {
  if (ISLAND) return ISLAND;
  const I = buildIsland(256);
  ISLAND = paintIsland(I, { grass: ['#1f4430', '#2a5a3a', '#367046', '#4a8a52'], cloud: ['#2a3070', '#3a4288', '#4e58a2', '#6a74bc', '#8a94d6'], path: '#7a6a52' }, { lights: 0.004 });
  return ISLAND;
}
// big lantern rendered once into a sprite for 3D billboarding
function lanternSprite(t) {
  if (!LSPR) LSPR = new Surface(56, 64);
  LSPR.d.fill(0);
  lantern(LSPR, 28, 60, { w: 42, h: 50, patch: true, lit: 1, t, noGlow: true });
  text(LSPR, '4', 28, 26, { align: 'center', font: 'press', color: '#ffffff', outline: '#2a1a40' });
  return { w: 56, h: 64, d: LSPR.d, ax: 28, ay: 60 };
}
// lantern revealed from the bottom up to `reveal` (0..1) of its height
const WS = new Surface(56, 64);
function partialLantern(s, x, y, o, reveal) {
  WS.d.fill(0);
  lantern(WS, 28, 60, { ...o, noGlow: true });
  const cut = Math.round(60 - o.h * reveal);
  for (let yy = Math.max(0, cut); yy < 64; yy++) for (let xx = 0; xx < 56; xx++) {
    const c = WS.d[yy * 56 + xx];
    if (c >>> 24) pset(s, x - 28 + xx, y - 60 + yy, c);
  }
}

function workshop(f, t) {
  const s = f.camera(track(t, [[0, 566], [6.6, 572]]), track(t, [[0, 150], [6.6, 146]]), track(t, [[0, 1.4], [6.6, 1.3]]));
  f.ambient = AMB.night;
  // time-lapse: moon and stars race
  hillSet(f, s, t * 6, { sky: 'night', starCount: 300, milky: 0.8, signFront: 'НОЯБРЬ', moon: [((t * 70) % 520) - 20, 60 - Math.sin(((t * 70) % 520) / 520 * Math.PI) * 40, 8] });
  skyLights(f, s, t, { opus: 1, astra: 1, sol: 1, luna: 1, deep: 1, kimi: 1, z: 1 });
  const G = gy(LX);
  const step = Math.min(3, Math.floor(t / 1.5)); // montage beats
  // frame and panels
  const ribs = phase(t, 0, 1.4);
  const panels = phase(t, 1.5, 4.4);
  const w = 40, h = 46;
  if (panels > 0) partialLantern(s, LX, G - 4, { w, h, patch: true, lit: 0.15, t }, panels);
  if (panels < 1) {
    const n = Math.round(7 * Math.max(ribs, 0.01));
    for (let i = 0; i < n; i++) {
      const u = i / 6, xr = LX - w / 2 + Math.round(u * w);
      line(s, xr, G - 4, xr + Math.round((u - 0.5) * -6), G - 4 - h, '#c8a46a');
    }
    for (const yy of [0, 0.5, 1]) if (ribs > yy * 0.9) line(s, LX - w / 2, G - 4 - Math.round(h * yy), LX + w / 2, G - 4 - Math.round(h * yy), '#c8a46a');
  }
  const paint4 = phase(t, 4.6, 5.6);
  if (paint4 > 0) text(s, '4', LX, G - 4 - h + 16, { align: 'center', font: 'press', color: '#ffffff', outline: '#2a1a40', chars: paint4 > 0.5 ? 1 : 0 });
  rect(s, LX - 14, G - 4, 28, 4, '#6a4a30');
  // characters jump between work spots per beat (stop-motion feel)
  const spots = [
    { cl: 536, cd: 622, gx: 600, gy: -30 },
    { cl: 548, cd: 612, gx: 556, gy: -44 },
    { cl: 540, cd: 626, gx: 600, gy: -50 },
    { cl: 544, cd: 616, gx: 578, gy: -66 },
  ][step];
  const work = Math.floor(t * 8) % 2;
  drawClawd(s, spots.cl, gy(spots.cl), { eyes: work ? 'happy' : 'closed', mouth: 'smile', armR: -6 - work * 2, armRx: 2, shadowY: gy(spots.cl) + 1, shadowW: 38 });
  const pct = Math.min(100, Math.round(phase(t, 0, 5.4) * 100));
  const bar = '#'.repeat(Math.round(pct / 25)).padEnd(4, '.');
  drawCodex(s, spots.cd, gy(spots.cd), { screen: t < 5.4 ? { mode: 'text', lines: [bar, pct + '%'] } : { mode: 'face', face: 'happy' }, handL: [-2 + work * 2, -10], shadowY: gy(spots.cd) + 1, shadowW: 34 });
  drawGemini(s, spots.gx, G + spots.gy, { hover: 0, eyes: t > 4.6 ? 'happy' : 'open', mouth: 'smile', handL: [-2 + work * 3, -6], sharp: 0.66, shadow: false });
  if (work) sparkle(s, spots.gx - 14, G + spots.gy - 26, 1, ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][step], 1);
  caption(f.ui, 'Они строили его вместе. Ночь за ночью.', t, 0.3, 4.2);
  f.bloomOpts = { strength: 0.6 };
  f.gradeOpts = { sat: 1.05, contrast: 1.04 };
  f.vig = 0.4;
}

function lighting(f, t) {
  const s = f.camera(track(t, [[6.5, 560], [9.5, 572]]), track(t, [[6.5, 140], [9.5, 120]]), track(t, [[6.5, 1.25], [9.5, 1.15]]));
  f.ambient = AMB.festival;
  hillSet(f, s, t, { sky: 'festival', starCount: 300, milky: 0.8, signFront: 'НОЯБРЬ', moon: [80, 40, 8] });
  skyLights(f, s, t, { opus: 1, astra: 1, sol: 1, luna: 1, deep: 1, kimi: 1, z: 1 });
  const G = gy(LX);
  const lit = phase(t, 8.2, 8.7);
  const rise = phase(t, 8.9, 9.6, 'inQuad');
  const ly = G - 4 - rise * 60;
  lantern(s, LX, ly, { w: 40, h: 46, patch: true, lit: 0.15 + 0.85 * lit, t, glowC: '#d8c8ff' });
  text(s, '4', LX, ly - 46 + 16, { align: 'center', font: 'press', color: '#ffffff', outline: '#2a1a40' });
  if (lit > 0) { glow(s, LX, ly - 24, 70, '#b9a4ff', 0.5 * lit, 6); f.light(LX, ly - 24, 120, '#e0d0ff', 1.1 * lit); }
  drawClawd(s, 536, gy(536), { eyes: t > 8.2 ? 'star' : 'happy', mouth: t > 8.2 ? 'open' : 'smile', armL: t > 8.3 ? -10 : 0, armR: t > 8.3 ? -10 : 0, lookY: t > 8.8 ? -2 : 0, shadowY: gy(536) + 1, shadowW: 38 });
  drawCodex(s, 622, gy(622), { screen: { mode: 'face', face: t > 8.2 ? 'wide' : 'happy' }, handL: t > 8.3 ? [-2, -14] : [0, 0], handR: t > 8.3 ? [2, -14] : [0, 0], shadowY: gy(622) + 1, shadowW: 34 });
  // Gemini carries the little flame from Clawd's lantern to the big one
  const gx = track(t, [[6.5, 548], [7.6, 560], [8.15, LX - 16, 'inOutQuad'], [9.6, LX - 22]]);
  const gyy = G + track(t, [[6.5, -10], [8.15, -22], [9.6, -16]]);
  drawGemini(s, gx, gyy, { hover: 2 + osc(t, 0.8), eyes: t > 8.2 ? 'happy' : 'open', mouth: t > 8.2 ? 'big' : 'smile', sharp: 0.62, core: t > 8.4 ? 5 * lit : 0, handR: [2, -8], shadowY: G + 1, shadowW: 22 });
  lantern(s, 520, gy(520), { w: 16, h: 20, paper: '#ff9a4a', lit: 0.85, t, seed: 11 });
  if (t < 8.25) {
    const fx = gx + 14, fy = gyy - 30;
    sparkle(s, fx, fy, 2, ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][Math.floor(t * 6) % 4], 1);
    f.light(fx, fy, 40, '#fff0c8', 0.8);
  }
  if (t > 8.2 && t < 8.8) ring(s, LX, ly - 24, 10 + (t - 8.2) * 120, '#ffffff', 1, 1 - (t - 8.2) / 0.6);
  crowd(f, s, t, { n: 20, x0: 470, x1: 680, sticks: true, mood: () => ({ jump: t > 8.3 ? 0.9 : 0.15 }) });
  say(f, gx, gyy - 58, t, 7.5, 8.2, 'Вместе?', { dir: -1 });
  f.bloomOpts = { strength: 0.75 };
  f.gradeOpts = { sat: 1.08, contrast: 1.04 };
  f.vig = 0.4;
}

function flight(f, t) {
  const u = phase(t, 9.6, 14.6);
  const s = f.camera(240, 135, 1);
  skyGradient(s, [[0, '#141a4e'], [0.45, '#2c2f78'], [0.8, '#5a4392'], [1, '#8a5aa6']], 22);
  milkyWay(s, { k: 0.9, x: 200 + u * 40 });
  stars(s, t, { count: 360, seed: 3, parallax: 0 });
  const T = island();
  const yaw = -0.3 + u * 0.5;
  const lx = 138, lz = 122, D = 110 + u * 50;
  const px = lx - Math.sin(yaw) * D, pz = lz - Math.cos(yaw) * D;
  const ph = 100 + 200 * ease.inOutSine(u);
  const horizon = 103 + u * 20;
  const cam = { pos: [px, ph, pz], yaw };
  const scaleH = 230, fovk = 0.75;
  voxelSpace(s, cam, T, { horizon, scaleH, dist: 600, fog: '#3b2b72', fogStart: 0.2, fovk });
  // lantern rising from the hilltop
  const lh = 75 + 375 * u * u;
  const dx = lx - px, dz = lz - pz;
  const sinA = Math.sin(yaw), cosA = Math.cos(yaw);
  const z = dx * sinA + dz * cosA, l = dx * cosA - dz * sinA;
  if (z > 1) {
    const sx = 240 + (l / (z * fovk)) * 240, sy = (ph - lh) / z * scaleH + horizon;
    const spr = lanternSprite(t);
    const sc = Math.max(0.1, (26 / z) * scaleH / spr.h);
    glow(s, sx, sy - spr.h * sc * 0.45, 90 * sc + 20, '#b9a4ff', 0.6, 6);
    blit(s, spr, sx, sy, { scale: sc, flag: 2 });
    for (let i = 0; i < 10; i++) {
      const k = ((t * 1.3 + i / 10) % 1);
      pset(s, sx + Math.sin(i * 2.3 + t) * 10 * sc, sy + k * 60 * sc, ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i % 4]);
    }
  }
  f.ambient = null;
  f.bloomOpts = { strength: 0.8, all: false };
  f.gradeOpts = { sat: 1.08, contrast: 1.05 };
  f.vig = 0.45;
  f.fade = (1 - phase(t, 9.6, 9.9)) * 0.8 + phase(t, 14.3, 14.6) * 0.9;
}

function starBirth(f, t) {
  const s = f.camera(470, 46, 1.35);
  f.ambient = AMB.festival;
  hillSet(f, s, t, { sky: 'festival', starCount: 320, milky: 0.9, noTree: false });
  const k = phase(t, 15.55, 16.1, 'outBack');
  skyLights(f, s, t, { opus: 1, astra: 1, sol: 1, luna: 1, deep: 1, kimi: 1, z: 1, gem4: k });
  const [sx, sy] = SKY.gem4;
  if (t < 15.6) {
    const u = phase(t, 14.6, 15.55, 'outCubic');
    const ly = 150 - (150 - sy - 10) * u;
    lantern(s, sx, ly, { w: Math.round(30 - 14 * u), h: Math.round(34 - 16 * u), patch: true, lit: 1, t, glowC: '#d8c8ff' });
    glow(s, sx, ly - 12, 40, '#b9a4ff', 0.6, 6);
  }
  if (t > 15.5 && t < 16.4) {
    const b = phase(t, 15.5, 16.4);
    ring(s, sx, sy, 6 + b * 90, '#ffffff', 2, 1 - b);
    ring(s, sx, sy, 3 + b * 60, '#d8c8ff', 1, 1 - b);
    if (b < 0.3) { f.fadeColor = 0xfff0e8ff; f.fade = (0.3 - b) * 1.6; }
  }
  if (t > 15.6) {
    glow(s, sx, sy, 70, '#b9a4ff', 0.55 + 0.1 * osc(t, 1.2), 6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.6, r = 16 + 3 * Math.sin(t * 3 + i);
      sparkle(s, sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.8, 1 + (i % 2), ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i % 4], 1);
    }
    confetti(s, t, 16.0, 380, 60, { n: 40, v: 90, seed: 1, life: 2.2 });
    confetti(s, t, 16.5, 560, 60, { n: 40, v: 90, seed: 2, life: 1.6 });
    // big label under the star
    const a = phase(t, 15.9, 16.4);
    if (a > 0) {
      const [ux, uy] = f.toScreen(sx, sy + 18);
      const str = 'GEMINI 4';
      text(f.ui, str, ux, uy, { align: 'center', font: 'press', scale: 2, colors: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'], outline: '#0b0820', alpha: a });
    }
  }
  f.bloomOpts = { strength: 0.8 };
  f.gradeOpts = { sat: 1.1, contrast: 1.05 };
  f.vig = 0.35;
}

export default {
  id: 'comeback', dur: 18,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    if (t < 6.5) workshop(f, t);
    else if (t < 9.6) lighting(f, t);
    else if (t < 14.6) flight(f, t);
    else starBirth(f, t);
    if (t > 6.2 && t < 6.5) f.fade = Math.max(f.fade, phase(t, 6.2, 6.5));
    if (t > 6.5 && t < 6.8) f.fade = Math.max(f.fade, 1 - phase(t, 6.5, 6.8));
  },
};
