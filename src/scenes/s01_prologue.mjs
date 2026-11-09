// Scene 1 — Prologue: "the very first spark". Gemini lights Clawd's and Codex's lanterns; they run ahead to the sky.
import { hillSet, hillY, AMB, blinkAt, walker, clamp, track, osc, glow, hash } from './common.mjs';
import { drawClawd, clawdWalk } from '../chars/clawd.mjs';
import { drawCodex, codexWalk } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { lantern, sparkle, caption } from '../world/props.mjs';
import { line, pset, hex, mix } from '../core/fb.mjs';
import { phase, ease, qt } from '../core/math.mjs';

const GX = 470; // Gemini's spot on the hill
export const SFX = [
  [0.2, 'crickets', { dur: 12.5 }],
  [3.0, 'sparkPulse'],
  [5.4, 'stepsSoft', { dur: 1.6 }],
  [7.15, 'whoosh', { pan: -0.4, pitch: 1.4 }],
  [7.15, 'whoosh', { pan: 0.4, pitch: 1.5 }],
  [7.65, 'ignite', { pan: -0.3 }],
  [7.75, 'ignite', { pan: 0.3 }],
  [8.4, 'babble', { who: 'clawd', n: 3 }],
  [8.6, 'babble', { who: 'codex', n: 3 }],
  [9.2, 'hop', { pitch: 1.2 }],
  [9.5, 'runAway', { dur: 1.4 }],
];

function sparkDraw(s, t, x, y, size) {
  const k = size;
  glow(s, x, y, 18 * k, '#fff2c8', 0.45 * k, 6);
  const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
  const r = 3 + 3 * k;
  for (let i = 0; i < 4; i++) {
    const a = t * 1.6 + i * Math.PI / 2;
    for (let j = 1; j <= r; j++) {
      const px = x + Math.cos(a) * j, py = y + Math.sin(a) * j;
      s.with({ flag: 2 }, () => pset(s, px, py, hex(j < r * 0.5 ? '#ffffff' : cols[i])));
    }
  }
  sparkle(s, x, y, Math.max(1, Math.round(2 + k * 2 + osc(t, 1.3))), '#fff6d0', 1);
}

export default {
  id: 'prologue', dur: 13,
  render(f, t) {
    const camY = track(t, [[0, -70], [3.2, 128, 'inOutCubic'], [10.4, 128], [13, -120, 'inCubic']]);
    const s = f.camera(482, camY, 1);
    f.ambient = AMB.night;
    hillSet(f, s, t, { sky: 'prologue', starCount: 70, starBright: 0.8, milky: 0.35, noStage: true, noSign: true, villageLights: 0.0, flowers: 0.05 });
    const gy = Math.round(hillY(GX));

    // --- Gemini ---
    const giving = phase(t, 6.9, 7.3), gave = t > 7.3;
    const lookUp = t > 10.6;
    const gHover = 3 + osc(t, 0.6) * 1.5 + (t > 6.6 && t < 7.6 ? 4 * Math.sin(phase(t, 6.6, 7.6) * Math.PI) : 0);
    const wave = t > 9.6 && t < 11.2;
    const gEyes = blinkAt(t, 3) ? 'blink' : t < 3 ? 'open' : t < 6 ? 'happy' : t < 7.6 ? 'open' : t < 9.6 ? 'happy' : lookUp ? (t > 12 ? 'sad' : 'up') : 'open';
    drawGemini(s, GX, gy, {
      hover: gHover, eyes: gEyes, mouth: t > 11.6 ? 'flat' : t > 3 ? 'smile' : 'smile',
      handL: [2 + Math.round(giving * 3), -4 - Math.round(giving * 4)], handR: wave ? [2, -14 + Math.round(Math.sin(t * 18) * 3)] : [-2 - Math.round(giving * 3), -4 - Math.round(giving * 4)],
      lookY: lookUp ? -1 : 0, shadowY: gy + 1, shadowW: 26,
    });
    // spark in Gemini's hands
    const sparkSize = t < 7.1 ? 0.75 + 0.25 * phase(t, 2.8, 4.5, 'outCubic') : gave ? 0.25 + 0.05 * osc(t, 2) : 0.9 - giving * 0.6;
    const sx = GX, sy = gy - 15 - gHover + (t > 6.9 ? -3 : 0);
    sparkDraw(s, t, sx, sy, sparkSize);
    f.light(sx, sy + 6, 70 * sparkSize + 20, '#fff0c8', 0.55 * sparkSize + 0.2);

    // --- Clawd (from left) & Codex (from right) ---
    const cl = walker(t, [[5.2, 300], [6.6, 420, 'outQuad'], [9.4, 420], [11.2, 760, 'inQuad']], 2.2);
    const cx = walker(t, [[5.2, 680], [6.6, 525, 'outQuad'], [9.4, 525], [11.2, 800, 'inQuad']], 2.2);
    const lit = t > 7.65 ? 1 : 0;
    const lanternRise = phase(t, 9.8, 13, 'inQuad');
    const clY = Math.round(hillY(cl.x));
    if (t > 5.0) {
      const hopA = t > 9.1 && t < 9.4 ? 3 : 0;
      const wk = cl.moving ? clawdWalk(qt(cl.ph, 10)) : {};
      const eyes = blinkAt(t, 1) ? 'blink' : t < 7.6 ? (t > 6.9 ? 'shock' : 'open') : t < 9.4 ? 'star' : 'happy';
      drawClawd(s, cl.x, clY - hopA, { ...wk, eyes, mouth: t > 7.6 && t < 9.4 ? 'open' : 'smile', armR: t > 6.2 && t < 9.8 ? -4 : 0, flip: false, shadowY: clY + 1, shadowW: 40 });
      // lantern hanging from Clawd's claw (then floats away)
      const lx = cl.x + 34 + lanternRise * 30, ly = clY - 26 - hopA - lanternRise * 260;
      if (lanternRise < 0.02) line(s, cl.x + 29, clY - 24 - hopA, lx, ly - 20, hex('#e8d8c0'));
      lantern(s, lx, ly, { w: 16 + lanternRise * 4, h: 20 + lanternRise * 4, paper: lit ? '#ff9a4a' : '#e9dcc4', lit: lit * (0.8 + lanternRise * 0.4), t, seed: 1 });
      if (lit) f.light(lx, ly - 8, 60, '#ffae60', 0.9);
    }
    if (t > 5.0) {
      const wk = cx.moving ? codexWalk(qt(cx.ph, 10)) : {};
      const cy = Math.round(hillY(cx.x));
      const hopB = t > 9.2 && t < 9.5 ? 3 : 0;
      const face = t < 7.6 ? (t > 6.9 ? { mode: 'face', face: 'wide' } : { mode: 'prompt', cursor: Math.floor(t * 2) % 2 === 0 }) : t < 9.4 ? { mode: 'face', face: 'happy' } : { mode: 'face', face: 'happy' };
      drawCodex(s, cx.x, cy - hopB, { ...wk, screen: face, handL: [-2, -8], shadowY: cy + 1, shadowW: 36 });
      const lx = cx.x - 30 + lanternRise * 40, ly = cy - 30 - hopB - lanternRise * 280;
      if (lanternRise < 0.02) line(s, cx.x - 15, cy - 21 - hopB, lx, ly - 20, hex('#e8d8c0'));
      lantern(s, lx, ly, { w: 16 + lanternRise * 4, h: 20 + lanternRise * 4, paper: lit ? '#6f9bff' : '#e9dcc4', lit: lit * (0.8 + lanternRise * 0.4), t, seed: 2 });
      if (lit) f.light(lx, ly - 8, 60, '#8fb4ff', 0.9);
    }
    // two little flames flying from the spark into the lanterns
    if (t > 7.1 && t < 7.7) {
      const u = phase(t, 7.1, 7.7, 'inOutQuad');
      for (const [tx, ty] of [[cl.x + 34, clY - 34], [cx.x - 30, Math.round(hillY(cx.x)) - 38]]) {
        const px = sx + (tx - sx) * u, py = sy + (ty - sy) * u - Math.sin(u * Math.PI) * 26;
        sparkle(s, px, py, 2, '#fff2b0', 1);
        f.light(px, py, 40, '#fff0c8', 0.8);
      }
    }

    // captions
    f.after.push(() => {});
    caption(f.ui, 'Давным-давно небо было почти пустым.', t, 0.8, 3.9);
    caption(f.ui, 'Но однажды Gemini зажёг самую первую искру', t, 4.1, 7.0);
    caption(f.ui, '...и подарил её тем, кто пришёл на свет.', t, 7.4, 10.2);
    caption(f.ui, 'А они побежали вперёд — к самому небу.', t, 10.4, 12.9);

    f.fade = 1 - phase(t, 0, 1.4);
    f.bloomOpts = { strength: 0.7 };
    f.gradeOpts = { sat: 0.92, contrast: 1.04 };
    f.vig = 0.45;
  },
};
