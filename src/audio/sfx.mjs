// Procedural sound effects. Every effect: (bus, t0, o) with o.{pan, pitch, gain, dur, ...}.
import { SR, Osc, Biquad, rnd, mtof, env, perc, INST } from './synth.mjs';

const TAU = Math.PI * 2;
let SEED = 1;
const R = () => rnd(SEED++ * 7919);

// filtered noise with exponential cutoff sweep; envFn(u, t) 0..1
function noise(bus, t0, dur, o) {
  const r = R(), f = new Biquad(o.type ?? 'bp', o.f0 ?? 1000, o.q ?? 1);
  const f0 = o.f0 ?? 1000, f1 = o.f1 ?? f0;
  bus.play(t0, dur, (t, k) => {
    const u = t / dur;
    if (k % 64 === 0 && f1 !== f0) f.set(f0 * Math.pow(f1 / f0, u));
    return f.run(r() * 2 - 1) * (o.env ? o.env(u, t) : 1);
  }, o.pan ?? 0, o.gain ?? 0.5);
}
function tone(bus, t0, dur, o) {
  const osc = new Osc(o.wave ?? 'sine', o.duty ?? 0.5), f0 = o.f0, f1 = o.f1 ?? o.f0;
  const lp = o.lp ? new Biquad('lp', o.lp, 0.8) : null;
  bus.play(t0, dur, (t) => {
    const u = t / dur;
    const f = (o.lin ? f0 + (f1 - f0) * u : f0 * Math.pow(f1 / f0, u)) * (1 + (o.vib ? Math.sin(TAU * o.vib * t) * (o.vibAmt ?? 0.01) : 0));
    const v = osc.next(f) * (o.env ? o.env(u, t) : 1);
    return lp ? lp.run(v) : v;
  }, o.pan ?? 0, o.gain ?? 0.4);
}
function clicks(bus, t0, dur, rate, o = {}) {
  const r = R();
  const n = Math.round(dur * rate);
  for (let i = 0; i < n; i++) {
    const tt = t0 + r() * dur, len = 0.004 + r() * 0.01;
    noise(bus, tt, len, { type: 'bp', f0: (o.fc ?? 3000) * (0.6 + r() * 0.8), q: 1.2, gain: (o.gain ?? 0.3) * (0.4 + r() * 0.6) * (o.shape ? o.shape((tt - t0) / dur) : 1), pan: (o.pan ?? 0) + (r() - 0.5) * (o.spread ?? 0.6), env: (u) => 1 - u });
  }
}
const fadeEnv = (a, b) => (u) => Math.min(1, u / a) * Math.min(1, (1 - u) / b);

const VOICE = {
  clawd: { w: 'tri', f: 240, fm: 900, mix: 0.25 },
  codex: { w: 'square', f: 470, fm: 1600, q: 8 },
  gemini: { w: 'sine', f: 560, fm: 1300, vib: 7 },
  qwen: { w: 'pulse', f: 420, fm: 1100 },
  whale: { w: 'saw', f: 140, fm: 520 },
  kimi: { w: 'square', f: 350, fm: 1000 },
  z: { w: 'tri', f: 440, fm: 1300 },
};
function syllable(bus, t0, dur, v, f, o = {}) {
  const osc = new Osc(v.w, v.w === 'pulse' ? 0.3 : 0.5), osc2 = new Osc('square'), bp = new Biquad('bp', v.fm, 1.4), lp = new Biquad('lp', v.fm * 2.2, 0.7);
  const glide = o.glide ?? 0;
  bus.play(t0, dur, (t) => {
    const u = t / dur;
    let fr = f * (1 + glide * u) * (v.vib ? 1 + Math.sin(TAU * v.vib * t) * 0.02 : 1);
    if (v.q) fr = Math.round(fr / v.q) * v.q;
    const s = osc.next(fr) + (v.mix ? osc2.next(fr) * v.mix : 0);
    return (lp.run(s) * 0.6 + bp.run(s) * 0.8) * Math.min(1, t / 0.008) * Math.min(1, (dur - t) / 0.03);
  }, o.pan ?? 0, o.gain ?? 0.28);
}

export const SFX = {
  crickets(bus, t0, o) {
    const r = R(), dur = o.dur ?? 10;
    for (let t = 0.2; t < dur; t += 0.5 + r() * 0.9) {
      const pan = (r() - 0.5) * 1.4, f = 4200 + r() * 900;
      for (let c = 0; c < 3; c++) tone(bus, t0 + t + c * 0.07, 0.05, { f0: f, env: (u, tt) => Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(TAU * 60 * tt)), gain: 0.035 * (o.gain ?? 1), pan });
    }
  },
  cricket(bus, t0, o) { SFX.crickets(bus, t0, { dur: o.dur ?? 1, gain: 1.6 }); },
  sparkPulse(bus, t0, o) {
    [72, 76, 79, 84, 88].forEach((m, i) => INST.bell(bus, t0 + i * 0.09, 0.4, m, 0.22, -0.4 + i * 0.2));
    noise(bus, t0, 1.2, { type: 'hp', f0: 6000, gain: 0.05, env: (u) => Math.sin(Math.PI * u) });
  },
  stepsSoft(bus, t0, o) {
    const r = R(), dur = o.dur ?? 1;
    for (let t = 0; t < dur; t += 0.27) noise(bus, t0 + t, 0.06, { type: 'lp', f0: 500 + r() * 300, q: 0.8, gain: 0.22 * (o.gain ?? 1), pan: o.pan ?? 0, env: (u) => 1 - u });
  },
  stepsRobot(bus, t0, o) {
    const dur = o.dur ?? 1;
    for (let t = 0, i = 0; t < dur; t += 0.22, i++) { tone(bus, t0 + t, 0.05, { wave: 'square', f0: i % 2 ? 180 : 210, lp: 1200, gain: 0.08, pan: o.pan ?? 0, env: (u) => 1 - u }); noise(bus, t0 + t, 0.03, { type: 'hp', f0: 3000, gain: 0.08, pan: o.pan ?? 0, env: (u) => 1 - u }); }
  },
  whoosh(bus, t0, o) {
    const p = o.pitch ?? 1;
    noise(bus, t0, 0.6, { type: 'bp', f0: 300 * p, f1: 2400 * p, q: 1.2, gain: 0.35 * (o.gain ?? 1), pan: o.pan ?? 0, env: (u) => Math.sin(Math.PI * u) ** 2 });
  },
  whooshSoft(bus, t0, o) { SFX.whoosh(bus, t0, { pitch: 0.6 * (o.pitch ?? 1), gain: 0.5 * (o.gain ?? 1) }); },
  ignite(bus, t0, o) {
    noise(bus, t0, 0.5, { type: 'lp', f0: 200, f1: 3000, q: 1, gain: 0.45 * (o.gain ?? 1), pan: o.pan ?? 0, env: (u) => (u < 0.1 ? u * 10 : (1 - u) ** 2) });
    tone(bus, t0, 0.4, { f0: 90, f1: 220, gain: 0.25, pan: o.pan ?? 0, env: (u) => 1 - u });
    INST.bell(bus, t0 + 0.05, 0.3, 84, 0.15, o.pan ?? 0);
  },
  babble(bus, t0, o) {
    const v = VOICE[o.who] || VOICE.clawd, r = R(), n = o.n ?? 3, p = o.pitch ?? 1;
    let t = 0;
    for (let i = 0; i < n; i++) {
      const d = 0.075 + r() * 0.04;
      syllable(bus, t0 + t, d, v, v.f * p * Math.pow(2, (r() - 0.5) * 0.6 + (i === n - 1 ? 0.1 : 0)), { glide: (r() - 0.5) * 0.4, pan: o.pan ?? 0, gain: 0.26 * (o.gain ?? 1) });
      t += d + 0.025 + r() * 0.03;
    }
  },
  laugh(bus, t0, o) {
    const v = VOICE[o.who] || VOICE.clawd, n = 5;
    for (let i = 0; i < n; i++) {
      syllable(bus, t0 + i * 0.13, 0.08, v, v.f * (1.35 - i * 0.07), { glide: -0.15, gain: 0.26 * (o.gain ?? 1), pan: o.pan ?? 0 });
      noise(bus, t0 + i * 0.13, 0.06, { type: 'bp', f0: 1800, q: 1, gain: 0.05 * (o.gain ?? 1), env: (u) => 1 - u });
    }
  },
  scream(bus, t0, o) {
    const v = VOICE[o.who] || VOICE.qwen;
    syllable(bus, t0, 0.95, { ...v, vib: 9 }, v.f * 2.0, { glide: -0.25, gain: 0.32 * (o.gain ?? 1), pan: o.pan ?? 0 });
    noise(bus, t0, 0.95, { type: 'bp', f0: 1500, q: 1, gain: 0.06 * (o.gain ?? 1), env: (u) => 1 - u });
  },
  hum(bus, t0, o) {
    // Clawd hums the spark theme
    const mel = [7, 4, 7, 12, 11, 9, 7, 4, 2, 4, 0, 9, 5, 9, 12, 14, 12];
    const step = 0.42, dur = o.dur ?? 4;
    let t = 0, i = 0;
    while (t < dur - 0.3) {
      const m = 60 + mel[i % mel.length];
      tone(bus, t0 + t, step * 0.95, { wave: 'tri', f0: mtof(m) * 0.5, lp: 900, vib: 5, vibAmt: 0.006, gain: 0.07 * (o.gain ?? 1), env: (u) => Math.min(1, u * 8) * Math.min(1, (1 - u) * 6) });
      t += step * (i % 4 === 3 ? 2 : 1); i++;
    }
  },
  hop(bus, t0, o) { tone(bus, t0, 0.16, { f0: 260 * (o.pitch ?? 1), f1: 720 * (o.pitch ?? 1), gain: 0.18 * (o.gain ?? 1), pan: o.pan ?? 0, env: (u) => 1 - u }); },
  runAway(bus, t0, o) {
    const dur = o.dur ?? 1;
    for (let t = 0; t < dur; t += 0.09) noise(bus, t0 + t, 0.04, { type: 'lp', f0: 900, gain: 0.18, pan: -0.3 + t / dur * -0.5, env: (u) => 1 - u });
    SFX.whoosh(bus, t0 + dur * 0.3, { pitch: 1.4, gain: 0.5, pan: -0.6 });
  },
  blip(bus, t0, o) { tone(bus, t0, 0.07, { wave: 'square', f0: 660 * (o.pitch ?? 1), lp: 3000, gain: 0.12 * (o.gain ?? 1), env: (u) => 1 - u }); },
  chime(bus, t0, o) { const p = o.pitch ?? 1; [0, 4, 7, 12].forEach((d, i) => INST.bell(bus, t0 + i * 0.05, 0.5, 79 + d + Math.round(12 * Math.log2(p)), 0.18 * (o.gain ?? 1), -0.3 + i * 0.2)); },
  loading(bus, t0, o) { const dur = o.dur ?? 2; for (let t = 0; t < dur; t += 0.18) tone(bus, t0 + t, 0.05, { f0: 1200 + 300 * Math.sin(t * 9), gain: 0.04, env: (u) => 1 - u }); },
  crowdAmb(bus, t0, o) {
    const dur = o.dur ?? 10, g = o.gain ?? 1;
    noise(bus, t0, dur, { type: 'bp', f0: 600, q: 0.7, gain: 0.07 * g, env: fadeEnv(0.1, 0.1) });
    const r = R(); const keys = Object.keys(VOICE).filter((k) => k !== 'whale');
    for (let t = 0; t < dur; t += 0.12 + r() * 0.2) {
      const v = VOICE[keys[Math.floor(r() * keys.length)]];
      syllable(bus, t0 + t, 0.06 + r() * 0.05, v, v.f * (0.7 + r() * 0.6), { gain: 0.04 * g, pan: (r() - 0.5) * 1.6, glide: (r() - 0.5) * 0.5 });
    }
  },
  murmur(bus, t0, o) { const r = R(); for (let i = 0; i < 6; i++) syllable(bus, t0 + r() * (o.dur ?? 1), 0.18, VOICE.kimi, 260 + r() * 120, { glide: 0.35, gain: 0.08, pan: (r() - 0.5) * 1.4 }); },
  cheer(bus, t0, o) {
    const dur = o.dur ?? 2, k = o.k ?? 1, r = R();
    noise(bus, t0, dur, { type: 'bp', f0: 900, f1: 1400, q: 0.6, gain: 0.16 * k, env: (u) => Math.min(1, u * 6) * (1 - u) ** 0.7 });
    for (let i = 0; i < 26 * k; i++) {
      const v = VOICE[['clawd', 'gemini', 'kimi', 'z', 'qwen'][i % 5]];
      syllable(bus, t0 + r() * dur * 0.7, 0.15 + r() * 0.2, v, v.f * (1.2 + r() * 0.8), { glide: 0.3 + r() * 0.5, gain: 0.05 * k, pan: (r() - 0.5) * 1.8 });
    }
    SFX.clap(bus, t0 + 0.1, { dur: dur * 0.9, k: 0.6 * k });
  },
  clap(bus, t0, o) {
    const dur = o.dur ?? 1, k = o.k ?? 1, r = R();
    for (let i = 0; i < dur * 40 * k; i++) INST.clap(bus, t0 + r() * dur, 0, 0, 0.12 * (0.5 + r() * 0.5), (r() - 0.5) * 1.6);
  },
  launch(bus, t0, o) {
    noise(bus, t0, 1.6, { type: 'bp', f0: 300 * (o.pitch ?? 1), f1: 1800 * (o.pitch ?? 1), q: 1.4, gain: 0.25 * (o.gain ?? 1), env: (u) => Math.sin(Math.PI * u) });
    [79, 83, 86, 91].forEach((m, i) => INST.bell(bus, t0 + 0.3 + i * 0.12, 0.3, m, 0.12 * (o.gain ?? 1), 0.2));
  },
  type(bus, t0, o) { const r = R(); for (let i = 0; i < (o.n ?? 5); i++) noise(bus, t0 + i * 0.08 + r() * 0.02, 0.02, { type: 'hp', f0: 2500, gain: 0.18, pan: 0.2, env: (u) => 1 - u }); },
  rocket(bus, t0, o) {
    const p = o.pitch ?? 1;
    tone(bus, t0, 0.6, { f0: 700 * p, f1: 2600 * p, gain: 0.09, env: (u) => Math.sin(Math.PI * u) });
    noise(bus, t0, 0.6, { type: 'hp', f0: 3000, gain: 0.08, env: (u) => 1 - u });
  },
  firework(bus, t0, o) {
    const p = o.pitch ?? 1;
    tone(bus, t0, 0.5, { f0: 90 * p, f1: 40 * p, gain: 0.45, pan: o.pan ?? 0, env: (u) => (1 - u) ** 2 });
    noise(bus, t0, 0.4, { type: 'lp', f0: 1500, gain: 0.35, pan: o.pan ?? 0, env: (u) => (1 - u) ** 3 });
    clicks(bus, t0 + 0.2, 1.1, 60, { fc: 4000, gain: 0.25, pan: o.pan ?? 0, shape: (u) => 1 - u });
  },
  float(bus, t0, o) { tone(bus, t0, o.dur ?? 1, { f0: 880, f1: 990, gain: 0.04, vib: 6, vibAmt: 0.02, env: (u) => Math.sin(Math.PI * u) }); },
  thud(bus, t0, o) { tone(bus, t0, 0.25, { f0: 110, f1: 50, gain: 0.4 * (o.gain ?? 1), env: (u) => (1 - u) ** 2 }); noise(bus, t0, 0.05, { type: 'lp', f0: 800, gain: 0.2, env: (u) => 1 - u }); },
  pop(bus, t0, o) { tone(bus, t0, 0.09, { f0: 500, f1: 1300, gain: 0.25 * (o.gain ?? 1), pan: o.pan ?? 0, env: (u) => 1 - u }); },
  match(bus, t0, o) { noise(bus, t0, 0.18, { type: 'hp', f0: 2500, f1: 5000, gain: 0.25, env: (u) => (1 - u) }); noise(bus, t0 + 0.12, 0.35, { type: 'lp', f0: 600, f1: 1800, gain: 0.18, env: (u) => Math.sin(Math.PI * u) }); },
  sparkler(bus, t0, o) {
    const dur = o.dur ?? 1.5;
    clicks(bus, t0, dur, 260, { fc: 5000, gain: 0.16 * (o.gain ?? 1), pan: 0.2, spread: 0.5, shape: (u) => Math.min(1, u * 10) * (1 - u * 0.5) });
    noise(bus, t0, dur, { type: 'hp', f0: 6000, gain: 0.05 * (o.gain ?? 1), env: fadeEnv(0.05, 0.1) });
  },
  fizzle(bus, t0, o) { noise(bus, t0, 0.6, { type: 'bp', f0: 5000, f1: 1500, q: 1, gain: 0.25 * (o.gain ?? 1), env: (u) => (1 - u) ** 1.5 }); },
  flip(bus, t0) { INST.wood(bus, t0, 0, 70, 0.25); INST.wood(bus, t0 + 0.11, 0, 66, 0.2); },
  blow(bus, t0, o) { noise(bus, t0, o.dur ?? 1, { type: 'bp', f0: 900, f1: 1200, q: 1, gain: 0.2, env: (u) => Math.min(1, u * 4) * (1 - u * 0.4) }); },
  deflate(bus, t0, o) {
    const p = o.pitch ?? 1;
    const osc = new Osc('square', 0.3), lp = new Biquad('lp', 900, 1);
    bus.play(t0, 0.9, (t) => lp.run(osc.next((150 - 90 * t) * p * (1 + Math.sin(TAU * 28 * t) * 0.12))) * (1 - t / 0.9) * 0.3, 0, o.gain ?? 1);
    noise(bus, t0, 0.9, { type: 'bp', f0: 1200, f1: 400, gain: 0.12, env: (u) => 1 - u });
  },
  sadTrombone(bus, t0) { [58, 57, 56].forEach((m, i) => INST.brass(bus, t0 + i * 0.42, 0.36, m, 0.35, 0)); INST.brass(bus, t0 + 1.26, 1.2, 55, 0.35, 0); },
  snore(bus, t0, o) {
    const dur = o.dur ?? 2;
    for (let t = 0; t < dur; t += 1.6) {
      noise(bus, t0 + t, 0.8, { type: 'lp', f0: 300, gain: 0.18, env: (u) => Math.sin(Math.PI * u) });
      tone(bus, t0 + t + 0.85, 0.6, { wave: 'saw', f0: 95, f1: 80, lp: 400, gain: 0.08, env: (u) => Math.sin(Math.PI * u) });
    }
  },
  wind(bus, t0, o) { noise(bus, t0, o.dur ?? 2, { type: 'bp', f0: 400, f1: 900, q: 0.8, gain: 0.25 * (o.gain ?? 1), env: (u) => Math.sin(Math.PI * u) }); },
  windSoft(bus, t0, o) { noise(bus, t0, o.dur ?? 4, { type: 'bp', f0: 350, f1: 500, q: 0.6, gain: 0.07, env: fadeEnv(0.2, 0.2) }); },
  paperSlap(bus, t0, o) { noise(bus, t0, 0.06, { type: 'bp', f0: 1500, gain: 0.5 * (o.gain ?? 1), env: (u) => 1 - u }); SFX.paper(bus, t0 + 0.05, {}); },
  paper(bus, t0) { clicks(bus, t0, 0.4, 90, { fc: 2500, gain: 0.18 }); },
  whaleSong(bus, t0, o) { const p = o.pitch ?? 1; tone(bus, t0, 1.4, { f0: 220 * p, f1: 330 * p, lin: true, wave: 'tri', lp: 800, vib: 4, vibAmt: 0.03, gain: 0.12, pan: 0.5, env: (u) => Math.sin(Math.PI * u) }); },
  spray(bus, t0, o) { noise(bus, t0, o.dur ?? 0.8, { type: 'bp', f0: 3000, q: 0.8, gain: 0.3, env: (u) => Math.min(1, u * 10) * (1 - u) }); },
  grab(bus, t0) { noise(bus, t0, 0.05, { type: 'bp', f0: 1200, gain: 0.25, env: (u) => 1 - u }); },
  throw(bus, t0, o) { SFX.whoosh(bus, t0, { pitch: 1.6 * (o.pitch ?? 1), gain: 0.6 }); },
  catch(bus, t0) { tone(bus, t0, 0.08, { f0: 400, f1: 250, gain: 0.2, env: (u) => 1 - u }); },
  sniff(bus, t0) { for (let i = 0; i < 2; i++) noise(bus, t0 + i * 0.22, 0.14, { type: 'bp', f0: 2200, q: 1.5, gain: 0.12, env: (u) => Math.sin(Math.PI * u) }); },
  rainStart(bus, t0, o) { SFX.rain(bus, t0, { dur: o.dur ?? 1, gain: 0.6, fadeIn: 0.9 }); },
  thunder(bus, t0, o) {
    noise(bus, t0, 0.15, { type: 'hp', f0: 1500, gain: 0.35 * (o.gain ?? 1), env: (u) => 1 - u });
    noise(bus, t0 + 0.05, 3.2, { type: 'lp', f0: 180, f1: 90, q: 0.7, gain: 1.4 * (o.gain ?? 1), env: (u) => Math.min(1, u * 8) * (1 - u) ** 2 * (0.7 + 0.3 * Math.sin(u * 40)) });
  },
  rain(bus, t0, o) {
    const dur = o.dur ?? 10, g = o.gain ?? 1, fi = o.fadeIn ?? 0.6, fo = o.fadeOut ?? 0.6;
    const e = (u) => Math.min(1, (u * dur) / fi) * Math.min(1, ((1 - u) * dur) / fo);
    noise(bus, t0, dur, { type: 'lp', f0: 5000, q: 0.5, gain: 0.09 * g, env: e, pan: -0.3 });
    noise(bus, t0, dur, { type: 'lp', f0: 4600, q: 0.5, gain: 0.09 * g, env: e, pan: 0.3 });
    clicks(bus, t0, dur, 30, { fc: 2500, gain: 0.12 * g, spread: 1.8, shape: e });
  },
  leafRain(bus, t0, o) { clicks(bus, t0, o.dur ?? 5, 45, { fc: 1800, gain: 0.16, spread: 0.4, shape: (u) => Math.min(1, u * 10) * (1 - u * 0.3) }); },
  drip(bus, t0) { tone(bus, t0, 0.12, { f0: 700, f1: 1700, gain: 0.25, env: (u) => (1 - u) ** 2 }); },
  rippleSwell(bus, t0) { tone(bus, t0, 1.6, { f0: 110, f1: 82, gain: 0.18, env: (u) => Math.sin(Math.PI * u) }); [84, 79, 76, 72].forEach((m, i) => INST.bell(bus, t0 + i * 0.16, 0.4, m, 0.08, 0)); },
  shimmer(bus, t0, o) { const dur = o.dur ?? 2; for (let i = 0; i < 14; i++) INST.bell(bus, t0 + (i / 14) * dur, 0.3, 84 + [0, 4, 7, 11, 12, 16][i % 6], 0.06, Math.sin(i) * 0.6); },
  emberFlicker(bus, t0, o) { clicks(bus, t0, o.dur ?? 2, 12, { fc: 2500, gain: 0.08 }); tone(bus, t0, o.dur ?? 2, { f0: 1320, gain: 0.015, vib: 3, vibAmt: 0.01, env: (u) => Math.sin(Math.PI * u) }); },
  fireCrackle(bus, t0, o) {
    const dur = o.dur ?? 10, g = o.gain ?? 1;
    noise(bus, t0, dur, { type: 'lp', f0: 300, gain: 0.08 * g, env: fadeEnv(0.05, 0.05), pan: 0.3 });
    clicks(bus, t0, dur, 18, { fc: 2200, gain: 0.22 * g, pan: 0.3, spread: 0.4 });
  },
  rustle(bus, t0, o) { clicks(bus, t0, 0.5, 120, { fc: 3500, gain: 0.12 * (o.gain ?? 1), pan: -0.3 }); noise(bus, t0, 0.5, { type: 'hp', f0: 2500, gain: 0.06, env: (u) => Math.sin(Math.PI * u) }); },
  peek(bus, t0) { tone(bus, t0, 0.12, { f0: 500, f1: 900, gain: 0.12, env: (u) => 1 - u }); },
  tiptoe(bus, t0, o) { INST.pluck(bus, t0, 0.12, 84 + Math.round(12 * Math.log2(o.pitch ?? 1)), 0.18, -0.3); },
  slurp(bus, t0, o) {
    const r = R(), dur = o.dur ?? 2;
    for (let t = 0; t < dur; t += 0.05 + r() * 0.06) tone(bus, t0 + t, 0.05, { f0: 250 + r() * 300 + t * 120, f1: 600 + r() * 400, gain: 0.07, pan: -0.2, env: (u) => Math.sin(Math.PI * u) });
  },
  counter(bus, t0, o) { const dur = o.dur ?? 2; let t = 0, dt = 0.12; while (t < dur) { tone(bus, t0 + t, 0.02, { wave: 'square', f0: 1800, gain: 0.04, env: (u) => 1 - u }); t += dt; dt = Math.max(0.03, dt * 0.93); } },
  freeze(bus, t0) { noise(bus, t0, 0.35, { type: 'bp', f0: 3000, f1: 300, q: 2, gain: 0.35, env: (u) => 1 - u }); tone(bus, t0, 0.35, { wave: 'saw', f0: 600, f1: 90, lp: 2000, gain: 0.1, env: (u) => 1 - u }); },
  shrug(bus, t0) { syllable(bus, t0, 0.12, VOICE.clawd, 260, { glide: 0.2, gain: 0.2 }); syllable(bus, t0 + 0.16, 0.16, VOICE.clawd, 220, { glide: -0.2, gain: 0.2 }); },
  wink(bus, t0) { INST.bell(bus, t0, 0.2, 96, 0.22, 0.3); },
  sit(bus, t0) { tone(bus, t0, 0.15, { f0: 120, f1: 70, gain: 0.25, env: (u) => 1 - u }); },
  clink(bus, t0) { INST.bell(bus, t0, 0.1, 100, 0.12, 0); INST.bell(bus, t0 + 0.07, 0.1, 103, 0.1, 0); },
  flameSoft(bus, t0, o) { noise(bus, t0, o.dur ?? 2, { type: 'lp', f0: 500, gain: 0.08, env: (u) => Math.sin(Math.PI * u) }); clicks(bus, t0, o.dur ?? 2, 10, { fc: 2500, gain: 0.08 }); },
  hug(bus, t0) { tone(bus, t0, 0.3, { f0: 180, f1: 120, wave: 'tri', gain: 0.18, env: (u) => Math.sin(Math.PI * u) }); INST.bell(bus, t0 + 0.2, 0.4, 88, 0.1, 0); },
  colorSweep(bus, t0, o) { const dur = o.dur ?? 1.5; [72, 76, 79, 83, 84, 88, 91, 95].forEach((m, i) => INST.bell(bus, t0 + (i / 8) * dur, 0.3, m, 0.1, -0.5 + i / 8)); noise(bus, t0, dur, { type: 'hp', f0: 5000, gain: 0.04, env: (u) => Math.sin(Math.PI * u) }); },
  shootingStar(bus, t0) { tone(bus, t0, 0.8, { f0: 3200, f1: 900, gain: 0.05, pan: 0.4, env: (u) => Math.sin(Math.PI * u) }); },
  camera(bus, t0) { noise(bus, t0, 0.03, { type: 'hp', f0: 2000, gain: 0.4, env: (u) => 1 - u }); noise(bus, t0 + 0.09, 0.03, { type: 'hp', f0: 2500, gain: 0.3, env: (u) => 1 - u }); tone(bus, t0 + 0.1, 0.5, { f0: 3000, f1: 4500, gain: 0.03, env: (u) => 1 - u }); },
  photoSlide(bus, t0) { noise(bus, t0, 0.5, { type: 'bp', f0: 1200, f1: 2600, q: 0.8, gain: 0.12, env: (u) => Math.sin(Math.PI * u) }); },
  workshop(bus, t0, o) {
    const dur = o.dur ?? 6, r = R();
    for (let t = 0; t < dur; t += 0.5) { INST.wood(bus, t0 + t, 0, 64, 0.25, -0.4); if (r() < 0.5) noise(bus, t0 + t + 0.25, 0.2, { type: 'bp', f0: 2500, q: 2, gain: 0.08, pan: 0.4, env: (u) => Math.sin(Math.PI * u) }); }
  },
  magicRise(bus, t0, o) { const dur = o.dur ?? 1.4; tone(bus, t0, dur, { wave: 'tri', f0: 300, f1: 1200, gain: 0.08, env: (u) => Math.sin(Math.PI * u) }); SFX.shimmer(bus, t0, { dur }); },
  flyWind(bus, t0, o) { noise(bus, t0, o.dur ?? 5, { type: 'bp', f0: 300, f1: 900, q: 0.7, gain: 0.18, env: fadeEnv(0.15, 0.15) }); },
  starBurst(bus, t0) { tone(bus, t0, 1.2, { f0: 70, f1: 35, gain: 0.5, env: (u) => (1 - u) ** 2 }); noise(bus, t0, 0.8, { type: 'lp', f0: 2000, gain: 0.3, env: (u) => (1 - u) ** 3 }); SFX.shimmer(bus, t0 + 0.1, { dur: 1.6 }); INST.crash(bus, t0, 0, 0, 0.3); },
  birds(bus, t0, o) {
    const r = R(), dur = o.dur ?? 5;
    for (let t = 0.2; t < dur; t += 0.4 + r() * 0.9) {
      const f = 2400 + r() * 1800, pan = (r() - 0.5) * 1.6, n = 2 + Math.floor(r() * 3);
      for (let c = 0; c < n; c++) tone(bus, t0 + t + c * 0.09, 0.07, { f0: f, f1: f * (1.3 + r() * 0.3), gain: 0.03 * (o.gain ?? 1), pan, env: (u) => Math.sin(Math.PI * u) });
    }
  },
  powerUp(bus, t0, o) { const dur = o.dur ?? 0.8; tone(bus, t0, dur, { wave: 'saw', f0: 110, f1: 880, lp: 2500, gain: 0.12, env: (u) => Math.min(1, u * 3) }); noise(bus, t0, dur, { type: 'bp', f0: 400, f1: 4000, gain: 0.08, env: (u) => u }); },
  blast(bus, t0) { tone(bus, t0, 0.9, { f0: 80, f1: 35, gain: 0.55, env: (u) => (1 - u) ** 2 }); noise(bus, t0, 1.0, { type: 'bp', f0: 3000, f1: 400, q: 0.7, gain: 0.4, env: (u) => (1 - u) ** 2 }); INST.crash(bus, t0, 0, 0, 0.3); },
  tumble(bus, t0) { [0, 0.18, 0.33].forEach((d, i) => tone(bus, t0 + d, 0.1, { f0: 300 - i * 60, f1: 180 - i * 40, wave: 'tri', gain: 0.2, env: (u) => 1 - u })); },
  blinkEyes(bus, t0) { tone(bus, t0, 0.04, { f0: 2400, gain: 0.08, env: (u) => 1 - u }); tone(bus, t0 + 0.12, 0.04, { f0: 2400, gain: 0.08, env: (u) => 1 - u }); },
  alarm(bus, t0, o) { const d = o.dur ?? 0.8; for (let i = 0; i < 2; i++) tone(bus, t0 + i * (d / 2), d * 0.42, { wave: 'square', f0: 220, lp: 1500, gain: 0.16, pan: 0.3, env: (u) => (u < 0.9 ? 1 : (1 - u) * 10) }); },
  gulp(bus, t0) { tone(bus, t0, 0.18, { f0: 400, f1: 180, gain: 0.2, env: (u) => Math.sin(Math.PI * u) }); },
  fireWall(bus, t0, o) { const dur = o.dur ?? 2; noise(bus, t0, dur, { type: 'lp', f0: 300, f1: 1400, gain: 0.45, env: (u) => Math.min(1, u * 6) * (1 - u) ** 0.8 }); clicks(bus, t0, dur, 30, { fc: 2000, gain: 0.25 }); tone(bus, t0, 0.5, { f0: 60, f1: 40, gain: 0.4, env: (u) => 1 - u }); },
  flashBang(bus, t0) { noise(bus, t0, 0.3, { type: 'hp', f0: 800, gain: 0.6, env: (u) => (1 - u) ** 2 }); tone(bus, t0, 0.5, { f0: 90, f1: 40, gain: 0.5, env: (u) => (1 - u) ** 2 }); tone(bus, t0 + 0.1, 2.2, { f0: 3600, gain: 0.025, env: (u) => 1 - u }); },
  glassCrack(bus, t0) { noise(bus, t0, 0.08, { type: 'hp', f0: 3000, gain: 0.5, env: (u) => 1 - u }); clicks(bus, t0 + 0.03, 0.3, 60, { fc: 6000, gain: 0.25 }); INST.bell(bus, t0, 0.1, 105, 0.08, 0); },
  drain(bus, t0, o) { const r = R(), dur = o.dur ?? 1.2; for (let t = 0; t < dur; t += 0.12 + r() * 0.08) tone(bus, t0 + t, 0.1, { f0: 180 + r() * 60, f1: 320 + r() * 120, gain: 0.12, env: (u) => Math.sin(Math.PI * u) }); },
  yawn(bus, t0) { syllable(bus, t0, 0.8, VOICE.clawd, 200, { glide: 0.35, gain: 0.2 }); },
  whistle(bus, t0) { [84, 88, 86].forEach((m, i) => tone(bus, t0 + i * 0.2, 0.18, { f0: mtof(m), f1: mtof(m) * 1.02, vib: 6, vibAmt: 0.01, gain: 0.08, env: (u) => Math.sin(Math.PI * u) })); },
  heart(bus, t0) { [84, 91].forEach((m, i) => INST.bell(bus, t0 + i * 0.12, 0.3, m, 0.15, 0.2)); },
};
