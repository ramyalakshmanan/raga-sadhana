// Audio: tambura drone and a simple sung-tone synth, both tuned to the chosen Sa.
const Sound = (() => {
  let ctx = null, master, droneBus, voiceBus, wave;
  let sa = 196, vol = 0.7;
  let droneOn = false, droneTimer = null, nextT = 0, idx = 0;
  let current = null;

  function init() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = vol;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      droneBus = ctx.createGain(); droneBus.gain.value = 1.2; droneBus.connect(master);
      voiceBus = ctx.createGain(); voiceBus.gain.value = 0.9; voiceBus.connect(master);
      // A reedy, voice-like harmonic spectrum.
      const amps = [0, 1, 0.55, 0.42, 0.24, 0.18, 0.11, 0.08, 0.05, 0.035, 0.02, 0.015];
      const real = new Float32Array(amps.length), imag = new Float32Array(amps);
      wave = ctx.createPeriodicWave(real, imag);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const freq = (cents) => sa * Math.pow(2, cents / 1200);
  const centsOfItem = (it) => (typeof it === 'number' ? it : typeof it === 'string' ? Theory.parseToken(it).cents : it.cents);

  // ---- tanpura ----
  // Each string is pre-rendered once per shruti with additive synthesis in an
  // OfflineAudioContext, modelling what gives an acoustic tanpura its sound:
  //  - jawari: the curved bridge makes overtones bloom after the pluck, and a
  //    band of strong overtones sweeps slowly down the spectrum as the note rings
  //  - two slightly detuned vibration planes per string, which beat and shimmer
  //  - a small pitch drop just after the pluck, slow decay, a soft pluck transient
  //  - gourd body resonance, plus a short room reverb added live
  // Strings: Pa (mandra), Sa, Sa (madhya, the jodi pair), Sa (kharaj, an octave down).
  const STRINGS = [
    { cents: -498.04, pan: -0.25, level: 0.9, seed: 1 },
    { cents: 0, pan: 0.15, level: 0.8, seed: 2 },
    { cents: 1.2, pan: 0.3, level: 0.8, seed: 3 },
    { cents: -1200, pan: -0.1, level: 1.0, seed: 4 },
  ];
  const STEP = 0.78, CYCLE = 3.6, RING = 7;
  let tanBufs = null, tanSa = 0, tanJob = null, reverb = null;

  function rng(seed) { // small deterministic PRNG so each string keeps its character
    let a = seed * 2654435761 >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  async function renderString(f0, s) {
    const sr = ctx.sampleRate, N = Math.floor(sr * RING);
    const oc = new OfflineAudioContext(2, N, sr);
    const rnd = rng(s.seed * 1000 + Math.round(f0));
    const low = f0 < 110; // the kharaj string rings longer and darker

    // Body: gourd resonance and a gentle top-end roll-off.
    const body = oc.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 190; body.Q.value = 1.1; body.gain.value = 4;
    const body2 = oc.createBiquadFilter(); body2.type = 'peaking'; body2.frequency.value = 520; body2.Q.value = 1.4; body2.gain.value = 2;
    const shelf = oc.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 4500; shelf.gain.value = -6;
    body.connect(body2).connect(shelf).connect(oc.destination);
    const panL = oc.createStereoPanner(), panR = oc.createStereoPanner();
    panL.pan.value = Math.max(-1, s.pan - 0.35); panR.pan.value = Math.min(1, s.pan + 0.35);
    panL.connect(body); panR.connect(body);

    const maxK = Math.min(64, Math.floor(8500 / f0));
    const PTS = 700, dt = RING / (PTS - 1);
    const tauBase = low ? 3.6 : 2.8;
    const K0 = Math.min(maxK * 0.8, low ? 30 : 22);
    let norm = 0;
    for (let k = 1; k <= maxK; k++) norm += 1 / Math.pow(k, 0.85);

    for (let k = 1; k <= maxK; k++) {
      const base = (1 / Math.pow(k, 0.85)) / norm * 1.6;
      const tau = tauBase / (1 + 0.035 * k);
      const shimRate = 0.25 + rnd() * 0.6, shimPh = rnd() * 6.28;
      const curve = new Float32Array(PTS);
      for (let i = 0; i < PTS; i++) {
        const t = i * dt;
        // Jawari formant: rises within ~0.15 s, then drifts down through the overtones.
        const c = (3 + (K0 - 3) * Math.exp(-t / 2.6)) * (1 - Math.exp(-t / 0.15));
        const w = 2.5 + 0.22 * c;
        const boost = 1 + 3.2 * Math.exp(-t / 3.5) * Math.exp(-((k - c) ** 2) / (2 * w * w));
        const shimmer = 1 + 0.12 * Math.sin(2 * Math.PI * shimRate * t + shimPh);
        const attack = Math.min(1, t / 0.006);
        const tail = i === PTS - 1 ? 0 : 1;
        curve[i] = base * Math.exp(-t / tau) * boost * shimmer * attack * tail;
      }
      for (let pol = 0; pol < 2; pol++) {
        const fk = k * f0 * (1 + 0.000015 * k * k) + (pol ? 0.18 + rnd() * 0.35 : 0);
        if (fk > sr / 2 - 500) continue;
        const o = oc.createOscillator();
        o.frequency.setValueAtTime(fk * Math.pow(2, 9 / 1200), 0);   // pluck tension, settles in ~0.3 s
        o.frequency.exponentialRampToValueAtTime(fk, 0.3);
        const g = oc.createGain();
        g.gain.setValueCurveAtTime(pol ? curve.map((v) => v * 0.8) : curve, 0, RING - 0.01);
        o.connect(g).connect(pol ? panR : panL);
        o.start(0, rnd() * 0.0001);
        o.stop(RING);
      }
    }

    // Finger pluck: a very short band-passed noise burst.
    const nb = oc.createBuffer(1, Math.floor(sr * 0.04), sr);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (rnd() * 2 - 1) * Math.exp(-i / (sr * 0.008));
    const ns = oc.createBufferSource(); ns.buffer = nb;
    const bp = oc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(3000, f0 * 12); bp.Q.value = 0.9;
    const ng = oc.createGain(); ng.gain.value = 0.05;
    ns.connect(bp).connect(ng).connect(body);
    ns.start(0);

    const buf = await oc.startRendering();
    // Normalise every string to the same peak so the mix stays clean.
    let peak = 0;
    for (let ch = 0; ch < 2; ch++) for (const x of buf.getChannelData(ch)) peak = Math.max(peak, Math.abs(x));
    const scale = peak ? 0.32 / peak : 1;
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= scale; }
    return buf;
  }

  function makeReverb() {
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.2);
    const ir = ctx.createBuffer(2, len, sr);
    const r = rng(99);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
    conv.connect(lp).connect(wet).connect(master);
    return conv;
  }

  // Render (or re-render after a shruti change) the four strings.
  function prepareTanpura() {
    if (!ctx || (tanBufs && tanSa === sa) || (tanJob && tanJob.sa === sa)) return tanJob ? tanJob.p : Promise.resolve();
    const forSa = sa;
    const p = Promise.all(STRINGS.map((s) => renderString(forSa * Math.pow(2, s.cents / 1200), s)))
      .then((bufs) => { if (forSa === sa) { tanBufs = bufs; tanSa = forSa; } tanJob = null; })
      .catch((e) => { console.error('Tanpura render failed', e); tanJob = null; });
    tanJob = { sa: forSa, p };
    return p;
  }

  function pluck(i, t) {
    const s = STRINGS[i];
    const src = ctx.createBufferSource();
    src.buffer = tanBufs[i];
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.0006; // tiny human variation
    const g = ctx.createGain(); g.gain.value = s.level * (0.9 + Math.random() * 0.15);
    src.connect(g);
    g.connect(droneBus);
    g.connect(reverb);
    src.start(t);
  }
  function droneTick() {
    if (!tanBufs) return;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.3) {
      pluck(idx, nextT);
      nextT += idx === 3 ? CYCLE - 3 * STEP : STEP;
      idx = (idx + 1) % 4;
    }
  }
  function startDrone() {
    init();
    if (droneOn) return;
    if (!reverb) reverb = makeReverb();
    droneOn = true; idx = 0;
    nextT = ctx.currentTime + 0.05;
    prepareTanpura();
    droneTick();
    droneTimer = setInterval(droneTick, 80);
  }
  function stopDrone() { droneOn = false; clearInterval(droneTimer); }

  // ---- melodic voice ----
  function stopVoice() { if (current) { current.stop(); current = null; } }

  // items: swara tokens, cents numbers, or {cents, dur} / {rest: true, dur}.
  function playSeq(items, { dur = 0.5, onNote } = {}) {
    init();
    stopVoice();
    const t0 = ctx.currentTime + 0.06;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    vib.frequency.value = 5.3; vibG.gain.value = 6;
    vib.connect(vibG); vibG.connect(osc.detune);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    const g = ctx.createGain(); g.gain.value = 0;
    osc.connect(lp).connect(g).connect(voiceBus);

    let t = t0, afterRest = true;
    const times = [];
    items.forEach((it) => {
      const d = (it && it.dur) || dur;
      if (it && it.rest) {
        g.gain.setTargetAtTime(0, t, 0.03);
        times.push(null); t += d; afterRest = true;
        return;
      }
      const f = freq(centsOfItem(it));
      if (afterRest) osc.frequency.setValueAtTime(f, t);
      else osc.frequency.setTargetAtTime(f, t, 0.025); // a short glide between swaras
      g.gain.setTargetAtTime(0.32, t, 0.02);
      g.gain.setTargetAtTime(0.22, t + d * 0.45, 0.12);
      g.gain.setTargetAtTime(0.1, t + d - 0.05, 0.02);
      times.push(t); t += d; afterRest = false;
    });
    g.gain.setTargetAtTime(0, t - 0.04, 0.04);
    osc.start(t0); vib.start(t0); osc.stop(t + 0.4); vib.stop(t + 0.4);

    const now = ctx.currentTime;
    const timers = times.map((tt, i) => (tt == null ? 0 : setTimeout(() => onNote && onNote(i), (tt - now) * 1000)));
    let resolve;
    const done = new Promise((r) => (resolve = r));
    const handle = {
      done,
      stop() {
        timers.forEach(clearTimeout); clearTimeout(endTimer);
        try {
          g.gain.cancelScheduledValues(ctx.currentTime);
          g.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
          osc.stop(ctx.currentTime + 0.1); vib.stop(ctx.currentTime + 0.1);
        } catch { /* already stopped */ }
        onNote && onNote(-1);
        resolve(false);
      },
    };
    const endTimer = setTimeout(() => {
      onNote && onNote(-1);
      if (current === handle) current = null;
      resolve(true);
    }, (t - now) * 1000 + 80);
    current = handle;
    return handle;
  }

  return {
    init, startDrone, stopDrone, playSeq, stopVoice,
    isDroneOn: () => droneOn,
    tanpuraReady: () => prepareTanpura().then(() => tanBufs),
    setSa(f) { sa = f; if (droneOn) prepareTanpura(); },
    getSa: () => sa,
    setVolume(v) { vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
  };
})();
