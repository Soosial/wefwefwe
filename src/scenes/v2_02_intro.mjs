// S2 — Intro (2D): the launch field on race morning, then a close-up name card for each hero.
import { fieldSet, fy, PADS, balloon2D, rocket2D, emote } from '../world/field.mjs';
import { crowd, say } from './common.mjs';
import { narr, nameCard, chapter } from './world3d.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { rect, pset, glow, disc } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash } from '../core/math.mjs';

export const SFX = [
  [0, 'crowdAmb', { dur: 17, gain: 0.45 }],
  [0, 'birds', { dur: 17, gain: 0.35 }],
  [4.3, 'whooshSoft', { pitch: 1.2 }], [5.0, 'pat', {}], [5.5, 'pat', {}], [6.0, 'heart'],
  [8.5, 'whooshSoft', { pitch: 1.2 }], [9.1, 'ratchet', { n: 4 }], [10.6, 'blip', { pitch: 1.4 }], [11.1, 'babble', { who: 'codex', n: 2 }],
  [12.7, 'whooshSoft', { pitch: 1.2 }], [13.2, 'shimmer', { dur: 1.2 }], [14.2, 'babble', { who: 'gemini', n: 5 }],
];
export const MUSIC = [
  { t0: 0, dur: 17, bpm: 112, root: 65, bars: [1, 4, 5, 1], fi: 0.6, fo: 0.4, mel: { inst: 'pluck', str: "1 . 3 5 6 5 3 . 2 . 4 6 5 . . . 3 . 5 1' 7 6 5 . 4 . 3 2 1 . . .", oct: 1, vel: 0.36, delay: 1, loop: true }, bass: { pattern: 'oom', oct: -2, vel: 0.4 }, drums: { k: 'x.......x.......', w: '..x...x...x...x.', vel: 0.28 } },
];

function trophy(s, x, y) {
  rect(s, x - 4, y - 12, 9, 6, '#ffcf3a'); rect(s, x - 3, y - 6, 7, 2, '#e8a820'); rect(s, x - 1, y - 4, 3, 3, '#e8a820'); rect(s, x - 4, y - 1, 9, 2, '#b8801a');
  pset(s, x - 5, y - 11, '#ffcf3a'); pset(s, x - 6, y - 10, '#ffcf3a'); pset(s, x + 5, y - 11, '#ffcf3a'); pset(s, x + 6, y - 10, '#ffcf3a');
  pset(s, x - 2, y - 11, '#fff6c0'); text(s, '1', x + 1, y - 11, { align: 'center', color: '#8a5a10' });
}

export default {
  id: 'intro', dur: 17,
  in: { type: 'dither', dur: 0.6 },
  render(f, t) {
    const shot = t < 4.2 ? 0 : t < 8.4 ? 1 : t < 12.6 ? 2 : 3;
    const cams = [
      [track(t, [[0, 466], [4.2, 474]]), 152, track(t, [[0, 1.12], [4.2, 1.18]])],
      [track(t, [[4.2, 344], [8.4, 350]]), 176, 2.3],
      [track(t, [[8.4, 482], [12.6, 476]]), 172, 2.3],
      [track(t, [[12.6, 588], [17, 592]]), 180, track(t, [[12.6, 2.2], [17, 2.5]])],
    ][shot];
    const s = f.camera(cams[0], cams[1], cams[2]);
    fieldSet(f, s, t, { tod: 'morning', sun: [90, 40] });
    const G = (x) => fy(x);
    // balloon & rocket on their pads
    balloon2D(s, t, PADS.clawd - 4, G(PADS.clawd) + 1, { label: 'OPUS 5.5', flame: 0.35 });
    rocket2D(s, t, PADS.codex + 10, G(PADS.codex) + 1, { label: 'GPT-6' });
    // --- Clawd ---
    const patting = shot === 1 && t > 4.8 && t < 6.6;
    const cb = blinkState(t, 1);
    drawClawd(s, PADS.clawd + 34, G(PADS.clawd + 34), {
      eyes: cb || (shot === 1 ? (t > 6.0 ? 'happy' : 'open') : 'open'), mouth: shot === 1 && t > 6 ? 'open' : 'smile',
      armL: patting ? (Math.floor(t * 6) % 2 ? -8 : -5) : 0, look: shot === 1 && t < 6 ? -2 : 0, shadowY: G(PADS.clawd + 34) + 1, shadowW: 40,
    });
    if (shot === 1 && t > 6.0) emote(s, PADS.clawd + 44, G(PADS.clawd) - 52, 'heart', t - 6.0);
    // --- Codex with a wrench ---
    const wr = shot === 2 && t > 9.0 && t < 10.5;
    const scr = shot === 2 ? (t < 10.6 ? { mode: 'text', lines: ['> ready'], left: true, cursor: Math.floor(t * 3) % 2 === 0 } : { mode: 'face', face: 'happy' }) : { mode: 'face', face: blinkState(t, 2) ? 'squint' : 'happy' };
    drawCodex(s, PADS.codex - 22, G(PADS.codex - 22), { screen: scr, handR: wr ? [4 + (Math.floor(t * 8) % 2) * 2, -10] : [0, 0], shadowY: G(PADS.codex - 22) + 1, shadowW: 34 });
    if (wr) { const a = t * 16; rect(s, PADS.codex - 22 + 24 + Math.round(Math.cos(a) * 2), G(PADS.codex) - 32 + Math.round(Math.sin(a) * 2), 6, 2, '#9aa0b8'); }
    // --- Gemini with last year's trophy ---
    const gx = PADS.gemini, gb = blinkState(t, 3);
    const proud = shot === 3;
    drawGemini(s, gx, G(gx), {
      hover: 5 + osc(t, 0.7) * 1.5, eyes: gb || (proud ? (t > 14 ? 'sparkle' : 'happy') : 'open'), mouth: proud ? talkMouth(t, 14.2, 15.6, 'big', 3) : 'smile',
      handR: [2, -12], sharp: proud ? 0.62 : 0.68, shadowY: G(gx) + 1, shadowW: 24,
    });
    trophy(s, gx + 22, G(gx) - 40 + Math.round(osc(t, 0.7) * 1.5));
    if (proud) for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; pset(s, gx + 22 + Math.cos(a) * 9, G(gx) - 52 + Math.sin(a) * 5, '#fff6c0'); }
    // Qwen in the crowd, sketching the balloon (foreshadowing)
    if (shot === 0 || shot === 1) {
      const qx = 300, qy = G(300) + 4;
      drawQwen(s, qx, qy, { glasses: true, eyes: 'sus', mouth: 'smirk', handR: [-2, -12 + (Math.floor(t * 5) % 2)], scale: 0.7, look: 2, shadow: false });
      rect(s, qx + 12, qy - 34, 8, 10, '#f3ead2'); pset(s, qx + 14, qy - 31 + (Math.floor(t * 5) % 3), '#3a2a6a');
    }
    crowd(f, s, t, { n: 22, x0: 300, x1: 660, sticks: true, mood: (i) => ({ jump: 0.25 + 0.2 * Math.sin(i), icon: null }) });
    // --- UI ---
    chapter(f.ui, t, 0.3, 3.9, 1, 'ГОНКА К ВЕРШИНЕ');
    narr(f.ui, 'Сегодня — Великая гонка к Вершине!', t, 0.8, 4.1);
    nameCard(f.ui, t, 4.6, 8.3, 'КЛОД', 'Claude Opus 5.5 — добрый и очень умный', '#ffa070');
    nameCard(f.ui, t, 8.8, 12.5, 'КОДЕКС', 'GPT-6: Astra, Sol, Luna, Terra', '#9ab4ff');
    nameCard(f.ui, t, 13.0, 16.9, 'ДЖЕМИНИ', 'чемпион прошлого года', '#ffd95a');
    say(f, gx + 6, G(gx) - 58, t, 14.2, 16.8, 'В этот раз у меня будет 3.5 Pro!', { dir: -1 });
    f.bloomOpts = { strength: 0.5 };
    f.gradeOpts = { sat: 1.06, contrast: 1.03 };
    f.vig = 0.3;
  },
};
