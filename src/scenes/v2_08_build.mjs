// S8 — The workshop (2D night -> dawn, then 3D): all night the three rebuild Gemini's engine by lantern light — Codex welds,
// Clawd reads the blueprint, Gemini folds his old Flash planes into the wing. At dawn Gemini 4 Argon stands on the pad.
import { fieldSet, fy, PADS, crate2D, glider2D, mixTOD, emote } from '../world/field.mjs';
import { SKY3, world, chr, shot3D, cam3, camPath, label3D, narr, groundAt, LAUNCH, rotMat } from './world3d.mjs';
import { makeGlider, makeLantern3D } from '../world/voxworld.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { blinkState } from '../chars/common.mjs';
import { lantern, sparkle } from '../world/props.mjs';
import { rect, pset, line, poly, glow, hex } from '../core/fb.mjs';
import { text } from '../core/font.mjs';
import { clamp, track, phase, osc, hash } from '../core/math.mjs';

const GLX = 548, CLX = 488, CDX = 622;
export const SFX = [
  [0, 'crickets', { dur: 6.2, gain: 0.4 }],
  [0.3, 'workshop', { dur: 5.4 }],
  [1.2, 'paper'], [2.6, 'paper'], [4.0, 'paper'],
  [1.5, 'sparkPulse'], [2.9, 'sparkPulse'], [4.3, 'sparkPulse'],
  [5.8, 'magicRise', { dur: 1.0 }],
  [6.0, 'birds', { dur: 5, gain: 0.45 }],
  [6.2, 'shimmer', { dur: 1.6 }],
  [8.0, 'chime', { gain: 0.6 }], [8.6, 'heart'],
  [9.4, 'babble', { who: 'gemini', n: 3 }], [9.6, 'hop', { pitch: 1.2 }],
];
export const MUSIC = [
  { t0: 0, dur: 6.0, bpm: 104, root: 60, bars: [1, 4, 6, 5], fi: 0.4, fo: 0.5, mel: { inst: 'pluck', str: "1 . 3 . 5 . 3 . 4 . 6 . 5 . . . 3 . 5 . 1' . 7 . 6 . 4 . 5 . . .", oct: 1, vel: 0.34, loop: true }, bass: { pattern: 'walk', oct: -2, vel: 0.3 }, drums: { w: 'x...x...x...x...', h: '..x...x...x...x.', vel: 0.2 } },
  { t0: 6.0, dur: 5.0, bpm: 76, root: 60, bars: [4, 5, 1], fi: 0.3, fo: 0.8, mel: { inst: 'bell', str: "3 . 5 . 1' . . . 2' . 7 . 1' - - -", oct: 1, vel: 0.45 }, pad: { inst: 'strings', oct: -1, vel: 0.42 } },
];

function plane(s, x, y, ang, scale = 1) {
  const ca = Math.cos(ang) * scale, sa = Math.sin(ang) * scale, P = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
  poly(s, [P(8, 0), P(-6, -4), P(-3, 0)], '#fbfaf2'); poly(s, [P(8, 0), P(-6, 4), P(-3, 0)], '#d8d6cc');
  line(s, ...P(-4, -2), ...P(5, -1), hex('#ffd23a'));
}
function blueprint(s, x, y) {
  rect(s, x, y, 28, 19, '#2a5cb8'); rect(s, x, y, 28, 1, '#5a8ae0');
  for (let i = 0; i < 28; i += 4) rect(s, x + i, y + 1, 1, 18, '#2f66c8');
  const c = '#e6f0ff';
  line(s, x + 3, y + 12, x + 14, y + 5, c); line(s, x + 14, y + 5, x + 25, y + 12, c); line(s, x + 3, y + 12, x + 14, y + 9, c); line(s, x + 14, y + 9, x + 25, y + 12, c);
  text(s, 'G4', x + 14, y + 13, { align: 'center', color: c });
}

function workshop(f, t) {
  const s = f.camera(track(t, [[0, 560], [6, 566]]), fy(560) - 38, track(t, [[0, 1.95], [6, 2.1]]));
  const dawn = phase(t, 2.4, 6.0);
  fieldSet(f, s, t, { pal: mixTOD('night', 'dawn', dawn), night: dawn < 0.5, bunting: false, flowers: 0.04, moon: [track(t, [[0, 120], [6, 60]]), track(t, [[0, 40], [6, 70]]), 9] });
  const cX = PADS.gemini + 34;
  crate2D(s, t, cX, fy(cX) + 1, 3, { tag: false });
  lantern(s, cX, fy(cX) - 30, { w: 14, h: 17, paper: '#ff9a4a', lit: 0.9, t, seed: 4 });
  f.light(cX, fy(cX) - 40, 110, '#ffcf90', 0.9 * (1 - dawn * 0.5));
  // progress: each folded plane completes another piece of the wing
  const build = 0.08 + 0.92 * phase(t, 0.4, 5.4);
  glider2D(s, t, GLX, fy(GLX) + 1, { build });
  // pile of old Flash planes
  for (let i = 0; i < Math.max(0, 5 - Math.floor(t / 1.2)); i++) plane(s, CLX - 40 + (i % 3) * 7, fy(CLX - 40) - 3 - Math.floor(i / 3) * 4, -0.1 + i * 0.3, 0.8);
  // Clawd with the blueprint
  const clY = fy(CLX);
  drawClawd(s, CLX, clY, { eyes: blinkState(t, 2) || (t > 4.6 ? 'happy' : 'determined'), brow: t < 4.6 ? 'focus' : null, mouth: t > 4.6 ? 'open' : 'flat', lookY: 1, armR: -6, armL: -6, shadowY: clY + 1, shadowW: 38 });
  blueprint(s, CLX + 16, clY - 40);
  // Gemini folds a plane and presses it into the wing, again and again
  const cyc = (t % 1.4) / 1.4, gx = GLX - 14 + Math.round(Math.sin(t * 1.1) * 5), gy = fy(GLX) - 8;
  const pressing = cyc > 0.55 && cyc < 0.8;
  drawGemini(s, gx, gy, { hover: 6 + osc(t, 0.8), eyes: blinkState(t, 4) || (pressing ? 'happy' : 'determined'), brow: pressing ? null : 'focus', mouth: pressing ? 'smile' : 'flat', handR: pressing ? [2, 8] : [2, -4], handL: [0, 0], lookY: 1, shadow: false });
  if (cyc < 0.55) plane(s, gx + 20, gy - 34 + cyc * 10, -0.4 + cyc, 0.9);
  if (pressing) for (let i = 0; i < 4; i++) sparkle(s, gx + 20 + Math.cos(i * 1.7 + t * 6) * 6, gy - 16 + Math.sin(i * 2.3) * 4, 1, ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i], 1);
  // Codex welds the right wing tip
  const weld = Math.sin(t * 4.5) > -0.2;
  drawCodex(s, CDX, fy(CDX), { screen: weld ? { mode: 'text', lines: ['> fix', 'wing'], left: true, cursor: Math.floor(t * 3) % 2 === 0 } : { mode: 'face', face: 'determined' }, handL: [-8, -2 + (weld ? Math.round(Math.sin(t * 30)) : 0)], shadowY: fy(CDX) + 1, shadowW: 34 });
  const wx = GLX + 38, wy = fy(GLX) - 13;
  if (weld) {
    s.with({ flag: 2 }, () => { for (let i = 0; i < 14; i++) { const a = hash(i + Math.floor(t * 24) * 17) * Math.PI - Math.PI, r = hash(i * 3 + Math.floor(t * 24)) * 10; pset(s, wx + Math.cos(a) * r, wy + Math.sin(a) * r * 0.6 + r * 0.3, i % 3 ? '#ffe27a' : '#ffffff'); } });
    glow(s, wx, wy, 14, '#cfe6ff', 0.7, 4);
    f.light(wx, wy, 70, '#cfe0ff', 0.9 + 0.3 * Math.sin(t * 40));
  }
  narr(f.ui, 'Всю ночь они строили вместе.', t, 0.7, 3.3);
  narr(f.ui, 'Даже старые «Флэши» пошли в дело.', t, 3.5, 5.8);
  f.bloomOpts = { strength: 0.65 };
  f.gradeOpts = { sat: 1.02, contrast: 1.04 };
  f.vig = 0.4 - 0.1 * dawn;
}

function reveal3D(f, t) {
  const L = LAUNCH, g = (x, z) => groundAt(x, z), gp = L.pads.gemini, u = t - 6;
  const gl = [gp[0], g(...gp) - 6, gp[1] - 2];
  // filmed from the village side (inside the bunting line); characters turn to face the camera
  const yaw = track(u, [[0, 0.3], [5, -0.5, "inOutSine"]]);
  const R = 50, cam = cam3(f, [gl[0] + Math.sin(yaw) * R, gl[1] + 24 - u * 1.5, gl[2] + Math.cos(yaw) * R], [gl[0], gl[1] + 13, gl[2]], 0.86);
  const turn = rotMat(Math.PI, 0, 0);
  const sc = { ...SKY3.dawn, models: world(false).slice(), points: [], bloom: { strength: 0.6 } };
  const hopG = u > 3.6 ? Math.min(1, (u - 3.6) / 0.4) : 0;
  sc.models.push(
    { model: makeGlider(), pos: gl, id: 24 },
    chr('clawd', { eyes: blinkState(t, 2) || 'happy', mouth: 'open', armR: u > 2.6 ? -10 : -4, armL: u > 2.6 ? -10 : -4 }, [gp[0] + 44, g(gp[0] + 44, gp[1] + 10) + 1, gp[1] + 10], { id: 61, rot: turn }),
    chr('codex', { screen: { mode: 'face', face: u > 2.6 ? 'heart' : 'happy' }, handL: u > 2.6 ? [-2, -12] : [0, 0] }, [gp[0] - 38, g(gp[0] - 38, gp[1] + 6), gp[1] + 6], { id: 62, rot: turn }),
    chr('gemini', { eyes: u > 1.8 ? 'sparkle' : 'happy', mouth: 'big', handR: u > 3.4 ? [2, -14] : [0, 0], handL: u > 3.4 ? [-2, -14] : [0, 0] }, [gl[0], gl[1] + 16 + Math.abs(Math.sin(u * 3)) * hopG * 3, gl[2] + 4], { id: 64, rot: turn }),
    { model: makeLantern3D(), pos: [gp[0] - 26, g(gp[0] - 26, gp[1] + 20), gp[1] + 20], id: 65, scale: 0.6, bright: 0.8 },
  );
  if (u < 2.4) for (let i = 0; i < 26; i++) { const a = hash(i) * Math.PI * 2, r = 20 + hash(i + 5) * 22, k = (u * 0.8 + hash(i + 9)) % 1; sc.points.push({ p: [gl[0] + Math.cos(a) * r, gl[1] + 10 + k * 22, gl[2] + Math.sin(a) * r * 0.5], c: ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#ffffff'][i % 5], size: 1.2, flag: 2, a: 1 - k }); }
  shot3D(f, cam, sc, t);
  label3D(f, cam, [gl[0], gl[1] + 40, gl[2]], 'GEMINI 4 ARGON', '#d8c8ff', phase(u, 1.8, 2.4));
  narr(f.ui, 'К утру Gemini 4 Argon был готов.', t, 8.2, 10.8);
  f.fade = Math.max(f.fade, 1 - phase(t, 6.0, 6.35));
  f.fadeColor = 0xffffffff;
}

export default {
  id: 'build', dur: 11,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    if (t < 6) workshop(f, t); else reveal3D(f, t);
  },
};
