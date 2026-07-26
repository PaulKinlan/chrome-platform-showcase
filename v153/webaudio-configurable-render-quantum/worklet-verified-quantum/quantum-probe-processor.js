// Probe processor for the Worklet-Verified Quantum demo.
// Reports, from inside the AudioWorkletGlobalScope, three independent
// observations of the render quantum:
//   1. the AudioWorkletGlobalScope.renderQuantumSize global (Chrome 153+),
//   2. the length of the output block process() actually receives,
//   3. the steady-state currentFrame delta between consecutive process()
//      calls. The FIRST delta is deliberately discarded: a node can join the
//      graph mid-burst (observed in headless Chrome: frame 0, then a jump),
//      so the probe waits for six callbacks and reports the delta between the
//      last two, which is exactly one render quantum.
class QuantumProbeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frames = [];
  }

  process(inputs, outputs) {
    this.frames.push(currentFrame);
    if (this.frames.length < 6) return true;
    const n = this.frames.length;
    const block = outputs[0] && outputs[0][0] ? outputs[0][0].length : null;
    this.port.postMessage({
      scopeRenderQuantumSize: typeof renderQuantumSize === "number" ? renderQuantumSize : null,
      blockLength: block,
      currentFrameDelta: this.frames[n - 1] - this.frames[n - 2],
      firstFrameDelta: this.frames[1] - this.frames[0],
      workletSampleRate: sampleRate,
    });
    return false; // done — let the node be garbage collected
  }
}

registerProcessor("quantum-probe", QuantumProbeProcessor);
