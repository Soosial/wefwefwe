// Full pipeline: audio + N parallel video segments -> concat -> mux. Usage: node tools/render_all.mjs [segments=4] [out=out/cartoon.mp4]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCENES } from '../src/timeline.mjs';
import { buildAudio } from './audio.mjs';

const FPS = 30;
const N = Number(process.argv[2] ?? 4), OUT = process.argv[3] ?? 'out/cartoon.mp4';
const total = Math.round(SCENES.reduce((a, s) => a + s.dur, 0) * FPS);
const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: 'inherit' });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(cmd + ' exit ' + c))));
});
// out/ is git-ignored, so a fresh checkout has to create it
mkdirSync('out', { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });
const t0 = Date.now();
const { buf } = buildAudio();
writeFileSync('out/audio.wav', buf);
console.log('audio ready', ((Date.now() - t0) / 1000).toFixed(0) + 's');
const per = Math.ceil(total / N), segs = [];
const jobs = [];
for (let k = 0; k < N; k++) {
  const a = k * per, b = Math.min(total, a + per), out = `out/seg${k}.mp4`;
  segs.push(out);
  jobs.push(run('node', ['tools/render.mjs', '--from', String(a), '--to', String(b), '--out', out]));
}
await Promise.all(jobs);
writeFileSync('out/segs.txt', segs.map((s) => `file '${s.replace('out/', '')}'`).join('\n') + '\n');
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'out/segs.txt', '-i', 'out/audio.wav',
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT]);
console.log('done', OUT, 'frames', total, ((Date.now() - t0) / 1000).toFixed(0) + 's');
