// S6 — Alone in the rain: 3D wide shot of the grey island, then the puddle remembers him as last year's
// champion surrounded by a crowd; a tear breaks the picture and only the grey reflection is left.
import { fieldSet, fy, PADS, crate2D } from '../world/field.mjs';
import { SKY3, world, chr, shot3D, cam3, camPath, narr, chapter, groundAt, LAUNCH } from './world3d.mjs';
import { makeCrate } from '../world/voxworld.mjs';
import { puddleTopDown, memA, memB } from '../world/puddle.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawUser } from '../chars/rivals.mjs';
import { rain, splashes, sparkle } from '../world/props.mjs';
import { rect, pset, glow, hex } from '../core/fb.mjs';
import { clamp, track, phase, hash, noise2 } from '../core/math.mjs';

export const SFX = [
  [0, 'rain', { dur: 16, gain: 0.9, fadeOut: 1.2 }],
  [1.5, 'thunder', { gain: 0.7 }],
  [7.4, 'whooshSoft', { pitch: 0.7 }], [8.3, 'shimmer', { dur: 2.0 }], [8.5, 'crowdMemory', { dur: 2.3 }],
  [10.9, 'drip'], [11.0, 'rippleSwell'], [13.6, 'sniff'],
];
export const MUSIC = [
  { t0: 0.5, dur: 15.4, bpm: 60, root: 57, scale: 'minor', bars: [1, 6, 3, 7], fi: 1.2, fo: 1.4, mel: { inst: 'piano', str: '3 . . 2 1 . . . 1 . . 7, 6, . . . 5, . 6, 7, 1 . 2 . 3 - - - . . . .', oct: 1, vel: 0.42 }, pad: { inst: 'strings', oct: -1, vel: 0.3 } },
  { t0: 8.2, dur: 2.8, bpm: 72, root: 60, bars: [1], fi: 0.5, fo: 0.5, mel: { inst: 'bell', str: "5 . 3 5 1' . 7 6", oct: 1, vel: 0.22 } },
];

function champMemory(t) {
  memA.d.fill(0); memB.d.fill(0);
  drawGemini(memA, 100, 118, { scale: 2, hover: 0, sat: 0.08, sharp: 0.84, R: 24, eyes: 'sad', brow: 'sad', mouth: 'frown', shadow: false });
  for (let i = 0; i < 11; i++) drawUser(memB, 8 + i * 18 + (i % 2) * 4, 128 - (i % 2) * 6 - Math.abs(Math.round(Math.sin(t * 9 + i) * 3)), { seed: i + 3, eyes: 'happy', shadow: false });
  drawGemini(memB, 100, 108, { scale: 2, hover: 0, eyes: 'happy', mouth: 'big', handL: [-1, -12], handR: [1, -12], sharp: 0.62, shadow: false });
  memB.flag = 2;
  // golden crown + trophy
  rect(memB, 88, 6, 25, 8, '#ffcf3a'); for (const x of [88, 99, 110]) rect(memB, x, 1, 3, 6, '#ffcf3a'); rect(memB, 99, 8, 3, 3, '#ea4335');
  for (let i = 0; i < 26; i++) { const x = hash(i) * 200, y = (hash(i + 9) * 120 + t * 40) % 120; pset(memB, x, y, ['#ea4335', '#fbbc04', '#34a853', '#4285f4', '#ffffff'][i % 5]); }
  memB.flag = 1;
}

export default {
  id: 'rain', dur: 16,
  in: { type: 'dither', dur: 0.5 },
  render(f, t) {
    if (t < 4.5) {
      const L = LAUNCH, g = (x, z) => groundAt(x, z);
      const gpos = [L.pads.gemini[0] - 4, g(...L.pads.gemini) + 1, L.pads.gemini[1] - 4];
      const cp = camPath(t, [[0, [-120, 70, -260], [20, 10, -20], 0.8], [4.5, [10, 26, -110], [26, 8, -26], 0.75]]);
      const cam = cam3(f, cp.pos, cp.target, cp.fov);
      const sc = { ...SKY3.rain, models: world(false).slice(), points: [], grade: { sat: 0.45, contrast: 1.05, tint: [0.92, 0.97, 1.08] }, bloom: { strength: 0.3 }, vig: 0.5 };
      sc.models.push({ model: makeCrate(3), pos: [L.pads.gemini[0] + 10, g(...L.pads.gemini), L.pads.gemini[1] + 8], scale: 0.7, id: 22 },
        chr('gemini', { eyes: 'sad', brow: 'sad', mouth: 'frown', sat: 0.1, sy: 0.9, sharp: 0.84, R: 24, handL: [4, 3], handR: [-4, 3] }, gpos, { id: 64, sat: 0.15 }));
      for (let i = 0; i < 420; i++) {
        const k = (hash(i * 3) + t * 1.6) % 1;
        const p = [cp.pos[0] - 100 + hash(i) * 260, cp.pos[1] + 60 - k * 140, cp.pos[2] + 20 + hash(i * 7) * 200];
        sc.points.push({ p, c: '#9fb0d8', size: 0.6, flag: 1, a: 0.7 }, { p: [p[0] + 0.3, p[1] + 1.6, p[2]], c: '#9fb0d8', size: 0.6, flag: 1, a: 0.5 });
      }
      shot3D(f, cam, sc, t);
      if (t > 1.5 && t < 1.8) { f.fadeColor = 0xffe8f0ff; f.fade = (1 - (t - 1.5) / 0.3) * 0.5; }
      chapter(f.ui, t, 0.3, 3.6, 3, 'ОДИН');
      narr(f.ui, 'Когда ты первый — вокруг толпа.', t, 0.8, 4.4);
      return;
    }
    if (t >= 7.5 && t < 13) {
      const s = f.camera(240, 135, 1);
      puddleTopDown(f, s, t - 7.5 + 5.5, champMemory);
      rain(s, t, { n: 90, speed: 120, slant: 0, len: 2, c: '#9fb0d8', alpha: 0.35 });
      f.ambient = null;
      f.bloomOpts = { strength: 0.8 };
      f.gradeOpts = { sat: 0.95, contrast: 1.05 };
      f.vig = 0.55;
      f.fade = Math.max(1 - phase(t, 7.5, 7.9), phase(t, 12.6, 13)) * 0.9;
      narr(f.ui, 'Когда ты первый — вокруг толпа...', t, 8.4, 10.8);
      narr(f.ui, '...а когда отстаёшь — никого.', t, 11.2, 12.9);
      return;
    }
    const close = t >= 13;
    const s = f.camera(close ? 548 : track(t, [[4.5, 556], [7.5, 550]]), close ? fy(548) - 26 : track(t, [[4.5, 176], [7.5, 186]]), close ? track(t, [[13, 3.0], [16, 3.3]]) : track(t, [[4.5, 2.2], [7.5, 2.6]]));
    fieldSet(f, s, t, { tod: 'rain', bunting: false, flowers: 0.02, wind: 2 });
    const G = (x) => fy(x);
    crate2D(s, t, PADS.gemini + 26, G(PADS.gemini + 26) + 1, 3, { tag: false });
    const gx = 548, gG = G(gx);
    drawGemini(s, gx, gG, { hover: 0.5, sat: 0.1, sharp: 0.84, R: 24, sy: 0.92, sx: 1.04, eyes: close ? (t > 14.4 && t < 14.9 ? 'blink' : 'teary') : 'sad', brow: 'sad', mouth: 'frown', tears: close ? 1 : 0.6, lookY: 1, handL: [4, 3], handR: [-4, 3], shadowY: gG + 1, shadowW: 22 });
    if (close) {
      const fl = 0.5 + 0.3 * noise2(t * 3, 1, 2) + 0.3 * phase(t, 14.6, 15.4);
      const ex = gx, ey = gG - 15;
      sparkle(s, ex, ey, fl > 0.6 ? 2 : 1, ['#ea4335', '#fbbc04', '#34a853', '#4285f4'][Math.floor(t * 5) % 4], clamp(fl));
      glow(s, ex, ey, 14, '#fff0c8', 0.5 * fl, 5);
      f.light(ex, ey, 30, '#fff0c8', 0.9 * fl);
      narr(f.ui, 'Но где-то внутри ещё теплилась искра.', t, 13.4, 15.9);
    }
    rain(s, t, { n: close ? 160 : 320, speed: 300, slant: 0.22, len: close ? 4 : 6, c: '#9fb0d8', alpha: 0.5 });
    splashes(s, t, fy, { n: 30, c: '#9fb0d8' });
    f.bloomOpts = { strength: 0.55 };
    f.gradeOpts = { sat: 0.5, contrast: 1.06, tint: [0.92, 0.97, 1.08] };
    f.vig = 0.5;
    if (t > 7.1 && t < 7.5) f.fade = phase(t, 7.1, 7.5) * 0.9;
    if (t >= 13 && t < 13.4) f.fade = (1 - phase(t, 13, 13.4)) * 0.9;
    f.fade = Math.max(f.fade, phase(t, 15.5, 16) * 0.6);
  },
};
