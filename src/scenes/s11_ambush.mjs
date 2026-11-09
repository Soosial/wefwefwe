// Scene 11 — The ambush. Qwen sneaks back with "Distiller 2.0" to the sleeping Clawd. A bush opens Gemini's eyes,
// Codex's screen flips to "403 DENIED", a FIREWALL rises, Gemini's Flash goes off like a flashbang; the flask cracks,
// the stolen orange drains away and Qwen flees screaming. Clawd wakes up: "Huh? What did I miss?"
import { say, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { campSet, campfire, cgy, bush } from '../world/camp.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { note, distiller, caption, fireflies, sparkle, sparkler, firewall, dust, lantern } from '../world/props.mjs';
import { pset, line, glow, hex, ring } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { ease, hop } from '../core/math.mjs';

const CLX = 640, FX = 596, GB = 470, QX = 532;
export const SFX = [
  [0, 'fireCrackle', { dur: 19, gain: 0.45 }],
  [0, 'crickets', { dur: 6.5, gain: 0.5 }],
  [0.2, 'snore', { dur: 8.5 }],
  ...[0.9, 1.25, 1.6, 1.95, 2.3, 2.65].map((a, i) => [a, 'tiptoe', { pitch: 1 + (i % 2) * 0.12 }]),
  [3.4, 'slurp', { dur: 3.4 }],
  [3.5, 'counter', { dur: 3.2 }],
  [6.2, 'blinkEyes'],
  [6.9, 'alarm', { dur: 0.9 }],
  [7.6, 'gulp'],
  [8.0, 'babble', { who: 'qwen', n: 2, pitch: 0.7 }],
  [8.9, 'fireWall', { dur: 2.4 }],
  [10.9, 'rustle'], [11.1, 'match'],
  [11.3, 'flashBang'],
  [12.0, 'glassCrack'], [12.2, 'drain', { dur: 1.4 }],
  [12.7, 'deflate', { pitch: 1.4, gain: 0.5 }],
  [13.6, 'scream', { who: 'qwen' }],
  [14.2, 'runAway', { dur: 1.6 }],
  [16.3, 'yawn'],
  [16.6, 'babble', { who: 'clawd', n: 5 }],
  [17.9, 'whistle'],
  [18.4, 'hop', { pitch: 1.3 }], [18.45, 'clap', { dur: 0.15, k: 0.8 }],
];

export default {
  id: 'ambush', dur: 19,
  in: { type: 'iris', dur: 0.8, x: 240, y: 160 },
  out: { type: 'dither', dur: 0.4 },
  render(f, t) {
    const flash = t > 11.3 && t < 12.0 ? 1 - (t - 11.3) / 0.7 : 0;
    const zoom = track(t, [[0, 1.2], [3, 1.35, 'inOutSine'], [6, 1.45], [8.9, 1.25, 'inOutSine'], [14, 1.2], [16, 1.4, 'inOutSine']]);
    const cx = track(t, [[0, 530], [3, 556, 'inOutSine'], [8.9, 548], [14, 520], [16, 590, 'inOutSine']]);
    const s = f.camera(cx + (t > 8.9 && t < 9.4 ? Math.round(Math.sin(t * 60)) : 0), track(t, [[0, 150], [6, 156], [16, 160]]), zoom);
    f.ambient = [0.34 + flash * 0.8, 0.4 + flash * 0.8, 0.66 + flash * 0.6];
    campSet(f, s, t);
    const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.7);
    const [fx, fy] = campfire(s, t, FX, cgy(FX), 0.75);
    f.light(fx, fy, 100, '#ff9a4a', 0.95 * flick, 0.9);
    fireflies(s, t, 420, 110, 300, 70, 8);

    // ---- sleeping Clawd (wakes at 16) ----
    const awake = t > 16.2;
    const clY = cgy(CLX) + 2;
    drawClawd(s, CLX, clY, { legs: [4, 4, 4, 4], eyes: awake ? (t < 16.6 ? 'half' : 'open') : 'closed', mouth: awake ? (t > 16.6 && t < 17.8 ? 'o' : 'smile') : 'cat', sq: awake ? 0 : 1, armR: awake && t < 16.6 ? -8 : 0, shadowY: clY + 1, shadowW: 38 });
    lantern(s, CLX + 30, cgy(CLX + 30), { w: 12, h: 15, paper: '#ff9a4a', lit: 0.7, t, seed: 3 });
    if (!awake) for (let i = 0; i < 3; i++) {
      const u = ((t * 0.5 + i / 3) % 1);
      text(f.ui, i % 2 ? 'z' : 'Z', ...f.toScreen(CLX + 14 + u * 10, clY - 36 - u * 22), { color: '#cfd8ff', outline: '#140f24', alpha: Math.sin(u * Math.PI) });
    }
    // dream notes drifting up from the sleeper
    const siphonOn = t > 3.4 && t < 11.3;
    const funnel = [QX + 36, cgy(QX) - 70];
    for (let k = 0; k < 30; k++) {
      const born = 0.2 + k * 0.45;
      if (born > t || born > 11.3) continue;
      const age = t - born;
      if (age > 3.2) continue;
      let x = CLX + 4 + Math.sin(age * 2 + k) * 5 - age * 6, y = clY - 34 - age * 16;
      if (born + 3.2 > 3.4) {
        const pull = clamp((Math.min(t, 11.3) - Math.max(born, 3.4)) / 1.0);
        if (pull >= 1) continue;
        const e = ease.inQuad(pull);
        x += (funnel[0] - x) * e; y += (funnel[1] - y) * e;
      }
      note(s, x, y, k % 3, '#c9a8ff', { alpha: clamp(3.2 - age) });
    }

    // ---- Codex hiding behind the tent, then rising with 403 ----
    const rise = phase(t, 6.6, 7.0, 'outBack');
    const cdX = 588, cdY = cgy(cdX) + Math.round((1 - rise) * 60);
    if (rise > 0) {
      const red = t > 6.9 && t < 13.5;
      drawCodex(s, cdX, cdY, { screen: red ? { mode: 'red', lines: ['403', 'DENIED'] } : t >= 13.5 ? { mode: 'face', face: t > 17.6 ? 'happy' : 'smug' } : { mode: 'face', face: 'angry' }, handL: red ? [-3, -12] : [0, 0], handR: t > 18.4 && t < 18.7 ? [2, -14] : red ? [3, -12] : [0, 0], shadowY: cgy(cdX) + 1, shadowW: 34, clipY: cgy(cdX) + 1 });
      if (t > 6.9 && t < 13.5) { glow(s, cdX, cdY - 34, 30, '#ff3a3a', 0.45 + 0.15 * Math.sin(t * 18), 5); f.light(cdX, cdY - 34, 80, '#ff4a4a', 0.8); }
    }
    // ---- Gemini in the bush ----
    const out = t > 10.9;
    const gx = out ? track(t, [[10.9, GB], [11.2, GB + 26, 'outQuad'], [16, GB + 26], [18.2, 560, 'inOutQuad']]) : GB;
    const ghop = out ? hop(t, 10.9, 0.35, 14) + hop(t, 18.4, 0.35, 10) : 0;
    if (out) {
      drawGemini(s, gx, cgy(gx) - ghop, { hover: 5 + osc(t, 0.8), eyes: t < 13.5 ? 'angry' : t > 17.6 ? 'happy' : 'closed', mouth: t < 13.5 ? 'flat' : 'smile', sharp: 0.58, core: 4, handR: t < 12.3 ? [2, -14] : t > 18.4 && t < 18.7 ? [2, -14] : [0, 0], shadowY: cgy(gx) + 1, shadowW: 24 });
      if (t < 12.3) {
        const [bx, by] = sparkler(s, t, gx + 14, cgy(gx) - ghop - 34, { len: 16, ang: 0.2, burn: phase(t, 11.1, 12.3), lit: t > 11.1, size: 12 });
        if (t > 11.1) f.light(bx, by, 80, '#fff2c0', 1.2);
      }
    }
    bush(s, GB, cgy(GB) + 3, 50, 9, t > 10.9 && t < 11.6 ? (t - 10.9) : 0);
    if (!out && t > 6.0) {
      const blink = (t > 7.2 && t < 7.32) || (t > 9.6 && t < 9.72);
      const [ex, ey] = [GB - 6, cgy(GB) - 18];
      if (!blink) for (const dx of [0, 9]) { pset(s, ex + dx, ey, '#151a3d'); pset(s, ex + dx + 1, ey, '#151a3d'); pset(s, ex + dx, ey + 1, '#151a3d'); pset(s, ex + dx + 1, ey + 1, '#151a3d'); pset(s, ex + dx, ey, '#ffffff'); }
      if (!blink) glow(s, GB - 2, cgy(GB) - 18, 10, '#ffffff', 0.2, 3);
    }

    // ---- Qwen ----
    const qX = track(t, [[0, 380], [3.0, QX, 'linear'], [14.0, QX], [15.8, 330, 'inQuad']]);
    const qG = cgy(qX);
    let eyes = 'happy', mouth = 'smirk', look = 0, feet = null, handL = [0, 0], handR = [0, 0], bob = 0, glasses = true, sx = 1, sy = 1;
    const tip = t < 3.0;
    if (tip) { const ph = Math.floor(t * 5.7) % 2; feet = ph ? [3, 0] : [0, 3]; bob = ph; handL = [2, -10]; handR = [-2, -10]; eyes = 'open'; }
    if (t >= 3.0 && t < 6.2) { handR = [2, -16]; mouth = 'cat'; eyes = 'happy'; }
    if (t >= 6.2 && t < 7.4) { handR = [2, -16]; eyes = 'open'; look = t > 6.6 ? 2 : 0; mouth = 'flat'; }
    if (t >= 7.4 && t < 8.9) { eyes = 'shock'; mouth = 'flat'; look = t < 8.1 ? -2 : 2; handR = [0, -8]; }
    if (t >= 8.9 && t < 11.3) { eyes = 'shock'; mouth = 'wobble'; look = 0; handL = [-2, -10]; handR = [2, -10]; sy = 0.96; }
    if (t >= 11.3 && t < 13.6) { eyes = 'wince'; mouth = 'shout'; glasses = t < 12.4 ? true : 'slip'; handL = [3, -4]; handR = [-3, -4]; }
    if (t >= 13.6) { eyes = 'shock'; mouth = 'shout'; glasses = false; handL = [-3, -14]; handR = [3, -14]; const ph = Math.floor(t * 10) % 2; feet = t > 14 ? (ph ? [4, 0] : [0, 4]) : null; bob = t > 14 ? ph : 0; }
    const orange = t < 12.2 ? 0.4 + 0.4 * phase(t, 3.4, 11.3) : 0.8 * (1 - phase(t, 12.2, 13.4));
    const runY = t > 14 ? Math.abs(Math.round(Math.sin(t * 20) * 3)) : 0;
    drawQwen(s, qX, qG - runY, { glasses, eyes, mouth, look, feet, handL, handR, bob, orange, sx, sy, shadowY: qG + 1, shadowW: 34 });
    if (t > 14) for (let i = 0; i < 4; i++) dust(s, t, 14 + i * 0.35, qX + 20 + i * 4, qG, { dir: 1, n: 4, life: 0.6 });
    // the distiller: works, then cracks and drains
    if (t < 14) {
      const level = t < 12.2 ? 0.25 + 0.7 * phase(t, 3.4, 11.3) : 0.95 * (1 - phase(t, 12.2, 13.6));
      const d = distiller(s, t, qX - 26, qG - 22 - bob, { r: 9, fx: funnel[0], fy: funnel[1], level, counter: t < 12.2 ? Math.round(151000000 + 40000000 * ease.inCubic(phase(t, 3.4, 11.3))) : 0, flow: siphonOn, fang: -1.2 });
      void d;
      if (t > 3.0) text(s, '2.0', qX - 26, qG - 44, { align: 'center', color: '#ffd0a0', outline: '#1f0d5c' });
      if (t > 12.0) { // crack lines + leaking stream
        const c = '#ffffff';
        line(s, qX - 30, qG - 28, qX - 24, qG - 20, c); line(s, qX - 24, qG - 20, qX - 27, qG - 15, c);
        if (t > 12.2 && t < 13.6) for (let i = 0; i < 10; i++) { const u = ((t * 2 + i / 10) % 1); pset(s, qX - 26 + Math.sin(i) * 1.5, qG - 14 + u * 14, '#ff9a52'); }
      }
    } else if (t < 19) {
      // abandoned hose and funnel on the grass
      line(s, QX - 30, cgy(QX - 30), QX + 20, cgy(QX + 20) - 1, '#4a5a50');
    }
    // ---- firewall ring ----
    const fw = phase(t, 8.9, 9.6, 'outBack') * (1 - phase(t, 12.6, 13.4));
    if (fw > 0) {
      firewall(s, t, qX - 46, qG + 2, 16, 34, { rise: fw, flame: 16, label: '' });
      firewall(s, t, qX + 32, qG + 2, 16, 34, { rise: fw, flame: 16 });
      if (fw > 0.6) text(f.ui, 'FIREWALL', ...f.toScreen(qX - 8, qG - 74), { align: 'center', font: 'press', color: '#ffb45a', outline: '#3a0c08', alpha: Math.min(1, (fw - 0.6) * 3) });
      f.light(qX, qG - 20, 120, '#ff6a2a', 0.9 * fw);
    }
    if (flash > 0) {
      ring(s, gx + 18, cgy(gx) - 40, 8 + (1 - flash) * 200, '#ffffff', 3, flash);
      f.fadeColor = 0xffffffff; f.fade = Math.max(0, flash - 0.25) * 1.2;
      for (let i = 0; i < 12; i++) sparkle(s, gx + 18 + Math.cos(i) * 40 * (1 - flash), cgy(gx) - 40 + Math.sin(i * 1.7) * 30 * (1 - flash), 2, '#fff6c0', flash);
    }
    if (t > 11.3 && t < 11.9) text(f.ui, 'FLASH!', ...f.toScreen(gx + 22, cgy(gx) - 70), { align: 'center', font: 'press', scale: 2, colors: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'], outline: '#1a1f4d' });

    say(f, qX, qG - 56, t, 8.0, 8.9, '...ой.', { dir: 1 });
    say(f, qX, qG - 56, t, 13.6, 14.6, 'АААА!', { dir: 1, style: 'shout' });
    say(f, CLX, clY - 46, t, 16.6, 18.0, 'А? Что я пропустил?', { dir: -1 });
    caption(f.ui, 'Но Квен не сдавался.', t, 0.3, 2.8);
    f.bloomOpts = { strength: 0.75 };
    f.gradeOpts = { sat: 1.0, contrast: 1.05 };
    f.vig = 0.48;
  },
};
