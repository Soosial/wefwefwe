// Mixdown: builds out/audio.wav (stereo 16-bit, 44.1 kHz) from every scene's MUSIC cues and SFX.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
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


export function buildAudio() {
  const music = new Bus(TOTAL + 1), fx = new Bus(TOTAL + 1);
  // each scene carries its own score in scene-local time
  let at = 0;
  for (const sc of SCENES) { for (const c of sc.music) cue(music, { ...c, t0: at + c.t0 }); at += sc.dur; }
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
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', out, 'samples', n, 'sfx', count, 'cues', SCENES.reduce((a, s) => a + s.music.length, 0), 'peak(pre-norm)', peak.toFixed(3), 'ms', Date.now() - t0);
}
