// S9 — Comeback (2D -> 3D -> 2D): the friends see Gemini off; Gemini 4 Argon launches with four-colour trails and
// overtakes the DeepSeek whale and Kimi (a mirror of S5); the board flips him to the top; he lands and flies to his friends.
import { fieldSet, fy, BOARD_X, board2D, glider2D } from '../world/field.mjs';
import { crowd, say } from './common.mjs';
import { SKY3, world, chr, shot3D, cam3, label3D, narr, chapter, groundAt, LAUNCH, rotMat } from './world3d.mjs';
import { makeGlider, makeCrescent } from '../world/voxworld.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { blinkState, talkMouth } from '../chars/common.mjs';
import { confetti, sparkle, dust } from '../world/props.mjs';
import { glow } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash, hop } from '../core/math.mjs';

const GLX = 548, CLX = 492, CDX = 440;
const C = { claude: '#d97757', gpt: '#5a7cff', gem: '#fbbc04', ds: '#4d6bfe', kimi: '#6c76a0' };
const BEFORE = [
  { rank: 1, name: 'CLAUDE OPUS 5.5', col: C.claude }, { rank: 2, name: 'GPT-6 ASTRA', col: C.gpt }, { rank: 3, name: 'GPT-6.1 SOL', col: C.gpt },
  { rank: 4, name: 'DEEPSEEK V4', col: C.ds }, { rank: 5, name: 'KIMI K3.1', col: C.kimi }, { rank: 6, name: 'GEMINI 3.5 FLASH', col: C.gem },
];
const AFTER = [
  { rank: 1, name: 'GEMINI 4 ARGON', col: C.gem, textCol: '#ffe27a' }, { rank: 2, name: 'CLAUDE OPUS 5.5', col: C.claude }, { rank: 3, name: 'GPT-6.1 SOL', col: C.gpt },
  { rank: 4, name: 'GPT-6 ASTRA', col: C.gpt }, { rank: 5, name: 'DEEPSEEK V4', col: C.ds }, { rank: 6, name: 'KIMI K3.1', col: C.kimi },
];
const G4 = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];

export const SFX = [
  [0, 'crowdAmb', { dur: 4.5, gain: 0.4 }], [0, 'birds', { dur: 4.4, gain: 0.3 }],
  [0.9, 'babble', { who: 'clawd', n: 5 }],
  [2.8, 'beep'], [3.2, 'beep'], [3.6, 'beep'], [4.0, 'beepHi'], [3.9, 'powerUp', { dur: 0.6 }],
  [4.4, 'launch'], [4.5, 'flyWind', { dur: 7.5 }], [5.9, 'whoosh'],
  [7.7, 'whaleSong', { pitch: 0.8 }], [8.3, 'gulp'], [8.6, 'whooshSoft', { pitch: 1.3 }],
  [9.8, 'magicRise', { dur: 1.6 }],
  [12.0, 'crowdAmb', { dur: 7, gain: 0.5 }], [12.6, 'flaps', { dur: 1.6 }], [13.9, 'chime'], [14.0, 'cheer', { dur: 3.5, k: 1.2 }], [14.1, 'firework'],
  [15.7, 'whooshSoft', { pitch: 0.9 }], [16.8, 'thud', { gain: 0.5 }], [17.0, 'hop', { pitch: 1.2 }], [17.7, 'clap', { dur: 0.15, k: 0.8 }], [17.75, 'heart'],
];
export const MUSIC = [
  { t0: 0, dur: 4.4, bpm: 96, root: 60, bars: [1, 4, 6, 5], fi: 0.4, fo: 0.05, pad: { inst: 'strings', oct: -1, vel: 0.4 }, mel: { inst: 'bell', str: "5 . 3 5 1' . 7 6 5 - - -", oct: 1, vel: 0.32 }, drums: { t: '........x.x.xxxx', vel: 0.25 } },
  { t0: 4.4, dur: 7.6, bpm: 132, root: 60, bars: [1, 5, 6, 4], fi: 0.05, fo: 0.4, mel: { inst: 'brass', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 7 . 5 . 2' - - -", oct: 0, vel: 0.5 }, pad: { inst: 'strings', oct: -1, vel: 0.42 }, bass: { pattern: 'pulse8', oct: -2, vel: 0.42 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', cr: 'x...............', vel: 0.42 } },
  { t0: 12.0, dur: 3.6, bpm: 132, root: 60, bars: [4, 5, 1], fi: 0.1, fo: 0.3, mel: { inst: 'brass', str: "1 . 3 . 5 . 1' - 5 . 1' . 3' - - -", oct: 0, vel: 0.52 }, pad: { inst: 'strings', oct: -1, vel: 0.45 }, drums: { k: 'x.......x.......', cr: 'x...............', vel: 0.4 } },
  { t0: 15.6, dur: 3.4, bpm: 100, root: 60, bars: [1, 6, 4, 5], fi: 0.3, fo: 0.4, mel: { inst: 'bell', str: "3 . 5 . 1' . 7 . 6 . 5 . 1' - - -", oct: 1, vel: 0.42 }, pad: { inst: 'strings', oct: -1, vel: 0.4 }, bass: { pattern: 'oom', oct: -2, vel: 0.3 } },
];

// the flight path of the glider (world units)
const PATH = [[4.4, [24, 9, -30]], [5.4, [22, 15, -72], 'inSine'], [6.6, [40, 30, -150]], [7.8, [120, 48, -200]], [9.0, [210, 64, -190]], [10.2, [270, 104, -150]], [11.2, [300, 160, -96]], [12.0, [316, 214, -50]]];
const pathAt = (t) => track(t, PATH);
function pose(t) {
  const p = pathAt(t), a = pathAt(t - 0.05), b = pathAt(t + 0.05);
  const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const yaw = Math.atan2(v[0], v[2]), pitch = -Math.atan2(v[1], Math.hypot(v[0], v[2])) * 0.8;
  const a2 = pathAt(t - 0.25), b2 = pathAt(t + 0.25);
  const turn = Math.atan2(b2[0] - p[0], b2[2] - p[2]) - Math.atan2(p[0] - a2[0], p[2] - a2[2]);
  return { p, yaw, pitch, roll: clamp(-turn * 2.2, -0.6, 0.6) };
}
const GS = 0.6;
function flight3D(f, t) {
  const L = LAUNCH, g = (x, z) => groundAt(x, z);
  const { p, yaw, pitch, roll } = pose(t);
  const R = rotMat(yaw, pitch, roll);
  let cam;
  if (t < 6.6) cam = cam3(f, [8, 22, -116], [p[0], p[1] + 6, p[2]], 0.9);
  else if (t < 9.6) cam = cam3(f, [p[0] - 16, p[1] + 26, p[2] - 66], [p[0] + 10, p[1] + 6, p[2]], 0.85);
  else cam = cam3(f, [226, 70, -236], [p[0], p[1] + 4, p[2]], track(t, [[9.6, 0.8], [12, 0.95]]));
  const sc = { ...SKY3.day, models: world(false).slice(), points: [], bloom: { strength: 0.6 }, rays: null };
  sc.models.push({ model: makeGlider(), pos: p, rot: R, scale: GS, id: 24, bright: 1.3 });
  sc.models.push(chr('gemini', { eyes: t < 7.8 ? 'determined' : 'happy', brow: t < 7.8 ? 'focus' : null, mouth: t < 7.8 ? 'smile' : 'big', handR: t > 10 ? [2, -14] : [0, 0] }, [p[0] + R[0][1] * 16 * GS, p[1] + R[1][1] * 16 * GS, p[2] + R[2][1] * 16 * GS], { id: 64 }));
  // the rivals, left behind this time
  const shock = t > 8.0;
  const wp = [150, 46 + Math.sin(t * 1.3) * 2, -168], kp = [192, 62 + Math.sin(t * 1.7) * 2, -150];
  if (t > 6.6) {
    sc.models.push(chr('whale', { eyes: shock ? 'shock' : 'happy', mouth: shock ? 'gasp' : 'smile', brow: shock ? 'raised' : null, tail: Math.sin(t * 3) }, wp, { id: 70, scale: 0.85, flip: true }));
    sc.models.push({ model: makeCrescent(), pos: kp, rot: rotMat(0, 0, -0.3), id: 71 }, chr('kimi', { eyes: shock ? 'shock' : 'open', mouth: shock ? 'o' : 'smile' }, [kp[0], kp[1] + 4, kp[2] - 1], { id: 72 }));
  }
  // four-colour trails from the trailing edge
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  for (let k = 1; k < 44; k++) {
    const tt = t - k * 0.045;
    if (tt < 4.45) break;
    const q = pathAt(tt);
    for (let lane = 0; lane < 4; lane++) {
      const off = (lane - 1.5) * 7.5;
      sc.points.push({ p: [q[0] + cy * off, q[1] + 6 * GS, q[2] - sy * off], c: G4[lane], size: 0.9, flag: 2, a: 1 - k / 44 });
    }
  }
  if (t < 5.0) for (let i = 0; i < 40; i++) { const a = hash(i) * Math.PI * 2, r = 4 + (t - 4.4) * 40 * hash(i + 3); sc.points.push({ p: [24 + Math.cos(a) * r, g(24, -30) + 1 + hash(i + 7) * 3, -30 + Math.sin(a) * r], c: '#e8ecf6', size: 3, flag: 1, a: 1 - (t - 4.4) / 0.6 }); }
  shot3D(f, cam, sc, t);
  label3D(f, cam, [p[0], p[1] + 30 * GS + 10, p[2]], 'GEMINI 4 ARGON', '#d8c8ff', phase(t, 5.2, 5.7) * clamp((11.6 - t) / 0.4) * (t < 6.9 || t > 9.4 ? 1 : 0));
  label3D(f, cam, [wp[0], wp[1] + 40, wp[2]], 'DEEPSEEK V4', '#9fb0ff', t > 6.6 ? clamp((t - 7.0) / 0.4) * clamp((9.4 - t) / 0.3) : 0);
  label3D(f, cam, [kp[0], kp[1] + 26, kp[2]], 'KIMI K3.1', '#d8dcf0', t > 6.6 ? clamp((t - 7.2) / 0.4) * clamp((9.4 - t) / 0.3) : 0);
  narr(f.ui, 'Теперь отставали другие.', t, 7.4, 9.5);
}

function board(f, t) {
  const s = f.camera(track(t, [[12, BOARD_X - 6], [15.6, BOARD_X - 2]]), track(t, [[12, 150], [15.6, 152]]), track(t, [[12, 1.6], [15.6, 1.7]]));
  fieldSet(f, s, t, { tod: 'day', sun: [80, 36] });
  const G = fy(BOARD_X);
  board2D(s, t, BOARD_X, G, t < 12.6 ? BEFORE : AFTER, { cols: 20, title: 'ТАБЛО ВЕРШИНЫ', flips: AFTER.map((r, i) => ({ t0: 12.6 + i * 0.2, row: i, from: BEFORE[i].name })), highlight: t > 13.9 ? 0 : null });
  const cheer = t > 13.9;
  const j1 = cheer ? Math.abs(Math.sin((t - 13.9) * 6)) * 8 : 0, j2 = cheer ? Math.abs(Math.sin((t - 13.95) * 6)) * 8 : 0;
  drawClawd(s, BOARD_X - 52, fy(BOARD_X - 52) - j1, { eyes: cheer ? 'happy' : 'up', mouth: cheer ? 'open' : 'o', lookY: -1, armR: cheer ? -10 : 0, armL: cheer ? -10 : 0, shadowY: fy(BOARD_X - 52) + 1, shadowW: 38 });
  drawCodex(s, BOARD_X + 54, fy(BOARD_X + 54) - j2, { screen: { mode: 'face', face: cheer ? 'laugh' : 'surprised' }, handL: cheer ? [-2, -14] : [0, 0], handR: cheer ? [2, -14] : [0, 0], shadowY: fy(BOARD_X + 54) + 1, shadowW: 34 });
  if (cheer) { confetti(s, t, 13.9, BOARD_X - 60, 40, { n: 40 }); confetti(s, t, 14.1, BOARD_X + 60, 40, { n: 40 }); }
  narr(f.ui, 'Gemini 4 Argon вышел — и взлетел на самый верх.', t, 12.8, 15.5);
  f.bloomOpts = { strength: 0.5 };
  f.gradeOpts = { sat: 1.06, contrast: 1.03 };
}

export default {
  id: 'argon', dur: 19,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    if (t >= 4.4 && t < 12) { flight3D(f, t); return; }
    if (t >= 12 && t < 15.6) { board(f, t); return; }
    const end = t >= 15.6;
    const s = end ? f.camera(track(t, [[15.6, 528], [19, 520]]), fy(528) - 46, track(t, [[15.6, 1.7], [19, 1.8]])) : f.camera(track(t, [[0, 532], [4.4, 540]]), fy(532) - 42, track(t, [[0, 1.9], [4.4, 2.1]]));
    fieldSet(f, s, t, { tod: 'morning', sun: [90, 40] });
    // glider on the pad (or landing on it)
    const gly = end ? track(t, [[15.6, fy(GLX) - 120], [16.8, fy(GLX) + 1, 'outQuad']]) : fy(GLX) + 1 - (t > 4.0 ? (t - 4.0) * 20 : 0);
    const eng = end ? 1 - phase(t, 16.6, 17.0) : phase(t, 3.9, 4.2);
    glider2D(s, t, GLX, gly, { engine: eng, parked: !end || t > 16.8 });
    if (!end && t > 3.9) for (let i = 0; i < 3; i++) dust(s, t, 3.9 + i * 0.12, GLX - 30 + i * 30, fy(GLX), { n: 5, life: 0.5 });
    // Gemini: breath, focus, go — later hops off and flies to his friends
    const off = end && t > 16.9;
    const gx = off ? track(t, [[16.9, GLX], [17.6, CLX + 34, 'inOutQuad']]) : GLX;
    const gyy = off ? fy(gx) - hop(t, 16.9, 0.7, 18) : gly - 13;
    let ge = blinkState(t, 4) || 'open', gm = 'smile', gb = null;
    if (!end) { if (t > 1.0 && t < 2.6) { ge = 'closed'; gm = 'flat'; } else if (t >= 2.6) { ge = 'determined'; gb = 'focus'; } }
    else { ge = off ? (t > 17.6 ? 'happy' : 'sparkle') : 'happy'; gm = 'big'; }
    const five = t > 17.6 && t < 18.4;
    drawGemini(s, gx, gyy, { hover: off ? 6 + osc(t, 0.8) : 0, eyes: ge, mouth: gm, brow: gb, handR: five ? [-6, -16] : [0, 0], handL: five ? [-2, -14] : [0, 0], shadow: off, shadowY: fy(gx) + 1, shadowW: 24 });
    // Clawd and Codex
    const clap = five ? 1 : 0;
    drawClawd(s, CLX, fy(CLX), { eyes: blinkState(t, 2) || (end ? 'happy' : 'open'), mouth: !end ? talkMouth(t, 0.9, 2.6, 'smile', 1) : 'open', look: 2, armR: clap ? -12 : end ? -6 : 0, armRx: clap ? 4 : 0, shadowY: fy(CLX) + 1, shadowW: 38 });
    const n = t < 2.8 ? null : t < 3.2 ? '3' : t < 3.6 ? '2' : t < 4.0 ? '1' : 'GO!';
    drawCodex(s, CDX, fy(CDX), { screen: !end && n ? { mode: 'text', lines: [n], font: 'press' } : { mode: 'face', face: end ? 'heart' : 'happy' }, handR: clap ? [8, -14] : [0, 0], shadowY: fy(CDX) + 1, shadowW: 34 });
    if (five) { glow(s, CLX + 22, fy(CLX) - 52, 14, '#fff2c0', 0.7 * (1 - phase(t, 17.6, 18.3)), 4); for (let i = 0; i < 8; i++) sparkle(s, CLX + 22 + Math.cos(i * 0.8) * (6 + (t - 17.6) * 30), fy(CLX) - 52 + Math.sin(i * 0.8) * (4 + (t - 17.6) * 20), 2, G4[i % 4], 1 - phase(t, 17.6, 18.4)); }
    crowd(f, s, t, { n: 22, x0: 300, x1: 660, mood: (i) => ({ jump: end ? 0.55 + 0.3 * Math.sin(i) : 0.2, icon: null }) });
    say(f, CLX + 6, fy(CLX) - 48, t, 0.9, 2.9, 'Ты готов. Мы рядом!', { dir: 1 });
    if (!end) chapter(f.ui, t, 0.3, 3.4, 5, 'ВОЗВРАЩЕНИЕ');
    narr(f.ui, 'Но теперь он знал, кто рядом по-настоящему.', t, 16.2, 18.9);
    f.bloomOpts = { strength: 0.5 };
    f.gradeOpts = { sat: 1.06, contrast: 1.03 };
    f.vig = 0.3;
  },
};
