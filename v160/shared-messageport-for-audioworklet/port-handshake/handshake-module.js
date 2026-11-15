// AudioWorkletGlobalScope module for the port-handshake concept.
// Uses the scope-level MessagePort (AudioWorkletGlobalScope.port) that is
// entangled with AudioWorklet.port on the main thread. No processor is needed.
const scopePort = globalThis.port;
let received = 0;
if (scopePort) {
  scopePort.onmessage = (e) => {
    received++;
    const msg = e.data || {};
    if (msg.type === "ping") {
      scopePort.postMessage({
        type: "pong",
        echo: msg.t,
        received,
        sampleRate,
        currentTime,
        currentFrame,
        renderQuantumSize: typeof renderQuantumSize === "number" ? renderQuantumSize : null,
        typeofPort: typeof globalThis.port,
        typeofRegisterProcessor: typeof registerProcessor,
        isMessagePort: typeof MessagePort === "function"
          ? globalThis.port instanceof MessagePort
          : "MessagePort not exposed",
      });
    } else if (msg.type === "transfer" && msg.data instanceof ArrayBuffer) {
      scopePort.postMessage({
        type: "transfer-ack",
        byteLength: msg.data.byteLength,
        firstByte: new Uint8Array(msg.data)[0],
      });
    }
  };
}
// A tiny processor so the page can confirm the module really evaluated even
// when the scope port is missing (it reports typeof port over its node port).
registerProcessor(
  "handshake-witness",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.postMessage({ type: "witness", typeofScopePort: typeof globalThis.port });
    }
    process() {
      return false;
    }
  },
);
