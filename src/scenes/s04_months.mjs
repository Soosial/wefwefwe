// Scene 4 — Months pass. Gemini blows into the "3.5 PRO" lantern (it sags), lights Flash after Flash
// (3.6 / 3.7 / 3.8) for an ever smaller crowd, then a newspaper slaps him: "3.5 PRO НЕ БУДЕТ".
import { hillSet, crowd, say, label, skyLights, AMB, STAGE_X, STAGE_Y, gy, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { lantern, sparkler, tag, caption } from '../world/props.mjs';
import { text, textWidth } from '../core/font.mjs';
import { rect, pset, hex, line, mix } from '../core/fb.mjs';
import { hop, ease } from '../core/math.mjs';

const MONTHS = [[0, 'ИЮНЬ'], [2.8, 'ИЮЛЬ'], [5.4, 'АВГУСТ'], [8.0, 'СЕНТЯБРЬ'], [10.6, 'ОКТЯБРЬ']];
const FLASH = [[3.15, '3.6 Flash'], [5.75, '3.7 Flash'], [8.35, '3.8 Flash']];
const LX = 420; // where the 3.5 PRO lantern sits

export const SFX = [
  [0.1, 'crowdAmb', { dur: 10.5, gain: 0.25 }],
  [0.0, 'flip'], [2.8, 'flip'], [5.4, 'flip'], [8.0, 'flip'], [10.6, 'flip'],
  [0.7, 'blow', { dur: 1.2 }], [2.0, 'deflate'],
  ...FLASH.flatMap(([a], i) => [[a - 0.15, 'match'], [a + 0.05, 'sparkler', { dur: 1.3 - i * 0.2 }], [a + 1.35 - i * 0.2, 'fizzle', { gain: 0.5 }]]),
  [3.5, 'clap', { dur: 0.8, k: 0.5 }], [6.1, 'clap', { dur: 0.5, k: 0.25 }], [8.7, 'clap', { dur: 0.25, k: 0.12 }],
  [9.2, 'snore', { dur: 1.3 }],
  [10.7, 'wind', { dur: 2.2 }], [11.15, 'paperSlap'], [11.8, 'paper'],
  [12.4, 'deflate', { pitch: 0.7 }], [12.6, 'sadTrombone'],
];

function newspaper(s, x, y, w, h, flap, lines) {
  const ww = Math.max(2, Math.round(w * (1 - flap * 0.4)));
  const x0 = Math.round(x - ww / 2), y0 = Math.round(y - h / 2);
  rect(s, x0 + 1, y0 + 1, ww, h, '#2a2236');
  rect(s, x0, y0, ww, h, '#efe9da');
  rect(s, x0 + 2, y0 + 2, ww - 4, 2, '#2a2a3a');
  if (flap < 0.2 && lines) {
    lines.forEach((ln, i) => text(s, ln, x, y0 + 6 + i * 7, { align: 'center', color: i === 0 ? '#c0392b' : '#1e1a2a' }));
    for (let k = 0; k < 3; k++) rect(s, x0 + 3, y0 + h - 8 + k * 2, ww - 6, 1, '#b8b0a0');
  } else for (let k = 0; k < 5; k++) rect(s, x0 + 2, y0 + 6 + k * 3, ww - 4, 1, '#b8b0a0');
}

export default {
  id: 'geminiTurn', dur: 14,
  in: { type: 'dither', dur: 0.4 },
  render(f, t) {
    const zoom = track(t, [[0, 1.22], [10.4, 1.3], [12.2, 1.6, 'inOutCubic'], [14, 1.68]]);
    const cx = track(t, [[0, 440], [10.4, 446], [12.2, 456, 'inOutCubic']]);
    const cy = track(t, [[0, 140], [10.4, 142], [12.2, 150, 'inOutCubic']]);
    const s = f.camera(cx, cy, zoom);
    f.ambient = AMB.festival;
    // month sign flips
    let mi = 0;
    for (let i = 0; i < MONTHS.length; i++) if (t >= MONTHS[i][0]) mi = i;
    const u = t - MONTHS[mi][0];
    const flip = u < 0.4 ? Math.abs(Math.cos((u / 0.4) * Math.PI)) : 1;
    const shown = u < 0.2 && mi > 0 ? MONTHS[mi - 1][1] : MONTHS[mi][1];
    hillSet(f, s, t * 3, { sky: 'festival', starCount: 240, milky: 0.6, signFront: shown, signFlip: Math.max(0.05, flip), moon: [40 + t * 22, 52 - Math.sin(t * 0.4) * 10, 8], wind: t > 10.4 ? 3 : 1 });
    skyLights(f, s, t, { opus: 1, astra: 1, sol: 1, luna: 1 });
    f.light(STAGE_X, STAGE_Y - 26, 80, '#ffe6c0', 0.35);

    // falling autumn leaves from the tree (Sep-Oct)
    if (t > 7.6) for (let i = 0; i < 14; i++) {
      const ph = (t * 0.25 + i / 14) % 1;
      const lx = 560 + hash(i) * 150 - ph * (t > 10.4 ? 160 : 40) + Math.sin(t * 3 + i) * 6;
      const ly = 70 + ph * 140;
      pset(s, lx, ly, ['#e8a33a', '#d0622a', '#f2c84b'][i % 3]);
      if ((Math.floor(t * 6) + i) % 2) pset(s, lx + 1, ly, '#a8481e');
    }

    // ---- the 3.5 PRO lantern ----
    const gyL = gy(LX);
    let def = 0.25;
    if (t > 0.7 && t < 1.9) def = 0.25 - 0.25 * phase(t, 0.7, 1.9, 'outQuad');
    else if (t >= 1.9) def = 0.55 + 0.1 * phase(t, 5.4, 10.6);
    if (t > 12.4) def = 0.65 + 0.35 * phase(t, 12.4, 13.2, 'outBounce');
    lantern(s, LX, gyL, { w: 28, h: 32, paper: '#d6cfc0', lit: 0, t, deflate: def, label: ['3.5', 'PRO'], labelColor: '#3a3442', noGlow: true });
    const lh = Math.round(32 * (1 - def * 0.8));
    tag(s, LX, gyL - Math.min(19, lh - 4), 'COMING SOON', { ink: '#c0392b' });
    if (t > 5.4) { // cobweb
      const a = phase(t, 5.4, 6.4);
      const ox = LX - 14, oy = gyL - lh;
      for (let k = 0; k < 5; k++) line(s, ox, oy, ox + Math.round(Math.cos(k * 0.35) * 9 * a), oy - Math.round(Math.sin(k * 0.35 + 0.2) * 9 * a) + 9, '#c8c8d8', 0.6);
    }
    if (t > 8.0) { // a snail slowly climbing the lantern
      const sp = phase(t, 8.0, 12.4);
      const sx = LX + 13, sy = gyL - 2 - Math.round(sp * Math.max(4, lh - 6));
      rect(s, sx, sy - 2, 3, 3, '#c78a52'); pset(s, sx + 1, sy - 1, '#8a5a30');
      rect(s, sx - 1, sy, 3, 1, '#b8c8a0'); pset(s, sx - 2, sy - 1, '#b8c8a0');
    }

    // ---- Gemini ----
    const blowing = t > 0.6 && t < 2.0;
    const gX = track(t, [[0, 446], [2.4, 446], [2.8, 470, 'inOutQuad'], [10.6, 470]]);
    const ground = t < 2.6 ? gy(gX) : STAGE_Y;
    let hover = 4 + osc(t, 0.7) * 1.2;
    let eyes = blinkAt(t, 5) ? 'blink' : 'open', mouth = 'smile', sat = 1, sx = 1, sy = 1, handL = [0, 0], handR = [0, 0], look = 0, lookY = 0, tears = 0;
    if (blowing) { mouth = 'o'; eyes = 'closed'; sx = 1 + 0.08 * Math.min(1, (t - 0.6) * 3); look = -2; handL = [3, -2]; }
    if (t > 1.9 && t < 2.8) { eyes = 'shock'; mouth = 'wobble'; look = -2; }
    let k = -1;
    FLASH.forEach(([a], i) => { if (t > a - 0.3 && t < a + 2.0) k = i; });
    if (k >= 0) {
      const [a] = FLASH[k];
      handR = [0, -6];
      eyes = t > a + 0.05 && t < a + 1.2 - k * 0.2 ? (k === 0 ? 'star' : 'happy') : 'open';
      mouth = k === 2 ? 'flat' : 'smile';
    }
    if (t > 10.4 && t < 11.15) { eyes = 'open'; look = 2; }
    if (t > 11.9) { eyes = 'shock'; mouth = 'wobble'; }
    if (t > 12.6) { eyes = 'teary'; mouth = 'frown'; tears = phase(t, 12.6, 13.4); sat = 1 - 0.35 * phase(t, 12.6, 14); }
    const reading = t > 11.8;
    if (reading) { handL = [4, -6]; handR = [-4, -6]; }
    const hopY = hop(t, 2.45, 0.35, 9);
    drawGemini(s, gX, ground - hopY, { hover, eyes, mouth, sat, sx, sy, handL, handR, look, lookY, tears, shadowY: ground + 1, shadowW: 24 });
    if (blowing) for (let i = 0; i < 4; i++) { const p = ((t * 3 + i * 0.25) % 1); pset(s, gX - 14 - p * 10, ground - hover - 26 + Math.sin(p * 9) * 2, '#cfe0ff'); }
    if (k >= 0) {
      const [a, name] = FLASH[k];
      const life = 1.3 - k * 0.2;
      const burn = phase(t, a, a + life);
      const [bx, by] = sparkler(s, t, gX + 14, ground - hover - 24, { len: 20 - k * 3, ang: 0.35, burn, lit: t > a, smoke: true, size: 7 - k });
      if (t > a && burn < 1) f.light(bx, by, 46, '#ffe6a0', 0.8);
      label(f, gX + 28, ground - 56, t, a + 0.05, a + life + 0.3, name, '#ffe39a');
    }
    // newspaper: blows in, slaps the face, then is read
    if (t > 10.6) {
      const fl = phase(t, 10.6, 11.15, 'inQuad');
      let nx = 660 + (gX - 660) * fl, ny = 120 + (ground - hover - 30 - 120) * fl + Math.sin(fl * 9) * 8 * (1 - fl);
      let flap = t < 11.15 ? Math.abs(Math.sin(t * 22)) : 0;
      if (t > 11.15 && t < 11.8) { nx = gX + Math.sin((t - 11.15) * 30) * (1 - phase(t, 11.15, 11.8)) * 2; ny = ground - hover - 30; }
      if (t >= 11.8) { nx = gX; ny = ground - hover - 18 + Math.round(phase(t, 11.8, 12.1, 'outBack') * 0); }
      const lines = t >= 11.8 ? ['3.5 PRO', 'НЕ БУДЕТ'] : null;
      newspaper(s, nx, ny, 44, 30, flap, lines);
    }

    // ---- shrinking audience ----
    const counts = [12, 9, 5, 2, 0];
    const icons = crowd(f, s, t, {
      n: 12, x0: 360, x1: 560,
      mood: (i) => {
        const c = counts[mi];
        if (i >= c) return { gone: true };
        let jump = 0;
        if (k >= 0 && t > FLASH[k][0] && t < FLASH[k][0] + 0.8) jump = [0.5, 0.25, 0.1][k] * (i % 2 ? 1 : 0.4);
        return { jump, icon: mi === 3 && i === 1 && t > 9.0 ? 'z' : null };
      },
    });
    for (const [x, y, ic, i] of icons) text(f.ui, Math.floor(t * 2) % 2 ? 'z' : 'Z', x * f.zoom + 4, y * f.zoom - 4 - (t * 6 % 6), { color: '#cfd8ff', outline: '#140f24' });

    say(f, gX, ground - 58, t, 0.1, 1.4, 'Pro — в июне!', { dir: 1 });
    caption(f.ui, 'Шли месяцы.', t, 2.9, 5.2);
    caption(f.ui, 'Четыре «Флэша» за сто дней...', t, 7.9, 10.3);
    caption(f.ui, '...а «Про» так и не взлетел.', t, 12.2, 14);
    f.bloomOpts = { strength: 0.6 };
    f.gradeOpts = { sat: 1 - 0.25 * phase(t, 10.6, 14), contrast: 1.04 };
    f.vig = 0.45 + 0.15 * phase(t, 11, 14);
  },
};
