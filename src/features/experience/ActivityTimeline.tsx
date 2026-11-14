import { useMemo } from 'react';
import profile from '../../content/profile.json';
import { CHAPTERS, TOUR } from '../../content/chapters';
import { formatTime } from '../../accessibility/describe';

interface Point {
  t: number;
  d: number;
}

const W = 1000;
const H = 64;

/**
 * Activity profile of the whole video (precomputed offline with the same
 * analysis code) drawn behind the seek bar. Clicking a spot seeks there; the
 * keyboard-accessible equivalent is the seek slider directly below.
 */
export function ActivityTimeline({
  time,
  duration,
  onSeek,
}: {
  time: number;
  duration: number;
  onSeek: (t: number) => void;
}) {
  const points = profile.perSecond as Point[];
  const path = useMemo(() => {
    const x = (t: number) => (t / duration) * W;
    const y = (d: number) => H - 4 - d * (H - 10);
    let p = `M0 ${H}`;
    for (const pt of points) p += ` L${x(pt.t).toFixed(1)} ${y(pt.d).toFixed(1)}`;
    return `${p} L${W} ${H} Z`;
  }, [points, duration]);

  const peak = points.reduce((a, b) => (b.d > a.d ? b : a), points[0]);

  return (
    <figure className="timeline">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        <path d={path} className="timeline-area" />
        {CHAPTERS.slice(1).map((c) => (
          <line key={c.start} x1={(c.start / duration) * W} x2={(c.start / duration) * W} y1={0} y2={H} className="timeline-chapter" />
        ))}
        {TOUR.map((s) => (
          <circle key={s.time} cx={(s.time / duration) * W} cy={6} r={4} className="timeline-stop" />
        ))}
        <line x1={(time / duration) * W} x2={(time / duration) * W} y1={0} y2={H} className="timeline-head" />
      </svg>
      <figcaption className="visually-hidden">
        Activity across the whole video: near zero for the first 21 seconds, low through the introduction, rising sharply when
        the ten-day roving window begins at {formatTime(CHAPTERS[1].start)}, varying with the seasons afterward, and highest near{' '}
        {formatTime(peak.t)}.
      </figcaption>
      <div className="timeline-labels" aria-hidden="true">
        <span>Intro · Mar 1 2017</span>
        <span>Ten-day window · 2017 → 2023</span>
      </div>
    </figure>
  );
}
