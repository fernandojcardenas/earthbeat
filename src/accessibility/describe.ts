import type { FrameFeatures } from '../analysis/frameFeatures';
import { chapterAt } from '../content/chapters';

/** Minimum interval between live-region activity announcements (ms). */
export const SUMMARY_INTERVAL_MS = 4000;

export function levelWord(density: number): string {
  if (density < 0.03) return 'no lightning-colored activity';
  if (density < 0.2) return 'sparse activity';
  if (density < 0.5) return 'moderate activity';
  if (density < 0.8) return 'dense activity';
  return 'very dense activity';
}

export function horizontalWord(x: number): string {
  if (x < 0.4) return 'left';
  if (x > 0.6) return 'right';
  return 'center';
}

export function verticalWord(h: number): string {
  if (h < 0.4) return 'lower';
  if (h > 0.6) return 'upper';
  return 'middle';
}

export function spreadWord(s: number): string {
  if (s < 0.3) return 'concentrated';
  if (s > 0.55) return 'widely spread';
  return 'moderately spread';
}

export function trendWord(previousDensity: number | null, density: number): string {
  if (previousDensity === null) return '';
  const d = density - previousDensity;
  if (d > 0.08) return 'increasing';
  if (d < -0.08) return 'decreasing';
  return 'steady';
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function spokenTime(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const parts: string[] = [];
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  parts.push(`${r} second${r === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/**
 * Coarse, human-readable summary of the current frame analysis. Locations are
 * positions in the video frame (the globe rotates), not geographic coordinates.
 */
export function describeActivity(
  f: FrameFeatures,
  mediaTime: number,
  previousDensity: number | null,
): string {
  const chapter = chapterAt(mediaTime);
  const prefix = chapter ? `${chapter.short}. ` : '';
  if (f.density < 0.03) {
    return `${prefix}No lightning-colored activity detected; the sound bed is near silent.`;
  }
  const trend = trendWord(previousDensity, f.density);
  const h = horizontalWord(f.centroidX);
  const v = verticalWord(f.height);
  const where =
    h === 'center' && v === 'middle'
      ? 'near the center of the frame'
      : h === 'center'
        ? `in the ${v} part of the frame`
        : v === 'middle'
          ? `on the ${h} side of the frame`
          : `in the ${v} ${h} of the frame`;
  return `${prefix}${capitalize(levelWord(f.density))}${trend ? `, ${trend}` : ''}, ${where}, ${spreadWord(f.spread)}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
