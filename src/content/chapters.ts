/**
 * Chapters of the NASA SVS visualization, identified by direct inspection of
 * frames from the source video (date stamp and "10 Day Roving Window" season
 * wheel). Times refer to the full 3:36.7 video. Season labels are approximate
 * readings of the wheel marker, not exact dates.
 */
export interface Chapter {
  start: number;
  end: number;
  title: string;
  short: string;
  description: string;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    start: 0,
    end: 70,
    title: 'One day of orbits — March 1, 2017',
    short: 'Introduction, March 1 2017',
    description:
      'The on-screen clock advances through March 1, 2017. The ISS orbit and the sensor’s path are drawn over a cloud-covered globe, and lightning points begin to accumulate where the station has passed. The first roughly 21 seconds contain no lightning-colored points, so EarthBeat stays almost silent.',
  },
  {
    start: 70,
    end: 216.7,
    title: 'Ten-day roving window — 2017 to 2023',
    short: 'Ten-day roving window, 2017 to 2023',
    description:
      'The view pulls back to a full globe. Each frame shows lightning detected during a ten-day window, and a season wheel in the corner shows the year and time of year as the window moves forward from 2017 to mid-2023. The globe rotates, so different continents face the viewer at different times.',
  },
];

/** Guided-tour moments, each verified against the season wheel and EarthBeat’s analysis profile. */
export interface TourStop {
  time: number;
  label: string;
  listenFor: string;
}

export const TOUR: readonly TourStop[] = [
  {
    time: 30,
    label: 'First lightning, March 1 2017',
    listenFor:
      'Out of near-silence, sparse notes begin as the first lightning points appear along the station’s path. The soft bed is barely audible because very little of the frame is active.',
  },
  {
    time: 95,
    label: 'Northern summer, 2017 (wheel near June)',
    listenFor:
      'A dense, quick pulse with higher notes: activity is widespread and sits higher in the frame, across the Americas facing the viewer.',
  },
  {
    time: 110,
    label: 'Northern winter, 2017 (wheel near December)',
    listenFor:
      'The pulse slows and the notes drop lower: less of the frame is active, and the remaining activity sits lower and to the right in the frame, so it also moves toward the right ear.',
  },
];

export function chapterAt(t: number): Chapter | undefined {
  return CHAPTERS.find((c) => t >= c.start && t < c.end) ?? (t >= 216 ? CHAPTERS[1] : undefined);
}
