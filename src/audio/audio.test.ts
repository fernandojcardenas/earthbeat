import { describe, expect, it } from 'vitest';
import { EMPTY_FEATURES, type FrameFeatures } from '../analysis/frameFeatures';
import { AudioEngine } from './engine';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  PENTATONIC_HZ,
  createSequencer,
  mapFeatures,
  pitchDegree,
  stereoPan,
  type SoundSettings,
} from './mapping';
import { FakeAudioContext } from '../test/fakeAudio';

const busy: FrameFeatures = { ...EMPTY_FEATURES, density: 1, intensity: 1, peak: 1, spread: 1, change: 1, centroidX: 1, height: 1 };
const reduced: SoundSettings = { ...DEFAULT_SETTINGS, reducedIntensity: true };

describe('mapping (tests 3–6)', () => {
  it('maximal activity cannot exceed rate, gain or bed ceilings', () => {
    for (const s of [DEFAULT_SETTINGS, reduced]) {
      const p = mapFeatures(busy, s);
      expect(p.rate).toBeLessThanOrEqual(s.reducedIntensity ? LIMITS.maxNotesPerSecondReduced : LIMITS.maxNotesPerSecond);
      expect(p.noteGain).toBeLessThanOrEqual(LIMITS.maxNoteGain);
      expect(p.bedGain).toBeLessThanOrEqual(LIMITS.maxBedGain);
      expect(Math.abs(p.pan)).toBeLessThanOrEqual(LIMITS.maxPan);
      expect(p.frequency).toBeLessThanOrEqual(880);
    }
  });

  it('a sequencer fed extreme input for 60 s never exceeds the note-rate cap', () => {
    const seq = createSequencer();
    let notes = 0;
    let accents = 0;
    for (let i = 0; i < 600; i++) {
      for (const e of seq.step({ ...busy, change: i % 2 }, 0.1, DEFAULT_SETTINGS)) {
        if (e.kind === 'note') notes++;
        else accents++;
      }
    }
    expect(notes).toBeLessThanOrEqual(LIMITS.maxNotesPerSecond * 60 + 1);
    expect(accents).toBeLessThanOrEqual(60 / LIMITS.minAccentIntervalSec + 1);
  });

  it('horizontal position maps monotonically to stereo pan', () => {
    let prev = -Infinity;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const pan = stereoPan(x);
      expect(pan).toBeGreaterThanOrEqual(prev);
      prev = pan;
    }
    expect(stereoPan(0)).toBeLessThan(0);
    expect(stereoPan(1)).toBeGreaterThan(0);
    expect(stereoPan(0.5)).toBeCloseTo(0);
  });

  it('vertical position maps monotonically to pitch', () => {
    let prev = -Infinity;
    for (let h = 0; h <= 1.0001; h += 0.02) {
      const f = PENTATONIC_HZ[pitchDegree(h)];
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(PENTATONIC_HZ[pitchDegree(0)]).toBe(PENTATONIC_HZ[0]);
    expect(PENTATONIC_HZ[pitchDegree(1)]).toBe(PENTATONIC_HZ[PENTATONIC_HZ.length - 1]);
  });

  it('identical feature sequences produce identical event sequences', () => {
    const seqFeatures = Array.from({ length: 300 }, (_, i) => ({
      ...EMPTY_FEATURES,
      density: (Math.sin(i / 7) + 1) / 2,
      height: (Math.cos(i / 11) + 1) / 2,
      centroidX: (i % 50) / 50,
      intensity: 0.6,
      change: i % 13 === 0 ? 0.9 : 0.1,
    }));
    const render = () => {
      const seq = createSequencer();
      return seqFeatures.flatMap((f) => seq.step(f, 0.1, DEFAULT_SETTINGS));
    };
    const a = render();
    expect(a.length).toBeGreaterThan(50);
    expect(render()).toEqual(a);
  });

  it('nothing is produced for empty frames or a zero time step', () => {
    const seq = createSequencer();
    for (let i = 0; i < 100; i++) expect(seq.step(EMPTY_FEATURES, 0.1, DEFAULT_SETTINGS)).toEqual([]);
    expect(seq.step(busy, 0, DEFAULT_SETTINGS)).toEqual([]);
  });
});

describe('reduced intensity (test 10)', () => {
  it('lowers gain, rate and accent sharpness', () => {
    const n = mapFeatures(busy, DEFAULT_SETTINGS);
    const r = mapFeatures(busy, reduced);
    expect(r.noteGain).toBeLessThan(n.noteGain);
    expect(r.rate).toBeLessThan(n.rate);
    expect(r.bedGain).toBeLessThan(n.bedGain);
    const accent = (s: SoundSettings) => createSequencer().step(busy, 0.5, s).find((e) => e.kind === 'accent');
    const an = accent(DEFAULT_SETTINGS);
    const ar = accent(reduced);
    if (an?.kind !== 'accent' || ar?.kind !== 'accent') throw new Error('expected accents');
    expect(ar.gain).toBeLessThan(an.gain);
    expect(ar.attack).toBeGreaterThan(an.attack);
  });

  it('disabled channels produce no events of that kind', () => {
    const seq = createSequencer();
    const s: SoundSettings = { ...DEFAULT_SETTINGS, channels: { tones: false, bed: true, accents: false } };
    for (let i = 0; i < 50; i++) expect(seq.step(busy, 0.1, s)).toEqual([]);
  });
});

describe('audio engine (test 9)', () => {
  const make = () => {
    const ctx = new FakeAudioContext();
    const engine = new AudioEngine(() => ctx as unknown as AudioContext);
    return { ctx, engine };
  };

  it('does nothing before activation (no autoplay)', () => {
    const { engine } = make();
    expect(engine.update(busy, 0.5, DEFAULT_SETTINGS)).toEqual([]);
    expect(engine.ready).toBe(false);
  });

  it('caps simultaneous voices', async () => {
    const { engine } = make();
    await engine.activate();
    for (let i = 0; i < 200; i++) engine.update(busy, 0.5, DEFAULT_SETTINGS);
    expect(engine.activeVoices).toBeLessThanOrEqual(LIMITS.maxVoices);
  });

  it('mute sets the master gain to zero and unmute restores it', async () => {
    const { engine } = make();
    await engine.activate();
    engine.setVolume(0.5);
    expect(engine.masterGainValue).toBeGreaterThan(0);
    engine.setMuted(true);
    expect(engine.masterGainValue).toBe(0);
    engine.setMuted(false);
    expect(engine.masterGainValue).toBeGreaterThan(0);
  });

  it('emergency stop silences and releases every voice; dispose closes the context', async () => {
    const { ctx, engine } = make();
    await engine.activate();
    for (let i = 0; i < 20; i++) engine.update(busy, 0.5, DEFAULT_SETTINGS);
    expect(engine.activeVoices).toBeGreaterThan(0);
    engine.stop();
    expect(engine.activeVoices).toBe(0);
    await engine.dispose();
    expect(ctx.state).toBe('closed');
    expect(ctx.sources.every((s) => !s.started || s.stopped)).toBe(true);
  });

  it('reports failure instead of throwing when audio is unsupported', async () => {
    const engine = new AudioEngine(() => {
      throw new Error('no audio');
    });
    await expect(engine.activate()).resolves.toBe(false);
  });
});
