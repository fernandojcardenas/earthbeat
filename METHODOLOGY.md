# EarthBeat Methodology

This document describes exactly how EarthBeat turns NASA visual frames into sound, how the method was calibrated and validated, and what it can and cannot tell a listener.

## 1. Source provenance

| Item | Value |
|---|---|
| Visualization | *Lightning Events Detected from the International Space Station (ISS) 2017–2023*, NASA Scientific Visualization Studio, ID 5011, released 2023-10-19 |
| Page | https://svs.gsfc.nasa.gov/5011/ |
| File used | `iss_lightning_sphere_07312023.mp4` (official 1920×1080 download) |
| Size / SHA-256 | 133,203,670 bytes / `a989a96b9ade08a9d5577c15325ff461fd1d52b36f410c9e1db3d6ba6c0dc230` |
| Format | H.264 High, 1920×1080, 30 fps, 6,501 frames, 216.7 s, no audio track |
| Underlying data | Quality Controlled LIS on ISS Science Data (Blakeslee, 2020), NASA GHRC DAAC; background layers listed by NASA: CPC cloud composite, Natural Earth gray earth, MODIS MCD12C1 land cover |

NASA describes the visualization as LIS lightning events from January 2017 to July 2023, drawn from the final quality-controlled science dataset with a ten-day roving window to show seasonal patterns. Full details: [DATA_PROVENANCE.md](DATA_PROVENANCE.md).

### What the frames contain (direct inspection)

| Video time | Content |
|---|---|
| 0:00–~1:10 | Introduction: one day (on-screen clock, March 1, 2017). The ISS orbit, the sensor's path and a white "ISS" label over a cloud-covered globe; lightning points accumulate along the path. No lightning-colored pixels in the first ~21 s. |
| ~1:10–3:36.7 | Full globe; each frame shows a ten-day window of events. A "10 Day Roving Window" season wheel in the bottom-right corner shows the year (2017→2023) and time of year. The globe rotates. |

Lightning events are drawn as **saturated yellow points**. Everything else — clouds, stars, globe, labels, orbit line, season wheel — is white, gray or black.

## 2. Optimized media

The original stays untouched in `input-data/` and is never committed. The web copy was made with FFmpeg 9.0.2:

```bash
ffmpeg -i iss_lightning_sphere_07312023.mp4 -an -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 24 -movflags +faststart \
  public/media/iss-lightning-web.mp4
```

Result: full length (216.7 s, 6,501 frames), 1280×720, 28,446,607 bytes, SHA-256 `4b38c0b803c15d54c3abc89eca585e9318ad41053f47963488ea561b167bdcdb`. Nothing was cut; the yellow points remain clearly visible (see `docs/validation/mask-*.png`).

## 3. Frame analysis

| Parameter | Value |
|---|---|
| Sampling | Every 0.1 s of **video time** (10 per second of video), paced by `requestVideoFrameCallback` with a `requestAnimationFrame` fallback |
| Analysis size | 160 × 90 pixels |
| Downsampling | Repeated halving 1280×720 → 640×360 → 320×180 → 160×90 with high-quality smoothing, which averages all source pixels (a single bilinear resize can skip small points) |
| Mask | Bottom-right rectangle x ≥ 0.80, y ≥ 0.70 of the frame excluded (date stamp and season wheel) |

### Lightning-colored pixel classifier

For each pixel with red R, green G, blue B (0–255):

- yellowness `Y = min(R, G) − B`
- the pixel is lightning-colored only if `min(R, G) ≥ 70`, `|R − G| ≤ 90` and `Y ≥ 45`
- its weight is `w = clamp((Y − 22.5) / (195 − 22.5), 0, 1)`

White clouds and labels have Y ≈ 0, the gray globe has Y < 0, black space fails the `min(R, G)` test, and red or green tints fail the `|R − G|` test. Thresholds were chosen by inspecting frames across the whole video; the mask images in `docs/validation/` show the classifier output beside the analyzed frame at 0:10, 0:45, 1:40, 2:40 and 3:25. At 0:10 (clouds, stars, the ISS label and orbit line visible, no lightning) the classifier detects nothing.

### Features (all 0–1)

| Feature | Definition |
|---|---|
| `centroidX` | weight-averaged horizontal position (0 left, 1 right); 0.5 if empty |
| `height` | 1 − weight-averaged vertical position (0 bottom, 1 top); 0.5 if empty |
| `density` | active-pixel ratio ÷ 0.032, clamped. 0.032 ≈ 99th percentile of the ratio over the whole video (p50 0.0081, p90 0.0235, p99 0.0318, max 0.0375) |
| `intensity` | mean weight of active pixels |
| `peak` | maximum weight |
| `balance` | share of weight in the right half |
| `upperShare` | share of weight in the upper half |
| `spread` | weighted standard distance from the centroid ÷ 0.408 (the value for a uniformly filled frame) |
| `change` | mean absolute weight difference from the previous analyzed frame ÷ 0.006 (≈ 99th percentile) |

### Smoothing and hysteresis

Each feature is smoothed with an exponential filter in video time, `x ← x + (1 − e^(−Δt/τ))(target − x)`, with τ = 0.08 s for `change`, 0.2 s for `peak`, 0.3 s for `density`/`intensity`, 0.35 s for position and 0.4 s for `spread`. Non-finite inputs are ignored. An "activity present" flag turns on at density ≥ 0.04 and off at ≤ 0.02. Analysis state is reset on every seek so no stale values carry over.

## 4. Sound mapping (`src/audio/mapping.ts`)

| Feature | Sound | Formula / limits |
|---|---|---|
| `centroidX` | stereo pan of each note | `pan = (2x − 1) × 0.8` (never hard-left/right); the bed follows at half width |
| `height` | pitch | 11-note A-major pentatonic, A3 220 Hz … A5 880 Hz; `degree = round(height × 10)` |
| `density` | pulse rate; bed level | `rate = 0.75 + density × 5.25` notes/s (max 6; gentle mode max 3; 0 when density ≤ 0.005); `bed = 0.015 + 0.105 × density` |
| `intensity` | note loudness | `gain = 0.06 + 0.16 × intensity` (max 0.22) |
| `spread` | tone brightness | low-pass cutoff `700 + 3300 × spread` Hz |
| `change` | soft tick | band-passed noise burst when change ≥ 0.55, at least 0.4 s apart, gain `0.06 + 0.1 × change` (max 0.16) |
| video time | progression | the pulse phase advances with *video* time, so rhythm and sound stop when the video stops |

Gentle mode multiplies note and bed gain by 0.55, accent gain by 0.33, lengthens the accent attack from 8 ms to 40 ms and halves the maximum pulse rate.

The bed is a sustained A2 (110 Hz) sine plus an E3 triangle whose level follows overall activity. Notes are triangle waves with a 15 ms attack and ~0.45 s decay.

### Safety chain

All layers pass through a 70 Hz high-pass filter (no sub-bass), a limiter (threshold −14 dB, ratio 20:1, 3 ms attack) and a master gain ≤ 0.7 × volume (default volume 60%). At most 8 sounds play at once; at most one note is scheduled per analysis step. Pause and seek fade the bed and stop all notes; **Stop sound**/<kbd>Esc</kbd> silences immediately. No sound is produced before the user presses Play.

### Why a pentatonic scale

Raw pixel-to-frequency mappings sound like noise. Quantizing height to a pentatonic scale makes every combination consonant, so listeners can follow *relative* movement (higher/lower) comfortably. The notes are not physical units; only their order carries meaning.

## 5. Determinism

The analysis, smoothing and sequencer are pure functions with no randomness (accent noise uses a fixed-seed generator). For a given sequence of frames and settings the event sequence is identical — verified by unit tests and by two complete, independent offline passes over all 2,167 analysis samples that produced **identical** features (maximum difference 0; `docs/validation/determinism.txt`).

In the browser, frames are sampled when the video presents them, so sample times can vary by a few milliseconds between runs; replaying a segment therefore gives materially consistent, not bit-identical, sound.

## 6. Validation

1. **Classifier check:** mask images (`docs/validation/mask-*.png`) show detections align with yellow points and that stars, clouds, labels and the season wheel are not detected.
2. **Offline profile:** `npm run profile` decodes the video with FFmpeg (area filter, 160×90, 10 fps) and runs the *same TypeScript analysis code* used by the browser. Output: `docs/validation/profile-full.csv` and `src/content/profile.json`. All values finite and bounded.
3. **Browser parity:** the Playwright test seeks the production build to seven times and compares the browser's raw active-pixel ratio with the offline value. Browser readings were systematically 15–50% higher (different downsampling filters) but followed the same pattern; all were within the test tolerance:

   | Time | Browser | Offline |
   |---|---|---|
   | 0:30 | 0.0010 | 0.0007 |
   | 1:00 | 0.0020 | 0.0013 |
   | 1:35 | 0.0160 | 0.0133 |
   | 1:50 | 0.0070 | 0.0060 |
   | 2:25 | 0.0190 | 0.0165 |
   | 2:40 | 0.0260 | 0.0239 |
   | 3:25 | 0.0270 | 0.0228 |

4. **Seasonal signal in the pitch feature.** The season wheel was read from frames at 13 times. Mean smoothed `height` within ±2 s (from the per-second profile):

   | Time | Wheel reading | Group | Height |
   |---|---|---|---|
   | 1:35 | 2017, near June | northern summer | 0.65 |
   | 1:40 | 2017, near August | northern summer | 0.57 |
   | 2:05 | 2018, near July | northern summer | 0.70 |
   | 2:25 | 2019, near August | northern summer | 0.66 |
   | 2:40 | 2020, near July | northern summer | 0.64 |
   | 3:10 | 2022, near July | northern summer | 0.64 |
   | 3:30 | 2023, near June | northern summer | 0.68 |
   | 1:20 | 2017, March | northern winter | 0.40 |
   | 1:50 | 2017, near December | northern winter | 0.37 |
   | 2:30 | 2019, near December | northern winter | 0.43 |
   | 2:50 | 2021, near March | northern winter | 0.51 |
   | 3:00 | 2021, near November | northern winter | 0.43 |
   | 3:20 | 2023, near February | northern winter | 0.40 |

   Every summer reading (min 0.57, mean 0.65) is above every winter reading (max 0.51, mean 0.42), so the melody rises in northern summers and falls in northern winters. This is consistent with the seasonal patterns NASA says the visualization shows. **Caveat:** height is a position in the rendered picture; camera framing, tilt and globe rotation also affect it. It is an observation about the visualization, not a new geophysical measurement. The app computes the same table live from `profile.json`.

5. **Automated tests:** 36 unit/component tests and 11 browser smoke tests (see the test report).

## 7. Interpretive choices

- Yellow color, not brightness, defines "lightning-colored" because clouds and labels are brighter than many lightning points.
- Normalization references (0.032 coverage, 0.006 change) were set from the full-video distribution so the loudest moments reach, but rarely exceed, full scale.
- Smoothing constants trade responsiveness for calm; ticks use the fastest constant so sudden changes stay audible.
- Stereo is limited to ±0.8 and the bed to half of that to avoid extreme movement.

## 8. Limitations

- EarthBeat measures a NASA-rendered visualization, not the raw LIS event archive; it cannot recover event counts, flash energy or exact locations.
- Compression, color rendering, the mask, resolution (160×90) and sampling rate (10 per second of video) affect all features; overlapping points merge.
- Left/right is a frame position, not longitude (the globe rotates). Up/down is a frame position, not latitude, although in this rendering the globe is upright.
- During the introduction the camera is close and moving, so changes there partly reflect camera motion.
- Scale, smoothing and caps are interpretive choices for accessibility and comfort.
- EarthBeat is for education and exploration — not an operational weather, storm-detection or warning product.

## 9. Reproduce

```bash
# from earthbeat-app/, with Node.js 20+ and FFmpeg installed
npm install
npx tsx scripts/profile-video.ts public/media/iss-lightning-web.mp4 10   # profile + determinism check
npx tsx scripts/mask-snapshots.ts                                        # classifier images
npm test                                                                 # unit/component tests
npm run test:e2e                                                         # browser tests incl. parity
```

Open the app with `?debug` to see the live mask, detected pixels, centroid and feature values over the video.
