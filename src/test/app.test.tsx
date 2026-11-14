import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { describeActivity, formatTime, spokenTime } from '../accessibility/describe';
import { EMPTY_FEATURES } from '../analysis/frameFeatures';
import { initialPlayerState, playerReducer, statusLabel } from '../features/experience/playerState';
import { seasonSummary } from '../content/seasons';

beforeEach(() => {
  window.localStorage.clear();
  // jsdom does not implement media playback; simulate the paused flag and events.
  const paused = new WeakMap<HTMLMediaElement, boolean>();
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function (this: HTMLMediaElement) {
    return paused.get(this) ?? true;
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    paused.set(this, false);
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    paused.set(this, true);
    this.dispatchEvent(new Event('pause'));
  });
});

describe('page structure and controls (test 8)', () => {
  it('has one h1, landmarks, a skip link and named controls', () => {
    render(<App />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to the listening room' })).toHaveAttribute('href', '#experience');

    const controls = screen.getByRole('group', { name: 'Playback and sound controls' });
    for (const name of ['Play', 'Restart', /Stop sound/, 'Mute']) {
      expect(within(controls).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(controls).getByRole('slider', { name: 'Seek position' })).toHaveAttribute('aria-valuetext');
    expect(within(controls).getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
    expect(within(controls).getByRole('radio', { name: '1×' })).toBeChecked();
    expect(within(controls).getByRole('checkbox', { name: /Gentle sound/ })).not.toBeChecked();
  });

  it('every button, link and form control has an accessible name', () => {
    render(<App />);
    const els = [...screen.getAllByRole('button'), ...screen.getAllByRole('link'), ...screen.getAllByRole('checkbox'), ...screen.getAllByRole('slider')];
    for (const el of els) {
      const name = el.getAttribute('aria-label') ?? el.textContent ?? '';
      const labelled = el.id ? document.querySelector(`label[for="${el.id}"]`) : el.closest('label');
      expect(name.trim().length > 0 || !!labelled, el.outerHTML).toBe(true);
    }
  });

  it('the video is muted, never autoplays and is described', () => {
    render(<App />);
    const video = document.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(false);
    const desc = document.getElementById(video.getAttribute('aria-describedby')!);
    expect(desc?.textContent).toMatch(/Lightning Imaging Sensor/);
  });

  it('play toggles to pause, mute exposes pressed state, and Stop sound announces', async () => {
    const user = userEvent.setup();
    render(<App />);
    const controls = screen.getByRole('group', { name: 'Playback and sound controls' });
    await user.click(within(controls).getByRole('button', { name: 'Play' }));
    expect(await within(controls).findByRole('button', { name: 'Pause' })).toBeInTheDocument();

    const mute = within(controls).getByRole('button', { name: 'Mute' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    await user.click(mute);
    expect(within(controls).getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(controls).getByRole('button', { name: /Stop sound/ }));
    expect(await screen.findByText(/Sound stopped and playback paused/)).toBeInTheDocument();
  });

  it('Escape stops sound while playing', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Play' }));
    await screen.findByRole('button', { name: 'Pause' });
    await user.keyboard('{Escape}');
    expect(await screen.findByText(/Sound stopped/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });
});

describe('preferences (test 10)', () => {
  it('reduce-motion and high-contrast toggles change the document state', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('checkbox', { name: 'Reduce motion' }));
    expect(document.documentElement.dataset.motion).toBe('reduce');
    await user.click(screen.getByRole('checkbox', { name: 'High contrast' }));
    expect(document.documentElement.dataset.contrast).toBe('high');
  });

  it('turning off live descriptions sets the live region to off', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = document.querySelector('.now-summary')!;
    expect(region).toHaveAttribute('aria-live', 'polite');
    await user.click(screen.getByRole('checkbox', { name: /Announce descriptions/ }));
    expect(region).toHaveAttribute('aria-live', 'off');
  });
});

describe('descriptions and state', () => {
  it('formats times for display and speech', () => {
    expect(formatTime(95.4)).toBe('1:35');
    expect(spokenTime(61)).toBe('1 minute 1 second');
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('describes empty and active frames in words', () => {
    expect(describeActivity(EMPTY_FEATURES, 5, null)).toMatch(/No lightning-colored activity/);
    const text = describeActivity({ ...EMPTY_FEATURES, density: 0.6, centroidX: 0.2, height: 0.8, spread: 0.2 }, 100, 0.3);
    expect(text).toMatch(/Ten-day roving window/);
    expect(text).toMatch(/Dense activity, increasing, in the upper left of the frame, concentrated/);
  });

  it('player reducer follows the documented transitions', () => {
    let s = playerReducer(initialPlayerState, { type: 'MEDIA_READY' });
    expect(s.status).toBe('ready');
    s = playerReducer(s, { type: 'PLAYING' });
    s = playerReducer(s, { type: 'SEEKING' });
    expect(s.status).toBe('seeking');
    s = playerReducer(s, { type: 'SEEKED' });
    expect(s.status).toBe('playing');
    s = playerReducer(s, { type: 'ENDED' });
    expect(statusLabel(s)).toBe('Finished');
    s = playerReducer(s, { type: 'ERROR', message: 'x' });
    expect(statusLabel(s)).toBe('Video unavailable');
  });

  it('season finding in the app is computed from the profile data', () => {
    const s = seasonSummary();
    expect(s.summerMin).toBeGreaterThan(s.winterMax);
  });
});
