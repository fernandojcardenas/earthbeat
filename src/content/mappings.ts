import type { FrameFeatures } from '../analysis/frameFeatures';
import { LIMITS, PENTATONIC_HZ } from '../audio/mapping';

export interface MappingRow {
  key: 'centroidX' | 'height' | 'density' | 'intensity' | 'spread' | 'change';
  icon: 'pan' | 'pitch' | 'pulse' | 'gain' | 'tone' | 'tick';
  visual: string;
  sound: string;
  infer: string;
  notMeaning: string;
  readout: (f: FrameFeatures) => string;
}

export const MAPPINGS: readonly MappingRow[] = [
  {
    key: 'centroidX',
    icon: 'pan',
    visual: 'Left–right position of the lightning-colored points',
    sound: 'Stereo position (left ear to right ear)',
    infer: 'Which side of the picture the activity is on.',
    notMeaning: 'Not a fixed longitude — the globe rotates during the video.',
    readout: (f) => (f.centroidX < 0.4 ? 'left' : f.centroidX > 0.6 ? 'right' : 'center'),
  },
  {
    key: 'height',
    icon: 'pitch',
    visual: 'Height of the activity in the picture',
    sound: `Pitch, on an 11-note pentatonic scale (${Math.round(PENTATONIC_HZ[0])}–${Math.round(PENTATONIC_HZ[PENTATONIC_HZ.length - 1])} Hz)`,
    infer: 'Whether activity sits toward the top or bottom of the globe as shown.',
    notMeaning: 'Not altitude, and the notes are not physical units.',
    readout: (f) => (f.height < 0.4 ? 'low' : f.height > 0.6 ? 'high' : 'middle'),
  },
  {
    key: 'density',
    icon: 'pulse',
    visual: 'Share of the picture covered by lightning-colored points',
    sound: `Pulse speed (up to ${LIMITS.maxNotesPerSecond} notes per second) and the level of the soft background bed`,
    infer: 'More or less detected lightning area in the current ten-day window.',
    notMeaning: 'Not an exact count of strikes: points overlap and the video is compressed.',
    readout: (f) => `${Math.round(f.density * 100)}%`,
  },
  {
    key: 'intensity',
    icon: 'gain',
    visual: 'Average color strength of the detected points',
    sound: 'Loudness of each note, within a safe ceiling',
    infer: 'Strong, solid points versus faint or partly hidden ones.',
    notMeaning: 'Not the optical energy of a flash.',
    readout: (f) => `${Math.round(f.intensity * 100)}%`,
  },
  {
    key: 'spread',
    icon: 'tone',
    visual: 'How spread out or clustered the points are',
    sound: 'Tone brightness — wider spread sounds brighter',
    infer: 'Scattered activity versus one concentrated region.',
    notMeaning: 'Not storm size.',
    readout: (f) => (f.spread < 0.3 ? 'clustered' : f.spread > 0.55 ? 'scattered' : 'moderate'),
  },
  {
    key: 'change',
    icon: 'tick',
    visual: 'How much the picture changes between analyzed frames',
    sound: 'A short, soft tick (at most about two per second)',
    infer: 'Sudden appearance or disappearance of activity, or a camera move.',
    notMeaning: 'Not an individual lightning strike.',
    readout: (f) => `${Math.round(f.change * 100)}%`,
  },
];

