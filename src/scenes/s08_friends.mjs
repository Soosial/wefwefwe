// Scene 8 — Friends. A leaf umbrella stops the rain over Gemini: it's Clawd. Inside Clawd's little lantern burns
// Gemini's own four-colour spark ("It still keeps me warm" — Claude runs on Google's TPUs). Colour returns, the sky
// clears, Codex runs in, and a polaroid freezes the moment.
import { hillSet, say, AMB, gy, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex, codexWalk } from '../chars/codex.mjs';
import { lantern, tag, caption, rain, splashes, sparkle, leafUmbrella, polaroid } from '../world/props.mjs';
import { SKIES, shootingStar } from '../world/sky.mjs';
import { rect, pset, hex, mix, glow, gradV } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { qt, ease } from '../core/math.mjs';

const GX = 420, LX = 392;
export const SFX = [
  [0, 'rain', { dur: 13.6, gain: 0.8, fadeOut: 1.4 }],
  [1.55, 'leafRain', { dur: 11.0 }],
  [1.5, 'rustle', { gain: 0.6 }],
  [3.0, 'babble', { who: 'clawd', n: 4, pitch: 0.95 }],
  [5.0, 'sit'],
  [6.0, 'clink'],
  [6.3, 'babble', { who: 'clawd', n: 5 }],
  [7.0, 'flameSoft', { dur: 2.2 }],
  [9.2, 'babble', { who: 'clawd', n: 5, pitch: 0.92 }],
  [10.6, 'sniff'],
  [12.2, 'hug'],
  [12.4, 'colorSweep', { dur: 1.6 }],
  [13.6, 'chime', { gain: 0.5 }],
  [14.4, 'stepsRobot', { dur: 1.3, pan: 0.6 }],
  [15.7, 'babble', { who: 'codex', n: 3 }],
  [16.0, 'shootingStar'],
  [17.15, 'camera'],
  [17.4, 'photoSlide'],
];

function heart(s, x, y, c = '#ff6a8a') {
  const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') pset(s, x + i - 3, y + j - 3, (i === 1 && j === 1) ? '#ffd0dc' : c); }));
}
function lerpStops(a, b, k) { return a.map(([p, c], i) => [p, mix(c, b[Math.min(i, b.length - 1)][1], k)]); }

export default {
  id: 'friends', dur: 19,
  in: { type: 'dither', dur: 0.6 },
  render(f, t) {
    const G = gy(GX);
    const lanX = 437, lanY = gy(437) + 1;
    const zoom = track(t, [[0, 1.9], [2.5, 1.9], [4.4, 1.65, 'inOutSine'], [6.9, 1.7], [7.6, 3.0, 'inOutCubic'], [9.0, 3.0], [9.6, 1.8, 'inOutCubic'], [12.0, 1.8], [14.6, 1.25, 'inOutSine'], [19, 1.22]]);
    const cx = track(t, [[0, 428], [2.5, 428], [4.4, 440, 'inOutSine'], [6.9, 440], [7.6, lanX, 'inOutCubic'], [9.0, lanX], [9.6, 436, 'inOutCubic'], [12, 436], [14.6, 446, 'inOutSine']]);
    const cy = track(t, [[0, G - 30], [2.5, G - 30], [4.4, G - 34, 'inOutSine'], [6.9, G - 32], [7.6, lanY - 12, 'inOutCubic'], [9.0, lanY - 12], [9.6, G - 30, 'inOutCubic'], [12, G - 30], [14.6, 150, 'inOutSine']]);
    const s = f.camera(cx, cy, zoom);
    const clear = phase(t, 12.4, 15.0);
    const amb = AMB.rain.map((v, i) => v + ([0.6, 0.6, 0.9][i] - v) * clear);
    f.ambient = amb;
    const sky = lerpStops(SKIES.rain, SKIES.clearing, clear);
    SKIES._friends = sky;
    hillSet(f, s, t, {
      sky: '_friends', starCount: clear > 0 ? 320 : 0, starBright: clear, milky: clear * 0.8, signFront: 'ОКТЯБРЬ', villageLights: 0.012 * clear, wind: 2 - clear,
      cloudCols: ['#1a2030', '#252d42', '#323c56', '#465070'].map((c, i) => mix(c, ['#2a2a62', '#3e4284', '#5a60a8', '#8890d0'][i], clear)),
      cloudFill: mix('#1a2030', '#2a2a62', clear), islandTop: mix('#2c3448', '#3b4a86', clear), islandBody: mix('#1c2232', '#232858', clear), islandDark: mix('#151a28', '#191c46', clear),
    });
    if (t > 15.6) shootingStar(s, t, 15.9, 300 - s.tx * 0, 20 - s.ty, 140, 40, 0.8);
    lantern(s, LX, gy(LX), { w: 28, h: 32, paper: mix('#b8b4ac', '#d6cfc0', clear), lit: 0, t, deflate: 1, noGlow: true });
    tag(s, LX + 2, gy(LX) - 6, 'COMING SOON', { ink: '#8a3a32', paper: '#c8c2b4' });

    // ---- Clawd with the leaf ----
    const clX = track(t, [[0, 520], [1.5, 470, 'outQuad'], [4.6, 470], [5.2, 452, 'inOutQuad'], [12.0, 452], [12.4, 446, 'outQuad']]);
    const sitting = t > 5.0;
    const clY = gy(clX) + (sitting ? 2 : 0);
    const holdLeaf = t < 13.2;
    const hug = t > 12.2 && t < 14.6;
    let ce = blinkAt(t, 2) ? 'blink' : 'open', cm = 'smile';
    if (t > 2.4 && t < 4.6) { ce = 'happy'; cm = 'smile'; }
    if (t > 6.2 && t < 9.0) { ce = 'open'; cm = 'smile'; }
    if (t > 9.2 && t < 11.8) { ce = 'happy'; cm = 'smile'; }
    if (hug) { ce = 'closed'; cm = 'cat'; }
    if (t > 15.6) { ce = 'happy'; cm = 'open'; }
    drawClawd(s, clX, clY, {
      legs: sitting ? [3, 3, 3, 3] : undefined, eyes: ce, mouth: cm, blush: hug ? 2 : 1, look: t > 2.2 && t < 12 ? -2 : 0,
      armL: holdLeaf ? -10 : hug ? -4 : 0, armLx: hug ? 2 : 0, armR: t > 5.6 && t < 6.2 ? -4 : 0, sq: hug ? 1 : 0, shadowY: clY + 1, shadowW: 38,
    });
    // Clawd's little lantern with Gemini's spark inside
    if (t > 5.6) {
      const placed = phase(t, 5.6, 6.0, 'outQuad');
      const lx = clX + 26 + (lanX - clX - 26) * placed, ly = clY - 16 + (lanY - clY + 16) * placed;
      lantern(s, lx, ly, { w: 16, h: 20, paper: '#ff9a4a', lit: 0.85, t, seed: 11 });
      // open door + four-colour flame
      const dx = Math.round(lx) - 3, dy = Math.round(ly) - 13;
      rect(s, dx, dy, 6, 8, '#3a160c');
      s.with({ flag: 2 }, () => {
        const cols = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
        for (let i = 0; i < 4; i++) {
          const hgt = 3 + Math.round(2 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)));
          for (let j = 0; j < hgt; j++) pset(s, dx + 1 + i, dy + 7 - j, j === hgt - 1 ? mix(cols[i], '#ffffff', 0.5) : cols[i]);
        }
      });
      text(s, 'TPU', Math.round(lx), Math.round(ly) - 3, { align: 'center', color: '#5a2a14' });
      glow(s, lx, ly - 9, 16, '#fff2c8', 0.5, 5);
      f.light(lx, ly - 10, 60, '#ffd8a0', 0.9);
    }

    // ---- Gemini: colour returns ----
    const back = phase(t, 12.3, 13.9, 'inOutSine');
    const gX = GX + (hug ? 8 * phase(t, 12.2, 12.5) : t > 14.6 ? 8 : 0);
    let ge = 'sad', gm = 'frown', tears = 0.6, lookY = 0, look = 0;
    if (t > 1.9 && t < 4.6) { ge = 'up'; gm = 'o'; lookY = -1; tears = 0.3; }
    if (t > 4.6 && t < 6.2) { ge = 'open'; gm = 'flat'; look = 2; tears = 0.2; }
    if (t > 6.2 && t < 9.2) { ge = t < 7.4 ? 'open' : 'shock'; gm = t < 7.4 ? 'flat' : 'o'; look = 1; lookY = 1; tears = 0; }
    if (t > 9.2 && t < 12.2) { ge = 'teary'; gm = 'wobble'; tears = phase(t, 9.6, 10.6); look = 2; }
    if (hug) { ge = 'closed'; gm = 'smile'; tears = 0.4; }
    if (t > 14.6) { ge = blinkAt(t, 4) ? 'blink' : 'happy'; gm = 'smile'; tears = 0; }
    drawGemini(s, gX, G, {
      hover: 0.5 + back * 3 + (t > 14.6 ? osc(t, 0.7) : 0), sat: 0.12 + 0.88 * back, sharp: 0.84 - 0.16 * back, R: 24 + 2.5 * back,
      sy: 0.93 + 0.07 * back, eyes: ge, mouth: gm, tears, look, lookY, blush: hug ? 2 : 1,
      handL: [4 - 4 * back, 3 - 3 * back], handR: hug ? [4, -6] : [-4 + 4 * back, 3 - 3 * back], shadowY: G + 1, shadowW: 22,
    });
    if (hug) for (let i = 0; i < 3; i++) {
      const u = ((t - 12.2) * 0.7 + i * 0.33) % 1;
      heart(s, 436 + Math.sin(u * 6 + i) * 6, G - 52 - u * 30, ['#ff6a8a', '#ff9ad5', '#ff7a6b'][i]);
    }
    // colour sweep sparkles while the colours come back
    if (t > 12.3 && t < 14.0) for (let i = 0; i < 6; i++) sparkle(s, gX + Math.cos(t * 4 + i) * 18, G - 28 + Math.sin(t * 3 + i * 2) * 18, 1 + (i % 2), ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i % 4], 1);

    // ---- leaf umbrella and rain ----
    const leafIn = phase(t, 1.4, 1.9, 'outBack');
    const stemX = clX - 24 - (1 - leafIn) * 40, stemY = clY - 30;
    const leafC = [stemX, stemY - 26];
    if (holdLeaf) leafUmbrella(s, stemX, stemY, { w: 66, h: 16, stem: 26, tilt: -0.3 });
    else if (t < 14) leafUmbrella(s, stemX + (t - 13.2) * 20, stemY + (t - 13.2) * 40, { w: 66, h: 16, stem: 26, tilt: -1 });
    const rainK = 1 - phase(t, 12.6, 13.6);
    const under = (x, y) => holdLeaf && x > leafC[0] - 33 && x < leafC[0] + 33 && y > leafC[1] - 2;
    if (rainK > 0) {
      rain(s, t, { n: Math.round(300 * rainK), speed: 300, slant: 0.22, len: 5, c: '#9fb0d8', alpha: 0.5, mask: under });
      splashes(s, t, (x) => (x > leafC[0] - 33 && x < leafC[0] + 33 && holdLeaf ? leafC[1] - 14 : gy(x)), { n: Math.round(30 * rainK), c: '#9fb0d8' });
      if (holdLeaf && t > 1.9) for (const ex of [-32, 31]) for (let i = 0; i < 2; i++) {
        const u = ((t * 1.7 + i * 0.5 + (ex > 0 ? 0.25 : 0)) % 1);
        pset(s, leafC[0] + ex, leafC[1] - 6 + u * 46, '#bfd2ff');
      }
    }

    // ---- Codex runs in ----
    if (t > 14.3) {
      const cdX = track(t, [[14.3, 560], [15.6, 478, 'outQuad']]);
      const moving = t < 15.6;
      const wk = moving ? codexWalk(qt(t * 3, 12)) : {};
      drawCodex(s, cdX, gy(cdX), { ...wk, screen: t > 15.6 ? { mode: 'face', face: 'heart' } : { mode: 'face', face: 'happy' }, handL: t > 15.7 && t < 16.6 ? [-2, -14 + (Math.floor(t * 10) % 2) * 2] : [0, 0], shadowY: gy(cdX) + 1, shadowW: 34 });
    }

    say(f, clX - 10, clY - 50, t, 2.9, 4.7, 'Эй. Можно к тебе?', { dir: 1 });
    say(f, clX - 6, clY - 48, t, 6.2, 7.5, 'Узнаёшь? Это твоя искра.', { dir: 1 });
    say(f, clX - 6, clY - 48, t, 9.3, 11.9, 'Она до сих пор меня греет.', { dir: 1 });

    // ---- polaroid ----
    if (t > 17.15) {
      const u = phase(t, 17.35, 17.9, 'outBack');
      const py = 300 - u * 160;
      const ang = 0;
      void ang;
      polaroid(f.ui, 352, py, { w: 92, h: 104, caption: 'друзья' }, (x0, y0, iw, ih) => {
        gradV(f.ui, x0, y0, iw, ih, [[0, '#16204c'], [1, '#3a4b7e']], 8);
        for (let i = 0; i < 14; i++) pset(f.ui, x0 + hash(i) * iw, y0 + hash(i + 40) * ih * 0.5, '#ffffff');
        rect(f.ui, x0, y0 + ih - 14, iw, 14, '#3f8443');
        drawGemini(f.ui, x0 + 44, y0 + ih - 10, { scale: 0.5, hover: 2, eyes: 'happy', mouth: 'open', shadow: false });
        drawClawd(f.ui, x0 + 66, y0 + ih - 9, { scale: 0.5, eyes: 'happy', mouth: 'open', shadow: false });
        drawCodex(f.ui, x0 + 20, y0 + ih - 9, { scale: 0.5, screen: { mode: 'face', face: 'heart' }, shadow: false });
      });
    }
    caption(f.ui, 'Иногда, чтобы снова загореться,', t, 16.9, 19, { y: 230, x: 170 });
    caption(f.ui, 'нужен всего один друг.', t, 17.3, 19, { y: 241, x: 170 });
    f.bloomOpts = { strength: 0.6 + 0.1 * clear };
    f.gradeOpts = { sat: 0.55 + 0.5 * clear, contrast: 1.05, tint: [0.92 + 0.08 * clear, 0.97 + 0.03 * clear, 1.08 - 0.08 * clear] };
    f.vig = 0.5 - 0.1 * clear;
    if (t > 17.1 && t < 17.45) { f.fadeColor = 0xffffffff; f.fade = 1 - (t - 17.1) / 0.35; }
  },
};
