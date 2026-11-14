import type { FrameFeatures } from '../analysis/frameFeatures';
import {
  BED_ROOT_HZ,
  LIMITS,
  createSequencer,
  mapFeatures,
  type SoundEvent,
  type SoundSettings,
} from './mapping';

export type ContextFactory = () => AudioContext;

const defaultFactory: ContextFactory = () => {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio is not supported in this browser.');
  return new Ctor();
};

/** Master volume ceiling applied after the limiter. Default user volume is 0.6 of this. */
export const MASTER_CEILING = 0.7;

/**
 * Web Audio sonification engine. Graph:
 *
 *   tone voices → panner → toneFilter ┐
 *   bed oscillators → bedGain → bedPan ├→ highpass(70 Hz) → limiter → master → output
 *   accent noise → bandpass → gain ────┘
 *
 * Created lazily on the first user gesture; never produces sound before then.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private toneFilter: BiquadFilterNode | null = null;
  private bus: BiquadFilterNode | null = null;
  private bedGain: GainNode | null = null;
  private bedPan: StereoPannerNode | null = null;
  private bedOscs: OscillatorNode[] = [];
  private noise: AudioBuffer | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private sequencer = createSequencer();
  private volume = 0.6;
  private muted = false;
  private readonly factory: ContextFactory;

  constructor(factory: ContextFactory = defaultFactory) {
    this.factory = factory;
  }

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  get activeVoices(): number {
    return this.voices.size;
  }

  get masterGainValue(): number {
    return this.master?.gain.value ?? 0;
  }

  /** Root-mean-square level of the output over the last ~43 ms (0 when silent or inactive). */
  outputLevel(): number {
    if (!this.analyser) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    return Math.sqrt(sum / buf.length);
  }

  /** Must be called from a user gesture. Resolves false if audio cannot start. */
  async activate(): Promise<boolean> {
    try {
      if (!this.ctx) this.build();
      if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume();
      return this.ctx?.state === 'running';
    } catch {
      return false;
    }
  }

  private build(): void {
    const ctx = this.factory();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.targetMaster();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 6;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 70;
    highpass.connect(limiter);
    this.bus = highpass;
    limiter.connect(master);
    master.connect(ctx.destination);
    this.master = master;
    // Output meter (read only by the ?debug view and browser tests); not connected to the destination.
    if (typeof ctx.createAnalyser === 'function') {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      master.connect(analyser);
      this.analyser = analyser;
    }

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = 1800;
    toneFilter.Q.value = 0.7;
    toneFilter.connect(highpass);
    this.toneFilter = toneFilter;

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    const bedPan = ctx.createStereoPanner();
    bedGain.connect(bedPan);
    bedPan.connect(highpass);
    this.bedGain = bedGain;
    this.bedPan = bedPan;
    // Root and fifth, softly detuned: a calm bed whose level follows overall activity.
    for (const [freq, type] of [
      [BED_ROOT_HZ, 'sine'],
      [BED_ROOT_HZ * 1.5, 'triangle'],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = type === 'sine' ? 0.7 : 0.3;
      osc.connect(g);
      g.connect(bedGain);
      osc.start();
      this.bedOscs.push(osc);
    }

    // Deterministic noise for accents (fixed-seed LCG, not Math.random).
    const len = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 0x2f6b1d3;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }
    this.noise = buf;
  }

  private targetMaster(): number {
    return this.muted ? 0 : this.volume * MASTER_CEILING;
  }

  private rampMaster(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.targetMaster(), now, 0.03);
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
    this.rampMaster();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.rampMaster();
  }

  /**
   * Advance the sonification by one analysis step.
   * @param mediaDt media-time seconds since the previous step (0 when paused)
   */
  update(features: FrameFeatures, mediaDt: number, settings: SoundSettings): SoundEvent[] {
    if (!this.ready || !this.ctx) return [];
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const p = mapFeatures(features, settings);
    this.toneFilter?.frequency.setTargetAtTime(p.filterHz, now, 0.15);
    this.bedGain?.gain.setTargetAtTime(settings.channels.bed ? p.bedGain : 0, now, 0.4);
    this.bedPan?.pan.setTargetAtTime(p.pan * 0.5, now, 0.6);

    const events = this.sequencer.step(features, mediaDt, settings);
    for (const e of events) {
      if (this.voices.size >= LIMITS.maxVoices) break;
      if (e.kind === 'note') this.playNote(e.frequency, e.pan, e.gain, now);
      else this.playAccent(e.gain, e.attack, now);
    }
    return events;
  }

  private track(node: AudioScheduledSourceNode): void {
    this.voices.add(node);
    node.onended = () => {
      this.voices.delete(node);
      node.disconnect();
    };
  }

  private playNote(freq: number, pan: number, gain: number, t: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.toneFilter) return;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0005, t + 0.45);
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-LIMITS.maxPan, Math.min(LIMITS.maxPan, pan));
    osc.connect(env);
    env.connect(panner);
    panner.connect(this.toneFilter);
    this.track(osc);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  private playAccent(gain: number, attack: number, t: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.bus) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 1.2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0005, t + attack + 0.18);
    src.connect(band);
    band.connect(env);
    // Accents bypass the tone low-pass but share the limiter path.
    env.connect(this.bus);
    this.track(src);
    src.start(t);
    src.stop(t + attack + 0.22);
  }

  /** Fade the bed and stop all voices (used on pause and seek). Keeps the context. */
  silence(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.bedGain?.gain.cancelScheduledValues(now);
    this.bedGain?.gain.setTargetAtTime(0, now, 0.05);
    this.stopVoices();
    this.sequencer.reset();
  }

  /** Emergency stop: immediate silence of every channel. */
  stop(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.bedGain?.gain.cancelScheduledValues(now);
    this.bedGain?.gain.setValueAtTime(0, now);
    this.stopVoices();
    this.sequencer.reset();
  }

  private stopVoices(): void {
    for (const v of this.voices) {
      try {
        v.onended = null;
        v.stop();
        v.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.voices.clear();
  }

  async dispose(): Promise<void> {
    this.stop();
    for (const o of this.bedOscs) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.bedOscs = [];
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.toneFilter = null;
    this.bus = null;
    this.bedGain = null;
    this.bedPan = null;
    if (ctx && ctx.state !== 'closed') await ctx.close().catch(() => undefined);
  }
}
