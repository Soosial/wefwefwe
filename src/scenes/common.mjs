// Shared scene helpers: the hill location, light presets, crowd, speech, persistent sky "releases".
import { hex, rect, glow, pset, mix, draw } from '../core/fb.mjs';
import { clamp, track, osc, hash, phase } from '../core/math.mjs';
import { skyGradient, stars, milkyWay, cloudSea, farIslands, SKIES, aurora, moon } from '../world/sky.mjs';
import { ground, hills, treeSprite, stageRock, signpost, bush, stringLights, rock } from '../world/land.mjs';
import { lantern, bubble, skyLabel, astraStar, sun, luna, sparkle } from '../world/props.mjs';
import { drawUser } from '../chars/rivals.mjs';

export const AMB = {
  night: [0.6, 0.6, 0.9],
  festival: [0.62, 0.58, 0.9],
  rain: [0.36, 0.4, 0.56],
  spy: [0.34, 0.4, 0.66],
  dawn: [1.0, 0.86, 0.84],
  day: [1, 1, 1],
};

export const hillY = (x) => 212 - 30 * Math.exp(-(((x - 520) / 250) ** 2)) + 2 * Math.sin(x / 37) + 1.5 * Math.sin(x / 13.7);
export const TREE_X = 650, STAGE_X = 470, SIGN_X = 350;
export const STAGE_Y = Math.round(hillY(STAGE_X)) - 4; // standing height on the stage rock
export const gy = (x) => Math.round(hillY(x));

export function hillSet(f, s, t, o = {}) {
  skyGradient(s, SKIES[o.sky || 'night'], 22, s.ty * 0.08);
  if (o.aurora) aurora(s, t, { k: o.aurora, y: 30 - s.ty * 0.05 });
  if (o.milky !== 0) milkyWay(s, { k: o.milky ?? 0.9, maxY: 200 });
  if (o.starCount !== 0) stars(s, t, { count: o.starCount ?? 320, seed: o.starSeed ?? 1, parallax: 0.05, bright: o.starBright ?? 1 });
  if (o.moon) moon(s, Math.round(o.moon[0] - s.tx * 0.04), Math.round(o.moon[1] - s.ty * 0.04), o.moon[2] ?? 9);
  if (o.beforeFar) o.beforeFar(s);
  const farCol = o.farCol ?? ['#1d2150', '#262a62'];
  farIslands(s, t, { parallax: 0.12, top: o.islandTop ?? '#3b4a86', body: o.islandBody ?? '#232858', dark: o.islandDark ?? '#191c46', fall: o.fall ?? '#8fa6e8' });
  cloudSea(s, t, { y: 168 - s.ty * 0.25, parallax: 0.2, speed: 3, seed: 5, h: 80, colors: o.cloudCols ?? ['#2a2a62', '#3e4284', '#5a60a8', '#8890d0'], fill: o.cloudFill ?? '#2a2a62' });
  hills(s, { parallax: 0.35, base: 188, amp: 16, seed: 3, color: farCol[0], rim: farCol[1], py: 0.3, lights: o.villageLights ?? 0.015 });
  cloudSea(s, t, { y: 205 - s.ty * 0.45, parallax: 0.45, speed: 6, seed: 9, h: 60, colors: o.cloudCols2 ?? ['#353a7a', '#4d539a', '#6f76bc', '#a0a8e4'] });
  if (o.beforeGround) o.beforeGround(s);
  if (!o.noTree) {
    const T = treeSprite();
    draw(s, T, TREE_X - 100, gy(TREE_X) - T.h + 4, { flag: 1 });
  }
  if (o.beforeHill) o.beforeHill(s);
  ground(s, t, hillY, { wind: o.wind ?? 1, flowers: o.flowers ?? 0.07, pal: o.groundPal });
  if (!o.noStage) stageRock(s, STAGE_X, STAGE_Y, 80);
  if (!o.noSign) signpost(s, SIGN_X, gy(SIGN_X) + 2, o.signFront ?? '', o.signBack ?? '', { flip: o.signFlip ?? 1, w: o.signW ?? 70 });
  rock(s, 300, gy(300) + 2, 14, 7, 3);
  rock(s, 760, gy(760) + 2, 18, 8, 5);
  rock(s, 772, gy(772) + 3, 9, 5, 6);
}

// festival decorations: two poles + string lights to the tree, returns bulb list for lights
export function festivalLights(f, s, t, k = 1) {
  const poles = [[318, gy(318)], [560, gy(560)]];
  for (const [x, y] of poles) { rect(s, x - 1, y - 52, 3, 52, '#5a3d26'); rect(s, x - 1, y - 52, 1, 52, '#8a6040'); }
  const segs = [[318, gy(318) - 52, 560, gy(560) - 52, 16], [560, gy(560) - 52, 604, 96, 8], [318, gy(318) - 52, 250, gy(250) - 20, 10]];
  if (k <= 0) return;
  for (const [x0, y0, x1, y1, sag] of segs) {
    const bulbs = stringLights(s, t, x0, y0, x1, y1, sag, { step: 8 });
    bulbs.forEach(([x, y, c, on], i) => { if (i % 3 === 0) f.light(x, y + 6, 26, c, 0.5 * on * k); });
  }
}

export const blinkAt = (t, seed = 0, period = 3.1) => ((t + hash(seed) * period) % period) < 0.12;
export function walker(t, keys, speedHz = 2) {
  const x = track(t, keys);
  const dx = track(t + 0.05, keys) - track(t - 0.05, keys);
  const moving = Math.abs(dx) > 0.2;
  return { x, moving, dir: dx > 0.05 ? 1 : dx < -0.05 ? -1 : 0, ph: t * speedHz };
}

// speech bubble anchored at world point, visible in [t0, t1]
export function say(f, wx, wy, t, t0, t1, str, o = {}) {
  if (t < t0 || t > t1) return;
  const [sx, sy] = f.toScreen(wx, wy);
  bubble(f.ui, Math.round(sx), Math.round(sy), { text: str, t: t - t0, chars: Math.floor((t - t0) * (o.cps ?? 30)), maxW: o.maxW ?? 130, ...o });
}
export function label(f, wx, wy, t, t0, t1, str, c, o = {}) {
  const a = clamp((t - t0) / 0.4) * clamp((t1 - t) / 0.5);
  if (a <= 0) return;
  const [sx, sy] = f.toScreen(wx, wy);
  skyLabel(f.ui, Math.round(sx), Math.round(sy), str, c, a, o);
}

// foreground audience (silhouettes seen from behind). mood(i) -> { jump 0..1, stick bool, gone bool, icon }
export function crowd(f, s, t, o = {}) {
  const n = o.n ?? 24, x0 = o.x0 ?? 330, x1 = o.x1 ?? 620, y = o.y ?? s.h - 4;
  const dark = o.dark ?? '#140f24', rim = o.rim ?? '#3c3466';
  const icons = [];
  s.with({ parallax: o.parallax ?? 1.12, parallaxY: 0, flag: 0 }, () => {
    for (let i = 0; i < n; i++) {
      const m = o.mood ? o.mood(i) : {};
      if (m.gone) continue;
      const row = i % 3;
      const x = Math.round(x0 + (x1 - x0) * ((i + 0.5) / n) + (hash(i * 3) - 0.5) * 9 + (m.dx ?? 0));
      const yy = y + (2 - row) * 5 + Math.round(hash(i * 5) * 3);
      const ph = t * (7 + hash(i) * 3) + i * 1.7;
      const jump = (m.jump ?? 0) * Math.max(0, Math.sin(ph)) * 7;
      const yb = Math.round(yy - jump);
      drawUser(s, x, yb - 1, { seed: i + 3, sil: rim, shadow: false });
      drawUser(s, x, yb, { seed: i + 3, sil: dark, shadow: false });
      if (m.stick || (o.sticks && hash(i * 7) < 0.4)) {
        const c = ['#ff9ad5', '#9fe0ff', '#ffe27a', '#b7ff8a'][i % 4];
        const ang = Math.sin(t * 6 + i) * 0.5 * Math.max(0.2, m.jump ?? 0.2);
        s.with({ flag: 2 }, () => {
          for (let k = 0; k < 6; k++) pset(s, x + 3 + Math.round(Math.sin(ang) * k), yb - 12 - k, hex(c));
        });
        glow(s, x + 3, yb - 15, 9, c, 0.4, 4);
      }
      if (m.icon) icons.push([x - s.tx, yb - 16 - s.ty, m.icon, i]);
    }
  });
  return icons;
}

// persistent releases in the sky. st: { opus, astra, sol, luna, deep, kimi, z, gem4 } alphas (0..1)
export const SKY = {
  opus: [404, 34], astra: [498, 16], sol: [556, 40], luna: [604, 20],
  deep: [318, 46], kimi: [352, 62], z: [286, 70], gem4: [452, 6],
};
export function skyLights(f, s, t, st = {}) {
  const bobY = (k) => Math.round(Math.sin(t * 0.8 + k) * 1.5);
  if (st.opus) {
    const [x, y] = SKY.opus;
    lantern(s, x, y + bobY(1), { w: 12, h: 14, paper: '#ff9a4a', lit: st.opus, t, seed: 4 });
    f.light(x, y - 6, 40, '#ffae60', 0.7 * st.opus);
  }
  if (st.astra) { const [x, y] = SKY.astra; astraStar(s, t, x, y + bobY(2), 3, { k: st.astra }); f.light(x, y, 40, '#cfe6ff', 0.5 * st.astra); }
  if (st.sol) { const [x, y] = SKY.sol; sun(s, t, x, y + bobY(3), 5, { k: st.sol }); f.light(x, y, 50, '#ffcf6a', 0.6 * st.sol); }
  if (st.luna) { const [x, y] = SKY.luna; luna(s, t, x, y + bobY(4), 5, { k: st.luna }); }
  const riv = [['deep', '#4d6bfe'], ['kimi', '#3a4060'], ['z', '#2346d6']];
  riv.forEach(([k, c], i) => {
    if (!st[k]) return;
    const [x, y] = SKY[k];
    lantern(s, x, y + bobY(5 + i), { w: 10, h: 12, paper: c, lit: st[k], t, seed: 7 + i, glowC: '#9fb0ff' });
  });
  if (st.gem4) {
    const [x, y] = SKY.gem4;
    const k = st.gem4;
    glow(s, x, y, 40 * k, '#b9a4ff', 0.6 * k, 6);
    const P = 0.6, R = 7 * k;
    s.with({ flag: 2 }, () => {
      for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
        if (Math.abs(dx) ** P + Math.abs(dy) ** P > R ** P) continue;
        const c = Math.hypot(dx, dy) < 2.5 ? '#ffffff' : dy < 0 && Math.abs(dy) >= Math.abs(dx) ? '#ff7a6b' : dy >= 0 && Math.abs(dy) >= Math.abs(dx) ? '#6fd08a' : dx < 0 ? '#ffd95a' : '#7fb0ff';
        pset(s, x + dx, y + dy + bobY(9), hex(c));
      }
    });
    sparkle(s, x + 9, y - 6 + bobY(9), 1 + Math.round(osc(t, 0.7) + 1), '#ffffff', k);
  }
}

export function letterbox(ui, k = 1, h = 22) {
  const hh = Math.round(h * clamp(k));
  if (hh <= 0) return;
  rect(ui, 0, 0, ui.w, hh, '#000000');
  rect(ui, 0, ui.h - hh, ui.w, hh, '#000000');
}
export { clamp, track, osc, hash, phase, hex, rect, glow, pset, mix, bush, stringLights, rock };
