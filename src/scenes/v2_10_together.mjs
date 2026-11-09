// S10 — Together to the Summit (3D): a golden-hour formation flight — Clawd's balloon, Codex's rocket and the Argon glider
// side by side with the Summit ahead; a wide shot of the spire; then they land on its snowy plateau and plant three pennants.
import { SKY3, world, chr, shot3D, cam3, label3D, narr, chapter, rotMat } from './world3d.mjs';
import { makeBalloon, makeRocket, makeGlider, makeSummitTop, makePennant, meadowIsland, rockIsland, grovIsland, forestIsland } from '../world/voxworld.mjs';
import { blinkState } from '../chars/common.mjs';
import { clamp, track, phase, hash, ease } from '../core/math.mjs';

const G4 = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];
// sunset palette with the sun moved behind the camera, so the travellers' faces are lit
export const GOLD = {
  ...SKY3.sunset,
  sky: { ...SKY3.sunset.sky, sun: [0.75, 0.16, -0.64] },
  light: { ...SKY3.sunset.light, sun: [0.7, 0.32, -0.62], sunK: 0.95, ambK: 0.6 },
};

export const SFX = [
  [0, 'flyWind', { dur: 9.4, gain: 0.8 }], [0.2, 'burner', { dur: 2.2 }], [0.4, 'engine', { dur: 6, gain: 0.7 }],
  [3.2, 'babble', { who: 'gemini', n: 4 }], [4.4, 'laugh', { who: 'clawd', gain: 0.5 }],
  [6.4, 'whooshSoft', { pitch: 0.8 }], [7.0, 'windSoft', { dur: 2.6 }],
  [9.4, 'thud', { gain: 0.4 }], [9.6, 'hop'], [9.9, 'hop', { pitch: 1.15 }],
  [10.4, 'pop'], [10.45, 'chime', { gain: 0.4, pitch: 0.9 }], [11.0, 'pop'], [11.05, 'chime', { gain: 0.4 }], [11.6, 'pop'], [11.65, 'chime', { gain: 0.5, pitch: 1.2 }],
  [12.1, 'starBurst'], [12.2, 'shimmer', { dur: 1.8 }],
];
export const MUSIC = [
  { t0: 0, dur: 9.4, bpm: 92, root: 62, bars: [1, 5, 6, 4], fi: 0.6, fo: 0.6, mel: { inst: 'lead', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 7 . 5 . 2' - - -", oct: 1, vel: 0.36, opts: { duty: 0.5, cut: 3200 } }, pad: { inst: 'strings', oct: -1, vel: 0.42 }, bass: { pattern: 'roots4', oct: -2, vel: 0.3 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.14 } },
  { t0: 9.4, dur: 4.6, bpm: 92, root: 62, bars: [4, 5, 1, 1], fi: 0.3, fo: 0.8, mel: { inst: 'bell', str: "1 . 3 . 5 . 1' - - - 2' . 1' - - -", oct: 1, vel: 0.48 }, pad: { inst: 'strings', oct: -1, vel: 0.46 }, drums: { cr: 'x...............', vel: 0.3 } },
];

function formation(f, t) {
  const z = -60 + t * 150, A = [0, 150 + Math.sin(t * 0.7) * 6, z];
  const bob = (k) => Math.sin(t * 1.4 + k) * 2.5;
  const bp = [A[0] - 44, A[1] + 4 + bob(0), A[2]], rp = [A[0] + 44, A[1] - 6 + bob(2), A[2] + 6], gp = [A[0], A[1] - 14 + bob(4), A[2] + 16];
  const cam = cam3(f, [A[0] + 10 + Math.sin(t * 0.3) * 6, A[1] + 16, A[2] - 86], [A[0], A[1] + 4, A[2] + 300], 0.92, Math.sin(t * 0.5) * 0.03);
  const sc = { ...GOLD, models: world(false).slice(), points: [], bloom: { strength: 0.6 }, vig: 0.32 };
  const lookL = rotMat(-0.35, 0, 0), lookR = rotMat(0.35, 0, 0);
  sc.models.push(
    { model: makeBalloon(), pos: bp, scale: 0.8, id: 20 },
    chr('clawd', { eyes: blinkState(t, 1) || (t > 4.2 && t < 5.4 ? 'laugh' : 'happy'), mouth: t > 4.2 && t < 5.4 ? 'big' : 'smile', armR: -8 }, [bp[0], bp[1] + 7, bp[2] - 2], { id: 61, rot: lookR }),
    { model: makeRocket(), pos: rp, scale: 0.75, id: 21 },
    chr('codex', { screen: { mode: 'face', face: t > 3.4 ? 'heart' : 'happy' }, handL: [-2, -12] }, [rp[0], rp[1] + 27, rp[2] - 4], { id: 62, rot: lookL, scale: 0.36 }),
    { model: makeGlider(), pos: gp, scale: 0.55, id: 24, bright: 1.2 },
    chr('gemini', { eyes: blinkState(t, 3) || (t > 3.2 ? 'sparkle' : 'happy'), mouth: t > 3.2 && t < 4.6 ? 'open' : 'big', handR: [2, -14] }, [gp[0], gp[1] + 9, gp[2] + 2], { id: 64 }),
  );
  // rocket fire, balloon burner flicker, argon exhaust and four-colour trails
  for (let i = 0; i < 40; i++) { const k = hash(i * 7 + Math.floor(t * 20)), a = hash(i * 3) * 6.28, d = hash(i * 5 + 1); sc.points.push({ p: [rp[0] + Math.cos(a) * d * 5, rp[1] - 2 - k * 18, rp[2] + Math.sin(a) * d * 5], c: k < 0.3 ? '#ffffff' : k < 0.65 ? '#ffd24a' : '#ff7a2a', size: 1.6, flag: 2 }); }
  for (let i = 0; i < 6; i++) sc.points.push({ p: [bp[0] + (hash(i) - 0.5) * 2, bp[1] + 18 + hash(i + Math.floor(t * 15)) * 3, bp[2]], c: '#ffb040', size: 1.2, flag: 2 });
  for (let k = 1; k < 30; k++) for (let lane = 0; lane < 4; lane++) sc.points.push({ p: [gp[0] + (lane - 1.5) * 7, gp[1] + 3, gp[2] - k * 5], c: G4[lane], size: 0.8, flag: 2, a: 1 - k / 30 });
  shot3D(f, cam, sc, t);
  narr(f.ui, 'К Вершине они полетели втроём.', t, 0.9, 4.0);
  narr(f.ui, 'Не наперегонки — а вместе.', t, 4.3, 6.4);
  chapter(f.ui, t, 0.3, 3.4, 6, 'ВЕРШИНА');
}

function spire(f, t) {
  const u = t - 6.5;
  const cam = cam3(f, [track(u, [[0, 330], [3, 250]]), track(u, [[0, 160], [3, 230]]), track(u, [[0, 1080], [3, 1230]])], [60, track(u, [[0, 150], [3, 220]]), 1700], 0.9);
  const sc = { ...GOLD, models: world(false).slice(), points: [], rays: null, bloom: { strength: 0.65 }, vig: 0.3 };
  // three small travellers spiralling up the spire, each with a coloured trail
  const cols = ['#ff9a6a', '#8fb0ff', '#ffe27a'];
  for (let j = 0; j < 3; j++) for (let k = 0; k < 26; k++) {
    const q = u * 0.9 - k * 0.025 + j * 0.06, a = q * 2.6 + j * 0.4, r = 150 - q * 40;
    if (q < 0) continue;
    sc.points.push({ p: [60 + Math.cos(a) * r, 120 + q * 50, 1700 - Math.sin(a) * r], c: k === 0 ? '#ffffff' : cols[j], size: k === 0 ? 7 : 4, flag: 2, a: 1 - k / 26 });
  }
  shot3D(f, cam, sc, t);
  label3D(f, cam, [60, 300, 1700], 'ВЕРШИНА', '#fff2c8', clamp((u - 0.4) / 0.5) * clamp((2.9 - u) / 0.4), { dy: -14 });
}

function plateau(f, t) {
  const u = t - 9.4, M = makeSummitTop(false), g = (x, z) => M.groundAt(x, z);
  const yaw = track(u, [[0, 0.32], [4.6, -0.22, 'inOutSine']]);
  const cam = cam3(f, [Math.sin(yaw) * 74, track(u, [[0, 30], [4.6, 22]]), -Math.cos(yaw) * 74], [0, 13, 0], 0.86);
  const sc = { ...GOLD, clouds: { ...GOLD.clouds, y: -70 }, models: [
    { model: M, pos: [0, 0, 0], id: 2 },
    { model: meadowIsland(false), pos: [-360, -50, 560], id: 5, fog: 0.8 },
    { model: rockIsland(41, 26, false), pos: [300, -20, 380], id: 6 },
    { model: grovIsland(false), pos: [460, -40, -200], id: 3 },
    { model: forestIsland(false), pos: [-480, -60, -120], id: 4 },
    { model: makeBalloon(), pos: [-48, g(-48, 22), 22], scale: 0.5, id: 20 },
    { model: makeRocket(), pos: [46, g(46, 24), 24], scale: 0.45, id: 21 },
    { model: makeGlider(), pos: [0, g(0, 36) + 1, 36], scale: 0.45, id: 24 },
  ], points: [], bloom: { strength: 0.45 }, vig: 0.3 };
  const step = (k) => ease.outQuad(phase(u, 0.1 + k * 0.15, 0.7 + k * 0.15));
  const cl = [-32, -14 - 6 * step(0)], cd = [20, -14 - 6 * step(1)], gm = [-7, -19 - 6 * step(2)];
  const flare = phase(u, 2.7, 3.0) * (1 - phase(u, 3.0, 4.4));
  sc.models.push(
    chr('clawd', { eyes: blinkState(t, 1) || 'happy', mouth: u > 2.7 ? 'open' : 'smile', armR: u > 1.0 && u < 1.5 ? -10 : u > 2.7 ? -10 : 0, armL: u > 2.7 ? -10 : 0 }, [cl[0], g(...cl), cl[1]], { id: 61 }),
    chr('codex', { screen: { mode: 'face', face: u > 2.7 ? 'heart' : 'happy' }, handL: u > 1.6 && u < 2.1 ? [-2, -14] : [0, 0], handR: u > 2.7 ? [2, -14] : [0, 0] }, [cd[0], g(...cd), cd[1]], { id: 62 }),
    chr('gemini', { eyes: blinkState(t, 3) || (u > 2.7 ? 'sparkle' : 'happy'), mouth: 'big', handR: u > 2.2 ? [2, -14] : [0, 0], handL: u > 2.7 ? [-2, -14] : [0, 0] }, [gm[0], g(...gm) + 3, gm[1]], { id: 64 }),
  );
  [[-34, -2, '#d97757', 1.0], [34, -2, '#5a7cff', 1.6], [12, 8, G4, 2.2]].forEach(([x, z, c, t0], i) => {
    const r = ease.outBack(phase(u, t0, t0 + 0.35));
    if (r > 0) sc.models.push({ model: makePennant(c), pos: [x, g(x, z) - 30 * (1 - r), z], id: 30 + i });
    if (u > t0 && u < t0 + 0.7) for (let k = 0; k < 10; k++) sc.points.push({ p: [x + Math.cos(k * 0.63) * (u - t0) * 26, g(x, z) + 2 + (u - t0) * 10, z + Math.sin(k * 0.63) * (u - t0) * 26], c: Array.isArray(c) ? c[k % 4] : c, size: 1.1, flag: 2, a: 1 - (u - t0) / 0.7 });
  });
  if (flare > 0) for (let k = 0; k < 40; k++) { const a = hash(k) * 6.28, e = hash(k + 3) * 1.4 - 0.2; sc.points.push({ p: [Math.cos(a) * Math.cos(e) * flare * 50, M.starY + Math.sin(e) * flare * 50, Math.sin(a) * Math.cos(e) * flare * 50], c: G4[k % 4], size: 1.4, flag: 2, a: 1 - flare * 0.3 }); }
  shot3D(f, cam, sc, t);
  narr(f.ui, 'И долетели — вместе.', t, 11.6, 13.9);
  f.fade = Math.max(f.fade, (1 - phase(t, 9.4, 9.7)) * 0.9);
}

export default {
  id: 'together', dur: 14,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    if (t < 6.5) formation(f, t);
    else if (t < 9.4) spire(f, t);
    else plateau(f, t);
  },
};
