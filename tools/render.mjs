// Render a frame range to an H.264 segment: node tools/render.mjs --from 0 --to 1350 --out out/seg0.mp4
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderFrame, OW, OH, FPS } from '../src/frame.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const from = Number(args.from ?? 0), to = Number(args.to ?? 30), out = args.out ?? 'out/seg.mp4';
mkdirSync(dirname(out), { recursive: true });
const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${OW}x${OH}`, '-r', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', args.preset ?? 'slow', '-crf', args.crf ?? '23', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-threads', args.threads ?? '2', '-g', '60', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
const t0 = Date.now();
for (let f = from; f < to; f++) {
  const px = renderFrame(f / FPS);
  await write(Buffer.from(px.buffer, px.byteOffset, px.byteLength));
  if ((f - from) % 150 === 0) console.log(`[${out}] frame ${f} (${(f - from) + 1}/${to - from}) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
console.log(`[${out}] done ${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
