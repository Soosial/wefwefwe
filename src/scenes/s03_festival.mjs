// Scene 3 — The lantern festival. Clawd releases "Opus 5.5", Codex fires Astra / Sol / Luna into the sky,
// Gemini arrives with a big lantern that is only "COMING SOON" and lights a tiny "3.5 Flash" sparkler instead.
import { hillSet, festivalLights, crowd, say, label, skyLights, SKY, AMB, STAGE_X, STAGE_Y, gy, blinkAt, walker, clamp, track, osc, hash, phase, glow } from './common.mjs';
import { drawClawd, clawdWalk } from '../chars/clawd.mjs';
import { drawCodex, codexWalk } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { lantern, sparkler, tag, sparkle, caption } from '../world/props.mjs';
import { text } from '../core/font.mjs';
import { pset, hex, mix, line } from '../core/fb.mjs';
import { qt, hop, ease, TAU } from '../core/math.mjs';

export const SFX = [
  [0.0, 'crowdAmb', { dur: 19.5, gain: 0.5 }],
  [2.3, 'stepsSoft', { dur: 1.1 }],
  [3.45, 'hop'],
  [4.35, 'babble', { who: 'clawd', n: 3 }],
  [5.0, 'launch'],
  [5.15, 'cheer', { dur: 2.8 }],
  [7.95, 'chime', { pitch: 0.9 }],
  [8.4, 'hop', { pitch: 1.1 }],
  [8.5, 'stepsRobot', { dur: 0.8 }],
  [9.25, 'hop', { pitch: 1.3 }],
  [9.6, 'type', { n: 7 }],
  [10.3, 'rocket'], [10.9, 'firework'], [11.0, 'cheer', { dur: 3.4, k: 1.2 }],
  [11.2, 'type', { n: 5 }], [11.6, 'rocket', { pitch: 0.9 }], [12.2, 'firework', { pitch: 0.85 }],
  [12.4, 'type', { n: 6 }], [12.8, 'rocket', { pitch: 1.1 }], [13.4, 'firework', { pitch: 1.15 }],
  [14.0, 'hop', { pitch: 1.2 }],
  [13.9, 'float', { dur: 1.2 }],
  [14.3, 'murmur', { dur: 1.4 }],
  [15.1, 'thud'],
  [15.3, 'babble', { who: 'gemini', n: 5 }],
  [16.4, 'pop'],
  [17.0, 'match'], [17.25, 'sparkler', { dur: 1.75 }],
  [17.45, 'clap', { dur: 0.7, k: 0.35 }],
  [18.95, 'fizzle'],
  [19.05, 'cricket', { dur: 1.0 }],
];

// firework rocket from (x0,y0) to (x1,y1) launched at t0 taking d seconds, then a burst
function rocket(f, s, t, t0, d, x0, y0, x1, y1, c) {
  const u = (t - t0) / d;
  if (u < 0) return;
  if (u <= 1) {
    const e = ease.outCubic(u);
    const bend = Math.sin(u * Math.PI) * 10;
    const px = x0 + (x1 - x0) * e + bend * 0.3, py = y0 + (y1 - y0) * e;
    for (let i = 0; i < 14; i++) {
      const ue = ease.outCubic(Math.max(0, u - i * 0.02));
      const tx = x0 + (x1 - x0) * ue, ty = y0 + (y1 - y0) * ue;
      s.with({ flag: 2 }, () => pset(s, tx + (hash(i + Math.floor(t * 30)) - 0.5) * 2, ty, hex(i < 3 ? '#ffffff' : c)));
    }
    sparkle(s, px, py, 2, c, 1);
    f.light(px, py, 30, c, 0.7);
    return;
  }
  const b = (t - t0 - d) / 0.7;
  if (b > 1) return;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU, r = 4 + ease.outCubic(b) * 16;
    const px = x1 + Math.cos(a) * r, py = y1 + Math.sin(a) * r + b * b * 6;
    s.with({ flag: 2 }, () => { pset(s, px, py, hex(c)); if (b < 0.5) pset(s, px - Math.cos(a), py - Math.sin(a), hex('#ffffff')); });
  }
  f.light(x1, y1, 60 * (1 - b), c, 0.9 * (1 - b));
}

export default {
  id: 'festival', dur: 20,
  in: { type: 'star', dur: 0.8 },
  render(f, t) {
    const zoom = track(t, [[0, 1], [2.2, 1], [3.6, 1.15, 'inOutSine'], [4.9, 1.15], [6.2, 1, 'inOutSine'], [8.6, 1], [9.6, 1.12, 'inOutSine'], [13.6, 1.08], [19.5, 1.32, 'inOutSine']]);
    const cx = track(t, [[0, 452], [2.2, 462, 'inOutSine'], [4.9, 462], [8.4, 468], [9.6, 478], [13.8, 474], [19.5, 466]]);
    const cy = track(t, [[0, 112], [2.2, 112], [3.6, 128], [4.9, 128], [7.5, 96], [8.6, 104], [9.6, 122], [13.6, 118], [19.5, 142, 'inOutSine']]);
    const s = f.camera(cx, cy, zoom);
    f.ambient = AMB.festival;
    hillSet(f, s, t, { sky: 'festival', starCount: 240, milky: 0.7, signFront: 'ПРАЗДНИК', moon: [70, 40, 8] });
    festivalLights(f, s, t);
    f.light(STAGE_X, STAGE_Y - 26, 80, '#ffe6c0', 0.45);

    // ---- sky releases ----
    const astraA = phase(t, 10.9, 11.3), solA = phase(t, 12.2, 12.6), lunaA = phase(t, 13.4, 13.8);
    skyLights(f, s, t, { opus: t >= 8 ? 1 : 0, astra: astraA, sol: solA, luna: lunaA });

    // ---- Clawd ----
    const clX = track(t, [[2.2, 330], [3.4, 432, 'linear'], [3.8, 462, 'outQuad'], [8.4, 462], [9.0, 398, 'inOutQuad']]);
    const onStage = t > 3.6 && t < 8.7;
    const clHop = hop(t, 3.4, 0.42, 12) + hop(t, 8.4, 0.6, 10);
    const clBase = onStage ? STAGE_Y : gy(clX);
    if (t > 2.2) {
      const walking = (t > 2.2 && t < 3.4);
      const wk = walking ? clawdWalk(qt(t * 2.4, 12)) : {};
      const holding = t < 5.05;
      const push = t > 4.95 && t < 5.4;
      const watching = t > 9;
      const bow = t > 4.3 && t < 4.65 ? 2 : 0;
      let eyes = blinkAt(t, 1) ? 'blink' : 'open';
      if (t > 5 && t < 8.4) eyes = 'happy';
      if (watching) eyes = t > 17.2 && t < 19 ? 'happy' : (t > 10.4 && t < 14 ? 'star' : 'open');
      const clap = t > 17.4 && t < 18.2 && Math.floor(t * 8) % 2 === 0;
      drawClawd(s, clX, clBase - clHop, {
        ...wk, sq: bow || (push ? -1 : 0), eyes, mouth: t > 5 && t < 8.4 ? 'open' : watching && t > 10.4 && t < 14 ? 'o' : 'smile',
        armL: holding || push ? -11 : clap ? -4 : 0, armR: holding || push ? -11 : clap ? -4 : 0, armLx: clap ? -2 : 0, armRx: clap ? -2 : 0,
        lookY: watching && t > 10.3 && t < 14.5 ? -2 : 0, shadowY: clBase + 1, shadowW: 40,
      });
      // Opus lantern: held above the head, then released to its sky slot
      const rel = phase(t, 5.0, 8.0, 'inOutSine');
      if (t < 8) {
        const hx = clX, hy = clBase - clHop - 38;
        const lx = hx + (SKY.opus[0] - hx) * rel + Math.sin(rel * 7) * 6 * rel * (1 - rel);
        const ly = hy + (SKY.opus[1] - hy) * rel;
        lantern(s, lx, ly, { w: Math.round(24 - 12 * rel), h: Math.round(28 - 14 * rel), paper: '#ff9a4a', lit: 1, t, seed: 4, label: rel < 0.15 ? ['OPUS', '5.5'] : null, labelColor: '#6a2a10' });
        f.light(lx, ly - 10, 70 - 30 * rel, '#ffae60', 1.0);
      }
    }
    label(f, SKY.opus[0], SKY.opus[1] - 26, t, 7.7, 11.2, 'Claude Opus 5.5', '#ffb07a');

    // ---- Codex ----
    const cdX = track(t, [[8.4, 600], [9.2, 512, 'linear'], [9.5, 480, 'outQuad'], [14.0, 480], [14.6, 546, 'inOutQuad']]);
    const cdStage = t > 9.35 && t < 14.3;
    const cdHop = hop(t, 9.2, 0.35, 11) + hop(t, 14.0, 0.6, 9);
    const cdBase = cdStage ? STAGE_Y : gy(cdX);
    if (t > 8.4) {
      const walking = t < 9.2;
      const wk = walking ? codexWalk(qt(t * 2.6, 12)) : {};
      let screen = { mode: 'prompt', cursor: Math.floor(t * 2.5) % 2 === 0 };
      const typed = (str, a, b) => str.slice(0, Math.max(0, Math.min(str.length, Math.floor((t - a) / (b - a) * str.length) + 2)));
      if (t > 9.55 && t < 10.3) screen = { mode: 'text', lines: [typed('> astra', 9.55, 10.2)], left: true, cursor: true };
      else if (t > 11.15 && t < 11.6) screen = { mode: 'text', lines: [typed('> sol', 11.15, 11.5)], left: true, cursor: true };
      else if (t > 12.35 && t < 12.8) screen = { mode: 'text', lines: [typed('> luna', 12.35, 12.75)], left: true, cursor: true };
      else if (t >= 10.3 && t < 14.0) screen = { mode: 'face', face: t > 13.5 ? 'smug' : 'happy' };
      else if (t >= 14.0) screen = t > 17.3 && t < 18.6 ? { mode: 'face', face: 'squint' } : t > 18.6 ? { mode: 'face', face: 'eyes' } : { mode: 'face', face: 'happy' };
      const fire = [10.3, 11.6, 12.8].some((a) => t > a - 0.08 && t < a + 0.25);
      const clap = t > 17.4 && t < 18.2;
      const hc = clap ? (Math.floor(t * 8) % 2 ? 3 : 0) : 0;
      drawCodex(s, cdX, cdBase - cdHop, { ...wk, screen, handL: fire ? [-2, -14] : clap ? [4 + hc, -6] : [0, 0], handR: fire ? [2, -14] : clap ? [-4 - hc, -6] : [0, 0], shadowY: cdBase + 1, shadowW: 34 });
      const sx = cdX, sy = cdBase - cdHop - 40;
      rocket(f, s, t, 10.3, 0.6, sx, sy, SKY.astra[0], SKY.astra[1], '#cfe6ff');
      rocket(f, s, t, 11.6, 0.6, sx, sy, SKY.sol[0], SKY.sol[1], '#ffcf6a');
      rocket(f, s, t, 12.8, 0.6, sx, sy, SKY.luna[0], SKY.luna[1], '#c8d0f4');
    }
    label(f, SKY.astra[0], SKY.astra[1] + 8, t, 11.0, 14.6, 'GPT-6 Astra', '#cfe6ff');
    label(f, SKY.sol[0] + 4, SKY.sol[1] + 12, t, 12.3, 15.0, 'Sol', '#ffd27a');
    label(f, SKY.luna[0] + 6, SKY.luna[1] + 12, t, 13.5, 15.4, 'Luna', '#dfe4ff');

    // ---- Gemini ----
    if (t > 13.7) {
      const gX = track(t, [[13.7, 380], [15.0, 478, 'outQuad']]);
      const hover = 4 + osc(t, 0.7) * 1.5;
      const carrying = t < 15.1;
      const sparkT = t > 17.0;
      let eyes = blinkAt(t, 5) ? 'blink' : 'happy';
      let mouth = 'smile';
      if (t > 15.2 && t < 17) { eyes = 'happy'; mouth = t < 16.2 ? 'open' : 'smile'; }
      if (t > 17.3 && t < 18.9) { eyes = 'star'; mouth = 'open'; }
      if (t > 18.9) { eyes = 'open'; mouth = 'flat'; }
      if (t > 19.4) { eyes = 'sad'; mouth = 'flat'; }
      const handR = sparkT ? [0, -6] : carrying ? [2, -16] : [0, 0];
      const handL = carrying ? [-2, -16] : t > 16.2 && t < 16.6 ? [-3, -6] : [0, 0];
      const groundY = STAGE_Y;
      drawGemini(s, gX, groundY, { hover, eyes, mouth, handL, handR, lookY: t > 19.4 ? -1 : 0, look: t > 19.4 ? -1 : 0, shadowY: groundY + 1, shadowW: 24 });
      // the big unfinished lantern
      const down = phase(t, 15.0, 15.35, 'inOutQuad');
      const lx = gX + (446 - gX) * down, ly = (groundY - hover - 52) + (groundY - (groundY - hover - 52)) * down;
      lantern(s, lx, ly, { w: 28, h: 32, paper: '#d6cfc0', lit: 0, t, label: ['3.5', 'PRO'], labelColor: '#3a3442', noGlow: true });
      if (t > 16.4) {
        const pop = t < 16.5 ? 0 : t < 16.58 ? -2 : 0;
        const swing = Math.round(Math.sin((t - 16.4) * 6) * 2 * Math.exp(-(t - 16.4) * 1.5));
        tag(s, 446 + swing, groundY - 19 + pop, 'COMING SOON', { ink: '#c0392b' });
      }
      say(f, gX, groundY - 62, t, 15.3, 17.0, '3.5 Pro... скоро!', { dir: 1 });
      if (sparkT) {
        const burn = phase(t, 17.25, 18.95);
        const [bx, by] = sparkler(s, t, gX + 14, groundY - hover - 24, { len: 20, ang: 0.35, burn, lit: t > 17.25, smoke: true, size: 7 });
        if (t > 17.25 && burn < 1) f.light(bx, by, 50, '#ffe6a0', 0.8);
        label(f, gX + 30, groundY - 58, t, 17.3, 19.2, '3.5 Flash', '#ffe39a');
      }
    }

    // ---- audience ----
    const icons = crowd(f, s, t, {
      sticks: t > 4.5 && t < 15,
      mood: (i) => {
        let jump = 0;
        if (t > 5.1 && t < 8.0) jump = 0.7 * clamp((t - 5.1) * 2) * clamp((8 - t) * 2);
        if (t > 10.9 && t < 14.2) jump = 1.0 * clamp((t - 10.9) * 2) * clamp((14.2 - t) * 2);
        if (t > 17.4 && t < 18.0 && i % 4 === 0) jump = 0.25;
        return { jump, icon: t > 14.2 && t < 15.6 && i % 5 === 1 ? '?' : null };
      },
    });
    for (const [x, y, ic, i] of icons) {
      const sx = x * f.zoom, sy = y * f.zoom;
      text(f.ui, ic, sx + (hash(i) - 0.5) * 4, sy - Math.abs(Math.sin(t * 6 + i)) * 2, { font: 'press', color: '#ffe27a', outline: '#140f24' });
    }
    say(f, 412, 238, t, 18.7, 19.95, '...и всё?', { dir: -1 });

    caption(f.ui, 'Каждый сезон все запускали в небо свои фонарики.', t, 0.3, 2.9);
    caption(f.ui, 'Чей взлетит выше — тот и молодец.', t, 2.9, 4.9);
    f.bloomOpts = { strength: 0.65 };
    f.gradeOpts = { sat: 1.05, contrast: 1.04 };
    f.vig = 0.4;
  },
};
