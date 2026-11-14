import type { FrameFeatures } from '../../analysis/frameFeatures';
import { MAPPINGS, type MappingRow } from '../../content/mappings';

function Icon({ kind }: { kind: MappingRow['icon'] }) {
  const common = { width: 28, height: 28, viewBox: '0 0 28 28', 'aria-hidden': true, focusable: false } as const;
  switch (kind) {
    case 'pan':
      return (
        <svg {...common}>
          <path d="M4 14h20M8 10l-4 4 4 4M20 10l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'pitch':
      return (
        <svg {...common}>
          <path d="M5 22h4v-4H5zM12 22h4V12h-4zM19 22h4V6h-4z" fill="currentColor" />
        </svg>
      );
    case 'pulse':
      return (
        <svg {...common}>
          <path d="M3 14h4l2-6 3 12 3-9 2 3h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'gain':
      return (
        <svg {...common}>
          <path d="M4 11h5l6-5v16l-6-5H4z" fill="currentColor" />
          <path d="M19 10a5 5 0 0 1 0 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'tone':
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="3" fill="currentColor" />
          <circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
    case 'tick':
      return (
        <svg {...common}>
          <path d="M14 3v6M14 19v6M3 14h6M19 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

const meterValue = (row: MappingRow, f: FrameFeatures) => f[row.key];

export function Legend({ features }: { features: FrameFeatures }) {
  return (
    <section className="legend panel" aria-labelledby="legend-title">
      <h3 id="legend-title">What am I hearing?</h3>
      <p className="hint">
        Every sound comes from a measured property of the current video frame. Live values update while the video plays.
      </p>
      <ul className="legend-list">
        {MAPPINGS.map((row) => (
          <li key={row.key} className="legend-row">
            <span className="legend-icon">
              <Icon kind={row.icon} />
            </span>
            <div className="legend-text">
              <p className="legend-map">
                <strong>{row.visual}</strong> <span aria-hidden="true">→</span>
                <span className="visually-hidden"> is heard as </span> {row.sound}
              </p>
              <p className="legend-detail">
                <span className="tag">Tells you</span> {row.infer} <span className="tag tag-not">Does not mean</span> {row.notMeaning}
              </p>
            </div>
            <div className="legend-live">
              <span className="bar" aria-hidden="true">
                <span style={{ transform: `scaleX(${meterValue(row, features)})` }} />
              </span>
              <span className="readout">
                <span className="visually-hidden">Current value: </span>
                {row.readout(features)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
