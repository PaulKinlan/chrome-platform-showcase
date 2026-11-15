// AudioWorkletGlobalScope module for the shared-config-synth concept.
// One wavetable lives in the global scope and is shared by every voice.
let table = null;
let version = 0;
function setTable(data) {
  table = new Float32Array(data.table);
  version = data.version;
}
if (globalThis.port) {
  globalThis.port.onmessage = (e) => {
    if (e.data && e.data.type === "table") {
      setTable(e.data);
      globalThis.port.postMessage({ type: "ack", version });
    }
  };
}

registerProcessor(
  "wt-voice",
  class extends AudioWorkletProcessor {
    constructor(options) {
      super();
      this.freq = options.processorOptions.freq;
      this.phase = 0;
      this.seen = -1;
      // Fallback delivery (no shared port): the same global is written via this
      // node's own port. With the shared port this handler is never used.
      this.port.onmessage = (e) => {
        if (e.data && e.data.type === "table") setTable(e.data);
      };
    }
    process(_inputs, outputs) {
      const out = outputs[0][0];
      if (!table) return true;
      if (this.seen !== version) {
        this.seen = version;
        this.port.postMessage({ type: "playing", version });
      }
      const n = table.length;
      const inc = this.freq / sampleRate;
      for (let i = 0; i < out.length; i++) {
        out[i] = table[(this.phase * n) | 0];
        this.phase += inc;
        if (this.phase >= 1) this.phase -= 1;
      }
      for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
      return true;
    }
  },
);
