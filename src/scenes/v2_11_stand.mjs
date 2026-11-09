// S11 — Room for everyone (2D, top of the Summit at sunset): the DeepSeek whale rises over the cliff with Kimi on its head,
// ready for the old joke ("Flash, still 'soon'?"). The three stand shoulder to shoulder; Gemini answers kindly —
// "Not soon. Now. Fly with us!" — the rivals melt, Kimi drops the COMING SOON tag, the whale's spout makes a rainbow.
import { summitSet, sy, CRYSTAL_X, G4 } from '../world/summit.mjs';
import { emote } from '../world/field.mjs';
import { say } from './common.mjs';
import { narr } from './world3d.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawWhale, drawKimi } from '../chars/rivals.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { tag, sparkle } from '../world/props.mjs';
import { pset, glow } from '../core/fb.mjs';
import { clamp, track, phase, osc, hop, ease } from '../core/math.mjs';

const CL = 436, GM = 486, CD = 536, WX = 664, KX = 606;
const RAINBOW = ['#ff5a5a', '#ffa64a', '#ffe25a', '#6ad46a', '#5aa8ff', '#9a7aff'];

export const SFX = [
  [0, 'windSoft', { dur: 14, gain: 0.8 }],
  [0.4, 'laugh', { who: 'clawd', gain: 0.4 }], [0.8, 'babble', { who: 'gemini', n: 3, gain: 0.6 }],
  [1.9, 'whaleSong', { pitch: 0.9 }], [2.4, 'whooshSoft', { pitch: 0.7 }],
  [3.1, 'babble', { who: 'whale', n: 5 }], [3.6, 'hop', { pitch: 1.3 }],
  [4.7, 'babble', { who: 'kimi', n: 4, pitch: 1.2 }], [5.4, 'laugh', { who: 'kimi', gain: 0.4 }],
  [6.4, 'stepsSoft', { dur: 0.6 }], [6.6, 'stepsRobot', { dur: 0.5 }],
  [8.1, 'babble', { who: 'gemini', n: 6 }],
  [10.3, 'gulp'], [10.6, 'paper'], [10.9, 'whaleSong', { pitch: 1.25 }], [11.0, 'spray', { dur: 1.0 }],
  [11.3, 'colorSweep', { dur: 1.2 }], [12.0, 'laugh', { who: 'whale', gain: 0.5 }], [12.2, 'laugh', { who: 'kimi', gain: 0.4 }],
];
export const MUSIC = [
  { t0: 0, dur: 2.0, bpm: 100, root: 62, bars: [1, 4], fi: 0.3, fo: 0.3, mel: { inst: 'bell', str: "1 3 5 1' 5 3 1 .", oct: 1, vel: 0.36 }, pad: { inst: 'strings', oct: -1, vel: 0.35 } },
  { t0: 2.2, dur: 4.2, bpm: 132, root: 60, bars: [1, 1, 4, 5], fi: 0.2, fo: 0.4, mel: { inst: 'lead', str: "5 . 3 . 6 5 3 . 5 . 3 . 6 5 3 . 6 . 4 . 1' 6 4 . 5 . 7 . 2' . . .", vel: 0.32, opts: { duty: 0.5, rel: 0.03 } }, bass: { pattern: 'oom', oct: -2, vel: 0.36 } },
  { t0: 6.4, dur: 1.8, bpm: 70, root: 50, scale: 'minor', bars: [1], fi: 0.3, fo: 0.2, pad: { inst: 'strings', oct: 0, vel: 0.4 }, drums: { k: 'x.......x.......', vel: 0.4 } },
  { t0: 8.0, dur: 6.0, bpm: 96, root: 62, bars: [4, 5, 1, 6, 4, 5, 1, 1], fi: 0.5, fo: 1.0, mel: { inst: 'bell', str: "3 . 5 . 1' . 7 . 6 . 5 . 1' . . . 2' . 1' . 7 . 5 . 1' - - -", oct: 1, vel: 0.44 }, pad: { inst: 'strings', oct: -1, vel: 0.44 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.14, from: 2.4 } },
];

function rainbow(s, k) {
  const cx = 560, cy = sy(560) - 4, R0 = 120;
  s.with({ flag: 2 }, () => {
    for (let b = 0; b < 6; b++) for (let i = 0; i <= 220 * k; i++) {
      const a = Math.PI - (i / 220) * Math.PI, r = R0 - b * 3;
      for (let w = 0; w < 3; w++) pset(s, cx + Math.cos(a) * (r - w), cy - Math.sin(a) * (r - w) * 0.62, RAINBOW[b]);
    }
  });
}

export default {
  id: 'stand', dur: 14,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    const zoom = track(t, [[0, 1.55], [2.0, 1.5], [6.4, 1.5], [7.6, 2.1, 'inOutCubic'], [9.6, 2.15], [10.6, 1.45, 'inOutSine'], [14, 1.4]]);
    const cx = track(t, [[0, 500], [2.0, 552], [6.4, 556], [7.6, 500, 'inOutCubic'], [9.6, 498], [10.6, 548, 'inOutSine']]);
    const cy = track(t, [[0, 170], [6.4, 168], [7.6, 176, 'inOutCubic'], [9.6, 176], [10.6, 158, 'inOutSine']]);
    const s = f.camera(cx, cy, zoom);
    const rb = phase(t, 11.1, 12.3);
    summitSet(f, s, t, {
      tod: 'sunset', sun: [70, 112], pennants: [{ x: CL + 14, cols: '#d97757' }, { x: GM + 22, cols: G4 }, { x: CD + 14, cols: '#5a7cff' }],
      beforeGround: rb > 0 ? (S) => rainbow(S, rb) : null,
    });
    // ---- the three: celebrating -> shoulder to shoulder -> Gemini's open hand ----
    const close = phase(t, 6.4, 7.2, 'inOutQuad');
    const clX = CL + close * 14, cdX = CD - close * 14;
    const cheer = t < 2.0, invite = t > 8.0 && t < 10.6, joy = t > 10.6;
    const j = (k) => (cheer || joy ? Math.abs(Math.sin(t * 5 + k)) * (joy ? 3 : 5) : 0);
    let ce = blinkState(t, 1) || 'happy', cm = 'smile', cb = null;
    let de = 'happy', ge = blinkState(t, 3) || 'happy', gm = 'smile', gb = null;
    if (t > 2.0 && t < 6.4) { ce = 'open'; cm = 'flat'; cb = 'worried'; de = 'worried'; ge = t < 3.0 ? 'open' : t < 5.6 ? 'sad' : 'open'; gm = t < 5.6 ? 'wobble' : 'flat'; gb = 'worried'; }
    if (t >= 6.4 && t < 8.0) { ce = 'determined'; cm = 'flat'; cb = 'focus'; de = 'determined'; ge = 'open'; gm = 'smallSmile'; gb = null; }
    if (invite) { ce = blinkState(t, 1) || 'open'; cm = 'smile'; de = 'happy'; ge = blinkState(t, 3) || 'happy'; gm = talkMouth(t, 8.1, 10.0, 'smile', 3); }
    if (joy) { ce = blinkState(t, 1) || 'happy'; cm = 'open'; de = 'heart'; ge = blinkState(t, 3) || 'sparkle'; gm = 'big'; }
    drawClawd(s, clX, sy(clX) - j(0), { eyes: ce, mouth: cm, brow: cb, look: t > 2 && t < 10.6 ? 2 : 0, armR: cheer || joy ? -10 : 0, armL: cheer || joy ? -10 : 0, shadowY: sy(clX) + 1, shadowW: 38 });
    drawCodex(s, cdX, sy(cdX) - j(2), { screen: { mode: 'face', face: de }, handL: cheer || joy ? [-2, -14] : [0, 0], handR: cheer || joy ? [2, -14] : [0, 0], shadowY: sy(cdX) + 1, shadowW: 34 });
    drawGemini(s, GM + (invite ? 4 * phase(t, 8.0, 8.4) : 0), sy(GM), {
      hover: 5 + osc(t, 0.8) + j(4), eyes: ge, mouth: gm, brow: gb, look: t > 2 && t < 10.6 ? 2 : 0,
      handR: invite ? [6, -6] : t > 12.2 ? [4, -10] : cheer || joy ? [2, -14] : [0, 0], handL: joy ? [-2, -14] : [0, 0], shadowY: sy(GM) + 1, shadowW: 24,
    });
    if (t > 2.4 && t < 6.2) emote(s, GM + 14, sy(GM) - 52, 'sweat', t - 2.4);
    // ---- the whale rises over the cliff with Kimi on its head ----
    const wy = track(t, [[1.9, 300], [3.2, 176, 'outBack']]) + Math.round(osc(t, 0.5) * 2);
    const wLaugh = t > 3.1 && t < 4.4, wShy = t > 10.2 && t < 11.0, wJoy = t > 11.0;
    if (t > 1.9) drawWhale(s, WX, wy, {
      eyes: wShy ? 'shock' : wJoy ? 'happy' : wLaugh ? 'laugh' : 'happy', mouth: wShy ? 'o' : wJoy ? 'big' : wLaugh ? 'laugh' : talkMouth(t, 3.1, 4.6, 'smile', 2) === 'smile' ? 'smile' : 'open',
      brow: wLaugh ? 'raised' : wShy ? 'worried' : null, tail: Math.sin(t * (wJoy ? 7 : 3)), spout: t > 11.0 && t < 12.2 ? 1 : 0, spoutPh: t * 9,
    });
    // Kimi: rides in, hops onto the plateau, teases with the old tag, drops it
    const onWhale = t < 3.6;
    const kx = onWhale ? WX - 18 : track(t, [[3.6, WX - 18], [4.1, KX, 'outQuad']]);
    const ky = onWhale ? wy - 30 : sy(kx) - hop(t, 3.6, 0.5, 16) - (t > 11.0 ? Math.abs(Math.round(Math.sin(t * 9) * 3)) : 0);
    const kTease = t > 4.6 && t < 6.4, kShy = t > 8.6 && t < 11.0;
    if (t > 1.9) drawKimi(s, kx, ky, {
      eyes: kTease ? 'laugh' : kShy ? (t > 10.2 ? 'teary' : 'shock') : t > 11.0 ? 'happy' : 'open', mouth: kTease ? 'tongue' : kShy ? 'o' : t > 11.0 ? 'big' : 'smile',
      brow: kShy ? 'worried' : null, handR: t > 4.4 && t < 10.4 ? [4, -10] : t > 11.0 ? [0, -12] : [0, 0], shadow: !onWhale, shadowY: sy(kx) + 1, shadowW: 26,
    });
    // the old tag: waved, then dropped — the wind carries it into Gemini's hand
    if (t > 4.4) {
      const drop = phase(t, 10.4, 12.4, 'inOutSine');
      const tx = kx + 24 + Math.sin(t * 9) * (kTease ? 2 : 0) + (GM + 14 - kx - 24) * drop, ty = ky - 38 + (sy(GM) - 52 - ky + 38) * drop - Math.sin(drop * Math.PI) * 30 + Math.sin(drop * 14) * 3 * (1 - drop);
      tag(s, tx, ty, 'COMING SOON', { ink: '#c0392b' });
    }
    if (t > 9.6 && t < 11.0) { emote(s, kx + 10, ky - 50, 'sweat', t - 9.6); }
    if (wJoy) for (let i = 0; i < 6; i++) sparkle(s, 520 + Math.cos(t * 2 + i) * 90, 120 + Math.sin(t * 3 + i * 2) * 26, 1 + (i % 2), RAINBOW[i], 1);
    say(f, WX - 40, wy - 44, t, 3.1, 5.0, 'Ну что, Флэш, опять «скоро»?', { dir: -1 });
    say(f, kx + 8, ky - 46, t, 4.7, 6.4, 'Скоро-скоро~!', { dir: -1 });
    say(f, GM + 10, sy(GM) - 62, t, 8.1, 10.5, 'Не «скоро». Уже. Летите с нами!', { dir: 1 });
    narr(f.ui, 'На Вершине хватит места всем.', t, 11.7, 13.9);
    f.bloomOpts = { strength: 0.6 };
    f.gradeOpts = { sat: 1.05, contrast: 1.04 };
    f.vig = 0.32 + 0.12 * phase(t, 6.4, 7.6) * (1 - phase(t, 9.6, 10.6));
  },
};
