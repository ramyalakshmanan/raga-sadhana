// Audio: tanpura drone and a plucked-string melody voice, both tuned to the chosen Sa.
const Sound = (() => {
  let ctx = null, master, droneBus, voiceBus;
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
      setTimeout(prepareVoice, 30); // render the plucked-string voice in the background
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const freq = (cents) => sa * Math.pow(2, cents / 1200);
  const centsOfItem = (it) => (typeof it === 'number' ? it : typeof it === 'string' ? Theory.parseToken(it).cents : it.cents);

  // ---- tanpura ----
  // Each string is pre-rendered once per shruti with additive synthesis in an
  // OfflineAudioContext. What separates a tanpura from a harpsichord-like pluck:
  //  - a soft start: the high overtones are not there at the pluck, they swell
  //    in over the first second (the jawari bloom), so there is no bright click
  //  - jawari buzz: a broad band of strong overtones that stays present for the
  //    whole note and drifts slowly down the spectrum
  //  - a very long ring (~10 s), so successive plucks overlap into one continuous drone
  //  - two detuned vibration planes per string that beat and shimmer
  //  - gourd body resonance, plus room reverb added live
  // Strings: Pa (mandra), Sa, Sa (madhya, the jodi pair), Sa (kharaj, an octave down).
  const STRINGS = [
    { cents: -498.04, pan: -0.25, level: 0.9, seed: 1 },
    { cents: 0, pan: 0.15, level: 0.8, seed: 2 },
    { cents: 1.2, pan: 0.3, level: 0.8, seed: 3 },
    { cents: -1200, pan: -0.1, level: 1.0, seed: 4 },
  ];
  const STEP = 0.9, CYCLE = 4.0, RING = 10;
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
    const shelf = oc.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 5000; shelf.gain.value = -4;
    body.connect(body2).connect(shelf).connect(oc.destination);
    const panL = oc.createStereoPanner(), panR = oc.createStereoPanner();
    panL.pan.value = Math.max(-1, s.pan - 0.35); panR.pan.value = Math.min(1, s.pan + 0.35);
    panL.connect(body); panR.connect(body);

    const maxK = Math.min(64, Math.floor(8500 / f0));
    const PTS = 1000, dt = RING / (PTS - 1);
    const tauBase = low ? 9 : 7;
    const K0 = Math.min(maxK * 0.85, low ? 34 : 26);
    let norm = 0;
    for (let k = 1; k <= maxK; k++) norm += 1 / Math.pow(k, 0.7);

    for (let k = 1; k <= maxK; k++) {
      const base = (1 / Math.pow(k, 0.7)) / norm * 1.6;
      const tau = tauBase / (1 + 0.012 * k);     // highs fade only slightly faster: the buzz persists
      const rise = 0.004 + 0.006 * k;            // higher overtones swell in later (soft, blooming start)
      const shimRate = 0.2 + rnd() * 0.5, shimPh = rnd() * 6.28;
      const curve = new Float32Array(PTS);
      for (let i = 0; i < PTS; i++) {
        const t = i * dt;
        // Jawari band: grows over ~0.8 s, then drifts slowly down through the overtones.
        const c = (4 + (K0 - 4) * Math.exp(-t / 4.5)) * (1 - Math.exp(-t / 0.35));
        const w = 3 + 0.25 * c;
        const boost = 1 + 4 * (1 - Math.exp(-t / 0.4)) * Math.exp(-t / 8) * Math.exp(-((k - c) ** 2) / (2 * w * w));
        const shimmer = 1 + 0.15 * Math.sin(2 * Math.PI * shimRate * t + shimPh);
        const attack = 1 - Math.exp(-t / rise);
        const tail = i === PTS - 1 ? 0 : 1;
        curve[i] = base * Math.exp(-t / tau) * boost * shimmer * attack * tail;
      }
      for (let pol = 0; pol < 2; pol++) {
        const fk = k * f0 * (1 + 0.000015 * k * k) + (pol ? 0.3 + rnd() * 0.5 : 0);
        if (fk > sr / 2 - 500) continue;
        const o = oc.createOscillator();
        // Random starting phase: if every overtone starts in step they sum to a sharp click.
        const ph = rnd() * 2 * Math.PI;
        o.setPeriodicWave(oc.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)])));
        o.frequency.setValueAtTime(fk * Math.pow(2, 9 / 1200), 0);   // pluck tension, settles in ~0.3 s
        o.frequency.exponentialRampToValueAtTime(fk, 0.3);
        const g = oc.createGain();
        g.gain.setValueCurveAtTime(pol ? curve.map((v) => v * 0.8) : curve, 0, RING - 0.01);
        o.connect(g).connect(pol ? panR : panL);
        o.start(0);
        o.stop(RING);
      }
    }

    // Finger pluck: a soft, low thud (the flesh of the finger, not a plectrum click).
    const nb = oc.createBuffer(1, Math.floor(sr * 0.06), sr);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (rnd() * 2 - 1) * Math.exp(-i / (sr * 0.012));
    const ns = oc.createBufferSource(); ns.buffer = nb;
    const bp = oc.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
    const ng = oc.createGain(); ng.gain.value = 0.02;
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
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.8);
    const ir = ctx.createBuffer(2, len, sr);
    const r = rng(99);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.28;
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

  // ---- melodic voice: a plucked string, in the tanpura / veena family ----
  // A set of plucked notes is pre-rendered once, spaced every 300 cents from C2 to about E♭6.
  // Each swara plays the nearest one, shifted to the exact pitch (at most 1.5 semitones,
  // which keeps the timbre intact). The set does not depend on the shruti.
  const VOICE_BASE = 65.406, VOICE_STEP = 300, VOICE_N = 18, VOICE_RING = 3.2;
  let voiceBufs = null, voiceJob = null;

  async function renderPluck(f0, seed) {
    const sr = ctx.sampleRate;
    const oc = new OfflineAudioContext(1, Math.floor(sr * VOICE_RING), sr);
    const rnd = rng(seed);
    const body = oc.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 200; body.Q.value = 1.1; body.gain.value = 3;
    const body2 = oc.createBiquadFilter(); body2.type = 'peaking'; body2.frequency.value = 560; body2.Q.value = 1.3; body2.gain.value = 2;
    const shelf = oc.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 4500; shelf.gain.value = -5;
    body.connect(body2).connect(shelf).connect(oc.destination);

    const maxK = Math.min(40, Math.floor(7000 / f0));
    const PTS = 500, dt = VOICE_RING / (PTS - 1);
    const K0 = Math.min(maxK * 0.8, 18);
    let norm = 0;
    for (let k = 1; k <= maxK; k++) norm += 1 / Math.pow(k, 0.8);
    for (let k = 1; k <= maxK; k++) {
      const base = (1 / Math.pow(k, 0.8)) / norm;
      const tau = (f0 < 150 ? 2.1 : 1.6) / (1 + 0.05 * k);
      const rise = 0.002 + 0.0025 * k;      // a clear pluck, with the upper overtones blooming just after it
      const curve = new Float32Array(PTS);
      for (let i = 0; i < PTS; i++) {
        const t = i * dt;
        const c = (3 + (K0 - 3) * Math.exp(-t / 1.2)) * (1 - Math.exp(-t / 0.08));   // jawari band sweeping down
        const w = 2 + 0.25 * c;
        const boost = 1 + 2.5 * (1 - Math.exp(-t / 0.12)) * Math.exp(-t / 2.5) * Math.exp(-((k - c) ** 2) / (2 * w * w));
        curve[i] = i === PTS - 1 ? 0 : base * Math.exp(-t / tau) * boost * (1 - Math.exp(-t / rise));
      }
      // Two slightly detuned vibration planes, placed either side of the true pitch so the note stays in tune.
      const spread = 0.4 + rnd() * 0.6;
      for (let pol = 0; pol < 2; pol++) {
        const fk = k * f0 + (pol ? spread / 2 : -spread / 2);   // exact harmonics: this is a tuning reference
        if (fk > sr / 2 - 500) continue;
        const o = oc.createOscillator();
        const ph = rnd() * 2 * Math.PI;
        o.setPeriodicWave(oc.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)])));
        o.frequency.setValueAtTime(fk * Math.pow(2, 6 / 1200), 0);   // the string settles just after the pluck
        o.frequency.exponentialRampToValueAtTime(fk, 0.15);
        const g = oc.createGain();
        g.gain.setValueCurveAtTime(pol ? curve.map((v) => v * 0.7) : curve, 0, VOICE_RING - 0.01);
        o.connect(g).connect(body);
        o.start(0); o.stop(VOICE_RING);
      }
    }
    // Finger pluck
    const nb = oc.createBuffer(1, Math.floor(sr * 0.03), sr), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (rnd() * 2 - 1) * Math.exp(-i / (sr * 0.004));
    const ns = oc.createBufferSource(); ns.buffer = nb;
    const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const ng = oc.createGain(); ng.gain.value = 0.04;
    ns.connect(lp).connect(ng).connect(body); ns.start(0);

    const buf = await oc.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0;
    for (const x of d) peak = Math.max(peak, Math.abs(x));
    const scale = peak ? 0.5 / peak : 1;
    for (let i = 0; i < d.length; i++) d[i] *= scale;
    return buf;
  }
  function prepareVoice() {
    if (voiceBufs) return Promise.resolve();
    if (voiceJob) return voiceJob;
    init();
    voiceJob = Promise.all(Array.from({ length: VOICE_N }, (_, i) => renderPluck(VOICE_BASE * Math.pow(2, (i * VOICE_STEP) / 1200), 50 + i)))
      .then((b) => { voiceBufs = b; })
      .catch((e) => { console.error('Voice render failed', e); voiceJob = null; });
    return voiceJob;
  }
  function nearestPluck(f) {
    const i = Math.max(0, Math.min(VOICE_N - 1, Math.round((1200 * Math.log2(f / VOICE_BASE)) / VOICE_STEP)));
    return { buf: voiceBufs[i], rate: f / (VOICE_BASE * Math.pow(2, (i * VOICE_STEP) / 1200)) };
  }

  function stopVoice() { if (current) { current.stop(); current = null; } }

  // items: swara tokens, cents numbers, or {cents, dur} / {rest: true, dur}.
  // at: optional AudioContext time to start, so a sequence can line up with tala clicks.
  // Each swara is a pluck; like a single string, a new pluck damps the previous note,
  // and the last note before a rest or the end rings out.
  function playPluck(items, { dur = 0.5, onNote, at } = {}) {
    init();
    stopVoice();
    let cancelled = false, endTimer = 0, resolve;
    const voices = [], timers = [];
    const done = new Promise((r) => (resolve = r));
    const handle = {
      done,
      stop() {
        cancelled = true;
        timers.forEach(clearTimeout); clearTimeout(endTimer);
        const n = ctx.currentTime;
        for (const { src, g } of voices) {
          try { g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0, n, 0.02); src.stop(n + 0.15); } catch { /* already stopped */ }
        }
        onNote && onNote(-1);
        resolve(false);
      },
    };
    current = handle;

    const go = () => {
      if (cancelled) return;
      const t0 = at != null ? Math.max(at, ctx.currentTime + 0.02) : ctx.currentTime + 0.05;
      let t = t0;
      const times = [];
      items.forEach((it, i) => {
        const d = (it && it.dur) || dur;
        if (it && it.rest) { times.push(null); t += d; return; }
        const { buf, rate } = nearestPluck(freq(centsOfItem(it)));
        const src = ctx.createBufferSource();
        src.buffer = buf; src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = 0.9;
        src.connect(g).connect(voiceBus);
        src.start(t);
        const end = t + d, next = items[i + 1];
        g.gain.setValueAtTime(0.9, end);
        if (next && !next.rest) { g.gain.setTargetAtTime(0, end, 0.015); src.stop(end + 0.15); }
        else { const tail = next ? Math.min(0.35, next.dur || dur) : 1.4; g.gain.setTargetAtTime(0, end, tail / 3); src.stop(end + tail + 0.2); }
        voices.push({ src, g });
        times.push(t);
        t = end;
      });
      const now = ctx.currentTime;
      times.forEach((tt, i) => { if (tt != null) timers.push(setTimeout(() => onNote && onNote(i), (tt - now) * 1000)); });
      endTimer = setTimeout(() => {
        onNote && onNote(-1);
        if (current === handle) current = null;
        resolve(true);
      }, (t - now) * 1000 + 80);
    };
    if (voiceBufs) go(); else prepareVoice().then(go);
    return handle;
  }

  // ---- sustained instruments: violin, flute, sung "aa" ----
  // One continuous tone that moves between swaras, as these instruments do. Vibrato is
  // symmetric around the pitch and builds in after the attack, so every swara stays in tune.
  const PRESETS = {
    violin: { amps: (k) => 1 / k, nh: 24, eq: [[550, 1.2, 5], [1500, 1.5, 3], [3000, 2, 2]], lp: 4200,
      attack: 0.05, vib: { rate: 5.6, depth: 14, delay: 0.22 }, glide: 0.035, level: 0.2, legato: 0.75 },
    flute: { amps: (k) => [1, 0.32, 0.12, 0.06, 0.03][k - 1] || 0, nh: 5, eq: [], lp: 5000,
      attack: 0.06, vib: { rate: 5.0, depth: 8, delay: 0.25 }, glide: 0.03, level: 0.34, legato: 0.6, breath: 0.05 },
    voice: { amps: (k) => 1 / Math.pow(k, 1.1), nh: 30, vowel: [[800, 6, 1], [1150, 7, 0.6], [2900, 9, 0.25]], lp: 5000,
      attack: 0.07, vib: { rate: 5.4, depth: 12, delay: 0.2 }, glide: 0.05, level: 0.55, legato: 0.7 },
  };
  function playSustained(items, { dur = 0.5, onNote, at } = {}, P) {
    const t0 = at != null ? Math.max(at, ctx.currentTime + 0.02) : ctx.currentTime + 0.05;
    const real = new Float32Array(P.nh + 1), imag = new Float32Array(P.nh + 1);
    for (let k = 1; k <= P.nh; k++) imag[k] = P.amps(k);
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    vib.frequency.value = P.vib.rate; vibG.gain.value = 0;
    vib.connect(vibG).connect(osc.detune);
    const g = ctx.createGain(); g.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.lp;
    lp.connect(g).connect(voiceBus);
    if (P.vowel) {
      // Sung "aa": the tone passes through the vowel's formant resonances.
      const direct = ctx.createGain(); direct.gain.value = 0.3;
      osc.connect(direct).connect(lp);
      for (const [f, q, lvl] of P.vowel) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
        const bg = ctx.createGain(); bg.gain.value = lvl * 4;
        osc.connect(bp).connect(bg).connect(lp);
      }
    } else {
      let node = osc;
      for (const [f, q, gain] of P.eq) {
        const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = f; pk.Q.value = q; pk.gain.value = gain;
        node.connect(pk); node = pk;
      }
      node.connect(lp);
    }
    let noise = null, ng = null;
    if (P.breath) {
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.8;
      ng = ctx.createGain(); ng.gain.value = 0;
      noise.connect(bp).connect(ng).connect(voiceBus);
    }

    let t = t0, afterRest = true, prevCents = null;
    const times = [];
    items.forEach((it, i) => {
      const d = (it && it.dur) || dur;
      if (it && it.rest) {
        g.gain.setTargetAtTime(0, t, 0.03); if (ng) ng.gain.setTargetAtTime(0, t, 0.03);
        times.push(null); t += d; afterRest = true; prevCents = null;
        return;
      }
      const c = centsOfItem(it), f = freq(c);
      if (afterRest) osc.frequency.setValueAtTime(f, t); else osc.frequency.setTargetAtTime(f, t, P.glide);
      g.gain.setTargetAtTime(P.level, t, P.attack / 3);
      if (ng) ng.gain.setTargetAtTime(P.breath, t, P.attack / 3);
      // Vibrato starts flat and builds once the note has settled.
      vibG.gain.setValueAtTime(0, t);
      if (d > P.vib.delay + 0.1) vibG.gain.linearRampToValueAtTime(P.vib.depth, t + Math.min(d, P.vib.delay + 0.3));
      // Re-articulate repeated swaras (janta) and before rests; otherwise move on smoothly.
      const next = items[i + 1];
      const nextCents = next && !next.rest ? centsOfItem(next) : null;
      const end = t + d;
      const dip = nextCents == null || Math.abs(nextCents - c) < 1 ? 0.04 : P.legato;
      g.gain.setTargetAtTime(P.level * dip, end - 0.04, 0.012);
      times.push(t); t = end; afterRest = false; prevCents = c;
    });
    g.gain.setTargetAtTime(0, t, 0.06); if (ng) ng.gain.setTargetAtTime(0, t, 0.06);
    osc.start(t0); vib.start(t0); osc.stop(t + 0.6); vib.stop(t + 0.6);
    if (noise) { noise.start(t0); noise.stop(t + 0.6); }

    const now = ctx.currentTime;
    const timers = times.map((tt, i) => (tt == null ? 0 : setTimeout(() => onNote && onNote(i), (tt - now) * 1000)));
    let resolve;
    const done = new Promise((r) => (resolve = r));
    const handle = {
      done,
      stop() {
        timers.forEach(clearTimeout); clearTimeout(endTimer);
        const n = ctx.currentTime;
        try {
          g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0, n, 0.02);
          osc.stop(n + 0.1); vib.stop(n + 0.1); if (noise) noise.stop(n + 0.1);
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

  // The instrument for every melody in the app.
  const INSTRUMENTS = [
    { id: 'veena', name: 'Veena', desc: 'Plucked string, like the tanpura' },
    { id: 'violin', name: 'Violin', desc: 'Bowed, sliding between swaras' },
    { id: 'flute', name: 'Flute', desc: 'Soft and breathy' },
    { id: 'voice', name: 'Voice', desc: 'Sung on “aa”' },
  ];
  let instrument = 'veena';
  try { const saved = JSON.parse(localStorage.getItem('rs.instrument')); if (INSTRUMENTS.some((x) => x.id === saved)) instrument = saved; } catch { /* default */ }

  // items: swara tokens, cents numbers, or {cents, dur} / {rest: true, dur}.
  // at: optional AudioContext time to start, so a sequence can line up with tala clicks.
  function playSeq(items, opts = {}) {
    init();
    if (instrument === 'veena') return playPluck(items, opts);
    stopVoice();
    return playSustained(items, opts, PRESETS[instrument]);
  }

  // Tala click at an AudioContext time. level: 'sam' (first beat), 'clap', 'soft' (finger count / wave).
  const clicks = new Set();
  function click(at, level = 'clap') {
    init();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = level === 'sam' ? 1760 : level === 'clap' ? 1320 : level === 'sub' ? 760 : 990;
    const peak = level === 'sam' ? 0.5 : level === 'clap' ? 0.32 : level === 'sub' ? 0.07 : 0.16;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    o.connect(g).connect(master);
    o.start(at); o.stop(at + 0.08);
    clicks.add(o);
    o.onended = () => clicks.delete(o);
  }
  function stopClicks() { for (const o of clicks) { try { o.stop(); } catch { /* not started */ } } clicks.clear(); }

  return {
    init, startDrone, stopDrone, playSeq, stopVoice, click, stopClicks, prepareVoice,
    INSTRUMENTS,
    getInstrument: () => instrument,
    setInstrument(id) {
      if (!INSTRUMENTS.some((x) => x.id === id)) return;
      instrument = id;
      try { localStorage.setItem('rs.instrument', JSON.stringify(id)); } catch { /* not saved */ }
    },
    _nearestPluck: (f) => nearestPluck(f),
    _tap() { init(); const a = ctx.createAnalyser(); a.fftSize = 4096; voiceBus.connect(a); return a; },
    now: () => init().currentTime,
    isDroneOn: () => droneOn,
    tanpuraReady: () => prepareTanpura().then(() => tanBufs),
    setSa(f) { sa = f; if (droneOn) prepareTanpura(); },
    getSa: () => sa,
    setVolume(v) { vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
  };
})();
