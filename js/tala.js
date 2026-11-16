// Tala definitions: the seven suladi talas in five jatis (35 talas), the chapu
// talas, and the kriyas (hand actions) that count each beat.
const Tala = (() => {
  const JATIS = [
    { id: 'tisra', name: 'Tisra', n: 3 },
    { id: 'chatusra', name: 'Chatusra', n: 4 },
    { id: 'khanda', name: 'Khanda', n: 5 },
    { id: 'misra', name: 'Misra', n: 7 },
    { id: 'sankeerna', name: 'Sankeerna', n: 9 },
  ];
  // I = laghu, O = drutam, U = anudrutam. `common` is the jati in everyday use (and in the alankarams).
  const SULADI = [
    { id: 'dhruva', name: 'Dhruva', angas: 'IOII', common: 'chatusra' },
    { id: 'matya', name: 'Matya', angas: 'IOI', common: 'chatusra' },
    { id: 'rupaka', name: 'Rupaka', angas: 'OI', common: 'chatusra' },
    { id: 'jhampa', name: 'Jhampa', angas: 'IUO', common: 'misra' },
    { id: 'triputa', name: 'Triputa', angas: 'IOO', common: 'tisra' },
    { id: 'ata', name: 'Ata', angas: 'IIOO', common: 'khanda' },
    { id: 'eka', name: 'Eka', angas: 'I', common: 'chatusra' },
  ];
  // Chapu talas are counted in groups rather than with laghu and drutam.
  const CHAPU = [
    { id: 'tisra-chapu', name: 'Tisra chapu', groups: [1, 2] },
    { id: 'khanda-chapu', name: 'Khanda chapu', groups: [2, 3] },
    { id: 'misra-chapu', name: 'Misra chapu', groups: [3, 2, 2] },
    { id: 'sankeerna-chapu', name: 'Sankeerna chapu', groups: [4, 5] },
  ];
  // Names used elsewhere in the app.
  const NAMED = {
    adi: 'triputa-chatusra', dhruva: 'dhruva-chatusra', matya: 'matya-chatusra', rupaka: 'rupaka-chatusra',
    jhampa: 'jhampa-misra', triputa: 'triputa-tisra', ata: 'ata-khanda', eka: 'eka-chatusra',
  };
  const SYMBOL = { I: 'I', O: 'O', U: 'U' };

  function def(id) {
    id = NAMED[id] || id;
    const ch = CHAPU.find((c) => c.id === id);
    if (ch) {
      return { id, name: `${ch.name} tala`, chapu: true, symbol: ch.groups.join(' + '),
        angas: ch.groups.map((n) => ({ type: 'group', n })), count: ch.groups.reduce((a, b) => a + b, 0) };
    }
    const [sid, jid] = id.split('-');
    const s = SULADI.find((x) => x.id === sid), j = JATIS.find((x) => x.id === jid);
    if (!s || !j) return null;
    const angas = [...s.angas].map((c) => (c === 'I' ? { type: 'laghu', n: j.n } : c === 'O' ? { type: 'drutam', n: 2 } : { type: 'anudrutam', n: 1 }));
    const name = id === NAMED.adi ? 'Adi tala' : `${j.name} jati ${s.name} tala`;
    return { id, name, suladi: s, jati: j, angas, count: angas.reduce((a, x) => a + x.n, 0),
      symbol: [...s.angas].map((c) => (c === 'I' ? `I${j.n}` : SYMBOL[c])).join(' ') };
  }

  // One entry per beat (akshara) with its kriya.
  function beats(id) {
    const d = def(id);
    const out = [];
    d.angas.forEach((a, ai) => {
      for (let i = 0; i < a.n; i++) {
        let label;
        if (a.type === 'laghu') label = i === 0 ? 'clap' : String(i);          // clap, then finger counts
        else if (a.type === 'drutam') label = i === 0 ? 'clap' : 'wave';
        else if (a.type === 'anudrutam') label = 'clap';
        else label = String(i + 1);                                            // chapu: counted within each group
        out.push({ label, clap: i === 0, angaEnd: i === a.n - 1, anga: ai, type: a.type });
      }
    });
    return out;
  }

  return { JATIS, SULADI, CHAPU, NAMED, def, beats };
})();
