// Shared helpers for 3D shots (sky presets, world layout, voxel characters, labels, camera paths) and UI cards.
import { render3D, lookCam, rotMat, Cam3 } from '../core/vox.mjs';
import { launchIsland, grovIsland, forestIsland, meadowIsland, rockIsland, makeSummit, makeCloudPuff, charVox, LAUNCH } from '../world/voxworld.mjs';
import { drawClawd } from '../chars/clawd.mjs';
import { drawCodex } from '../chars/codex.mjs';
import { drawGemini } from '../chars/gemini.mjs';
import { drawQwen } from '../chars/qwen.mjs';
import { drawWhale, drawKimi } from '../chars/rivals.mjs';
import { text, textWidth } from '../core/font.mjs';
import { rect, hex, mix, cr, cg, cb, col } from '../core/fb.mjs';
import { clamp, track, ease } from '../core/math.mjs';

export { rotMat, lookCam, LAUNCH };
const N5 = (st) => { // resample stops to 5 evenly spaced entries so presets can be blended
  const out = [];
  for (let k = 0; k < 5; k++) {
    const t = k / 4;
    let i = 0;
    while (i < st.length - 2 && t > st[i + 1][0]) i++;
    const a = st[i], b = st[i + 1];
    out.push([t, mix(a[1], b[1], clamp((t - a[0]) / (b[0] - a[0] || 1)))]);
  }
  return out;
};
export const SKY3 = {
  dawn: {
    sky: { stops: N5([[0, '#22356e'], [0.4, '#5a5aa6'], [0.7, '#d88aa0'], [0.88, '#f8b07e'], [1, '#ffd89a']]), sun: [0.15, 0.1, 1], sunColor: '#fff2d0', glow: '#ffb070', glowK: 0.55, glowPow: 9, stars: 0.25 },
    light: { sun: [0.55, 0.35, 0.75], sunColor: '#ffd2a8', sunK: 0.85, amb: '#9aa0d8', ambK: 0.6, gnd: '#a07a80', gndK: 0.42, fogNear: 320, fogFar: 2000, fogMax: 0.7 },
    clouds: { y: -170, colors: ['#8a6a9a', '#b48aa8', '#dca8b0', '#f4c8b8', '#fff0d8'], scale: 0.3, speed: 3 },
  },
  day: {
    sky: { stops: N5([[0, '#3a68cc'], [0.55, '#7fb2ee'], [0.85, '#c8e2ff'], [1, '#fff0d8']]), sun: [0.45, 0.6, -0.65], sunColor: '#fff8e0', glow: '#ffe2a8', glowK: 0.4 },
    light: { sun: [0.45, 0.6, -0.65], sunColor: '#fff2d8', sunK: 0.78, amb: '#bcd2ff', ambK: 0.56, gnd: '#8a7a6a', gndK: 0.4, fogNear: 280, fogFar: 1600, fogMax: 0.8 },
    clouds: { y: -170, colors: ['#8392cc', '#a6b4e4', '#c8d4f4', '#e8eeff', '#ffffff'], scale: 0.3, speed: 4 },
  },
  sunset: {
    sky: { stops: N5([[0, '#2a2a6a'], [0.45, '#7a4a9a'], [0.75, '#e0708a'], [0.9, '#ffa860'], [1, '#ffd890']]), sun: [-0.75, 0.08, 0.65], sunColor: '#fff0c0', glow: '#ff9a50', glowK: 0.9, glowPow: 4, stars: 0.15 },
    light: { sun: [-0.75, 0.22, 0.6], sunColor: '#ffb070', sunK: 0.9, amb: '#8a6ab0', ambK: 0.55, gnd: '#a06a6a', gndK: 0.42, fogNear: 240, fogFar: 1500, fogMax: 0.8 },
    clouds: { y: -170, colors: ['#6a4a7a', '#a0608a', '#d8889a', '#f4b8a0', '#ffd8b8'], scale: 0.3, speed: 3 },
  },
  night: {
    sky: { stops: N5([[0, '#070a24'], [0.45, '#151a4a'], [0.8, '#2d2462'], [1, '#4a2f6e']]), sun: [0.35, 0.45, 0.8], sunColor: '#eef0ff', sunSize: 0.022, glow: '#6a6ad0', glowK: 0.35, stars: 1 },
    light: { sun: [0.35, 0.55, -0.6], sunColor: '#9aa8ff', sunK: 0.5, amb: '#5a64b0', ambK: 0.55, gnd: '#2a2440', gndK: 0.4, fogNear: 220, fogFar: 1400, fogMax: 0.85 },
    clouds: { y: -170, colors: ['#1a1a40', '#262a5a', '#343a72', '#4a5290', '#6a72b0'], scale: 0.3, speed: 3 },
  },
  rain: {
    sky: { stops: N5([[0, '#0b0f1c'], [0.5, '#161d30'], [1, '#2e364a']]), sun: [0.3, 0.6, -0.5], sunSize: 0, glow: '#2e364a', glowK: 0 },
    light: { sun: [0.3, 0.7, -0.5], sunColor: '#8a96b8', sunK: 0.3, amb: '#6a7490', ambK: 0.55, gnd: '#2a2c38', gndK: 0.4, fogNear: 120, fogFar: 900, fogMax: 0.9, shadows: false },
    clouds: { y: -170, colors: ['#1a2030', '#252d42', '#323c56', '#465070', '#5a6480'], scale: 0.3, speed: 6 },
  },
};
// blend two presets (same structure) by k
export function blendSky(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const lerp3 = (u, v) => [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k, u[2] + (v[2] - u[2]) * k];
  const mc = (u, v) => mix(hex(u), hex(v), k);
  return {
    sky: { ...a.sky, stops: a.sky.stops.map(([t, c], i) => [t, mc(c, b.sky.stops[i][1])]), sun: lerp3(a.sky.sun, b.sky.sun), sunColor: mc(a.sky.sunColor ?? '#fff4d8', b.sky.sunColor ?? '#fff4d8'), glow: mc(a.sky.glow, b.sky.glow), glowK: a.sky.glowK + (b.sky.glowK - a.sky.glowK) * k, stars: (a.sky.stars ?? 0) + ((b.sky.stars ?? 0) - (a.sky.stars ?? 0)) * k, sunSize: (a.sky.sunSize ?? 0.03) + ((b.sky.sunSize ?? 0.03) - (a.sky.sunSize ?? 0.03)) * k },
    light: { ...a.light, sun: lerp3(a.light.sun, b.light.sun), sunColor: mc(a.light.sunColor, b.light.sunColor), sunK: a.light.sunK + (b.light.sunK - a.light.sunK) * k, amb: mc(a.light.amb, b.light.amb), ambK: a.light.ambK + (b.light.ambK - a.light.ambK) * k, gnd: mc(a.light.gnd, b.light.gnd) },
    clouds: { ...a.clouds, colors: a.clouds.colors.map((c, i) => mc(c, b.clouds.colors[i])) },
  };
}

// the shared world (positions stay consistent between shots)
export function world(night = false, o = {}) {
  const list = [
    { model: launchIsland(night), pos: [0, 0, 0], id: 2 },
    { model: grovIsland(night), pos: [-230, 40, 190], id: 3 },
    { model: forestIsland(night), pos: [-180, -40, -240], id: 4 },
    { model: meadowIsland(night), pos: [270, -24, -100], id: 5 },
    { model: rockIsland(41, 26, night), pos: [210, 70, 240], id: 6 },
    { model: rockIsland(57, 22, night), pos: [-320, 96, -30], id: 7 },
    { model: rockIsland(73, 30, night), pos: [120, 130, 460], id: 8 },
    { model: rockIsland(91, 24, night), pos: [-160, 150, 560], id: 9 },
    { model: makeSummit(night), pos: [60, -280, 1700], scale: 3, id: 10, fog: 0.42 },
    { model: makeCloudPuff(1, 16), pos: [-100, 70, -150], id: 11, shadow: false },
    { model: makeCloudPuff(2, 20), pos: [150, 110, 80], id: 12, shadow: false },
    { model: makeCloudPuff(3, 14), pos: [-60, 20, 320], id: 13, shadow: false },
    { model: makeCloudPuff(4, 22), pos: [330, 60, 300], id: 14, shadow: false },
    { model: makeCloudPuff(5, 18), pos: [-260, 10, -330], id: 15, shadow: false },
  ];
  return o.skip ? list.filter((m) => !o.skip.includes(m.id)) : list;
}
export const groundAt = (dx, dz, night = false) => launchIsland(night).groundAt(dx, dz);

const DRAW = { clawd: drawClawd, codex: drawCodex, gemini: drawGemini, qwen: drawQwen, whale: drawWhale, kimi: drawKimi };
const DEPTH = { clawd: 16, codex: 14, gemini: 10, qwen: 12, whale: 22, kimi: 14 };
export const CH = 0.4;
// voxel character instance; pos = feet position in world units
export function chr(name, pose, pos, o = {}) {
  const model = charVox(name, DRAW[name], pose, { depth: o.depth ?? DEPTH[name], flip: o.flip });
  return { model, pos, scale: o.scale ?? CH, rot: o.rot, id: o.id ?? 60, shadow: false, sat: o.sat, alpha: o.alpha, flash: o.flash, bright: o.bright };
}

export function shot3D(f, cam, sc, t) {
  const s = f.camera(240, 135, 1);
  render3D(s, cam, sc, t);
  f.ambient = null;
  f.bloomOpts = sc.bloom ?? { strength: 0.6 };
  f.gradeOpts = sc.grade ?? { sat: 1.05, contrast: 1.04 };
  f.vig = sc.vig ?? 0.3;
  return s;
}
export function cam3(f, pos, target, fov = 0.85, roll = 0) {
  const s = f.camera(240, 135, 1);
  return lookCam(s.w, s.h, pos, target, fov, roll);
}
// keys: [[t, pos, target, fov?], ...]
export function camPath(t, keys, e = 'inOutSine') {
  const k2 = keys.map(([tt, p, q, fov]) => [tt, [...p, ...q, fov ?? 0.85], e]);
  const v = track(t, k2);
  return { pos: [v[0], v[1], v[2]], target: [v[3], v[4], v[5]], fov: v[6] };
}
export function label3D(f, cam, p, str, color, a = 1, o = {}) {
  if (a <= 0) return;
  const pr = cam.project(p);
  if (!pr) return;
  text(f.ui, str, Math.round(pr[0]), Math.round(pr[1]) + (o.dy ?? 0), { align: 'center', color, outline: o.outline ?? '#0b0820', alpha: a, font: o.font ?? 'press', scale: o.scale });
}
export const screenOf = (cam, p) => cam.project(p);

// ---------------- UI cards ----------------
const fadeA = (t, t0, t1, d = 0.35) => clamp((t - t0) / d) * clamp((t1 - t) / d);
// narrator subtitle with a soft dark band (Press Start 2P)
export function narr(ui, lines, t, t0, t1, o = {}) {
  const a = fadeA(t, t0, t1);
  if (a <= 0) return;
  lines = Array.isArray(lines) ? lines : [lines];
  const lh = 11, h = lines.length * lh + 7, y0 = o.y ?? 270 - h - 10;
  const w = Math.max(...lines.map((l) => textWidth(l, { font: 'press' }))) + 18;
  const band = col(10, 8, 22, Math.round(150 * a));
  rect(ui, Math.round(240 - w / 2), y0, Math.round(w), h, band);
  lines.forEach((ln, i) => text(ui, ln, 240, y0 + 5 + i * lh, { align: 'center', font: 'press', color: o.color ?? '#fff6e0', outline: '#140f24', alpha: a }));
}
// big name card: name in Press Start 2x, subtitle, coloured bar
export function nameCard(ui, t, t0, t1, name, sub, color, o = {}) {
  const a = fadeA(t, t0, t1, 0.3);
  if (a <= 0) return;
  const x = o.x ?? 26, y = o.y ?? 190;
  const slide = Math.round((1 - clamp((t - t0) / 0.35)) * -30);
  rect(ui, x + slide - 6, y - 4, Math.round(textWidth(name, { font: 'press', scale: 2 }) + 16), 22, col(10, 8, 22, Math.round(160 * a)));
  text(ui, name, x + slide, y, { font: 'press', scale: 2, color, outline: '#140f24', alpha: a });
  rect(ui, x + slide, y + 20, Math.round(Math.min(1, (t - t0) / 0.5) * 120), 2, hex(color));
  if (sub) text(ui, sub, x + slide, y + 26, { color: '#fff6e0', outline: '#140f24', alpha: a });
}
export function chapter(ui, t, t0, t1, num, title) {
  const a = fadeA(t, t0, t1, 0.4);
  if (a <= 0) return;
  const s1 = 'ГЛАВА ' + num, w = Math.max(textWidth(s1, { font: 'press' }), textWidth(title, { font: 'press', scale: 2 })) + 24;
  rect(ui, 14, 14, Math.round(w), 40, col(10, 8, 22, Math.round(170 * a)));
  rect(ui, 14, 14, 3, 40, hex('#ffcf6b'));
  text(ui, s1, 26, 20, { font: 'press', color: '#ffcf6b', alpha: a });
  text(ui, title, 26, 33, { font: 'press', scale: 2, color: '#fff6e0', outline: '#140f24', alpha: a });
}
export { fadeA };
