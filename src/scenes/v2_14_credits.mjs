// S14 — Credits: a slow roll over the night sky with every cast member next to their name, then a teaser line.
import { skyGradient, stars, milkyWay } from '../world/sky.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { drawWhale, drawKimi } from '../chars/rivals.mjs';
import { text } from '../core/font.mjs';
import { rect, hex } from '../core/fb.mjs';
import { clamp, phase } from '../core/math.mjs';

const G4 = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
const CAST = [
  ['КЛОД', 'Claude Opus 5.5', '#ffa070', (ui, x, y) => drawClawd(ui, x, y, { scale: 0.5, eyes: 'happy', mouth: 'smile', shadow: false })],
  ['КОДЕКС', 'GPT-6: Astra, Sol, Luna, Terra', '#9ab4ff', (ui, x, y) => drawCodex(ui, x, y, { scale: 0.5, screen: { mode: 'face', face: 'happy' }, shadow: false })],
  ['ДЖЕМИНИ', 'Gemini 4 Argon', '#ffd95a', (ui, x, y) => drawGemini(ui, x, y, { scale: 0.5, hover: 2, eyes: 'happy', mouth: 'big', shadow: false })],
  ['КИТ', 'DeepSeek V4', '#9fb0ff', (ui, x, y) => drawWhale(ui, x + 4, y - 2, { scale: 0.42, eyes: 'happy', mouth: 'smile', shadow: false })],
  ['КИМИ', 'Kimi K3.1', '#d8dcf0', (ui, x, y) => drawKimi(ui, x, y, { scale: 0.5, eyes: 'happy', mouth: 'smile', shadow: false })],
  ['КВЕН', 'Qwen (и его дистиллятор)', '#c9a8ff', (ui, x, y) => drawQwen(ui, x, y, { scale: 0.5, glasses: true, eyes: 'happy', mouth: 'smirk', shadow: false })],
];
const ROWS = [
  { h: 34, draw: (ui, y) => text(ui, 'COMING SOON', 240, y, { align: 'center', font: 'press', scale: 2, colors: G4, outline: '#140f24' }) },
  { h: 26, draw: (ui, y) => text(ui, 'пиксельный мультфильм', 240, y, { align: 'center', color: '#fff6e0', outline: '#140f24' }) },
  { h: 22, draw: (ui, y) => text(ui, 'В РОЛЯХ', 240, y, { align: 'center', font: 'press', color: '#ffcf6b', outline: '#140f24' }) },
  ...CAST.map(([name, sub, c, spr]) => ({
    h: 34, draw: (ui, y) => { spr(ui, 176, y + 22); text(ui, name, 204, y + 4, { font: 'press', color: c, outline: '#140f24' }); text(ui, sub, 204, y + 16, { color: '#fff6e0', outline: '#140f24' }); },
  })),
  { h: 18, draw: () => {} },
  { h: 14, draw: (ui, y) => text(ui, 'Острова, облака и Вершина — воксели', 240, y, { align: 'center', color: '#cfd8ff', outline: '#140f24' }) },
  { h: 26, draw: (ui, y) => text(ui, 'Каждый пиксель и каждый звук — код', 240, y, { align: 'center', color: '#cfd8ff', outline: '#140f24' }) },
  { h: 20, draw: (ui, y) => text(ui, 'Спасибо, что смотрели!', 240, y, { align: 'center', font: 'press', color: '#fff6e0', outline: '#140f24' }) },
];
const TOTAL_H = ROWS.reduce((a, r) => a + r.h, 0);

export const SFX = [[9.0, 'shimmer', { dur: 1.6 }]];
export const MUSIC = [
  { t0: 0, dur: 11, bpm: 96, root: 60, bars: [1, 6, 4, 5], fi: 0.6, fo: 1.4, mel: { inst: 'pluck', str: "1 . 3 5 6 5 3 . 2 . 4 6 5 . . . 3 . 5 1' 7 6 5 . 4 . 3 2 1 . . .", oct: 1, vel: 0.36, loop: true }, pad: { inst: 'strings', oct: -1, vel: 0.36 }, bass: { pattern: 'oom', oct: -2, vel: 0.3 }, drums: { k: 'x.......x.......', h: '..x...x...x...x.', vel: 0.18 } },
];

export default {
  id: 'credits', dur: 11,
  in: { type: 'dither', dur: 0.6 },
  render(f, t) {
    const s = f.camera(240, 135, 1);
    skyGradient(s, [[0, '#070a24'], [0.55, '#151a4a'], [1, '#2d2462']], 22);
    milkyWay(s, { k: 0.6, maxY: 270 });
    stars(s, t, { count: 320, seed: 9, parallax: 0 });
    // the roll: everything passes the centre of the screen by t ~ 8.6
    const y0 = 276 - t * ((276 + TOTAL_H - 60) / 8.6);
    let y = y0;
    for (const r of ROWS) {
      if (y > -40 && y < 290) r.draw(f.ui, Math.round(y));
      y += r.h;
    }
    const a = phase(t, 8.9, 9.6) * clamp((11 - t) / 0.5);
    if (a > 0) text(f.ui, '...но это ещё не всё', 240, 126, { align: 'center', font: 'press', color: '#fff6e0', outline: '#140f24', alpha: a });
    f.ambient = null;
    f.bloomOpts = { strength: 0.5 };
    f.vig = 0.4;
  },
};
