/**
 * Explicit playback state model. The video element is the single authoritative
 * clock; this reducer only tracks what the UI should show and announce.
 */
export type PlaybackStatus =
  | 'loading'
  | 'ready'
  | 'activating'
  | 'playing'
  | 'paused'
  | 'seeking'
  | 'ended'
  | 'error';

export type AudioStatus = 'inactive' | 'running' | 'unavailable';

export interface PlayerState {
  status: PlaybackStatus;
  /** Status before a seek began, restored when it ends. */
  resumeStatus: PlaybackStatus;
  audio: AudioStatus;
  muted: boolean;
  buffering: boolean;
  error: string | null;
}

export type PlayerAction =
  | { type: 'MEDIA_READY' }
  | { type: 'ACTIVATING' }
  | { type: 'AUDIO'; audio: AudioStatus }
  | { type: 'PLAYING' }
  | { type: 'PAUSED' }
  | { type: 'SEEKING' }
  | { type: 'SEEKED' }
  | { type: 'ENDED' }
  | { type: 'BUFFERING'; buffering: boolean }
  | { type: 'MUTE'; muted: boolean }
  | { type: 'ERROR'; message: string }
  | { type: 'RETRY' };

export const initialPlayerState: PlayerState = {
  status: 'loading',
  resumeStatus: 'ready',
  audio: 'inactive',
  muted: false,
  buffering: false,
  error: null,
};

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'MEDIA_READY':
      return state.status === 'loading' ? { ...state, status: 'ready' } : state;
    case 'ACTIVATING':
      return { ...state, status: 'activating' };
    case 'AUDIO':
      return { ...state, audio: action.audio };
    case 'PLAYING':
      return { ...state, status: 'playing', buffering: false };
    case 'PAUSED':
      return state.status === 'ended' || state.status === 'error' ? state : { ...state, status: 'paused' };
    case 'SEEKING':
      return state.status === 'seeking' ? state : { ...state, status: 'seeking', resumeStatus: state.status };
    case 'SEEKED':
      return state.status === 'seeking' ? { ...state, status: state.resumeStatus === 'ended' ? 'paused' : state.resumeStatus } : state;
    case 'ENDED':
      return { ...state, status: 'ended', buffering: false };
    case 'BUFFERING':
      return { ...state, buffering: action.buffering };
    case 'MUTE':
      return { ...state, muted: action.muted };
    case 'ERROR':
      return { ...state, status: 'error', error: action.message };
    case 'RETRY':
      return { ...state, status: 'loading', error: null };
    default:
      return state;
  }
}

export function statusLabel(s: PlayerState): string {
  if (s.buffering && s.status === 'playing') return 'Buffering';
  switch (s.status) {
    case 'loading':
      return 'Loading the NASA visualization';
    case 'ready':
      return 'Ready — press Play to start sound';
    case 'activating':
      return 'Starting sound';
    case 'playing':
      return s.audio === 'running' ? (s.muted ? 'Playing, muted' : 'Playing with sound') : 'Playing without sound';
    case 'paused':
      return 'Paused';
    case 'seeking':
      return 'Seeking';
    case 'ended':
      return 'Finished';
    case 'error':
      return 'Video unavailable';
  }
}
