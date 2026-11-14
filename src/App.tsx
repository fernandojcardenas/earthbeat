import { useState } from 'react';
import { PreferencesProvider, usePreferences } from './app/preferences';
import { ListeningRoom } from './features/experience/ListeningRoom';
import { AccessibilitySection, MethodologySection, SourcesSection, StorySection } from './components/Sections';

const NAV = [
  ['#experience', 'Experience'],
  ['#method', 'How It Works'],
  ['#accessibility', 'Accessibility'],
  ['#method-details', 'Methodology'],
  ['#sources', 'Sources'],
] as const;

function DisplaySettings() {
  const prefs = usePreferences();
  return (
    <div className="display-settings" role="group" aria-label="Display settings">
      <label className="check small">
        <input type="checkbox" checked={prefs.highContrast} onChange={(e) => prefs.set('highContrast', e.target.checked)} />
        <span>High contrast</span>
      </label>
      <label className="check small">
        <input type="checkbox" checked={prefs.reducedMotion} onChange={(e) => prefs.set('reducedMotion', e.target.checked)} />
        <span>Reduce motion</span>
      </label>
    </div>
  );
}

function Page() {
  const [startSignal, setStartSignal] = useState(0);
  const start = () => {
    const prefersReduced = document.documentElement.dataset.motion === 'reduce';
    document.getElementById('experience')?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
    setStartSignal((n) => n + 1);
  };

  return (
    <>
      <a className="skip-link" href="#experience">
        Skip to the listening room
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="wordmark" href="#top" aria-label="EarthBeat home">
            <span className="wordmark-orbit" aria-hidden="true" />
            <span className="wordmark-text">
              Earth<span>Beat</span>
            </span>
          </a>
          <nav aria-label="Main">
            <ul>
              {NAV.map(([href, text]) => (
                <li key={text}>
                  <a href={href}>{text}</a>
                </li>
              ))}
            </ul>
          </nav>
          <button type="button" className="btn btn-primary header-cta" onClick={start}>
            Start listening
          </button>
        </div>
        <DisplaySettings />
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Hear our changing planet.</p>
            <h1 id="hero-title">Earth data should not be seen only.</h1>
            <p className="lede">
              EarthBeat transforms NASA visualizations into an explainable soundscape so more people can explore the patterns
              shaping our planet. Start with six years of lightning seen from the International Space Station.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-large" onClick={start}>
                Start listening <span className="hint-inline">(plays sound)</span>
              </button>
              <a className="btn btn-ghost btn-large" href="#method">
                How it works
              </a>
            </div>
            <p className="attribution">
              Visualization: NASA&rsquo;s Scientific Visualization Studio, from Lightning Imaging Sensor data, 2017–2023. EarthBeat
              is an independent Space Apps project, not endorsed by NASA.
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="globe">
              <span className="ring r1" />
              <span className="ring r2" />
              <span className="ring r3" />
              <span className="wave">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ ['--i' as string]: i, height: `${20 + ((i * 37) % 80)}%` }} />
                ))}
              </span>
            </div>
          </div>
        </section>

        <ListeningRoom startSignal={startSignal} />
        <StorySection />
        <MethodologySection />
        <AccessibilitySection />
        <SourcesSection />
      </main>

      <footer className="site-footer">
        <p>
          <strong>EarthBeat</strong> — created by Fernando Cardenas for The Earth Information Jukebox challenge, 2026 NASA
          International Space Apps Challenge (Universal Event).
        </p>
        <p>
          Original code and text: Apache License 2.0. NASA visualization: NASA&rsquo;s Scientific Visualization Studio, used under
          NASA media guidelines. Not affiliated with or endorsed by NASA. Built with SI-assisted development tools under the
          creator&rsquo;s direction; see Sources for the full disclosure.
        </p>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <Page />
    </PreferencesProvider>
  );
}
