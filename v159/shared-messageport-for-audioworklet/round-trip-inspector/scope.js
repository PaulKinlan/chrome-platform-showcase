// AudioWorkletGlobalScope module for the round-trip inspector.
// Echoes {seq, sentAt} on whichever port it arrived on, so the page can time
// the shared global-scope port against a per-node AudioWorkletNode.port.
const sharedPort = (typeof globalThis.port === "object" && globalThis.port !== null)
  ? globalThis.port
  : null;

if (sharedPort) {
  sharedPort.onmessage = (e) => {
    const d = e.data || {};
    if (d.type === "echo") {
      sharedPort.postMessage({
        type: "echo",
        arm: "shared",
        seq: d.seq,
        sentAt: d.sentAt,
        frame: Number(currentFrame),
      });
    }
  };
}

registerProcessor(
  "rtt-echo",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.onmessage = (e) => {
        const d = e.data || {};
        if (d.type === "echo") {
          this.port.postMessage({
            type: "echo",
            arm: "node",
            seq: d.seq,
            sentAt: d.sentAt,
            frame: Number(currentFrame),
          });
        }
      };
    }
    process() {
      return true;
    }
  },
);
