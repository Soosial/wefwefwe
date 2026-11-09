// Scene 7 — Meanwhile at Clawd's campfire: Qwen tiptoes out of a bush with a distiller backpack and siphons
// Clawd's glowing notes (counter: 151 000 000), freezes as a "bush" when Clawd turns around, then winks and sneaks off.
import { say, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { campSet, campfire, cgy, bush } from '../world/camp.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { note, distiller, caption, fireflies, sparkle } from '../world/props.mjs';
import { glow, pset } from '../core/fb.mjs';
import { qt, ease } from '../core/math.mjs';

const FX = 628, CLX = 592, BX = 476;
export const SFX = [
  [0, 'fireCrackle', { dur: 13, gain: 0.6 }],
  [0, 'crickets', { dur: 13, gain: 0.5 }],
  [0.3, 'hum', { who: 'clawd', dur: 8.6 }],
  [2.5, 'rustle'], [3.0, 'peek'],
  ...[4.6, 4.95, 5.3, 5.65, 6.0, 6.35].map((a, i) => [a, 'tiptoe', { pitch: 1 + (i % 2) * 0.12 }]),
  [6.6, 'slurp', { dur: 2.4 }],
  [6.7, 'counter', { dur: 2.3 }],
  [9.0, 'freeze'],
  [9.35, 'babble', { who: 'clawd', n: 2, pitch: 0.9 }],
  [10.5, 'shrug'],
  [10.9, 'hum', { who: 'clawd', dur: 2.1 }],
  [11.4, 'wink'],
  ...[11.9, 12.2, 12.5, 12.8].map((a) => [a, 'tiptoe', { pitch: 1.1 }]),
];

export default {
  id: 'spy', dur: 13,
  in: { type: 'iris', dur: 0.8, x: 300, y: 150 },
  render(f, t) {
    const qX = track(t, [[0, BX], [4.5, BX], [6.5, 522, 'linear'], [11.8, 522], [13, 444, 'linear']]);
    const zoom = track(t, [[0, 1.25], [4, 1.4, 'inOutSine'], [9, 1.5], [11, 1.45]]);
    const cx = track(t, [[0, 590], [3.5, 546, 'inOutSine'], [9, 552], [11.5, 548], [13, 528]]);
    const s = f.camera(cx, track(t, [[0, 150], [4, 158]]), zoom);
    f.ambient = [0.34, 0.4, 0.66];
    campSet(f, s, t);
    const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.7);
    const [fx, fy] = campfire(s, t, FX, cgy(FX), 1);
    f.light(fx, fy, 110, '#ff9a4a', 1.15 * flick, 0.9);
    fireflies(s, t, 470, 110, 300, 70, 9);

    // ---- Clawd on the log, humming notes ----
    const looking = t > 9.0 && t < 10.6;
    const shrug = t > 10.5 && t < 10.95;
    const humming = (t > 0.3 && t < 9.0) || t > 10.9;
    const clY = cgy(CLX) + 1;
    drawClawd(s, CLX, clY, {
      legs: [3, 3, 3, 3], eyes: looking ? (t < 9.4 ? 'squint' : 'open') : shrug ? 'closed' : humming ? 'closed' : 'open',
      mouth: looking ? 'flat' : humming ? (Math.floor(t * 3) % 2 ? 'o' : 'cat') : 'smile', look: looking ? -2 : 0,
      armL: shrug ? -9 : 0, armR: shrug ? -9 : 0, bob: humming && Math.floor(t * 3) % 2 ? 1 : 0, shadowY: clY + 1, shadowW: 38,
    });
    say(f, CLX - 4, clY - 44, t, 9.35, 10.5, 'Хм?', { dir: -1 });

    // ---- notes: drift up, or get sucked into Qwen's funnel ----
    const funnel = [qX + 36, cgy(qX) - 70];
    const siphon = t > 6.5 && t < 9.0;
    for (let k = 0; k < 40; k++) {
      const born = 0.3 + k * 0.32;
      if (born > t || (born > 9.0 && born < 10.9)) continue;
      const age = t - born;
      if (age > 3) continue;
      let x = CLX + 6 + Math.sin(age * 2.5 + k) * 6 - age * 4, y = clY - 40 - age * 18;
      if (siphon || (born < 9 && born + 3 > 6.5)) {
        const pull = clamp((Math.min(t, 9.0) - Math.max(born, 6.5)) / 0.9);
        if (pull >= 1) continue;
        const e = ease.inQuad(pull);
        x += (funnel[0] - x) * e; y += (funnel[1] - y) * e;
      }
      note(s, x, y, k % 3, '#ffb36b', { alpha: clamp(3 - age) });
    }

    // ---- Qwen ----
    let qY = cgy(qX);
    let eyes = 'open', mouth = 'smirk', look = 0, feet = null, handL = [0, 0], handR = [0, 0], bob = 0, glasses = true, eyeR;
    const peek = phase(t, 2.6, 3.1, 'outQuad');
    if (t < 4.5) { qY += Math.round(26 - peek * 22); look = t > 3.2 ? (Math.floor((t - 3.2) * 2) % 2 ? 2 : -2) : 0; }
    const tip = (t > 4.5 && t < 6.5) || t > 11.8;
    if (tip) { const ph = Math.floor(t * 5.7) % 2; feet = ph ? [3, 0] : [0, 3]; bob = ph; handL = [2, -10]; handR = [-2, -10]; }
    if (t >= 6.5 && t < 9.0) { handR = [2, -16]; mouth = 'cat'; eyes = 'happy'; }
    const frozen = t >= 9.0 && t < 10.9;
    if (frozen) { eyes = 'shock'; mouth = 'flat'; handR = [-6, -6]; handL = [6, -6]; }
    if (t >= 10.9 && t < 11.8) { eyes = 'open'; eyeR = t > 11.35 && t < 11.75 ? 'closed' : undefined; mouth = 'smirk'; look = 0; }
    const orange = clamp(phase(t, 6.8, 9.0) * 0.8);
    const hidden = t < 4.5;
    drawQwen(s, qX, qY, { glasses, eyes, eyeR, mouth, look, feet, handL, handR, bob, orange, shadow: !hidden, shadowY: cgy(qX) + 1, shadowW: 34, clipY: hidden ? cgy(qX) : undefined });
    if (t > 4.4) {
      const level = phase(t, 6.6, 9.0) * 0.95;
      distiller(s, t, qX - 26, qY - 22 - bob, { r: 8, fx: funnel[0], fy: funnel[1], level, counter: Math.round(151000000 * ease.inCubic(phase(t, 6.7, 9.0))), flow: siphon, fang: -1.2 });
      if (level > 0) f.light(qX - 26, qY - 22, 40, '#ff9a52', 0.7 * level);
    }
    if (t > 11.5 && t < 11.7) sparkle(s, qX + 6, qY - 30, 2, '#ffffff', 1);
    if (frozen) bush(s, qX + 2, qY - 4, 34, 11, t < 9.25 ? (t - 9.0) * 2 : 0);
    if (hidden || t < 4.9) bush(s, BX, cgy(BX) + 3, 56, 4, t > 2.5 && t < 3.2 ? (t - 2.5) : 0);
    else bush(s, BX, cgy(BX) + 3, 56, 4, 0);

    caption(f.ui, 'А тем временем, у костра Клода...', t, 0.2, 2.6);
    caption(f.ui, 'Квен очень любил «учиться» у Клода.', t, 11.2, 13);
    f.bloomOpts = { strength: 0.7 };
    f.gradeOpts = { sat: 1.0, contrast: 1.05 };
    f.vig = 0.5;
  },
};
