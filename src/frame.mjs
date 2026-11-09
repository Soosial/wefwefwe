// Frame pipeline: scene -> world surface (camera, zoom) -> lighting -> bloom -> grade -> 1080p output + UI + transitions.
import { Surface, W, H, hex, bayer } from './core/fb.mjs';
import { applyLighting, bloom, grade, vignette, resample, compositeUI, combine, fadeOut, OW, OH } from './core/post.mjs';
import { clamp } from './core/math.mjs';
import { SCENES } from './timeline.mjs';

const surfCache = new Map();
function surf(w, h) {
  const k = w + 'x' + h;
  let s = surfCache.get(k);
  if (!s) surfCache.set(k, (s = new Surface(w, h)));
  return s;
}
const uiA = new Surface(W, H), uiB = new Surface(W, H);
const outA = new Uint32Array(OW * OH), outB = new Uint32Array(OW * OH);

export const FPS = 30;
export const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);
let acc = 0;
for (const sc of SCENES) { sc.start = acc; acc += sc.dur; }

class Ctx {
  constructor(ui) { this.ui = ui; }
  reset(T, t, sc) {
    this.T = T; this.t = t; this.scene = sc;
    this.lights = []; this.ambient = null; this.bands = 7; this.after = [];
    this.bloomOpts = { strength: 0.6 }; this.gradeOpts = null; this.vig = 0.3;
    this.zoom = 1; this.left = 0; this.top = 0;
    this.ui.d.fill(0); this.ui.m.fill(0); this.ui.tx = 0; this.ui.ty = 0; this.ui.flag = 0;
    this.mask = null; this.fade = 0; this.fadeColor = 0xff000000;
  }
  // camera centred on (cx, cy) world coords
  camera(cx, cy, zoom = 1) {
    this.zoom = zoom;
    const vw = W / zoom, vh = H / zoom;
    const left = cx - vw / 2, top = cy - vh / 2;
    const tx = Math.floor(left), ty = Math.floor(top);
    const s = surf(Math.ceil(vw) + 2, Math.ceil(vh) + 2);
    s.tx = tx; s.ty = ty; s.flag = 1;
    s.d.fill(0xff000000); s.m.fill(0);
    this.left = left; this.top = top; this.fx = left - tx; this.fy = top - ty;
    this.w = s;
    return s;
  }
  toScreen(wx, wy) { return [(wx - this.left) * this.zoom, (wy - this.top) * this.zoom]; }
  light(x, y, r, c, k = 1, sy = 1) { this.lights.push({ x, y, r, c, k, sy }); }
}
const ctxA = new Ctx(uiA), ctxB = new Ctx(uiB);

export function sceneAt(T) {
  for (const sc of SCENES) if (T < sc.start + sc.dur) return sc;
  return SCENES[SCENES.length - 1];
}

function renderScene(sc, T, ctx, out) {
  const t = T - sc.start;
  ctx.reset(T, t, sc);
  sc.render(ctx, t);
  const s = ctx.w;
  if (ctx.ambient) applyLighting(s, ctx.ambient, ctx.lights, ctx.bands);
  for (const fn of ctx.after) fn(s);
  if (ctx.bloomOpts) bloom(s, ctx.bloomOpts);
  if (ctx.gradeOpts) grade(s, ctx.gradeOpts);
  if (ctx.vig) vignette(s, ctx.vig, ctx.zoom, ctx.fx, ctx.fy);
  resample(out, s, ctx.fx, ctx.fy, ctx.zoom);
  compositeUI(out, ctx.ui);
  // per-scene transitions in/out (mask = low-res predicate: true => black)
  const tr = sceneTransitions(sc, t);
  if (tr) applyMask(out, tr);
  if (ctx.fade > 0) fadeOut(out, ctx.fade, ctx.fadeColor);
}

function applyMask(out, fn) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fn(x, y);
    if (!v) continue;
    const c = v === true ? 0xff000000 : hex(v);
    const o = y * 4 * OW + x * 4;
    for (let r = 0; r < 4; r++) out.fill(c, o + r * OW, o + r * OW + 4);
  }
}

// star/iris shapes for scene in/out wipes
function starMask(cx, cy, r) {
  const P = 0.6, lim = Math.pow(Math.max(r, 0.001), P);
  return (x, y) => Math.pow(Math.abs(x + 0.5 - cx), P) + Math.pow(Math.abs(y + 0.5 - cy) * 0.9, P) > lim;
}
function irisMask(cx, cy, r) { return (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > r * r; }
function ditherFade(k) { return (x, y) => bayer(x, y) < k; }

function sceneTransitions(sc, t) {
  const fns = [];
  const R = 560;
  if (sc.in) {
    const { type, dur = 0.6, x = W / 2, y = H / 2 } = sc.in;
    const u = clamp(t / dur);
    if (u < 1) {
      if (type === 'iris') fns.push(irisMask(x, y, R * u * u));
      else if (type === 'star') fns.push(starMask(x, y, 900 * u * u));
      else if (type === 'dither') fns.push(ditherFade(1 - u));
    }
  }
  if (sc.out) {
    const { type, dur = 0.6, x = W / 2, y = H / 2 } = sc.out;
    const u = clamp((sc.dur - t) / dur);
    if (u < 1) {
      if (type === 'iris') fns.push(irisMask(x, y, R * u * u));
      else if (type === 'star') fns.push(starMask(x, y, 900 * u * u));
      else if (type === 'dither') fns.push(ditherFade(1 - u));
    }
  }
  if (!fns.length) return null;
  return (x, y) => fns.some((f) => f(x, y));
}

// returns the 1920x1080 Uint32Array for global time T
export function renderFrame(T) {
  const sc = sceneAt(T);
  renderScene(sc, T, ctxA, outA);
  // cross-dissolve from previous scene
  const idx = SCENES.indexOf(sc);
  if (sc.xfade && idx > 0 && T - sc.start < sc.xfade) {
    const prev = SCENES[idx - 1];
    renderScene(prev, T, ctxB, outB);
    const k = (T - sc.start) / sc.xfade;
    combine(outA, outB, (x, y) => bayer(x, y) >= k);
  }
  return outA;
}
export { OW, OH };
