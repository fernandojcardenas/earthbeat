/**
 * SYNTHETIC TEST FIXTURES — not NASA data. Small RGBA frames used only by unit
 * tests to exercise the analysis code with known pixel layouts.
 */
import { ANALYSIS_HEIGHT as H, ANALYSIS_WIDTH as W } from '../analysis/frameFeatures';

export const LIGHTNING_YELLOW: [number, number, number] = [255, 225, 0];
export const CLOUD_WHITE: [number, number, number] = [235, 235, 235];
export const GLOBE_GRAY: [number, number, number] = [55, 60, 66];

export function blankFrame(rgb: [number, number, number] = [0, 0, 0]): Uint8ClampedArray {
  const f = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) f.set([...rgb, 255], i * 4);
  return f;
}

/** Paint a filled rectangle given in normalized coordinates (y = 0 at top). */
export function paint(frame: Uint8ClampedArray, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]) {
  for (let y = Math.floor(y0 * H); y < Math.ceil(y1 * H); y++)
    for (let x = Math.floor(x0 * W); x < Math.ceil(x1 * W); x++) frame.set([...rgb, 255], (y * W + x) * 4);
  return frame;
}

/** Deterministic pseudo-random sprinkle of yellow points (fixed-seed LCG). */
export function sprinkle(frame: Uint8ClampedArray, fraction: number, seed = 7) {
  let s = seed;
  for (let i = 0; i < W * H; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    if (s / 0xffffffff < fraction) frame.set([...LIGHTNING_YELLOW, 255], i * 4);
  }
  return frame;
}
