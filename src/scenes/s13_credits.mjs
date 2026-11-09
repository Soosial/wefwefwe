// Scene 13 — Credits roll + post-credit gag (Qwen peeks with a funnel, a bush opens Gemini's eyes, Qwen runs).
import { clamp, phase, hash } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { drawWhale, drawKimi, drawZ } from '../chars/rivals.mjs';
import { skyGradient, stars, SKIES } from '../world/sky.mjs';
import { bush } from '../world/land.mjs';
import { rect, pset } from '../core/fb.mjs';
import { text } from '../core/font.mjs';

export const SFX = [
  [5.45, 'freeze'], [5.55, 'peek'], [6.1, 'blinkEyes'], [6.35, 'scream', { who: 'qwen', gain: 0.6 }], [6.4, 'runAway', { dur: 0.5 }],
];

const ROWS = [
  { h: 22, draw: (ui, y) => text(ui, 'В РОЛЯХ', 240, y, { align: 'center', font: 'press', colors: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'] }) },
  { h: 30, draw: (ui, y) => { drawClawd(ui, 190, y + 24, { scale: 0.5, eyes: 'happy', mouth: 'open', shadow: false }); text(ui, 'Clawd — сам себя', 214, y + 10, { color: '#ffd2b8' }); } },
  { h: 32, draw: (ui, y) => { drawCodex(ui, 190, y + 28, { scale: 0.5, screen: { mode: 'face', face: 'happy' }, shadow: false }); text(ui, 'Codex — сам себя', 214, y + 12, { color: '#c8d4ff' }); } },
  { h: 34, draw: (ui, y) => { drawGemini(ui, 190, y + 32, { scale: 0.5, hover: 0, eyes: 'happy', shadow: false }); text(ui, 'Gemini — сам себя (и все его Flash)', 214, y + 13, { color: '#fff0c0' }); } },
  { h: 32, draw: (ui, y) => { drawQwen(ui, 190, y + 28, { scale: 0.5, glasses: true, mouth: 'smirk', shadow: false }); text(ui, 'Qwen — «просто учился»', 214, y + 12, { color: '#d6caff' }); } },
  { h: 30, draw: (ui, y) => { drawKimi(ui, 172, y + 24, { scale: 0.4, shadow: false }); drawZ(ui, 190, y + 24, { scale: 0.4, shadow: false }); text(ui, 'DeepSeek, Kimi, GLM — насмешники', 214, y + 10, { color: '#b8c4ff' }); } },
  { h: 26, draw: (ui, y) => text(ui, 'Зрители — 24 000 «аккаунтов»', 240, y + 8, { align: 'center', color: '#a8a0c8' }) },
  { h: 22, draw: (ui, y) => text(ui, 'Нарисовано и озвучено кодом.', 240, y + 8, { align: 'center', color: '#ffffff' }) },
  { h: 22, draw: (ui, y) => text(ui, 'Ни один пиксель не был дистиллирован.', 240, y + 8, { align: 'center', color: '#ff9a52' }) },
];

export default {
  id: 'credits', dur: 7,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    const s = f.camera(240, 135, 1);
    skyGradient(s, SKIES.deep, 22);
    stars(s, t, { count: 300, seed: 9, parallax: 0 });
    const scroll = 200 - t * 48;
    let y = scroll;
    for (const r of ROWS) {
      if (y > -40 && y < 280) r.draw(f.ui, Math.round(y));
      y += r.h;
    }
    // post-credit gag
    if (t > 5.4) {
      const peek = phase(t, 5.5, 5.8) * (1 - phase(t, 6.3, 6.4));
      const qx = 400 + (t > 6.35 ? (t - 6.35) * 500 : 0);
      if (peek > 0 || t > 6.35) drawQwen(s, qx, 270 + 30 - Math.round(Math.max(peek, t > 6.35 ? 1 : 0) * 34), { glasses: t < 6.3, eyes: t > 6.1 ? 'shock' : 'happy', mouth: t > 6.1 ? 'shout' : 'smirk', handR: [2, -14], shadow: false });
      if (t > 5.6 && t < 6.3) { rect(s, qx + 28, 236, 3, 10, '#a8b0c0'); rect(s, qx + 26, 232, 7, 4, '#e6ecf5'); }
      bush(s, 120, 272, 70, 3, t > 6.0 && t < 6.4 ? (t - 6.0) * 2 : 0);
      if (t > 6.05) { for (const dx of [0, 10]) { rect(s, 112 + dx, 250, 2, 2, '#ffffff'); } }
    }
    f.ambient = null;
    f.bloomOpts = { strength: 0.5 };
    f.vig = 0.4;
    f.fade = phase(t, 6.6, 7);
  },
};
