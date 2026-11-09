// S3 — The race (2D countdown -> 3D launch -> 2D crate reveal -> 2D paper-plane gag).
import { fieldSet, fy, PADS, balloon2D, rocket2D, crate2D, emote } from '../world/field.mjs';
import { crowd, say, label } from './common.mjs';
import { SKY3, world, chr, shot3D, cam3, camPath, label3D, narr, groundAt, LAUNCH } from './world3d.mjs';
import { makeBalloon, makeRocket, makeCrate } from '../world/voxworld.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { rect, pset, poly, line, glow, disc, hex } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash, ease, hop } from '../core/math.mjs';

export const SFX = [
  [0, 'crowdAmb', { dur: 4.4, gain: 0.5 }],
  [0.6, 'beep'], [1.6, 'beep'], [2.6, 'beep'], [3.6, 'beepHi'],
  [4.5, 'burner', { dur: 3.5 }], [4.7, 'rocketLaunch'], [5.0, 'cheer', { dur: 4.5, k: 1.2 }],
  [10.6, 'whooshSoft', { pitch: 1.1 }], [11.2, 'tarp'], [11.7, 'stingSad'], [12.5, 'strain', { dur: 1.2 }], [13.9, 'murmur', { dur: 1.2 }],
  [15.6, 'paper'], [16.6, 'throw', { pitch: 1.3 }], [16.7, 'slideWhistle', { up: true }], [18.0, 'slideWhistle'], [18.6, 'bonk'], [18.7, 'laugh', { who: 'kimi', gain: 0.5 }], [18.9, 'crowdLaugh', { dur: 1.6 }],
];
export const MUSIC = [
  { t0: 0, dur: 4.5, bpm: 120, root: 60, bars: [[0, 7, 12]], fi: 0.2, fo: 0.05, pad: { inst: 'strings', oct: -1, vel: 0.35 }, drums: { t: 'x...x...x...x...', vel: 0.35 } },
  { t0: 4.5, dur: 6.0, bpm: 120, root: 60, bars: [1, 4, 5, 1], fi: 0.05, fo: 0.6, mel: { inst: 'brass', str: "1 . 3 . 5 . 1' - 5 . 1' . 3' - - -", oct: 0, vel: 0.5 }, pad: { inst: 'strings', oct: -1, vel: 0.45 }, bass: { pattern: 'roots4', oct: -2, vel: 0.45 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', cr: 'x...............', vel: 0.45 } },
  { t0: 15.6, dur: 5.2, bpm: 132, root: 60, bars: [1, 5], fi: 0.1, fo: 0.6, mel: { inst: 'pluck', str: "5 3 5 3 1' . . . 7 . 6 . 5 . . .", oct: 1, vel: 0.4 }, bass: { pattern: 'oom', oct: -2, vel: 0.35 } },
];

function countdown(ui, t) {
  const marks = [[0.6, '3', '#ffd95a'], [1.6, '2', '#ffd95a'], [2.6, '1', '#ffd95a'], [3.6, 'СТАРТ!', '#7dff9a']];
  for (const [a, str, c] of marks) {
    const u = t - a;
    if (u < 0 || u > 0.95) continue;
    const sc = u < 0.12 ? 6 : 4;
    text(ui, str, 240, 52 - (sc - 4) * 4, { align: 'center', font: 'press', scale: sc, color: c, outline: '#140f24', alpha: clamp((0.95 - u) / 0.25) });
  }
}

function launch3D(f, t) {
  const u = t - 4.5;
  const L = LAUNCH, g = (x, z) => groundAt(x, z);
  const cp = camPath(u, [[0, [62, 8, -96], [-12, 26, -20], 0.86], [6, [56, 6, -92], [-14, 96, 0], 0.9]]);
  const cam = cam3(f, cp.pos, cp.target, cp.fov);
  const bal = phase(u, 0.1, 6, 'inQuad') * 120, rk = ease.inCubic(phase(u, 0.3, 6)) * 260;
  const cpos = [L.pads.clawd[0], g(...L.pads.clawd) + bal, L.pads.clawd[1]];
  const rpos = [L.pads.codex[0], g(...L.pads.codex) + rk, L.pads.codex[1] + 6];
  const gpos = [L.pads.gemini[0] - 4, g(...L.pads.gemini) + 3, L.pads.gemini[1] - 6];
  const sc = { ...SKY3.day, models: world(false).slice(), blobs: [{ p: gpos, r: 5, id: 64 }], points: [] };
  sc.models.push(
    { model: makeBalloon(), pos: cpos, id: 20 },
    chr('clawd', { eyes: 'happy', mouth: 'open', armR: -10, armL: -10 }, [cpos[0], cpos[1] + 2, cpos[2]], { id: 61 }),
    { model: makeRocket(), pos: rpos, id: 21 },
    chr('codex', { screen: { mode: 'face', face: 'laugh' } }, [rpos[0], rpos[1] + 36, rpos[2] - 2], { id: 62 }),
    chr('gemini', { eyes: u > 1.2 ? 'up' : 'happy', mouth: u > 2.5 ? 'o' : 'smile', handR: [2, -12] }, gpos, { id: 64 }),
    { model: makeCrate(0), pos: [L.pads.gemini[0] + 10, g(...L.pads.gemini), L.pads.gemini[1] + 8], scale: 0.7, id: 22 },
  );
  // rocket fire & smoke, balloon burner flame
  for (let i = 0; i < 70; i++) {
    const k = hash(i * 7 + Math.floor(t * 20));
    const a = hash(i * 3) * Math.PI * 2, d = hash(i * 5 + 1);
    if (rk > 0.5 || u > 0.2) sc.points.push({ p: [rpos[0] + Math.cos(a) * d * 7, rpos[1] - 2 - k * 22, rpos[2] + Math.sin(a) * d * 7], c: k < 0.3 ? '#ffffff' : k < 0.65 ? '#ffd24a' : '#ff7a2a', size: 2.2, flag: 2 });
  }
  for (let i = 0; i < 40; i++) {
    const age = (u * 0.8 + hash(i)) % 1.6;
    if (u < 0.3) continue;
    const a = hash(i * 9) * Math.PI * 2, r = 4 + age * 26;
    sc.points.push({ p: [L.pads.codex[0] + Math.cos(a) * r, g(...L.pads.codex) + 2 + age * 6, L.pads.codex[1] + 6 + Math.sin(a) * r], c: age > 1 ? '#c8ccd8' : '#eef0f6', size: 4 + age * 3, flag: 1, a: 1 - age / 1.6 });
  }
  for (let i = 0; i < 8; i++) sc.points.push({ p: [cpos[0] + (hash(i) - 0.5) * 2, cpos[1] + 20 + hash(i + Math.floor(t * 15)) * 4, cpos[2]], c: ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i % 4], size: 1.4, flag: 2 });
  // confetti
  for (let i = 0; i < 60; i++) {
    const age = u - 0.4 - hash(i) * 0.5;
    if (age < 0) continue;
    const p = [(hash(i * 3) - 0.5) * 100, 20 + age * 30 - age * age * 9, -50 + (hash(i * 5) - 0.5) * 50];
    sc.points.push({ p, c: ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#ff9ad5', '#ffffff'][i % 6], size: 1.3, flag: 2 });
  }
  shot3D(f, cam, sc, t);
  label3D(f, cam, [cpos[0], cpos[1] + 74, cpos[2]], 'CLAUDE OPUS 5.5', '#ffb07a', phase(u, 1, 1.5));
  label3D(f, cam, [rpos[0], rpos[1] + 84, rpos[2]], 'GPT-6 ASTRA', '#9ab4ff', phase(u, 1.6, 2.1));
}

export default {
  id: 'race', dur: 21,
  render(f, t) {
    if (t >= 4.5 && t < 10.5) { launch3D(f, t); return; }
    const after = t >= 10.5;
    const cx = after ? track(t, [[10.5, 560], [15.5, 566], [18.4, 572]]) : 470, cy = after ? track(t, [[10.5, 176], [15.5, 170], [17.5, 150], [19, 168]]) : 168;
    const z = after ? track(t, [[10.5, 2.1], [15.5, 2.3], [16.6, 1.7], [18.4, 1.7], [19.2, 2.2]]) : track(t, [[0, 1.35], [4.5, 1.5]]);
    const s = f.camera(cx, cy, z);
    fieldSet(f, s, t, { tod: 'morning', sun: [90, 40] });
    const G = (x) => fy(x);
    if (!after) {
      balloon2D(s, t, PADS.clawd - 4, G(PADS.clawd) + 1, { label: 'OPUS 5.5', flame: 0.6 + 0.4 * Math.sin(t * 9) });
      drawClawd(s, PADS.clawd - 4, G(PADS.clawd) - 12, { eyes: blinkState(t, 1) || 'determined', brow: t > 2.6 ? 'focus' : null, mouth: 'smile', armR: -6, clipY: G(PADS.clawd) - 13, shadow: false });
      rocket2D(s, t, PADS.codex + 10, G(PADS.codex) + 1, { label: 'GPT-6', fire: t > 3.6 ? 0.4 : 0 });
      const n = t < 0.6 ? null : t < 1.6 ? '3' : t < 2.6 ? '2' : t < 3.6 ? '1' : 'GO';
      drawCodex(s, PADS.codex - 22, G(PADS.codex - 22), { screen: n ? { mode: 'text', lines: [n], font: 'press' } : { mode: 'face', face: 'determined' }, handL: [-2, -10], shadowY: G(PADS.codex - 22) + 1, shadowW: 34 });
    }
    // Gemini's pad: covered crate -> COMING SOON
    const gx = PADS.gemini - 10, cX = PADS.gemini + 26;
    const tarpOff = phase(t, 11.1, 11.5, 'outQuad');
    if (!after || tarpOff < 1) {
      const lift = tarpOff * 40, sw = tarpOff * 30;
      poly(s, [[cX - 22 + sw, G(cX) - 36 - lift], [cX + 22 + sw, G(cX) - 36 - lift], [cX + 26 + sw * 1.4, G(cX) - lift * 0.5], [cX - 26 + sw * 0.6, G(cX) - lift * 0.5]], '#5a6a8a');
      line(s, cX - 22 + sw, G(cX) - 36 - lift, cX + 22 + sw, G(cX) - 36 - lift, '#8a9aba');
      if (!after) text(s, '?', cX, G(cX) - 26, { align: 'center', font: 'press', scale: 2, color: '#c8d4f0' });
    }
    if (after && tarpOff > 0.4) crate2D(s, t, cX, G(cX) + 1, 0, { tag: t > 11.4 });
    // Gemini
    let eyes = blinkState(t, 3) || 'open', mouth = 'smile', brow = null, handL = [0, 0], handR = [0, 0], hover = 5 + osc(t, 0.7) * 1.5, blush = 1, sy = 1, extraY = 0;
    if (!after) { eyes = blinkState(t, 3) || (t > 3.6 ? 'up' : 'sparkle'); mouth = t > 3.6 ? 'o' : 'smile'; }
    else {
      if (t < 11.2) { eyes = 'sparkle'; mouth = 'big'; handR = [2, -14]; }
      else if (t < 12.4) { eyes = 'shock'; brow = 'raised'; mouth = 'gasp'; }
      else if (t < 13.8) { eyes = 'wince'; brow = 'angry'; mouth = 'teeth'; handL = [6, 2]; handR = [6, 2]; sy = 0.95; extraY = Math.round(Math.sin(t * 40)); }
      else if (t < 15.5) { eyes = 'open'; brow = 'worried'; mouth = 'wobble'; }
      else if (t < 16.6) { eyes = 'happy'; brow = 'worried'; mouth = 'smile'; handR = [2, -10]; }
      else if (t < 18.6) { eyes = 'up'; mouth = 'o'; }
      else { eyes = t < 19.6 ? 'spiral' : 'closed'; mouth = 'wobble'; blush = 2; brow = 'worried'; }
    }
    const gG = G(gx);
    if (after || t < 4.5) drawGemini(s, gx + extraY, gG, { hover, eyes, mouth, brow, handL, handR, blush, sy, shadowY: gG + 1, shadowW: 24 });
    if (after && t > 12.2 && t < 15.5) emote(s, gx + 16, gG - 50, 'sweat', t - 12.2);
    if (after && t > 18.6) { emote(s, gx, gG - 58, 'sparkle', t - 18.6); for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; pset(s, gx + Math.cos(a) * 10, gG - 52 + Math.sin(a) * 3, '#ffe66a'); } }
    // the paper plane: held, thrown, loops, bonks
    if (after && t > 15.5) {
      let px, py, ang = 0;
      if (t < 16.6) { px = gx + 18; py = gG - 34; ang = -0.3; }
      else if (t < 18.6) {
        const u = (t - 16.6) / 2.0;
        const a = u * Math.PI * 2;
        px = gx + 18 + Math.sin(a) * 60 * (1 - u * 0.6) + u * 10; py = gG - 34 - Math.sin(a * 0.5) * 70 + (1 - Math.cos(a)) * 6;
        ang = Math.atan2(Math.cos(a), -Math.sin(a) * 0.8);
      } else { px = gx + 2; py = gG - 50 - Math.max(0, 4 - (t - 18.6) * 20); ang = 1.2; }
      const ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [px + u * ca - v * sa, py + u * sa + v * ca];
      poly(s, [P(9, 0), P(-6, -5), P(-3, 0)], '#fbfaf2'); poly(s, [P(9, 0), P(-6, 4), P(-3, 0)], '#d8d6cc');
      line(s, ...P(-4, -2), ...P(5, -1), hex('#ffd23a'));
      if (t > 16.6 && t < 18.6) for (let i = 1; i < 6; i++) pset(s, px - i * 3 * Math.cos(ang), py - i * 3 * Math.sin(ang), '#fff6c0');
      label(f, px, py - 10, t, 15.9, 18.6, '3.5 FLASH', '#ffe39a', { line: false });
    }
    crowd(f, s, t, {
      n: 22, x0: 300, x1: 660, sticks: !after, mood: (i) => {
        let jump = !after ? (t > 3.6 ? 0.9 : 0.35) : 0;
        if (after && t > 18.7 && t < 20.4) jump = 0.7 * (i % 3 ? 1 : 0.4);
        return { jump, icon: after && t > 12.4 && t < 15 && i % 4 === 1 ? '?' : null };
      },
    }).forEach(([x, y, ic, i]) => text(f.ui, ic, x * f.zoom, y * f.zoom - 4, { font: 'press', color: '#ffe27a', outline: '#140f24' }));
    if (!after) countdown(f.ui, t);
    say(f, gx + 4, gG - 62, t, 13.9, 15.5, '...оно же скоро будет, да?', { dir: -1 });
    narr(f.ui, 'А у Джемини вместо мотора — коробка «скоро».', t, 11.6, 15.4);
    f.bloomOpts = { strength: 0.5 };
    f.gradeOpts = { sat: 1.06, contrast: 1.03 };
    f.vig = 0.32;
  },
};
