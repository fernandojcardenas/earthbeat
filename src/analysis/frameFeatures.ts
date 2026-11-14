/**
 * Visual-frame feature extraction for the NASA SVS visualization
 * "Lightning Events Detected from the ISS 2017–2023" (SVS ID 5011).
 *
 * In that visualization each Lightning Imaging Sensor (LIS) event is drawn as
 * a saturated yellow point on a gray globe. Clouds, stars, orbit lines, labels
 * and the date/season wheel are white or gray. EarthBeat therefore classifies
 * a pixel as "lightning-colored" by yellowness (min(R,G) − B), not brightness,
 * and additionally masks the bottom-right overlay region.
 *
 * Everything here is a pure function of the RGBA pixels it receives, so the
 * same frame always yields the same features.
 */

export const ANALYSIS_WIDTH = 160;
export const ANALYSIS_HEIGHT = 90;

/** Pixel-classification thresholds (0–255 sRGB), chosen by inspecting source frames. */
export const THRESHOLDS = {
  /** Minimum of R and G — lightning points are both red- and green-bright. */
  minRedGreen: 70,
  /** Minimum yellowness min(R,G) − B for a pixel to count as lightning-colored. */
  minYellowness: 45,
  /** Yellowness at which a pixel is weighted as fully intense. */
  fullYellowness: 195,
  /** Max |R − G|; rejects orange/red/green tints that are not the yellow event color. */
  maxRedGreenGap: 90,
} as const;

/**
 * Reference active-pixel ratio that maps to density 1.0. Calibrated from the
 * full-video profile (approximately the 99th percentile of raw ratios), see
 * METHODOLOGY.md. Values above it clamp to 1.
 */
export const DENSITY_REFERENCE = 0.032;

/** Reference mean absolute weight change between analyzed frames that maps to change 1.0. */
export const CHANGE_REFERENCE = 0.006;

/** Rectangle in normalized frame coordinates, [x0, y0, x1, y1]. */
export type NormRect = readonly [number, number, number, number];

/**
 * Regions excluded from analysis: the date stamp and "10 Day Roving Window"
 * season wheel occupy the bottom-right corner of every frame.
 */
export const EXCLUDED_REGIONS: readonly NormRect[] = [[0.8, 0.7, 1, 1]];

export interface FrameFeatures {
  /** Weighted horizontal centroid of lightning-colored pixels: 0 = left, 1 = right. 0.5 when empty. */
  centroidX: number;
  /** Weighted vertical position: 0 = bottom of frame, 1 = top. 0.5 when empty. */
  height: number;
  /** Active-pixel ratio normalized by DENSITY_REFERENCE, 0–1. */
  density: number;
  /** Mean intensity (yellowness weight) of active pixels, 0–1. 0 when empty. */
  intensity: number;
  /** Peak pixel weight in the frame, 0–1. */
  peak: number;
  /** Share of total weight in the right half of the frame, 0–1. 0.5 when empty. */
  balance: number;
  /** Share of total weight in the upper half of the frame, 0–1. 0.5 when empty. */
  upperShare: number;
  /** Spatial spread: weighted standard distance from the centroid, normalized, 0–1. */
  spread: number;
  /** Temporal change versus the previous analyzed frame, normalized, 0–1. */
  change: number;
  /** Raw (unnormalized) active-pixel ratio, kept for validation and the debug overlay. */
  rawRatio: number;
}

export const EMPTY_FEATURES: FrameFeatures = Object.freeze({
  centroidX: 0.5,
  height: 0.5,
  density: 0,
  intensity: 0,
  peak: 0,
  balance: 0.5,
  upperShare: 0.5,
  spread: 0,
  change: 0,
  rawRatio: 0,
});

export const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** Build a 0/1 mask (1 = analyzed) for the given analysis size. */
export function buildMask(
  width: number,
  height: number,
  excluded: readonly NormRect[] = EXCLUDED_REGIONS,
): Uint8Array {
  const mask = new Uint8Array(width * height).fill(1);
  for (const [x0, y0, x1, y1] of excluded) {
    const px0 = Math.floor(x0 * width);
    const py0 = Math.floor(y0 * height);
    const px1 = Math.ceil(x1 * width);
    const py1 = Math.ceil(y1 * height);
    for (let y = Math.max(0, py0); y < Math.min(height, py1); y++) {
      for (let x = Math.max(0, px0); x < Math.min(width, px1); x++) mask[y * width + x] = 0;
    }
  }
  return mask;
}

/** Weight of one pixel as lightning-colored, 0 (not lightning) to 1 (fully intense). */
export function pixelWeight(r: number, g: number, b: number): number {
  const rg = Math.min(r, g);
  if (rg < THRESHOLDS.minRedGreen) return 0;
  if (Math.abs(r - g) > THRESHOLDS.maxRedGreenGap) return 0;
  const yellowness = rg - b;
  if (yellowness < THRESHOLDS.minYellowness) return 0;
  return clamp01(
    (yellowness - THRESHOLDS.minYellowness * 0.5) /
      (THRESHOLDS.fullYellowness - THRESHOLDS.minYellowness * 0.5),
  );
}

export interface AnalysisResult {
  features: FrameFeatures;
  /** Per-pixel weights (0–1) for the analyzed frame; pass back as `previous` next time. */
  weights: Float32Array;
}

/**
 * Extract features from one RGBA frame.
 * @param rgba     RGBA bytes, length width*height*4
 * @param previous weights from the previous analyzed frame (for temporal change), or null
 */
export function analyzeFrame(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  mask: Uint8Array,
  previous: Float32Array | null,
): AnalysisResult {
  const n = width * height;
  const weights = new Float32Array(n);
  if (rgba.length < n * 4 || mask.length < n) {
    return { features: { ...EMPTY_FEATURES }, weights };
  }

  let masked = 0;
  let active = 0;
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let rightW = 0;
  let upperW = 0;
  let peak = 0;
  let diff = 0;

  for (let y = 0; y < height; y++) {
    const ny = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      masked++;
      const o = i * 4;
      const w = pixelWeight(rgba[o], rgba[o + 1], rgba[o + 2]);
      weights[i] = w;
      if (previous) diff += Math.abs(w - (previous[i] ?? 0));
      if (w <= 0) continue;
      const nx = (x + 0.5) / width;
      active++;
      sumW += w;
      sumX += w * nx;
      sumY += w * ny;
      sumXX += w * nx * nx;
      sumYY += w * ny * ny;
      if (nx >= 0.5) rightW += w;
      if (ny < 0.5) upperW += w;
      if (w > peak) peak = w;
    }
  }

  const rawRatio = masked > 0 ? active / masked : 0;
  const change = previous && masked > 0 ? clamp01(diff / masked / CHANGE_REFERENCE) : 0;

  if (sumW <= 0) {
    return { features: { ...EMPTY_FEATURES, change, rawRatio }, weights };
  }

  const cx = sumX / sumW;
  const cy = sumY / sumW;
  const varX = Math.max(0, sumXX / sumW - cx * cx);
  const varY = Math.max(0, sumYY / sumW - cy * cy);
  // Std distance of a uniform fill of the unit square is ~0.408; normalize so that ≈ 1.
  const spread = clamp01(Math.sqrt(varX + varY) / 0.408);

  return {
    features: {
      centroidX: clamp01(cx),
      height: clamp01(1 - cy),
      density: clamp01(rawRatio / DENSITY_REFERENCE),
      intensity: clamp01(sumW / active),
      peak: clamp01(peak),
      balance: clamp01(rightW / sumW),
      upperShare: clamp01(upperW / sumW),
      spread,
      change,
      rawRatio,
    },
    weights,
  };
}
