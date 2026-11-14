const STEPS = [
  { title: 'NASA visualization', text: 'Lightning from the ISS, 2017–2023' },
  { title: 'Frame sampling', text: '10 per second of video, 160 × 90' },
  { title: 'Feature extraction', text: 'Yellow points, masked corner' },
  { title: 'Normalized features', text: 'Position, height, coverage, spread, change' },
  { title: 'Sound mapping', text: 'Stereo, pitch, pulse, loudness, tone, ticks' },
  { title: 'Accessible experience', text: 'Sound, live text and indicators together' },
];

/** Original pipeline diagram as an ordered list, styled as connected stages. */
export function PipelineDiagram() {
  return (
    <ol className="pipeline" aria-label="EarthBeat pipeline">
      {STEPS.map((s, i) => (
        <li key={s.title}>
          <span className="step-num" aria-hidden="true">
            {i + 1}
          </span>
          <strong>{s.title}</strong>
          <span>{s.text}</span>
        </li>
      ))}
    </ol>
  );
}
