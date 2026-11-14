# Sources, Credits and Licenses

All sources were accessed on 2026-11-14.

## 1. Original EarthBeat work — Apache License 2.0

Source code, documentation, interface text, the CSS/SVG icons, wordmark, pipeline diagram and demo slides were created for this project by Fernando Cardenas, with development assistance disclosed in [SI_DISCLOSURE.md](SI_DISCLOSURE.md). License: [LICENSE](LICENSE).

## 2. NASA data and media — not covered by the Apache license

| Resource | Use | Terms / credit |
|---|---|---|
| [Lightning Events Detected from the International Space Station (ISS) 2017–2023](https://svs.gsfc.nasa.gov/5011/), NASA Scientific Visualization Studio, ID 5011 | The input data: 1080p video, re-encoded to 720p and analyzed frame by frame | Credit: NASA's Scientific Visualization Studio. Visualizers: Michala Garrison (SSAI, lead), Greg Shirah (NASA/GSFC), Kel Elkins (USRA), Alex Kekesi (Global Science and Technology, Inc.) |
| Blakeslee, R. J. (2020). *Quality Controlled Lightning Imaging Sensor (LIS) on International Space Station (ISS) Science Data.* NASA Global Hydrometeorology Resource Center DAAC | Dataset visualized by NASA (not accessed directly) | Cited as listed by NASA SVS |
| CPC Cloud Composite; Gray Earth (Natural Earth); MCD12C1 MODIS Land Cover CMG (Friedl, M. & Sulla-Menashe, D., 2015; USGS/NASA LP DAAC) | Background layers of the visualization, as listed by NASA SVS | Cited as listed by NASA SVS |
| [Earth Information Center content gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/) | Collection containing the visualization | NASA |
| [NASA images and media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and [brand guidelines](https://www.nasa.gov/nasa-brand-center/brand-guidelines/) | Terms followed: attribution, no logos or insignia, no implied endorsement | NASA |

No Space Agency Partner datasets are used.

## 3. Challenge and rules references

- [The Earth Information Jukebox — challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)
- [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)
- [Judging and Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/)
- [Participant Terms and Conditions](https://www.spaceappschallenge.org/legal/)

## 4. Standards and technical references

- [Web Audio API](https://www.w3.org/TR/webaudio/) (W3C) — sound synthesis
- [HTML: the video element](https://html.spec.whatwg.org/multipage/media.html) and [`requestVideoFrameCallback`](https://wicg.github.io/video-rvfc/) — frame timing
- [Canvas 2D](https://html.spec.whatwg.org/multipage/canvas.html) — frame sampling
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) — accessibility practices
- The A-major pentatonic scale and equal-temperament frequencies (A4 = 440 Hz) are standard music theory.

## 5. Software

### Shipped in the production bundle

| Package | Version | License |
|---|---|---|
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| scheduler (dependency of react-dom) | 0.28.0 | MIT |

### Development and testing only (not shipped)

| Package / tool | Version | License | Purpose |
|---|---|---|---|
| vite | 6.4.6 | MIT | Build and dev server |
| @vitejs/plugin-react | 4.7.0 | MIT | React support for Vite |
| typescript | 5.8.3 | Apache-2.0 | Strict type checking |
| vitest | 3.2.4 | MIT | Unit/component tests |
| @testing-library/react, /dom, /user-event, /jest-dom | 16.3.0, 10.4.0, 14.6.1, 6.6.3 | MIT | Component tests |
| jsdom | 26.1.0 | MIT | Test DOM |
| @playwright/test | 1.53.2 | Apache-2.0 | Browser smoke tests, screenshots, slide PDF |
| axe-core, @axe-core/playwright | 4.10.3, 4.10.2 | MPL-2.0 | Automated accessibility scan |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | 9.39.5, 9.39.5, 8.72.2, 5.2.0, 0.4.26, 16.5.0 | MIT | Linting |
| prettier | 3.5.3 | MIT | Formatting |
| tsx | 4.20.3 | MIT | Running TypeScript analysis scripts |
| FFmpeg | 9.0.2 | LGPL-2.1+/GPL (Homebrew build) | Re-encoding the NASA video and offline frame decoding; not distributed |
| Google Chrome | installed system browser | proprietary freeware | Test browser (H.264 support) |
| GitHub / GitHub Pages / GitHub Actions | — | service | Repository hosting, build and public deployment |

All licenses are OSI-approved and compatible with distributing EarthBeat under Apache-2.0 (MPL-2.0 and FFmpeg are used only as development tools and are not included in the distributed app).

## 6. Fonts, icons, images, audio

- Fonts: the visitor's system font (`system-ui`); no web fonts are downloaded.
- Icons, wordmark, globe illustration and pipeline diagram: original CSS/SVG written for EarthBeat.
- Images in documentation and slides: screenshots of EarthBeat (which include frames of the NASA visualization, credited above).
- Audio: none recorded or sampled. All sound is synthesized live by the Web Audio API from the analysis.

## 7. Development assistance

SI-assisted tools were used for planning, code, data-processing scripts, debugging, testing and documentation under the creator's direction and review. See [SI_DISCLOSURE.md](SI_DISCLOSURE.md).
