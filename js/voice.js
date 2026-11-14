// Voice practice: live pitch meter and trace, plus range, hold, ladder, jump and free-singing exercises.
const Voice = (() => {
  const T = Theory;
  const WINDOW = 9000;     // ms of pitch history on the trace
  const HOLD_MS = 500;     // how long a target must be held
  const TIMEOUT = 10000;   // give up on a target after this long
  const TOL = { relaxed: 40, standard: 25, strict: 15 };

  let raga = null, stSet = new Set();
  let running = false, raf = 0, lastT = 0;
  let exercise = 'check';
  const hist = [], trace = [];
  let colors = {}, colorsAt = 0;
  let range = store.get('range', null); // {lowHz, highHz}

  const tol = () => TOL[$('#vStrict').value] || 25;
  const sa = () => Sound.getSa();
  const hzToCents = (f) => 1200 * Math.log2(f / sa());
  const centsToHz = (c) => sa() * Math.pow(2, c / 1200);
  const guideOn = () => $('#vGuide').checked;

  function practiceRange() {
    let lo = range && range.lowHz ? hzToCents(range.lowHz) : T.centsOf('P', -1);
    let hi = range && range.highHz ? hzToCents(range.highHz) : T.centsOf('P', 1);
    lo = Math.max(lo, -1150); hi = Math.min(hi, 2350);
    return { lo, hi };
  }

  function classify(c) {
    const inR = T.nearest(c, stSet);
    if (Math.abs(inR.dev) <= tol() + 5) return { state: 'on', near: inR };
    const any = T.nearest(c);
    if (Math.abs(any.dev) <= 30) return { state: 'off', near: any };
    return { state: 'between', near: inR };
  }

  // ---------- mic + loop ----------
  async function ensureMic() {
    if (running) return true;
    await toggleMic();
    return running;
  }
  async function toggleMic() {
    if (running) {
      Pitch.stop(); running = false; cancelAnimationFrame(raf);
      $('#micBtn').textContent = 'Start microphone';
      $('#micBtn').classList.add('primary');
      updateMeter(null); draw(performance.now());
      return;
    }
    try {
      await Pitch.start();
      running = true; lastT = 0;
      $('#micBtn').textContent = 'Stop microphone';
      $('#micBtn').classList.remove('primary');
      $('#micStatus').textContent = 'Listening. Use headphones if you can, so the microphone hears only your voice.';
      raf = requestAnimationFrame(loop);
    } catch (e) {
      $('#micStatus').textContent = `The microphone could not start (${e.name || e.message}). Allow microphone access for this page in your browser, then try again.`;
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = lastT ? Math.min(100, now - lastT) : 16;
    lastT = now;
    let c = null;
    const r = Pitch.read();
    if (r && r.freq > 0) {
      hist.push(hzToCents(r.freq));
      if (hist.length > 5) hist.shift();
      c = median(hist);
    } else hist.length = 0;
    const cl = c == null ? null : classify(c);
    trace.push({ t: now, c, s: cl ? cl.state : null });
    while (trace.length && now - trace[0].t > WINDOW) trace.shift();

    check.onFrame(c, now);
    rangeEx.onFrame(c, dt, now);
    hold.onFrame(c, dt, now);
    ladder.onFrame(c, dt, now);
    jumps.onFrame(c, dt, now);
    if (exercise === 'free') free.onFrame(c, cl, dt);

    if (!$('#tab-voice').hidden) { updateMeter(c, cl); draw(now); }
  }

  // ---------- meter ----------
  function octName(o) { return { '-2': 'anumandra sthayi', '-1': 'mandra sthayi', 0: 'madhya sthayi', 1: 'tara sthayi', 2: 'ati-tara sthayi' }[o] || ''; }
  function updateMeter(c, cl) {
    const needle = $('#mNeedle');
    if (c == null) {
      $('#mNote').textContent = '–';
      $('#mOct').textContent = '';
      needle.hidden = true;
      $('#mText').textContent = running ? 'Sing a note' : 'Microphone is off';
      $('#mRaga').innerHTML = '';
      return;
    }
    const n = cl.state === 'on' ? cl.near : T.nearest(c);
    const name = T.nameFor(raga, n.st);
    $('#mNote').innerHTML = T.swaraHTML(T.tokObj(name, n.oct));
    $('#mOct').textContent = octName(n.oct);
    needle.hidden = false;
    needle.style.left = `${50 + Math.max(-50, Math.min(50, n.dev))}%`;
    needle.className = 'needle ' + (Math.abs(n.dev) <= tol() ? 'on' : 'off');
    $('#mZone').style.left = `${50 - tol()}%`;
    $('#mZone').style.width = `${2 * tol()}%`;
    $('#mText').textContent = `${fmtCents(n.dev)} · ${centsToHz(c).toFixed(1)} Hz`;
    $('#mRaga').innerHTML = cl.state === 'on'
      ? `<span class="pill good">In ${esc(raga.name)}</span>`
      : cl.state === 'off'
        ? `<span class="pill warn">${T.swaraHTML(T.nearest(c).st === n.st ? name : name)} is outside ${esc(raga.name)}</span>`
        : `<span class="pill">Between swaras</span>`;
  }

  // ---------- trace ----------
  function readColors(now) {
    if (now - colorsAt < 1000 && colors.ink) return;
    const cs = getComputedStyle(document.documentElement);
    for (const k of ['ink', 'muted', 'line', 'accent', 'good', 'warn', 'surface-2', 'accent-soft', 'zari']) colors[k] = cs.getPropertyValue('--' + k).trim();
    colorsAt = now;
  }
  function currentTarget() {
    return hold.target() ?? ladder.target() ?? jumps.target();
  }
  function draw(now) {
    const cv = $('#trace');
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    readColors(now);

    const pr = practiceRange();
    const tgt = currentTarget();
    let lo = Math.min(pr.lo, 0) - 180, hi = Math.max(pr.hi, 1200) + 180;
    if (tgt != null) { lo = Math.min(lo, tgt - 150); hi = Math.max(hi, tgt + 150); }
    const padL = 46, padY = 10;
    const y = (c) => h - padY - ((c - lo) / (hi - lo)) * (h - 2 * padY);

    // Shade outside the singer's recorded range.
    if (range && (range.lowHz || range.highHz)) {
      g.fillStyle = colors.line; g.globalAlpha = 0.35;
      if (range.lowHz) g.fillRect(padL, y(pr.lo), w - padL, h - y(pr.lo));
      if (range.highHz) g.fillRect(padL, 0, w - padL, y(pr.hi));
      g.globalAlpha = 1;
    }
    // Raga swara lines.
    g.font = '600 12px Geist, system-ui, sans-serif';
    g.textBaseline = 'middle';
    const lines = [];
    for (let o = -2; o <= 2; o++) {
      for (const st of stSet) {
        const c = T.CENTS[st] + 1200 * o;
        if (c >= lo && c <= hi) lines.push({ c, st, o });
      }
    }
    // Draw Sa and Pa labels first so they win when labels would collide.
    lines.sort((a, b) => (a.st === 0 || a.st === 7 ? 0 : 1) - (b.st === 0 || b.st === 7 ? 0 : 1));
    const labelled = [];
    for (const { c, st, o } of lines) {
      const yy = Math.round(y(c)) + 0.5;
      const isSa = st === 0, isPa = st === 7;
      g.strokeStyle = isSa ? colors.accent : colors.line;
      g.lineWidth = isSa ? 1.5 : 1;
      g.beginPath(); g.moveTo(padL, yy); g.lineTo(w, yy); g.stroke();
      if (labelled.some((ly) => Math.abs(ly - yy) < 13)) continue;
      labelled.push(yy);
      g.fillStyle = isSa ? colors.accent : isPa ? colors.ink : colors.muted;
      g.fillText(T.swaraText(T.nameFor(raga, st), o), 8, yy);
    }
    // Target band.
    if (tgt != null) {
      g.fillStyle = colors['accent-soft'];
      g.globalAlpha = 0.9;
      g.fillRect(padL, y(tgt + tol()), w - padL, y(tgt - tol()) - y(tgt + tol()));
      g.globalAlpha = 1;
      g.strokeStyle = colors.accent; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(padL, y(tgt)); g.lineTo(w, y(tgt)); g.stroke();
      g.setLineDash([]);
    }
    // Pitch trace.
    const x = (t) => padL + (w - padL) * (1 - (now - t) / WINDOW);
    g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 1; i < trace.length; i++) {
      const a = trace[i - 1], b = trace[i];
      if (a.c == null || b.c == null || Math.abs(a.c - b.c) > 250) continue;
      g.strokeStyle = b.s === 'on' ? colors.good : b.s === 'off' ? colors.warn : colors.muted;
      g.beginPath(); g.moveTo(x(a.t), y(a.c)); g.lineTo(x(b.t), y(b.c)); g.stroke();
    }
    const last = trace[trace.length - 1];
    if (last && last.c != null) {
      g.fillStyle = last.s === 'on' ? colors.good : last.s === 'off' ? colors.warn : colors.muted;
      g.beginPath(); g.arc(x(last.t), y(last.c), 5, 0, Math.PI * 2); g.fill();
    }
    if (!running) {
      g.fillStyle = colors.muted; g.font = '14px Geist, system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText(`Start the microphone to see your pitch against ${raga.name}'s swaras`, padL + (w - padL) / 2, h / 2);
      g.textAlign = 'start';
    }
  }

  // ---------- range ----------
  const rangeEx = {
    rec: null,
    async start(which) {
      if (!(await ensureMic())) return;
      this.rec = { which, t0: performance.now(), vals: [] };
    },
    onFrame(c, dt, now) {
      if (!this.rec) return;
      if (c != null) this.rec.vals.push(centsToHz(c));
      const left = 5000 - (now - this.rec.t0);
      $('#rangeStatus').textContent = `Listening for your ${this.rec.which === 'low' ? 'lowest' : 'highest'} note… ${Math.ceil(left / 1000)}`;
      if (left <= 0) this.stop();
    },
    stop() {
      const { which, vals } = this.rec;
      this.rec = null;
      if (vals.length < 30) {
        $('#rangeStatus').textContent = 'I could not hear a steady note. Sing a little louder or closer to the microphone and hold it for the full five seconds.';
        return;
      }
      const hz = which === 'low' ? percentile(vals, 0.2) : percentile(vals, 0.8);
      range = { ...(range || {}), [which === 'low' ? 'lowHz' : 'highHz']: hz };
      store.set('range', range);
      $('#rangeStatus').textContent = 'Saved.';
      renderRange();
    },
  };
  function noteLabel(hz) {
    const c = hzToCents(hz), n = T.nearest(c);
    return `${T.swaraHTML(T.tokObj(T.POSITIONS[n.st].names[0], n.oct))} <span class="muted small">(${octName(n.oct)}, ${hz.toFixed(0)} Hz)</span>`;
  }
  function renderRange() {
    const el = $('#rangeResult');
    if (!range || (!range.lowHz && !range.highHz)) { el.innerHTML = ''; return; }
    const parts = [];
    if (range.lowHz) parts.push(`<div><span class="label">Lowest</span><br>${noteLabel(range.lowHz)}</div>`);
    if (range.highHz) parts.push(`<div><span class="label">Highest</span><br>${noteLabel(range.highHz)}</div>`);
    let advice = '';
    if (range.lowHz && range.highHz) {
      const span = 1200 * Math.log2(range.highHz / range.lowHz);
      // Centre mandra Pa .. tara Pa (0.75×Sa .. 3×Sa) inside the range.
      const ideal = Math.sqrt((range.lowHz * range.highHz) / 2.25);
      let best = 0, bd = Infinity;
      T.KATTAI.forEach((k, i) => { const d = Math.abs(Math.log2(k.hz / ideal)); if (d < bd) { bd = d; best = i; } });
      const k = T.KATTAI[best];
      const note = ideal < 125 ? ' Your voice sits below the lowest shruti listed here, so 1 kattai is the closest fit.'
        : ideal > 255 ? ' Your voice sits above the highest shruti listed here, so 7 kattai is the closest fit.' : '';
      advice = `<div class="callout">
        <p>Your range spans <b>${(span / 1200).toFixed(2)} octaves</b>${span >= 2400 ? ', enough for mandra Pa to tara Pa.' : '. Carnatic singing uses about two octaves; regular practice of the jump exercises will widen it.'}</p>
        <p>Suggested shruti: <b>${k.k} kattai (${k.note})</b>, which puts Sa at ${k.hz.toFixed(0)} Hz and centres your range around it.${note}</p>
        ${Math.abs(k.hz - sa()) > 1 ? `<div class="row" style="margin-top:8px"><button class="btn" type="button" id="useShruti" data-i="${best}">Use ${k.k} kattai</button></div>` : '<p class="small muted">That is your current shruti.</p>'}
      </div>`;
    }
    el.innerHTML = `<div class="result"><div class="row" style="gap:32px">${parts.join('')}</div>${advice}</div>`;
    const b = $('#useShruti');
    if (b) b.addEventListener('click', () => App.setShruti(+b.dataset.i));
  }

  // ---------- hold ----------
  const hold = {
    state: 'idle', tgt: 0, dur: 8000, elapsed: 0, frames: 0, devs: [], muted: 0, label: '',
    async start() {
      if (!(await ensureMic())) return;
      const tok = $('#holdTarget button[aria-pressed="true"]').dataset.v;
      this.tgt = T.parseToken(tok).cents;
      this.label = T.swaraHTML(tok);
      this.dur = +$('#holdDur').value * 1000;
      this.elapsed = 0; this.frames = 0; this.devs = [];
      this.state = 'cue';
      $('#holdResult').innerHTML = '';
      $('#holdBar').style.width = '0';
      this.muted = performance.now();
      if (guideOn()) { Sound.playSeq([{ cents: this.tgt, dur: 1.2 }]); this.muted += 1450; }
      $('#holdStatus').innerHTML = guideOn() ? `Listen to ${this.label}…` : `Sing ${this.label} and hold it.`;
    },
    target() { return this.state === 'cue' || this.state === 'hold' ? this.tgt : null; },
    onFrame(c, dt, now) {
      if ((this.state !== 'cue' && this.state !== 'hold') || now < this.muted) return;
      if (this.state === 'cue') {
        $('#holdStatus').innerHTML = `Sing ${this.label} and hold it.`;
        if (c == null || Math.abs(c - this.tgt) > 100) return;
        this.state = 'hold';
      }
      this.elapsed += dt; this.frames++;
      if (c != null && Math.abs(c - this.tgt) < 150) this.devs.push(c - this.tgt);
      $('#holdBar').style.width = `${Math.min(100, (this.elapsed / this.dur) * 100)}%`;
      $('#holdStatus').innerHTML = `Holding ${this.label}… ${Math.ceil((this.dur - this.elapsed) / 1000)}`;
      if (this.elapsed >= this.dur) this.finish();
    },
    finish() {
      this.state = 'done';
      const d = this.devs, n = this.frames || 1;
      const inTune = d.filter((x) => Math.abs(x) <= tol()).length / n;
      const voiced = d.length / n;
      const m = mean(d), sd = stdev(d);
      const third = Math.floor(d.length / 3);
      const drift = third > 5 ? mean(d.slice(-third)) - mean(d.slice(0, third)) : 0;
      const tips = [];
      if (voiced < 0.7) tips.push('The sound broke up for part of the hold. Take a full breath before you start and let the note ride on steady air.');
      if (m > 8) tips.push(`You sat sharp by about ${Math.round(m)} cents. Relax the throat and let the note settle down onto the shruti.`);
      if (m < -8) tips.push(`You sat flat by about ${Math.round(-m)} cents. Lift the pitch slightly and keep the breath support going to the end.`);
      if (sd > 18) tips.push(`The pitch wavered (±${Math.round(sd)} cents). Aim for a plain, unornamented note; gamakas come later.`);
      if (Math.abs(drift) > 10) tips.push(`The pitch drifted ${drift > 0 ? 'up' : 'down'} by ${Math.round(Math.abs(drift))} cents from start to finish.`);
      if (!tips.length) tips.push('Steady and centred. Try a longer hold or the strict setting next.');
      const grade = inTune >= 0.8 ? ['good', 'Steady'] : inTune >= 0.5 ? ['warn', 'Getting there'] : ['', 'Keep practising'];
      $('#holdStatus').innerHTML = `Done. <span class="pill ${grade[0]}">${grade[1]}</span>`;
      $('#holdResult').innerHTML = `
        <div class="result">
          <div class="stats">
            <div class="stat"><span class="stat-label">In tune (±${tol()}¢)</span><span class="stat-val">${Math.round(inTune * 100)}%</span></div>
            <div class="stat"><span class="stat-label">Average offset</span><span class="stat-val">${d.length ? fmtCents(m) : '–'}</span></div>
            <div class="stat"><span class="stat-label">Wobble</span><span class="stat-val">${d.length ? '±' + Math.round(sd) + '¢' : '–'}</span></div>
          </div>
          <ul class="steps">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
        </div>`;
    },
  };

  // ---------- target sequences (ladder, jumps) ----------
  function tgtOf(name, oct, from) {
    return { cents: T.centsOf(name, oct), html: T.swaraHTML(T.tokObj(name, oct)), from };
  }
  const fromTok = (s) => { const t = T.parseToken(s); return tgtOf(t.name, t.oct); };

  function buildLadder() {
    const pat = $('#ladderPattern').value;
    const aro = raga.aro, ava = raga.ava;
    if (pat === 'aa') return [...aro, ...ava.slice(1)].map((s) => fromTok(s));
    if (pat === 'groups') {
      const out = [];
      for (let i = 0; i + 2 < aro.length; i++) out.push(...aro.slice(i, i + 3));
      for (let i = 0; i + 2 < ava.length; i++) out.push(...ava.slice(i, i + 3));
      return out.map((s) => fromTok(s));
    }
    const { lo, hi } = practiceRange();
    const up = [];
    for (let o = -1; o <= 1; o++) {
      for (const n of T.sortedNames(raga)) {
        const c = T.centsOf(n, o);
        if (c >= lo - 5 && c <= hi + 5) up.push(tgtOf(n, o));
      }
    }
    return [...up, ...up.slice(0, -1).reverse()];
  }
  function buildJumps() {
    const { lo, hi } = practiceRange();
    const names = T.sortedNames(raga);
    const ok = (n, o) => { const c = T.centsOf(n, o); return c >= lo - 5 && c <= hi + 5; };
    const pairs = [];
    if (ok('S', 1)) pairs.push([['S', 0], ['S', 1]], [['S', 1], ['S', 0]]);
    if (names.includes('P') && ok('P', -1)) pairs.push([['P', -1], ['P', 0]], [['P', 0], ['P', -1]]);
    if (names.includes('P') && ok('P', -1) && ok('S', 1)) pairs.push([['P', -1], ['S', 1]]);
    if (ok('S', -1)) pairs.push([['S', 0], ['S', -1]]);
    if ($('#jumpSet').value === 'all') {
      for (const n of names) {
        if (n === 'S' || n === 'P') continue;
        if (ok(n, 1)) pairs.push([[n, 0], [n, 1]]);
        if (ok(n, -1)) pairs.push([[n, 0], [n, -1]]);
      }
    }
    const out = [];
    for (const [a, b] of pairs) {
      const ta = tgtOf(a[0], a[1]);
      ta.start = true;
      out.push(ta, tgtOf(b[0], b[1], ta.html));
    }
    return out;
  }

  function SeqRunner(p, build) {
    const R = { state: 'idle', targets: [], i: -1, hold: 0, t0: 0, land: null, devs: [], results: [], muted: 0 };
    const el = (id) => $('#' + p + id);

    function renderTrack(playing = -1) {
      el('Track').innerHTML = R.targets.map((t, k) => {
        const res = R.results[k];
        let cls = t.start ? 'from' : '';
        if (k === playing) cls += ' play';
        else if (k === R.i && R.state === 'run') cls += ' now';
        else if (res) cls += res.missed ? ' miss' : Math.abs(res.dev) <= 12 ? ' ok' : ' meh';
        return `<span class="chip ${cls}">${t.html}</span>`;
      }).join('');
    }
    function preview() {
      if (R.state === 'run') return;
      R.targets = build(); R.results = []; R.i = -1; R.state = 'idle';
      renderTrack();
    }
    async function start() {
      if (!(await ensureMic())) return;
      R.targets = build(); R.results = []; R.i = -1; R.state = 'run';
      el('Result').innerHTML = '';
      next();
    }
    function next() {
      R.i++;
      if (R.i >= R.targets.length) return finish();
      R.hold = 0; R.devs = []; R.land = null;
      const now = performance.now();
      R.t0 = R.muted = now;
      const t = R.targets[R.i];
      if (guideOn()) { Sound.playSeq([{ cents: t.cents, dur: 0.6 }]); R.muted = now + 800; R.t0 = R.muted; }
      renderTrack();
      el('Status').innerHTML = `Sing ${t.from ? t.from + ' → ' : ''}${t.html}`;
    }
    function record(missed) {
      R.results[R.i] = { missed, land: R.land != null ? R.land - R.t0 : null, dev: mean(R.devs) };
    }
    function onFrame(c, dt, now) {
      if (R.state !== 'run' || now < R.muted) return;
      const t = R.targets[R.i];
      if (c != null && Math.abs(c - t.cents) <= tol()) {
        if (R.land == null) R.land = now;
        R.hold += dt; R.devs.push(c - t.cents);
        if (R.hold >= HOLD_MS) { record(false); next(); return; }
      } else R.hold = Math.max(0, R.hold - dt);
      if (now - R.t0 > TIMEOUT) { record(true); next(); }
    }
    function finish() {
      R.state = 'done'; renderTrack();
      el('Status').textContent = 'Done.';
      const rows = R.targets.map((t, k) => ({ t, r: R.results[k] })).filter((x) => x.r && !x.t.start);
      const hit = rows.filter((x) => !x.r.missed);
      const sharp = hit.filter((x) => x.r.dev > 12).map((x) => x.t.html);
      const flat = hit.filter((x) => x.r.dev < -12).map((x) => x.t.html);
      const slow = hit.slice().sort((a, b) => b.r.land - a.r.land).slice(0, 2).filter((x) => x.r.land > 1500).map((x) => x.t.html);
      const notes = [];
      if (sharp.length) notes.push(`Sharp on ${sharp.join(' ')}.`);
      if (flat.length) notes.push(`Flat on ${flat.join(' ')}.`);
      if (slow.length) notes.push(`Slowest to find: ${slow.join(' ')}. Hum these against the tambura before singing them.`);
      if (!notes.length && hit.length) notes.push('Clean run. Switch off the guide tone or raise the strictness.');
      el('Result').innerHTML = `
        <div class="result">
          <p><b>${hit.length} of ${rows.length}</b> landed · average ${hit.length ? (mean(hit.map((x) => x.r.land)) / 1000).toFixed(2) + ' s' : '–'} to settle. ${notes.join(' ')}</p>
          <div class="table-wrap"><table class="result-table">
            <thead><tr><th>Target</th><th>Settled in</th><th>Average offset</th><th></th></tr></thead>
            <tbody>${rows.map(({ t, r }) => {
              const cls = r.missed ? 'miss' : Math.abs(r.dev) <= 12 ? 'ok' : 'meh';
              return `<tr><td>${t.from ? t.from + ' → ' : ''}${t.html}</td>
                <td class="num">${r.missed ? 'missed' : (r.land / 1000).toFixed(2) + ' s'}</td>
                <td class="num">${r.missed ? '–' : fmtCents(r.dev)}</td>
                <td><span class="dot ${cls}"></span></td></tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>`;
    }
    return {
      start, onFrame, preview,
      skip() { if (R.state === 'run') { record(true); next(); } },
      stop() { if (R.state === 'run') { R.state = 'idle'; renderTrack(); el('Status').textContent = ''; } },
      listen() {
        preview();
        Sound.playSeq(R.targets.map((t) => t.cents), { dur: 0.55, onNote: (i) => renderTrack(i) });
      },
      target() { return R.state === 'run' && R.targets[R.i] ? R.targets[R.i].cents : null; },
    };
  }
  const ladder = SeqRunner('ladder', buildLadder);
  const jumps = SeqRunner('jumps', buildJumps);

  // ---------- check my singing ----------
  // Records free-flowing singing, splits it into notes, and reports each note's accuracy.

  // Split recorded frames ({t, c}) into sung notes. Short glides between swaras
  // are dropped; each note's pitch is the median of its steady middle part.
  function segmentNotes(frames) {
    const labTarget = (lab) => T.CENTS[((lab % 12) + 12) % 12] + 1200 * Math.floor(lab / 12);
    const runs = [];
    let cur = null, lastT = -1e9;
    for (const f of frames) {
      if (f.c == null) continue;
      const n = T.nearest(f.c);
      const lab = n.st + 12 * n.oct;
      if (cur && f.t - lastT < 150) {
        // Stay on the current swara unless the pitch is clearly closer to another one.
        const keep = lab === cur.lab || Math.abs(f.c - labTarget(cur.lab)) < Math.abs(f.c - n.target) + 15;
        if (keep) { cur.pts.push(f); lastT = f.t; continue; }
      }
      cur = { lab, pts: [f] };
      runs.push(cur);
      lastT = f.t;
    }
    const span = (pts) => pts[pts.length - 1].t - pts[0].t;
    const merged = [];
    for (const r of runs.filter((r) => span(r.pts) >= 90)) {
      const p = merged[merged.length - 1];
      if (p && p.lab === r.lab && r.pts[0].t - p.pts[p.pts.length - 1].t < 130) p.pts.push(...r.pts);
      else merged.push({ lab: r.lab, pts: r.pts.slice() });
    }
    return merged.filter((r) => span(r.pts) >= 180).map(({ pts }) => {
      const t0 = pts[0].t, t1 = pts[pts.length - 1].t, D = t1 - t0;
      let core = pts.filter((p) => p.t >= t0 + D * 0.15 && p.t <= t1 - D * 0.1);
      if (core.length < 3) core = pts;
      const cs = core.map((p) => p.c);
      return { t0, t1, dur: D, cents: median(cs), sd: stdev(cs) };
    });
  }

  // Line up sung notes with the expected sequence (edit-distance alignment).
  function alignNotes(notes, exp) {
    const n = notes.length, m = exp.length, GAP = 2;
    const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
    for (let i = 1; i <= n; i++) { D[i][0] = i * GAP; B[i][0] = 1; }
    for (let j = 1; j <= m; j++) { D[0][j] = j * GAP; B[0][j] = 2; }
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const c = Math.min(Math.abs(notes[i - 1].cents - exp[j - 1].cents) / 50, 4);
        const opts = [D[i - 1][j - 1] + c, D[i - 1][j] + GAP, D[i][j - 1] + GAP];
        const k = opts.indexOf(Math.min(...opts));
        D[i][j] = opts[k]; B[i][j] = k;
      }
    }
    const out = [];
    for (let i = n, j = m; i > 0 || j > 0;) {
      const k = B[i][j];
      if (i > 0 && j > 0 && k === 0) { out.push({ note: notes[i - 1], exp: exp[j - 1] }); i--; j--; }
      else if (i > 0 && (j === 0 || k === 1)) { out.push({ note: notes[i - 1] }); i--; }
      else { out.push({ exp: exp[j - 1] }); j--; }
    }
    return out.reverse();
  }

  const VERDICT = {
    acc: ['good', 'Accurate'], close: ['close', 'Close'], off: ['warn', 'Off'],
    wrong: ['bad', 'Wrong swara'], outside: ['bad', 'Not in raga'], missed: ['bad', 'Missed'], extra: ['', 'Extra note'],
  };
  function heardHTML(c) {
    const n = T.nearest(c);
    const names = stSet.has(n.st) ? [T.nameFor(raga, n.st)] : T.POSITIONS[n.st].names;
    return names.map((x) => T.swaraHTML(T.tokObj(x, n.oct))).join('/');
  }
  // Judge one sung pitch against the swara it should have been.
  function judge(cents, target) {
    const off = cents - target, a = Math.abs(off);
    const v = a <= 10 ? 'acc' : a <= 25 ? 'close' : a <= 50 ? 'off' : 'wrong';
    return { off, v, score: a > 50 ? 0 : Math.max(0, Math.round(100 - a * 2)) };
  }
  function judgeFree(cents) {
    const inR = T.nearest(cents, stSet), any = T.nearest(cents);
    const target = inR.target;
    const tHTML = T.swaraHTML(T.tokObj(T.nameFor(raga, inR.st), inR.oct));
    if (!stSet.has(any.st) && Math.abs(any.dev) <= 30) return { off: cents - target, v: 'outside', score: 0, target, tHTML };
    return { ...judge(cents, target), target, tHTML };
  }

  const check = {
    rec: false, frames: [], t0: 0, lastVoiced: 0, liveAt: 0,
    mode: () => $('#checkMode').value,
    expected() {
      return [...raga.aro, ...raga.ava.slice(1)].map((s) => {
        const t = T.parseToken(s);
        return { cents: t.cents, html: T.swaraHTML(t) };
      });
    },
    renderExpected() {
      const el = $('#checkExpected');
      el.hidden = this.mode() !== 'aa';
      el.innerHTML = `<span class="chip label">Sing</span>` + this.expected().map((e) => `<span class="chip">${e.html}</span>`).join('');
    },
    async toggle() {
      if (this.rec) return this.stop();
      if (!(await ensureMic())) return;
      Sound.stopVoice();
      this.frames = []; this.rec = true; this.t0 = performance.now(); this.lastVoiced = 0;
      $('#checkStart').textContent = 'Stop and see my report';
      $('#checkListen').disabled = true;
      $('#checkResult').innerHTML = ''; $('#checkLive').innerHTML = '';
      $('#checkStatus').textContent = this.mode() === 'aa'
        ? `Listening. Sing the arohanam and avarohanam of ${raga.name} at your own pace.`
        : `Listening. Sing any swaras of ${raga.name}, holding each one for a moment.`;
    },
    onFrame(c, now) {
      if (!this.rec) return;
      this.frames.push({ t: now, c });
      if (c != null) this.lastVoiced = now;
      if (now - this.liveAt > 300) { this.liveAt = now; this.renderLive(); }
      if ((this.lastVoiced && now - this.lastVoiced > 4000) || now - this.t0 > 180000) this.stop();
    },
    renderLive() {
      const notes = segmentNotes(this.frames);
      $('#checkLive').innerHTML = notes.length
        ? `<span class="chip label">Heard</span>` + notes.map((n) => {
          const j = judgeFree(n.cents);
          const cls = j.v === 'acc' || j.v === 'close' ? 'ok' : j.v === 'off' ? 'meh' : 'miss';
          return `<span class="chip ${cls}">${heardHTML(n.cents)}</span>`;
        }).join('')
        : '';
    },
    stop() {
      this.rec = false;
      $('#checkStart').textContent = 'Start singing';
      $('#checkListen').disabled = false;
      this.renderLive();
      const notes = segmentNotes(this.frames);
      if (!notes.length) {
        $('#checkStatus').textContent = 'I could not pick out any notes. Sing a little louder or closer to the microphone, and hold each swara for at least a quarter of a second.';
        return;
      }
      $('#checkStatus').textContent = '';
      $('#checkResult').innerHTML = this.report(notes);
    },
    rows(notes) {
      if (this.mode() === 'free') {
        return notes.map((n) => ({ n, heard: heardHTML(n.cents), ...judgeFree(n.cents) }));
      }
      return alignNotes(notes, this.expected()).map(({ note, exp }) => {
        if (!note) return { v: 'missed', score: 0, tHTML: exp.html, target: exp.cents };
        if (!exp) return { n: note, heard: heardHTML(note.cents), v: 'extra' };
        return { n: note, heard: heardHTML(note.cents), tHTML: exp.html, target: exp.cents, ...judge(note.cents, exp.cents) };
      });
    },
    report(notes) {
      const rows = this.rows(notes);
      const scored = rows.filter((r) => r.v !== 'extra');
      const overall = Math.round(mean(scored.map((r) => r.score)));
      const tuned = rows.filter((r) => r.v === 'acc' || r.v === 'close').length;
      const onSwara = rows.filter((r) => r.n && r.off != null && Math.abs(r.off) <= 50 && r.v !== 'outside');
      const avgOff = mean(onSwara.map((r) => r.off));

      // Per-swara summary, worst first.
      const by = new Map();
      for (const r of onSwara) {
        if (!by.has(r.tHTML)) by.set(r.tHTML, []);
        by.get(r.tHTML).push(r.off);
      }
      const perSwara = [...by.entries()].map(([h, offs]) => ({ h, n: offs.length, m: mean(offs) }))
        .sort((a, b) => Math.abs(b.m) - Math.abs(a.m));

      // Plain-text version of the report, so the chat can explain it.
      const plain = (html) => (html || '').replace(/<sub>(\d)<\/sub>/g, '$1').replace(/<[^>]+>/g, '');
      this.summary = [
        `Raga: ${raga.name}. Mode: ${this.mode() === 'aa' ? 'arohanam and avarohanam' : 'free singing'}. Accuracy score ${overall}%, ${tuned} of ${scored.length} notes within 25 cents, overall tendency ${fmtCents(avgOff)}.`,
        'Notes (should be / sang / offset / steadiness / verdict): ' + rows.map((r) =>
          `${plain(r.tHTML) || '-'} / ${plain(r.heard) || 'not heard'} / ${r.off == null ? '-' : fmtCents(r.off)} / ${r.n ? '±' + Math.round(r.n.sd) + '¢' : '-'} / ${VERDICT[r.v][1]}`).join('; '),
      ].join('\n');

      const tips = [];
      for (const s of perSwara.filter((s) => Math.abs(s.m) > 12).slice(0, 3)) {
        tips.push(s.m > 0
          ? `${s.h} runs <b>sharp by ${Math.round(s.m)}¢</b>. Approach it from slightly below and let it settle; tension in the throat pushes notes up.`
          : `${s.h} runs <b>flat by ${Math.round(-s.m)}¢</b>. Lift it slightly and keep your breath support steady through the note.`);
      }
      const outside = rows.filter((r) => r.v === 'outside' || r.v === 'wrong');
      if (outside.length) tips.push(`${outside.length} note${outside.length > 1 ? 's' : ''} landed on a different swara from the one the raga needs. Use the Compare button to hear what you sang next to the correct swara.`);
      const missed = rows.filter((r) => r.v === 'missed');
      if (missed.length) tips.push(`${missed.length} swara${missed.length > 1 ? 's were' : ' was'} not heard. Hold each swara for at least half a second.`);
      const wobbly = rows.filter((r) => r.n && r.n.sd > 20 && r.v !== 'extra');
      if (wobbly.length) tips.push(`${wobbly.length} note${wobbly.length > 1 ? 's' : ''} wavered by more than ±20¢. For this exercise, sing plain swaras without gamakas.`);
      if (!tips.length) tips.push('Every swara was in tune. Try the strict setting in Hold the shruti, or a raga you know less well.');

      const bar = (r) => {
        if (r.off == null) return '';
        const x = 50 + Math.max(-50, Math.min(50, r.off));
        return `<div class="offbar"><span class="z25"></span><span class="z10"></span><span class="mid"></span><span class="mk ${r.v}" style="left:${x}%"></span></div>`;
      };
      let k = 0;
      const tr = rows.map((r) => {
        const [pc, pl] = VERDICT[r.v];
        const offTxt = r.off == null ? '–' : Math.abs(r.off) > 50 ? `${fmtCents(r.off)} from ${r.tHTML}` : `${fmtCents(r.off)} ${r.off > 5 ? 'sharp' : r.off < -5 ? 'flat' : ''}`;
        const cmp = r.n && r.target != null
          ? `<button class="btn" type="button" data-yours="${r.n.cents}" data-target="${r.target}" title="Plays your note, then the correct swara">Compare</button>`
          : r.target != null ? `<button class="btn" type="button" data-target="${r.target}">Hear it</button>` : '';
        return `<tr>
          <td class="num">${++k}</td>
          <td>${r.tHTML || '–'}</td>
          <td>${r.heard || '<span class="muted">not heard</span>'}</td>
          <td>${bar(r)}</td>
          <td class="num">${offTxt}</td>
          <td class="num">${r.n && r.v !== 'extra' ? '±' + Math.round(r.n.sd) + '¢' : '–'}</td>
          <td><span class="pill ${pc}">${pl}</span></td>
          <td>${cmp}</td></tr>`;
      }).join('');

      return `<div class="result">
        <div class="stats">
          <div class="stat"><span class="stat-label">Accuracy score</span><span class="stat-val">${overall}%</span></div>
          <div class="stat"><span class="stat-label">In tune (within 25¢)</span><span class="stat-val">${tuned} of ${scored.length}</span></div>
          <div class="stat"><span class="stat-label">Overall tendency</span><span class="stat-val">${onSwara.length ? fmtCents(avgOff) : '–'}</span></div>
        </div>
        <ul class="steps">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
        ${perSwara.length ? `<div class="chips"><span class="label">By swara</span>${perSwara.map((s) => `<span class="pill ${Math.abs(s.m) <= 10 ? 'good' : Math.abs(s.m) <= 25 ? 'close' : 'warn'}">${s.h} ${fmtCents(s.m)}${s.n > 1 ? ` · ${s.n}×` : ''}</span>`).join('')}</div>` : ''}
        <div class="table-wrap"><table class="result-table">
          <thead><tr><th>#</th><th>Should be</th><th>You sang</th><th>Flat ← → sharp</th><th>Offset</th><th>Steadiness</th><th>Verdict</th><th></th></tr></thead>
          <tbody>${tr}</tbody>
        </table></div>
        <p class="legend"><span><b>Accurate</b> within 10¢</span><span><b>Close</b> within 25¢</span><span><b>Off</b> within 50¢</span><span><b>Wrong swara</b> more than 50¢ away</span><span>100¢ is one semitone</span></p>
      </div>`;
    },
  };

  // ---------- free singing ----------
  const free = {
    on: 0, off: 0, voiced: 0, outside: {},
    reset() { this.on = this.off = this.voiced = 0; this.outside = {}; this.render(); },
    onFrame(c, cl, dt) {
      if (c == null) return;
      this.voiced += dt;
      if (cl.state === 'on') this.on += dt;
      else if (cl.state === 'off') {
        this.off += dt;
        const k = T.POSITIONS[cl.near.st].names[0];
        this.outside[k] = (this.outside[k] || 0) + dt;
      }
      if (Math.random() < 0.1) this.render();
    },
    render() {
      const v = this.voiced;
      $('#freeOn').textContent = v ? Math.round((this.on / v) * 100) + '%' : '–';
      $('#freeOff').textContent = v ? Math.round((this.off / v) * 100) + '%' : '–';
      $('#freeTime').textContent = v ? (v / 1000).toFixed(0) + ' s' : '–';
      const top = Object.entries(this.outside).sort((a, b) => b[1] - a[1]).filter(([, ms]) => ms > 400).slice(0, 3);
      $('#freeOut').innerHTML = top.length
        ? `Outside swaras you touched most: ${top.map(([n, ms]) => `${T.swaraHTML(n)} (${(ms / 1000).toFixed(1)} s)`).join(', ')}.`
        : v ? 'No outside swaras held so far.' : '';
    },
  };

  // ---------- setup ----------
  function setRaga(id) {
    raga = T.byId[id] || T.find('Mayamalavagowla');
    stSet = new Set(T.sortedNames(raga).map((n) => T.SEMI[n]));
    $('#vRaga').value = raga.id;
    store.set('voiceRaga', raga.id);
    ladder.stop(); jumps.stop();
    ladder.preview(); jumps.preview();
    if (check.rec) check.stop();
    check.renderExpected();
    free.reset();
    draw(performance.now());
  }
  function setExercise(v) {
    exercise = v;
    $$('#tab-voice .ex').forEach((e) => (e.hidden = e.dataset.ex !== v));
  }

  function init() {
    const mOpts = T.MELAS.map((m) => `<option value="${m.id}">${m.n} · ${m.name}${m.alias ? ` (${m.alias})` : ''}</option>`).join('');
    const jOpts = T.JANYAS.slice().sort((a, b) => a.name.localeCompare(b.name)).map((j) => `<option value="${j.id}">${j.name} · janya of ${j.parent}</option>`).join('');
    $('#vRaga').innerHTML = `<optgroup label="Janya ragas">${jOpts}</optgroup><optgroup label="Melakartas">${mOpts}</optgroup>`;
    $('#vRaga').addEventListener('change', (e) => setRaga(e.target.value));
    $('#micBtn').addEventListener('click', toggleMic);
    segment($('#exTabs'), setExercise);
    segment($('#holdTarget'), () => {});
    $('#rangeLow').addEventListener('click', () => rangeEx.start('low'));
    $('#rangeHigh').addEventListener('click', () => rangeEx.start('high'));
    $('#rangeClear').addEventListener('click', () => { range = null; store.set('range', null); renderRange(); ladder.preview(); jumps.preview(); });
    $('#checkStart').addEventListener('click', () => check.toggle());
    $('#checkMode').addEventListener('change', () => { if (check.rec) check.stop(); check.renderExpected(); });
    $('#checkListen').addEventListener('click', () => {
      const exp = check.expected();
      Sound.playSeq(exp.map((e) => e.cents), {
        dur: 0.6,
        onNote: (i) => $$('#checkExpected .chip:not(.label)').forEach((c, k) => c.classList.toggle('play', k === i)),
      });
    });
    $('#checkResult').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-target]');
      if (!b) return;
      const items = b.dataset.yours != null
        ? [{ cents: +b.dataset.yours, dur: 0.8 }, { rest: true, dur: 0.25 }, { cents: +b.dataset.target, dur: 0.9 }]
        : [{ cents: +b.dataset.target, dur: 0.9 }];
      Sound.playSeq(items);
    });
    $('#holdStart').addEventListener('click', () => hold.start());
    $('#ladderStart').addEventListener('click', () => ladder.start());
    $('#ladderListen').addEventListener('click', () => ladder.listen());
    $('#ladderSkip').addEventListener('click', () => ladder.skip());
    $('#ladderPattern').addEventListener('change', () => { ladder.stop(); ladder.preview(); });
    $('#jumpsStart').addEventListener('click', () => jumps.start());
    $('#jumpsListen').addEventListener('click', () => jumps.listen());
    $('#jumpsSkip').addEventListener('click', () => jumps.skip());
    $('#jumpSet').addEventListener('change', () => { jumps.stop(); jumps.preview(); });
    $('#freeReset').addEventListener('click', () => free.reset());
    window.addEventListener('resize', () => draw(performance.now()));
    setExercise('check');
    setRaga(store.get('voiceRaga', 'm15'));
    renderRange();
  }

  return {
    init, setRaga,
    raga: () => raga,
    lastReport: () => check.summary || "",
    onShow() { requestAnimationFrame(() => draw(performance.now())); },
    onShruti() { renderRange(); ladder.preview(); jumps.preview(); draw(performance.now()); },
  };
})();
