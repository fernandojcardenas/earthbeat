/**
 * Writes side-by-side validation images: the analysis-resolution frame (left)
 * and what the classifier detected (right; yellow = lightning-colored weight,
 * dark red = excluded overlay region, cyan cross = weighted centroid).
 *
 * Usage: npx tsx scripts/mask-snapshots.ts [video] [t1,t2,...]
 * Output: docs/validation/mask-<t>s.png
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANALYSIS_HEIGHT as H, ANALYSIS_WIDTH as W, analyzeFrame, buildMask } from '../src/analysis/frameFeatures';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const video = process.argv[2] ?? resolve(root, 'public/media/iss-lightning-web.mp4');
const times = (process.argv[3] ?? '10,45,100,160,205').split(',').map(Number);
const outDir = resolve(root, 'docs/validation');
mkdirSync(outDir, { recursive: true });
const mask = buildMask(W, H);

for (const t of times) {
  const rgba = execFileSync('ffmpeg', [
    '-v', 'error', '-ss', String(t), '-i', video, '-frames:v', '1',
    '-vf', `scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-',
  ]);
  const { features, weights } = analyzeFrame(rgba, W, H, mask, null);
  const out = Buffer.alloc(W * 2 * H * 3);
  const cx = Math.round(features.centroidX * W);
  const cy = Math.round((1 - features.height) * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const l = (y * W * 2 + x) * 3;
      out[l] = rgba[i * 4]; out[l + 1] = rgba[i * 4 + 1]; out[l + 2] = rgba[i * 4 + 2];
      const r = (y * W * 2 + W + x) * 3;
      const w = weights[i];
      if (!mask[i]) { out[r] = 70; out[r + 1] = 0; out[r + 2] = 0; }
      else { out[r] = Math.round(255 * w); out[r + 1] = Math.round(220 * w); out[r + 2] = 0; }
      if (features.density > 0 && ((x === cx && Math.abs(y - cy) <= 3) || (y === cy && Math.abs(x - cx) <= 3))) {
        out[r] = 0; out[r + 1] = 230; out[r + 2] = 255;
      }
    }
  }
  const ppm = resolve(outDir, `tmp-${t}.ppm`);
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6 ${W * 2} ${H} 255\n`), out]));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', ppm, '-vf', 'scale=iw*4:ih*4:flags=neighbor', resolve(outDir, `mask-${t}s.png`)]);
  rmSync(ppm);
  console.log(t, JSON.stringify(features));
}
