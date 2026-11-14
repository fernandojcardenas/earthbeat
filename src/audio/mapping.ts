import { clamp01, type FrameFeatures } from '../analysis/frameFeatures';

/**
 * Deterministic visual-feature → sound mapping. Pure functions only: given the
 * same features, settings and media-time step, the output is always the same.
 */

/** A major pentatonic, two octaves, A3 (220 Hz) to A5 (880 Hz). No sub-bass, no piercing highs. */
export const PENTATONIC_HZ: readonly number[] = [
  220.0, 246.94, 277.18, 329.63, 369.99, 440.0, 493.88, 554.37, 659.25, 739.99, 880.0,
];

/** Fixed root of the activity bed (A2). */
export const BED_ROOT_HZ = 110;

export interface SoundSettings {
  /** Reduced-intensity mode: lower gain, softer accents, sparser rhythm. */
  reducedIntensity: boolean;
  channels: { tones: boolean; bed: boolean; accents: boolean };
}

export const DEFAULT_SETTINGS: SoundSettings = {
  reducedIntensity: false,
  channels: { tones: true, bed: true, accents: true },
};

/** Hard safety ceilings. The engine enforces these regardless of input. */
export const LIMITS = {
  maxNotesPerSecond: 6,
  maxNotesPerSecondReduced: 3,
  maxVoices: 8,
  maxNoteGain: 0.22,
  maxBedGain: 0.12,
  maxAccentGain: 0.16,
  minAccentIntervalSec: 0.4,
  maxPan: 0.8,
  reducedGainScale: 0.55,
  accentThreshold: 0.55,
} as const;

export interface SoundParams {
  /** Stereo position, −maxPan (left) … +maxPan (right). */
  pan: number;
  /** Scale-degree index into PENTATONIC_HZ. */
  degree: number;
  frequency: number;
  /** Notes per second of the pulse (0 when nothing is detected). */
  rate: number;
  /** Per-note peak gain. */
  noteGain: number;
  /** Low-pass cutoff of the tone bus, Hz. */
  filterHz: number;
  /** Gain of the sustained activity bed. */
  bedGain: number;
}

export function pitchDegree(height: number): number {
  return Math.round(clamp01(height) * (PENTATONIC_HZ.length - 1));
}

export function stereoPan(centroidX: number): number {
  return (clamp01(centroidX) * 2 - 1) * LIMITS.maxPan;
}

export function mapFeatures(f: FrameFeatures, s: SoundSettings): SoundParams {
  const reduced = s.reducedIntensity;
  const gainScale = reduced ? LIMITS.reducedGainScale : 1;
  const maxRate = reduced ? LIMITS.maxNotesPerSecondReduced : LIMITS.maxNotesPerSecond;
  const density = clamp01(f.density);
  const degree = pitchDegree(f.height);
  const rate = density <= 0.005 ? 0 : Math.min(maxRate, 0.75 + density * (maxRate - 0.75));
  return {
    pan: stereoPan(f.centroidX),
    degree,
    frequency: PENTATONIC_HZ[degree],
    rate,
    noteGain: Math.min(LIMITS.maxNoteGain, (0.06 + 0.16 * clamp01(f.intensity)) * gainScale),
    filterHz: 700 + clamp01(f.spread) * 3300,
    bedGain: Math.min(LIMITS.maxBedGain, (0.015 + 0.105 * density) * gainScale),
  };
}

export interface NoteEvent {
  kind: 'note';
  frequency: number;
  pan: number;
  gain: number;
}
export interface AccentEvent {
  kind: 'accent';
  gain: number;
  /** Attack time in seconds; longer in reduced-intensity mode (softer). */
  attack: number;
}
export type SoundEvent = NoteEvent | AccentEvent;

/**
 * Converts the smoothed feature stream into discrete note and accent events,
 * advanced by *media* time so rhythm follows the visualization, not the wall clock.
 */
export interface Sequencer {
  step(features: FrameFeatures, mediaDt: number, settings: SoundSettings): SoundEvent[];
  reset(): void;
}

export function createSequencer(): Sequencer {
  let phase = 0;
  let sinceAccent = Infinity;

  return {
    step(features, mediaDt, settings) {
      const events: SoundEvent[] = [];
      const dt = Number.isFinite(mediaDt) && mediaDt > 0 ? Math.min(mediaDt, 0.5) : 0;
      if (dt === 0) return events;
      const p = mapFeatures(features, settings);
      sinceAccent += dt;

      if (settings.channels.tones && p.rate > 0) {
        phase += p.rate * dt;
        // At most one note per step, so a long step can never burst many notes at once.
        if (phase >= 1) {
          phase %= 1;
          events.push({ kind: 'note', frequency: p.frequency, pan: p.pan, gain: p.noteGain });
        }
      } else {
        phase = 0;
      }

      if (
        settings.channels.accents &&
        clamp01(features.change) >= LIMITS.accentThreshold &&
        sinceAccent >= LIMITS.minAccentIntervalSec
      ) {
        sinceAccent = 0;
        const scale = settings.reducedIntensity ? LIMITS.reducedGainScale * 0.6 : 1;
        events.push({
          kind: 'accent',
          gain: Math.min(LIMITS.maxAccentGain, 0.06 + 0.1 * clamp01(features.change)) * scale,
          attack: settings.reducedIntensity ? 0.04 : 0.008,
        });
      }
      return events;
    },
    reset() {
      phase = 0;
      sinceAccent = Infinity;
    },
  };
}
