// S12 — The ambush (2D, the Summit at night): everyone sleeps by the campfire. Qwen climbs over the cliff with
// "Distiller 2.0" and siphons Clawd's dream notes. Now the friends protect Clawd: Gemini wakes, Codex flips to 403 DENIED,
// a FIREWALL rises, and Gemini's Flash — the thing he was laughed at for — goes off like a flashbang. The flask cracks,
// Qwen leaps off the cliff screaming; Clawd wakes up: "Huh? What did I miss?"
import { summitSet, sy } from '../world/summit.mjs';
import { emote } from '../world/field.mjs';
import { campfire } from '../world/camp.mjs';
import { say } from './common.mjs';
import { narr } from './world3d.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { note, distiller, sparkle, sparkler, firewall, dust, lantern } from '../world/props.mjs';
import { pset, line, glow, ring } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash, hop, ease } from '../core/math.mjs';

const CDX = 452, GMX = 502, FX = 550, CLX = 602, QX = 654;
export const SFX = [
  [0, 'fireCrackle', { dur: 17, gain: 0.4 }], [0, 'windSoft', { dur: 17, gain: 0.5 }],
  [0.2, 'snore', { dur: 13 }],
  [1.4, 'rustle', { gain: 0.5 }], [2.2, 'peek'],
  ...[2.7, 3.0, 3.3, 3.6, 3.9].map((a, i) => [a, 'tiptoe', { pitch: 1 + (i % 2) * 0.12 }]),
  [4.3, 'slurp', { dur: 3.8 }], [4.4, 'counter', { dur: 3.6 }],
  [5.6, 'blinkEyes'], [6.4, 'alarm', { dur: 0.9 }],
  [7.2, 'gulp'], [7.4, 'babble', { who: 'qwen', n: 2, pitch: 0.7 }],
  [8.0, 'fireWall', { dur: 2.2 }],
  [8.8, 'whoosh'], [9.0, 'match'], [9.8, 'flashBang'],
  [10.4, 'glassCrack'], [10.6, 'drain', { dur: 1.4 }], [11.2, 'deflate', { pitch: 1.4, gain: 0.5 }],
  [12.0, 'scream', { who: 'qwen' }], [12.6, 'runAway', { dur: 0.6 }], [13.0, 'slideWhistle'],
  [13.5, 'yawn'], [13.9, 'babble', { who: 'clawd', n: 5 }],
  [14.4, 'whistle'], [15.7, 'clap', { dur: 0.15, k: 0.8 }], [15.75, 'hop', { pitch: 1.3 }],
];
const SNEAK = '1 . . 3 . 4 . #4 5 . . . . . . . 1 . . 3 . 4 . #4 5 . 4 . 3 . 2 .';
export const MUSIC = [
  { t0: 0.3, dur: 2.4, bpm: 60, root: 57, scale: 'minor', bars: [1], fi: 1.0, fo: 0.5, pad: { inst: 'strings', oct: -1, vel: 0.3 } },
  { t0: 2.4, dur: 5.6, bpm: 100, root: 52, scale: 'minor', bars: [1, 1, 4, 5], fi: 0.3, fo: 0.2, mel: { inst: 'pluck', str: SNEAK, step: 0.5, oct: 1, vel: 0.7, loop: true }, bass: { pattern: 'walk', inst: 'pluck', oct: -1, vel: 0.35 } },
  { t0: 8.0, dur: 4.0, bpm: 140, root: 52, scale: 'minor', bars: [1, 6, 1, 7], fi: 0.05, fo: 0.3, pad: { inst: 'brass', oct: 0, vel: 0.3 }, drums: { k: 'x...x...x...x...', t: 'x.x.x.x.x.x.x.x.', vel: 0.4 } },
  { t0: 12.0, dur: 1.4, bpm: 168, root: 60, bars: [1, 5], fo: 0.2, mel: { inst: 'lead', str: "5 4 3 2 1 . . .", oct: 1, vel: 0.36, opts: { duty: 0.5 } } },
  { t0: 13.6, dur: 3.4, bpm: 100, root: 60, bars: [1, 4, 5, 1], fi: 0.3, fo: 0.8, mel: { inst: 'bell', str: "5 . 3 . 1 . 2 . 3 - - -", oct: 1, vel: 0.36 }, bass: { pattern: 'oom', oct: -2, vel: 0.3 } },
];

export default {
  id: 'ambush', dur: 17,
  in: { type: 'iris', dur: 0.8, x: 300, y: 170 },
  out: { type: 'dither', dur: 0.5 },
  render(f, t) {
    const flash = t > 9.8 && t < 10.5 ? 1 - (t - 9.8) / 0.7 : 0;
    const zoom = track(t, [[0, 1.4], [3.6, 1.62, 'inOutSine'], [8.0, 1.62], [8.6, 1.5, 'inOutSine'], [12.6, 1.5], [13.4, 1.7, 'inOutSine']]);
    const cx = track(t, [[0, 566], [3.6, 584, 'inOutSine'], [8.0, 582], [8.6, 574, 'inOutSine'], [12.6, 584], [13.4, 556, 'inOutSine']]);
    const s = f.camera(cx + (t > 8.0 && t < 8.5 ? Math.round(Math.sin(t * 60)) : 0), track(t, [[0, 166], [13.4, 172]]), zoom);
    summitSet(f, s, t, { tod: 'night', crystalK: 0.55, amb: [0.4 + flash * 0.8, 0.45 + flash * 0.8, 0.72 + flash * 0.5] });
    const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.7);
    const [ffx, ffy] = campfire(s, t, FX, sy(FX), 0.7);
    f.light(ffx, ffy, 110, '#ff9a4a', 0.95 * flick, 0.9);

    // ---- Codex asleep -> 403 DENIED ----
    const red = t > 6.4 && t < 12.4;
    let scr = { mode: 'face', face: 'sleep' };
    if (red) scr = { mode: 'red', lines: ['403', 'DENIED'] };
    else if (t >= 12.4 && t < 14.2) scr = { mode: 'face', face: 'smug' };
    else if (t >= 14.2 && t < 15.6) scr = { mode: 'face', face: 'dots' };
    else if (t >= 15.6) scr = { mode: 'face', face: 'happy' };
    const five = t > 15.6 && t < 16.2;
    drawCodex(s, CDX + (t > 14.2 ? 12 : 0), sy(CDX), { screen: scr, handL: red ? [-3, -12] : [0, 0], handR: five ? [6, -16] : red ? [3, -12] : [0, 0], shadowY: sy(CDX) + 1, shadowW: 34 });
    if (red) { glow(s, CDX, sy(CDX) - 34, 30, '#ff3a3a', 0.45 + 0.15 * Math.sin(t * 18), 5); f.light(CDX, sy(CDX) - 34, 80, '#ff4a4a', 0.8); }
    if (!red && t < 6.4) for (let i = 0; i < 2; i++) { const u = (t * 0.4 + i / 2) % 1; text(f.ui, 'z', ...f.toScreen(CDX + 10 + u * 8, sy(CDX) - 48 - u * 16), { color: '#cfd8ff', outline: '#140f24', alpha: Math.sin(u * Math.PI) }); }

    // ---- Gemini: asleep, one eye opens, then the Flash ----
    const up = t > 8.6;
    const gx = up ? track(t, [[8.6, GMX], [9.0, GMX + 34, 'outQuad'], [14.2, GMX + 34], [14.6, GMX + 20, 'inOutQuad']]) : GMX;
    const ghop = up ? hop(t, 8.6, 0.4, 14) + hop(t, 15.6, 0.35, 10) : 0;
    let ge = 'closed', gm = 'smile', geL;
    if (t > 5.6 && t < 6.2) { geL = 'open'; }
    else if (t >= 6.2 && t < 9.8) { ge = 'determined'; gm = 'flat'; }
    else if (t >= 9.8 && t < 12.4) { ge = 'angry'; gm = 'smirk'; }
    else if (t >= 12.4 && t < 14.2) { ge = 'happy'; gm = 'smile'; }
    else if (t >= 14.2 && t < 15.6) { ge = 'closed'; gm = 'o'; }
    else if (t >= 15.6) { ge = 'happy'; gm = 'big'; }
    drawGemini(s, gx, sy(gx) - ghop, { hover: up ? 5 + osc(t, 0.8) : 1, eyes: ge, eyeL: geL, eyeR: geL ? 'closed' : undefined, mouth: gm, sharp: 0.6, handR: t > 8.8 && t < 10.6 ? [2, -14] : five ? [-6, -16] : [0, 0], shadowY: sy(gx) + 1, shadowW: 24 });
    if (t > 8.8 && t < 10.6) {
      const [bx, by] = sparkler(s, t, gx + 14, sy(gx) - ghop - 34, { len: 16, ang: 0.2, burn: phase(t, 9.0, 10.6), lit: t > 9.0, size: 12 });
      if (t > 9.0) f.light(bx, by, 80, '#fff2c0', 1.2);
    }
    if (t > 14.4 && t < 15.6) for (let i = 0; i < 3; i++) { const u = ((t - 14.4) * 1.2 + i / 3) % 1; note(s, gx + 12 + u * 10, sy(gx) - 44 - u * 14, i, '#ffe27a', { alpha: Math.sin(u * Math.PI) }); }

    // ---- sleeping Clawd (wakes at 13.4) ----
    const awake = t > 13.4;
    const clY = sy(CLX) + 2;
    drawClawd(s, CLX, clY, { legs: [4, 4, 4, 4], eyes: awake ? (t < 13.8 ? 'half' : t > 15.6 ? 'open' : 'open') : 'closed', mouth: awake ? (t > 13.9 && t < 15.4 ? 'o' : 'flat') : 'cat', sq: awake ? 0 : 1, armR: awake && t < 13.9 ? -8 : 0, look: t > 15.6 ? -2 : 0, shadowY: clY + 1, shadowW: 38 });
    lantern(s, CLX + 30, sy(CLX + 30), { w: 12, h: 15, paper: '#ff9a4a', lit: 0.7, t, seed: 3 });
    if (!awake) for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; text(f.ui, i % 2 ? 'z' : 'Z', ...f.toScreen(CLX - 14 - u * 10, clY - 36 - u * 22), { color: '#cfd8ff', outline: '#140f24', alpha: Math.sin(u * Math.PI) }); }
    if (t > 15.6) emote(s, CLX - 4, clY - 44, '?', t - 15.6);
    // dream notes drifting up from the sleeper, pulled into the funnel while the siphon runs
    const siphonOn = t > 4.3 && t < 9.8;
    const funnel = [QX - 36, sy(QX) - 66];
    for (let k = 0; k < 30; k++) {
      const born = 0.2 + k * 0.42;
      if (born > t || born > 9.8) continue;
      const age = t - born;
      if (age > 3.2) continue;
      let x = CLX - 4 + Math.sin(age * 2 + k) * 5 + age * 4, y = clY - 34 - age * 16;
      if (born + 3.2 > 4.3) {
        const pull = clamp((Math.min(t, 9.8) - Math.max(born, 4.3)) / 1.0);
        if (pull >= 1) continue;
        const e = ease.inQuad(pull);
        x += (funnel[0] - x) * e; y += (funnel[1] - y) * e;
      }
      note(s, x, y, k % 3, '#c9a8ff', { alpha: clamp(3.2 - age) });
    }

    // ---- Qwen: climbs over the cliff, siphons, freezes, gets flashed, leaps off ----
    const climb = phase(t, 1.2, 2.6, 'outQuad');
    let qX = t < 2.6 ? 702 : track(t, [[2.6, 690], [4.2, QX]]);
    let qY = t < 2.6 ? sy(686) + 34 - climb * 34 : sy(qX);
    let eyes = 'happy', mouth = 'smirk', look = 0, feet = null, handL = [0, 0], handR = [0, 0], bob = 0, glasses = true, sx = 1, qsy = 1;
    if (t < 2.6) { eyes = 'open'; mouth = 'smirk'; handL = [-4, -12]; handR = [4, -12]; look = -2; }
    else if (t < 4.2) { const ph = Math.floor(t * 5.7) % 2; feet = ph ? [3, 0] : [0, 3]; bob = ph; handL = [2, -10]; handR = [-2, -10]; eyes = 'open'; look = -2; }
    else if (t < 6.4) { handL = [-2, -16]; mouth = 'cat'; eyes = 'happy'; }
    else if (t < 7.2) { handL = [-2, -16]; eyes = 'open'; look = -2; mouth = 'flat'; }
    else if (t < 8.0) { eyes = 'shock'; mouth = 'flat'; look = t < 7.6 ? -2 : 2; handL = [0, -8]; }
    else if (t < 9.8) { eyes = 'shock'; mouth = 'wobble'; handL = [-2, -10]; handR = [2, -10]; qsy = 0.96; }
    else if (t < 12.0) { eyes = 'wince'; mouth = 'shout'; glasses = t < 11.0 ? true : 'slip'; handL = [3, -4]; handR = [-3, -4]; }
    else { eyes = 'shock'; mouth = 'shout'; glasses = false; handL = [-3, -14]; handR = [3, -14]; const ph = Math.floor(t * 10) % 2; feet = t > 12.6 ? (ph ? [4, 0] : [0, 4]) : null; bob = t > 12.6 ? ph : 0; }
    if (t > 12.6) { qX = track(t, [[12.6, QX], [13.3, 724, 'inQuad']]); qY = sy(Math.min(qX, 668)) - Math.round(Math.sin(phase(t, 12.6, 13.0) * Math.PI) * 14) + (t > 13.0 ? (t - 13.0) ** 2 * 900 : 0); }
    const orange = t < 10.6 ? 0.4 + 0.4 * phase(t, 4.3, 9.8) : 0.8 * (1 - phase(t, 10.6, 11.8));
    if (t > 1.2 && qY < 330) drawQwen(s, qX, qY, { glasses, eyes, mouth, look, feet, handL, handR, bob, orange, sx, sy: qsy, shadow: t > 2.6 && t < 13.0, shadowY: sy(qX) + 1, shadowW: 34 });
    if (t > 12.6 && t < 13.2) for (let i = 0; i < 3; i++) dust(s, t, 12.6 + i * 0.15, qX - 16, sy(Math.min(qX, 668)), { dir: -1, n: 4, life: 0.5 });
    // the distiller on his back
    if (t > 2.6 && t < 12.6) {
      const level = t < 10.6 ? 0.25 + 0.7 * phase(t, 4.3, 9.8) : 0.95 * (1 - phase(t, 10.6, 12.0));
      distiller(s, t, qX + 24, qY - 22 - bob, { r: 9, fx: funnel[0], fy: funnel[1], fang: Math.PI + 0.9, level, flow: siphonOn, counter: t < 10.6 ? Math.round(151000000 + 40000000 * ease.inCubic(phase(t, 4.3, 9.8))) : 0 });
      text(s, '2.0', qX + 24, qY - 44, { align: 'center', color: '#ffd0a0', outline: '#1f0d5c' });
      if (t > 10.4) {
        line(s, qX + 20, qY - 28, qX + 26, qY - 20, '#ffffff'); line(s, qX + 26, qY - 20, qX + 23, qY - 15, '#ffffff');
        if (t > 10.6 && t < 12.0) for (let i = 0; i < 10; i++) { const u = (t * 2 + i / 10) % 1; pset(s, qX + 24 + Math.sin(i) * 1.5, qY - 14 + u * 14, '#ff9a52'); }
      }
    }
    // ---- firewall ----
    const fw = phase(t, 8.0, 8.7, 'outBack') * (1 - phase(t, 11.6, 12.4));
    if (fw > 0) {
      firewall(s, t, QX - 36, sy(QX) + 2, 16, 34, { rise: fw, flame: 16, label: '' });
      firewall(s, t, QX + 30, sy(QX) + 2, 16, 34, { rise: fw, flame: 16 });
      if (fw > 0.6) text(f.ui, 'FIREWALL', ...f.toScreen(QX + 8, sy(QX) - 76), { align: 'center', font: 'press', color: '#ffb45a', outline: '#3a0c08', alpha: Math.min(1, (fw - 0.6) * 3) });
      f.light(QX, sy(QX) - 20, 120, '#ff6a2a', 0.9 * fw);
    }
    if (flash > 0) {
      ring(s, gx + 18, sy(gx) - 40, 8 + (1 - flash) * 200, '#ffffff', 3, flash);
      f.fadeColor = 0xffffffff; f.fade = Math.max(0, flash - 0.25) * 1.2;
      for (let i = 0; i < 12; i++) sparkle(s, gx + 18 + Math.cos(i) * 40 * (1 - flash), sy(gx) - 40 + Math.sin(i * 1.7) * 30 * (1 - flash), 2, '#fff6c0', flash);
    }
    if (t > 9.8 && t < 10.5) text(f.ui, 'FLASH!', ...f.toScreen(gx + 22, sy(gx) - 72), { align: 'center', font: 'press', scale: 2, colors: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'], outline: '#1a1f4d' });

    narr(f.ui, 'Ночью, когда все уснули...', t, 0.5, 3.0);
    say(f, qX - 4, qY - 56, t, 7.3, 8.1, '...ой.', { dir: -1 });
    say(f, Math.min(qX, 690) - 4, Math.min(qY, sy(668)) - 56, t, 12.0, 13.1, 'АААА!', { dir: -1, style: 'shout' });
    say(f, CLX - 4, clY - 46, t, 13.9, 15.6, 'А? Что я пропустил?', { dir: -1 });
    f.bloomOpts = { strength: 0.75 };
    f.gradeOpts = { sat: 1.0, contrast: 1.05 };
    f.vig = 0.46;
  },
};
