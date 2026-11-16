// App shell: tabs, shruti, tambura, volume, and cross-tab navigation.
const App = (() => {
  const TABS = ['learn', 'ear', 'janya', 'quiz', 'voice'];
  let currentTab = 'learn';

  function go(tab) {
    if (!TABS.includes(tab)) tab = 'learn';
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
    Ear.init();
    Janya.init();
    Abhyasa.init();
    Voice.init();
    Quiz.init();
    initTheme();
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
