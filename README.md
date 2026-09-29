# Raga Sadhana

A browser app for learning Carnatic music: melakarta theory, janya raga mapping, ear training, and voice practice with live pitch tracking.

## Features

- **Learn**: the twelve swarasthanas, a step-by-step decoder for all 72 melakartas (madhyamam → chakra → position), the full mela chart, and the katapayadi rule.
- **Ear training**: name a raga from its arohanam/avarohanam (foundation, look-alike, janya and melakarta levels) or name a swara against Sa. Wrong answers show both ragas side by side with the differing swaras highlighted.
- **Janya map**: 43 janya ragas shown against their parent mela's swaras, with a quiz for janya → parent and swaras → mela number.
- **Voice practice**: microphone pitch meter and trace over the raga's swaras, plus range finding with a shruti suggestion, shruti holding, swara ladders, octave jumps and free singing.

Tones use just-intonation ratios over the chosen shruti (kattai 1–7), with a synthesised tambura drone.

## Run it

No build step or dependencies. The microphone only works on `localhost` or HTTPS, so serve the folder rather than opening the file directly:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765 in Chrome. Use headphones for voice practice so the microphone hears only your voice.

## Project layout

```
index.html      page structure
css/app.css     styles (light and dark themes)
js/util.js      shared helpers
js/theory.js    swarasthanas, 72 melakartas, janya raga data
js/sound.js     tambura drone and tone synth (Web Audio)
js/pitch.js     microphone input and YIN pitch detection
js/learn.js     Learn tab
js/ear.js       Ear training tab
js/janya.js     Janya map tab
js/voice.js     Voice practice tab
js/main.js      tabs, shruti and app wiring
```
