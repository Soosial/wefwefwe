// S5 — Overtaken: 3D sky chase (the DeepSeek whale and Kimi fly past Gemini's paper plane and soak it),
// then on the field they mock him, slap the COMING SOON tag on his face and leave. Colour drains, rain begins.
import { fieldSet, fy, PADS, crate2D, emote } from '../world/field.mjs';
import { say } from './common.mjs';
import { SKY3, world, chr, shot3D, cam3, label3D, narr, rotMat } from './world3d.mjs';
import { makePlane, makeCrescent } from '../world/voxworld.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawWhale, drawKimi } from '../chars/rivals.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { tag, rain } from '../world/props.mjs';
import { rect, pset, line, poly, disc, hex } from '../core/fb.mjs';
import { clamp, track, phase, osc, hash, ease, hop } from '../core/math.mjs';

export const SFX = [
  [0, 'flyWind', { dur: 8.5 }],
  [1.4, 'whaleSong', { pitch: 1.0 }], [3.4, 'spray', { dur: 0.9 }], [3.6, 'laugh', { who: 'whale', gain: 0.6 }],
  [5.2, 'whooshSoft', { pitch: 1.4 }], [5.6, 'laugh', { who: 'kimi', gain: 0.5 }], [7.4, 'slideWhistle'],
  [8.9, 'thud'], [9.4, 'whaleSong', { pitch: 1.15 }],
  [9.7, 'babble', { who: 'whale', n: 4 }], [10.5, 'laugh', { who: 'whale' }],
  [11.5, 'stepsSoft', { dur: 0.9 }], [11.8, 'babble', { who: 'kimi', n: 5 }],
  [13.6, 'peel'], [14.4, 'paperSlap', { gain: 0.6 }], [14.6, 'babble', { who: 'kimi', n: 4, pitch: 1.2 }],
  [15.6, 'laugh', { who: 'whale' }], [15.7, 'laugh', { who: 'kimi' }], [16.3, 'spray', { dur: 0.6 }], [16.4, 'laugh', { who: 'kimi', gain: 0.7 }],
  [17.3, 'whooshSoft'], [17.6, 'stepsSoft', { dur: 1.0, pan: -0.6 }],
  [19.2, 'rainStart', { dur: 2.8 }], [20.4, 'sniff'],
];
export const MUSIC = [
  { t0: 0, dur: 8.6, bpm: 132, root: 60, bars: [1, 1, 4, 5], fi: 0.3, fo: 0.3, mel: { inst: 'lead', str: "5 . 3 . 6 5 3 . 5 . 3 . 6 5 3 . 6 . 4 . 1' 6 4 . 5 . 7 . 2' . . .", vel: 0.36, loop: true, opts: { duty: 0.5, rel: 0.03 } }, bass: { pattern: 'oom', oct: -2, vel: 0.42 }, drums: { k: 'x.......x.......', s: '....x.......x...', w: '..x...x...x...x.', vel: 0.32 } },
  { t0: 9.4, dur: 8.4, bpm: 132, root: 60, bars: [1, 1, 4, 5], fi: 0.2, fo: 0.8, mel: { inst: 'lead', str: "5 . 3 . 6 5 3 . 5 . 3 . 6 5 3 . 6 . 4 . 1' 6 4 . 5 . 7 . 2' . . .", vel: 0.34, delay: 0.5, loop: true, opts: { duty: 0.5, rel: 0.03 } }, bass: { pattern: 'oom', oct: -2, vel: 0.4 }, drums: { k: 'x.......x.......', w: '..x...x...x...x.', vel: 0.3 } },
  { t0: 18.2, dur: 3.8, bpm: 60, root: 57, scale: 'minor', bars: [1], fi: 0.6, fo: 0.6, pad: { inst: 'strings', oct: -1, vel: 0.35 } },
];

function chase(f, t) {
  const base = [270 + t * 14, 60 + Math.sin(t * 1.3) * 4 - phase(t, 7.2, 8.5, 'inQuad') * 50, -170];
  const droop = phase(t, 3.6, 4.4) * 0.35 + phase(t, 7.0, 8.5) * 0.6;
  const cam = cam3(f, [base[0] - 26, base[1] + 12, base[2] - 78], [base[0] + 4, base[1] + 6, base[2]], 0.82);
  const sc = { ...SKY3.day, models: world(false).slice(), points: [] };
  sc.models.push(
    { model: makePlane(), pos: base, rot: rotMat(Math.PI / 2, droop, Math.sin(t * 3) * 0.12), scale: 1.1, id: 23 },
    chr('gemini', { eyes: t < 1.6 ? 'determined' : t < 3.4 ? 'shock' : t < 5.2 ? 'wince' : 'sad', brow: t > 1.6 && t < 3.4 ? 'raised' : t > 5.2 ? 'worried' : 'focus', mouth: t < 1.6 ? 'flat' : t < 3.4 ? 'gasp' : 'wobble', sat: 1 - phase(t, 3.6, 5) * 0.25 }, [base[0] + 1, base[1] + 5, base[2]], { id: 64 }),
  );
  // the whale rises past
  const wu = phase(t, 1.0, 6.5);
  const wpos = [base[0] - 40 + wu * 120, base[1] - 70 + ease.inOutSine(wu) * 150, base[2] + 40];
  if (t > 1.0) sc.models.push(chr('whale', { eyes: t > 3.2 && t < 4.6 ? 'laugh' : 'happy', mouth: t > 3.2 && t < 4.6 ? 'laugh' : 'smile', spout: t > 3.3 && t < 4.4 ? 1 : 0, tail: Math.sin(t * 3) }, wpos, { id: 70, scale: 0.85, flip: true }));
  // the spout rains on Gemini
  if (t > 3.3 && t < 4.6) for (let i = 0; i < 40; i++) { const k = (hash(i) + t * 2) % 1; sc.points.push({ p: [base[0] - 6 + hash(i * 3) * 16, base[1] + 34 - k * 34, base[2] - 4 + hash(i * 5) * 8], c: i % 3 ? '#8fd8ff' : '#e6f8ff', size: 1.4, flag: 2 }); }
  // Kimi on the crescent zooms by
  const ku = phase(t, 4.9, 7.6, 'inOutQuad');
  const kpos = [base[0] - 80 + ku * 200, base[1] + 10 + ku * 40, base[2] - 18];
  if (t > 4.9) sc.models.push({ model: makeCrescent(), pos: kpos, rot: rotMat(0, 0, -0.3), id: 71 }, chr('kimi', { eyes: 'laugh', mouth: 'big' }, [kpos[0], kpos[1] + 4, kpos[2] - 1], { id: 72 }));
  shot3D(f, cam, sc, t);
  label3D(f, cam, [wpos[0], wpos[1] + 40, wpos[2]], 'DEEPSEEK V4', '#9fb0ff', clamp((t - 1.8) / 0.4) * clamp((6.2 - t) / 0.4));
  label3D(f, cam, [kpos[0], kpos[1] + 26, kpos[2]], 'KIMI K3.1', '#d8dcf0', clamp((t - 5.2) / 0.4) * clamp((7.6 - t) / 0.4));
  label3D(f, cam, [base[0], base[1] - 8, base[2]], '3.8 FLASH', '#ffe39a', clamp(t / 0.4) * clamp((3.4 - t) / 0.4));
  narr(f.ui, 'Его обгоняли даже те, кого он раньше обгонял.', t, 4.8, 8.4);
}

export default {
  id: 'overtaken', dur: 22,
  in: { type: 'dither', dur: 0.4 },
  render(f, t) {
    if (t < 8.5) { chase(f, t); return; }
    const s = f.camera(track(t, [[8.5, 548], [18, 552], [22, 556]]), track(t, [[8.5, 160], [18, 164], [22, 176]]), track(t, [[8.5, 1.55], [18, 1.6], [22, 2.1]]));
    const gloom = phase(t, 18.2, 22);
    fieldSet(f, s, t, { tod: 'day', bunting: false });
    f.ambient = [1 - gloom * 0.5, 1 - gloom * 0.46, 1 - gloom * 0.3];
    const G = (x) => fy(x);
    const cX = PADS.gemini + 26;
    crate2D(s, t, cX, G(cX) + 1, 3, { tag: t < 13.6 });
    // Gemini
    const gx = 540, gG = G(gx);
    const land = hop(t, 8.5, 0.4, 14);
    let eyes = blinkState(t, 4) || 'open', mouth = 'flat', brow = null, tears = 0, look = 0;
    if (t < 9.4) { eyes = 'spiral'; mouth = 'wobble'; }
    else if (t < 11.4) { eyes = 'open'; brow = 'worried'; look = 2; }
    else if (t < 13.4) { eyes = 'sad'; brow = 'worried'; look = -2; mouth = 'wobble'; }
    else if (t < 15.6) { eyes = 'wince'; brow = 'sad'; mouth = 'wobble'; }
    else if (t < 18.6) { eyes = 'teary'; brow = 'sad'; mouth = 'sob'; tears = phase(t, 15.6, 17); }
    else { eyes = 'sad'; brow = 'sad'; mouth = 'frown'; tears = 1; }
    drawGemini(s, gx, gG - land, { hover: 3, eyes, mouth, brow, tears, look, sat: 1 - 0.85 * gloom, sharp: 0.68 + 0.14 * gloom, R: 26.5 - 2 * gloom, sy: 1 - 0.06 * gloom, shadowY: gG + 1, shadowW: 24 });
    // soggy paper plane on the ground
    poly(s, [[gx - 26, gG], [gx - 10, gG - 3], [gx - 12, gG + 1]], '#d8d6cc'); line(s, gx - 24, gG - 1, gx - 13, gG - 2, hex('#c8b85a'));
    // the tag stuck on his face, sliding off later
    if (t > 14.4) { const k = phase(t, 19.2, 20.4, 'inQuad'); if (k < 1) tag(s, gx, gG - 32 + k * 30, 'COMING SOON', { ink: '#c0392b' }); }
    // whale
    const wy = track(t, [[9.2, 40], [10.2, 132, 'outQuad'], [17.2, 132], [18.8, 20, 'inQuad']]) + Math.round(osc(t, 0.5) * 2);
    const wLaugh = (t > 10.4 && t < 11.6) || (t > 15.6 && t < 17.2);
    if (t > 9.2 && t < 18.8) drawWhale(s, 640, wy, { eyes: wLaugh ? 'laugh' : 'happy', mouth: wLaugh ? 'laugh' : talkMouth(t, 9.7, 11.0, 'smile', 2) === 'smile' ? 'smile' : 'open', tail: Math.sin(t * (wLaugh ? 9 : 3)), spout: t > 16.2 && t < 17 ? 1 : 0, spoutPh: t * 9, brow: wLaugh ? 'raised' : null });
    // Kimi
    const kx = track(t, [[11.3, 380], [12.0, 470, 'outQuad'], [13.4, 470], [14.0, 520, 'inOutQuad'], [14.6, 514], [17.2, 514], [18.4, 360, 'inQuad']]);
    const kLaugh = t > 15.6 && t < 17.2;
    if (t > 11.3 && t < 18.4) drawKimi(s, kx + (kLaugh ? Math.round(Math.sin(t * 40)) : 0), G(kx) - (kLaugh ? Math.abs(Math.round(Math.sin(t * 16) * 2)) : 0), { eyes: kLaugh ? 'laugh' : t > 13.6 && t < 15.4 ? 'happy' : 'open', mouth: kLaugh ? 'big' : talkMouth(t, 11.8, 13.2, 'smile', 5) === 'smile' ? (t > 14.6 && t < 15.4 ? 'tongue' : 'smile') : 'big', brow: t > 11.8 && t < 13.2 ? 'raised' : null, handR: t > 13.6 && t < 14.6 ? [4, -10] : kLaugh ? [0, -6] : [0, 0], shadowY: G(kx) + 1, shadowW: 26 });
    if (t > 13.6 && t < 14.4) tag(s, kx + 26, G(kx) - 36, 'COMING SOON', { ink: '#c0392b' });
    if (t > 9.4 && t < 11.0) emote(s, gx + 18, gG - 50, 'sweat', t - 9.4);
    if (t > 18.6) emote(s, gx, gG - 56, 'gloom', t - 18.6);
    say(f, 612, wy - 40, t, 9.7, 11.6, 'Опять Flash? Ха-ха!', { dir: -1 });
    say(f, kx, G(kx) - 40, t, 11.8, 13.5, 'Даже мы тебя обогнали!', { dir: 1 });
    say(f, kx + 10, G(kx) - 40, t, 14.6, 15.6, 'Скоро-скоро~!', { dir: 1 });
    if (t > 19.0) rain(s, t, { n: Math.round(220 * phase(t, 19, 22)), speed: 280, slant: 0.2, alpha: 0.55 });
    narr(f.ui, 'А друзей, чтобы заступиться, у него не было.', t, 18.8, 21.9);
    f.bloomOpts = { strength: 0.5 };
    f.gradeOpts = { sat: 1 - 0.55 * gloom, contrast: 1.04, bright: 1 - 0.12 * gloom };
    f.vig = 0.32 + 0.2 * gloom;
  },
};
