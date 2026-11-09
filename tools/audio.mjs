// Music score + mixdown: builds out/audio.wav (stereo 16-bit, 44.1 kHz) from music cues and scene SFX.
import { writeFileSync } from 'node:fs';
import { SR, Bus, INST, reverb } from '../src/audio/synth.mjs';
import { SFX } from '../src/audio/sfx.mjs';
import { SCENES } from '../src/timeline.mjs';

const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const deg = (scale, d) => { const i = d - 1, o = Math.floor(i / 7), k = ((i % 7) + 7) % 7; return SCALES[scale][k] + 12 * o; };
function chord(scale, spec) {
  if (Array.isArray(spec)) return spec;
  if (typeof spec === 'string' && spec.endsWith('M')) { const r = deg(scale, Number(spec[0])); return [r, r + 4, r + 7]; }
  const d = Number(spec);
  return [deg(scale, d), deg(scale, d + 2), deg(scale, d + 4)];
}
function parseMel(str, scale) {
  return str.trim().split(/\s+/).map((tk) => {
    if (tk === '.') return 'rest';
    if (tk === '-') return 'hold';
    const m = /^([#b]?)(\d)([',]*)$/.exec(tk);
    if (!m) throw new Error('bad token ' + tk);
    let n = deg(scale, Number(m[2])) + (m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0);
    for (const c of m[3]) n += c === "'" ? 12 : -12;
    return n;
  });
}

function cue(bus, c) {
  const scale = c.scale ?? 'major', beat = 60 / c.bpm, bpb = c.bpb ?? 4, bar = beat * bpb, end = c.t0 + c.dur;
  const fi = c.fi ?? 0.05, fo = c.fo ?? 0.3;
  const g = (t) => Math.max(0, Math.min(1, (t - c.t0) / fi + 0.0001) * Math.min(1, (end - t) / fo));
  const note = (inst, t, dur, m, vel, pan = 0, opts) => {
    if (t >= end || t < c.t0 - 1e-6) return;
    const v = vel * g(t);
    if (v <= 0.001) return;
    INST[inst](bus, t, Math.min(dur, end - t), m, v, pan, opts);
  };
  const nBars = Math.ceil(c.dur / bar);
  for (let b = 0; b < nBars; b++) {
    const tb = c.t0 + b * bar;
    const ch = chord(scale, c.bars[b % c.bars.length]).map((n) => n + c.root);
    if (c.pad) ch.forEach((n, i) => note(c.pad.inst ?? 'pad', tb, bar, n + 12 * (c.pad.oct ?? 0), c.pad.vel ?? 0.4, -0.4 + i * 0.4, c.pad.opts));
    if (c.bass) {
      const r = ch[0] + 12 * (c.bass.oct ?? -2), fifth = r + 7, inst = c.bass.inst ?? 'bass', v = c.bass.vel ?? 0.45;
      const p = c.bass.pattern;
      if (p === 'whole') note(inst, tb, bar * 0.95, r, v);
      else if (p === 'roots4') for (let k = 0; k < bpb; k++) note(inst, tb + k * beat, beat * 0.9, r, v);
      else if (p === 'pulse8') for (let k = 0; k < bpb * 2; k++) note(inst, tb + k * beat / 2, beat * 0.4, k % 4 === 2 ? fifth : r, v * (k % 2 ? 0.75 : 1));
      else if (p === 'oom') for (let k = 0; k < bpb; k++) note(inst, tb + k * beat, beat * 0.45, k % 2 ? fifth : r, v * (k % 2 ? 0.7 : 1));
      else if (p === 'waltz') { note(inst, tb, beat * 0.9, r, v); for (let k = 1; k < bpb; k++) ch.forEach((n) => note(inst, tb + k * beat, beat * 0.5, n + 12 * ((c.bass.oct ?? -2) + 1), v * 0.4)); }
      else if (p === 'walk') { const w = [0, ch[1] - ch[0], 7, 9]; for (let k = 0; k < bpb; k++) note(inst, tb + k * beat, beat * 0.45, r + w[k % 4], v); }
    }
    if (c.arp && (c.arp.from === undefined || tb - c.t0 >= c.arp.from - 0.01)) {
      const rate = (c.arp.rate ?? 0.25) * beat, n = Math.round(bar / rate);
      const seq = [...ch, ch[0] + 12, ...(c.arp.pattern === 'up' ? [] : [ch[2], ch[1]])];
      for (let k = 0; k < n; k++) note(c.arp.inst ?? 'pluck', tb + k * rate, rate * 0.9, seq[k % seq.length] + 12 * (c.arp.oct ?? 0), c.arp.vel ?? 0.2, ((k % 4) - 1.5) * 0.25);
    }
    if (c.drums) {
      const steps = bpb * 4, st = beat / 4, dv = c.drums.vel ?? 0.4;
      const lanes = { k: 'kick', s: 'snare', h: 'hat', c: 'clap', w: 'wood', t: 'tom', cr: 'crash' };
      for (const [key, inst] of Object.entries(lanes)) {
        const pat = c.drums[key];
        if (!pat) continue;
        if (key === 'cr' && b > 0) continue;
        for (let k = 0; k < steps; k++) if (pat[k % pat.length] === 'x') note(inst, tb + k * st, st, key === 'w' ? 76 + (k % 8 === 0 ? 3 : 0) : key === 't' ? 43 + (k % 4) : 0, dv * (key === 'h' ? 0.6 : 1), key === 'h' ? 0.25 : 0);
      }
    }
  }
  for (const mk of ['mel', 'mel2']) {
    const M = c[mk];
    if (!M) continue;
    const toks = parseMel(M.str, scale), step = (M.step ?? 0.5) * beat;
    let t = c.t0 + (M.delay ?? 0) * bar + (M.delaySec ?? 0), i = 0;
    while (t < end) {
      const tk = toks[i % toks.length];
      if (i >= toks.length && !M.loop) break;
      if (typeof tk === 'number') {
        let len = 1;
        while (toks[(i + len) % toks.length] === 'hold' && (M.loop || i + len < toks.length)) len++;
        note(M.inst, t, step * len * 0.95, c.root + tk + 12 * (M.oct ?? 0), M.vel ?? 0.4, M.pan ?? 0, M.opts);
      }
      t += step; i++;
    }
  }
}

const THEME = "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 7 . 5 . 2' - - -";
const THEME3 = "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 . 6 . 4 6 1' . 2' 1' 1' - - - - - - -";
const FEST = "1 . 3 5 6 5 3 . 2 . 4 6 5 4 2 . 4 . 6 1' 7 6 4 . 5 . 7 2' 1' . . . 3' . 2' 1' 6 . 5 . 4 . 6 5 4 . 2 . 1 . 3 4 5 . 6 . 5 . . . 1' . . .";
const TAUNT = "5 . 3 . 6 5 3 . 5 . 3 . 6 5 3 . 6 . 4 . 1' 6 4 . 5 . 7 . 2' . . .";
const SNEAK = '1 . . 3 . 4 . #4 5 . . . . . . . 1 . . 3 . 4 . #4 5 . 4 . 3 . 2 .';
const sneak = (t0, dur, fi, fo) => ({ t0, dur, bpm: 100, root: 52, scale: 'minor', bars: [1, 1, 4, 5], fi, fo, mel: { inst: 'pluck', str: SNEAK, step: 0.5, oct: 1, vel: 0.75, delay: 1, loop: true }, bass: { pattern: 'walk', inst: 'pluck', oct: -1, vel: 0.85 }, drums: { c: '....x.......x...', vel: 0.32 } });
const fest = (t0, dur, fo) => ({ t0, dur, bpm: 124, root: 65, bars: [1, 6, 4, 5], fi: 0.3, fo, mel: { inst: 'lead', str: FEST, step: 0.5, vel: 0.42, delay: 1, loop: true }, bass: { pattern: 'pulse8', oct: -2, vel: 0.45 }, arp: { inst: 'pluck', rate: 0.25, vel: 0.14 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', vel: 0.42 } });

export const CUES = [
  { t0: 0.5, dur: 13.0, bpm: 72, root: 60, bars: [1, 6, 4, 5], fi: 1.5, fo: 1.2, mel: { inst: 'bell', str: THEME, oct: 1, vel: 0.5 }, pad: { oct: -1, vel: 0.5 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.2, from: 6.6 } },
  { t0: 13.0, dur: 5.0, bpm: 120, root: 60, bars: [1, 4, 1], fi: 0.05, fo: 0.8, mel: { inst: 'bell', str: "5 1' 3' 5' 3' - - - 4' 3' 2' 7 1' - - -", oct: 1, vel: 0.5 }, pad: { oct: -1, vel: 0.45 }, drums: { k: 'x...............', cr: 'x...............', vel: 0.35 } },
  fest(18.6, 13.6, 0.4),
  { t0: 32.2, dur: 4.7, bpm: 124, root: 65, bars: [4, 5, 1], fi: 0.2, fo: 0.15, bass: { pattern: 'whole', oct: -2, vel: 0.35 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.1 }, pad: { oct: -1, vel: 0.2 } },
  { t0: 38.4, dur: 12.0, bpm: 96, bpb: 3, root: 57, scale: 'minor', bars: [1, 6, 3, '5M'], fi: 0.5, fo: 0.8, mel: { inst: 'box', str: '1\' . 7 . 6 5 6 . 5 . 4 3 3 . 2 . 3 5 #7 . . . 5 .', oct: 1, vel: 0.45, loop: true }, bass: { pattern: 'waltz', inst: 'pluck', oct: -1, vel: 0.3 }, drums: { w: 'x...x...x...', vel: 0.12 } },
  { t0: 52.3, dur: 12.6, bpm: 132, root: 60, bars: [1, 1, 4, 5], fi: 0.2, fo: 1.5, mel: { inst: 'lead', str: TAUNT, vel: 0.42, delay: 1, loop: true, opts: { duty: 0.5, rel: 0.03 } }, bass: { pattern: 'oom', oct: -2, vel: 0.5 }, drums: { k: 'x.......x.......', s: '....x.......x...', w: '..x...x...x...x.', vel: 0.38 } },
  { t0: 67.4, dur: 12.8, bpm: 60, root: 57, scale: 'minor', bars: [1, 6, 3, 7], fi: 1.0, fo: 1.2, mel: { inst: 'piano', str: '3 . . 2 1 . . . 1 . . 7, 6, . . . 5, . 6, 7, 1 . 2 . 3 - - - . . . . 3 . . 2 1 . . .', oct: 1, vel: 0.42 }, pad: { inst: 'strings', oct: -1, vel: 0.32 } },
  { t0: 73.4, dur: 6.0, bpm: 72, root: 60, bars: [6, 4], fi: 0.8, fo: 1.2, mel: { inst: 'bell', str: "5 . 3 5 1' . 7 6 5 . 3 . 2 3 1 .", oct: 1, vel: 0.3 } },
  sneak(80.5, 8.5, 0.3, 0.05),
  sneak(90.9, 2.1, 0.1, 0.6),
  { t0: 93.0, dur: 3.2, bpm: 60, root: 57, scale: 'minor', bars: [1], fi: 0.5, fo: 1.0, pad: { inst: 'strings', oct: -1, vel: 0.3 } },
  { t0: 95.5, dur: 9.7, bpm: 76, root: 65, bars: [1, 5, 6, 4], fi: 1.5, fo: 0.3, mel: { inst: 'bell', str: THEME, vel: 0.4, delay: 1 }, pad: { oct: -1, vel: 0.45 }, bass: { pattern: 'whole', oct: -2, vel: 0.3 } },
  { t0: 105.2, dur: 6.8, bpm: 76, root: 65, bars: [4, 5, 1, 1], fi: 0.3, fo: 1.0, mel: { inst: 'lead', str: "1' . 7 1' 2' . 1' 7 2' . 1' 2' 3' . 2' 1' 1' - - - 5 - - - 1' - - - . . . .", vel: 0.42, opts: { duty: 0.5, cut: 2400 } }, pad: { inst: 'strings', oct: -1, vel: 0.5 }, arp: { inst: 'pluck', rate: 0.25, vel: 0.14 }, bass: { pattern: 'roots4', oct: -2, vel: 0.35 }, drums: { k: 'x.......x.......', h: '..x...x...x...x.', vel: 0.25 } },
  { t0: 112.3, dur: 6.0, bpm: 120, root: 55, bars: [1, 4, 5, 1], fi: 0.3, fo: 0.4, mel: { inst: 'lead', str: '1 . 2 3 5 . 3 . 4 . 3 2 1 . . . 5 . 6 5 3 . 2 . 1 . 2 3 1 . . .', oct: 1, vel: 0.35, loop: true }, bass: { pattern: 'pulse8', oct: -1, vel: 0.4 }, arp: { inst: 'pluck', rate: 0.25, oct: 1, vel: 0.12 }, drums: { k: 'x.......x.......', w: 'x...x...x...x...', h: '..x...x...x...x.', vel: 0.35 } },
  { t0: 118.6, dur: 1.6, bpm: 120, root: 55, bars: [[0, 5, 7]], fi: 1.0, fo: 0.05, pad: { inst: 'strings', oct: 0, vel: 0.4 }, drums: { t: 'x.x.x.x.xxxxxxxx', vel: 0.3 } },
  { t0: 120.2, dur: 7.3, bpm: 100, root: 55, bars: [1, 6, 4, 5], fi: 0.05, fo: 0.3, mel: { inst: 'lead', str: THEME, oct: 1, vel: 0.42, delay: 1, opts: { duty: 0.5, cut: 3000 } }, mel2: { inst: 'bell', str: THEME, oct: 1, vel: 0.22, delay: 1 }, pad: { inst: 'strings', oct: -1, vel: 0.45 }, bass: { pattern: 'roots4', oct: -2, vel: 0.42 }, drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', cr: 'x...............', vel: 0.4 } },
  { t0: 127.5, dur: 2.7, bpm: 100, root: 57, bars: [4, 1], fi: 0.05, fo: 0.8, mel: { inst: 'lead', str: "6 . 4 6 1' . 2' 1' 1' - - - - - - -", oct: 1, vel: 0.48, opts: { duty: 0.5 } }, mel2: { inst: 'bell', str: "6 . 4 6 1' . 2' 1' 1' - - - - - - -", oct: 1, vel: 0.25 }, pad: { inst: 'strings', oct: -1, vel: 0.5 }, bass: { pattern: 'whole', oct: -2, vel: 0.4 }, drums: { k: 'x...............', cr: 'x...............', vel: 0.5 } },
  { t0: 130.4, dur: 6.0, bpm: 112, root: 55, bars: [1, 5, 6, 4], fi: 0.6, fo: 0.5, mel: { inst: 'lead', str: "3 . 5 . 1' . 7 . 6 . 5 . 3 . 2 . 3 . 5 . 6 . 5 . 1' - - - . . . .", oct: 1, vel: 0.4, opts: { duty: 0.5 } }, mel2: { inst: 'bell', str: "3 . 5 . 1' . 7 . 6 . 5 . 3 . 2 . 3 . 5 . 6 . 5 . 1' - - - . . . .", oct: 1, vel: 0.18 }, arp: { inst: 'pluck', rate: 0.25, vel: 0.12 }, bass: { pattern: 'pulse8', oct: -2, vel: 0.4 }, drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', vel: 0.3 } },
  { t0: 137.0, dur: 2.4, bpm: 132, root: 60, bars: [1, 1], fi: 0.1, fo: 0.2, mel: { inst: 'lead', str: TAUNT, vel: 0.38, opts: { duty: 0.5, rel: 0.03 } }, bass: { pattern: 'oom', oct: -2, vel: 0.45 }, drums: { k: 'x.......x.......', w: '..x...x...x...x.', vel: 0.3 } },
  { t0: 140.4, dur: 2.6, bpm: 120, root: 55, bars: [1, 4], fi: 0.05, fo: 0.5, mel: { inst: 'brass', str: "1 . 3 . 5 . 1' - 5 . 1' - - - - -", oct: 1, vel: 0.5 }, pad: { inst: 'strings', oct: -1, vel: 0.45 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', cr: 'x...............', vel: 0.45 } },
  sneak(143.3, 5.9, 0.3, 0.4),
  { t0: 149.2, dur: 2.7, bpm: 70, root: 40, scale: 'minor', bars: [1], fi: 0.3, fo: 0.05, pad: { inst: 'strings', oct: 1, vel: 0.5 }, drums: { k: 'x..x............', vel: 0.55 } },
  { t0: 151.9, dur: 2.4, bpm: 140, root: 40, scale: 'minor', bars: [1, 6], fi: 0.02, fo: 0.1, pad: { inst: 'brass', oct: 1, vel: 0.32 }, drums: { k: 'x...x...x...x...', t: 'x.x.x.x.x.x.x.x.', vel: 0.42 } },
  { t0: 156.7, dur: 2.6, bpm: 168, root: 60, bars: [1, 5, 1, 5], fi: 0.05, fo: 0.3, mel: { inst: 'lead', str: "1 2 3 4 5 4 3 2 1 2 3 4 5 6 7 1' 5 . 3 . 1 . . .", oct: 1, vel: 0.4, opts: { duty: 0.5, rel: 0.02 } }, bass: { pattern: 'pulse8', oct: -2, vel: 0.4 }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', vel: 0.35 } },
  { t0: 161.2, dur: 0.9, bpm: 120, root: 60, bars: [1], mel: { inst: 'bell', str: "5 1'", oct: 1, vel: 0.4 } },
  { t0: 162.4, dur: 10.4, bpm: 90, root: 60, bars: [1, 6, 4, 1], fi: 1.0, fo: 2.0, mel: { inst: 'bell', str: THEME3, oct: 1, vel: 0.45 }, mel2: { inst: 'lead', str: THEME3, oct: 0, vel: 0.22, opts: { duty: 0.5, cut: 1800 } }, pad: { inst: 'strings', oct: -1, vel: 0.45 }, arp: { inst: 'pluck', rate: 0.5, vel: 0.14 }, bass: { pattern: 'whole', oct: -2, vel: 0.3 } },
  fest(173.3, 5.2, 0.05),
];

export function buildAudio() {
  const music = new Bus(TOTAL + 1), fx = new Bus(TOTAL + 1);
  for (const c of CUES) cue(music, c);
  let acc = 0;
  let count = 0;
  for (const sc of SCENES) {
    for (const [t, name, o = {}] of sc.sfx) {
      const fn = SFX[name];
      if (!fn) { console.warn('missing sfx', name, 'in', sc.id); continue; }
      fn(fx, acc + t, o);
      count++;
    }
    acc += sc.dur;
  }
  reverb(music.L, music.R, { wet: 0.28, room: 0.84 });
  reverb(fx.L, fx.R, { wet: 0.14, room: 0.7 });
  if (process.env.AUDIO_REPORT) {
    let a = 0;
    const db = (x) => (20 * Math.log10(x + 1e-9)).toFixed(1);
    for (const sc of SCENES) {
      let m = 0, f = 0;
      const i0 = Math.floor(a * SR), i1 = Math.floor((a + sc.dur) * SR);
      for (let i = i0; i < i1; i++) { m += music.L[i] ** 2; f += fx.L[i] ** 2; }
      console.log(sc.id.padEnd(11), 'music', db(Math.sqrt(m / (i1 - i0)) * 0.8), 'dB  fx', db(Math.sqrt(f / (i1 - i0))), 'dB');
      a += sc.dur;
    }
  }
  const n = Math.round(TOTAL * SR);
  const L = new Float32Array(n), Rr = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    L[i] = Math.tanh((music.L[i] * 0.8 + fx.L[i]) * 1.1);
    Rr[i] = Math.tanh((music.R[i] * 0.8 + fx.R[i]) * 1.1);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rr[i]));
  }
  const k = 0.92 / (peak || 1);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * k * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Rr[i] * k * 32767))), 46 + i * 4);
  }
  return { buf, peak, count, n };
}

if (process.argv[1] && process.argv[1].endsWith('audio.mjs')) {
  const t0 = Date.now();
  const { buf, peak, count, n } = buildAudio();
  const out = process.argv[2] || 'out/audio.wav';
  writeFileSync(out, buf);
  console.log('wrote', out, 'samples', n, 'sfx', count, 'cues', CUES.length, 'peak(pre-norm)', peak.toFixed(3), 'ms', Date.now() - t0);
}
