// S15 — After the credits (3D, night): on a remote island a sleek carbon-black ship stands on a test rig. Floodlights snap on,
// the twin engines fire for a test, then cut out. Close-up: Gemini turns to the camera and winks — "Gemini 4 Carbon. Testing."
// This time "coming soon" is for real.
import { SKY3, chr, shot3D, cam3, label3D, rotMat } from './world3d.mjs';
import { makeIsland, makeTestRig, makeCarbon, makeLantern3D, rockIsland, makeCloudPuff } from '../world/voxworld.mjs';
import { cached } from '../core/sprite.mjs';
import { say } from './common.mjs';
import { text } from '../core/font.mjs';
import { rect, col } from '../core/fb.mjs';
import { clamp, track, phase, hash } from '../core/math.mjs';

const G4 = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
const testIsland = () => cached('island', 'test', () => makeIsland({ seed: 31, r: 74, top: 4, under: 50, head: 70, flat: 0.95, night: true, flowers: 0.01, crystals: 6 }));

export const SFX = [
  [0, 'crickets', { dur: 9, gain: 0.35 }], [0, 'windSoft', { dur: 9, gain: 0.5 }],
  [0.7, 'clink'], [0.9, 'thud', { gain: 0.3 }], [1.1, 'thud', { gain: 0.3 }], [1.3, 'thud', { gain: 0.3 }],
  [1.9, 'powerUp', { dur: 0.8 }], [2.5, 'engine', { dur: 2.0 }], [2.5, 'rocketLaunch', { gain: 0.6 }], [2.6, 'flyWind', { dur: 2.0, gain: 0.7 }],
  [4.5, 'deflate', { pitch: 0.7, gain: 0.4 }], [4.8, 'spray', { dur: 0.8 }],
  [5.8, 'whooshSoft', { pitch: 0.8 }], [6.9, 'wink'], [7.1, 'babble', { who: 'gemini', n: 5 }], [8.0, 'chime', { gain: 0.5 }],
];
export const MUSIC = [
  { t0: 0.2, dur: 2.2, bpm: 80, root: 57, scale: 'minor', bars: [1], fi: 0.8, fo: 0.2, pad: { inst: 'strings', oct: -1, vel: 0.32 }, drums: { k: 'x.......x.......', vel: 0.3 } },
  { t0: 5.8, dur: 3.2, bpm: 100, root: 60, bars: [1, 5], fi: 0.3, fo: 1.0, mel: { inst: 'bell', str: "5 . 3 5 1' - - -", oct: 1, vel: 0.44 }, pad: { inst: 'strings', oct: -1, vel: 0.4 } },
];

export default {
  id: 'carbon', dur: 9,
  in: { type: 'dither', dur: 0.6 },
  render(f, t) {
    const I = testIsland(), gy = I.groundAt(0, 0);
    const lights = t > 0.7 ? (t < 1.5 ? (Math.floor(t * 14) % 2 ? 1 : 0.2) : 1) : 0;
    const fire = phase(t, 2.5, 2.8) * (1 - phase(t, 4.3, 4.6));
    const shake = fire > 0.2 ? (hash(Math.floor(t * 30)) - 0.5) * 1.6 * fire : 0;
    const close = t >= 5.8;
    const gpos = [-50, I.groundAt(-50, -18) + 3, -18];
    const cam = close
      ? cam3(f, [track(t, [[5.8, gpos[0] + 10], [9, gpos[0] + 7]]), gpos[1] + 12, track(t, [[5.8, gpos[2] - 50], [9, gpos[2] - 44]])], [gpos[0] + 9, gpos[1] + 9, gpos[2] + 6], 0.8)
      : cam3(f, [track(t, [[0, 96], [5.8, 58]]) + shake, gy + track(t, [[0, 44], [5.8, 22]]), track(t, [[0, -118], [5.8, -74]])], [0, gy + 12, 0], 0.82);
    // the ship lies along the cradle, nose to -x; the jets fire towards +x
    const yaw = -Math.PI / 2, R = rotMat(yaw, 0, 0);
    const sc = { ...SKY3.night, models: [
      { model: I, pos: [0, 0, 0], id: 2 },
      { model: rockIsland(57, 22, true), pos: [-260, 40, 300], id: 3 },
      { model: rockIsland(73, 30, true), pos: [300, -20, 420], id: 4 },
      { model: makeCloudPuff(3, 14), pos: [160, 60, 200], id: 5, shadow: false },
      { model: makeTestRig(), pos: [0, gy, 0], id: 40, bright: 0.6 + 0.5 * lights },
      { model: makeCarbon(), pos: [0, gy + 9, 0], rot: R, id: 41, bright: 1.15 },
      { model: makeLantern3D(), pos: [-62, I.groundAt(-62, -27), -27], id: 42, scale: 0.6, bright: 0.8 },
    ], points: [], bloom: { strength: 0.7 }, vig: 0.42 };
    // Gemini by the nose; turns and winks at the camera in the close-up
    const wink = t > 6.9 && t < 7.5;
    sc.models.push(chr('gemini', { eyes: close ? 'happy' : t > 2.5 && t < 4.6 ? 'shock' : 'determined', eyeR: wink ? 'closed' : undefined, mouth: close ? (t > 7.1 ? 'cat' : 'smile') : t > 2.5 && t < 4.6 ? 'o' : 'flat', handR: close && t > 6.6 ? [2, -14] : [0, 0] }, gpos, { id: 64, rot: close ? rotMat(-0.15, 0, 0) : rotMat(0.5, 0, 0) }));
    // floodlight cones as soft dust in the air
    if (lights > 0.5) for (let i = 0; i < 70; i++) { const lx = [-26, 0, 26][i % 3], k = hash(i * 3 + 1), y = gy + 50 - k * 46; sc.points.push({ p: [lx + (hash(i) - 0.5) * k * 18, y, 14 + (hash(i * 7) - 0.5) * k * 18], c: '#fff2c8', size: 0.5, flag: 2, a: 0.25 }); }
    // engine test: two blue-white jets out of the back of the ship
    if (fire > 0) {
      const back = [-Math.sin(yaw), 0, -Math.cos(yaw)], side = [Math.cos(yaw), 0, -Math.sin(yaw)];
      for (const ex of [-7, 7]) for (let i = 0; i < 70; i++) {
        const k = hash(i * 13 + Math.floor(t * 30) * 7 + ex), d = 37 + k * 46 * fire, spread = k * 4;
        const p = [side[0] * ex + back[0] * d + (hash(i + 3) - 0.5) * spread, gy + 9 + 8.5 + (hash(i + 5) - 0.5) * spread, side[2] * ex + back[2] * d + (hash(i + 9) - 0.5) * spread];
        sc.points.push({ p, c: k < 0.25 ? '#ffffff' : k < 0.6 ? '#bfe8ff' : '#5ab0ff', size: 2.2 - k, flag: 2, a: 1 - k * 0.6 });
      }
    }
    if (t > 4.6 && t < 6) for (let i = 0; i < 30; i++) { const age = (t - 4.6) * 0.8 + hash(i) * 0.3; sc.points.push({ p: [-Math.sin(yaw) * 44 + (hash(i * 3) - 0.5) * age * 30, gy + 14 + age * 20, -Math.cos(yaw) * 44 + (hash(i * 5) - 0.5) * age * 30], c: '#c8d0e0', size: 3 + age * 3, flag: 1, a: 0.6 - age * 0.4 }); }
    shot3D(f, cam, sc, t);
    if (fire > 0) { f.fadeColor = 0xffd8f0ff; f.fade = Math.max(f.fade, fire * 0.12); }
    if (!close) label3D(f, cam, [0, gy + 34, 0], 'GEMINI 4 CARBON', '#cfe8ff', phase(t, 1.6, 2.2) * clamp((5.6 - t) / 0.3));
    // titles
    const ui = f.ui, a1 = phase(t, 6.0, 6.5), a2 = phase(t, 7.6, 8.1);
    if (close && a1 > 0) {
      rect(ui, 0, 200, 480, 50, col(8, 8, 20, Math.round(150 * a1)));
      text(ui, 'GEMINI 4 CARBON', 240, 208, { align: 'center', font: 'press', scale: 2, color: '#cfe8ff', outline: '#0b0820', alpha: a1 });
      text(ui, 'ИДУТ ИСПЫТАНИЯ', 240, 230, { align: 'center', font: 'press', color: '#ffcf6b', outline: '#0b0820', alpha: a1 });
    }
    if (close && a2 > 0) text(ui, 'COMING SOON  ;)', 240, 24, { align: 'center', font: 'press', scale: 2, colors: G4, outline: '#140f24', alpha: a2 });
    if (close) { const pr = cam.project([gpos[0] + 8, gpos[1] + 20, gpos[2]]); if (pr) say(f, pr[0], pr[1], t, 7.1, 8.7, 'Скоро. На этот раз — правда.', { dir: 1 }); }
    f.fade = Math.max(f.fade, phase(t, 8.4, 9.0));
    f.fadeColor = t > 8 ? 0xff000000 : f.fadeColor;
    if (t >= 5.8 && t < 6.1) f.fade = Math.max(f.fade, (1 - phase(t, 5.8, 6.1)) * 0.8);
  },
};
