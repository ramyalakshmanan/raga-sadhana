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
      droneBus = ctx.createGain(); droneBus.gain.value = 0.5; droneBus.connect(master);
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

  // ---- tambura ----
  function pluck(f, t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 3.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(Math.min(f * 20, 12000), t);
    lp.frequency.exponentialRampToValueAtTime(f * 3, t + 3.2);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = o2.type = 'sawtooth';
    o1.frequency.value = f; o2.frequency.value = f * 1.0016;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(droneBus);
    o1.start(t); o2.start(t); o1.stop(t + 3.7); o2.stop(t + 3.7);
  }
  // Pa (mandra), Sa (tara), Sa (tara), Sa — the usual four-string cycle.
  const PATTERN = [-498.04, 1200, 1200, 0], STEP = 0.7, CYCLE = 3.0;
  function droneTick() {
    while (nextT < ctx.currentTime + 0.3) {
      pluck(freq(PATTERN[idx]), nextT);
      nextT += idx === 3 ? CYCLE - 3 * STEP : STEP;
      idx = (idx + 1) % 4;
    }
  }
  function startDrone() {
    init();
    if (droneOn) return;
    droneOn = true; nextT = ctx.currentTime + 0.05; idx = 0;
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
    setSa(f) { sa = f; },
    getSa: () => sa,
    setVolume(v) { vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
  };
})();
