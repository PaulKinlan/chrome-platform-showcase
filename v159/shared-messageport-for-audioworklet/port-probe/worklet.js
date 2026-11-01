// AudioWorkletGlobalScope module for the shared-port probe.
// If this scope has the Chrome 159 shared `port`, answer pings with the
// rendering-thread facts only this scope can know.
if (typeof port !== "undefined" && port && typeof port.postMessage === "function") {
  port.onmessage = (event) => {
    port.postMessage({
      echo: event.data,
      scope: "AudioWorkletGlobalScope",
      sampleRate: sampleRate,
      currentFrame: currentFrame,
      answeredAt: currentTime,
    });
  };
}
// A worklet module must be valid even when it registers nothing; registering a
// trivial processor keeps older builds from treating the module as useless.
registerProcessor(
  "probe-noop",
  class extends AudioWorkletProcessor {
    process() {
      return false;
    }
  },
);
