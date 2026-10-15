let ctx = null;
let enabled = true;

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
    tone({ freq: 392, type: "triangle", dur: 0.14, gain: 0.1 });
    tone({ freq: 587, type: "triangle", dur: 0.2, gain: 0.09, delay: 0.07 });
    tone({ freq: 784, type: "sine", dur: 0.3, gain: 0.08, delay: 0.14 });
  },
  deny() {
    tone({ freq: 160, type: "sawtooth", dur: 0.22, gain: 0.09, slide: -70 });
  },
  level() {
    tone({ freq: 523, type: "sine", dur: 0.18, gain: 0.1 });
    tone({ freq: 659, type: "sine", dur: 0.18, gain: 0.1, delay: 0.12 });
    tone({ freq: 880, type: "sine", dur: 0.32, gain: 0.11, delay: 0.24 });
  },
  master() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, type: "triangle", dur: 0.5, gain: 0.1, delay: i * 0.13 })
    );
  },
  reset() {
    tone({ freq: 300, type: "sawtooth", dur: 0.4, gain: 0.08, slide: -180 });
  },
};
