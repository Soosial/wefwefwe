// S1 — Opening (3D): flight over the cloud sea at dawn, past floating islands, to the Summit; voxel title.
import { SKY3, world, chr, shot3D, cam3, camPath, label3D, narr, rotMat } from './world3d.mjs';
import { VoxModel } from '../core/vox.mjs';
import { fonts } from '../core/font.mjs';
import { clamp, phase, ease, hash } from '../core/math.mjs';
import { cached } from '../core/sprite.mjs';

export const SFX = [
  [0.0, 'windSoft', { dur: 15 }],
  [0.3, 'birds', { dur: 9, gain: 0.5 }],
  [4.6, 'whooshSoft', { pitch: 0.8 }],
  [9.2, 'whooshSoft', { pitch: 0.7 }],
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [10.5 + k * 0.1, 'blip', { pitch: 1 + k * 0.07, gain: 0.3 }]),
  [11.6, 'chime', { gain: 0.6 }],
];
export const MUSIC = [
  { t0: 0.2, dur: 15.0, bpm: 72, root: 60, bars: [1, 6, 4, 5], fi: 2.0, fo: 0.8, mel: { inst: 'bell', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 7 . 5 . 2' - - -", oct: 1, vel: 0.5 }, pad: { inst: 'strings', oct: -1, vel: 0.45 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.16, from: 6.6 } },
];

const COLS = [['#ea4335', '#ff8a7a'], ['#fbbc04', '#ffe07a'], ['#34a853', '#7fdc9a'], ['#4285f4', '#9ac0ff']];
function letterModel(ch, k) {
  return cached('title3d', ch + k, () => {
    const g = fonts.press.glyphs[ch], D = 4;
    const M = new VoxModel(g.w + 2, g.h + 2, D);
    const [base, light] = COLS[k % 4];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!g.bits[y][x]) continue;
      const edge = y === 0 || !g.bits[y - 1][x] || x === 0 || !g.bits[y][x - 1];
      for (let z = 0; z < D; z++) M.set(x + 1, g.h - y, z, z === 0 && edge ? light : base);
    }
    M.pivot = [(g.w + 2) / 2, (g.h + 2) / 2, D / 2];
    return M;
  });
}

export default {
  id: 'opening', dur: 15,
  out: { type: 'dither', dur: 0.6 },
  render(f, t) {
    const cp = camPath(t, [
      [0, [-420, -120, -260], [0, -40, -60], 0.9],
      [4.5, [-300, -30, -250], [40, 10, 0], 0.88],
      [8.5, [-150, 50, -230], [20, 30, 0], 0.85],
      [11.5, [20, 110, -150], [60, 110, 1700], 0.85],
      [15, [40, 124, -90], [60, 122, 1700], 0.82],
    ]);
    const cam = cam3(f, cp.pos, cp.target, cp.fov, Math.sin(t * 0.4) * 0.02);
    const sc = { ...SKY3.dawn, models: world(false).slice(), rays: { k: 0.25 * phase(t, 9, 12) }, bloom: { strength: 0.55 }, vig: 0.35 };
    // a few birds gliding past
    sc.points = [];
    for (let i = 0; i < 9; i++) {
      const u = (t * 0.05 + i / 9) % 1;
      const p = [-260 + u * 520, 10 + i * 9 + Math.sin(t * 2 + i) * 3, -320 + i * 35];
      sc.points.push({ p, c: '#2a2440', size: 1.6, flag: 1 }, { p: [p[0] + 2.5, p[1] + (Math.floor(t * 6 + i) % 2 ? 1 : -1), p[2]], c: '#2a2440', size: 1.4, flag: 1 });
    }
    // voxel title, attached to the camera
    if (t > 10.3) {
      const F = cam.f, R = cam.r, U = cam.u, D = 120;
      let k = 0;
      ['COMING', 'SOON'].forEach((ln, row) => {
        [...ln].forEach((ch, i) => {
          const t0 = 10.4 + k * 0.1, u = clamp((t - t0) / 0.8);
          if (u > 0) {
            const e = ease.outBack(u), sc2 = 1.7;
            const lx = (i - (ln.length - 1) / 2) * 9.5 * sc2, ly = (row === 0 ? 2 : -14) * sc2 + (1 - e) * -40 + Math.sin(t * 2.2 + k * 0.6) * 1.2 * phase(t, 12, 13);
            const pos = [cam.pos[0] + F[0] * D + R[0] * lx + U[0] * ly, cam.pos[1] + F[1] * D + R[1] * lx + U[1] * ly, cam.pos[2] + F[2] * D + R[2] * lx + U[2] * ly];
            const yaw = cam.yaw + (1 - e) * 2.4 + (ch === 'O' && row === 1 && i === 2 && t > 12.4 ? (t - 12.4) * 5 : 0);
            sc.models.push({ model: letterModel(ch, k), pos, rot: rotMat(yaw, cam.pitch, 0), scale: sc2, id: 100 + k, shadow: false, bright: 1.1, lightDir: [-F[0] + 0.35 * U[0] + 0.3 * R[0], -F[1] + 0.35 * U[1] + 0.3 * R[1], -F[2] + 0.35 * U[2] + 0.3 * R[2]] });
          }
          k++;
        });
      });
    }
    shot3D(f, cam, sc, t);
    label3D(f, cam, [60, 320, 1700], 'ВЕРШИНА', '#fff2c8', clamp((t - 8.8) / 0.6) * clamp((10.6 - t) / 0.5), { dy: -16 });
    narr(f.ui, 'Высоко над облаками есть Вершина.', t, 1.0, 5.0);
    narr(f.ui, 'Каждый год все летят к ней наперегонки.', t, 5.3, 9.6);
    f.fade = 1 - phase(t, 0, 1.6);
  },
};
