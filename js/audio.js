let ctx = null;
let enabled = true;
let noiseBuf = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq = 440, type = "sine", dur = 0.18, gain = 0.12, slide = 0, delay = 0 }) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function sweep(from, to, dur, gain) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  lp.type = "lowpass";
  lp.frequency.value = 4200;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp).connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function whoosh(dur, gain, from, to) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  if (!noiseBuf) {
    const len = Math.floor(ac.sampleRate);
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(from || 300, t);
  bp.frequency.exponentialRampToValueAtTime(to || 3200, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  get enabled() {
    return enabled;
  },
  toggle() {
    enabled = !enabled;
    if (enabled) ensure();
    return enabled;
  },
  hover() {
    tone({ freq: 720, type: "triangle", dur: 0.06, gain: 0.03 });
  },
  unlock() {
    tone({ freq: 523, type: "triangle", dur: 0.12, gain: 0.09 });
    tone({ freq: 784, type: "triangle", dur: 0.16, gain: 0.08, delay: 0.06 });
    tone({ freq: 1047, type: "sine", dur: 0.3, gain: 0.07, delay: 0.12 });
    for (let i = 0; i < 5; i++) {
      tone({ freq: 1300 + Math.random() * 1800, type: "sine", dur: 0.08, gain: 0.02, delay: 0.12 + i * 0.03 });
    }
  },
  levelUp() {
    [392, 523, 659, 784].forEach((f, i) =>
      tone({ freq: f, type: "triangle", dur: 0.6, gain: 0.09, delay: i * 0.05 })
    );
    sweep(180, 1500, 0.55, 0.05);
    [1047, 1319, 1568, 2093].forEach((f, i) =>
      tone({ freq: f, type: "sine", dur: 0.55, gain: 0.055, delay: 0.34 + i * 0.08 })
    );
    whoosh(0.5, 0.07, 300, 3600);
  },
  deny() {
    tone({ freq: 170, type: "sawtooth", dur: 0.22, gain: 0.09, slide: -80 });
  },
  master() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
      tone({ freq: f, type: "triangle", dur: 0.6, gain: 0.1, delay: i * 0.13 })
    );
    sweep(140, 2200, 0.9, 0.06);
    whoosh(0.9, 0.08, 200, 4200);
  },
  reset() {
    tone({ freq: 320, type: "sawtooth", dur: 0.45, gain: 0.08, slide: -200 });
  },
};
