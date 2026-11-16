// App shell: tabs, shruti, tambura, volume, and cross-tab navigation.
const App = (() => {
  const TABS = ['learn', 'ear', 'janya', 'quiz', 'voice'];
  let currentTab = 'learn';

  function go(tab) {
    if (tab === 'talas') { tab = 'learn'; TalaLearn.showSub('talas'); }
    if (!TABS.includes(tab)) tab = 'learn';
    if (tab !== 'learn') TalaLearn.stop();
    currentTab = tab;
    TABS.forEach((t) => { $('#tab-' + t).hidden = t !== tab; });
    $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    store.set('tab', tab);
    if (tab === 'voice') Voice.onShow();
  }

  function setShruti(i) {
    const k = Theory.KATTAI[i];
    Sound.setSa(k.hz);
    $('#shruti').value = i;
    store.set('shruti', i);
    Voice.onShruti();
  }

  // Light / dark toggle. With no saved choice the page follows the system setting.
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>';
  const dark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  function paintThemeBtn() {
    const b = $('#themeBtn'), d = dark();
    b.innerHTML = d ? SUN : MOON;
    b.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
    b.title = b.getAttribute('aria-label');
  }
  function initTheme() {
    paintThemeBtn();
    $('#themeBtn').addEventListener('click', () => {
      const next = dark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
      paintThemeBtn();
      if (currentTab === 'voice') Voice.onShow();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintThemeBtn);
  }

  // Sound settings: instrument for melodies (each choice plays a preview) and volume.
  function initSoundMenu() {
    const btn = $('#soundBtn'), panel = $('#soundPanel');
    const render = () => {
      $('#instrumentList').innerHTML = Sound.INSTRUMENTS.map((x) => `<button type="button" role="radio" aria-checked="${x.id === Sound.getInstrument()}" data-i="${x.id}">
          <span class="inst-name">${x.name}</span><span class="inst-desc">${x.desc}</span></button>`).join('');
    };
    render();
    // Swara numbering: changing it re-renders the whole app, so reload in place.
    const SCHEMES = [
      { id: 'practical', name: 'Two forms (G1 G2, N1 N2)', desc: 'Sadharana G1, antara G2, kaisiki N1, kakali N2' },
      { id: 'melakarta', name: 'Three forms (G1–G3, N1–N3)', desc: 'As in the 72-melakarta system' },
    ];
    $('#numberingList').innerHTML = SCHEMES.map((x) => `<button type="button" role="radio" aria-checked="${x.id === Theory.getNumbering()}" data-n="${x.id}">
        <span class="inst-name">${x.name}</span><span class="inst-desc">${x.desc}</span></button>`).join('');
    $('#numberingList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-n]');
      if (!b || b.dataset.n === Theory.getNumbering()) return;
      Theory.setNumbering(b.dataset.n);
      location.reload();
    });
    const show = (on) => { panel.hidden = !on; btn.setAttribute('aria-expanded', String(on)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); show(panel.hidden); });
    $('#instrumentList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      Sound.setInstrument(b.dataset.i);
      render();
      Sound.playSeq(['S', 'R2', 'G3', 'M1', 'P', { cents: 701.96, dur: 0.9 }], { dur: 0.32 });
    });
    document.addEventListener('click', (e) => { if (!panel.hidden && !e.target.closest('.sound-menu')) show(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { show(false); btn.focus(); } });
  }

  function init() {
    $('#shruti').innerHTML = Theory.KATTAI.map((k, i) => `<option value="${i}">${k.k} kattai · ${k.note}</option>`).join('');
    $('#shruti').addEventListener('change', (e) => setShruti(+e.target.value));

    const vol = store.get('vol', 0.7);
    $('#vol').value = vol; Sound.setVolume(vol);
    $('#vol').addEventListener('input', (e) => { Sound.setVolume(+e.target.value); store.set('vol', +e.target.value); });

    $('#droneBtn').addEventListener('click', (e) => {
      const on = !Sound.isDroneOn();
      on ? Sound.startDrone() : Sound.stopDrone();
      e.currentTarget.setAttribute('aria-pressed', String(on));
    });

    $$('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
    window.addEventListener('hashchange', () => go(location.hash.slice(1)));

    Learn.init();
    TalaLearn.init();
    Ear.init();
    Janya.init();
    Abhyasa.init();
    Voice.init();
    Quiz.init();
    initTheme();
    initSoundMenu();
    if (window.RAGA_SADHANA_CONFIG?.chatEnabled) Chat.init();
    setShruti(store.get('shruti', 7));
    go(location.hash.slice(1) || store.get('tab', 'learn'));
  }

  return {
    init, go, setShruti,
    currentTab: () => currentTab,
    showRaga(id) { Janya.show(id); go('janya'); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    showMela(n) { Learn.showMela(n); go('learn'); $('#melaNum').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    practise(id) { Voice.setRaga(id); go('voice'); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  };
})();

App.init();
