// Janya map: browse janya ragas against their parent melakarta, plus a mapping quiz.
const Janya = (() => {
  const T = Theory;
  let sel = null, quiz = null, qType = 'parent', answered = false;
  let stats = store.get('janyaQuiz', { n: 0, ok: 0 });

  function renderList(filter = '') {
    const f = filter.trim().toLowerCase();
    const groups = new Map();
    for (const j of T.JANYAS) {
      const m = T.MELAS[j.parent - 1];
      const hit = !f || j.name.toLowerCase().includes(f) || m.name.toLowerCase().includes(f)
        || (m.alias && m.alias.toLowerCase().includes(f)) || String(m.n) === f;
      if (!hit) continue;
      if (!groups.has(j.parent)) groups.set(j.parent, []);
      groups.get(j.parent).push(j);
    }
    const html = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([n, js]) => {
      const m = T.MELAS[n - 1];
      return `<div class="jgroup">
        <div class="jgroup-head"><button type="button" data-id="${m.id}">${n} · ${m.name}</button></div>
        <div class="jgroup-items">${js.map((j) => `<button type="button" data-id="${j.id}" class="${sel === j ? 'current' : ''}">${j.name}</button>`).join('')}</div>
      </div>`;
    }).join('');
    $('#janyaGroups').innerHTML = html || '<p class="muted small">No raga matches that filter.</p>';
  }

  function whyText(r) {
    const parent = T.MELAS[r.parent - 1];
    if (r.kind === 'mela') {
      return `A melakarta: all seven swaras, straight up and straight down. ${T.derivation(r)}`;
    }
    const used = T.sortedNames(r).map((x) => T.swaraHTML(x)).join(' ');
    const cands = T.consistentMelas(r);
    if (cands.length === 1) return `It uses ${used}. Only one melakarta contains every one of these, so the parent is fixed: ${T.melaLabel(parent)}.`;
    const shown = cands.slice(0, 6).map((m) => `${m.n} ${m.name}`).join(', ');
    return `It uses ${used}. Because it skips swaras, ${cands.length} melakartas contain all of them (${shown}${cands.length > 6 ? ', …' : ''}). Tradition assigns it to ${T.melaLabel(parent)}, the mela whose missing swaras match how the raga is sung.`;
  }

  function show(id) {
    const r = T.byId[id];
    if (!r) return;
    sel = r;
    const parent = T.MELAS[r.parent - 1];
    const aroSet = new Set(r.aro.map((t) => T.parseToken(t).name));
    const avaSet = new Set(r.ava.map((t) => T.parseToken(t).name));
    const cls = T.classify(r);
    const cells = parent.swaras.map((n) => {
      const a = aroSet.has(n), v = avaSet.has(n);
      const st = a && v ? 'both' : a ? 'aro' : v ? 'ava' : 'varjya';
      const lbl = { both: 'up and down', aro: 'arohanam only', ava: 'avarohanam only', varjya: 'varjya' }[st];
      return `<div class="pcell ${st}">${T.swaraHTML(n)}<span>${lbl}</span></div>`;
    }).join('');
    const varj = T.varjya(r);
    $('#janyaDetail').innerHTML = `
      <div>
        <p class="eyebrow">${r.kind === 'mela' ? `Melakarta ${r.n} · ${T.CHAKRAS[r.chakra]} chakra` : `Janya of <button type="button" data-id="${parent.id}">${T.melaLabel(parent)}</button>`}</p>
        <h2>${r.name}${r.alias ? ` <span class="muted small">(${r.alias})</span>` : ''}</h2>
        <div class="pills">
          <span class="pill accent">${cls.type}</span>
          ${cls.vakra ? '<span class="pill warn">Vakra</span>' : ''}
          ${varj.length ? `<span class="pill">Varjya: ${varj.map((x) => T.swaraHTML(x)).join(' ')}</span>` : ''}
        </div>
      </div>
      <div class="dir">
        <span class="label">Arohanam</span>${T.seqHTML(r.aro)}<button class="btn" type="button" data-play="aro">Play</button>
        <span class="label">Avarohanam</span>${T.seqHTML(r.ava)}<button class="btn" type="button" data-play="ava">Play</button>
      </div>
      <div>
        <p class="label">Against the parent's seven swaras</p>
        <div class="pcells">${cells}</div>
      </div>
      <p class="why">${whyText(r)}</p>
      <div class="row">
        <button class="btn primary" type="button" data-play="both">Play up and down</button>
        <button class="btn" type="button" data-practise>Practise singing it</button>
        <button class="btn subtle" type="button" data-decode="${parent.n}">Open ${parent.name} in the decoder</button>
      </div>`;
    renderList($('#janyaFilter').value);
  }

  // ---- quiz ----
  function newQ() {
    answered = false;
    if (qType === 'parent') {
      const j = pick(T.JANYAS);
      const set = [...T.swaraSet(j)];
      const cands = new Set(T.consistentMelas(j).map((m) => m.n));
      const parent = T.MELAS[j.parent - 1];
      const others = T.MELAS.filter((m) => !cands.has(m.n))
        .map((m) => ({ m, miss: set.filter((s) => !m.swaras.includes(s)).length }));
      let distract = sample(others.filter((o) => o.miss === 1).map((o) => o.m), 3);
      if (distract.length < 3) distract = distract.concat(sample(others.filter((o) => o.miss === 2).map((o) => o.m), 3 - distract.length));
      quiz = { raga: j, answer: parent, options: shuffle([parent, ...distract]) };
      $('#jqPrompt').innerHTML = `
        <p>Which melakarta is the parent of <b>${j.name}</b>?</p>
        <div class="dir">
          <span class="label">Arohanam</span>${T.seqHTML(j.aro)}<button class="btn" type="button" data-qplay="aro">Play</button>
          <span class="label">Avarohanam</span>${T.seqHTML(j.ava)}<button class="btn" type="button" data-qplay="ava">Play</button>
        </div>`;
    } else {
      const m = pick(T.MELAS);
      const twin = T.MELAS[(m.n > 36 ? m.n - 36 : m.n + 36) - 1];
      const sameChakra = T.MELAS.filter((x) => x.chakra === m.chakra && x !== m);
      const samePos = T.MELAS.filter((x) => x.pos === m.pos && x.madhyama === m.madhyama && x !== m);
      quiz = { raga: m, answer: m, options: shuffle([m, twin, ...sample(sameChakra, 1), ...sample(samePos, 1)]) };
      $('#jqPrompt').innerHTML = `
        <p>Which melakarta has exactly these swaras?</p>
        <div class="row">${T.seqHTML(m.aro)}<button class="btn" type="button" data-qplay="aro">Play</button></div>`;
    }
    $('#jqOptions').innerHTML = quiz.options.map((m, i) => `<button class="opt" type="button" data-i="${i}">${m.name}<span class="opt-sub">Melakarta ${m.n}</span></button>`).join('');
    $('#jqFeedback').hidden = true;
    renderScore();
  }

  function answerQ(i) {
    if (answered) return;
    answered = true;
    const ok = quiz.options[i] === quiz.answer;
    stats.n++; if (ok) stats.ok++;
    store.set('janyaQuiz', stats);
    $$('#jqOptions .opt').forEach((b, k) => {
      b.disabled = true;
      if (quiz.options[k] === quiz.answer) b.classList.add('right');
      else if (k === i) b.classList.add('wrong');
    });
    const fb = $('#jqFeedback');
    const expl = qType === 'parent' ? whyText(quiz.raga) : T.derivation(quiz.answer);
    fb.innerHTML = `<div class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct' : 'Not quite'}: ${T.melaLabel(quiz.answer)}.</div><p>${expl}</p>`;
    fb.hidden = false;
    renderScore();
  }
  function renderScore() {
    $('#jqScore').textContent = stats.n ? `${stats.ok}/${stats.n} correct` : '';
  }

  function init() {
    renderList();
    $('#janyaFilter').addEventListener('input', (e) => renderList(e.target.value));
    $('#janyaGroups').addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]');
      if (b) show(b.dataset.id);
    });
    $('#janyaDetail').addEventListener('click', (e) => {
      const p = e.target.closest('[data-play]');
      if (p) Learn.playRaga(sel, p.dataset.play);
      const id = e.target.closest('[data-id]');
      if (id) show(id.dataset.id);
      if (e.target.closest('[data-practise]')) App.practise(sel.id);
      const d = e.target.closest('[data-decode]');
      if (d) App.showMela(+d.dataset.decode);
    });
    segment($('#jqType'), (v) => { qType = v; newQ(); });
    $('#jqNext').addEventListener('click', newQ);
    $('#jqOptions').addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (b) answerQ(+b.dataset.i);
    });
    $('#jqPrompt').addEventListener('click', (e) => {
      const b = e.target.closest('[data-qplay]');
      if (b) Learn.playRaga(quiz.raga, b.dataset.qplay);
    });
    show(store.get('janya', 'j-mohanam'));
    window.addEventListener('beforeunload', () => sel && store.set('janya', sel.id));
    newQ();
  }

  return { init, show, current: () => sel };
})();
