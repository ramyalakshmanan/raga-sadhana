// Microphone input and YIN pitch detection.
const Pitch = (() => {
  let stream = null, src = null, analyser = null, buf = null, d = null;

  async function start() {
    const ctx = Sound.init();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
    });
    src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
  }
  function stop() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (src) src.disconnect();
    stream = src = analyser = null;
  }

  // Returns {freq, clarity, rms}; freq is 0 when no clear pitch.
  function yin(x, sr) {
    const n = x.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += x[i] * x[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.008) return { freq: 0, clarity: 0, rms };

    const minTau = Math.floor(sr / 1100);          // highest pitch ~1100 Hz
    const maxTau = Math.min(Math.floor(sr / 60), (n >> 1) - 1); // lowest ~60 Hz
    const W = n - maxTau;
    if (!d || d.length !== maxTau + 1) d = new Float32Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const df = x[i] - x[i + tau]; s += df * df; }
      d[tau] = s;
    }
    d[0] = 1;
    let run = 0;
    for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; d[tau] = run ? (d[tau] * tau) / run : 1; }

    let tau = -1;
    for (let t = minTau; t <= maxTau; t++) {
      if (d[t] < 0.15) {
        while (t + 1 <= maxTau && d[t + 1] < d[t]) t++;
        tau = t; break;
      }
    }
    if (tau < 0) return { freq: 0, clarity: 0, rms };
    let better = tau;
    if (tau > 1 && tau < maxTau) {
      const x0 = d[tau - 1], x1 = d[tau], x2 = d[tau + 1];
      const den = 2 * (2 * x1 - x2 - x0);
      if (den) better = tau + (x2 - x0) / den;
    }
    return { freq: sr / better, clarity: 1 - d[tau], rms };
  }

  function read() {
    if (!analyser) return null;
    analyser.getFloatTimeDomainData(buf);
    return yin(buf, analyser.context.sampleRate);
  }

  return { start, stop, read, yin, active: () => !!analyser };
})();
