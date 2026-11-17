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
      ${decodeHTML(m)}
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

  // What each chakra name counts (Indu, the moon, is 1; Netra, the eyes, is 2...).
  const CHAKRA_MEANS = ['the moon', 'the eyes', 'the fires', 'the Vedas', 'the arrows', 'the seasons',
    'the sages', 'the Vasus', 'Brahma', 'the directions', 'the Rudras', 'the Adityas'];

  // The decoder as a picture: three rows of choices, the current one lit, and the sum.
  function decodeHTML(m) {
    const h = m.madhyama === 'M1' ? 0 : 1, c = m.chakraInHalf, p = m.pos, base = h * 36;
    const sw = (...xs) => xs.map((x) => T.swaraHTML(x)).join(' ');
    const half = [0, 1].map((i) => `<button type="button" class="dz-tile${i === h ? ' on' : ''}" data-go="${i * 36 + c * 6 + p + 1}">
        <span class="dz-big">${sw(i ? 'M2' : 'M1')}</span><span class="dz-sub">${i ? 'Prati' : 'Shuddha'} · melas ${i * 36 + 1}–${i * 36 + 36}</span></button>`).join('');
    const chakras = T.RG.map(([R, G], i) => `<button type="button" class="dz-tile${i === c ? ' on' : ''}" data-go="${base + i * 6 + p + 1}">
        <span class="dz-n">${i + 1}</span><span class="dz-name">${T.CHAKRAS[h * 6 + i]}</span>
        <span class="dz-big">${sw(R, G)}</span><span class="dz-sub">${CHAKRA_MEANS[h * 6 + i]}</span></button>`).join('');
    const poss = T.DN.map(([D, N], i) => `<button type="button" class="dz-tile${i === p ? ' on' : ''}" data-go="${base + c * 6 + i + 1}">
        <span class="dz-n">${i + 1}</span><span class="dz-name">${T.PA[i]}</span>
        <span class="dz-big">${sw(D, N)}</span></button>`).join('');
    const kind = (name) => (name[0] === 'M' ? 'm' : 'RG'.includes(name[0]) ? 'c' : 'DN'.includes(name[0]) ? 'p' : 'f');
    const result = m.aro.map((t) => { const x = T.parseToken(t); return `<span class="dz-sw k-${kind(x.name)}">${T.swaraHTML(x.name)}${x.oct ? '<span class="dz-dot">·</span>' : ''}</span>`; }).join('');
    return `<div class="decode">
      <div class="dz-row k-m"><div class="dz-key"><span class="dz-step">1</span><b>Madhyamam</b><span>which half</span></div><div class="dz-tiles two">${half}</div></div>
      <div class="dz-row k-c"><div class="dz-key"><span class="dz-step">2</span><b>Chakra</b><span>fixes R and G</span></div><div class="dz-tiles">${chakras}</div></div>
      <div class="dz-row k-p"><div class="dz-key"><span class="dz-step">3</span><b>Position</b><span>fixes D and N</span></div><div class="dz-tiles">${poss}</div></div>
      <div class="dz-out">
        <div class="dz-sum"><div class="mono"><span class="k-m">${base}</span> + <span class="k-c">6 × ${c}</span> + <span class="k-p">${p + 1}</span> = <b>${m.n}</b></div>
          <div class="dz-cap">half start + six per earlier chakra + position</div></div>
        <div class="dz-result">${result}</div>
      </div>
    </div>`;
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
      const go = e.target.closest('[data-go]');
      if (go) { renderMela(+go.dataset.go); return; }
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
