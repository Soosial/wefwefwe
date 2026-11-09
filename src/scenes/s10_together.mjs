// Scene 10 — Together. Pixel-3D: the three heroes as voxel figures on a voxel hilltop at dawn, camera orbiting.
// Then the rivals come to laugh again — this time the three stand together and Gemini 4's light blows them away.
import { hillSet, say, skyLights, AMB, STAGE_X, STAGE_Y, gy, blinkAt, clamp, track, osc, hash, phase } from './common.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawWhale, drawKimi, drawZ } from '../chars/rivals.mjs';
import { caption, sparkle, dust } from '../world/props.mjs';
import { skyGradient, stars, cloudSea, farIslands, SKIES } from '../world/sky.mjs';
import { Surface, rect, pset, hex, mix, glow, ring } from '../core/fb.mjs';
import { Cam3, rotMat, renderVoxels, makeVolume, spriteToVoxels } from '../core/three.mjs';
import { hash2, fbm, ease, hop } from '../core/math.mjs';
import { cached } from '../core/sprite.mjs';

export const SFX = [
  [0.0, 'birds', { dur: 6.5 }],
  [0.4, 'whooshSoft', { pitch: 0.9 }],
  [6.5, 'whooshSoft'],
  [7.0, 'whaleSong', { pitch: 1.1 }],
  [7.1, 'stepsSoft', { dur: 1.0, pan: -0.5 }],
  [8.2, 'babble', { who: 'whale', n: 4 }], [8.6, 'laugh', { who: 'kimi', gain: 0.6 }],
  [9.4, 'powerUp', { dur: 0.8 }],
  [10.2, 'blast'],
  [10.35, 'tumble'],
  [10.9, 'babble', { who: 'z', n: 2, pitch: 0.8 }],
  [11.3, 'runAway', { dur: 1.0 }],
  [12.0, 'hop', { pitch: 1.1 }], [12.05, 'hop', { pitch: 1.3 }], [12.1, 'hop', { pitch: 1.5 }],
  [12.2, 'chime'],
];

const dummy = new Surface(1, 1);
function vox(kind, pose, depth) {
  const key = kind + JSON.stringify(pose);
  return cached('vox', key, () => {
    const spr = kind === 'clawd' ? drawClawd(dummy, 0, 0, { ...pose, shadow: false }) : kind === 'codex' ? drawCodex(dummy, 0, 0, { ...pose, shadow: false }) : drawGemini(dummy, 0, 0, { ...pose, hover: 0, shadow: false });
    const V = spriteToVoxels(spr, depth, 3);
    V.ay = spr.ay; V.sh = spr.h;
    return V;
  });
}
let MOUND = null;
function mound() {
  if (MOUND) return MOUND;
  const w = 150, h = 12, d = 90;
  const V = makeVolume(w, h, d);
  const grass = ['#4a9a4e', '#5fb35a', '#7cc85d', '#a7e07a'].map(hex), dirt = ['#5c3f2a', '#7a5638'].map(hex);
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    const nx = (x - w / 2) / (w / 2), nz = (z - d / 2) / (d / 2);
    const r = Math.hypot(nx, nz);
    if (r > 1) continue;
    const top = Math.round((h - 1) * (1 - r * r) * 0.6 + 4 + fbm(x / 9, z / 9, 2, 3) * 2);
    for (let y = 0; y <= top && y < h; y++) {
      let c = y === top ? grass[Math.floor(hash2(x, z, 1) * 4)] : y > top - 2 ? grass[0] : dirt[(x + z + y) % 2];
      if (y === top && hash2(x, z, 2) < 0.025) c = hex(['#ff8fb0', '#ffe066', '#ffffff', '#9fd0ff'][Math.floor(hash2(x, z, 3) * 4)]);
      V.data[x + w * (y + h * z)] = c;
    }
  }
  V.topY = (x, z) => 0;
  MOUND = V;
  return V;
}

let ZB = null;
function voxelShot(f, t) {
  const s = f.camera(240, 135, 1);
  const u = phase(t, 0, 6.5);
  const yaw = -0.7 + 1.2 * ease.inOutSine(u);
  skyGradient(s, SKIES.dawn, 24);
  // the sun rising behind the group
  const sunY = 150 - u * 30;
  glow(s, 300 - yaw * 120, sunY, 160, '#ffcf8a', 0.5, 7);
  glow(s, 300 - yaw * 120, sunY, 30, '#fff4d0', 0.4, 6);
  s.with({ dx: Math.round(yaw * 160) }, () => farIslands(s, t, { parallax: 0, top: '#9a7aa8', body: '#7a5a90', dark: '#5e4478', fall: '#ffe2c0', items: [[40, 150, 30], [180, 128, 18], [420, 160, 36], [560, 140, 24]] }));
  cloudSea(s, t, { y: 168, parallax: 0, speed: 4 + yaw * 0, seed: 5, h: 102, colors: ['#c98aa0', '#e0a8b0', '#f4c8b8', '#fff0d8'], fill: '#c98aa0' });
  if (!ZB || ZB.length !== s.w * s.h) ZB = new Float32Array(s.w * s.h);
  ZB.fill(Infinity);
  const R = 205, camH = 50;
  const cam = new Cam3({ w: s.w, h: s.h });
  cam.lookAt([Math.sin(yaw) * R, camH, -Math.cos(yaw) * R], [0, 30, 0], 0.62);
  const wave = Math.floor(t * 4) % 2;
  const bob = Math.floor(t * 2) % 2;
  const models = [{ vol: mound(), pos: [0, -6, 6], rot: rotMat(0, 0, 0), scale: 1 }];
  const cl = vox('clawd', { eyes: blinkAt(t, 2) ? 'blink' : 'happy', mouth: 'open', armR: wave ? -12 : -6, bob }, 12);
  const cd = vox('codex', { screen: { mode: 'face', face: t > 3.5 ? 'heart' : 'happy' }, handL: wave ? [-2, -14] : [0, -8], bob }, 10);
  const gm = vox('gemini', { eyes: 'happy', mouth: 'smile', sharp: 0.62, core: 5, handL: [-1, -8], handR: [1, -8] }, 8);
  const place = (V, x, z, lift = 0) => ({ vol: V, pos: [x, V.ay - V.h / 2 + lift, z], rot: rotMat(0, 0, 0), scale: 1 });
  models.push(place(cl, -48, 4), place(cd, 50, 6), { ...place(gm, 0, -4, 12 + Math.sin(t * 2.2) * 3), emissive: 0.08 });
  renderVoxels(s, ZB, cam, models, { light: [0.5, 0.6, -0.6], ambient: 0.55, diffuse: 0.6, rim: '#ffd8a8', rimK: 0.5 });
  // sparkles
  for (let i = 0; i < 5; i++) { const k = (t * 0.6 + i / 5) % 1; sparkle(s, 120 + i * 60 + Math.sin(i) * 20, 60 + Math.cos(i * 2) * 20 + k * 10, 1 + Math.round(Math.sin(k * Math.PI) * 2), '#fff4d0', Math.sin(k * Math.PI)); }
  caption(f.ui, 'С тех пор они всегда были вместе.', t, 0.6, 6.2);
  f.ambient = null;
  f.bloomOpts = { strength: 0.55, all: true, threshold: 0.8 };
  f.gradeOpts = { sat: 1.05, contrast: 1.03 };
  f.vig = 0.35;
  f.fade = phase(t, 6.2, 6.5);
}

function standoff(f, t) {
  const shake = t > 10.2 && t < 10.6 ? Math.round(Math.sin(t * 70) * 2) : 0;
  const s = f.camera(470 + shake, track(t, [[6.5, 128], [13, 132]]), track(t, [[6.5, 1.1], [9.4, 1.18, 'inOutSine'], [10.2, 1.1, 'outQuad'], [13, 1.12]]));
  f.ambient = AMB.dawn;
  hillSet(f, s, t, { sky: 'dawn', starCount: 0, milky: 0, signFront: 'ВМЕСТЕ', cloudCols: ['#c98aa0', '#e0a8b0', '#f4c8b8', '#fff0d8'], cloudFill: '#c98aa0', cloudCols2: ['#b87896', '#d896a8', '#ecb8b4', '#ffe6d0'], farCol: ['#8a6a9a', '#a888b0'], islandTop: '#9a7aa8', islandBody: '#7a5a90', islandDark: '#5e4478', fall: '#ffe2c0', villageLights: 0 });
  glow(s, 200, 150, 120, '#ffcf8a', 0.35, 7);
  f.light(240, 60, 400, '#ffe0b0', 0.3);
  const blast = phase(t, 10.2, 10.7, 'outCubic');
  const fx = t > 10.2;
  // rivals
  const kX = track(t, [[7.0, 300], [8.0, 384, 'outQuad'], [10.2, 384], [10.7, 340, 'outCubic'], [11.3, 340], [12.6, 250, 'inQuad']]);
  const zX = track(t, [[7.0, 270], [8.2, 404, 'outQuad'], [10.2, 404], [10.7, 360, 'outCubic'], [11.4, 360], [12.6, 260, 'inQuad']]);
  const wX = track(t, [[7.0, 680], [8.2, 576, 'outQuad'], [10.2, 576], [10.7, 630, 'outCubic'], [11.3, 630], [12.8, 720, 'inQuad']]);
  const wY = track(t, [[7.0, 80], [8.2, 112, 'outQuad'], [10.2, 112], [10.7, 90, 'outCubic'], [12.8, 40, 'inQuad']]) + Math.round(osc(t, 0.5) * 2);
  const laugh = t > 8.2 && t < 9.6;
  const scared = t > 10.2;
  drawKimi(s, kX, gy(kX) - (laugh ? Math.abs(Math.round(Math.sin(t * 16) * 2)) : 0), { eyes: scared ? 'shock' : laugh ? 'laugh' : 'open', mouth: scared ? 'o' : laugh ? 'big' : 'smile', shadowY: gy(kX) + 1, shadowW: 26 });
  drawZ(s, zX, gy(zX), { eyes: scared ? 'shock' : laugh ? 'happy' : 'open', mouth: scared ? 'wobble' : 'smile', handL: scared ? [-2, -10] : [0, 0], handR: scared ? [2, -10] : [0, 0], shadowY: gy(zX) + 1, shadowW: 24 });
  drawWhale(s, wX, wY, { eyes: scared ? 'shock' : laugh ? 'laugh' : 'open', mouth: laugh ? 'laugh' : scared ? 'open' : 'smile', tail: Math.sin(t * (scared ? 14 : 3)), flip: true });
  if (fx) { dust(s, t, 10.25, kX + 10, gy(kX), { dir: 1, n: 5 }); dust(s, t, 10.3, zX + 10, gy(zX), { dir: 1, n: 5 }); }
  // the three
  const gx = track(t, [[9.4, 472], [10.0, 478, 'outQuad'], [11.5, 478], [12.0, 472]]);
  const power = t > 9.4 && t < 10.9;
  const ready = t > 9.3;
  const cele = t > 12.0;
  const jh = (k) => (cele ? hop(t, 12.0 + k * 0.05, 0.45, 10) + hop(t, 12.5 + k * 0.05, 0.45, 8) : 0);
  drawClawd(s, 436, STAGE_Y - jh(0), { eyes: cele ? 'happy' : ready ? 'angry' : 'open', mouth: cele ? 'big' : ready ? 'flat' : 'smile', armL: ready && !cele ? -10 : cele ? -12 : 0, armR: ready && !cele ? -10 : cele ? -12 : 0, shadowY: STAGE_Y + 1, shadowW: 38 });
  drawCodex(s, 512, STAGE_Y - jh(2), { screen: cele ? { mode: 'text', lines: ['GG'] } : ready ? { mode: 'face', face: 'angry' } : { mode: 'face', face: 'eyes' }, handL: ready ? [-2, -12] : [0, 0], handR: ready ? [2, -12] : [0, 0], shadowY: STAGE_Y + 1, shadowW: 34 });
  drawGemini(s, gx, STAGE_Y - jh(1), { hover: 5 + osc(t, 0.8) * 1.5, eyes: cele ? 'happy' : ready ? 'angry' : 'open', mouth: cele ? 'big' : ready ? 'flat' : 'smile', sharp: power ? 0.56 : 0.62, core: power ? 7 : 4, handL: power ? [-2, -14] : [0, 0], handR: power ? [2, -14] : [0, 0], shadowY: STAGE_Y + 1, shadowW: 24 });
  if (power) { glow(s, gx, STAGE_Y - 34, 40 + 20 * Math.sin(t * 20), '#d8c8ff', 0.6, 6); f.light(gx, STAGE_Y - 34, 120, '#e8dcff', 0.9); }
  if (blast > 0 && blast < 1) {
    ring(s, gx, STAGE_Y - 34, 10 + blast * 240, '#ffffff', 3, 1 - blast);
    ring(s, gx, STAGE_Y - 34, 6 + blast * 170, '#d8c8ff', 2, 1 - blast);
    if (blast < 0.25) { f.fadeColor = 0xfff4ecff; f.fade = (0.25 - blast) * 2.4; }
  }
  if (cele) for (let i = 0; i < 6; i++) sparkle(s, 440 + i * 14, STAGE_Y - 70 + Math.sin(t * 5 + i) * 6, 1 + (i % 2), ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][i % 4], 1);
  say(f, wX - 26, wY - 40, t, 8.2, 9.6, 'Ха! Опять ты?', { dir: -1 });
  say(f, zX, gy(zX) - 38, t, 10.9, 12.0, '...ой.', { dir: 1 });
  caption(f.ui, 'Вместе они были сильнее любых насмешек.', t, 11.6, 13);
  f.bloomOpts = { strength: 0.55 };
  f.gradeOpts = { sat: 1.06, contrast: 1.03 };
  f.vig = 0.3;
  if (t < 6.8) f.fade = Math.max(f.fade, 1 - phase(t, 6.5, 6.8));
}

export default {
  id: 'together', dur: 13,
  in: { type: 'star', dur: 0.8 },
  render(f, t) {
    if (t < 6.5) voxelShot(f, t);
    else standoff(f, t);
  },
};
