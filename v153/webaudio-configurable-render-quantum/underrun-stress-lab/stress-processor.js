// Stress processor for the Underrun Stress Lab demo.
// Synthesises a quiet 110 Hz sine and performs an adjustable amount of
// synthetic DSP work per sample.
//
// Measurement design (honesty matters):
// - An AudioWorkletGlobalScope has no performance.now(), only Date.now()
//   (millisecond resolution).
// - Audio is pulled in BURSTS: the output device requests a hardware buffer's
//   worth of quanta back-to-back, then waits. Per-callback arrival gaps are
//   therefore bursty EVERYWHERE and are NOT glitches. So instead of flagging
//   individual gaps, this processor tracks the render-rate deficit:
//     deficit = wall-clock elapsed - audio time rendered
//   If the graph keeps real time the deficit stays bounded near one hardware
//   buffer; if process() is too slow the deficit grows and sound audibly
//   stalls. A "stall episode" is counted when the deficit crosses 50 ms
//   (with hysteresis at 25 ms) - an honest underrun PROXY, not the OS
//   driver's XRun counter.
class StressProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.load = 0; // synthetic DSP iterations per sample
    this.gainTarget = 0.04;
    this.phase = 0;
    this.calls = 0;
    this.startWall = 0;
    this.maxDeficitMs = 0;
    this.stalls = 0;
    this.stallActive = false;
    this.lastReport = 0;
    this.sink = 0; // keeps the synthetic work from being optimised away
    this.port.onmessage = (e) => {
      if (typeof e.data.load === "number") this.load = e.data.load;
      if (e.data.reset) {
        this.calls = 0;
        this.startWall = 0;
        this.maxDeficitMs = 0;
        this.stalls = 0;
        this.stallActive = false;
      }
    };
  }

  process(inputs, outputs) {
    const out = outputs[0];
    if (!out || !out[0]) return true;
    const block = out[0].length;
    const now = Date.now();
    if (this.startWall === 0) this.startWall = now;

    const step = (2 * Math.PI * 110) / sampleRate;
    let acc = 0;
    for (let i = 0; i < block; i++) {
      const s = Math.sin(this.phase) * this.gainTarget;
      this.phase += step;
      if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
      for (let k = 0; k < this.load; k++) acc += Math.sin(k * 0.001 + s);
      for (let ch = 0; ch < out.length; ch++) out[ch][i] = s;
    }
    this.sink = acc;
    this.calls += 1;

    const renderedMs = (this.calls * block * 1000) / sampleRate;
    const elapsedMs = now - this.startWall;
    const deficitMs = elapsedMs - renderedMs;
    if (deficitMs > this.maxDeficitMs) this.maxDeficitMs = deficitMs;
    if (!this.stallActive && deficitMs > 50) {
      this.stallActive = true;
      this.stalls += 1;
    } else if (this.stallActive && deficitMs < 25) {
      this.stallActive = false;
    }

    if (now - this.lastReport >= 250) {
      this.lastReport = now;
      this.port.postMessage({
        calls: this.calls,
        blockLength: block,
        quantumMs: (block / sampleRate) * 1000,
        renderedMs,
        elapsedMs,
        deficitMs,
        maxDeficitMs: this.maxDeficitMs,
        stalls: this.stalls,
        load: this.load,
      });
    }
    return true;
  }
}

registerProcessor("stress-processor", StressProcessor);
