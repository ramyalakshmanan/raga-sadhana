// Small shared helpers.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const store = {
  get(k, d) {
    try { const v = localStorage.getItem('rs.' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem('rs.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ }
  },
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const sample = (a, n) => shuffle(a).slice(0, n);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const stdev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
function percentile(a, p) {
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
}
function median(a) { return percentile(a, 0.5); }
function fmtCents(d) {
  const r = Math.round(d);
  return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r) + '¢';
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Segmented control: buttons with data-v, aria-pressed marks the selected one.
function segment(el, onChange) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    $$('button[data-v]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onChange(b.dataset.v);
  });
  return {
    get: () => $('button[aria-pressed="true"]', el)?.dataset.v,
    set: (v) => $$('button[data-v]', el).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === v))),
  };
}
