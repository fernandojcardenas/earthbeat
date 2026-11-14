import profile from './profile.json';

/**
 * Season-wheel readings at specific video times, made by inspecting frames of
 * the NASA source video. "Northern summer" = wheel marker between about June
 * and August; "northern winter" = about November to March.
 */
export interface SeasonAnchor {
  time: number;
  reading: string;
  group: 'northern summer' | 'northern winter';
}

export const SEASON_ANCHORS: readonly SeasonAnchor[] = [
  { time: 95, reading: '2017, near June', group: 'northern summer' },
  { time: 100, reading: '2017, near August', group: 'northern summer' },
  { time: 125, reading: '2018, near July', group: 'northern summer' },
  { time: 145, reading: '2019, near August', group: 'northern summer' },
  { time: 160, reading: '2020, near July', group: 'northern summer' },
  { time: 190, reading: '2022, near July', group: 'northern summer' },
  { time: 210, reading: '2023, near June', group: 'northern summer' },
  { time: 80, reading: '2017, March', group: 'northern winter' },
  { time: 110, reading: '2017, near December', group: 'northern winter' },
  { time: 150, reading: '2019, near December', group: 'northern winter' },
  { time: 170, reading: '2021, near March', group: 'northern winter' },
  { time: 180, reading: '2021, near November', group: 'northern winter' },
  { time: 200, reading: '2023, near February', group: 'northern winter' },
];

interface PerSecond {
  t: number;
  d: number;
  h: number;
}

/** Mean smoothed height (0 bottom – 1 top) over ±2 s around a time. */
export function meanHeightAround(time: number, data: readonly PerSecond[] = profile.perSecond): number {
  const w = data.filter((p) => p.t >= time - 2 && p.t <= time + 2);
  return w.length ? w.reduce((a, p) => a + p.h, 0) / w.length : NaN;
}

export function seasonSummary() {
  const rows = SEASON_ANCHORS.map((a) => ({ ...a, height: meanHeightAround(a.time) }));
  const by = (g: SeasonAnchor['group']) => rows.filter((r) => r.group === g).map((r) => r.height);
  const summer = by('northern summer');
  const winter = by('northern winter');
  return {
    rows,
    summerMin: Math.min(...summer),
    summerMean: summer.reduce((a, b) => a + b, 0) / summer.length,
    winterMax: Math.max(...winter),
    winterMean: winter.reduce((a, b) => a + b, 0) / winter.length,
  };
}
