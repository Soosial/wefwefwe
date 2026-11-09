// Audio core: stereo bus, oscillators, filters, envelopes, instruments and a Freeverb-style reverb.
export const SR = 44100;

export class Bus {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.n);
    this.R = new Float32Array(this.n);
  }
  // render fn(tLocal, k) over [t0, t0+dur) with constant-power pan (-1..1) and gain
  play(t0, dur, fn, pan = 0, gain = 1) {
    const a = Math.max(0, Math.floor(t0 * SR)), b = Math.min(this.n, Math.floor((t0 + dur) * SR));
    const p = (Math.max(-1, Math.min(1, pan)) + 1) * Math.PI / 4;
    const gl = Math.cos(p) * gain, gr = Math.sin(p) * gain;
    for (let i = a; i < b; i++) {
      const v = fn((i - t0 * SR) / SR, i - a);
      if (v !== v) continue;
      this.L[i] += v * gl; this.R[i] += v * gr;
    }
  }
}

// deterministic noise
export function rnd(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;

// PolyBLEP band-limited oscillators (phase in cycles)
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
export class Osc {
  constructor(type = 'sine', duty = 0.5) { this.ph = 0; this.type = type; this.duty = duty; this.tri = 0; }
  next(f) {
    const dt = f / SR;
    const p = this.ph;
    let v;
    switch (this.type) {
      case 'saw': v = 2 * p - 1 - blep(p, dt); break;
      case 'square': case 'pulse': {
        const d = this.duty;
        v = (p < d ? 1 : -1) + blep(p, dt) - blep((p - d + 1) % 1, dt);
        break;
      }
      case 'tri': v = 4 * Math.abs(p - 0.5) - 1; break;
      default: v = Math.sin(p * TAU);
    }
    this.ph = (p + dt) % 1;
    return v;
  }
}

// RBJ biquad
export class Biquad {
  constructor(type = 'lp', f = 1000, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = this.q) {
    this.q = q;
    const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; } // band-pass (constant peak gain)
    a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export const env = (t, a, d, s, r, dur) => {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur) return s;
  return Math.max(0, s * (1 - (t - dur) / r));
};
export const perc = (t, a, k) => (t < a ? t / a : Math.exp(-(t - a) * k));

// ---------------- instruments: note(bus, t0, dur, midi, vel, pan) ----------------
export const INST = {
  bell(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f = mtof(m), len = Math.max(dur, 1.6);
    bus.play(t0, len + 0.05, (t) => {
      const I = 2.2 * Math.exp(-t * 5);
      return Math.sin(TAU * f * t + I * Math.sin(TAU * f * 3.5 * t)) * perc(t, 0.002, 2.6) * 0.5 + Math.sin(TAU * f * 2 * t) * perc(t, 0.002, 6) * 0.12;
    }, pan, vel);
  },
  box(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f = mtof(m);
    bus.play(t0, 1.4, (t) => (Math.sin(TAU * f * t + 1.2 * Math.exp(-t * 9) * Math.sin(TAU * f * 5 * t)) * 0.5 + Math.sin(TAU * f * 4 * t) * 0.08 * Math.exp(-t * 12)) * perc(t, 0.001, 3.6), pan, vel);
  },
  lead(bus, t0, dur, m, vel = 0.5, pan = 0, o = {}) {
    const f0 = mtof(m), osc = new Osc('pulse', o.duty ?? 0.25), lp = new Biquad('lp', o.cut ?? 3200, 0.8);
    const rel = o.rel ?? 0.08;
    bus.play(t0, dur + rel, (t) => {
      const vib = t > 0.15 ? Math.sin(TAU * 5.5 * t) * 0.004 * Math.min(1, (t - 0.15) * 4) : 0;
      return lp.run(osc.next(f0 * (1 + vib))) * env(t, 0.01, 0.12, 0.7, rel, dur) * 0.32;
    }, pan, vel);
  },
  brass(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f0 = mtof(m), a = new Osc('saw'), b = new Osc('saw'), lp = new Biquad('lp', 600, 1.2);
    bus.play(t0, dur + 0.12, (t, k) => {
      if (k % 32 === 0) lp.set(600 + 2600 * Math.min(1, t * 8) * (0.7 + 0.3 * Math.exp(-t * 3)));
      return lp.run(a.next(f0) * 0.5 + b.next(f0 * 1.004) * 0.5) * env(t, 0.03, 0.15, 0.75, 0.12, dur) * 0.33;
    }, pan, vel);
  },
  pluck(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f = mtof(m), N = Math.max(2, Math.round(SR / f)), buf = new Float32Array(N), r = rnd(m * 31 + Math.floor(t0 * 100));
    for (let i = 0; i < N; i++) buf[i] = r() * 2 - 1;
    let idx = 0, last = 0;
    const len = Math.min(2.5, Math.max(0.6, dur * 2));
    bus.play(t0, len, (t) => {
      const v = buf[idx];
      const nx = buf[(idx + 1) % N];
      buf[idx] = (v + nx) * 0.5 * 0.996;
      idx = (idx + 1) % N;
      last = last * 0.3 + v * 0.7;
      return last * 0.45 * (t > len - 0.05 ? (len - t) / 0.05 : 1);
    }, pan, vel);
  },
  bass(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f = mtof(m), o1 = new Osc('tri'), o2 = new Osc('square', 0.5), lp = new Biquad('lp', 900, 0.9);
    bus.play(t0, dur + 0.06, (t) => lp.run(o1.next(f) * 0.8 + o2.next(f) * 0.18) * env(t, 0.005, 0.08, 0.75, 0.06, dur) * 0.55, pan, vel);
  },
  pad(bus, t0, dur, m, vel = 0.5, pan = 0, o = {}) {
    const f = mtof(m), os = [new Osc('saw'), new Osc('saw'), new Osc('saw')], lp = new Biquad('lp', o.cut ?? 1300, 0.7);
    const at = o.attack ?? 0.5, rel = o.rel ?? 0.8;
    bus.play(t0, dur + rel, (t) => lp.run(os[0].next(f * 0.996) + os[1].next(f) + os[2].next(f * 1.005)) * env(t, at, 0.3, 0.85, rel, dur) * 0.09, pan, vel);
  },
  strings(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f = mtof(m), os = [new Osc('saw'), new Osc('saw')], lp = new Biquad('lp', 2200, 0.7);
    bus.play(t0, dur + 0.6, (t) => {
      const vib = 1 + Math.sin(TAU * 5 * t) * 0.003;
      return lp.run(os[0].next(f * vib * 0.998) + os[1].next(f * vib * 1.003)) * env(t, 0.35, 0.3, 0.85, 0.6, dur) * 0.12;
    }, pan, vel);
  },
  piano(bus, t0, dur, m, vel = 0.5, pan = 0) {
    const f = mtof(m), len = Math.min(4, Math.max(1.5, dur + 1.2));
    bus.play(t0, len, (t) => {
      let v = 0;
      for (let h = 1; h <= 5; h++) v += Math.sin(TAU * f * h * (1 + 0.0004 * h * h) * t) * Math.exp(-t * (1.1 + h * 0.9)) / (h * h * 0.6 + 0.4);
      const off = t > dur ? Math.exp(-(t - dur) * 5) : 1;
      return v * 0.28 * Math.min(1, t * 300) * off;
    }, pan, vel);
  },
  // drums (m ignored)
  kick(bus, t0, _d, _m, vel = 0.7) { bus.play(t0, 0.35, (t) => Math.sin(TAU * (45 * t + 90 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 9) * 0.9, 0, vel); },
  snare(bus, t0, _d, _m, vel = 0.5, pan = 0) {
    const r = rnd(Math.floor(t0 * 1000) + 3), bp = new Biquad('bp', 3000, 0.8);
    bus.play(t0, 0.25, (t) => (bp.run(r() * 2 - 1) * Math.exp(-t * 18) * 0.9 + Math.sin(TAU * 190 * t) * Math.exp(-t * 25) * 0.4), pan, vel);
  },
  hat(bus, t0, _d, _m, vel = 0.3, pan = 0.2) {
    const r = rnd(Math.floor(t0 * 1000) + 7), hp = new Biquad('hp', 7000, 0.7);
    bus.play(t0, 0.08, (t) => hp.run(r() * 2 - 1) * Math.exp(-t * 60), pan, vel);
  },
  clap(bus, t0, _d, _m, vel = 0.4, pan = 0) {
    const r = rnd(Math.floor(t0 * 1000) + 11), bp = new Biquad('bp', 1500, 0.9);
    bus.play(t0, 0.2, (t) => bp.run(r() * 2 - 1) * (t < 0.03 ? (Math.floor(t * 300) % 3 === 0 ? 1 : 0.4) : Math.exp(-(t - 0.03) * 25)), pan, vel);
  },
  wood(bus, t0, _d, m = 76, vel = 0.4, pan = 0) {
    const f = mtof(m);
    bus.play(t0, 0.12, (t) => (Math.sin(TAU * f * t) * 0.7 + Math.sin(TAU * f * 2.7 * t) * 0.3) * Math.exp(-t * 40), pan, vel);
  },
  tom(bus, t0, _d, m = 45, vel = 0.5, pan = 0) {
    const f = mtof(m);
    bus.play(t0, 0.4, (t) => Math.sin(TAU * f * t * (1 - t * 0.4)) * Math.exp(-t * 8), pan, vel);
  },
  crash(bus, t0, _d, _m, vel = 0.4, pan = 0) {
    const r = rnd(Math.floor(t0 * 1000) + 13), hp = new Biquad('hp', 4000, 0.6);
    bus.play(t0, 2.2, (t) => hp.run(r() * 2 - 1) * Math.exp(-t * 2.2) * (t < 0.005 ? t / 0.005 : 1), pan, vel);
  },
};

// Freeverb-lite (mono in, stereo out)
export function reverb(L, R, o = {}) {
  const room = o.room ?? 0.82, damp = o.damp ?? 0.3, wet = o.wet ?? 0.25, n = L.length;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const mk = (len) => ({ b: new Float32Array(len), i: 0, s: 0 });
  const chans = [0, 23].map((sp) => ({ c: combs.map((l) => mk(l + sp)), a: aps.map((l) => mk(l + sp)) }));
  const outL = new Float32Array(n), outR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (L[i] + R[i]) * 0.015;
    for (let ch = 0; ch < 2; ch++) {
      const C = chans[ch];
      let y = 0;
      for (const c of C.c) {
        const v = c.b[c.i];
        c.s = v * (1 - damp) + c.s * damp;
        c.b[c.i] = x + c.s * room;
        c.i = (c.i + 1) % c.b.length;
        y += v;
      }
      for (const a of C.a) {
        const v = a.b[a.i];
        a.b[a.i] = y + v * 0.5;
        a.i = (a.i + 1) % a.b.length;
        y = v - y;
      }
      if (ch === 0) outL[i] = y; else outR[i] = y;
    }
  }
  for (let i = 0; i < n; i++) { L[i] = L[i] * (1 - wet * 0.5) + outL[i] * wet; R[i] = R[i] * (1 - wet * 0.5) + outR[i] * wet; }
}
