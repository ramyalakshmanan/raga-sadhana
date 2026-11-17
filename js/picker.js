// Type-to-search raga picker (a combobox), tolerant of the many ways raga
// names are spelled in English: Shankarabharanam / Sankarabharanam,
// Thodi / Todi, Mayamalavagowla / Mayamalavagaula, and small typos.
const RagaSearch = (() => {
  // Fold spelling variants together so they compare equal.
  function norm(s) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/([kgcjtdpb])h/g, '$1')   // aspirates: kh, dh, bh, th...
      .replace(/sh/g, 's')
      .replace(/(au|ow|ou)/g, 'o')        // gaula / gowla
      .replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/aa/g, 'a')
      .replace(/w/g, 'v')
      .replace(/(.)\1+/g, '$1');          // doubled letters
  }

  // Edit distance, used only as a fallback for small typos.
  function dist(a, b) {
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  // Score how well a raga matches the query; 0 means no match.
  function score(r, q) {
    const raw = q.trim();
    if (!raw) return 1;
    if (/^\d{1,2}$/.test(raw)) {
      const n = +raw;
      if (r.kind === 'mela' && r.n === n) return 100;
      if (r.kind === 'janya' && r.parent === n) return 50;
      return 0;
    }
    const nq = norm(raw);
    if (!nq) return 0;
    let best = 0;
    for (const name of [r.name, r.alias].filter(Boolean)) {
      const nn = norm(name);
      if (nn === nq) best = Math.max(best, 100);
      else if (nn.startsWith(nq)) best = Math.max(best, 85);
      else if (name.toLowerCase().split(/\s+/).some((w) => norm(w).startsWith(nq))) best = Math.max(best, 75);
      else if (nn.includes(nq)) best = Math.max(best, 60);
      else if (nq.length >= 4) {
        const d = dist(nq, nn.slice(0, nq.length));
        if (d <= (nq.length >= 7 ? 2 : 1)) best = Math.max(best, 40 - d * 5);
      }
    }
    // Searching for a parent's name also lists its janya ragas, lower down.
    if (!best && r.kind === 'janya') {
      const p = Theory.MELAS[r.parent - 1];
      if ([p.name, p.alias].filter(Boolean).some((nm) => norm(nm).startsWith(nq))) best = 20;
    }
    return best;
  }

  function highlight(name, q) {
    const raw = q.trim().toLowerCase();
    const i = raw && !/^\d+$/.test(raw) ? name.toLowerCase().indexOf(raw) : -1;
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + raw.length)) + '</mark>' + esc(name.slice(i + raw.length));
  }

  const seqText = (toks) => toks.map((t) => Theory.tokText(t)).join(' ');
  const where = (r) => (r.kind === 'mela' ? `Melakarta ${r.n}` : `Janya of ${Theory.melaLabel(Theory.MELAS[r.parent - 1])}`);
  const subline = (r) => (r.anya && r.anya.length ? where(r) : `${where(r)} · ${seqText(r.aro)}`);
  // Bhashanga ragas borrow a swara from outside the parent, so the parent is
  // not obvious from the scale: spell out both directions and the anya swara.
  const anyaDetail = (r) => {
    if (!r.anya || !r.anya.length) return '';
    const T = Theory;
    const anya = r.anya.map((x) => `${T.swaraText(x)} (${T.FULL_NAME[x].toLowerCase()})`).join(', ');
    return `<span class="picker-anya">
      <span><b>Arohanam</b> ${esc(seqText(r.aro))}</span>
      <span><b>Avarohanam</b> ${esc(seqText(r.ava))}</span>
      <span>Bhashanga: anya swara ${esc(anya)}, from outside ${esc(T.melaLabel(T.MELAS[r.parent - 1]))}</span></span>`;
  };

  // Turn an element into a picker. items: ragas to choose from.
  function create(host, { id, label, items, placeholder, onPick }) {
    const listId = id + '-list';
    host.classList.add('picker');
    host.innerHTML = `
      <svg class="picker-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>
      <input id="${id}" type="text" role="combobox" autocomplete="off" spellcheck="false"
        aria-label="${esc(label)}" aria-autocomplete="list" aria-expanded="false" aria-controls="${listId}"
        placeholder="${esc(placeholder)}">
      <ul id="${listId}" class="picker-list" role="listbox" hidden></ul>`;
    const input = $('input', host), list = $('ul', host);
    let current = null, results = [], active = -1;

    function render() {
      const q = input.value;
      results = items.map((r) => ({ r, s: score(r, q) })).filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || (a.r.kind === b.r.kind ? a.r.name.localeCompare(b.r.name) : a.r.kind === 'janya' ? -1 : 1))
        .slice(0, 60).map((x) => x.r);
      active = results.length ? 0 : -1;
      list.innerHTML = results.length
        ? results.map((r, i) => `<li id="${listId}-${i}" role="option" aria-selected="${i === active}" data-i="${i}">
            <span class="picker-name">${highlight(r.name, q)}${r.alias ? ` <span class="muted">(${highlight(r.alias, q)})</span>` : ''}</span>
            <span class="picker-sub">${esc(subline(r))}</span>${anyaDetail(r)}</li>`).join('')
        : `<li class="picker-empty">No raga matches “${esc(q)}”. Try fewer letters or a melakarta number.</li>`;
      sync();
    }
    function sync() {
      $$('[role="option"]', list).forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === active)));
      const el = $(`#${listId}-${active}`);
      if (el) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    }
    function openList() { list.hidden = false; input.setAttribute('aria-expanded', 'true'); render(); }
    function closeList(restore = true) {
      list.hidden = true; input.setAttribute('aria-expanded', 'false');
      if (restore && current) input.value = current.name;
    }
    function choose(r) {
      current = r; input.value = r.name; closeList(false);
      onPick(r);
    }

    input.addEventListener('focus', () => { input.select(); openList(); });
    input.addEventListener('input', () => { if (list.hidden) openList(); else render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) return openList(); active = Math.min(results.length - 1, active + 1); sync(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); sync(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) { choose(results[active]); input.blur(); } }
      else if (e.key === 'Escape') { closeList(); input.blur(); }
    });
    input.addEventListener('blur', () => setTimeout(() => closeList(), 120));
    // mousedown (not click) so the choice lands before the input loses focus.
    list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('[role="option"]');
      if (!li) return;
      e.preventDefault();
      choose(results[+li.dataset.i]);
      input.blur();
    });

    return {
      set(r) { current = r; if (document.activeElement !== input) input.value = r ? r.name : ''; },
    };
  }

  return { create, norm, score };
})();
