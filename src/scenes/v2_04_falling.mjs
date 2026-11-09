// S4 — Falling behind: the split-flap board drops Gemini down; 3D time-lapse of months with Flash after Flash
// while the "3.5 PRO" crate gathers dust and a nest; then the newspaper: 3.5 Pro is cancelled.
import { fieldSet, fy, PADS, BOARD_X, board2D, crate2D, emote } from '../world/field.mjs';
import { say } from './common.mjs';
import { SKY3, blendSky, world, chr, shot3D, cam3, camPath, label3D, narr, chapter, groundAt, LAUNCH, rotMat } from './world3d.mjs';
import { makeCrate, makePlane } from '../world/voxworld.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { rect, pset, line, hex, mix } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash, ease } from '../core/math.mjs';

const C = { claude: '#d97757', gpt: '#5a7cff', gem: '#fbbc04', ds: '#4d6bfe', kimi: '#6c76a0' };
const OLD = [
  { rank: 1, name: 'GEMINI 3 PRO', col: C.gem }, { rank: 2, name: 'CLAUDE', col: C.claude }, { rank: 3, name: 'GPT', col: C.gpt },
  { rank: 4, name: 'DEEPSEEK', col: C.ds }, { rank: 5, name: 'KIMI', col: C.kimi }, { rank: 6, name: '...', col: '#444a60' },
];
const NEW = [
  { rank: 1, name: 'CLAUDE OPUS 5.5', col: C.claude }, { rank: 2, name: 'GPT-6 ASTRA', col: C.gpt }, { rank: 3, name: 'GPT-6.1 SOL', col: C.gpt },
  { rank: 4, name: 'DEEPSEEK V4', col: C.ds }, { rank: 5, name: 'KIMI K3.1', col: C.kimi }, { rank: 6, name: 'GEMINI 3.5 FLASH', col: C.gem, textCol: '#ff8a7a' },
];
const MONTHS = ['ИЮНЬ', 'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ'];
const FLASH = ['3.6 FLASH', '3.7 FLASH', '3.8 FLASH'];

export const SFX = [
  [0.2, 'windSoft', { dur: 7 }],
  [2.0, 'flaps', { dur: 2.2 }], [4.4, 'stingSad', { gain: 0.6 }],
  [7.0, 'clockTick', { dur: 9 }],
  [7.0, 'pageFlip'], [9.25, 'pageFlip'], [11.5, 'pageFlip'], [13.75, 'pageFlip'],
  [8.0, 'throw', { pitch: 1.2 }], [10.25, 'throw', { pitch: 1.1 }], [12.5, 'throw', { pitch: 1.0 }],
  [9.0, 'fizzle', { gain: 0.4 }], [11.25, 'fizzle', { gain: 0.35 }], [13.5, 'fizzle', { gain: 0.3 }],
  [10.6, 'chirp'], [16.2, 'wind', { dur: 1.2 }], [16.9, 'paperSlap'], [17.6, 'paper'], [18.6, 'stingSad'],
];
export const MUSIC = [
  { t0: 0.3, dur: 6.5, bpm: 70, root: 57, scale: 'minor', bars: [1, 6, 4, 5], fi: 0.6, fo: 0.6, mel: { inst: 'piano', str: "5 . . 3 2 . 1 . 2 . . 3 1 . . .", oct: 1, vel: 0.4 }, pad: { inst: 'strings', oct: -1, vel: 0.3 } },
  { t0: 7.0, dur: 9.2, bpm: 96, bpb: 3, root: 57, scale: 'minor', bars: [1, 6, 3, '5M'], fi: 0.4, fo: 0.6, mel: { inst: 'box', str: "1' . 7 . 6 5 6 . 5 . 4 3 3 . 2 . 3 5 #7 . . . 5 .", oct: 1, vel: 0.42, loop: true }, bass: { pattern: 'waltz', inst: 'pluck', oct: -1, vel: 0.28 }, drums: { w: 'x...x...x...', vel: 0.12 } },
  { t0: 16.6, dur: 4.4, bpm: 60, root: 57, scale: 'minor', bars: [1, 6], fi: 0.4, fo: 1.0, pad: { inst: 'strings', oct: -1, vel: 0.35 }, mel: { inst: 'piano', str: "3 . 2 . 1 - - -", oct: 1, vel: 0.35 } },
];

function newspaper(s, x, y, w, h, flap, hl) {
  const ww = Math.max(2, Math.round(w * (1 - flap * 0.45))), x0 = Math.round(x - ww / 2), y0 = Math.round(y - h / 2);
  rect(s, x0 + 2, y0 + 2, ww, h, '#2a2236');
  rect(s, x0, y0, ww, h, '#efe9da');
  rect(s, x0 + 2, y0 + 2, ww - 4, 6, '#2a2a3a');
  if (flap < 0.2 && hl) {
    text(s, 'НЕБЕСНЫЕ ВЕСТИ', x, y0 + 3, { align: 'center', color: '#efe9da' });
    text(s, '3.5 PRO', x, y0 + 12, { align: 'center', font: 'press', color: '#c0392b' });
    text(s, 'ОТМЕНЁН', x, y0 + 23, { align: 'center', font: 'press', color: '#1e1a2a' });
    for (let k = 0; k < 3; k++) rect(s, x0 + 4, y0 + h - 10 + k * 3, ww - 8, 1, '#b8b0a0');
  } else for (let k = 0; k < 6; k++) rect(s, x0 + 3, y0 + 10 + k * 3, ww - 6, 1, '#b8b0a0');
}

function timelapse(f, t) {
  const u = t - 7, m = clamp(Math.floor(u / 2.25), 0, 3), mu = (u - m * 2.25) / 2.25;
  const L = LAUNCH, g = (x, z) => groundAt(x, z);
  // sky cycle inside each month: day -> sunset -> night -> dawn -> day
  const seq = [SKY3.day, SKY3.sunset, SKY3.night, SKY3.dawn, SKY3.day];
  const q = mu * 4, qi = Math.min(3, Math.floor(q));
  const sky = blendSky(seq[qi], seq[qi + 1], ease.inOutSine(q - qi));
  const night = qi === 1 && q - qi > 0.6 || qi === 2;
  const cpos = [L.pads.gemini[0] + 10, g(...L.pads.gemini), L.pads.gemini[1] + 8];
  const gpos = [L.pads.gemini[0] - 4, g(...L.pads.gemini) + 3, L.pads.gemini[1] - 8];
  // locked-off camera (inside the bunting line) with a slow push-in: the sky and shadows do the talking
  const push = u / 9;
  const cam = cam3(f, [cpos[0] + 30 - push * 6, cpos[1] + 16 - push * 3, cpos[2] - 46 + push * 8], [cpos[0] - 9, cpos[1] + 11, cpos[2] - 6], 0.85);
  const sad = m / 3;
  const sc = { ...sky, models: world(night).slice(), blobs: [{ p: gpos, r: 5, id: 64 }], points: [] };
  const throwing = m < 3 && mu > 0.25 && mu < 0.75;
  sc.models.push(
    { model: makeCrate(m), pos: cpos, scale: 0.7, id: 22 },
    chr('gemini', { eyes: throwing ? 'happy' : m === 3 ? 'sad' : 'open', brow: m >= 2 ? 'worried' : null, mouth: m === 3 ? 'frown' : throwing ? 'smile' : 'flat', handR: throwing && mu < 0.35 ? [2, -14] : [0, 0], sat: 1 - sad * 0.45, sy: 1 - sad * 0.06, sharp: 0.68 + sad * 0.1 }, gpos, { id: 64, sat: 1 - sad * 0.4 }),
  );
  // the month's paper plane: up, stall, spiral down past the island edge
  if (m < 3 && mu > 0.3) {
    const k = (mu - 0.3) / 0.7;
    const p = [gpos[0] - 4 - k * 34, gpos[1] + 14 + Math.sin(k * Math.PI) * 26 - k * k * 30, gpos[2] + 6 + k * 40];
    sc.models.push({ model: makePlane(), pos: p, rot: rotMat(-0.8 + k * 3, -0.3 + k * 1.2, Math.sin(k * 9) * 0.6), id: 23, scale: 0.6 });
    label3D(f, cam, [p[0], p[1] + 10, p[2]], FLASH[m], '#ffe39a', clamp((0.75 - k) / 0.2));
  }
  shot3D(f, cam, sc, t * 2);
  // calendar page (top right)
  const ui = f.ui, flip = clamp(mu / 0.12);
  rect(ui, 380, 16, 84, 52, '#efe9da'); rect(ui, 380, 16, 84, 12, '#c0392b');
  for (const hx of [394, 450]) rect(ui, hx, 12, 3, 8, '#5a5a6a');
  text(ui, '2026', 422, 19, { align: 'center', color: '#fff6e8' });
  text(ui, MONTHS[m], 422, 40, { align: 'center', font: 'press', color: '#1e1a2a', alpha: flip });
  if (m > 0 && flip < 1) { const ph = 1 - flip; rect(ui, 380 + Math.round((1 - ph) * 60), 28 - Math.round((1 - ph) * 20), Math.round(84 * ph), Math.round(40 * ph), '#e2dccc'); }
  narr(ui, 'Месяц за месяцем — только «Флэши».', t, 7.6, 15.6);
}

export default {
  id: 'falling', dur: 21,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    if (t >= 7 && t < 16) { timelapse(f, t); return; }
    const board = t < 7;
    const s = board ? f.camera(track(t, [[0, 700], [7, 706]]), track(t, [[0, 120], [7, 126]]), track(t, [[0, 1.9], [7, 2.15]])) : f.camera(track(t, [[16, 560], [21, 564]]), track(t, [[16, 176], [21, 180]]), track(t, [[16, 2.2], [21, 2.6]]));
    fieldSet(f, s, t, { tod: board ? 'day' : 'sunset', bunting: board });
    const G = (x) => fy(x);
    if (board) {
      const rows = t < 2.0 ? OLD : NEW;
      const flips = NEW.map((r, i) => ({ t0: 2.0 + i * 0.22, row: i, from: OLD[i].name }));
      board2D(s, t, BOARD_X, G(BOARD_X), rows, { cols: 20, flips, title: t < 2.0 ? 'ПРОШЛЫЙ ГОД' : 'ТАБЛО ВЕРШИНЫ', highlight: t > 4.0 ? 5 : t < 2 ? 0 : null });
      // Gemini watching from below
      const gx = 660;
      const e = t < 2 ? 'sparkle' : t < 3.4 ? 'up' : t < 4.4 ? 'shock' : 'sad';
      drawGemini(s, gx, G(gx) - 4, { hover: 2, eyes: blinkState(t, 2) && t < 2 ? 'blink' : e, lookY: -1, brow: t > 3.4 ? (t < 4.4 ? 'raised' : 'worried') : null, mouth: t < 2 ? 'smile' : t < 4.4 ? 'o' : 'wobble', shadow: false, sat: 1 - 0.25 * phase(t, 4.4, 7) });
      if (t > 4.4) emote(s, gx + 16, G(gx) - 52, 'sweat', t - 4.4);
      narr(f.ui, 'За год все улетели вперёд.', t, 4.6, 6.9);
      chapter(f.ui, t, 0.3, 3.6, 2, 'СКОРО');
    } else {
      const gx = 548, gG = G(gx);
      crate2D(s, t, PADS.gemini + 26, G(PADS.gemini + 26) + 1, 3, { tag: t < 18.8, tagText: 'COMING SOON' });
      const read = t > 17.4;
      drawGemini(s, gx, gG, { hover: 3 + osc(t, 0.6), eyes: t < 16.9 ? 'open' : t < 17.4 ? 'wince' : t < 18.6 ? 'open' : 'teary', brow: read ? 'sad' : null, mouth: t < 18.6 ? 'flat' : 'wobble', tears: t > 18.9 ? phase(t, 18.9, 20) : 0, handL: read ? [4, -6] : [0, 0], handR: read ? [-4, -6] : [0, 0], sat: 1 - 0.4 * phase(t, 18.6, 21), shadowY: gG + 1, shadowW: 24 });
      const fl = phase(t, 16.2, 16.9, 'inQuad');
      let nx = 640 + (gx - 640) * fl, ny = 130 + (gG - 34 - 130) * fl + Math.sin(fl * 9) * 6 * (1 - fl), flap = t < 16.9 ? Math.abs(Math.sin(t * 22)) : 0;
      if (t >= 16.9 && t < 17.4) { nx = gx + Math.sin((t - 16.9) * 30) * 2; ny = gG - 32; }
      if (t >= 17.4) { nx = gx; ny = gG - 22; }
      if (t > 16.2) newspaper(s, nx, ny, 50, 36, flap, t >= 17.4);
      if (t > 18.8) { const k = phase(t, 18.8, 19.6, 'inQuad'); pset(s, PADS.gemini + 34, G(PADS.gemini) - 18 + k * 18, '#c0392b'); }
      narr(f.ui, '«3.5 Pro» так и не вышел.', t, 18.6, 20.9);
    }
    f.bloomOpts = { strength: 0.55 };
    f.gradeOpts = { sat: board ? 1.04 : 1 - 0.2 * phase(t, 18.6, 21), contrast: 1.04 };
    f.vig = 0.35;
  },
};
