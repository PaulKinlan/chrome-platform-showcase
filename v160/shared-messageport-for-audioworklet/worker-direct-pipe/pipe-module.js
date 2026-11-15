// AudioWorkletGlobalScope module for the worker-direct-pipe concept.
let pipe = null;
let latest = 0;
let received = 0;
function attach(p) {
  if (pipe) pipe.close();
  pipe = p;
  pipe.onmessage = (e) => {
    latest = e.data.value;
    received++;
  };
}
function handle(reply, data) {
  if (!data) return;
  if (data.type === "pipe") {
    attach(data.port);
    reply({ type: "attached" });
  } else if (data.type === "stats") reply({ type: "stats", received, latest });
}
// Modern route: the scope-level port.
if (globalThis.port) {
  globalThis.port.onmessage = (e) => handle((m) => globalThis.port.postMessage(m), e.data);
}

registerProcessor(
  "tremolo",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      // Fallback route: the same handler reached through this node's port.
      this.port.onmessage = (e) => handle((m) => this.port.postMessage(m), e.data);
    }
    process(inputs, outputs) {
      const input = inputs[0];
      const output = outputs[0];
      const g = 0.55 + 0.45 * latest;
      for (let c = 0; c < output.length; c++) {
        const inp = input[c] || input[0];
        const o = output[c];
        if (!inp) {
          o.fill(0);
          continue;
        }
        for (let i = 0; i < o.length; i++) o[i] = inp[i] * g;
      }
      return true;
    }
  },
);
