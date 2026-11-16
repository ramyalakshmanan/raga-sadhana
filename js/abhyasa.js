// Abhyasa gana practice: sarali, janta and dhatu varisai, sthayi exercises and
// alankarams, generated for the selected raga, played in tala at three speeds,
// and scored swara by swara while the learner sings (on swaras or aakaaram).
const Abhyasa = (() => {
  const T = Theory;

  // ---------- talas ----------
  const L = (n) => ({ type: 'laghu', n }), D = { type: 'drutam', n: 2 };
  const TALAS = {
    adi: { name: 'Adi tala', angas: [L(4), D, D] },
    dhruva: { name: 'Dhruva tala', angas: [L(4), D, L(4), L(4)] },
    matya: { name: 'Matya tala', angas: [L(4), D, L(4)] },
    rupaka: { name: 'Rupaka tala', angas: [D, L(4)] },
    triputa: { name: 'Tisra triputa tala', angas: [L(3), D, D] },
    eka: { name: 'Eka tala', angas: [L(4)] },
  };
  // Beat actions: laghu = clap then finger counts, drutam = clap then wave.
  function talaBeats(tala) {
    const out = [];
    TALAS[tala].angas.forEach((a, ai) => {
      for (let i = 0; i < a.n; i++) {
        out.push({ label: i === 0 ? 'clap' : a.type === 'laghu' ? String(i) : 'wave', clap: i === 0, angaEnd: i === a.n - 1, anga: ai });
      }
    });
    return out;
  }

  // ---------- exercise patterns ----------
  // Written for a 7-swara raga: s r g m p d n = 0..6, capitals = tara sthayi, ".n" = mandra, "," = karvai (hold).
  const LET = { s: 0, r: 1, g: 2, m: 3, p: 4, d: 5, n: 6 };
  const parse = (str) => str.split(/\s+/).filter((t) => t && t !== '|').map((t) => {
    if (t === ',') return ',';
    if (t[0] === '.') return LET[t[1]] - 7;
    return LET[t.toLowerCase()] + (t !== t.toLowerCase() ? 7 : 0);
  });
  // Sarali varisai 1–12 (Adi tala, one swara per beat in 1st speed).
  const SARALI = [
    's r g m p d n S | S n d p m g r s',
    's r s r s r g m | s r g m p d n S | S n S n S n d p | S n d p m g r s',
    's r g s r g s r | s r g m p d n S | S n d S n d S n | S n d p m g r s',
    's r g m s r g m | s r g m p d n S | S n d p S n d p | S n d p m g r s',
    's r g m p , s r | s r g m p d n S | S n d p m , S n | S n d p m g r s',
    's r g m p d s r | s r g m p d n S | S n d p m g S n | S n d p m g r s',
    's r g m p d n , | s r g m p d n S | S n d p m g r , | S n d p m g r s',
    's r g m p m g r | s r g m p d n S | S n d p m p d n | S n d p m g r s',
    's r g m p m d p | s r g m p d n S | S n d p m p g m | S n d p m g r s',
    's r g m p , g m | p , , , p , , , | g m p d n d p m | g m p g m g r s',
    'S , n d n , d p | d , p m p , p , | g m p d n d p m | g m p g m g r s',
    'S S n d n n d p | d d p m p , p , | g m p d n d p m | g m p g m g r s',
  ];
  // The rest are built from the raga's own scale, so they work for 5- and 6-swara ragas too (top = tara Sa).
  function janta1(n) {
    const out = [];
    for (let i = 0; i <= n; i++) out.push(i, i);
    for (let i = n; i >= 0; i--) out.push(i, i);
    return out;
  }
  function janta2(n) {
    const out = [];
    for (let i = 0; i + 3 <= n; i++) out.push(i, i, i + 1, i + 1, i + 2, i + 2, i + 1, i + 1, i, i, i + 1, i + 1, i + 2, i + 2, i + 3, i + 3);
    for (let t = n; t - 3 >= 0; t--) out.push(t, t, t - 1, t - 1, t - 2, t - 2, t - 1, t - 1, t, t, t - 1, t - 1, t - 2, t - 2, t - 3, t - 3);
    return out;
  }
  function dhatu1(n) {
    const out = [];
    for (let i = 0; i + 3 <= n; i++) out.push(i, i + 3, i + 2, i + 3, i + 1, i + 2, i, i + 1, i, i + 1, i + 2, i + 1, i, i + 1, i + 2, i + 3);
    for (let t = n; t - 3 >= 0; t--) out.push(t, t - 3, t - 2, t - 3, t - 1, t - 2, t, t - 1, t, t - 1, t - 2, t - 1, t, t - 1, t - 2, t - 3);
    return out;
  }
  // Alankaram: the base phrase climbs one swara at a time until it reaches tara Sa, then mirrors downwards.
  function alankaram(base, n) {
    const out = [], top = Math.max(...base);
    for (let i = 0; i + top <= n; i++) out.push(...base.map((x) => x + i));
    for (let i = 0; n - top - i >= 0; i++) out.push(...base.map((x) => n - x - i));
    return out;
  }
  // Sthayi practice: reach up to about tara Pa, or down to about mandra Pa.
  function melSthayi(n, cents) {
    let top = n;
    while (cents(top + 1) <= 1910 && top < n + 5) top++;
    const out = [];
    for (let i = 0; i <= n; i++) out.push(i);
    for (let i = n; i <= top; i++) out.push(i);
    for (let i = top - 1; i >= n; i--) out.push(i);
    out.push(',');
    for (let i = n; i <= top; i++) out.push(i);
    for (let i = top - 1; i >= 0; i--) out.push(i);
    return out;
  }
  function mandraSthayi(n, cents) {
    let low = 0;
    while (cents(low - 1) >= -510 && low > -n) low--;
    const out = [];
    for (let i = 0; i >= low; i--) out.push(i);
    for (let i = low + 1; i <= 0; i++) out.push(i);
    out.push(',');
    for (let i = 0; i <= n; i++) out.push(i);
    for (let i = n - 1; i >= low; i--) out.push(i);
    for (let i = low + 1; i <= 0; i++) out.push(i);
    return out;
  }

  const EXERCISES = [
    ...SARALI.map((p, i) => ({ id: 'sarali' + (i + 1), group: 'Sarali varisai', name: `Sarali varisai ${i + 1}`, tala: 'adi', seven: true, gen: () => parse(p) })),
    { id: 'janta1', group: 'Janta varisai', name: 'Janta varisai 1', tala: 'adi', gen: janta1 },
    { id: 'janta2', group: 'Janta varisai', name: 'Janta varisai 2', tala: 'adi', gen: janta2 },
    { id: 'dhatu1', group: 'Dhatu varisai', name: 'Dhatu varisai 1', tala: 'adi', gen: dhatu1 },
    { id: 'mel', group: 'Sthayi practice', name: 'Mel sthayi practice (up to tara Pa)', tala: 'adi', gen: melSthayi },
    { id: 'mandra', group: 'Sthayi practice', name: 'Mandra sthayi practice (down to mandra Pa)', tala: 'adi', gen: mandraSthayi },
    { id: 'al-dhruva', group: 'Alankaram', name: 'Alankaram 1 · Dhruva tala', tala: 'dhruva', gen: (n) => alankaram([0, 1, 2, 3, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3], n) },
    { id: 'al-matya', group: 'Alankaram', name: 'Alankaram 2 · Matya tala', tala: 'matya', gen: (n) => alankaram([0, 1, 2, 1, 0, 1, 0, 1, 2, 3], n) },
    { id: 'al-rupaka', group: 'Alankaram', name: 'Alankaram 3 · Rupaka tala', tala: 'rupaka', gen: (n) => alankaram([0, 1, 0, 1, 2, 3], n) },
    { id: 'al-triputa', group: 'Alankaram', name: 'Alankaram 5 · Tisra triputa tala', tala: 'triputa', gen: (n) => alankaram([0, 1, 2, 0, 1, 2, 3], n) },
    { id: 'al-eka', group: 'Alankaram', name: 'Alankaram 7 · Eka tala', tala: 'eka', gen: (n) => alankaram([0, 1, 2, 3], n) },
    { id: 'aa', group: 'Raga', name: 'Arohanam and avarohanam', tala: 'adi', any: true },
  ];
  const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

  // ---------- raga scale ----------
  // A raga is "straight" when it climbs and descends through the same swaras in order.
  // Varisais and alankarams are built on that scale; zig-zag (vakra) ragas and ragas whose
  // arohanam and avarohanam differ get the arohanam–avarohanam drill and their parent melakarta.
  function scaleOf(r) {
    const up = r.aro.map(T.parseToken), down = r.ava.map(T.parseToken);
    const mono = (a, dir) => a.every((x, i) => i === 0 || (dir > 0 ? x.cents > a[i - 1].cents : x.cents < a[i - 1].cents));
    const upNames = up.filter((x) => x.oct === 0).map((x) => x.name);
    const downNames = down.filter((x) => x.oct === 0).map((x) => x.name).reverse();
    const straight = mono(up, 1) && mono(down, -1) && upNames.join() === downNames.join()
      && up[0].name === 'S' && up[up.length - 1].oct === 1;
    return { straight, names: upNames, n: upNames.length };
  }

  // ---------- state ----------
  let raga = null, scale = null, exId = store.get('abEx', 'sarali1');
  let speed = store.get('abSpeed', '1'), voiceMode = 'swaras';
  let sheet = null;   // { cells, noteOfCell, notes(base), tala, perAv }
  let run = null;     // the playback / scoring in progress
  let lastSummary = '';

  const degName = (d) => ({ name: scale.names[((d % scale.n) + scale.n) % scale.n], oct: Math.floor(d / scale.n) });
  const degCents = (d) => { const x = degName(d); return T.centsOf(x.name, x.oct); };

  // Build the exercise as display cells and base notes (1st speed, in beats).
  function build() {
    const ex = EX[exId];
    let tokens;
    if (ex.id === 'aa') {
      tokens = [...raga.aro, ...raga.ava.slice(1)].map((t) => { const p = T.parseToken(t); return { name: p.name, oct: p.oct }; });
    } else {
      tokens = ex.gen(scale.n, degCents).map((d) => (d === ',' ? ',' : degName(d)));
    }
    const beats = talaBeats(ex.tala), perAv = beats.length;
    while (tokens.length % perAv) tokens.push(',');     // finish the last avartanam
    const notes = [], noteOfCell = [];
    tokens.forEach((t, c) => {
      if (t === ',') {
        if (notes.length) { notes[notes.length - 1].dur += 1; notes[notes.length - 1].cells.push(c); noteOfCell[c] = notes.length - 1; }
        else noteOfCell[c] = -1;
        return;
      }
      notes.push({ name: t.name, oct: t.oct, cents: T.centsOf(t.name, t.oct), start: c, dur: 1, cells: [c] });
      noteOfCell[c] = notes.length - 1;
    });
    sheet = { ex, tokens, notes, noteOfCell, beats, perAv };
  }

  // ---------- rendering ----------
  function renderSheet() {
    const { tokens, beats, perAv } = sheet;
    const lines = [];
    for (let a = 0; a < tokens.length; a += perAv) {
      let html = '';
      for (let b = 0; b < perAv; b++) {
        const c = a + b, t = tokens[c];
        html += `<span class="cell${t === ',' ? ' karvai' : ''}" data-c="${c}">${t === ',' ? ',' : T.swaraHTML(T.tokObj(t.name, t.oct))}</span>`;
        if (beats[b].angaEnd) html += `<span class="bar">${b === perAv - 1 ? '‖' : '|'}</span>`;
      }
      lines.push(`<div class="sheet-line">${html}</div>`);
    }
    $('#abSheet').innerHTML = lines.join('');
    $('#abSheet').classList.toggle('aakaram', voiceMode === 'aa');
    $('#abTala').innerHTML = `<span class="label">${TALAS[sheet.ex.tala].name}</span><div class="tala-beats">${beats.map((b, i) => `<span class="beat${b.clap ? ' clap' : ''}${b.angaEnd && i < beats.length - 1 ? ' gap' : ''}" data-b="${i}">${b.label}</span>`).join('')}</div>`;
  }

  function renderPicker() {
    const groups = [...new Set(EXERCISES.map((e) => e.group))];
    const usable = (e) => e.any || (scale.straight && (!e.seven || scale.n === 7));
    $('#abExercise').innerHTML = groups.map((g) => `<optgroup label="${g}">${EXERCISES.filter((e) => e.group === g).map((e) => `<option value="${e.id}" ${usable(e) ? '' : 'disabled'}>${e.name}</option>`).join('')}</optgroup>`).join('');
    if (!usable(EX[exId])) exId = EXERCISES.find(usable).id;
    $('#abExercise').value = exId;

    const notice = $('#abNotice');
    const parent = T.MELAS[raga.parent - 1];
    if (!scale.straight) {
      notice.hidden = false;
      notice.innerHTML = `<p><b>${raga.name}</b> ${T.classify(raga).vakra ? 'moves in a zig-zag (vakra) order' : 'uses different swaras going up and coming down'}, so varisais and alankarams aren't built on it directly. Practise its arohanam and avarohanam here, and the varisais in its parent melakarta.</p>
        <div class="row"><button class="btn" type="button" data-parent="${parent.id}">Practise in ${parent.name} (${parent.n})</button></div>`;
    } else if (scale.n !== 7) {
      notice.hidden = false;
      notice.innerHTML = `<p><b>${raga.name}</b> has ${scale.n} swaras, so the sarali varisais (written for seven) are off. Janta, dhatu, sthayi and alankaram exercises are built on its own ${scale.n} swaras.</p>`;
    } else notice.hidden = true;
  }

  function onRaga(r) {
    stop();
    raga = r; scale = scaleOf(r);
    renderPicker(); build(); renderSheet();
    $('#abResult').innerHTML = '';
  }

  // ---------- playback and scoring ----------
  const SPEEDS = { 1: 1, 2: 2, 3: 4 };
  const LAT = 0.09; // seconds: allowance for audio output, mic input and the singer's reaction

  async function start(mode) {
    stop();
    if (mode === 'sing' && !(await Voice.ensureMic())) return;
    const ctx = Sound.init();
    const bpm = +$('#abTempo').value, beat = 60 / bpm;
    const speeds = speed === 'all' ? [1, 2, 3] : [+speed];
    const perAv = sheet.perAv, baseUnits = sheet.tokens.length;
    const COUNT_IN = 4;

    // Lay out every note of every speed on one timeline, in beats from the end of the count-in.
    const notes = [];
    const segments = [];
    let at = 0;
    speeds.forEach((s) => {
      const mult = SPEEDS[s];
      segments.push({ speed: s, from: at });
      sheet.notes.forEach((n, i) => notes.push({ ...n, base: i, speed: s, t: at + n.start / mult, len: n.dur / mult }));
      at += Math.ceil(baseUnits / mult / perAv) * perAv;   // next speed starts on a fresh avartanam
    });
    const totalBeats = at;

    const t0 = ctx.currentTime + 0.25;
    const perf0 = performance.now() + 250;
    const tAt = (b) => t0 + (COUNT_IN + b) * beat;

    if ($('#abClick').checked) {
      for (let i = 0; i < COUNT_IN; i++) Sound.click(t0 + i * beat, i === 0 ? 'clap' : 'soft');
      for (let b = 0; b < totalBeats; b++) {
        const tb = sheet.beats[b % perAv];
        Sound.click(tAt(b), b % perAv === 0 ? 'sam' : tb.clap ? 'clap' : 'soft');
      }
    }
    if (mode === 'listen' || $('#abGuide').checked) {
      const items = [{ rest: true, dur: COUNT_IN * beat }];
      let cur = 0;
      for (const n of notes) {
        if (n.t > cur + 1e-6) items.push({ rest: true, dur: (n.t - cur) * beat });
        items.push({ cents: n.cents, dur: n.len * beat });
        cur = n.t + n.len;
      }
      Sound.playSeq(items, { at: t0 });
    }

    run = { mode, notes, segments, beat, perf0, COUNT_IN, totalBeats, frames: [], results: [], next: 0, lastCells: [], raf: 0 };
    $('#abListen').hidden = $('#abSing').hidden = true;
    $('#abStop').hidden = false;
    $('#abResult').innerHTML = '';
    $$('#abSheet .cell').forEach((c) => c.classList.remove('ok', 'meh', 'miss', 'now'));
    run.raf = requestAnimationFrame(tick);
  }

  function tick() {
    if (!run) return;
    run.raf = requestAnimationFrame(tick);
    const nowS = (performance.now() - run.perf0) / 1000;
    const b = nowS / run.beat - run.COUNT_IN;      // position in beats
    if (b < 0) {
      $('#abStatus').textContent = nowS < 0 ? 'Get ready…' : `Get ready… ${run.COUNT_IN - Math.floor(nowS / run.beat)}`;
      return;
    }
    const seg = [...run.segments].reverse().find((s) => b >= s.from);
    $('#abStatus').textContent = `${['', '1st', '2nd', '3rd'][seg.speed]} speed${voiceMode === 'aa' ? ' · sing on “aa”' : ''}`;
    // Tala beat
    const beatIdx = Math.floor(b) % sheet.perAv;
    $$('#abTala .beat').forEach((el, i) => el.classList.toggle('now', i === beatIdx && b < run.totalBeats));
    // Current note
    const k = run.notes.findIndex((n) => b >= n.t && b < n.t + n.len);
    run.lastCells.forEach((c) => c.classList.remove('now'));
    run.lastCells = [];
    if (k >= 0) {
      for (const c of run.notes[k].cells) { const el = $(`#abSheet [data-c="${c}"]`); if (el) { el.classList.add('now'); run.lastCells.push(el); } }
      if (run.lastCells[0]) run.lastCells[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    // Score notes whose listening window has closed
    if (run.mode === 'sing') {
      while (run.next < run.notes.length) {
        const n = run.notes[run.next];
        const endMs = run.perf0 + ((run.COUNT_IN + n.t + n.len) * run.beat + LAT) * 1000;
        if (performance.now() < endMs + 30) break;
        score(run.next);
        run.next++;
      }
    }
    if (b > run.totalBeats + 0.3) finish();
  }

  function score(i) {
    const n = run.notes[i], beatMs = run.beat * 1000;
    const startMs = run.perf0 + (run.COUNT_IN + n.t) * beatMs;
    const durMs = n.len * beatMs;
    // Skip the first part of each note (the move from the previous swara); listen to the rest.
    const from = startMs + Math.max(0.3 * durMs, 40) + LAT * 1000;
    const to = startMs + durMs + LAT * 1000;
    const cs = run.frames.filter((f) => f.t >= from && f.t <= to && f.c != null).map((f) => f.c);
    let res;
    if (cs.length < 2) res = { v: 'miss', score: 0 };
    else {
      let c = median(cs);
      // An octave slip still counts against the swara, but report it plainly.
      const off = c - n.cents, a = Math.abs(off);
      res = { off, v: a <= 15 ? 'ok' : a <= 30 ? 'meh' : 'miss', score: a > 50 ? 0 : Math.max(0, Math.round(100 - a * 2)), wrong: a > 50 };
    }
    run.results[i] = res;
    for (const c of n.cells) { const el = $(`#abSheet [data-c="${c}"]`); if (el) { el.classList.remove('ok', 'meh', 'miss'); el.classList.add(res.v); } }
  }

  function onFrame(c, now) {
    if (run && run.mode === 'sing') run.frames.push({ t: now, c });
  }

  function stop() {
    if (!run) return;
    cancelAnimationFrame(run.raf);
    Sound.stopVoice(); Sound.stopClicks();
    run.lastCells.forEach((c) => c.classList.remove('now'));
    $$('#abTala .beat').forEach((el) => el.classList.remove('now'));
    run = null;
    $('#abListen').hidden = $('#abSing').hidden = false;
    $('#abStop').hidden = true;
    $('#abStatus').textContent = '';
  }

  function finish() {
    const r = run;
    if (r.mode === 'sing') while (r.next < r.notes.length) { score(r.next); r.next++; }
    stop();
    if (r.mode !== 'sing') return;
    $('#abResult').innerHTML = report(r);
  }

  // ---------- report ----------
  function report(r) {
    const label = (n) => T.swaraText(n.name, n.oct);
    const html = (n) => T.swaraHTML(T.tokObj(n.name, n.oct));
    const rows = r.notes.map((n, i) => ({ n, res: r.results[i] })).filter((x) => x.res);
    const avg = (xs) => (xs.length ? Math.round(mean(xs)) : 0);
    const overall = avg(rows.map((x) => x.res.score));
    const heard = rows.filter((x) => x.res.off != null);
    const inTune = heard.filter((x) => Math.abs(x.res.off) <= 15).length;

    const speeds = [...new Set(rows.map((x) => x.n.speed))];
    const bySpeed = speeds.map((s) => {
      const xs = rows.filter((x) => x.n.speed === s);
      return { s, score: avg(xs.map((x) => x.res.score)), tune: xs.filter((x) => x.res.off != null && Math.abs(x.res.off) <= 15).length, total: xs.length };
    });

    // Per swara
    const by = new Map();
    for (const x of heard) {
      const k = x.n.name + ':' + x.n.oct;
      if (!by.has(k)) by.set(k, { n: x.n, offs: [] });
      by.get(k).offs.push(x.res.off);
    }
    const perSwara = [...by.values()].map((g) => ({ ...g, m: mean(g.offs.filter((o) => Math.abs(o) <= 50)), pct: Math.round(100 * g.offs.filter((o) => Math.abs(o) <= 15).length / g.offs.length) }))
      .sort((a, b) => T.centsOf(a.n.name, a.n.oct) - T.centsOf(b.n.name, b.n.oct));

    // Transitions: how well each arrival swara landed, grouped by where it came from.
    const tr = new Map();
    rows.forEach((x, i) => {
      if (i === 0 || !x.res) return;
      const prev = rows[i - 1];
      if (prev.n.speed !== x.n.speed || (prev.n.name === x.n.name && prev.n.oct === x.n.oct)) return;
      const k = label(prev.n) + '→' + label(x.n);
      if (!tr.has(k)) tr.set(k, { a: prev.n, b: x.n, errs: [] });
      tr.get(k).errs.push(x.res.off == null ? 60 : Math.min(60, Math.abs(x.res.off)));
    });
    const hardest = [...tr.values()].map((t) => ({ ...t, e: mean(t.errs) })).filter((t) => t.e > 15).sort((a, b) => b.e - a.e).slice(0, 5);

    const tips = [];
    const sharp = perSwara.filter((s) => s.m > 12), flat = perSwara.filter((s) => s.m < -12);
    if (sharp.length) tips.push(`Sharp on ${sharp.map((s) => `${html(s.n)} (${fmtCents(s.m)})`).join(', ')}. Approach these from slightly below and let them settle.`);
    if (flat.length) tips.push(`Flat on ${flat.map((s) => `${html(s.n)} (${fmtCents(s.m)})`).join(', ')}. Lift them and keep the breath steady to the end of each swara.`);
    if (bySpeed.length > 1 && bySpeed[bySpeed.length - 1].score < bySpeed[0].score - 10) tips.push(`Accuracy drops as the speed goes up (${bySpeed.map((s) => `${s.score}%`).join(' → ')}). Practise 2nd and 3rd speed at a slower tempo first, and raise the tempo only when the swaras stay in place.`);
    if (hardest.length) tips.push(`Practise the hardest jumps slowly on their own: ${hardest.slice(0, 3).map((t) => `${html(t.a)} → ${html(t.b)}`).join(', ')}.`);
    const missed = rows.filter((x) => x.res.v === 'miss' && x.res.off == null).length;
    if (missed > rows.length * 0.2) tips.push(`${missed} swaras weren't heard. Sing a little louder or closer to the microphone, and use headphones so the guide voice doesn't mix in.`);
    if (!tips.length) tips.push('Every swara held its sthanam. Try a faster tempo, all three speeds, or aakaaram.');

    lastSummary = `${sheet.ex.name} in ${raga.name}, ${voiceMode === 'aa' ? 'aakaaram' : 'swaras'}, ${+$('#abTempo').value} bpm. Score ${overall}%. ` +
      bySpeed.map((s) => `${['', '1st', '2nd', '3rd'][s.s]} speed ${s.score}%`).join(', ') + '. Per swara: ' +
      perSwara.map((s) => `${label(s.n)} ${fmtCents(s.m)} (${s.pct}% in tune)`).join(', ') + '.';

    return `<div class="result">
      <div class="stats">
        <div class="stat"><span class="stat-label">Sthanam score</span><span class="stat-val">${overall}%</span></div>
        <div class="stat"><span class="stat-label">Swaras within 15¢</span><span class="stat-val">${inTune} of ${rows.length}</span></div>
        <div class="stat"><span class="stat-label">${bySpeed.length > 1 ? 'By speed' : 'Speed'}</span><span class="stat-val small-val">${bySpeed.map((s) => `${['', '1st', '2nd', '3rd'][s.s]} ${s.score}%`).join(' · ')}</span></div>
      </div>
      <ul class="steps">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="ab-report">
        <div>
          <p class="label">Each swara</p>
          <div class="table-wrap"><table class="result-table">
            <thead><tr><th>Swara</th><th>Sung</th><th>Average offset</th><th>Within 15¢</th></tr></thead>
            <tbody>${perSwara.map((s) => `<tr><td>${html(s.n)}</td><td class="num">${s.offs.length}×</td><td class="num">${fmtCents(s.m)} ${s.m > 5 ? 'sharp' : s.m < -5 ? 'flat' : ''}</td><td class="num"><span class="pill ${s.pct >= 80 ? 'good' : s.pct >= 50 ? 'close' : 'warn'}">${s.pct}%</span></td></tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div>
          <p class="label">Hardest transitions</p>
          ${hardest.length ? `<div class="table-wrap"><table class="result-table">
            <thead><tr><th>From → to</th><th>Landing error</th><th></th></tr></thead>
            <tbody>${hardest.map((t) => `<tr><td>${html(t.a)} → ${html(t.b)}</td><td class="num">${Math.round(t.e)}¢</td><td><button class="btn" type="button" data-pair="${t.a.cents ?? T.centsOf(t.a.name, t.a.oct)},${T.centsOf(t.b.name, t.b.oct)}">Hear it</button></td></tr>`).join('')}</tbody>
          </table></div>` : '<p class="muted small">Every move between swaras landed within 15¢.</p>'}
        </div>
      </div>
      <p class="legend"><span>Swaras in the notation are coloured: <b>green</b> within 15¢, <b>amber</b> within 30¢, <b>red</b> further off or not heard.</span></p>
    </div>`;
  }

  // ---------- setup ----------
  function init() {
    segment($('#abSpeed'), (v) => { speed = v; store.set('abSpeed', v); }).set(speed);
    segment($('#abVoice'), (v) => { voiceMode = v; $('#abSheet').classList.toggle('aakaram', v === 'aa'); });
    $('#abExercise').addEventListener('change', (e) => { stop(); exId = e.target.value; store.set('abEx', exId); build(); renderSheet(); $('#abResult').innerHTML = ''; });
    const tempo = $('#abTempo');
    tempo.value = store.get('abTempo', 60);
    $('#abTempoVal').textContent = tempo.value;
    tempo.addEventListener('input', () => { $('#abTempoVal').textContent = tempo.value; store.set('abTempo', +tempo.value); });
    $('#abListen').addEventListener('click', () => start('listen'));
    $('#abSing').addEventListener('click', () => start('sing'));
    $('#abStop').addEventListener('click', () => { if (run && run.mode === 'sing' && run.next > 0) finish(); else stop(); });
    $('#abNotice').addEventListener('click', (e) => { const b = e.target.closest('[data-parent]'); if (b) Voice.setRaga(b.dataset.parent); });
    $('#abResult').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pair]');
      if (b) { const [a, c] = b.dataset.pair.split(',').map(Number); Sound.playSeq([{ cents: a, dur: 0.7 }, { cents: c, dur: 1 }]); }
    });
  }

  return {
    init, onRaga, onFrame, stop,
    target: () => {
      if (!run || run.mode !== 'sing') return null;
      const b = (performance.now() - run.perf0) / 1000 / run.beat - run.COUNT_IN;
      const n = run.notes.find((x) => b >= x.t && b < x.t + x.len);
      return n ? n.cents : null;
    },
    lastReport: () => lastSummary,
    _internals: { EX, scaleOf, talaBeats, build: () => sheet, setEx: (id) => { exId = id; build(); renderSheet(); } },
  };
})();
