import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_HEIGHT as H,
  ANALYSIS_WIDTH as W,
  EMPTY_FEATURES,
  analyzeFrame,
  buildMask,
  pixelWeight,
  type FrameFeatures,
} from './frameFeatures';
import { createSmoother } from './smoothing';
import { CLOUD_WHITE, GLOBE_GRAY, LIGHTNING_YELLOW, blankFrame, paint, sprinkle } from '../test/fixtures';

const mask = buildMask(W, H);
const run = (frame: Uint8ClampedArray, prev: Float32Array | null = null) => analyzeFrame(frame, W, H, mask, prev);

function expectBounded(f: FrameFeatures) {
  for (const [k, v] of Object.entries(f)) {
    expect(Number.isFinite(v), k).toBe(true);
    if (k !== 'rawRatio') {
      expect(v, k).toBeGreaterThanOrEqual(0);
      expect(v, k).toBeLessThanOrEqual(1);
    }
  }
}

describe('pixel classification', () => {
  it('accepts lightning yellow and rejects white clouds, gray globe and black space', () => {
    expect(pixelWeight(...LIGHTNING_YELLOW)).toBeGreaterThan(0.9);
    expect(pixelWeight(...CLOUD_WHITE)).toBe(0);
    expect(pixelWeight(...GLOBE_GRAY)).toBe(0);
    expect(pixelWeight(0, 0, 0)).toBe(0);
  });
  it('rejects saturated red and green that are not the event color', () => {
    expect(pixelWeight(255, 30, 0)).toBe(0);
    expect(pixelWeight(30, 255, 0)).toBe(0);
  });
});

describe('feature extraction (test 1, 2)', () => {
  it('returns finite, bounded values for many synthetic frames', () => {
    for (let i = 0; i < 40; i++) {
      const f = sprinkle(blankFrame(GLOBE_GRAY), (i % 10) / 10, i + 1);
      expectBounded(run(f).features);
    }
  });

  it('dark and empty frames produce quiet, neutral output without errors', () => {
    const { features } = run(blankFrame());
    expect(features.density).toBe(0);
    expect(features.intensity).toBe(0);
    expect(features.centroidX).toBe(0.5);
    expect(features.height).toBe(0.5);
    expectBounded(features);
  });

  it('handles a truncated buffer by returning empty features', () => {
    const { features } = analyzeFrame(new Uint8ClampedArray(10), W, H, mask, null);
    expect(features).toEqual({ ...EMPTY_FEATURES });
  });

  it('ignores yellow inside the excluded date/season-wheel corner', () => {
    const f = paint(blankFrame(), 0.85, 0.8, 1, 1, LIGHTNING_YELLOW);
    expect(run(f).features.density).toBe(0);
  });

  it('locates activity: left/right centroid and top/bottom height', () => {
    const left = run(paint(blankFrame(), 0.05, 0.4, 0.15, 0.6, LIGHTNING_YELLOW)).features;
    const right = run(paint(blankFrame(), 0.6, 0.4, 0.7, 0.6, LIGHTNING_YELLOW)).features;
    expect(left.centroidX).toBeLessThan(0.2);
    expect(right.centroidX).toBeGreaterThan(0.6);
    expect(left.balance).toBe(0);
    expect(right.balance).toBe(1);
    const top = run(paint(blankFrame(), 0.4, 0.05, 0.6, 0.15, LIGHTNING_YELLOW)).features;
    const bottom = run(paint(blankFrame(), 0.4, 0.55, 0.6, 0.65, LIGHTNING_YELLOW)).features;
    expect(top.height).toBeGreaterThan(0.85);
    expect(bottom.height).toBeLessThan(0.5);
    expect(top.upperShare).toBe(1);
  });

  it('spread is larger for scattered activity than for one cluster', () => {
    const cluster = run(paint(blankFrame(), 0.45, 0.45, 0.5, 0.5, LIGHTNING_YELLOW)).features;
    const scattered = run(sprinkle(blankFrame(), 0.02)).features;
    expect(scattered.spread).toBeGreaterThan(cluster.spread + 0.3);
  });

  it('temporal change is zero for identical frames and positive when activity appears', () => {
    const a = run(blankFrame());
    expect(run(blankFrame(), a.weights).features.change).toBe(0);
    const b = run(paint(blankFrame(), 0.2, 0.2, 0.5, 0.5, LIGHTNING_YELLOW), a.weights);
    expect(b.features.change).toBeGreaterThan(0.5);
  });

  it('is deterministic for identical input', () => {
    const f = sprinkle(blankFrame(GLOBE_GRAY), 0.03, 42);
    expect(run(f).features).toEqual(run(f).features);
  });
});

describe('smoothing (test 7)', () => {
  it('converges predictably and never produces NaN, even from bad input', () => {
    const s = createSmoother();
    const target: FrameFeatures = { ...EMPTY_FEATURES, density: 1, centroidX: 1 };
    let last = s.update({ ...EMPTY_FEATURES }, 0.1);
    for (let i = 0; i < 50; i++) last = s.update(target, 0.1);
    expect(last.density).toBeGreaterThan(0.99);
    const bad = { ...target, density: NaN, centroidX: Infinity } as FrameFeatures;
    const after = s.update(bad, NaN);
    for (const v of Object.values(after)) expect(Number.isFinite(v)).toBe(true);
  });

  it('moves part-way per step (no jumps) and applies hysteresis to the active state', () => {
    const s = createSmoother();
    s.update({ ...EMPTY_FEATURES }, 0.1);
    const step = s.update({ ...EMPTY_FEATURES, density: 1 }, 0.1);
    expect(step.density).toBeGreaterThan(0);
    expect(step.density).toBeLessThan(1);
    expect(s.active).toBe(true);
    // 0.03 is between OFF (0.02) and ON (0.04): stays active on the way down.
    for (let i = 0; i < 60; i++) s.update({ ...EMPTY_FEATURES, density: 0.03 }, 0.1);
    expect(s.active).toBe(true);
    for (let i = 0; i < 60; i++) s.update({ ...EMPTY_FEATURES, density: 0 }, 0.1);
    expect(s.active).toBe(false);
  });
});
