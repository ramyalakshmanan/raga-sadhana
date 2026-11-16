# Raga Sadhana

A browser app for learning Carnatic music: melakarta theory, janya raga mapping, ear training, and voice practice with live pitch tracking.

Live site: https://ramyalakshmanan.github.io/raga-sadhana/

## Features

- **Learn**: the twelve swarasthanas, a step-by-step decoder for all 72 melakartas (madhyamam → chakra → position), the full mela chart, and the katapayadi rule.
- **Talas** (under Learn): angas and kriyas, the five jatis, the 35-tala chart, chapu talas, gati, and a tala player with clicks, a live beat display and optional gati pulses.
- **Ear training**: name a raga from its arohanam/avarohanam (foundation, look-alike, janya and melakarta levels) or name a swara against Sa. Wrong answers show both ragas side by side with the differing swaras highlighted.
- **Janya map**: 43 janya ragas shown against their parent mela's swaras, with a quiz for janya → parent and swaras → mela number.
- **Quiz**: mixed sessions of 10 or 20 questions on scale → raga, listen → raga, melody → raga, janya → melakarta, melakarta → janya, melakarta names and numbers, and the swaras of a raga (its arohanam, its varjya swaras, which variant it uses). Every answer comes with an explanation, and you can practise just the questions you missed.
- **Varisai & alankaram**: sarali varisai 1–12, janta varisai 1–2, dhatu varisai 1, mel and mandra sthayi practice, and alankarams (Dhruva, Matya, Rupaka, Tisra triputa, Eka) generated for the selected raga. Plays in tala with clicks and a beat display, in 1st, 2nd or 3rd speed (or all three), at any tempo, on swaras or in aakaaram. Sing along and each swara is scored for sthanam, with a per-swara report and the hardest swara-to-swara transitions.
- **Check my singing**: pick a raga, sing its arohanam/avarohanam or any of its swaras, and get a note-by-note report: the swara heard, cents sharp or flat, steadiness, and a verdict (accurate, close, off, wrong swara, not in raga, missed).
- **Voice practice**: microphone pitch meter and trace over the raga's swaras, plus range finding with a shruti suggestion, shruti holding, swara ladders, octave jumps and free singing.
- **Ask a doubt**: a chat on every page. Learners ask questions and Claude answers, using the app's raga data and what the learner is looking at (the selected raga, their latest singing report). Without an AI connection it still answers raga lookups from the app's data.

Light and dark themes follow the system setting, with a toggle in the top bar. Melodies can play on veena, violin, flute or voice (sound settings in the top bar).

Tones use just-intonation ratios over the chosen shruti (kattai 1–7), with a synthesised tanpura drone.

## Run it

No build step or dependencies. The microphone only works on `localhost` or HTTPS, so serve the folder rather than opening the file directly:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765 in Chrome. Use headphones for voice practice so the microphone hears only your voice.

## Connecting the chat to Claude

The site is public, so an API key must never go in its code. There are two ways to connect the chat.

### Option 1: each person uses their own key (no setup)

Open the chat, choose **Settings**, and paste an Anthropic API key from https://console.anthropic.com/settings/keys. The key is saved only in that browser and sent only to Anthropic. Good for trying it yourself.

### Option 2: a shared chat server, so learners need no key

`worker/chat-proxy.js` is a small Cloudflare Worker that adds your key to chat requests from your site. Your key stays in Cloudflare as a secret.

1. Create a free account at https://dash.cloudflare.com and go to **Workers & Pages → Create → Create Worker**. Name it (for example `raga-chat`) and deploy the starter.
2. Choose **Edit code**, replace everything with the contents of `worker/chat-proxy.js`, and deploy.
3. In the Worker's **Settings → Variables and Secrets**, add:
   - `ANTHROPIC_API_KEY`, type **Secret**: your Anthropic API key
   - `ALLOWED_ORIGINS`, type **Text**: `https://ramyalakshmanan.github.io`
4. Copy the Worker's address (like `https://raga-chat.yourname.workers.dev`) into `chatProxyUrl` in `js/config.js`, then commit and push.
5. In the Anthropic Console, set a monthly spend limit. Anyone who visits the site can use the chat, and usage is billed to your account.

The Worker only allows plain chat with the model the site uses, with a capped answer length.

## Project layout

```
index.html            page structure
css/app.css           styles (light and dark themes)
js/config.js          site settings (chat server address)
js/util.js            shared helpers
js/theory.js          swarasthanas, 72 melakartas, janya raga data
js/sound.js           tanpura drone and tone synth (Web Audio)
js/pitch.js           microphone input and YIN pitch detection
js/learn.js           Learn tab
js/ear.js             Ear training tab
js/janya.js           Janya map tab
js/voice.js           Voice practice tab
js/quiz.js            Quiz tab
js/abhyasa.js         varisai and alankaram practice
js/tala.js            tala definitions (35 suladi talas, chapu talas, kriyas)
js/talas.js           Learn → Talas page and tala player
js/picker.js          type-to-search raga picker
js/chat.js            "Ask a doubt" chat (Claude via the Anthropic SDK)
js/main.js            tabs, shruti and app wiring
worker/chat-proxy.js  optional shared chat server (Cloudflare Worker)
```
