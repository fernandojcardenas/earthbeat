import { useEffect, useRef } from 'react';
import { ANALYSIS_HEIGHT as H, ANALYSIS_WIDTH as W, buildMask, type FrameFeatures } from '../../analysis/frameFeatures';

const mask = buildMask(W, H);

/**
 * Development-only analysis view, enabled with the `?debug` query parameter.
 * Shows excluded regions (red), detected weights (yellow), the weighted
 * centroid (cyan) and left/right energy.
 */
export function DebugOverlay({ weights, features }: { weights: Float32Array | null; features: FrameFeatures }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const w = weights?.[i] ?? 0;
      const o = i * 4;
      if (!mask[i]) {
        img.data[o] = 120; img.data[o + 3] = 120;
      } else if (w > 0) {
        img.data[o] = 255; img.data[o + 1] = 220; img.data[o + 3] = Math.round(80 + 175 * w);
      }
    }
    ctx.putImageData(img, 0, 0);
    if (features.density > 0) {
      const cx = features.centroidX * W;
      const cy = (1 - features.height) * H;
      ctx.strokeStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
      ctx.stroke();
    }
  }, [weights, features]);

  return (
    <div className="debug" aria-hidden="true">
      <canvas ref={ref} width={W} height={H} />
      <pre>
        {Object.entries(features)
          .map(([k, v]) => `${k.padEnd(11)} ${v.toFixed(3)}`)
          .join('\n')}
      </pre>
    </div>
  );
}
