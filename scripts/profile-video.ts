/**
 * Offline validation profile.
 *
 * Decodes the optimized NASA video with FFmpeg at a fixed rate and analysis
 * resolution, runs the exact same `analyzeFrame` + smoothing code the browser
 * uses, and writes:
 *   - src/content/profile.json  (compact per-second activity timeline used by the app)
 *   - docs/validation/profile-full.csv  (every analyzed sample, for reproducibility)
 *   - docs/validation/determinism.txt   (two independent passes compared)
 *
 * Usage: npx tsx scripts/profile-video.ts [path-to-video] [fps]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANALYSIS_HEIGHT,
  ANALYSIS_WIDTH,
  analyzeFrame,
  buildMask,
  type FrameFeatures,
} from '../src/analysis/frameFeatures';
import { createSmoother } from '../src/analysis/smoothing';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const video = process.argv[2] ?? resolve(root, 'public/media/iss-lightning-web.mp4');
const fps = Number(process.argv[3] ?? 10);

interface Sample {
  t: number;
  raw: FrameFeatures;
  smooth: FrameFeatures;
}

function runPass(): Promise<Sample[]> {
  return new Promise((ok, fail) => {
    const ff = spawn('ffmpeg', [
      '-v', 'error', '-i', video,
      '-vf', `fps=${fps},scale=${ANALYSIS_WIDTH}:${ANALYSIS_HEIGHT}:flags=area`,
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-',
    ]);
    const frameBytes = ANALYSIS_WIDTH * ANALYSIS_HEIGHT * 4;
    const mask = buildMask(ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
    const smoother = createSmoother();
    let buf = Buffer.alloc(0);
    let prev: Float32Array | null = null;
    let idx = 0;
    const out: Sample[] = [];
    ff.stdout.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= frameBytes) {
        const frame = buf.subarray(0, frameBytes);
        buf = buf.subarray(frameBytes);
        const { features, weights } = analyzeFrame(frame, ANALYSIS_WIDTH, ANALYSIS_HEIGHT, mask, prev);
        prev = weights;
        const t = idx / fps;
        out.push({ t, raw: features, smooth: smoother.update(features, 1 / fps) });
        idx++;
      }
    });
    ff.stderr.on('data', (d) => process.stderr.write(d));
    ff.on('close', (code) => (code === 0 ? ok(out) : fail(new Error(`ffmpeg exited ${code}`))));
  });
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

function percentile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
}

const a = await runPass();
const b = await runPass();

// Determinism: identical code + identical decoded frames must give identical features.
let maxDelta = 0;
for (let i = 0; i < Math.min(a.length, b.length); i++) {
  for (const k of Object.keys(a[i].smooth) as (keyof FrameFeatures)[]) {
    maxDelta = Math.max(maxDelta, Math.abs(a[i].smooth[k] - b[i].smooth[k]));
  }
}

const ratios = a.map((s) => s.raw.rawRatio);
const changes = a.map((s) => s.raw.change);
const stats = {
  samples: a.length,
  fps,
  durationSeconds: r4(a.length / fps),
  rawRatio: { p50: r4(percentile(ratios, 50)), p90: r4(percentile(ratios, 90)), p99: r4(percentile(ratios, 99)), max: r4(Math.max(...ratios)) },
  change: { p50: r4(percentile(changes, 50)), p90: r4(percentile(changes, 90)), p99: r4(percentile(changes, 99)) },
  finiteAndBounded: a.every((s) =>
    Object.entries(s.smooth).every(([k, v]) => Number.isFinite(v) && (k === 'rawRatio' || (v >= 0 && v <= 1))),
  ),
};

// Per-second timeline (mean of smoothed features) for the in-app activity chart.
const perSecond: { t: number; d: number; x: number; h: number; s: number; c: number }[] = [];
for (let sec = 0; sec * fps < a.length; sec++) {
  const slice = a.slice(sec * fps, (sec + 1) * fps);
  const mean = (f: (s: Sample) => number) => slice.reduce((acc, s) => acc + f(s), 0) / slice.length;
  perSecond.push({
    t: sec,
    d: r4(mean((s) => s.smooth.density)),
    x: r4(mean((s) => s.smooth.centroidX)),
    h: r4(mean((s) => s.smooth.height)),
    s: r4(mean((s) => s.smooth.spread)),
    c: r4(mean((s) => s.smooth.change)),
  });
}

mkdirSync(resolve(root, 'src/content'), { recursive: true });
mkdirSync(resolve(root, 'docs/validation'), { recursive: true });
writeFileSync(
  resolve(root, 'src/content/profile.json'),
  JSON.stringify({ generatedBy: 'scripts/profile-video.ts', stats, perSecond }) + '\n',
);
const header = 't,rawRatio,density,intensity,centroidX,height,balance,upperShare,spread,change,s_density,s_centroidX,s_height,s_spread,s_change';
const rows = a.map((s) =>
  [s.t, s.raw.rawRatio, s.raw.density, s.raw.intensity, s.raw.centroidX, s.raw.height, s.raw.balance, s.raw.upperShare, s.raw.spread, s.raw.change, s.smooth.density, s.smooth.centroidX, s.smooth.height, s.smooth.spread, s.smooth.change]
    .map((v) => r4(v))
    .join(','),
);
writeFileSync(resolve(root, 'docs/validation/profile-full.csv'), [header, ...rows].join('\n') + '\n');
writeFileSync(
  resolve(root, 'docs/validation/determinism.txt'),
  `Two independent decode+analysis passes of ${video.split('/').pop()} at ${fps} samples/s\n` +
    `Samples: pass A ${a.length}, pass B ${b.length}\n` +
    `Max absolute difference across all smoothed features: ${maxDelta}\n` +
    `Result: ${maxDelta === 0 && a.length === b.length ? 'IDENTICAL' : 'DIFFERENT'}\n`,
);
console.log(JSON.stringify({ stats, maxDelta }, null, 2));
