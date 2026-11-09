// Preview renderer: contact sheet of frames (low-res tiles) or single full-res frames.
// usage: node tools/preview.mjs --scene prologue --n 9 [--out out/p.png]
//        node tools/preview.mjs --times 1.5,3,7 [--full]
import { renderFrame, OW, OH, TOTAL } from '../src/frame.mjs';
import { SCENES } from '../src/timeline.mjs';
import { savePNG } from '../src/core/png.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]] : a), []));
let times = [];
if (args.times) times = String(args.times).split(',').map(Number);
if (args.scene) {
  const sc = SCENES.find((s) => s.id === args.scene);
  let acc = 0;
  for (const s of SCENES) { if (s === sc) break; acc += s.dur; }
  const n = Number(args.n ?? 9);
  const a = Number(args.from ?? 0), b = Number(args.to ?? sc.dur);
  for (let i = 0; i < n; i++) times.push(acc + a + ((b - a) * (i + 0.5)) / n);
}
const out = args.out || 'out/preview.png';
const t0 = Date.now();
if (args.full) {
  times.forEach((T, i) => {
    const px = renderFrame(T);
    const p = out.replace('.png', `_${i}.png`);
    savePNG(p, OW, OH, px);
    console.log('saved', p, 'T=', T.toFixed(2));
  });
} else {
  const cols = Number(args.cols ?? 3), tw = 480, th = 270, pad = 4;
  const rows = Math.ceil(times.length / cols);
  const W = cols * (tw + pad), H = rows * (th + pad);
  const sheet = new Uint32Array(W * H).fill(0xff101010);
  times.forEach((T, i) => {
    const px = renderFrame(T);
    const ox = (i % cols) * (tw + pad), oy = Math.floor(i / cols) * (th + pad);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) sheet[(oy + y) * W + ox + x] = px[(y * 4 + 1) * OW + x * 4 + 1];
  });
  savePNG(out, W, H, sheet);
  console.log('sheet', out, times.map((t) => t.toFixed(1)).join(' '));
}
console.log('ms/frame', ((Date.now() - t0) / times.length).toFixed(0), 'total', TOTAL);
