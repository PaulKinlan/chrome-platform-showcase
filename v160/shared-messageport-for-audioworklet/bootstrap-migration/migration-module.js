// AudioWorkletGlobalScope module for the bootstrap-migration concept.
// Scope-wide state that every processor in this AudioWorkletGlobalScope can read.
globalThis.sharedConfig = null;

// Modern path: the scope-level MessagePort (AudioWorkletGlobalScope.port).
if (globalThis.port) {
  globalThis.port.onmessage = (e) => {
    if (e.data && e.data.type === "config") {
      globalThis.sharedConfig = { ...e.data.config, via: "AudioWorkletGlobalScope.port" };
      globalThis.port.postMessage({ type: "stored", via: "AudioWorkletGlobalScope.port" });
    }
  };
}

// Legacy workaround: a "bootstrap" processor that exists only to smuggle
// initialisation data into the global scope through its constructor.
registerProcessor(
  "bootstrap",
  class extends AudioWorkletProcessor {
    constructor(options) {
      super();
      globalThis.sharedConfig = {
        ...options.processorOptions.config,
        via: "bootstrap AudioWorkletProcessor",
      };
      this.port.postMessage({ type: "stored", via: "bootstrap AudioWorkletProcessor" });
    }
    process() {
      return false;
    } // done; let it be collected
  },
);

// A real processor that reads whatever reached the scope.
registerProcessor(
  "reader",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.postMessage({ type: "read", sharedConfig: globalThis.sharedConfig });
    }
    process() {
      return false;
    }
  },
);
