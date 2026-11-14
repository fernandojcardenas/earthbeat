/** Minimal Web Audio stand-in for jsdom tests (jsdom has no AudioContext). */
class FakeParam {
  value = 0;
  setValueAtTime(v: number) { this.value = v; return this; }
  linearRampToValueAtTime(v: number) { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
  setTargetAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
class FakeNode {
  connections = 0;
  connect() { this.connections++; return this; }
  disconnect() { this.connections = 0; }
}
class FakeSource extends FakeNode {
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  frequency = new FakeParam();
  type = 'sine';
  buffer: unknown = null;
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
export class FakeAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  sources: FakeSource[] = [];
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }); }
  createStereoPanner() { return Object.assign(new FakeNode(), { pan: new FakeParam() }); }
  createBiquadFilter() { return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam(), Q: new FakeParam() }); }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), { threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam(), attack: new FakeParam(), release: new FakeParam() });
  }
  createOscillator() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createBuffer(_c: number, len: number) { const d = new Float32Array(len); return { getChannelData: () => d }; }
}
