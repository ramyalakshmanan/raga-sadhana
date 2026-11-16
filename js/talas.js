// Learn → Talas: the tala player, everyday talas and the 35-tala chart.
const TalaLearn = (() => {
  const COMMON = [
    { id: 'adi', use: 'The most widely used tala: most varnams and many kritis, and the sarali, janta and dhatu varisais.' },
    { id: 'rupaka-chatusra', use: 'Common for kritis. In practice it is often counted as three beats, each spanning two aksharas.' },
    { id: 'misra-chapu', use: 'Seven beats counted 3 + 2 + 2. Very common for kritis.' },
    { id: 'khanda-chapu', use: 'A brisk five-beat cycle counted 2 + 3, used in many kritis.' },
    { id: 'triputa-tisra', use: 'Seven beats. The tala of the fifth alankaram.' },
    { id: 'ata-khanda', use: 'Fourteen beats. Used for some varnams and for the sixth alankaram.' },
    { id: 'jhampa-misra', use: 'Ten beats. The tala of the fourth alankaram.' },
    { id: 'dhruva-chatusra', use: 'Fourteen beats. The tala of the first alankaram.' },
    { id: 'matya-chatusra', use: 'Ten beats. The tala of the second alankaram.' },
    { id: 'eka-chatusra', use: 'Four beats. The tala of the seventh alankaram.' },
  ];
  const ANGA = { laghu: 'Laghu', drutam: 'Drutam', anudrutam: 'Anudrutam', group: 'Group' };

  let current = store.get('talaId', 'adi'), gati = 1, play = null;

  function renderInfo() {
    const d = Tala.def(current);
    const parts = d.chapu
      ? `counted in groups of ${d.symbol}`
      : d.angas.map((a) => `${ANGA[a.type].toLowerCase()} (${a.n})`).join(' + ');
    $('#talaInfo').innerHTML = `<h3>${d.name}</h3><p class="muted">${d.chapu ? '' : `<span class="mono">${d.symbol}</span> · `}${parts} = <b>${d.count} aksharas</b> per avartanam</p>`;
    // One box per beat, grouped by anga, with the kriya written in it.
    const beats = Tala.beats(current);
    const groups = [];
    beats.forEach((b, i) => {
      if (!groups[b.anga]) groups[b.anga] = { type: b.type, html: '' };
      groups[b.anga].html += `<span class="tbeat${b.clap ? ' clap' : ''}" data-b="${i}"><span class="tnum">${i + 1}</span><span class="tkriya">${b.label}</span></span>`;
    });
    $('#talaBig').innerHTML = groups.map((g) => `<div class="tanga"><div class="tanga-beats">${g.html}</div><span class="tanga-name">${ANGA[g.type]}</span></div>`).join('');
    $('#talaSelect').value = current;
    $$('#tala35 [data-id]').forEach((b) => b.classList.toggle('current', Tala.def(b.dataset.id).id === Tala.def(current).id));
    $$('#talaCommon [data-id]').forEach((b) => b.classList.toggle('current', Tala.def(b.dataset.id).id === Tala.def(current).id));
  }

  function load(id, autoplay) {
    const wasPlaying = !!play;
    stop();
    current = id;
    store.set('talaId', id);
    renderInfo();
    if (autoplay || wasPlaying) start();
  }

  function start() {
    stop();
    const ctx = Sound.init();
    const beats = Tala.beats(current);
    const beat = 60 / +$('#talaTempo').value;
    let n = 0, nextT = ctx.currentTime + 0.15;
    const queue = [];
    const schedule = () => {
      while (nextT < ctx.currentTime + 0.3) {
        const bi = n % beats.length, b = beats[bi];
        Sound.click(nextT, bi === 0 ? 'sam' : b.clap ? 'clap' : 'soft');
        for (let k = 1; k < gati; k++) Sound.click(nextT + (k * beat) / gati, 'sub');
        queue.push({ t: nextT, bi, av: Math.floor(n / beats.length) + 1 });
        n++; nextT += beat;
      }
    };
    schedule();
    play = { timer: setInterval(schedule, 50), raf: 0 };
    const draw = () => {
      if (!play) return;
      play.raf = requestAnimationFrame(draw);
      const now = ctx.currentTime;
      while (queue.length > 1 && queue[1].t <= now) queue.shift();
      const q = queue[0];
      if (!q || q.t > now) return;
      $$('#talaBig .tbeat').forEach((el) => el.classList.toggle('now', +el.dataset.b === q.bi));
      $('#talaCount').textContent = `Avartanam ${q.av} · beat ${q.bi + 1} of ${beats.length}`;
    };
    play.raf = requestAnimationFrame(draw);
    $('#talaPlay').textContent = 'Stop';
    $('#talaPlay').classList.remove('primary');
  }

  function stop() {
    if (!play) return;
    clearInterval(play.timer); cancelAnimationFrame(play.raf);
    Sound.stopClicks();
    play = null;
    $$('#talaBig .tbeat').forEach((el) => el.classList.remove('now'));
    $('#talaCount').textContent = '';
    $('#talaPlay').textContent = 'Play';
    $('#talaPlay').classList.add('primary');
  }

  function showSub(v) {
    $('#learnRagas').hidden = v !== 'ragas';
    $('#learnTalas').hidden = v !== 'talas';
    navSeg.set(v);
    store.set('learnSub', v);
    if (v !== 'talas') stop();
  }
  let navSeg;

  function init() {
    // Tala menu
    const opt = (id) => `<option value="${id}">${Tala.def(id).name} · ${Tala.def(id).count}</option>`;
    $('#talaSelect').innerHTML =
      `<optgroup label="In everyday use">${COMMON.map((c) => opt(c.id)).join('')}</optgroup>` +
      `<optgroup label="All 35 suladi talas">${Tala.SULADI.flatMap((s) => Tala.JATIS.map((j) => opt(`${s.id}-${j.id}`))).join('')}</optgroup>` +
      `<optgroup label="Chapu talas">${Tala.CHAPU.map((c) => opt(c.id)).join('')}</optgroup>`;

    // Everyday talas
    $('#talaCommon').innerHTML = COMMON.map((c) => {
      const d = Tala.def(c.id);
      return `<button class="tala-card" type="button" data-id="${c.id}">
        <span class="tala-card-top"><b>${d.name}</b><span class="tala-count mono">${d.count}</span></span>
        <span class="mono small muted">${d.symbol}</span>
        <span class="tala-card-use">${c.use}</span></button>`;
    }).join('');

    // The 35-tala chart
    $('#tala35').innerHTML = `<thead><tr><th>Tala</th><th>Angas</th>${Tala.JATIS.map((j) => `<th>${j.name}<span class="muted small"> · laghu ${j.n}</span></th>`).join('')}</tr></thead>
      <tbody>${Tala.SULADI.map((s) => `<tr><th>${s.name}</th><td class="mono">${[...s.angas].join(' ')}</td>${Tala.JATIS.map((j) => {
        const id = `${s.id}-${j.id}`, d = Tala.def(id);
        return `<td><button type="button" data-id="${id}" class="${j.id === s.common ? 'common' : ''}" title="${d.name}">${d.count}</button></td>`;
      }).join('')}</tr>`).join('')}</tbody>`;

    navSeg = segment($('#learnNav'), showSub);
    gati = 1;
    segment($('#talaGati'), (v) => { gati = +v; if (play) start(); });
    const tempo = $('#talaTempo');
    tempo.addEventListener('input', () => { $('#talaTempoVal').textContent = tempo.value; if (play) start(); });
    $('#talaSelect').addEventListener('change', (e) => load(e.target.value));
    $('#talaPlay').addEventListener('click', () => (play ? stop() : start()));
    $('#talaCommon').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { load(b.dataset.id, true); $('#talaSelect').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
    $('#tala35').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) { load(b.dataset.id, true); $('#talaSelect').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
    renderInfo();
    showSub(store.get('learnSub', 'ragas'));
  }

  return { init, stop, showSub };
})();
