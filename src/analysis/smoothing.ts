import { EMPTY_FEATURES, clamp01, type FrameFeatures } from './frameFeatures';

/**
 * Time constants (seconds) for exponential smoothing of each feature.
 * Short constants keep transients responsive; longer ones stop small pixel
 * noise from making pitch or stereo position chatter.
 */
export const SMOOTHING_TAU: Record<keyof FrameFeatures, number> = {
  centroidX: 0.35,
  height: 0.35,
  density: 0.3,
  intensity: 0.3,
  peak: 0.2,
  balance: 0.35,
  upperShare: 0.35,
  spread: 0.4,
  change: 0.08,
  rawRatio: 0.3,
};

/** Hysteresis thresholds on smoothed density for the "activity present" state. */
export const ACTIVITY_ON = 0.04;
export const ACTIVITY_OFF = 0.02;

export interface Smoother {
  /** Feed raw features with the elapsed media time since the previous sample. */
  update(raw: FrameFeatures, dtSeconds: number): FrameFeatures;
  /** Whether activity is currently considered present (with hysteresis). */
  readonly active: boolean;
  reset(): void;
  readonly current: FrameFeatures;
}

export function createSmoother(): Smoother {
  let state: FrameFeatures = { ...EMPTY_FEATURES };
  let active = false;
  let primed = false;

  return {
    update(raw, dtSeconds) {
      const dt = Number.isFinite(dtSeconds) && dtSeconds > 0 ? Math.min(dtSeconds, 1) : 0;
      const next = { ...state };
      for (const key of Object.keys(SMOOTHING_TAU) as (keyof FrameFeatures)[]) {
        const target = Number.isFinite(raw[key]) ? raw[key] : state[key];
        if (!primed) {
          next[key] = target;
          continue;
        }
        const alpha = dt === 0 ? 0 : 1 - Math.exp(-dt / SMOOTHING_TAU[key]);
        next[key] = state[key] + alpha * (target - state[key]);
      }
      // When nothing is visible, positional features relax toward center instead of freezing.
      for (const key of Object.keys(next) as (keyof FrameFeatures)[]) {
        next[key] = key === 'rawRatio' ? Math.max(0, next[key]) : clamp01(next[key]);
      }
      primed = true;
      state = next;
      if (!active && state.density >= ACTIVITY_ON) active = true;
      else if (active && state.density <= ACTIVITY_OFF) active = false;
      return state;
    },
    get active() {
      return active;
    },
    get current() {
      return state;
    },
    reset() {
      state = { ...EMPTY_FEATURES };
      active = false;
      primed = false;
    },
  };
}
