// AudioWorkletGlobalScope module for the "global-scope ping/pong" concept.
// Runs ONCE per AudioContext, at addModule() time. No processor is needed
// for the shared-port path: the scope talks over its own `port`.
const sharedPort = (typeof globalThis.port === 'object' && globalThis.port !== null) ? globalThis.port : null;
let received = 0;

function pong(target, data, via) {
  received++;
  target.postMessage({
    type: 'pong', via, seq: data.seq, sentAt: data.sentAt, received,
    scopeCurrentFrame: Number(currentFrame), scopeSampleRate: sampleRate,
  });
}

if (sharedPort) {
  sharedPort.onmessage = (e) => {
    if (e.data && e.data.type === 'ping') pong(sharedPort, e.data, 'AudioWorkletGlobalScope.port');
  };
  sharedPort.postMessage({ type: 'module-evaluated', scopeHasPort: true, portIsMessagePort: sharedPort instanceof MessagePort, sampleRate });
}

// OLD PATTERN (the workaround this feature replaces): a processor whose only
// job is to own a MessagePort, so the main thread can reach the scope.
registerProcessor('pingpong-bootstrap', class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'ping') pong(this.port, e.data, 'AudioWorkletProcessor.port (bootstrap node)');
    };
    this.port.postMessage({ type: 'bootstrap-ready', scopeHasPort: 'port' in globalThis });
  }
  process() { return true; }
});
