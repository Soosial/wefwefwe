// Scene 2 — Title: voxel 3D "COMING SOON" letters fly in; the second O keeps spinning like a loading icon.
import { Cam3, rotMat, renderVoxels, makeVolume } from '../core/three.mjs';
import { fonts, text } from '../core/font.mjs';
import { hex, mix } from '../core/fb.mjs';
import { skyGradient, stars, milkyWay, SKIES } from '../world/sky.mjs';
import { lantern, sparkle } from '../world/props.mjs';
import { clamp, phase, ease, osc } from '../core/math.mjs';

export const SFX = [
  [0.25, 'whoosh', { pitch: 1.8, gain: 0.35 }],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [0.55 + k * 0.11, 'blip', { pitch: 1 + k * 0.08, gain: 0.35 }]),
  [1.75, 'chime', { gain: 0.6 }],
  [2.6, 'loading', { dur: 2.2 }],
  [4.3, 'whoosh', { pitch: 1.1, gain: 0.5 }],
];

const COLS = [['#ea4335', '#ff7a6b', '#b3261e'], ['#fbbc04', '#ffd95a', '#d08d00'], ['#34a853', '#6fd08a', '#1e7a3a'], ['#4285f4', '#7fb0ff', '#2c5fc7']];
const LINES = ['COMING', 'SOON'];
let LETTERS = null;
function letters() {
  if (LETTERS) return LETTERS;
  LETTERS = [];
  let k = 0;
  LINES.forEach((ln, li) => {
    [...ln].forEach((ch, i) => {
      const g = fonts.press.glyphs[ch];
      const [base, light, dark] = COLS[k % 4];
      const D = 4;
      const V = makeVolume(g.w, g.h, D);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!g.bits[y][x]) continue;
        const edge = y === 0 || !g.bits[y - 1][x] || x === 0 || !g.bits[y][x - 1];
        for (let z = 0; z < D; z++) V.data[x + g.w * (g.h - 1 - y + g.h * z)] = hex(z === 0 ? (edge ? light : base) : z === D - 1 ? dark : base);
      }
      const n = ln.length;
      LETTERS.push({ V, x: (i - (n - 1) / 2) * 9, y: li === 0 ? 6 : -6, k });
      k++;
    });
  });
  return LETTERS;
}

let ZB = null;
export default {
  id: 'title', dur: 5,
  in: { type: 'dither', dur: 0.5 },
  out: { type: 'star', dur: 0.7 },
  render(f, t) {
    const s = f.camera(240, 135, 1);
    skyGradient(s, SKIES.prologue, 22);
    milkyWay(s, { k: 0.7, x: 260 });
    stars(s, t + 20, { count: 360, seed: 4, parallax: 0 });
    // the two lanterns from the prologue, now tiny and far away, still drifting up
    const ly = 230 - t * 26;
    lantern(s, 120 + osc(t, 0.3) * 3, ly, { w: 7, h: 8, paper: '#ff9a4a', lit: 1, t, seed: 1 });
    lantern(s, 372 + osc(t, 0.25, 0.4) * 3, ly + 30, { w: 7, h: 8, paper: '#6f9bff', lit: 1, t, seed: 2 });
    f.light(120, ly - 4, 30, '#ffae60', 0.6);

    const cam = new Cam3({ w: s.w, h: s.h });
    const yawC = 0.22 * Math.sin(t * 0.7) - 0.1, D = 52 - t * 1.2;
    cam.lookAt([Math.sin(yawC) * D, 3 + Math.sin(t * 0.5) * 2, -Math.cos(yawC) * D], [0, 0, 0], 0.95);
    if (!ZB || ZB.length !== s.w * s.h) ZB = new Float32Array(s.w * s.h);
    ZB.fill(Infinity);
    const models = [];
    for (const L of letters()) {
      const t0 = 0.45 + L.k * 0.11;
      const u = clamp((t - t0) / 0.75);
      if (u <= 0) continue;
      const e = ease.outBack(u);
      const wave = t > 2.0 ? Math.sin(t * 3 + L.k * 0.7) * 0.7 * phase(t, 2.0, 2.6) : 0;
      const pos = [L.x, L.y + (1 - e) * 18 + wave, (1 - e) * 70];
      let yaw = (1 - e) * 2.6 + (t > 2 ? Math.sin(t * 2 + L.k) * 0.12 : 0);
      // second O of SOON = "loading" spinner
      if (L.k === 8 && t > 2.4) yaw += (t - 2.4) * 5.5;
      models.push({ vol: L.V, pos, rot: rotMat(yaw, (1 - e) * -0.8, 0), scale: 1, emissive: 0.1 });
    }
    renderVoxels(s, ZB, cam, models, { light: [-0.5, 0.7, -0.8], ambient: 0.5, diffuse: 0.65, rim: '#b9a4ff', rimK: 0.25 });
    // sparkles around the title once it lands
    if (t > 1.7) for (let i = 0; i < 6; i++) {
      const u = (t * 0.7 + i / 6) % 1;
      const a = Math.sin(u * Math.PI);
      sparkle(s, 240 + Math.cos(i * 2.1) * (110 + i * 6), 128 + Math.sin(i * 1.7) * 48, 1 + Math.round(a * 2), ['#ffd95a', '#7fb0ff', '#ff7a6b', '#6fd08a'][i % 4], a);
    }
    const a = phase(t, 2.3, 3.0);
    if (a > 0) {
      text(f.ui, 'пиксельная сказка о первой искре', 240, 206, { align: 'center', color: '#e9e2ff', outline: '#0b0820', alpha: a });
    }
    f.ambient = null;
    f.bloomOpts = { strength: 0.75 };
    f.gradeOpts = { sat: 1.05, contrast: 1.03 };
    f.vig = 0.45;
  },
};
