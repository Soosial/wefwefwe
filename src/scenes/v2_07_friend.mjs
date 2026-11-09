// S7 — A friend (2D + 3D): the rain stops over Gemini — Clawd holds a big leaf over him. Clawd shows his little lantern:
// it runs on Google's TPUs, "your spark keeps me warm too". A hug brings the colour back; a 3D crane-up as the rain
// clears into a starry night; then Codex runs in with a toolbox: "Shall we fix your engine? Together!"
import { fieldSet, fy, PADS, crate2D, mixTOD, emote } from '../world/field.mjs';
import { say } from './common.mjs';
import { SKY3, blendSky, world, chr, shot3D, cam3, chapter, groundAt, LAUNCH, rotMat } from './world3d.mjs';
import { makeCrate, makeLantern3D } from '../world/voxworld.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd, clawdWalk } from '../chars/clawd.mjs';
import { drawCodex, codexWalk } from '../chars/codex.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { lantern, rain, splashes, leafUmbrella, sparkle } from '../world/props.mjs';
import { rect, pset, glow, mix } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash, qt, ease } from '../core/math.mjs';

const GX = 548, CLX = 500, LANX = 524, CDX = 606;
const G4 = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];

export const SFX = [
  [0, 'rain', { dur: 13.9, gain: 0.85, fadeOut: 1.6 }],
  [1.6, 'stepsSoft', { dur: 1.0 }],
  [2.1, 'rustle', { gain: 0.6 }], [2.2, 'leafRain', { dur: 10.8 }],
  [3.1, 'babble', { who: 'clawd', n: 4, pitch: 0.95 }],
  [5.0, 'sit'],
  [5.9, 'clink'], [6.2, 'flameSoft', { dur: 2.6 }],
  [7.3, 'babble', { who: 'clawd', n: 6 }],
  [8.5, 'blinkEyes'],
  [10.1, 'babble', { who: 'clawd', n: 5, pitch: 0.92 }],
  [11.0, 'sniff'],
  [12.2, 'hug'], [12.4, 'colorSweep', { dur: 1.6 }],
  [13.6, 'windSoft', { dur: 2.8 }], [15.2, 'shootingStar'],
  [16.4, 'stepsRobot', { dur: 1.2, pan: 0.6 }],
  [17.1, 'babble', { who: 'codex', n: 4 }], [18.2, 'clink'],
];
export const MUSIC = [
  { t0: 0.3, dur: 12.1, bpm: 66, root: 57, scale: 'minor', bars: [1, 6, 3, 7], fi: 1.0, fo: 1.2, mel: { inst: 'piano', str: "3 . . 2 1 . . . 1 . 7, 6, 5, . . . 6, . 7, 1 2 . 1 . 7, - - - . . . .", oct: 1, vel: 0.36 }, pad: { inst: 'strings', oct: -1, vel: 0.26 } },
  { t0: 12.2, dur: 6.8, bpm: 72, root: 60, bars: [1, 5, 6, 4], fi: 0.8, fo: 0.6, mel: { inst: 'bell', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . . .", oct: 1, vel: 0.4 }, pad: { inst: 'strings', oct: -1, vel: 0.4 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.13, from: 4.2 } },
];

function crane3D(f, t) {
  const L = LAUNCH, g = (x, z) => groundAt(x, z), gp = L.pads.gemini;
  const u = t - 13.6, k = phase(t, 13.6, 16.0);
  const gpos = [gp[0] - 6, g(gp[0] - 6, gp[1] - 10) + 3, gp[1] - 10];
  const cpos = [gp[0] + 7, g(gp[0] + 7, gp[1] - 10) + 1, gp[1] - 10];
  const lpos = [gp[0], g(gp[0], gp[1] - 3), gp[1] - 3];
  // filmed from the village side (characters turned to face it): the crane rises first, then pulls back
  const ky = ease.outCubic(phase(u, 0.9, 2.8)), kz = ease.inOutCubic(phase(u, 0.9, 2.8));
  const cam = cam3(f, [gp[0] + 2 - kz * 40, gpos[1] + 9 + ky * 96, gp[1] + 18 + kz * 150], [gp[0] * (1 - kz), gpos[1] + 8 - kz * 6, (gp[1] - 10) * (1 - kz)], 0.8 + kz * 0.12);
  const turn = rotMat(Math.PI, 0, 0);
  const sc = { ...blendSky(SKY3.rain, SKY3.night, k), models: world(true).slice(), points: [], grade: { sat: 0.7 + 0.35 * k, contrast: 1.05 }, bloom: { strength: 0.6 }, vig: 0.42 };
  sc.models.push(
    { model: makeCrate(3), pos: [gp[0] - 36, g(gp[0] - 36, gp[1] - 10), gp[1] - 10], scale: 0.7, id: 22 },
    chr('clawd', { legs: [3, 3, 3, 3], eyes: 'closed', mouth: 'cat', blush: 2, armR: -4 }, cpos, { id: 61, rot: turn }),
    chr('gemini', { eyes: 'closed', mouth: 'smile', blush: 2, handL: [-4, -6] }, gpos, { id: 64, rot: turn }),
    { model: makeLantern3D(), pos: lpos, id: 65, scale: 0.55, bright: 0.7 },
  );
  for (let i = 0; i < 360 * (1 - k); i++) {
    const q = (hash(i * 3) + t * 1.6) % 1;
    const p = [cam.pos[0] - 130 + hash(i) * 260, cam.pos[1] + 60 - q * 140, cam.pos[2] - 20 - hash(i * 7) * 200];
    sc.points.push({ p, c: '#9fb0d8', size: 0.6, flag: 1, a: 0.6 }, { p: [p[0] + 0.3, p[1] + 1.6, p[2]], c: '#9fb0d8', size: 0.6, flag: 1, a: 0.45 });
  }
  // a shooting star far away
  const ss = (t - 15.2) / 0.8;
  if (ss > 0 && ss < 1) for (let j = 0; j < 10; j++) sc.points.push({ p: [500 - (ss - j * 0.012) * 900, 520 - (ss - j * 0.012) * 160, -1400], c: j < 2 ? '#ffffff' : '#bfd0ff', size: 5 - j * 0.35, flag: 2, a: 1 - j / 10 });
  shot3D(f, cam, sc, t);
}

export default {
  id: 'friend', dur: 19,
  in: { type: 'dither', dur: 0.6 },
  render(f, t) {
    if (t >= 13.6 && t < 16.4) { crane3D(f, t); return; }
    const late = t >= 16.4;
    const G = fy(GX);
    const zoom = late ? track(t, [[16.4, 1.75], [19, 1.85]]) : track(t, [[0, 2.6], [1.8, 2.6], [3.4, 2.0, 'inOutSine'], [6.8, 2.05], [7.6, 2.9, 'inOutCubic'], [11.8, 3.0], [12.4, 2.4, 'inOutSine'], [13.6, 2.3]]);
    const cx = late ? track(t, [[16.4, 560], [19, 564]]) : track(t, [[0, GX], [1.8, GX], [3.4, 530, 'inOutSine'], [6.8, 530], [7.6, LANX + 4, 'inOutCubic'], [11.8, LANX + 6], [12.4, 528, 'inOutSine']]);
    const cy = late ? track(t, [[16.4, G - 40], [19, G - 42]]) : track(t, [[0, G - 26], [1.8, G - 26], [3.4, G - 34, 'inOutSine'], [6.8, G - 34], [7.6, G - 22, 'inOutCubic'], [11.8, G - 22], [12.4, G - 30, 'inOutSine']]);
    const s = f.camera(cx, cy, zoom);
    const clear = late ? 1 : phase(t, 12.6, 13.6);
    fieldSet(f, s, t, { pal: mixTOD('rain', 'night', clear), night: clear > 0.5, bunting: false, flowers: 0.03, wind: 2 - clear, moon: clear > 0.9 ? [44, 30, 8] : null });
    crate2D(s, t, PADS.gemini + 26, fy(PADS.gemini + 26) + 1, 3, { tag: false });

    // ---- Clawd walks in with a big leaf, sits down, shows the lantern, hugs ----
    const clX = track(t, [[0, 430], [1.6, 430], [2.7, CLX, 'outQuad']]);
    const walking = t > 1.6 && t < 2.7, sitting = t > 5.0, hug = t > 12.2 && t < 13.6;
    const clY = fy(clX) + (sitting ? 2 : 0);
    const holdLeaf = t < 13.2 && !late;
    let ce = blinkState(t, 2) || 'open', cm = 'smile', cb = null, clook = 2, blush = 1;
    if (t < 3.0) { ce = 'open'; cb = 'worried'; cm = 'smallSmile'; }
    else if (t < 5.0) { cb = 'worried'; cm = talkMouth(t, 3.1, 4.6, 'smallSmile', 1); }
    else if (t < 7.2) { ce = blinkState(t, 2) || 'happy'; clook = 1; }
    else if (t < 12.2) { cm = talkMouth(t, 7.3, 9.6, 'smile', 2) === 'smile' ? talkMouth(t, 10.1, 11.9, 'smile', 3) : talkMouth(t, 7.3, 9.6, 'smile', 2); ce = t > 10.1 ? (blinkState(t, 2) || 'happy') : ce; }
    if (hug) { ce = 'closed'; cm = 'cat'; blush = 2; }
    if (late) { ce = blinkState(t, 2) || 'happy'; cm = t > 17.6 ? 'open' : 'smile'; clook = 2; }
    drawClawd(s, clX, clY, {
      ...(walking ? clawdWalk(qt(t * 3, 12)) : {}), legs: sitting && !walking ? [3, 3, 3, 3] : walking ? clawdWalk(qt(t * 3, 12)).legs : undefined,
      eyes: ce, mouth: cm, brow: cb, blush, look: clook, armR: holdLeaf ? -10 : hug ? -5 : 0, armRx: hug ? 3 : 0, armL: t > 5.5 && t < 6.1 ? -4 : 0,
      sq: hug ? 1 : 0, shadowY: clY + 1, shadowW: 38,
    });
    // the lantern: taken out at 5.5, set down in front of them; four-colour flame + TPU label
    if (t > 5.5) {
      const pl = phase(t, 5.5, 5.95, 'outQuad');
      const lx = clX + 18 + (LANX - clX - 18) * pl, ly = clY - 14 + (fy(LANX) + 2 - clY + 14) * pl;
      lantern(s, lx, ly, { w: 16, h: 20, paper: '#ff9a4a', lit: 0.85, t, seed: 11 });
      const dx = Math.round(lx) - 3, dy = Math.round(ly) - 13;
      rect(s, dx, dy, 6, 8, '#3a160c');
      s.with({ flag: 2 }, () => {
        for (let i = 0; i < 4; i++) {
          const hgt = 3 + Math.round(2 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)));
          for (let j = 0; j < hgt; j++) pset(s, dx + 1 + i, dy + 7 - j, j === hgt - 1 ? mix(G4[i], '#ffffff', 0.5) : G4[i]);
        }
      });
      text(s, 'TPU', Math.round(lx), Math.round(ly) - 3, { align: 'center', color: '#5a2a14' });
      glow(s, lx, ly - 9, 18, '#fff2c8', 0.5, 5);
      f.light(lx, ly - 10, 70, '#ffd8a0', 0.95);
    }

    // ---- Gemini: grey and alone -> surprised -> moved -> colour returns ----
    const back = late ? 1 : phase(t, 12.3, 13.6, 'inOutSine');
    let ge = 'sad', gm = 'frown', gb = 'sad', tears = 0.6, look = 0, lookY = 1;
    if (t > 2.3 && t < 3.0) { ge = 'up'; gm = 'o'; gb = 'raised'; lookY = -1; tears = 0.4; }
    else if (t >= 3.0 && t < 5.0) { ge = blinkState(t, 4) || 'open'; gm = 'flat'; gb = 'worried'; look = -2; lookY = 0; tears = 0.3; }
    else if (t >= 5.0 && t < 8.5) { ge = blinkState(t, 4) || 'open'; gm = t > 6.2 ? 'o' : 'flat'; gb = 'worried'; look = -2; lookY = t > 5.9 ? 1 : 0; tears = 0.1; }
    else if (t >= 8.5 && t < 9.8) { ge = 'shock'; gm = 'gasp'; gb = 'raised'; look = -2; lookY = 0; tears = 0; }
    else if (t >= 9.8 && t < 12.2) { ge = 'teary'; gm = t < 11.1 ? 'wobble' : 'smallSmile'; gb = 'worried'; look = -2; lookY = 0; tears = phase(t, 9.9, 11); }
    if (hug) { ge = 'closed'; gm = 'smile'; gb = null; tears = 0.4 * (1 - back); }
    if (late) { ge = blinkState(t, 4) || (t > 17.6 ? 'sparkle' : 'happy'); gm = t > 17.6 ? 'big' : 'smile'; gb = null; tears = 0; look = t > 16.8 ? 2 : -1; lookY = 0; }
    const gX = GX - (hug ? 7 * phase(t, 12.2, 12.5) : 0);
    drawGemini(s, gX, G, {
      hover: 0.5 + back * 4 + (late ? osc(t, 0.7) : 0), sat: 0.12 + 0.88 * back, sharp: 0.84 - 0.16 * back, R: 24 + 2.5 * back, sy: 0.93 + 0.07 * back,
      eyes: ge, mouth: gm, brow: gb, tears, look, lookY, blush: hug ? 2 : 1,
      handL: hug ? [-5, -6] : [4 - 4 * back, 3 - 3 * back], handR: [-4 + 4 * back, 3 - 3 * back], shadowY: G + 1, shadowW: 22,
    });
    if (hug) for (let i = 0; i < 3; i++) { const u = ((t - 12.2) * 0.7 + i * 0.33) % 1; emote(s, 524 + Math.sin(u * 6 + i) * 6, G - 46 - u * 26, 'heart', 1); }
    if (t > 12.3 && t < 14.0) for (let i = 0; i < 6; i++) sparkle(s, gX + Math.cos(t * 4 + i) * 18, G - 28 + Math.sin(t * 3 + i * 2) * 18, 1 + (i % 2), G4[i % 4], 1);

    // ---- leaf umbrella and rain ----
    const stemX = clX + 24, stemY = clY - 30, half = 42;
    if (holdLeaf) leafUmbrella(s, stemX, stemY, { w: half * 2, h: 18, stem: 26, tilt: 0.25 });
    else if (t < 14 && !late) leafUmbrella(s, stemX - (t - 13.2) * 24, stemY + (t - 13.2) * 46, { w: half * 2, h: 18, stem: 26, tilt: 1 });
    const leafTop = stemY - 26;
    const rainK = late ? 0 : 1 - phase(t, 12.6, 13.6);
    if (rainK > 0) {
      const under = (x, y) => holdLeaf && x > stemX - half + 3 && x < stemX + half - 3 && y > leafTop - 4;
      rain(s, t, { n: Math.round(300 * rainK), speed: 300, slant: 0.22, len: 5, c: '#9fb0d8', alpha: 0.5, mask: under });
      splashes(s, t, (x) => (holdLeaf && x > stemX - half && x < stemX + half ? leafTop - 12 : fy(x)), { n: Math.round(30 * rainK), c: '#9fb0d8' });
      if (holdLeaf) for (const ex of [-half + 2, half - 3]) for (let i = 0; i < 2; i++) { const u = (t * 1.7 + i * 0.5 + (ex > 0 ? 0.25 : 0)) % 1; pset(s, stemX + ex, leafTop + 8 + u * 40, '#bfd2ff'); }
    }

    // ---- Codex runs in with a toolbox ----
    if (late) {
      const cdX = track(t, [[16.4, 668], [17.5, CDX, 'outQuad']]), moving = t < 17.5;
      const wk = moving ? codexWalk(qt(t * 3, 12)) : {};
      drawCodex(s, cdX, fy(cdX), { ...wk, screen: { mode: 'face', face: t > 17.5 ? 'heart' : 'happy' }, handL: t > 17.5 ? [-3, -12 + (Math.floor(t * 8) % 2) * 2] : [0, 0], handR: [2, 2], shadowY: fy(cdX) + 1, shadowW: 34 });
      const bx = Math.round(cdX + 20), by = fy(cdX) - 16;
      rect(s, bx - 7, by, 15, 9, '#c0392b'); rect(s, bx - 7, by, 15, 2, '#e05a4a'); rect(s, bx - 3, by - 3, 7, 3, '#7a2a20'); rect(s, bx - 1, by + 3, 3, 2, '#f2c230');
      say(f, cdX - 6, fy(cdX) - 60, t, 17.1, 19.0, 'Чиним мотор? Вместе!', { dir: -1 });
    }

    say(f, clX + 4, clY - 46, t, 3.1, 5.1, 'Эй. Можно к тебе?', { dir: 1 });
    say(f, clX + 2, clY - 44, t, 7.3, 9.9, 'Знаешь, на чём я летаю? На твоих TPU!', { dir: 1, maxW: 120 });
    say(f, clX + 2, clY - 44, t, 10.1, 12.2, 'Твоя искра греет и меня.', { dir: 1 });
    if (!late) chapter(f.ui, t, 0.3, 3.4, 4, 'ДРУГ');
    f.bloomOpts = { strength: 0.6 + 0.1 * clear };
    f.gradeOpts = { sat: 0.55 + 0.5 * back, contrast: 1.05, tint: [0.92 + 0.08 * clear, 0.97 + 0.03 * clear, 1.08 - 0.08 * clear] };
    f.vig = 0.5 - 0.1 * clear;
    if (t >= 16.4 && t < 16.7) f.fade = (1 - phase(t, 16.4, 16.7)) * 0.8;
  },
};
