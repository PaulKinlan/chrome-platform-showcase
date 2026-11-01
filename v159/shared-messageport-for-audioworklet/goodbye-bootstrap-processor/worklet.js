// Module demonstrating BOTH messaging routes to the rendering thread.
//
// Old route: a bootstrap processor that exists only to own a per-node port.
registerProcessor(
  "bootstrap-echo",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.onmessage = (event) => {
        this.port.postMessage({
          echo: event.data,
          via: "AudioWorkletProcessor.port (bootstrap node)",
          sampleRate: sampleRate,
        });
      };
    }
    process() {
      // Keep the node alive so its port keeps answering.
      return true;
    }
  },
);

// New route: the Chrome 159 shared scope-level port — no processor, no node.
if (typeof port !== "undefined" && port && typeof port.postMessage === "function") {
  port.onmessage = (event) => {
    port.postMessage({
      echo: event.data,
      via: "AudioWorkletGlobalScope.port (shared)",
      sampleRate: sampleRate,
    });
  };
}
