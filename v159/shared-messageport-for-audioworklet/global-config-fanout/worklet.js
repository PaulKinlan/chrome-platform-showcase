// Module-global config, broadcast once over the shared port, read by every
// processor instance in this AudioWorkletGlobalScope.
let config = { gain: 1 };

if (typeof port !== "undefined" && port && typeof port.postMessage === "function") {
  port.onmessage = (event) => {
    config = Object.assign({}, config, event.data);
    port.postMessage({ applied: config });
  };
}

registerProcessor(
  "config-gain",
  class extends AudioWorkletProcessor {
    process(inputs, outputs) {
      const input = inputs[0];
      const output = outputs[0];
      for (let ch = 0; ch < output.length; ch++) {
        const inCh = input[ch];
        const outCh = output[ch];
        for (let i = 0; i < outCh.length; i++) {
          outCh[i] = (inCh ? inCh[i] : 0) * config.gain;
        }
      }
      return true;
    }
  },
);
