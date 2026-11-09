// Scene 12 — Finale: dawn on the hill, the three sit together; the moral; tilt up to the sky; "КОНЕЦ" + a wink.
import { hillSet, skyLights, AMB, STAGE_Y, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { caption, sparkle } from '../world/props.mjs';
import { glow } from '../core/fb.mjs';
import { text } from '../core/font.mjs';

export const SFX = [
  [0, 'birds', { dur: 8, gain: 0.6 }],
  [0, 'windSoft', { dur: 11 }],
  [2.4, 'babble', { who: 'gemini', n: 2, pitch: 1.1 }],
  [4.0, 'heart'],
  [8.0, 'chime', { pitch: 0.8 }],
  [9.3, 'wink'],
];

export default {
  id: 'finale', dur: 11,
  in: { type: 'dither', dur: 0.4 },
  render(f, t) {
    const cy = track(t, [[0, 146], [5.8, 150], [8.0, 10, 'inOutCubic']]);
    const zoom = track(t, [[0, 1.22], [5.8, 1.45, 'inOutSine'], [8, 1.2, 'inOutSine']]);
    const s = f.camera(track(t, [[0, 470], [5.8, 472], [8, 462, 'inOutCubic']]), cy, zoom);
    f.ambient = AMB.dawn;
    hillSet(f, s, t, {
      sky: 'dawn', starCount: 120, starBright: 0.35, milky: 0, signFront: 'ДРУЗЬЯ', villageLights: 0,
      cloudCols: ['#c98aa0', '#e0a8b0', '#f4c8b8', '#fff0d8'], cloudFill: '#c98aa0', cloudCols2: ['#b87896', '#d896a8', '#ecb8b4', '#ffe6d0'],
      farCol: ['#8a6a9a', '#a888b0'], islandTop: '#9a7aa8', islandBody: '#7a5a90', islandDark: '#5e4478', fall: '#ffe2c0',
      beforeFar: (S) => { glow(S, 330 - S.tx * 0.1, 172 - S.ty * 0.2, 150, '#ffcf8a', 0.5, 7); glow(S, 330 - S.tx * 0.1, 172 - S.ty * 0.2, 26, '#fff6dc', 0.6, 6); },
    });
    skyLights(f, s, t, { opus: 0.6, astra: 0.6, sol: 0.4, luna: 0.4, gem4: 1 });
    f.light(330, 150, 300, '#ffd8a8', 0.35);
    const lean = phase(t, 2.3, 2.9, 'outQuad');
    drawClawd(s, 438, STAGE_Y + 1, { legs: [3, 3, 3, 3], eyes: blinkAt(t, 2) ? 'blink' : t > 2.6 ? 'happy' : 'open', mouth: 'smile', blush: lean > 0.5 ? 2 : 1, look: t > 2.6 ? 1 : 0, shadowY: STAGE_Y + 2, shadowW: 38 });
    drawCodex(s, 506, STAGE_Y + 1, { screen: t > 4 ? { mode: 'face', face: 'heart' } : { mode: 'face', face: 'happy' }, handL: t > 4 && t < 4.6 ? [-2, -12] : [0, 0], shadowY: STAGE_Y + 2, shadowW: 34 });
    drawGemini(s, 472 - lean * 5, STAGE_Y + 1, { hover: 2 + osc(t, 0.6), rot: -0.12 * lean, eyes: blinkAt(t, 4) ? 'blink' : t > 2.4 ? 'closed' : 'happy', mouth: 'smile', blush: 2, sharp: 0.62, core: 3, shadowY: STAGE_Y + 2, shadowW: 22 });
    if (t > 8) for (let i = 0; i < 6; i++) sparkle(s, 452 + Math.cos(i * 1.1 + t) * 26, 6 + Math.sin(i * 1.7 + t) * 16, 1 + (i % 2), ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i % 4], 1);
    caption(f.ui, 'Ведь искра, которую даришь другим,', t, 0.8, 5.8, { y: 228 });
    caption(f.ui, 'однажды обязательно возвращается.', t, 1.4, 5.8, { y: 240 });
    const a = phase(t, 8.0, 8.6);
    if (a > 0) {
      text(f.ui, 'КОНЕЦ', 240, 120, { align: 'center', font: 'press', scale: 3, colors: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'], outline: '#1a1030', alpha: a });
      const b = phase(t, 9.0, 9.4);
      if (b > 0) text(f.ui, 'Gemini 5 — coming soon ;)', 240, 158, { align: 'center', color: '#fff4e0', outline: '#1a1030', alpha: b });
      if (t > 9.2) {
        const pop = Math.min(1, (t - 9.2) * 5);
        drawGemini(f.ui, 432, 272 - Math.round(pop * 34), { scale: 0.75, hover: 0, eyes: 'happy', eyeR: t > 9.3 && t < 10 ? 'closed' : undefined, mouth: 'cat', shadow: false });
      }
    }
    f.bloomOpts = { strength: 0.55 };
    f.gradeOpts = { sat: 1.06, contrast: 1.03 };
    f.vig = 0.3;
    f.fade = phase(t, 10.4, 11);
  },
};
