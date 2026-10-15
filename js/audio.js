let ctx = null;
let enabled = true;
let dry = null;
let wet = null;
let noiseBuf = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  if (!dry) buildBuses(ctx);
  return ctx;
}

/* Shared dry + reverb buses. Reverb is a synthesized impulse response so
   everything sits in a big, damp, cathedral-like space instead of sounding dry. */
function buildBuses(ac) {
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);

  dry = ac.createGain();
  dry.gain.value = 0.85;
  dry.connect(master);

  wet = ac.createGain();
  wet.gain.value = 0.55;

  const conv = ac.createConvolver();
  conv.buffer = makeImpulse(ac, 2.6, 2.4);
  wet.connect(conv);
  conv.connect(master);
}

function makeImpulse(ac, seconds, decay) {
  const rate = ac.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = ac.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function noiseBuffer(ac) {
  if (!noiseBuf) {
    const len = Math.floor(ac.sampleRate * 2);
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/**
 * A dark, organic voice: sine/saw through a lowpass, slow attack, long tail,
 * optional detuned stack for width, and a reverb send.
 */
function note({
  freq,
  type = "sine",
  dur = 0.4,
  gain = 0.1,
  delay = 0,
  attack = 0.03,
  release = 0.6,
  slideTo = 0,
  cutoff = 0,
  detune = 0,
  voices = 1,
  rev = 0.5,
} = {}) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const end = t + dur;

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + release);

  let outNode = g;
  if (cutoff) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(cutoff, t);
    lp.Q.value = 0.6;
    g.connect(lp);
    outNode = lp;
  }

  const dryAmt = ac.createGain();
  dryAmt.gain.value = 1 - rev * 0.7;
  const wetAmt = ac.createGain();
  wetAmt.gain.value = rev;
  outNode.connect(dryAmt).connect(dry);
  outNode.connect(wetAmt).connect(wet);

  for (let v = 0; v < voices; v++) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), end);
    osc.detune.value = detune + (voices > 1 ? (v - (voices - 1) / 2) * detune : 0);
    osc.connect(g);
    osc.start(t);
    osc.stop(end + release + 0.05);
  }
}

/** Filtered noise — used for wind swells and dull impacts. */
function noise({ delay = 0, dur = 0.4, gain = 0.05, from = 400, to = 120, q = 0.8, type = "bandpass" } = {}) {
  if (!enabled) return;
  const ac = ensure();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = type;
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g);
  g.connect(dry);
  g.connect(wet);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Low, dull impact — a distant slam rather than a cartoon bonk. */
function thud(delay = 0, gain = 0.09, freq = 66) {
  note({ freq, type: "sine", dur: 0.1, gain, attack: 0.004, release: 0.35, delay, slideTo: freq * 0.55, rev: 0.4 });
  noise({ delay, dur: 0.16, gain: gain * 0.5, from: 900, to: 120, type: "lowpass", q: 0.5 });
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
    note({ freq: 1180, type: "sine", dur: 0.02, gain: 0.012, attack: 0.002, release: 0.12, rev: 0.25 });
  },

  /* Dark dyad + low sub: a gate grinding open in a tomb. */
  unlock() {
    note({ freq: 98, type: "sine", dur: 0.18, gain: 0.07, attack: 0.004, release: 0.5, slideTo: 74, rev: 0.3 });
    note({ freq: 196, type: "sine", dur: 0.5, gain: 0.055, attack: 0.01, release: 0.9, rev: 0.6, voices: 2, detune: 7 });
    note({ freq: 233.08, type: "sine", dur: 0.55, gain: 0.04, delay: 0.05, attack: 0.02, release: 1, rev: 0.65 });
    note({ freq: 392, type: "sine", dur: 0.4, gain: 0.022, delay: 0.1, attack: 0.02, release: 1.1, rev: 0.7 });
    thud(0, 0.05, 80);
  },

  /* Ominous swell: rising sub drone + minor triad + distant bell. */
  levelUp() {
    note({ freq: 55, type: "sawtooth", dur: 1.5, gain: 0.05, attack: 0.55, release: 1.4, cutoff: 380, detune: 10, voices: 2, rev: 0.5 });
    noise({ delay: 0, dur: 1.6, gain: 0.05, from: 260, to: 3000, q: 0.7 });
    [220, 261.63, 329.63].forEach((f, i) =>
      note({ freq: f, type: "sine", dur: 1.3, gain: 0.05, delay: i * 0.08, attack: 0.6, release: 1.3, rev: 0.7, voices: 2, detune: 6 })
    );
    [880, 1174.66].forEach((f, i) =>
      note({ freq: f, type: "sine", dur: 0.6, gain: 0.026, delay: 0.75 + i * 0.14, attack: 0.008, release: 2.2, rev: 0.85 })
    );
    thud(0.85, 0.11, 58);
  },

  deny() {
    thud(0, 0.1, 62);
    note({ freq: 130, type: "sine", dur: 0.14, gain: 0.05, attack: 0.004, release: 0.3, slideTo: 90, rev: 0.3 });
  },

  /* Grand and dreadful: deep stacked drone, minor swell, tolling bells. */
  master() {
    [55, 82.41, 110, 164.81, 220].forEach((f, i) =>
      note({ freq: f, type: "sawtooth", dur: 2.2, gain: 0.04, delay: i * 0.04, attack: 0.8, release: 2.2, cutoff: 700, detune: 8, voices: 2, rev: 0.6 })
    );
    [1318.51, 1567.98].forEach((f, i) =>
      note({ freq: f, type: "sine", dur: 0.9, gain: 0.028, delay: 1 + i * 0.25, attack: 0.006, release: 2.6, rev: 0.9 })
    );
    thud(1.5, 0.12, 50);
  },

  reset() {
    note({ freq: 180, type: "sawtooth", dur: 0.6, gain: 0.055, attack: 0.02, release: 0.9, cutoff: 900, slideTo: 55, rev: 0.5 });
    noise({ dur: 0.8, gain: 0.04, from: 1600, to: 120, q: 0.6 });
  },
};
