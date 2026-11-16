// Ear training: name the raga from its scale, or name a swara against Sa.
const Ear = (() => {
  const T = Theory;
  const LEVELS = {
    raga: [
      ['foundation', 'Foundation: 10 common ragas'],
      ['contrast', 'Look-alikes: differ by a swara or two'],
      ['janya', 'Any janya raga in the library'],
      ['mela', 'Melakartas: tell neighbours apart'],
    ],
    swara: [
      ['basic7', 'Seven swaras of Sankarabharanam'],
      ['all12', 'All twelve positions'],
    ],
  };
  const FOUNDATION = ['Mayamalavagowla', 'Sankarabharanam', 'Kalyani', 'Kharaharapriya', 'Todi',
    'Mohanam', 'Hindolam', 'Hamsadhwani', 'Madhyamavati', 'Abheri'];
  const CONTRAST = [
    ['Mohanam', 'Mohanakalyani', 'Bilahari', 'Shivaranjani'],
    ['Hindolam', 'Shuddha Dhanyasi', 'Sunadavinodini', 'Kalyanavasantham'],
    ['Arabhi', 'Suddha Saveri', 'Madhyamavati', 'Sama'],
    ['Malahari', 'Saveri', 'Revagupti', 'Bowli'],
    ['Hamsadhwani', 'Niroshta', 'Amritavarshini', 'Gambhiranata'],
    ['Abheri', 'Sriranjani', 'Shuddha Dhanyasi', 'Dhanyasi'],
    ['Hamsanandi', 'Purvikalyani', 'Mohanakalyani', 'Vasantha'],
    ['Bhupalam', 'Revagupti', 'Revati', 'Madhyamavati'],
    ['Kedaragowla', 'Yadukula Kambhoji', 'Madhyamavati', 'Manirangu'],
    ['Kambhoji', 'Yadukula Kambhoji', 'Harikambhoji', 'Kedaragowla'],
  ];

  let mode = 'raga', level = 'foundation', q = null, answered = false;
  let stats = store.get('ear', { n: 0, ok: 0, streak: 0, miss: {} });
  const speed = () => +$('#earSpeed').value;
  const ragaName = (r) => (r.alias ? `${r.name} (${r.alias})` : r.name);

  function newQuestion() {
    answered = false;
    Sound.stopVoice();
    if (mode === 'raga') {
      let answer, options;
      if (level === 'foundation') {
        const pool = FOUNDATION.map(T.find);
        answer = pick(pool);
        options = [answer, ...sample(pool.filter((r) => r !== answer), 3)];
      } else if (level === 'contrast') {
        const g = pick(CONTRAST).map(T.find);
        answer = pick(g); options = g;
      } else if (level === 'janya') {
        answer = pick(T.JANYAS);
        options = [answer, ...sample(T.JANYAS.filter((r) => r !== answer), 3)];
      } else {
        answer = pick(T.MELAS);
        const same = T.MELAS.filter((m) => m !== answer && m.chakra === answer.chakra);
        const samePos = T.MELAS.filter((m) => m !== answer && m.pos === answer.pos && m.chakra !== answer.chakra);
        options = [answer, ...sample(same, 2), ...sample(samePos, 1)];
      }
      q = { kind: 'raga', answer, options: shuffle(options) };
    } else {
      const set = level === 'basic7' ? [2, 4, 5, 7, 9, 11] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      q = { kind: 'swara', answer: pick(set), options: level === 'basic7' ? [0, 2, 4, 5, 7, 9, 11] : [...Array(12).keys()] };
    }
    render();
  }

  function swaraOptLabel(st) {
    const p = T.POSITIONS[st];
    if (level === 'basic7') {
      const n = { 0: 'S', 2: 'R2', 4: 'G3', 5: 'M1', 7: 'P', 9: 'D2', 11: 'N3' }[st];
      return { main: T.swaraHTML(n), sub: T.FULL_NAME[n] };
    }
    return { main: p.names.map((n) => T.swaraHTML(n)).join(' / '), sub: p.full.join(' / ') };
  }

  function render() {
    $('#earFeedback').hidden = true;
    $('#earNext').hidden = true;
    $('#earAro').hidden = $('#earAva').hidden = q.kind !== 'raga';
    if (q.kind === 'raga') {
      $('#earPrompt').innerHTML = `<p>Listen to the arohanam and avarohanam. Which raga is it?</p>`;
      $('#earOptions').className = 'options';
      $('#earOptions').innerHTML = q.options.map((r, i) => `<button class="opt" type="button" data-i="${i}">${ragaName(r)}<span class="opt-sub">${r.kind === 'mela' ? 'Melakarta ' + r.n : 'Janya of ' + T.melaLabel(T.MELAS[r.parent - 1])}</span></button>`).join('');
    } else {
      $('#earPrompt').innerHTML = `<p>You will hear Sa, a short gap, then another swara. Which swara is the second note?</p>`;
      $('#earOptions').className = 'options swaras';
      $('#earOptions').innerHTML = q.options.map((st, i) => {
        const l = swaraOptLabel(st);
        return `<button class="opt" type="button" data-i="${i}">${l.main}<span class="opt-sub">${l.sub}</span></button>`;
      }).join('');
    }
    renderScore();
  }

  function play(which = 'both') {
    if (!q) return;
    if (q.kind === 'raga') {
      const r = q.answer;
      const toks = which === 'aro' ? r.aro : which === 'ava' ? r.ava : [...r.aro, ...r.ava.slice(1)];
      Sound.playSeq(toks, { dur: speed() });
    } else {
      Sound.playSeq([{ cents: 0, dur: 0.9 }, { rest: true, dur: 0.35 }, { cents: T.CENTS[q.answer], dur: 1.3 }]);
    }
  }

  function diffLine(a, b) {
    const sa = T.swaraSet(a), sb = T.swaraSet(b);
    const onlyA = [...sa].filter((x) => !sb.has(x)), onlyB = [...sb].filter((x) => !sa.has(x));
    if (!onlyA.length && !onlyB.length) return `Both use the same swaras; the difference is in the order and which swaras appear going up or down.`;
    const list = (xs) => (xs.length ? xs.map((x) => T.swaraHTML(x)).join(' ') : 'nothing extra');
    return `Only in ${a.name}: ${list(onlyA)}. Only in ${b.name}: ${list(onlyB)}.`;
  }

  function answer(i) {
    if (answered) return;
    answered = true;
    const choice = q.options[i];
    const ok = choice === q.answer;
    stats.n++; if (ok) { stats.ok++; stats.streak++; } else stats.streak = 0;
    const key = q.kind === 'raga' ? q.answer.name : 'Swara ' + T.POSITIONS[q.answer].names.map(T.label).join('/');
    if (!ok) stats.miss[key] = (stats.miss[key] || 0) + 1;
    store.set('ear', stats);

    $$('#earOptions .opt').forEach((b, k) => {
      b.disabled = true;
      if (q.options[k] === q.answer) b.classList.add('right');
      else if (k === i) b.classList.add('wrong');
    });

    const fb = $('#earFeedback');
    if (q.kind === 'raga') {
      const a = q.answer, cls = T.classify(a);
      const markA = ok ? null : (t) => !T.swaraSet(choice).has(t.name);
      const markB = (t) => !T.swaraSet(a).has(t.name);
      fb.innerHTML = `
        <div class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct' : 'Not quite'}: it was ${ragaName(a)}.</div>
        <div class="cmp">
          <span class="who">${a.name}</span><span>${T.seqHTML(a.aro, markA)} ${T.seqHTML(a.ava, markA)}</span>
          ${ok ? '' : `<span class="who">${choice.name}</span><span>${T.seqHTML(choice.aro, markB)} ${T.seqHTML(choice.ava, markB)}</span>`}
        </div>
        <p class="small">${ok
          ? `${cls.type}${cls.vakra ? ', vakra' : ''}. ${a.kind === 'janya' ? `Janya of ${T.melaLabel(T.MELAS[a.parent - 1])}.` : ''}`
          : diffLine(a, choice)}</p>
        <div class="row">
          <button class="btn" type="button" data-cmp="a">Play ${a.name}</button>
          ${ok ? '' : `<button class="btn" type="button" data-cmp="b">Play ${choice.name}</button>`}
          <button class="btn subtle" type="button" data-open="${a.id}">Open in Janya map</button>
        </div>`;
      fb.onclick = (e) => {
        const c = e.target.closest('[data-cmp]');
        if (c) { const r = c.dataset.cmp === 'a' ? a : choice; Sound.playSeq([...r.aro, ...r.ava.slice(1)], { dur: speed() }); }
        const o = e.target.closest('[data-open]');
        if (o) App.showRaga(o.dataset.open);
      };
    } else {
      const st = q.answer, p = T.POSITIONS[st];
      fb.innerHTML = `
        <div class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct' : 'Not quite'}: it was ${p.names.map((n) => T.swaraHTML(n)).join(' / ')}, ${p.full.join(' / ')}.</div>
        <p class="small">${Math.round(T.CENTS[st])} cents above Sa (ratio ${ratioText(st)}).</p>
        <div class="row">
          <button class="btn" type="button" data-sw="${st}">Sa then this swara</button>
          ${ok ? '' : `<button class="btn" type="button" data-sw="${choice}">Sa then your answer</button>`}
        </div>`;
      fb.onclick = (e) => {
        const b = e.target.closest('[data-sw]');
        if (b) Sound.playSeq([{ cents: 0, dur: 0.8 }, { cents: T.CENTS[+b.dataset.sw], dur: 1.2 }]);
      };
    }
    fb.hidden = false;
    $('#earNext').hidden = false;
    renderScore(); renderWeak();
  }

  const RATIO_TEXT = ['1', '16/15', '9/8', '6/5', '5/4', '4/3', '45/32', '3/2', '8/5', '5/3', '9/5', '15/8'];
  const ratioText = (st) => RATIO_TEXT[st];

  function renderScore() {
    $('#earScore').textContent = stats.n ? `${stats.ok}/${stats.n} correct · streak ${stats.streak}` : 'No answers yet';
  }
  function renderWeak() {
    const top = Object.entries(stats.miss).sort((a, b) => b[1] - a[1]).slice(0, 8);
    $('#earWeak').innerHTML = top.length
      ? `<div class="weak-list">${top.map(([k, v]) => `<span class="pill warn">${esc(k)} · missed ${v}×</span>`).join('')}</div>`
      : 'Ragas you miss will show up here.';
  }
  function fillLevels() {
    $('#earLevel').innerHTML = LEVELS[mode].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    level = LEVELS[mode][0][0];
  }

  function init() {
    segment($('#earMode'), (v) => { mode = v; fillLevels(); newQuestion(); });
    fillLevels();
    $('#earLevel').addEventListener('change', (e) => { level = e.target.value; newQuestion(); });
    $('#earPlay').addEventListener('click', () => play('both'));
    $('#earAro').addEventListener('click', () => play('aro'));
    $('#earAva').addEventListener('click', () => play('ava'));
    $('#earNext').addEventListener('click', () => { newQuestion(); play('both'); });
    $('#earOptions').addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (b) answer(+b.dataset.i);
    });
    $('#earReset').addEventListener('click', () => {
      stats = { n: 0, ok: 0, streak: 0, miss: {} };
      store.set('ear', stats); renderScore(); renderWeak();
    });
    newQuestion();
    renderWeak();
  }

  return { init };
})();
