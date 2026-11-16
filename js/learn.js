// Learn tab: swarasthana strip, melakarta decoder, 72-mela chart.
const Learn = (() => {
  const T = Theory;
  let current = 15;
  let melaPicker = null;

  // active: Map of semitone -> the name used (for highlighting), or null.
  function stripHTML(active) {
    return T.POSITIONS.map((p) => {
      const on = active && active.has(p.st);
      const used = on ? active.get(p.st) : null;
      const names = p.names
        .map((n) => `<span class="${used && used !== n ? 'dim' : ''}">${T.swaraHTML(n)}</span>`)
        .join('<span class="slash">/</span>');
      return `<button class="pos${on ? ' active' : ''}" data-st="${p.st}" type="button" aria-label="Play ${p.full.join(' or ')}">
        <span class="pos-names">${names}</span>
        <span class="pos-full">${p.full.join(' · ')}</span>
        <span class="pos-c">${Math.round(T.CENTS[p.st])}¢</span></button>`;
    }).join('');
  }
  function wireStrip(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.pos');
      if (b) Sound.playSeq([{ cents: T.CENTS[+b.dataset.st], dur: 0.9 }]);
    });
  }
  function ping(el, st) {
    $$('.pos', el).forEach((b) => b.classList.toggle('ping', +b.dataset.st === st));
  }

  function playRaga(r, which, dur = 0.5, stripEl) {
    const toks = which === 'aro' ? r.aro : which === 'ava' ? r.ava : [...r.aro, ...r.ava.slice(1)];
    Sound.playSeq(toks, {
      dur,
      onNote: (i) => stripEl && ping(stripEl, i < 0 ? -1 : T.parseToken(toks[i]).st),
    });
  }

  function renderMela(n) {
    n = Math.max(1, Math.min(72, n | 0 || 1));
    current = n;
    const m = T.MELAS[n - 1];
    $('#melaNum').value = n;
    $('#melaSlider').value = n;
    if (melaPicker) melaPicker.set(m);
    const k = ((n - 1) % 36) + 1;
    const base = n > 36 ? 36 : 0;
    const [R, G] = T.RG[m.chakraInHalf], [D, N] = T.DN[m.pos];
    const lo = base + m.chakraInHalf * 6 + 1;
    const janyas = T.JANYAS.filter((j) => j.parent === n);
    const active = new Map(m.swaras.map((s) => [T.SEMI[s], s]));

    $('#melaCard').innerHTML = `
      <div class="mela-head">
        <div class="mela-num">${n}</div>
        <div>
          <h3>${m.name}</h3>
          ${m.alias ? `<p class="muted">Also called ${m.alias}</p>` : ''}
          <div class="pills">
            <span class="pill accent">Chakra ${m.chakra + 1} · ${T.CHAKRAS[m.chakra]}</span>
            <span class="pill">Position ${m.pos + 1} · ${T.PA[m.pos]}</span>
            <span class="pill">${m.madhyama === 'M1' ? 'Shuddha madhyamam' : 'Prati madhyamam'}</span>
          </div>
        </div>
      </div>
      <ol class="steps">
        <li><b>Madhyamam.</b> ${n <= 36
          ? `${n} is 36 or less, so it takes ${T.swaraHTML('M1')}.`
          : `${n} is above 36, so it takes ${T.swaraHTML('M2')}. Subtract 36: ${n} − 36 = ${k}.`}</li>
        <li><b>Rishabham and gandharam.</b> ${k} sits in chakra ${m.chakraInHalf + 1} of this half (melas ${lo}–${lo + 5}), which uses ${T.swaraHTML(R)} and ${T.swaraHTML(G)}.</li>
        <li><b>Dhaivatam and nishadam.</b> It is position ${m.pos + 1} (${T.PA[m.pos]}) inside the chakra, which uses ${T.swaraHTML(D)} and ${T.swaraHTML(N)}.</li>
        <li><b>Result.</b> ${T.seqHTML(m.aro)}</li>
      </ol>
      <div id="melaStrip" class="strip compact">${stripHTML(active)}</div>
      <div class="row">
        <button class="btn primary" type="button" data-play="both">Play arohanam and avarohanam</button>
        <button class="btn" type="button" data-play="aro">Arohanam</button>
        <button class="btn" type="button" data-play="ava">Avarohanam</button>
        <button class="btn subtle" type="button" data-practise>Practise singing it</button>
      </div>
      <div class="chips">
        <span class="label">Janya ragas in the library</span>
        ${janyas.length
          ? janyas.map((j) => `<button class="chip-btn" type="button" data-janya="${j.id}">${j.name}</button>`).join('')
          : '<span class="muted small">None yet for this mela.</span>'}
      </div>`;
    wireStrip($('#melaStrip'));
    $$('#melaChart button[data-n]').forEach((b) => b.classList.toggle('current', +b.dataset.n === n));
  }

  function renderChart() {
    const half = (h) => {
      const cards = [];
      for (let c = 0; c < 6; c++) {
        const ci = h * 6 + c;
        const [R, G] = T.RG[c];
        const items = [];
        for (let p = 0; p < 6; p++) {
          const m = T.MELAS[ci * 6 + p];
          items.push(`<li><button type="button" data-n="${m.n}"><span class="n">${m.n}</span><span>${m.name}</span></button></li>`);
        }
        cards.push(`<div class="chakra"><div class="chakra-head"><b>${ci + 1} · ${T.CHAKRAS[ci]}</b><span>${T.swaraHTML(R)} ${T.swaraHTML(G)}</span></div><ol>${items.join('')}</ol></div>`);
      }
      return `<div class="half"><div class="half-head"><h3>${h ? 'Prati madhyamam' : 'Shuddha madhyamam'}</h3><span class="muted small">melas ${h * 36 + 1}–${h * 36 + 36} · ${T.swaraHTML(h ? 'M2' : 'M1')}</span></div><div class="chart">${cards.join('')}</div></div>`;
    };
    $('#melaChart').innerHTML = half(0) + half(1);
  }

  function init() {
    // The pairs of names that share a pitch, written in the current numbering.
    const pair = (a, b) => `${T.swaraHTML(a)} is the same pitch as ${T.swaraHTML(b)}`;
    $('#sharedNames').innerHTML = [pair('R2', 'G1'), pair('R3', 'G2'), pair('D2', 'N1'), pair('D3', 'N2')].join(', ')
      + (T.getNumbering() === 'practical' ? ' (G<sub>s</sub> and N<sub>s</sub> are the rare shuddha gandharam and shuddha nishadam)' : '');
    const strip = $('#strip');
    strip.innerHTML = stripHTML(null);
    wireStrip(strip);
    $('#playAll12').addEventListener('click', () => {
      const items = [...T.CENTS, 1200];
      Sound.playSeq(items, { dur: 0.45, onNote: (i) => ping(strip, i < 0 ? -1 : i % 12) });
    });

    melaPicker = RagaSearch.create($('#melaPicker'), {
      id: 'melaSearch', label: 'Find a melakarta by name', placeholder: 'Find a melakarta by name',
      items: T.MELAS,
      onPick: (m) => renderMela(m.n),
    });
    renderChart();
    $('#melaChart').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-n]');
      if (!b) return;
      renderMela(+b.dataset.n);
      $('#melaNum').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#melaNum').addEventListener('change', (e) => renderMela(+e.target.value));
    $('#melaSlider').addEventListener('input', (e) => renderMela(+e.target.value));
    $('#melaPrev').addEventListener('click', () => renderMela(current === 1 ? 72 : current - 1));
    $('#melaNext').addEventListener('click', () => renderMela(current === 72 ? 1 : current + 1));
    $('#melaCard').addEventListener('click', (e) => {
      const m = T.MELAS[current - 1];
      const pb = e.target.closest('[data-play]');
      if (pb) playRaga(m, pb.dataset.play, 0.5, $('#melaStrip'));
      const jb = e.target.closest('[data-janya]');
      if (jb) App.showRaga(jb.dataset.janya);
      if (e.target.closest('[data-practise]')) App.practise(m.id);
    });
    renderMela(store.get('mela', 15));
    window.addEventListener('beforeunload', () => store.set('mela', current));
  }

  return { init, showMela: renderMela, playRaga, current: () => current };
})();
