import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';
import {
  ANALYSIS_HEIGHT,
  ANALYSIS_WIDTH,
  EMPTY_FEATURES,
  analyzeFrame,
  buildMask,
  type FrameFeatures,
} from '../../analysis/frameFeatures';
import { FrameSampler } from '../../analysis/frameSampler';
import { createSmoother } from '../../analysis/smoothing';
import { AudioEngine } from '../../audio/engine';
import { DEFAULT_SETTINGS, type SoundSettings } from '../../audio/mapping';
import { SUMMARY_INTERVAL_MS, describeActivity, formatTime, spokenTime } from '../../accessibility/describe';
import { usePreferences } from '../../app/preferences';
import { TOUR } from '../../content/chapters';
import { Legend } from './Legend';
import { ActivityTimeline } from './ActivityTimeline';
import { DebugOverlay } from './DebugOverlay';
import { initialPlayerState, playerReducer, statusLabel } from './playerState';

const VIDEO_SRC = `${import.meta.env.BASE_URL}media/iss-lightning-web.mp4`;
const SPEEDS = [0.5, 1, 1.5] as const;
const ANALYSIS_STEP = 0.1; // seconds of media time between analyzed frames (10 per second)

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (h: number) => void;
};

export function ListeningRoom({ startSignal }: { startSignal: number }) {
  const prefs = usePreferences();
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(216.7);
  const [speed, setSpeed] = useState<number>(1);
  const [volume, setVolume] = useState(0.6);
  const [channels, setChannels] = useState(DEFAULT_SETTINGS.channels);
  const [features, setFeatures] = useState<FrameFeatures>(EMPTY_FEATURES);
  const [summary, setSummary] = useState('Press Play to begin. The description of detected activity will appear here.');
  const [announcement, setAnnouncement] = useState('');
  const [debugWeights, setDebugWeights] = useState<Float32Array | null>(null);

  const videoRef = useRef<VideoWithRVFC>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const samplerRef = useRef<FrameSampler | null>(null);
  const maskRef = useRef(buildMask(ANALYSIS_WIDTH, ANALYSIS_HEIGHT));
  const smootherRef = useRef(createSmoother());
  const prevWeightsRef = useRef<Float32Array | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const lastUiRef = useRef(0);
  const stopRequestedRef = useRef(false);
  const lastSummaryRef = useRef(0);
  const lastSummaryDensityRef = useRef<number | null>(null);
  const settingsRef = useRef<SoundSettings>({ reducedIntensity: prefs.reducedIntensity, channels });
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

  const statusId = useId();
  const descId = useId();

  useEffect(() => {
    settingsRef.current = { reducedIntensity: prefs.reducedIntensity, channels };
  }, [prefs.reducedIntensity, channels]);

  const announce = useCallback((msg: string) => {
    // Re-setting identical text would not be re-announced; add a zero-width variation.
    setAnnouncement((prev) => (prev === msg ? `${msg}\u200b` : msg));
  }, []);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new AudioEngine();
    return engineRef.current;
  }, []);

  /** Analyze the frame currently shown by the video and drive the sound. */
  const analyzeNow = useCallback(
    (sound: boolean) => {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (!samplerRef.current) samplerRef.current = new FrameSampler(video.videoWidth || 1280, video.videoHeight || 720);
      } catch {
        return;
      }
      const t = video.currentTime;
      const rgba = samplerRef.current.sample(video);
      if (!rgba) return;
      const last = lastTimeRef.current;
      const dt = last === null || t < last ? 0 : t - last;
      lastTimeRef.current = t;
      const { features: raw, weights } = analyzeFrame(rgba, ANALYSIS_WIDTH, ANALYSIS_HEIGHT, maskRef.current, prevWeightsRef.current);
      prevWeightsRef.current = weights;
      const smooth = smootherRef.current.update(raw, dt || ANALYSIS_STEP);
      if (sound) engineRef.current?.update(smooth, dt, settingsRef.current);

      const now = performance.now();
      if (!sound || now - lastUiRef.current > 200) {
        lastUiRef.current = now;
        setFeatures(smooth);
        setTime(t);
        if (debug) setDebugWeights(weights);
      }
      if (!sound || now - lastSummaryRef.current >= SUMMARY_INTERVAL_MS) {
        lastSummaryRef.current = now;
        setSummary(describeActivity(smooth, t, sound ? lastSummaryDensityRef.current : null));
        lastSummaryDensityRef.current = smooth.density;
      }
    },
    [debug],
  );

  // Analysis loop: runs only while playing, paced by the video's own frames.
  useEffect(() => {
    if (state.status !== 'playing') return;
    const video = videoRef.current;
    if (!video) return;
    let rvfc = 0;
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const last = lastTimeRef.current;
      if (last === null || video.currentTime - last >= ANALYSIS_STEP || video.currentTime < last) analyzeNow(true);
      schedule();
    };
    const schedule = () => {
      if (video.requestVideoFrameCallback) rvfc = video.requestVideoFrameCallback(tick);
      else raf = requestAnimationFrame(tick);
    };
    schedule();
    return () => {
      cancelled = true;
      if (rvfc && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(rvfc);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [state.status, analyzeNow]);

  const resetAnalysis = useCallback(() => {
    smootherRef.current.reset();
    prevWeightsRef.current = null;
    lastTimeRef.current = null;
    lastSummaryDensityRef.current = null;
  }, []);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video || state.status === 'error') return;
    if (state.audio !== 'running') {
      dispatch({ type: 'ACTIVATING' });
      const ok = await getEngine().activate();
      dispatch({ type: 'AUDIO', audio: ok ? 'running' : 'unavailable' });
      if (ok) {
        getEngine().setVolume(volume);
        getEngine().setMuted(state.muted);
      } else {
        announce('Sound could not start in this browser. The video, live descriptions and indicators still work.');
      }
    }
    if (video.ended || video.currentTime >= (video.duration || Infinity) - 0.05) video.currentTime = 0;
    try {
      await video.play();
    } catch {
      dispatch({ type: 'PAUSED' });
      announce('Playback could not start. Press Play to try again.');
    }
  }, [announce, getEngine, state.audio, state.muted, state.status, volume]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    engineRef.current?.silence();
  }, []);

  const stopSound = useCallback(() => {
    engineRef.current?.stop();
    const video = videoRef.current;
    if (video && !video.paused) {
      // The pause event announces the stop, so it is not overwritten by "Paused."
      stopRequestedRef.current = true;
      video.pause();
    } else {
      announce('Sound stopped.');
    }
  }, [announce]);

  const restart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    engineRef.current?.silence();
    resetAnalysis();
    video.currentTime = 0;
    announce('Restarted from the beginning.');
  }, [announce, resetAnalysis]);

  const seekTo = useCallback((t: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, t), video.duration || duration);
    setTime(video.currentTime);
  }, [duration]);

  // Hero "Start listening" button.
  useEffect(() => {
    if (startSignal > 0) {
      playButtonRef.current?.focus();
      void play();
    }
    // Only react to a new start request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  // Escape stops sound anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (state.status === 'playing' || state.status === 'activating')) stopSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, stopSound]);

  // Pause when the tab is hidden: no processing or sound in the background.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        pause();
        announce('Paused because the page was hidden.');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [announce, pause]);

  // Debug view only: expose the output meter for inspection and automated checks.
  useEffect(() => {
    if (!debug) return;
    const w = window as unknown as { earthbeatOutputLevel?: () => number };
    w.earthbeatOutputLevel = () => engineRef.current?.outputLevel() ?? 0;
    return () => {
      delete w.earthbeatOutputLevel;
    };
  }, [debug]);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    engineRef.current?.setMuted(state.muted);
  }, [state.muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Dispose audio on unmount.
  useEffect(
    () => () => {
      void engineRef.current?.dispose();
      engineRef.current = null;
    },
    [],
  );

  const isPlaying = state.status === 'playing' || state.status === 'activating';
  const label = statusLabel(state);

  return (
    <section id="experience" className="section room" aria-labelledby="room-title">
      <div className="section-head">
        <p className="eyebrow">The listening room</p>
        <h2 id="room-title">Hear lightning seen from the space station</h2>
        <p className="lede">
          Press Play to watch the NASA visualization and hear EarthBeat sonify each frame as it plays. Sound starts only when you
          press Play. Headphones are optional; they make left–right position easier to hear.
        </p>
      </div>

      <div className="room-grid">
        <div className="player-col">
          <figure className="player">
            <div className="video-frame">
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                preload="metadata"
                playsInline
                muted
                aria-describedby={descId}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration || 216.7);
                }}
                onLoadedData={() => {
                  dispatch({ type: 'MEDIA_READY' });
                  if (videoRef.current && videoRef.current.paused) analyzeNow(false);
                }}
                onPlay={() => resetAnalysis()}
                onPlaying={() => {
                  dispatch({ type: 'PLAYING' });
                  announce('Playing.');
                }}
                onPause={() => {
                  engineRef.current?.silence();
                  if (!videoRef.current?.ended) {
                    dispatch({ type: 'PAUSED' });
                    announce(stopRequestedRef.current ? 'Sound stopped and playback paused.' : 'Paused.');
                  }
                  stopRequestedRef.current = false;
                }}
                onSeeking={() => {
                  engineRef.current?.silence();
                  resetAnalysis();
                  dispatch({ type: 'SEEKING' });
                }}
                onSeeked={(e) => {
                  dispatch({ type: 'SEEKED' });
                  const v = e.currentTarget;
                  if (v.paused) analyzeNow(false);
                  announce(`At ${spokenTime(v.currentTime)}.`);
                }}
                onWaiting={() => dispatch({ type: 'BUFFERING', buffering: true })}
                onCanPlay={() => dispatch({ type: 'BUFFERING', buffering: false })}
                onTimeUpdate={(e) => {
                  if (state.status !== 'playing') setTime(e.currentTarget.currentTime);
                }}
                onEnded={() => {
                  engineRef.current?.silence();
                  dispatch({ type: 'ENDED' });
                  announce('The visualization has finished. Press Play to listen again.');
                }}
                onError={() =>
                  dispatch({
                    type: 'ERROR',
                    message:
                      'The NASA video could not be loaded. Check your connection and press Try again. The written descriptions below remain available.',
                  })
                }
              />
              {state.status === 'loading' && <div className="video-overlay" role="presentation"><span className="spinner" aria-hidden="true" /> Loading video…</div>}
              {state.buffering && state.status === 'playing' && <div className="video-overlay subtle" role="presentation">Buffering…</div>}
              {state.status === 'error' && (
                <div className="video-overlay error" role="alert">
                  <p>{state.error}</p>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      dispatch({ type: 'RETRY' });
                      videoRef.current?.load();
                    }}
                  >
                    Try again
                  </button>
                </div>
              )}
              {debug && <DebugOverlay weights={debugWeights} features={features} />}
            </div>
            <figcaption id={descId} className="video-caption">
              NASA visualization: lightning events detected by the Lightning Imaging Sensor on the International Space Station,
              2017–2023. Yellow points on a gray globe mark detected lightning. The video has no soundtrack; all sound is generated by
              EarthBeat from the frames. Credit: NASA&rsquo;s Scientific Visualization Studio.
            </figcaption>
          </figure>

          <div className="controls" role="group" aria-label="Playback and sound controls">
            <div className="controls-row primary-row">
              <button
                ref={playButtonRef}
                type="button"
                className="btn btn-play"
                onClick={() => (isPlaying ? pause() : void play())}
                disabled={state.status === 'error'}
                aria-describedby={statusId}
              >
                <span className="play-icon" data-state={isPlaying ? 'pause' : 'play'} aria-hidden="true" />
                {isPlaying ? 'Pause' : state.status === 'ended' ? 'Play again' : 'Play'}
              </button>
              <button type="button" className="btn" onClick={restart} disabled={state.status === 'error'}>
                Restart
              </button>
              <button type="button" className="btn btn-stop" onClick={stopSound}>
                Stop sound <kbd>Esc</kbd>
              </button>
              <p id={statusId} className="status-pill" data-status={state.status}>
                <span className="dot" aria-hidden="true" />
                {label}
              </p>
            </div>

            <ActivityTimeline time={time} duration={duration} onSeek={seekTo} />

            <div className="controls-row">
              <label className="seek">
                <span className="visually-hidden">Seek position</span>
                <input
                  type="range"
                  min={0}
                  max={Math.round(duration * 10) / 10}
                  step={1}
                  value={Math.min(time, duration)}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-valuetext={`${spokenTime(time)} of ${spokenTime(duration)}`}
                  disabled={state.status === 'error'}
                />
              </label>
              <span className="time" aria-hidden="true">
                {formatTime(time)} / {formatTime(duration)}
              </span>
            </div>

            <div className="controls-row wrap">
              <fieldset className="speed">
                <legend>Speed</legend>
                {SPEEDS.map((s) => (
                  <label key={s} className="chip">
                    <input type="radio" name="speed" value={s} checked={speed === s} onChange={() => setSpeed(s)} />
                    <span>{s}×</span>
                  </label>
                ))}
              </fieldset>

              <label className="volume">
                <span>Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-valuetext={`${Math.round(volume * 100)} percent`}
                />
              </label>

              <button
                type="button"
                className="btn"
                aria-pressed={state.muted}
                onClick={() => {
                  dispatch({ type: 'MUTE', muted: !state.muted });
                  announce(state.muted ? 'Sound on.' : 'Muted.');
                }}
              >
                {state.muted ? 'Unmute' : 'Mute'}
              </button>

              <label className="check">
                <input
                  type="checkbox"
                  checked={prefs.reducedIntensity}
                  onChange={(e) => prefs.set('reducedIntensity', e.target.checked)}
                />
                <span>Gentle sound (quieter, softer, sparser)</span>
              </label>
            </div>

            <details className="channels">
              <summary>Sound layers</summary>
              <p className="hint">Turn individual layers off to focus on one mapping. All layers are on by default.</p>
              <div className="controls-row wrap">
                {(
                  [
                    ['tones', 'Tones (position and height)'],
                    ['bed', 'Activity bed (overall amount)'],
                    ['accents', 'Change ticks (sudden changes)'],
                  ] as const
                ).map(([key, text]) => (
                  <label key={key} className="check">
                    <input
                      type="checkbox"
                      checked={channels[key]}
                      onChange={(e) => setChannels((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
            </details>

            <div className="tour" role="group" aria-label="Guided listening moments">
              <p className="tour-title">Guided moments</p>
              <ul>
                {TOUR.map((stop) => (
                  <li key={stop.time}>
                    <button type="button" className="btn btn-link" onClick={() => seekTo(stop.time)}>
                      {formatTime(stop.time)} · {stop.label}
                    </button>
                    <p>{stop.listenFor}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="panel-col" aria-label="What EarthBeat detects right now">
          <div className="now panel">
            <h3>Right now</h3>
            <p className="now-summary" aria-live={prefs.liveDescriptions ? 'polite' : 'off'}>
              {summary}
            </p>
            <label className="check small">
              <input
                type="checkbox"
                checked={prefs.liveDescriptions}
                onChange={(e) => prefs.set('liveDescriptions', e.target.checked)}
              />
              <span>Announce descriptions to screen readers (about every 4 seconds)</span>
            </label>
          </div>
          <Legend features={features} />
        </aside>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
