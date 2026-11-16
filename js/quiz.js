// Quiz: mixed questions on melakarta–janya relationships, the swaras of each
// raga, mela names and numbers, and recognising ragas by ear.
const Quiz = (() => {
  const T = Theory;

  const TYPES = [
    { id: 'scale', label: 'Scale → raga', desc: 'Read the arohanam and avarohanam, name the raga.' },
    { id: 'listen', label: 'Listen → raga', desc: 'Hear the arohanam and avarohanam, name the raga.', audio: true },
    { id: 'melody', label: 'Melody → raga', desc: 'Hear a short melody in the raga, name the raga.', audio: true },
    { id: 'parent', label: 'Janya → melakarta', desc: 'Find the parent melakarta of a janya raga.' },
    { id: 'child', label: 'Melakarta → janya', desc: 'Pick the raga that is a janya of a given melakarta.' },
    { id: 'number', label: 'Melakarta numbers', desc: 'Match melakarta names and numbers, both ways.' },
    { id: 'swaras', label: 'Swaras of a raga', desc: 'Its arohanam, the swaras it uses and the ones it leaves out.' },
  ];
  const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));

  const POPULAR = ['Mayamalavagowla', 'Sankarabharanam', 'Kalyani', 'Kharaharapriya', 'Todi', 'Harikambhoji',
    'Natabhairavi', 'Keeravani', 'Shanmukhapriya', 'Charukesi', 'Mohanam', 'Hindolam', 'Hamsadhwani',
    'Madhyamavati', 'Abheri', 'Bilahari', 'Sriranjani', 'Malahari', 'Saveri', 'Arabhi', 'Kedaragowla',
    'Amritavarshini', 'Hamsanandi', 'Vasantha', 'Shivaranjani', 'Revati', 'Suddha Saveri', 'Shuddha Dhanyasi',
    'Kalyanavasantham', 'Mohanakalyani', 'Nata', 'Dhanyasi', 'Hemavati', 'Simhendramadhyamam', 'Dharmavati',
    'Pantuvarali', 'Chakravakam', 'Vachaspati', 'Latangi'];

  let settings = store.get('quizSettings', { types: ['scale', 'listen', 'parent', 'child', 'number', 'swaras'], level: 'popular', length: 10 });
  let run = null;   // the session in progress
  let q = null;     // the current question

  // ---------- helpers ----------
  const seqKey = (r) => r.aro.join(' ') + '|' + r.ava.join(' ');
  const setKey = (r) => T.sortedNames(r).join(' ');
  const where = (r) => (r.kind === 'mela' ? `melakarta ${r.n}` : `janya of ${T.melaLabel(T.MELAS[r.parent - 1])}`);
  const ragaName = (r) => (r.alias ? `${r.name} (${r.alias})` : r.name);
  const scaleHTML = (r) => `<div class="dir">
      <span class="label">Arohanam</span>${T.seqHTML(r.aro)}<span></span>
      <span class="label">Avarohanam</span>${T.seqHTML(r.ava)}<span></span>
    </div>`;

  function pool() {
    const base = settings.level === 'popular' ? POPULAR.map(T.find).filter(Boolean) : T.ALL;
    if (run && run.focus && run.focus.size) {
      const f = base.filter((r) => run.focus.has(r.id));
      if (f.length) return f;
    }
    return base;
  }
  // Pick a subject not yet used this session where possible.
  function fresh(list) {
    const unused = list.filter((r) => !run.used.has(r.id));
    const r = pick(unused.length ? unused : list);
    run.used.add(r.id);
    return r;
  }
  // Ragas that look or sound most like r (shared swaras, same parent), for tricky options.
  function similar(r, cands, n, ok) {
    const sr = T.swaraSet(r);
    const scored = cands.filter((c) => c !== r && ok(c)).map((c) => {
      const sc = T.swaraSet(c);
      const inter = [...sr].filter((x) => sc.has(x)).length;
      const uni = new Set([...sr, ...sc]).size;
      return { c, s: inter / uni + (c.parent === r.parent ? 0.15 : 0) + Math.random() * 0.2 };
    }).sort((a, b) => b.s - a.s);
    return shuffle(scored.slice(0, n * 2).map((x) => x.c)).slice(0, n);
  }
  const ragaOpt = (r, correct) => ({ html: ragaName(r), sub: r.kind === 'mela' ? `Melakarta ${r.n}` : '', correct, raga: r });
  const melaOpt = (m, correct) => ({ html: m.name, sub: `Melakarta ${m.n}`, correct, raga: m });

  // A short tune that walks up the arohanam and down the avarohanam with small
  // turns and varied note lengths. Every swara of the raga is heard in its proper order.
  function melody(r) {
    const A = r.aro.map((t) => T.parseToken(t).cents), D = r.ava.map((t) => T.parseToken(t).cents);
    const b = 0.34, out = [];
    const n = (c, d = b) => out.push({ cents: c, dur: d });
    A.forEach((c, i) => {
      n(c, Math.random() < 0.25 ? b * 2 : b);
      if (i >= 2 && i < A.length - 1 && Math.random() < 0.35) { n(A[i - 1]); n(c); }
    });
    out[out.length - 1].dur = b * 2.6;
    D.slice(1).forEach((c, k) => {
      const i = k + 1;
      n(c, Math.random() < 0.25 ? b * 2 : b);
      if (i < D.length - 2 && Math.random() < 0.35) { n(D[i - 1]); n(c); }
    });
    out[out.length - 1].dur = b * 3.2;
    return out;
  }

  // ---------- question generators ----------
  // Each returns { type, subject, prompt, options[], explain, summary, play? }.
  const GEN = {
    scale() {
      const r = fresh(pool());
      const opts = similar(r, pool().length >= 8 ? pool() : T.ALL, 3, (c) => seqKey(c) !== seqKey(r));
      return {
        subject: r, summary: `Scale shown: ${r.aro.map(T.tokText).join(' ')} / ${r.ava.map(T.tokText).join(' ')}`,
        prompt: `<p>Which raga has this arohanam and avarohanam?</p>${scaleHTML(r)}`,
        options: shuffle([ragaOpt(r, true), ...opts.map((o) => ragaOpt(o, false))]),
        explain: `<b>${ragaName(r)}</b>, ${where(r)}. ${T.classify(r).type}${T.classify(r).vakra ? ', vakra' : ''}.`,
      };
    },
    listen() {
      const r = fresh(pool());
      const opts = similar(r, pool().length >= 8 ? pool() : T.ALL, 3, (c) => seqKey(c) !== seqKey(r));
      const toks = [...r.aro, ...r.ava.slice(1)];
      return {
        subject: r, summary: 'Listen to the arohanam and avarohanam',
        prompt: '<p>Listen to the arohanam and avarohanam. Which raga is it?</p>',
        play: [['Play', () => Sound.playSeq(toks, { dur: 0.48 })], ['Arohanam', () => Sound.playSeq(r.aro, { dur: 0.48 })], ['Avarohanam', () => Sound.playSeq(r.ava, { dur: 0.48 })]],
        options: shuffle([ragaOpt(r, true), ...opts.map((o) => ragaOpt(o, false))]),
        explain: `<b>${ragaName(r)}</b>, ${where(r)}.${scaleHTML(r)}`,
      };
    },
    melody() {
      const r = fresh(pool());
      // Options must use a different set of swaras, so the tune itself decides the answer.
      const opts = similar(r, pool().length >= 8 ? pool() : T.ALL, 3, (c) => setKey(c) !== setKey(r));
      const tune = melody(r);
      return {
        subject: r, summary: 'Listen to a melody',
        prompt: '<p>Listen to this short melody. Which raga is it in?</p><p class="small muted">A tune built from the raga\'s arohanam and avarohanam, without gamakas.</p>',
        play: [['Play melody', () => Sound.playSeq(tune)], ['Play Sa', () => Sound.playSeq([{ cents: 0, dur: 1.2 }])]],
        options: shuffle([ragaOpt(r, true), ...opts.map((o) => ragaOpt(o, false))]),
        explain: `<b>${ragaName(r)}</b>, ${where(r)}.${scaleHTML(r)}`,
      };
    },
    parent() {
      const janyas = pool().filter((r) => r.kind === 'janya');
      const j = fresh(janyas.length ? janyas : T.JANYAS);
      const parent = T.MELAS[j.parent - 1];
      const used = [...T.swaraSet(j)];
      const cands = new Set(T.consistentMelas(j).map((m) => m.n));
      const others = T.MELAS.filter((m) => !cands.has(m.n)).map((m) => ({ m, miss: used.filter((s) => !m.swaras.includes(s)).length }));
      let d = sample(others.filter((o) => o.miss === 1).map((o) => o.m), 3);
      if (d.length < 3) d = d.concat(sample(others.filter((o) => o.miss === 2).map((o) => o.m), 3 - d.length));
      const n = cands.size;
      return {
        subject: j, summary: `Parent melakarta of ${j.name}`,
        prompt: `<p>Which melakarta is the parent of <b>${j.name}</b>?</p>
          <details class="hint"><summary>Show its swaras</summary>${scaleHTML(j)}</details>`,
        options: shuffle([melaOpt(parent, true), ...d.map((m) => melaOpt(m, false))]),
        explain: `${j.name} uses ${T.sortedNames(j).map((x) => T.swaraHTML(x)).join(' ')}. ${n === 1
          ? `Only ${T.melaLabel(parent)} contains all of these.`
          : `${n} melakartas contain all of these; tradition assigns it to ${T.melaLabel(parent)}. Each wrong option is missing at least one of its swaras.`}`,
      };
    },
    child() {
      const janyas = pool().filter((r) => r.kind === 'janya');
      const src = janyas.length >= 4 ? janyas : T.JANYAS;
      const j = fresh(src);
      const m = T.MELAS[j.parent - 1];
      const fits = (r) => [...T.swaraSet(r)].every((s) => m.swaras.includes(s));
      let d = similar(j, src, 3, (c) => !fits(c));
      if (d.length < 3) d = d.concat(sample(T.JANYAS.filter((c) => c !== j && !fits(c) && !d.includes(c)), 3 - d.length));
      const outside = (r) => [...T.swaraSet(r)].find((s) => !m.swaras.includes(s));
      return {
        subject: j, summary: `A janya of ${m.name}`,
        prompt: `<p>Which of these ragas is a janya of <b>${m.name}</b> (melakarta ${m.n})?</p>
          <details class="hint"><summary>Show ${m.name}'s swaras</summary>${T.seqHTML(m.aro)}</details>`,
        options: shuffle([ragaOpt(j, true), ...d.map((o) => ragaOpt(o, false))]),
        explain: `<b>${j.name}</b> is a janya of ${T.melaLabel(m)}. ${d.map((o) => `${o.name} uses ${T.swaraHTML(outside(o))}, which ${m.name} does not have`).join('; ')}.`,
      };
    },
    number() {
      const melas = settings.level === 'popular' ? pool().filter((r) => r.kind === 'mela') : T.MELAS;
      const m = fresh(melas.length >= 4 ? melas : T.MELAS);
      const twin = m.n > 36 ? m.n - 36 : m.n + 36;
      const near = [...new Set([twin, m.n + 1, m.n - 1, m.n + 6, m.n - 6, m.n + 5, m.n - 5])]
        .filter((x) => x >= 1 && x <= 72 && x !== m.n);
      const picks = sample(near, 3).map((x) => T.MELAS[x - 1]);
      const explain = T.derivation(m);
      if (Math.random() < 0.5) {
        return {
          subject: m, summary: `Number of ${m.name}`,
          prompt: `<p>What is the melakarta number of <b>${ragaName(m)}</b>?</p>`,
          options: shuffle([{ html: String(m.n), correct: true, raga: m }, ...picks.map((x) => ({ html: String(x.n), correct: false, raga: x }))]),
          explain,
        };
      }
      return {
        subject: m, summary: `Melakarta number ${m.n}`,
        prompt: `<p>Which melakarta is number <b>${m.n}</b>?</p>`,
        options: shuffle([{ html: ragaName(m), correct: true, raga: m }, ...picks.map((x) => ({ html: ragaName(x), correct: false, raga: x }))]),
        explain,
      };
    },
    swaras() {
      const r = fresh(pool());
      const kinds = ['aro', 'variant'];
      if (r.kind === 'janya' && T.varjya(r).length) kinds.push('varjya', 'varjya');
      const kind = pick(kinds);
      const names = T.sortedNames(r);
      if (kind === 'varjya') {
        const v = pick(T.varjya(r));
        const usedOpts = sample(names.filter((x) => x !== 'S' && x !== 'P'), 3);
        return {
          subject: r, summary: `Swara left out of ${r.name}`,
          prompt: `<p>Which of these swaras does <b>${r.name}</b> leave out?</p>`,
          options: shuffle([{ html: T.swaraHTML(v), sub: T.FULL_NAME[v], correct: true }, ...usedOpts.map((x) => ({ html: T.swaraHTML(x), sub: T.FULL_NAME[x], correct: false }))]),
          explain: `${r.name} (${where(r)}) omits ${T.varjya(r).map((x) => T.swaraHTML(x)).join(' and ')}.${scaleHTML(r)}`,
        };
      }
      if (kind === 'variant') {
        // Which version of a swara (R, G, M, D or N) does the raga use?
        // Letters the raga uses in exactly one form, or skips altogether (then "None" is right).
        const letters = ['R', 'G', 'M', 'D', 'N'].filter((L) => names.filter((x) => x[0] === L).length <= 1);
        const L = pick(letters.length ? letters : ['M']);
        const usedName = names.find((x) => x[0] === L);
        const all = L === 'M' ? ['M1', 'M2'] : [L + '1', L + '2', L + '3'];
        const LETTER = { R: 'rishabham', G: 'gandharam', M: 'madhyamam', D: 'dhaivatam', N: 'nishadam' }[L];
        const opts = all.map((x) => ({ html: T.swaraHTML(x), sub: T.FULL_NAME[x], correct: x === usedName }));
        opts.push({ html: 'None', sub: `${r.name} has no ${LETTER}`, correct: !usedName });
        return {
          subject: r, summary: `Which ${LETTER} ${r.name} uses`,
          prompt: `<p>Which ${LETTER} does <b>${r.name}</b> use?</p>`,
          options: opts,
          explain: `${r.name} (${where(r)}) uses ${usedName ? `${T.swaraHTML(usedName)}, ${T.FULL_NAME[usedName]}` : `no ${LETTER}`}.${scaleHTML(r)}`,
        };
      }
      // Wrong options must each be a different arohanam (several ragas share one).
      const seen = new Set([r.aro.join(' ')]);
      const others = similar(r, T.ALL, 12, (c) => c.aro.join(' ') !== r.aro.join(' '))
        .filter((c) => { const k = c.aro.join(' '); if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 3);
      return {
        subject: r, summary: `Arohanam of ${r.name}`,
        prompt: `<p>Which is the arohanam of <b>${r.name}</b>?</p>`,
        options: shuffle([{ html: T.seqHTML(r.aro), correct: true, raga: r }, ...others.map((o) => ({ html: T.seqHTML(o.aro), correct: false, raga: o }))]),
        explain: `${r.name}, ${where(r)}.${scaleHTML(r)}`,
      };
    },
  };

  // ---------- session ----------
  function start(focus) {
    if (!settings.types.length) { $('#quizSetupMsg').textContent = 'Pick at least one kind of question.'; return; }
    $('#quizSetupMsg').textContent = '';
    // Deal question types out evenly: each pass through the chosen types is shuffled.
    const order = [];
    while (order.length < settings.length) order.push(...shuffle(settings.types));
    run = { i: 0, score: 0, results: [], used: new Set(), focus: focus || null, total: settings.length, order };
    $('#quizSetup').hidden = true; $('#quizDone').hidden = true; $('#quizRun').hidden = false;
    next();
  }

  function next() {
    if (run.i >= run.total) return finish();
    Sound.stopVoice();
    const type = run.order[run.i];
    q = { type, ...GEN[type]() };
    q.answered = false;
    run.i++;
    render();
  }

  function render() {
    $('#quizCount').textContent = `Question ${run.i} of ${run.total}`;
    $('#quizScore').textContent = `${run.score} correct`;
    $('#quizProgress').style.width = `${((run.i - 1) / run.total) * 100}%`;
    $('#quizKind').textContent = TYPE[q.type].label;
    $('#quizPrompt').innerHTML = q.prompt + (q.play ? `<div class="row">${q.play.map(([l], i) => `<button class="btn ${i ? '' : 'primary'}" type="button" data-play="${i}">${l}</button>`).join('')}</div>` : '');
    const opts = $('#quizOptions');
    opts.className = 'options' + (q.options.every((o) => o.html.length < 60 && !o.sub) ? ' compact' : '');
    opts.innerHTML = q.options.map((o, i) => `<button class="opt" type="button" data-i="${i}"><span class="opt-key">${i + 1}</span><span class="opt-main">${o.html}</span>${o.sub ? `<span class="opt-sub">${o.sub}</span>` : ''}</button>`).join('');
    $('#quizFeedback').hidden = true;
    $('#quizNext').hidden = true;
    if (q.play) q.play[0][1]();
  }

  function answer(i) {
    if (!q || q.answered) return;
    q.answered = true;
    const chosen = q.options[i], ok = chosen.correct;
    const right = q.options.find((o) => o.correct);
    if (ok) run.score++;
    run.results.push({ type: q.type, ok, subject: q.subject, summary: q.summary, chosen: chosen.html, right: right.html });
    $$('#quizOptions .opt').forEach((b, k) => {
      b.disabled = true;
      if (q.options[k].correct) b.classList.add('right');
      else if (k === i) b.classList.add('wrong');
    });
    let compare = '';
    if (!ok && chosen.raga && right.raga && chosen.raga !== right.raga && ['scale', 'listen', 'melody'].includes(q.type)) {
      const a = right.raga, c = chosen.raga;
      const mark = (other) => (t) => !T.swaraSet(other).has(t.name);
      compare = `<div class="cmp">
          <span class="who">${a.name}</span><span>${T.seqHTML(a.aro, mark(c))} ${T.seqHTML(a.ava, mark(c))}</span>
          <span class="who">${c.name}</span><span>${T.seqHTML(c.aro, mark(a))} ${T.seqHTML(c.ava, mark(a))}</span>
        </div>
        <div class="row"><button class="btn" type="button" data-hear="${a.id}">Hear ${a.name}</button><button class="btn" type="button" data-hear="${c.id}">Hear ${c.name}</button></div>`;
    }
    $('#quizFeedback').innerHTML = `<div class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct' : 'Not quite'}</div><div>${q.explain}</div>${compare}`;
    $('#quizFeedback').hidden = false;
    $('#quizScore').textContent = `${run.score} correct`;
    $('#quizProgress').style.width = `${(run.i / run.total) * 100}%`;
    $('#quizNext').textContent = run.i >= run.total ? 'See results' : 'Next question';
    $('#quizNext').hidden = false;
    $('#quizNext').focus({ preventScroll: true });
  }

  function finish() {
    Sound.stopVoice();
    const res = run.results;
    const missed = res.filter((r) => !r.ok);
    const pct = res.length ? Math.round((run.score / res.length) * 100) : 0;
    const byType = settings.types.map((t) => {
      const rs = res.filter((r) => r.type === t);
      return rs.length ? `<span class="pill ${rs.every((r) => r.ok) ? 'good' : rs.some((r) => r.ok) ? '' : 'warn'}">${TYPE[t].label}: ${rs.filter((r) => r.ok).length}/${rs.length}</span>` : '';
    }).join('');
    const hist = store.get('quizHistory', []);
    hist.unshift({ at: Date.now(), score: run.score, total: res.length, types: settings.types.length });
    store.set('quizHistory', hist.slice(0, 8));
    const verdict = pct === 100 ? 'Perfect score.' : pct >= 80 ? 'Strong work.' : pct >= 50 ? 'Good progress. Review the misses below.' : 'Keep going. Practise the ones you missed.';
    $('#quizRun').hidden = true;
    const done = $('#quizDone');
    done.hidden = false;
    done.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-big">${run.score}<span>/${res.length}</span></div>
        <div><h2>${verdict}</h2><p class="muted">${pct}% correct</p><div class="chips" style="margin-top:10px">${byType}</div></div>
      </div>
      ${missed.length ? `<div>
        <p class="label">Review</p>
        <div class="table-wrap"><table class="result-table">
          <thead><tr><th>Question</th><th>Your answer</th><th>Correct answer</th></tr></thead>
          <tbody>${missed.map((m) => `<tr><td><span class="muted small">${TYPE[m.type].label}</span><br>${esc(m.summary)}</td><td>${m.chosen}</td><td><b>${m.right}</b></td></tr>`).join('')}</tbody>
        </table></div></div>` : ''}
      <div class="row">
        ${missed.length ? '<button id="quizRetryMissed" class="btn primary" type="button">Practise my mistakes</button>' : ''}
        <button id="quizAgain" class="btn ${missed.length ? '' : 'primary'}" type="button">New quiz</button>
        <button id="quizChange" class="btn subtle" type="button">Change questions</button>
      </div>`;
    const focus = new Set(missed.map((m) => m.subject.id));
    const rm = $('#quizRetryMissed');
    if (rm) rm.onclick = () => start(focus);
    $('#quizAgain').onclick = () => start();
    $('#quizChange').onclick = showSetup;
    run = null;
  }

  function showSetup() {
    Sound.stopVoice();
    run = null;
    $('#quizRun').hidden = true; $('#quizDone').hidden = true; $('#quizSetup').hidden = false;
    $('#quizTypes').innerHTML = TYPES.map((t) => `<button class="qtype" type="button" data-t="${t.id}" aria-pressed="${settings.types.includes(t.id)}">
        <span class="qtype-top"><b>${t.label}</b>${t.audio ? '<span class="pill">Audio</span>' : ''}</span>
        <span class="qtype-desc">${t.desc}</span></button>`).join('');
    const hist = store.get('quizHistory', []);
    $('#quizHistory').innerHTML = hist.length
      ? `<p class="label">Recent quizzes</p><div class="chips">${hist.map((h) => `<span class="pill">${new Date(h.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${h.score}/${h.total}</span>`).join('')}</div>`
      : '';
  }

  function init() {
    showSetup();
    const level = segment($('#quizLevel'), (v) => { settings.level = v; store.set('quizSettings', settings); });
    const len = segment($('#quizLength'), (v) => { settings.length = +v; store.set('quizSettings', settings); });
    level.set(settings.level); len.set(String(settings.length));
    $('#quizTypes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      const t = b.dataset.t;
      settings.types = settings.types.includes(t) ? settings.types.filter((x) => x !== t) : [...settings.types, t];
      settings.types = TYPES.map((x) => x.id).filter((id) => settings.types.includes(id));
      b.setAttribute('aria-pressed', String(settings.types.includes(t)));
      store.set('quizSettings', settings);
    });
    $('#quizStart').addEventListener('click', () => start());
    $('#quizEnd').addEventListener('click', () => (run && run.results.length ? (run.total = run.results.length, finish()) : showSetup()));
    $('#quizNext').addEventListener('click', next);
    $('#quizOptions').addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (b) answer(+b.dataset.i);
    });
    $('#quizPrompt').addEventListener('click', (e) => {
      const b = e.target.closest('[data-play]');
      if (b) q.play[+b.dataset.play][1]();
    });
    $('#quizFeedback').addEventListener('click', (e) => {
      const b = e.target.closest('[data-hear]');
      if (b) { const r = T.byId[b.dataset.hear]; Sound.playSeq([...r.aro, ...r.ava.slice(1)], { dur: 0.45 }); }
    });
    document.addEventListener('keydown', (e) => {
      if ($('#tab-quiz').hidden || $('#quizRun').hidden || (e.target.closest && e.target.closest('input, textarea, select'))) return;
      if (/^[1-9]$/.test(e.key) && q && !q.answered && +e.key <= q.options.length) { e.preventDefault(); answer(+e.key - 1); }
      else if (e.key === 'Enter' && q && q.answered && !$('#quizNext').hidden && e.target !== $('#quizNext')) { e.preventDefault(); next(); }
    });
  }

  return { init, GEN, _setRun: (r) => { run = r; } };
})();
