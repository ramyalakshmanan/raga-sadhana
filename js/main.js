// App shell: tabs, shruti, tambura, volume, and cross-tab navigation.
const App = (() => {
  const TABS = ['learn', 'ear', 'janya', 'voice'];

  function go(tab) {
    if (!TABS.includes(tab)) tab = 'learn';
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

  function init() {
    $('#shruti').innerHTML = Theory.KATTAI.map((k, i) => `<option value="${i}">${k.k} kattai · ${k.note} · ${k.hz.toFixed(0)} Hz</option>`).join('');
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

    Learn.init();
    Ear.init();
    Janya.init();
    Voice.init();
    setShruti(store.get('shruti', 7));
    go(location.hash.slice(1) || store.get('tab', 'learn'));
  }

  return {
    init, go, setShruti,
    showRaga(id) { Janya.show(id); go('janya'); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    showMela(n) { Learn.showMela(n); go('learn'); $('#melaNum').scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    practise(id) { Voice.setRaga(id); go('voice'); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  };
})();

App.init();
