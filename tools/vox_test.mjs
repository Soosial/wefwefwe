// 3D look-dev: renders a few camera views of the voxel world into out/vox.png (2x2 tiles at 480x270).
import { Surface } from '../src/core/fb.mjs';
import { savePNG } from '../src/core/png.mjs';
import { bloom, grade, vignette } from '../src/core/post.mjs';
import { render3D, lookCam, rotMat } from '../src/core/vox.mjs';
import { launchIsland, grovIsland, forestIsland, meadowIsland, rockIsland, makeSummit, makeCloudPuff, makeBalloon, makeRocket, makeGlider, makePlane, makeCrescent, makeCrate, charVox, LAUNCH } from '../src/world/voxworld.mjs';
import { drawClawd } from '../src/chars/clawd.mjs';
import { drawCodex } from '../src/chars/codex.mjs';
import { drawGemini } from '../src/chars/gemini.mjs';

const T0 = Date.now();
const DAY = {
  sky: { stops: [[0, '#3f6fd0'], [0.55, '#7fb2ee'], [0.85, '#c8e2ff'], [1, '#fff0d8']], sun: [0.45, 0.55, -0.7], sunColor: '#fff8e0', glow: '#ffe2a8', glowK: 0.45 },
  light: { sun: [0.45, 0.55, -0.7], sunColor: '#fff2d8', sunK: 0.75, amb: '#bcd2ff', ambK: 0.55, gnd: '#8a7a6a', gndK: 0.4, fogNear: 220, fogFar: 1400, fogMax: 0.85 },
  clouds: { y: -150, colors: ['#9aa8d8', '#b8c4ea', '#d4ddf6', '#eef2ff', '#ffffff'], scale: 0.3, speed: 4, fogNear: 300, fogFar: 1600 },
};
const L = LAUNCH, CH = 0.4;
const isl = launchIsland(false);
const g = (dx, dz) => isl.groundAt(dx, dz);
const models = [
  { model: isl, pos: [0, 0, 0], id: 2 },
  { model: grovIsland(false), pos: [-200, 40, 160], id: 3 },
  { model: forestIsland(false), pos: [-150, -30, -210], id: 4 },
  { model: meadowIsland(false), pos: [240, -20, -80], id: 5 },
  { model: rockIsland(41, 26, false), pos: [190, 70, 220], id: 6 },
  { model: makeSummit(false), pos: [60, -220, 1500], scale: 3, id: 7, fog: 0.45 },
  { model: makeCloudPuff(1, 16), pos: [-90, 60, -120], id: 8, shadow: false },
  { model: makeCloudPuff(2, 20), pos: [140, 90, 60], id: 9, shadow: false },
  { model: makeCrate(2), pos: [L.pads.gemini[0] + 8, g(L.pads.gemini[0] + 8, L.pads.gemini[1] + 6), L.pads.gemini[1] + 6], id: 10, scale: 0.75 },
  { model: makeBalloon(), pos: [L.pads.clawd[0], g(...L.pads.clawd), L.pads.clawd[1]], id: 11 },
  { model: makeRocket(), pos: [L.pads.codex[0], g(...L.pads.codex), L.pads.codex[1] + 6], id: 12 },
  { model: charVox('clawd', drawClawd, { eyes: 'happy', mouth: 'open', armR: -8 }), pos: [L.pads.clawd[0], g(...L.pads.clawd) + 2, L.pads.clawd[1]], scale: CH, id: 13, shadow: false },
  { model: charVox('codex', drawCodex, { screen: { mode: 'face', face: 'happy' } }), pos: [L.pads.codex[0], g(...L.pads.codex) + 36, L.pads.codex[1] + 2], scale: CH, id: 14, shadow: false },
  { model: charVox('gemini', drawGemini, { eyes: 'open', mouth: 'smile' }, { depth: 10 }), pos: [L.pads.gemini[0] - 6, g(...L.pads.gemini) + 3, L.pads.gemini[1] - 4], scale: CH, id: 15, shadow: false },
  { model: makeGlider(), pos: [-40, 70, -120], rot: rotMat(0.6, -0.1, 0.15), id: 16 },
  { model: makePlane(), pos: [44, 30, -60], rot: rotMat(-0.5, 0.2, 0), id: 17 },
  { model: makeCrescent(), pos: [90, 50, -90], rot: rotMat(-0.3, 0, 0), id: 18 },
];
const blobs = [{ p: [L.pads.gemini[0] - 6, g(...L.pads.gemini) + 3, L.pads.gemini[1] - 4], r: 6, id: 15 }];
const views = [
  [[-160, 120, -300], [0, 20, 0], 0.9],
  [[60, 40, -110], [10, 20, -20], 0.8],
  [[0, 30, -240], [40, 90, 1400], 0.9],
  [[30, 22, -75], [24, 14, -24], 0.7],
];
const W = 480, H = 270, sheet = new Uint32Array(W * 2 * H * 2);
views.forEach(([pos, tgt, fov], vi) => {
  const s = new Surface(W, H);
  const cam = lookCam(W, H, pos, tgt, fov);
  const t1 = Date.now();
  render3D(s, cam, { ...DAY, models, blobs, rays: vi === 2 ? { k: 0.4 } : null }, 1.0);
  bloom(s, { strength: 0.6 });
  grade(s, { sat: 1.05, contrast: 1.04 });
  vignette(s, 0.25);
  console.log('view', vi, Date.now() - t1, 'ms');
  const ox = (vi % 2) * W, oy = Math.floor(vi / 2) * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sheet[(oy + y) * W * 2 + ox + x] = s.d[y * W + x] | 0xff000000;
});
savePNG('out/vox.png', W * 2, H * 2, sheet);
console.log('total', Date.now() - T0, 'ms');
