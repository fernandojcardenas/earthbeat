import { CHAPTERS } from '../content/chapters';
import { seasonSummary } from '../content/seasons';
import { formatTime } from '../accessibility/describe';
import { DENSITY_REFERENCE, THRESHOLDS } from '../analysis/frameFeatures';
import { LIMITS, PENTATONIC_HZ } from '../audio/mapping';
import profile from '../content/profile.json';
import { PipelineDiagram } from './PipelineDiagram';
import { SOURCES, DEPENDENCIES } from '../content/sources';

export function StorySection() {
  return (
    <section id="story" className="section" aria-labelledby="story-title">
      <div className="section-head">
        <p className="eyebrow">Guided story</p>
        <h2 id="story-title">What you are listening to</h2>
      </div>
      <ol className="story">
        <li>
          <h3>A lightning sensor on the space station</h3>
          <p>
            From 2017 to 2023, the Lightning Imaging Sensor (LIS) on the International Space Station recorded lightning events,
            each with a latitude, longitude and time. NASA&rsquo;s Scientific Visualization Studio drew those events from the
            final quality-controlled science dataset as yellow points on a globe.
          </p>
        </li>
        <li>
          <h3>A ten-day roving window</h3>
          <p>
            After a one-day introduction ({formatTime(CHAPTERS[0].start)}–{formatTime(CHAPTERS[0].end)}), each frame shows the
            lightning detected over ten days. The window slides forward through the years, so every moment of the video is a
            short slice of the record rather than one instant.
          </p>
        </li>
        <li>
          <h3>Patterns move with the seasons</h3>
          <p>
            NASA describes the visualization as showing seasonal lightning patterns. Watching the season wheel in the corner, the
            mass of yellow points tends to sit higher on the globe during northern summer and lower during northern winter. The
            globe also turns, so the continents facing you change over time.
          </p>
        </li>
        <li>
          <h3>EarthBeat turns the picture into sound</h3>
          <p>
            Ten times per second of video, EarthBeat measures where the yellow points are, how much of the picture they cover, how
            strong and spread out they are and how quickly the picture changes. Those measurements set stereo position, pitch,
            pulse speed, loudness, tone brightness and soft ticks — always the same way, so the same moment always sounds the same.
          </p>
        </li>
        <li>
          <h3>Why more than one sense</h3>
          <p>
            Earth science is usually shared as pictures. Sound and text make the same patterns available to people who are blind
            or have low vision, and give everyone a second way to notice change, rhythm and balance in the data.
          </p>
        </li>
      </ol>
    </section>
  );
}

export function AccessibilitySection() {
  return (
    <section id="accessibility" className="section" aria-labelledby="a11y-title">
      <div className="section-head">
        <p className="eyebrow">Accessibility</p>
        <h2 id="a11y-title">Built to be explored without seeing it</h2>
        <p className="lede">
          EarthBeat is designed toward WCAG 2.2 AA practices. It has been checked with automated tools and by hand (see the
          project&rsquo;s accessibility report); it has not yet been tested with blind or low-vision users, which is the most
          important next step.
        </p>
      </div>
      <div className="cards">
        <article className="card">
          <h3>Keyboard</h3>
          <ul>
            <li>Every control is a native button, slider, radio button or checkbox, reachable with Tab.</li>
            <li>Space or Enter activates buttons; arrow keys move sliders and speed choices.</li>
            <li>
              <kbd>Esc</kbd> stops sound immediately from anywhere on the page.
            </li>
            <li>A &ldquo;Skip to the listening room&rdquo; link is the first stop on the page.</li>
          </ul>
        </article>
        <article className="card">
          <h3>Screen readers</h3>
          <ul>
            <li>Landmarks (header, navigation, main, footer) and one ordered heading outline.</li>
            <li>The video has a written description of what it shows and its data period.</li>
            <li>A polite live region summarizes detected activity about every four seconds — never every frame. It can be turned off.</li>
            <li>Play, pause, seek, mute, stop, errors and the end of the video are announced.</li>
          </ul>
        </article>
        <article className="card">
          <h3>Seeing and motion</h3>
          <ul>
            <li>High-contrast theme and visible focus outlines.</li>
            <li>States are shown with text and shape, not color alone.</li>
            <li>Reduced motion follows your system setting and can be switched here.</li>
            <li>Layouts reflow at narrow widths and at 200% zoom.</li>
          </ul>
        </article>
        <article className="card">
          <h3>Comfortable sound</h3>
          <ul>
            <li>No autoplay: nothing sounds until you press Play.</li>
            <li>Volume, mute, Stop sound and a gentle mode with lower volume, softer ticks and slower pulses.</li>
            <li>A limiter, a 70 Hz high-pass filter and a highest note of 880 Hz avoid harsh sound.</li>
            <li>Without sound, the live text and indicators still convey every mapping.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export function MethodologySection() {
  const s = seasonSummary();
  const stats = profile.stats;
  return (
    <section id="method" className="section" aria-labelledby="method-title">
      <div className="section-head">
        <p className="eyebrow">How it works &amp; methodology</p>
        <h2 id="method-title">From NASA frames to sound</h2>
      </div>
      <PipelineDiagram />

      <div className="method-grid" id="method-details">
        <article className="card">
          <h3>Measuring each frame</h3>
          <ul>
            <li>The full-length video is analyzed in the browser at 10 frames per second of video time.</li>
            <li>
              Each frame is reduced to 160 × 90 pixels by repeated halving, which averages every source pixel.
            </li>
            <li>
              A pixel counts as lightning-colored when its yellowness (the smaller of red and green, minus blue) is at least{' '}
              {THRESHOLDS.minYellowness}, red and green are both at least {THRESHOLDS.minRedGreen}, and they differ by no more than{' '}
              {THRESHOLDS.maxRedGreenGap}. White clouds, stars, labels and the gray globe fail this test.
            </li>
            <li>The bottom-right corner, which holds the date and season wheel, is excluded.</li>
            <li>
              Coverage is normalized so that {(DENSITY_REFERENCE * 100).toFixed(1)}% of the frame (about the 99th percentile across
              the video) reads as 100%.
            </li>
          </ul>
        </article>
        <article className="card">
          <h3>Turning measurements into sound</h3>
          <ul>
            <li>Features are smoothed with short time constants (0.08–0.4 s) so pixel noise does not cause chatter.</li>
            <li>
              Pitch uses an 11-note A-major pentatonic scale from {Math.round(PENTATONIC_HZ[0])} to{' '}
              {Math.round(PENTATONIC_HZ[PENTATONIC_HZ.length - 1])} Hz. The scale keeps the sound musical while keeping higher
              positions higher.
            </li>
            <li>
              Rhythm advances with video time, capped at {LIMITS.maxNotesPerSecond} notes per second ({LIMITS.maxNotesPerSecondReduced} in
              gentle mode), with at most {LIMITS.maxVoices} sounds at once.
            </li>
            <li>No randomness: identical frames and settings always produce identical notes.</li>
          </ul>
        </article>
      </div>

      <article className="card validation">
        <h3>What the analysis found</h3>
        <p>
          Run over all {stats.samples.toLocaleString('en-US')} analyzed frames, the pitch feature tracks the seasons shown on the
          NASA season wheel. At every northern-summer reading checked, activity sat higher in the frame (height {s.summerMin.toFixed(2)}{' '}
          or more, average {s.summerMean.toFixed(2)}) than at every northern-winter reading (at most {s.winterMax.toFixed(2)}, average{' '}
          {s.winterMean.toFixed(2)}), on a scale where 0 is the bottom of the frame and 1 the top. You can hear this as notes rising in
          northern summers and falling in northern winters.
        </p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Season readings and measured height">
          <table>
            <caption className="visually-hidden">Measured activity height at season-wheel readings</caption>
            <thead>
              <tr>
                <th scope="col">Video time</th>
                <th scope="col">Season wheel</th>
                <th scope="col">Group</th>
                <th scope="col">Mean height</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.time}>
                  <td>{formatTime(r.time)}</td>
                  <td>{r.reading}</td>
                  <td>{r.group}</td>
                  <td>{r.height.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Caution: this describes the rendered picture. The camera framing, globe rotation and tilt also affect height, so this
          is an observation about the visualization, not a new scientific measurement.
        </p>
      </article>

      <article className="card limits">
        <h3>Limitations</h3>
        <ul>
          <li>EarthBeat analyzes a NASA-rendered video, not the raw LIS event archive.</li>
          <li>Video compression, colors, the mask, resolution and sampling rate all affect the measurements.</li>
          <li>Sounds express relative visual patterns — not lightning counts, flash energy or physical units.</li>
          <li>Left and right are positions in the picture; because the globe rotates they are not fixed longitudes.</li>
          <li>The musical scale and smoothing are interpretive choices made for clarity and comfort.</li>
          <li>EarthBeat is for learning and exploration. It is not a weather-warning or forecasting tool.</li>
        </ul>
      </article>

      <article className="card">
        <h3>Reproduce it</h3>
        <p>
          The project repository includes the exact analysis code used in the browser, a script that re-runs it over the whole
          video with FFmpeg, the resulting per-frame data, and automated tests. Two independent runs produced identical results.
        </p>
      </article>
    </section>
  );
}

export function SourcesSection() {
  return (
    <section id="sources" className="section" aria-labelledby="sources-title">
      <div className="section-head">
        <p className="eyebrow">Sources &amp; credits</p>
        <h2 id="sources-title">Data, credits and licenses</h2>
      </div>
      <div className="cards">
        <article className="card wide">
          <h3>NASA data and visualization</h3>
          <ul className="source-list">
            {SOURCES.map((src) => (
              <li key={src.url}>
                <a href={src.url}>{src.title}</a>
                <span> — {src.note}</span>
              </li>
            ))}
          </ul>
          <p className="hint">
            Visualization credit: NASA&rsquo;s Scientific Visualization Studio. Visualizers: Michala Garrison (SSAI, lead), Greg
            Shirah (NASA/GSFC), Kel Elkins (USRA), Alex Kekesi (Global Science and Technology, Inc.). Dataset: Blakeslee, R. J.
            (2020), Quality Controlled Lightning Imaging Sensor (LIS) on International Space Station (ISS) Science Data, NASA Global
            Hydrometeorology Resource Center DAAC. Background layers listed by NASA: CPC cloud composite, Natural Earth gray earth,
            and MODIS MCD12C1 land cover (Friedl &amp; Sulla-Menashe, 2015).
          </p>
        </article>
        <article className="card">
          <h3>Software</h3>
          <ul>
            {DEPENDENCIES.map((d) => (
              <li key={d.name}>
                {d.name} — {d.license}
              </li>
            ))}
          </ul>
          <p className="hint">No fonts, icon packs, images or audio files from third parties are used. Icons and diagrams are original SVG.</p>
        </article>
        <article className="card">
          <h3>Licenses and disclosures</h3>
          <ul>
            <li>EarthBeat&rsquo;s original code and text: Apache License 2.0.</li>
            <li>NASA media remains under NASA&rsquo;s media usage guidelines and is not covered by EarthBeat&rsquo;s license.</li>
            <li>
              EarthBeat is an independent project for the 2026 NASA International Space Apps Challenge. It is not affiliated with or
              endorsed by NASA.
            </li>
            <li>
              Development assistance: SI-assisted tools supported planning, coding, debugging, testing and documentation under the
              creator&rsquo;s direction and review. No SI-generated data, imagery, narration or music is used; all sound is produced
              by documented code from NASA visual frames.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
