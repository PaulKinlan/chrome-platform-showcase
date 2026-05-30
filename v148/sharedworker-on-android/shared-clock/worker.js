// SharedWorker: simulates one upstream "feed" shared across all connected tabs.
// Replaces N WebSocket connections (one per tab) with one — the canonical motivating
// example for SharedWorker on Android from whatwg/html #11205.

const ports = new Set();
let lastTickAt = Date.now();
let nextTickId = 0;
let connectedSince = Date.now();

// Simulated "upstream" connection — one timer feeding many ports.
setInterval(() => {
  nextTickId++;
  lastTickAt = Date.now();
  const msg = { type: "tick", id: nextTickId, at: lastTickAt, ports: ports.size };
  for (const p of ports) p.postMessage(msg);
}, 1000);

self.onconnect = (e) => {
  const port = e.ports[0];
  ports.add(port);
  port.postMessage({
    type: "hello",
    ports: ports.size,
    since: connectedSince,
    lastTickId: nextTickId,
  });
  for (const p of ports) {
    if (p !== port) p.postMessage({ type: "peer-joined", ports: ports.size });
  }
  port.onmessage = (ev) => {
    const msg = ev.data;
    if (msg.type === "broadcast") {
      const out = { type: "broadcast", from: msg.from, text: msg.text, at: Date.now() };
      for (const p of ports) p.postMessage(out);
    } else if (msg.type === "stats") {
      port.postMessage({
        type: "stats",
        ports: ports.size,
        lastTickId: nextTickId,
        since: connectedSince,
      });
    }
  };
  port.start();
};
