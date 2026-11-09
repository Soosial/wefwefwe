// S13 — Finale: dawn on the Summit. 3D: everyone — the three friends, the whale, Kimi and even Qwen — sits on the edge of
// the plateau watching the sunrise (backlit silhouettes, god rays). 2D close-up: Gemini looks at the old COMING SOON tag,
// smiles and lets the wind take it; the camera follows it up into the sky; "КОНЕЦ".
import { SKY3, chr, shot3D, cam3, narr } from './world3d.mjs';
import { makeSummitTop, makePennant, meadowIsland, rockIsland, grovIsland, forestIsland } from '../world/voxworld.mjs';
import { summitSet, sy, CRYSTAL_X, G4 } from '../world/summit.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { blinkState } from '../chars/common.mjs';
import { tag, sparkle } from '../world/props.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash, ease } from '../core/math.mjs';

// the sun rises behind the camera: everyone on the plateau edge is lit warmly, the crystal glows behind them
const SUNRISE = {
  ...SKY3.dawn,
  sky: { ...SKY3.dawn.sky, sun: [0.1, 0.07, -1], stars: 0.2 },
  light: { ...SKY3.dawn.light, sun: [0.15, 0.32, -0.93], sunK: 0.95, ambK: 0.62 },
};
const GM = 488;

export const SFX = [
  [0, 'windSoft', { dur: 14, gain: 0.6 }], [0.4, 'birds', { dur: 6, gain: 0.3 }],
  [6.5, 'sit'], [7.4, 'paper'], [8.7, 'whooshSoft', { pitch: 0.7 }], [9.0, 'paper'],
  [11.8, 'chime', { gain: 0.6 }], [12.6, 'wink'],
];
export const MUSIC = [
  { t0: 0, dur: 14, bpm: 72, root: 60, bars: [1, 6, 4, 5, 1, 6, 4, 1], fi: 1.2, fo: 1.6, mel: { inst: 'bell', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 1' - - - - - - -", oct: 1, vel: 0.46 }, mel2: { inst: 'lead', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 1' - - - - - - -", oct: 0, vel: 0.16, opts: { duty: 0.5, cut: 2200 } }, pad: { inst: 'strings', oct: -1, vel: 0.46 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.12, from: 6.6 } },
];

function sunrise3D(f, t) {
  const M = makeSummitTop(false), g = (x, z) => M.groundAt(x, z);
  const cam = cam3(f, [track(t, [[0, 6], [6.5, 1]]), track(t, [[0, 40], [6.5, 34]]), track(t, [[0, -106], [6.5, -84]])], [0, 5, -16], 0.8);
  const sc = { ...SUNRISE, clouds: { ...SUNRISE.clouds, y: -70 }, models: [
    { model: M, pos: [0, 0, 0], id: 2 },
    { model: meadowIsland(false), pos: [-380, -50, 620], id: 5 },
    { model: rockIsland(41, 26, false), pos: [260, -24, 420], id: 6 },
    { model: grovIsland(false), pos: [520, -40, 760], id: 3 },
    { model: forestIsland(false), pos: [-560, -60, 300], id: 4 },
    { model: makePennant('#d97757'), pos: [-26, g(-26, 6), 6], id: 30 },
    { model: makePennant('#5a7cff'), pos: [26, g(26, 6), 6], id: 31 },
    { model: makePennant(G4), pos: [12, g(12, 10), 10], id: 32 },
  ], points: [], bloom: { strength: 0.5 }, vig: 0.36 };
  // everyone in a row near the edge of the plateau — friends, former rivals and even Qwen
  const row = [
    ['qwen', -38, { glasses: true, eyes: blinkState(t, 5) || 'happy', mouth: 'smile', blush: 1 }, 0.29],
    ['clawd', -24, { legs: [3, 3, 3, 3], eyes: blinkState(t, 1) || 'happy', mouth: 'smile', blush: 2 }, 0.33],
    ['gemini', -8, { eyes: t > 3.7 ? 'closed' : blinkState(t, 3) || 'happy', mouth: 'smile', blush: 2 }, 0.33],
    ['codex', 8, { screen: { mode: 'face', face: t > 3.7 ? 'heart' : 'happy' } }, 0.33],
    ['kimi', 23, { eyes: blinkState(t, 6) || 'happy', mouth: 'smile' }, 0.31],
    ['whale', 37, { eyes: 'happy', mouth: 'smile', tail: Math.sin(t * 2) }, 0.26],
  ];
  row.forEach(([name, x, pose, scale], i) => sc.models.push(chr(name, pose, [x, g(x, -22) + (name === 'gemini' ? 2 : 0), -22], { id: 61 + i, scale })));
  shot3D(f, cam, sc, t);
  narr(f.ui, 'Быть первым — здорово.', t, 0.8, 3.4);
  narr(f.ui, 'Но лететь вместе — ещё лучше.', t, 3.7, 6.3);
  f.fade = Math.max(f.fade, 1 - phase(t, 0, 0.8));
}

export default {
  id: 'finale', dur: 14,
  render(f, t) {
    if (t < 6.5) { sunrise3D(f, t); return; }
    const tilt = phase(t, 10.6, 12.4, 'inOutCubic');
    const s = f.camera(track(t, [[6.5, GM - 4], [10.6, GM + 2], [12.4, GM + 30, 'inOutCubic']]), track(t, [[6.5, sy(GM) - 30], [10.6, sy(GM) - 32], [12.4, 70, 'inOutCubic']]), track(t, [[6.5, 2.7], [10.6, 2.8], [12.4, 1.7, 'inOutCubic']]));
    summitSet(f, s, t, { tod: 'dawn', sun: [300, 150], sunGlow: '#ffc890', crystalK: 0.5, pennants: [{ x: GM - 30, cols: '#d97757' }, { x: GM + 36, cols: G4 }, { x: GM + 80, cols: '#5a7cff' }] });
    const let_go = t > 8.7;
    // friends leaning in
    drawClawd(s, GM - 44, sy(GM - 44) + 2, { legs: [3, 3, 3, 3], eyes: blinkState(t, 1) || (t > 8 ? 'closed' : 'happy'), mouth: 'smile', blush: 2, look: 2, shadowY: sy(GM - 44) + 3, shadowW: 38 });
    drawCodex(s, GM + 60, sy(GM + 60), { screen: { mode: 'face', face: t > 8.2 ? 'heart' : 'happy' }, shadowY: sy(GM + 60) + 1, shadowW: 34 });
    // Gemini and the tag
    const ge = t < 7.6 ? 'open' : t < 8.6 ? 'closed' : let_go ? (blinkState(t, 3) || 'happy') : 'open';
    drawGemini(s, GM, sy(GM), { hover: 3 + osc(t, 0.6), eyes: ge, lookY: t < 7.6 ? 1 : 0, look: let_go ? 2 : 0, mouth: t < 7.4 ? 'flat' : 'smile', blush: 1, handR: let_go ? [4, -12] : [4, -6], shadowY: sy(GM) + 1, shadowW: 24 });
    const fly = phase(t, 8.7, 12.4);
    const tx = GM + 30 + fly * 60 + Math.sin(fly * 10) * 8 * (1 - fly * 0.5), ty = sy(GM) - 18 - fly * (sy(GM) - 40) + Math.sin(fly * 13) * 3;
    if (fly < 1) tag(s, tx, ty, 'COMING SOON', { ink: '#c0392b' });
    if (let_go) for (let i = 0; i < 3; i++) sparkle(s, tx + Math.cos(t * 5 + i * 2) * 10, ty + 4 + Math.sin(t * 4 + i) * 6, 1, G4[i], 1 - fly);
    narr(f.ui, ['А «скоро»...', 'однажды обязательно наступает.'], t, 7.2, 10.8);
    const a = phase(t, 11.8, 12.4);
    if (a > 0) {
      text(f.ui, 'КОНЕЦ', 240, 104, { align: 'center', font: 'press', scale: 3, colors: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'], outline: '#1a1030', alpha: a });
      for (let i = 0; i < 6; i++) sparkle(f.ui, 240 + Math.cos(i * 1.05 + t) * 80, 112 + Math.sin(i * 1.7 + t) * 22, 1 + (i % 2), G4[i % 4], a);
    }
    f.bloomOpts = { strength: 0.6 };
    f.gradeOpts = { sat: 1.06, contrast: 1.03 };
    f.vig = 0.32 + 0.1 * tilt;
    f.fade = Math.max(phase(t, 13.2, 14), (1 - phase(t, 6.5, 6.8)) * 0.8);
  },
};
