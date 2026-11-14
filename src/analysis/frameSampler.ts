import { ANALYSIS_HEIGHT, ANALYSIS_WIDTH } from './frameFeatures';

/**
 * Copies the current video frame to a 160×90 RGBA buffer.
 *
 * A single bilinear drawImage from 1280×720 to 160×90 samples only a few
 * source pixels per output pixel and can miss small lightning points. Halving
 * repeatedly (1280→640→320→160) averages every source pixel, approximating the
 * area filter used by the offline validation script.
 */
export class FrameSampler {
  private stages: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];

  constructor(sourceWidth = 1280, sourceHeight = 720) {
    let w = sourceWidth;
    let h = sourceHeight;
    const sizes: [number, number][] = [];
    while (w / 2 >= ANALYSIS_WIDTH && h / 2 >= ANALYSIS_HEIGHT) {
      w = Math.round(w / 2);
      h = Math.round(h / 2);
      sizes.push([w, h]);
    }
    if (!sizes.length || sizes[sizes.length - 1][0] !== ANALYSIS_WIDTH) sizes.push([ANALYSIS_WIDTH, ANALYSIS_HEIGHT]);
    for (const [sw, sh] of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
      if (!ctx) throw new Error('Canvas 2D is not available.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      this.stages.push({ canvas, ctx });
    }
  }

  /** Returns RGBA bytes of the downsampled frame, or null if the frame is not drawable yet. */
  sample(video: HTMLVideoElement): Uint8ClampedArray | null {
    if (video.readyState < 2 || !video.videoWidth) return null;
    let source: CanvasImageSource = video;
    for (const { canvas, ctx } of this.stages) {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      source = canvas;
    }
    const last = this.stages[this.stages.length - 1];
    try {
      return last.ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT).data;
    } catch {
      return null;
    }
  }
}
