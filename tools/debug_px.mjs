// Debug helper: print output pixel colours at given (x, y) for a global time.
// usage: node tools/debug_px.mjs T x,y x,y ...
import { renderFrame, OW } from '../src/frame.mjs';
const T = Number(process.argv[2]);
const px = renderFrame(T);
for (const a of process.argv.slice(3)) {
  const [x, y] = a.split(',').map(Number);
  const c = px[y * OW + x];
  console.log(a, '#' + [c & 255, (c >>> 8) & 255, (c >>> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join(''));
}
