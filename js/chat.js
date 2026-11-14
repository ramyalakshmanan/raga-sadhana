// "Ask a doubt" chat, available on every page. Answers come from Claude,
// grounded in the app's own raga data and in what the learner is looking at.
// Without an API key or proxy, it still answers raga lookups from the app's data.
const Chat = (() => {
  const T = Theory;
  const MODEL = 'claude-opus-5-5';
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.8.0/+esm';
  const cfg = window.RAGA_SADHANA_CONFIG || {};

  let Anthropic = null, client = null, clientSig = '';
  let history = [];          // Messages API turns; assistant turns keep their full content
  let busy = false, live = null;

  const apiKey = () => store.get('chatKey', '');
  const mode = () => (cfg.chatProxyUrl ? 'proxy' : apiKey() ? 'key' : 'offline');

  // ---------- grounding ----------
  const tok = (s) => s.replace("'", '′');
  const SYSTEM = [
    `You are the music teacher built into Raga Sadhana, a web app for learning Carnatic music. Learners range from beginners to intermediate students. They ask about theory, ragas, ear training and their own singing.`,
    ``,
    `How to answer:`,
    `- Be clear, warm and concise. Most answers fit in a few short paragraphs or a short list; go longer only when the learner asks for depth.`,
    `- Use the app's swara notation: S R1 R2 R3 G1 G2 G3 M1 M2 P D1 D2 D3 N1 N2 N3. Write tara sthayi with a prime (S′) and mandra sthayi with a trailing dot (P.).`,
    `- Explain any term a beginner may not know (gamaka, sthayi, varjya, vakra, janya and so on) the first time you use it.`,
    `- For the ragas listed below, the listed arohanam, avarohanam and parent are what the app teaches; stay consistent with them. For other ragas, answer from your own knowledge and say where schools or books differ (alternate arohanams, parent assignments, bhashanga usage). Do not invent composers, kritis or historical facts; if you are not sure, say so.`,
    `- Singing advice should be practical and safe. If a learner describes pain, hoarseness that lasts, or strain, suggest rest and a teacher or voice professional.`,
    `- Point learners to the app when it helps: Learn (swarasthanas, melakarta decoder, 72-mela chart, katapayadi), Ear training (name the raga, name the swara), Janya map (janya ragas against their parent, mapping quiz), Voice practice (Check my singing note-by-note report, Find my range, Hold the shruti, Swara ladder, Octave jumps, Free singing), the tambura and shruti selector at the top.`,
    `- Each message may start with an <app_context> block describing the learner's page, selected raga, shruti and their latest singing report. Use it when the question relates to it (for example "why was my G3 sharp?"). Never reveal answers to an ear-training quiz question; coach the learner to hear the difference instead.`,
    `- Stay on music, singing and using the app. For unrelated requests, say briefly that you can only help with music here.`,
    `- Format with plain Markdown: short paragraphs, **bold** for key terms, and bullet or numbered lists. No tables.`,
    ``,
    `THE 72 MELAKARTAS (number, name, swaras):`,
    ...T.MELAS.map((m) => `${m.n} ${m.name}${m.alias ? ` (${m.alias})` : ''}: ${m.swaras.join(' ')}`),
    ``,
    `JANYA RAGAS IN THE APP (name, parent mela: arohanam | avarohanam):`,
    ...T.JANYAS.map((j) => `${j.name}, janya of ${j.parent} ${T.MELAS[j.parent - 1].name}: ${j.aro.map(tok).join(' ')} | ${j.ava.map(tok).join(' ')}`),
  ].join('\n');

  const PAGE = { learn: 'Learn', ear: 'Ear training', janya: 'Janya map', voice: 'Voice practice' };
  function appContext() {
    const tab = App.currentTab();
    const lines = [`Page: ${PAGE[tab]}`];
    const k = T.KATTAI.find((x) => Math.abs(x.hz - Sound.getSa()) < 0.5);
    if (k) lines.push(`Shruti: ${k.k} kattai (${k.note}, Sa = ${k.hz.toFixed(0)} Hz)`);
    const ragaLine = (r) => `${r.name}${r.kind === 'mela' ? ` (melakarta ${r.n})` : ` (janya of ${r.parent} ${T.MELAS[r.parent - 1].name})`}: ${r.aro.map(tok).join(' ')} | ${r.ava.map(tok).join(' ')}`;
    if (tab === 'learn') lines.push(`Open in the decoder: ${ragaLine(T.MELAS[Learn.current() - 1])}`);
    if (tab === 'janya' && Janya.current()) lines.push(`Open in Janya map: ${ragaLine(Janya.current())}`);
    if (tab === 'ear') lines.push('The learner is in an ear-training quiz. Do not name the raga or swara being played.');
    if (tab === 'voice') {
      lines.push(`Raga selected for voice practice: ${ragaLine(Voice.raga())}`);
      if (Voice.lastReport()) lines.push(`Latest "Check my singing" report:\n${Voice.lastReport()}`);
    }
    return `<app_context>\n${lines.join('\n')}\n</app_context>`;
  }

  // ---------- offline answers from the app's data ----------
  const squash = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  function findRagas(q) {
    let words = ' ' + q.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
    let flat = squash(q);
    // Match the longest names first and use up the text they cover, so "Suddha Saveri"
    // does not also count as "Saveri". Short names must be whole words ("Sri", "Nata").
    const names = T.ALL.flatMap((r) => [r.name, r.alias].filter(Boolean).map((nm) => ({ r, nm, s: squash(nm) })))
      .sort((a, b) => b.s.length - a.s.length);
    const hits = [];
    for (const { r, nm, s } of names) {
      const w = ' ' + nm.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
      const found = s.length < 6 ? words.includes(w) : flat.includes(s);
      if (!found) continue;
      hits.push(r);
      words = words.replace(w, ' # ');
      flat = flat.replace(s, '#');
    }
    const num = /\b(?:mela(?:karta|kartha)?|number|no\.?|#)\s*(\d{1,2})\b/i.exec(q);
    if (num && +num[1] >= 1 && +num[1] <= 72) hits.unshift(T.MELAS[+num[1] - 1]);
    return [...new Set(hits)].slice(0, 3);
  }
  function ragaCard(r) {
    const cls = T.classify(r);
    const parent = T.MELAS[r.parent - 1];
    return `<div class="chat-card">
      <b>${r.name}</b>${r.alias ? ` <span class="muted">(${r.alias})</span>` : ''}
      <div class="small muted">${r.kind === 'mela' ? `Melakarta ${r.n}, ${T.CHAKRAS[r.chakra]} chakra` : `Janya of ${T.melaLabel(parent)}`} · ${cls.type}${cls.vakra ? ', vakra' : ''}</div>
      <div><span class="label">Arohanam</span> ${T.seqHTML(r.aro)}</div>
      <div><span class="label">Avarohanam</span> ${T.seqHTML(r.ava)}</div>
      <div class="row"><button class="btn" type="button" data-play="${r.id}">Play</button><button class="btn subtle" type="button" data-open="${r.id}">Open in Janya map</button></div>
    </div>`;
  }
  function offlineAnswer(q) {
    const hits = findRagas(q);
    const setup = `For full answers to any question, add an API key in <button class="link" type="button" data-settings>chat settings</button>.`;
    if (hits.length) return `<p>Here is what the app knows about ${hits.map((r) => r.name).join(', ')}:</p>${hits.map(ragaCard).join('')}<p class="small muted">${setup}</p>`;
    return `<p>The AI teacher isn't connected yet, so for now I can only look up ragas. Try a raga name (for example "Mohanam") or a melakarta number ("mela 29").</p><p class="small muted">${setup}</p>`;
  }

  // ---------- rendering ----------
  function md(text) {
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (const raw of text.split('\n')) {
      const line = raw.trimEnd();
      let m;
      if ((m = /^\s*[-*•]\s+(.*)$/.exec(line))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); }
      else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); }
      else if ((m = /^#{1,6}\s+(.*)$/.exec(line))) { close(); out.push(`<p><b>${inline(m[1])}</b></p>`); }
      else if (!line.trim()) close();
      else { close(); out.push(`<p>${inline(line)}</p>`); }
    }
    close();
    return out.join('');
  }
  function addMsg(role, html) {
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.innerHTML = html;
    $('#chatLog').append(el);
    $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
    return el;
  }
  function renderSub() {
    $('#chatSub').textContent = mode() === 'offline' ? 'Raga lookups only. Add an API key in settings for full answers.' : 'Answers by Claude, an AI. It can make mistakes; check with your teacher.';
  }
  function suggestions() {
    const tab = App.currentTab();
    const r = tab === 'voice' ? Voice.raga() : tab === 'janya' ? Janya.current() : null;
    const s = {
      learn: ['How are the 72 melakartas numbered?', 'Why are R2 and G1 the same pitch?', `Explain ${T.MELAS[Learn.current() - 1].name} for a beginner`],
      ear: ['How can I tell Mohanam from Mohanakalyani by ear?', 'Tips for recognising ragas faster?'],
      janya: [r ? `Why is ${r.name} a janya of ${T.MELAS[r.parent - 1].name}?` : 'What is a janya raga?', 'What is a vakra raga?'],
      voice: [Voice.lastReport() ? 'Explain my last singing report' : 'How do I stay in tune with the shruti?', r ? `How should I practise ${r.name}?` : 'How should I warm up?', 'Why do I go sharp on high notes?'],
    }[tab] || [];
    $('#chatSuggest').innerHTML = s.map((q) => `<button class="chip-btn" type="button">${esc(q)}</button>`).join('');
  }

  // ---------- Claude ----------
  async function getClient() {
    if (!Anthropic) Anthropic = (await import(SDK_URL)).default;
    const sig = mode() === 'proxy' ? 'proxy:' + cfg.chatProxyUrl : 'key:' + apiKey();
    if (!client || clientSig !== sig) {
      client = mode() === 'proxy'
        // The proxy replaces this placeholder with the real key on the server.
        ? new Anthropic({ baseURL: cfg.chatProxyUrl, apiKey: 'added-by-proxy', dangerouslyAllowBrowser: true })
        : new Anthropic({ apiKey: apiKey(), dangerouslyAllowBrowser: true });
      clientSig = sig;
    }
    return client;
  }

  async function ask(question) {
    if (busy || !question.trim()) return;
    addMsg('user', esc(question).replace(/\n/g, '<br>'));
    $('#chatSuggest').innerHTML = '';
    if (mode() === 'offline') { addMsg('assistant', offlineAnswer(question)); return; }

    busy = true; setBusy(true);
    const bubble = addMsg('assistant', '<span class="typing" aria-label="Thinking"><i></i><i></i><i></i></span>');
    history.push({ role: 'user', content: [{ type: 'text', text: appContext() }, { type: 'text', text: question }] });
    let text = '';
    try {
      const c = await getClient();
      live = c.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: history,
      });
      for await (const ev of live) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          text += ev.delta.text;
          bubble.innerHTML = md(text);
          $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
        }
      }
      const final = await live.finalMessage();
      if (final.stop_reason === 'refusal') {
        history.pop();
        bubble.innerHTML = '<p>I can\'t help with that one. Try asking about ragas, swaras or your singing.</p>';
      } else {
        history.push({ role: 'assistant', content: final.content });
        if (!text) bubble.innerHTML = '<p>(No answer came back. Please try asking again.)</p>';
        if (final.stop_reason === 'max_tokens') bubble.insertAdjacentHTML('beforeend', '<p class="small muted">(The answer was cut short. Ask me to continue.)</p>');
      }
    } catch (e) {
      history.pop();
      bubble.classList.add('error');
      bubble.innerHTML = `<p>${errorText(e)}</p>${text ? md(text) : ''}`;
    } finally {
      busy = false; live = null; setBusy(false);
      $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
    }
  }

  function errorText(e) {
    if (Anthropic && e instanceof Anthropic.APIUserAbortError) return 'Stopped.';
    if (Anthropic && e instanceof Anthropic.AuthenticationError) return 'The API key was not accepted. Check it in chat settings.';
    if (Anthropic && e instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use the model. Check your Anthropic account.';
    if (Anthropic && e instanceof Anthropic.RateLimitError) return 'Too many questions at once. Wait a minute and try again.';
    if (Anthropic && e instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service. Check your internet connection and try again.';
    if (Anthropic && e instanceof Anthropic.APIError) return `The AI service returned an error${e.status ? ` (${e.status})` : ''}. Please try again in a moment.`;
    return 'The chat could not load. Check your internet connection and try again.';
  }

  function setBusy(on) {
    $('#chatSend').textContent = on ? 'Stop' : 'Send';
    $('#chatSend').classList.toggle('primary', !on);
  }

  // ---------- panel ----------
  function open(on) {
    $('#chatPanel').hidden = !on;
    $('#chatFab').setAttribute('aria-expanded', String(on));
    if (on) {
      renderSub();
      if (!$('#chatLog').children.length) {
        addMsg('assistant', `<p>Namaskaram! Ask me anything about ragas, swaras, melakartas, ear training or your singing. I can also explain your latest singing report.</p>`);
      }
      if (!busy) suggestions();
      $('#chatInput').focus();
    }
  }
  function renderSettings() {
    const el = $('#chatSettings');
    if (cfg.chatProxyUrl) {
      el.innerHTML = '<p>This site has a chat server set up, so there is nothing to configure.</p>';
      return;
    }
    el.innerHTML = `
      <p><b>Connect the AI teacher</b></p>
      <p class="small">Paste an Anthropic API key. It is saved only in this browser on this device and is sent only to Anthropic. Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>; usage is billed to that account.</p>
      <label for="chatKey" class="sr-only">Anthropic API key</label>
      <input id="chatKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${apiKey() ? '••••••••••••' : ''}">
      <div class="row">
        <button id="chatKeySave" class="btn primary" type="button">Save key</button>
        ${apiKey() ? '<button id="chatKeyRemove" class="btn subtle" type="button">Remove key</button>' : ''}
      </div>
      <p class="small muted">Running a class? The site owner can set up a shared chat server so learners don't need keys. See the README.</p>`;
    $('#chatKeySave').onclick = () => {
      const v = $('#chatKey').value.trim();
      if (v && !v.startsWith('••')) { store.set('chatKey', v); }
      $('#chatSettings').hidden = true; renderSub();
    };
    const rm = $('#chatKeyRemove');
    if (rm) rm.onclick = () => { store.set('chatKey', ''); renderSettings(); renderSub(); };
  }

  function init() {
    document.body.insertAdjacentHTML('beforeend', `
      <button id="chatFab" class="chat-fab" type="button" aria-expanded="false" aria-controls="chatPanel">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 6.5a1.5 1.5 0 1 0 0 .01Zm5 0a1.5 1.5 0 1 0 0 .01Zm5 0a1.5 1.5 0 1 0 0 .01Z"/></svg>
        <span>Ask a doubt</span>
      </button>
      <section id="chatPanel" class="chat-panel" role="dialog" aria-label="Ask a doubt" hidden>
        <header class="chat-head">
          <div><b>Ask a doubt</b><p id="chatSub" class="small muted"></p></div>
          <div class="chat-actions">
            <button id="chatNew" class="btn subtle" type="button">New chat</button>
            <button id="chatSettingsBtn" class="btn subtle" type="button">Settings</button>
            <button id="chatClose" class="btn subtle icon" type="button" aria-label="Close chat">×</button>
          </div>
        </header>
        <div id="chatSettings" class="chat-settings" hidden></div>
        <div id="chatLog" class="chat-log" aria-live="polite"></div>
        <div id="chatSuggest" class="chat-suggest"></div>
        <form id="chatForm" class="chat-form">
          <label for="chatInput" class="sr-only">Your question</label>
          <textarea id="chatInput" rows="2" placeholder="Ask about ragas, swaras or your singing…"></textarea>
          <button id="chatSend" class="btn primary" type="submit">Send</button>
        </form>
      </section>`);

    $('#chatFab').addEventListener('click', () => open($('#chatPanel').hidden));
    $('#chatClose').addEventListener('click', () => open(false));
    $('#chatSettingsBtn').addEventListener('click', () => { renderSettings(); $('#chatSettings').hidden = !$('#chatSettings').hidden; });
    $('#chatNew').addEventListener('click', () => {
      if (live) live.abort();
      history = []; $('#chatLog').innerHTML = ''; open(true);
    });
    $('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (busy) { if (live) live.abort(); return; }
      const q = $('#chatInput').value;
      $('#chatInput').value = '';
      ask(q);
    });
    $('#chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatForm').requestSubmit(); }
    });
    $('#chatSuggest').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) ask(b.textContent);
    });
    $('#chatLog').addEventListener('click', (e) => {
      const p = e.target.closest('[data-play]');
      if (p) Learn.playRaga(T.byId[p.dataset.play], 'both');
      const o = e.target.closest('[data-open]');
      if (o) App.showRaga(o.dataset.open);
      if (e.target.closest('[data-settings]')) { renderSettings(); $('#chatSettings').hidden = false; }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#chatPanel').hidden) open(false); });
  }

  return { init, findRagas, systemPrompt: () => SYSTEM, appContext };
})();
