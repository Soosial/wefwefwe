// Scene 5 — The mockery. DeepSeek's whale, Kimi and GLM's Z arrive: the whale hoses out Gemini's sparkler,
// their own lanterns fly higher, they tease him and play keep-away with his "COMING SOON" tag. Qwen watches from the tree.
import { hillSet, say, label, skyLights, SKY, AMB, STAGE_X, STAGE_Y, gy, blinkAt, walker, clamp, track, osc, hash, phase, bush } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawWhale, drawKimi, drawZ } from '../chars/rivals.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { lantern, sparkler, tag, caption, rain } from '../world/props.mjs';
import { pset, hex, mix, disc } from '../core/fb.mjs';
import { hop, ease, qt } from '../core/math.mjs';

const LX = 420;
export const SFX = [
  [0.0, 'sparkler', { dur: 2.1, gain: 0.7 }],
  [0.2, 'whaleSong', { pitch: 1.0 }],
  [0.4, 'stepsSoft', { dur: 1.4, pan: -0.5 }],
  [2.0, 'spray', { dur: 0.8 }], [2.35, 'fizzle'],
  [3.0, 'launch', { pitch: 0.9, gain: 0.6 }], [3.25, 'launch', { pitch: 1.05, gain: 0.5 }], [3.5, 'launch', { pitch: 1.2, gain: 0.5 }],
  [4.7, 'chime', { pitch: 0.8, gain: 0.5 }],
  [5.0, 'babble', { who: 'whale', n: 4 }], [5.6, 'laugh', { who: 'whale' }],
  [6.0, 'babble', { who: 'kimi', n: 5 }],
  [7.0, 'babble', { who: 'z', n: 5, pitch: 1.1 }],
  [8.0, 'grab'], [8.5, 'throw'], [8.7, 'hop', { pitch: 1.3 }], [9.2, 'catch'],
  [9.6, 'throw'], [9.9, 'hop', { pitch: 1.35 }], [10.2, 'catch'],
  [10.6, 'throw', { pitch: 1.2 }], [11.4, 'paperSlap', { gain: 0.6 }],
  [11.5, 'laugh', { who: 'whale' }], [11.6, 'laugh', { who: 'kimi' }], [11.75, 'laugh', { who: 'z' }],
  [12.4, 'laugh', { who: 'kimi', gain: 0.7 }],
  [13.0, 'stepsSoft', { dur: 1.6, pan: -0.6 }],
  [13.7, 'sniff'],
  [14.0, 'rainStart', { dur: 1.0 }],
  [14.4, 'thunder', { gain: 0.6 }],
];

// parabolic throw position between two points
function arc(t, t0, t1, a, b, h) {
  const u = clamp((t - t0) / (t1 - t0));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * h, u];
}

export default {
  id: 'mockery', dur: 15,
  in: { type: 'dither', dur: 0.4 },
  render(f, t) {
    const shake = t > 11.5 && t < 13 ? Math.round(Math.sin(t * 60) * 1.2) : 0;
    const zoom = track(t, [[0, 1.08], [11, 1.12], [15, 1.3, 'inOutSine']]);
    const s = f.camera(track(t, [[0, 470], [15, 466]]) + shake, track(t, [[0, 124], [11, 128], [15, 146, 'inOutSine']]), zoom);
    const gloom = phase(t, 12.5, 15);
    f.ambient = [0.62 - 0.2 * gloom, 0.58 - 0.16 * gloom, 0.9 - 0.3 * gloom];
    hillSet(f, s, t, { sky: 'festival', starCount: 240 - Math.round(gloom * 200), milky: 0.6 * (1 - gloom), signFront: 'ОКТЯБРЬ', moon: [60, 44, 8] });
    // lantern sizes for rivals rising
    const riseA = phase(t, 3.0, 4.8, 'inOutSine');
    skyLights(f, s, t, { opus: 1, astra: 1, sol: 1, luna: 1, deep: t > 4.8 ? 1 : 0, kimi: t > 5.05 ? 1 : 0, z: t > 5.3 ? 1 : 0 });

    // ---- rivals ----
    const kX = track(t, [[0.4, 300], [1.8, 386, 'outQuad'], [13.0, 386], [15, 300, 'inQuad']]);
    const zX = track(t, [[0.4, 270], [2.0, 538, 'outQuad'], [13.1, 538], [15, 650, 'inQuad']]);
    const wX = track(t, [[0, 660], [1.8, 548, 'outQuad'], [13.0, 548], [15, 680, 'inQuad']]);
    const wY = track(t, [[0, 90], [1.8, 118, 'outQuad'], [13.0, 118], [15, 60, 'inQuad']]) + Math.round(osc(t, 0.5) * 2);
    const laughing = t > 11.5 && t < 13.6;
    const shakeL = laughing ? Math.round(Math.sin(t * 40)) : 0;
    // Qwen peeks over a bush near the tree, taking notes
    const peek = phase(t, 8.6, 9.2, 'outQuad') * (1 - phase(t, 12.2, 12.8));
    if (peek > 0) drawQwen(s, 606, gy(606) + 24 - Math.round(peek * 22), { glasses: true, mouth: 'smirk', handL: [2, -6 + (Math.floor(t * 8) % 2)], look: -2, shadow: false, clipY: gy(606) });
    bush(s, 606, gy(606) + 3, 54, 7, t > 8.5 && t < 9.3 ? (t - 8.5) : t > 12.1 && t < 12.9 ? (t - 12.1) : 0);
    // lanterns rising from each rival
    const rivalsL = [[wX, wY - 40, 'deep', '#4d6bfe', 'V4', 3.0], [kX, gy(kX) - 40, 'kimi', '#3a4060', 'K3.1', 3.25], [zX, gy(zX) - 40, 'z', '#2346d6', 'GLM', 3.5]];
    for (const [x0, y0, key, c, lab, a] of rivalsL) {
      const u = phase(t, a, a + 1.6, 'inOutSine');
      if (t < a - 0.6 || u >= 1) continue;
      const [x1, y1] = SKY[key];
      lantern(s, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, { w: Math.round(16 - 6 * u), h: Math.round(18 - 6 * u), paper: c, lit: 1, t, seed: a * 10, label: u < 0.2 ? lab : null, labelColor: '#ffffff', glowC: '#9fb0ff' });
    }
    label(f, SKY.deep[0], SKY.deep[1] + 9, t, 4.8, 8.6, 'DeepSeek V4', '#9fb0ff');
    label(f, SKY.kimi[0] + 10, SKY.kimi[1] + 9, t, 5.1, 8.8, 'Kimi K3.1', '#c9cfe6');
    label(f, SKY.z[0] - 6, SKY.z[1] + 9, t, 5.35, 9.0, 'GLM-5.3', '#8fa6ff');

    const kE = laughing ? 'laugh' : t > 6.0 && t < 7.4 ? 'happy' : blinkAt(t, 7) ? 'blink' : 'open';
    const zE = laughing ? 'laugh' : t > 7.0 && t < 8.4 ? 'happy' : blinkAt(t, 9) ? 'blink' : 'open';
    const wE = laughing || (t > 5.6 && t < 6.6) ? 'laugh' : 'open';
    const kWalk = (t > 0.4 && t < 1.8) || t > 13;
    const zWalk = (t > 0.4 && t < 2.0) || t > 13.1;
    const bounce = (w, k) => (w ? Math.abs(Math.round(Math.sin(t * 14 + k) * 2)) : 0);
    // keep-away handles
    const kHand = [kX + 10, gy(kX) - 30], zHand = [zX - 10, gy(zX) - 30], wFin = [wX - 11, wY - 6], gHead = [STAGE_X, STAGE_Y - 62];
    let tagPos = null;
    if (t >= 8.0 && t < 8.5) tagPos = [LX + (kHand[0] - LX) * phase(t, 8.0, 8.3), STAGE_Y - 19 + (kHand[1] - STAGE_Y + 19) * phase(t, 8.0, 8.3)];
    else if (t >= 8.5 && t < 9.2) tagPos = arc(t, 8.5, 9.2, kHand, zHand, 34);
    else if (t >= 9.2 && t < 9.6) tagPos = [zHand[0] + Math.sin(t * 20) * 3, zHand[1] - 4];
    else if (t >= 9.6 && t < 10.2) tagPos = arc(t, 9.6, 10.2, zHand, wFin, 20);
    else if (t >= 10.2 && t < 10.6) tagPos = [wFin[0], wFin[1] + Math.sin(t * 16) * 2];
    else if (t >= 10.6 && t < 11.4) tagPos = arc(t, 10.6, 11.4, wFin, gHead, 40);
    const tagOnFace = t >= 11.4 && t < 13.7;

    drawKimi(s, kX + shakeL, gy(kX) - bounce(kWalk, 0) - (laughing ? Math.abs(Math.round(Math.sin(t * 18) * 2)) : 0), {
      eyes: kE, mouth: laughing || (t > 6 && t < 7.4) ? 'big' : 'smile', sq: laughing ? (Math.floor(t * 9) % 2) : 0,
      handR: t > 8.0 && t < 8.6 ? [2, -12] : laughing ? [0, -8] : [0, 0], handL: laughing ? [0, -3] : [0, 0], shadowY: gy(kX) + 1, shadowW: 26,
    });
    drawZ(s, zX - shakeL, gy(zX) - bounce(zWalk, 1) - (laughing ? Math.abs(Math.round(Math.sin(t * 17 + 1) * 2)) : 0), {
      eyes: zE, mouth: laughing ? 'big' : t > 7 && t < 8.4 ? 'open' : 'smile', sq: laughing ? (Math.floor(t * 8) % 2) : 0,
      handL: t > 9.1 && t < 9.7 ? [-2, -12] : laughing ? [0, -8] : [0, 0], shadowY: gy(zX) + 1, shadowW: 24,
    });
    drawWhale(s, wX, wY, { eyes: wE, mouth: laughing || (t > 5 && t < 6.6) || (t > 1.9 && t < 2.8) ? 'laugh' : 'smile', tail: Math.sin(t * (laughing ? 9 : 2.5)), fin: t > 10.1 && t < 10.7 ? 1 : Math.sin(t * 2) * 0.3, flip: true });

    // ---- Gemini ----
    const sparkOn = t < 2.35;
    let eyes = blinkAt(t, 5) ? 'blink' : 'open', mouth = 'flat', sat = 1, look = 0, tears = 0, sq = 0;
    const jumps = [[8.7, 0.5], [9.9, 0.5]];
    let hopY = 0;
    for (const [a, d] of jumps) hopY += hop(t, a, d, 22);
    if (t < 2.0) { eyes = 'happy'; mouth = 'smile'; look = t > 0.8 ? 2 : 0; }
    if (t >= 2.0 && t < 3.0) { eyes = 'shock'; mouth = 'shout'; }
    if (t >= 3.0 && t < 5.0) { eyes = 'up'; mouth = 'o'; }
    if (t >= 5.0 && t < 8.0) { eyes = 'sad'; mouth = 'frown'; sq = 1; look = t < 6 ? 2 : t < 7 ? -2 : 2; }
    if (t >= 8.0 && t < 11.4) { eyes = hopY > 2 ? 'angry' : 'open'; mouth = hopY > 2 ? 'shout' : 'wobble'; }
    if (t >= 11.4) { eyes = 'teary'; mouth = 'wobble'; tears = phase(t, 12.0, 13.0); sat = 1 - 0.65 * phase(t, 12.2, 15); sq = 1; }
    const handsUp = hopY > 2;
    const wet = t > 2.35;
    const gYb = STAGE_Y - hopY;
    drawGemini(s, STAGE_X, gYb, { hover: 4 + osc(t, 0.7) * 1.2, eyes, mouth, sat, look, tears, sharp: 0.68 + 0.08 * phase(t, 11.4, 15), handL: handsUp ? [-1, -14] : [0, 0], handR: sparkOn ? [0, -6] : handsUp ? [1, -14] : [0, 0], sy: sq ? 0.94 : 1, shadowY: STAGE_Y + 1, shadowW: 24 });
    if (t < 2.9) {
      const [bx, by] = sparkler(s, t, STAGE_X + 14, STAGE_Y - 28, { len: 14, ang: 0.35, burn: 0.55 + 0.1 * phase(t, 0, 2.3), lit: sparkOn, smoke: !sparkOn, size: 5 });
      if (sparkOn) f.light(bx, by, 40, '#ffe6a0', 0.7);
    }
    // whale water jet
    if (t > 1.95 && t < 2.8) {
      const u = phase(t, 1.95, 2.8);
      const bx = wX - 26, by = wY - 34, tx = STAGE_X + 18, ty = STAGE_Y - 44;
      for (let i = 0; i < 30; i++) {
        const v = (i / 30) * Math.min(1, u * 2.5);
        const px = bx + (tx - bx) * v + (hash(i + Math.floor(t * 30)) - 0.5) * 3, py = by + (ty - by) * v - Math.sin(v * Math.PI) * 26;
        pset(s, px, py, i % 3 ? '#8fd0ff' : '#e6f6ff');
      }
    }
    if (wet) for (let i = 0; i < 4; i++) { const p = ((t * 1.3 + i * 0.27) % 1); if (t < 8) pset(s, STAGE_X - 10 + i * 6, STAGE_Y - 20 + p * 18, '#9fd8ff'); }
    // steam after the fizzle
    if (t > 2.35 && t < 4) for (let i = 0; i < 5; i++) { const p = ((t - 2.35) * 0.8 + i * 0.2) % 1; disc(s, STAGE_X + 20 + Math.sin(p * 6 + i) * 3, STAGE_Y - 40 - p * 20, 1.5 + p * 2, '#c8d0e8', (1 - p) * 0.5); }

    // ---- the tag ----
    const lantY = gy(LX);
    lantern(s, LX, lantY, { w: 28, h: 32, paper: '#d6cfc0', lit: 0, t, deflate: 1, noGlow: true });
    if (t < 8.0) tag(s, LX, lantY - 8, 'COMING SOON', { ink: '#c0392b' });
    else if (tagPos) tag(s, tagPos[0], tagPos[1] - 5, 'COMING SOON', { ink: '#c0392b' });
    else if (tagOnFace) {
      const slide = phase(t, 13.2, 13.7, 'inQuad');
      tag(s, STAGE_X, STAGE_Y - 34 + slide * 30 - hopY, 'COMING SOON', { ink: '#c0392b' });
    } else if (t >= 13.7) tag(s, STAGE_X + 4, STAGE_Y - 6, 'COMING SOON', { ink: '#c0392b' });

    say(f, wX - 20, wY - 40, t, 5.0, 6.5, 'Опять Flash? Ха!', { dir: 1 });
    say(f, kX, gy(kX) - 40, t, 6.0, 7.5, 'Даже мы тебя обогнали!', { dir: 1 });
    say(f, zX, gy(zX) - 38, t, 7.0, 8.5, 'Coming soooon~', { dir: -1 });
    say(f, STAGE_X, STAGE_Y - 62, t, 8.75, 9.8, 'Отдайте!', { dir: -1, style: 'shout' });
    if (laughing) for (const [x, y, k] of [[kX, gy(kX) - 34, 0], [zX, gy(zX) - 34, 1], [wX - 30, wY - 30, 2]]) {
      const [sx, sy] = f.toScreen(x, y);
      if (Math.floor(t * 6 + k) % 2 === 0) say(f, x, y, t, 0, 99, 'ха-ха', { dir: k === 1 ? 1 : -1, t: 1 });
      void sx; void sy;
    }
    caption(f.ui, 'А потом пришли те, кого Gemini когда-то обгонял.', t, 0.3, 2.8);
    if (t > 13.8) rain(s, t, { n: Math.round(120 * phase(t, 13.8, 15)), speed: 260, alpha: 0.55 });
    f.bloomOpts = { strength: 0.55 };
    f.gradeOpts = { sat: 1 - 0.45 * gloom, contrast: 1.04, bright: 1 - 0.1 * gloom };
    f.vig = 0.4 + 0.2 * gloom;
  },
};
