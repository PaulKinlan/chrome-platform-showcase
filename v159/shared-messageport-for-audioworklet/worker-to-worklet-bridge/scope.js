// AudioWorkletGlobalScope module: receives sequencer ticks and measures the
// arrival gaps (Date.now() in the rendering thread) so the page can see
// whether a busy main thread stalled them.
const sharedPort = (typeof globalThis.port === "object" && globalThis.port !== null)
  ? globalThis.port
  : null;
let stats = null;
function reset(mode) {
  stats = { mode, ticks: 0, last: 0, maxGap: 0, recentMax: 0 };
}
reset("none");
let workerPort = null;

function onTick(d) {
  const now = Date.now();
  if (stats.last) {
    const gap = now - stats.last;
    if (gap > stats.maxGap) stats.maxGap = gap;
    if (gap > stats.recentMax) stats.recentMax = gap;
  }
  stats.last = now;
  stats.ticks++;
}

function control(e, reply) {
  const d = e.data || {};
  if (d.type === "tick") onTick(d); // relay mode: ticks arrive on the control port
  else if (d.type === "connect-worker") {
    if (workerPort) workerPort.close();
    workerPort = e.ports[0] || null;
    if (workerPort) {
      workerPort.onmessage = (ev) => {
        if (ev.data && ev.data.type === "tick") onTick(ev.data);
      };
    }
    reset("direct");
    reply.postMessage({ type: "connected", gotPort: !!workerPort });
  } else if (d.type === "relay-mode") {
    if (workerPort) {
      workerPort.close();
      workerPort = null;
    }
    reset("relay");
    reply.postMessage({ type: "connected", gotPort: false });
  } else if (d.type === "reset") {
    reset(stats.mode);
  } else if (d.type === "stats") {
    reply.postMessage({
      type: "stats",
      mode: stats.mode,
      ticks: stats.ticks,
      maxGap: stats.maxGap,
      recentMax: stats.recentMax,
    });
    stats.recentMax = 0;
  }
}

if (sharedPort) sharedPort.onmessage = (e) => control(e, sharedPort);

// OLD PATTERN: the same control channel, reached through a bootstrap node.
registerProcessor(
  "bridge-bootstrap",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.onmessage = (e) => control(e, this.port);
    }
    process() {
      return true;
    }
  },
);
