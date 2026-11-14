# EarthBeat

**Hear our changing planet.**

EarthBeat is an accessible web experience that turns a NASA Earth Information Center visualization into explainable, deterministic sound, so blind, low-vision and multimodal learners can hear patterns in our changing planet.

- **Challenge:** [The Earth Information Jukebox](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/) — 2026 NASA International Space Apps Challenge, Universal Event
- **Creator:** Fernando Cardenas (team EarthBeat)
- **Live app:** https://fernandojcardenas.github.io/earthbeat/
- **Seven-slide demo:** https://fernandojcardenas.github.io/earthbeat/demo/
- **License:** Apache-2.0 for original code and text (NASA media excluded — see [NOTICE](NOTICE))

> EarthBeat is an independent Space Apps project. It is not affiliated with or endorsed by NASA.

## The problem

NASA's Earth Information Center publishes rich visualizations of Earth's changing systems, but they are almost entirely visual. People who are blind or have low vision — and anyone who learns better by listening — have little access to the patterns they show.

## What EarthBeat does

EarthBeat plays NASA's visualization *Lightning Events Detected from the International Space Station (ISS) 2017–2023* and, while it plays, measures every analyzed frame and turns those measurements into sound:

| What is measured in the frame | What you hear |
|---|---|
| Left–right position of the yellow lightning points | Stereo position |
| Height of the activity in the frame | Pitch (11-note pentatonic scale, 220–880 Hz) |
| Share of the frame covered by lightning points | Pulse speed and background-bed level |
| Average color strength of the points | Note loudness (with a safety ceiling) |
| How spread out the points are | Tone brightness |
| How much the frame changes | Short, soft ticks |

The same frames always produce the same sound. A "What am I hearing?" legend explains each mapping — what it tells you and what it does *not* mean — with live values, and a polite screen-reader summary describes the current activity about every four seconds.

### Key capabilities

- Synchronized NASA video, live frame analysis and Web Audio synthesis, driven by one clock (the video).
- Play, pause, restart, seek, 0.5×/1×/1.5× speed, volume, mute, **Stop sound** (also <kbd>Esc</kbd>).
- Gentle-sound mode (lower volume, softer ticks, slower pulses) and per-layer sound toggles.
- Activity timeline of the whole video, three guided listening moments, a guided story, methodology and sources.
- Full keyboard operation, skip link, landmarks, high-contrast and reduced-motion modes, no autoplay.
- Works without sound: live text and indicators carry every mapping.
- Analysis overlay for inspection: add `?debug` to the URL.

## Why the NASA data is integral

There is no pre-made soundtrack. Every note is computed from the pixels of NASA's visualization while it plays. Pausing the video stops the sound; seeking changes it; a frame with no lightning is silent. Running the analysis over the full video shows that the pitch feature tracks the seasons on NASA's season wheel: activity sits higher in the frame (higher notes) in every northern summer checked than in every northern winter checked. See [METHODOLOGY.md](METHODOLOGY.md).

## Architecture

```
NASA SVS video (720p derivative)
  → FrameSampler       (Canvas 2D, 1280×720 → 160×90 by repeated halving, 10 per second of video)
  → analyzeFrame       (yellow-pixel classifier, masked overlay corner → 0–1 features)
  → Smoother           (exponential smoothing + hysteresis)
  → Sequencer/mapping  (pure, deterministic feature → note/accent events, hard caps)
  → AudioEngine        (Web Audio: tones, bed, accents → 70 Hz high-pass → limiter → master)
  → React UI           (controls, live legend, throttled live region, timeline)
```

| Folder | Purpose |
|---|---|
| `src/analysis/` | Frame sampling, feature extraction, smoothing (pure, tested) |
| `src/audio/` | Deterministic mapping and the Web Audio engine |
| `src/accessibility/` | Text descriptions and time formatting |
| `src/features/experience/` | Listening room, legend, timeline, debug overlay, playback state |
| `src/content/` | Chapters, season readings, sources, offline analysis profile |
| `scripts/` | Offline profile (FFmpeg), mask snapshots, screenshots |
| `e2e/` | Browser smoke tests (Playwright, installed Google Chrome) |
| `docs/` | Validation data, screenshots |
| `public/demo/` | Seven-slide project demo |

No backend, accounts, analytics, tracking or third-party requests. Production dependencies: React and React DOM only.

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run dev        # development server
npm run check      # lint + type check + unit/component tests + production build
npm run test:e2e   # browser smoke tests (needs Google Chrome installed)
npm run profile    # re-run the analysis over the whole video (needs FFmpeg)
```

## Testing

- 36 unit and component tests (Vitest, Testing Library) covering bounds, determinism, monotonic mappings, rate/gain/voice caps, smoothing, mute/stop cleanup, accessible names and preferences.
- 15 browser tests on the production build (Playwright with Google Chrome): first load, play/pause/seek/stop cycles without console errors, browser-vs-offline analysis parity, measured audio output following the data, keyboard path, layouts at 360/768/1440 px and 200% zoom, reduced motion, video failure, slow network, the seven-slide deck, and axe-core accessibility scans in both themes.

Results with dates are recorded in the project's test report.

## Accessibility

Designed toward WCAG 2.2 AA practices and checked with automated and manual tests. It has **not** yet been tested with blind or low-vision users; that is the most important next step. Details: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Scientific limitations

- EarthBeat analyzes a NASA-rendered video, not the raw Lightning Imaging Sensor archive.
- Compression, colors, the mask, resolution and sampling rate affect the measurements.
- Sounds express relative visual patterns, not lightning counts or physical units.
- Left/right are frame positions; the globe rotates, so they are not fixed longitudes.
- The musical scale and smoothing are interpretive choices for clarity and comfort.
- It is an educational tool, not a weather-warning or forecasting product.

## Credits, license and disclosures

- Visualization: **NASA's Scientific Visualization Studio** — [SVS 5011](https://svs.gsfc.nasa.gov/5011/). Full credits in [SOURCES.md](SOURCES.md).
- Original EarthBeat code and text: [Apache License 2.0](LICENSE). NASA media is not covered by this license — see [NOTICE](NOTICE).
- Development assistance disclosure: [SI_DISCLOSURE.md](SI_DISCLOSURE.md).
- Method: [METHODOLOGY.md](METHODOLOGY.md) · Accessibility: [ACCESSIBILITY.md](ACCESSIBILITY.md) · Sources: [SOURCES.md](SOURCES.md) · Data provenance: [DATA_PROVENANCE.md](DATA_PROVENANCE.md)
