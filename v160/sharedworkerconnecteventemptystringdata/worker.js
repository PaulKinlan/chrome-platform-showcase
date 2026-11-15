// Shared worker for the SharedWorkerConnectEventEmptyStringData demos.
// It reports the REAL `connect` event it receives, field by field, and keeps a
// small presence hub so several pages/frames can share one instance.
"use strict";

const clients = new Map(); // port -> { id, label, connectedAt }
const connectLog = []; // one entry per connect event seen by this instance
let nextId = 1;
const startedAt = Date.now();

// Snapshot of the connect event, taken synchronously inside the listener.
function describeConnect(e) {
  return {
    type: e.type,
    constructorName: e.constructor && e.constructor.name,
    isMessageEvent: typeof MessageEvent === "function" && e instanceof MessageEvent,
    dataTypeof: typeof e.data,
    dataIsNull: e.data === null,
    dataIsEmptyString: e.data === "",
    dataJSON: JSON.stringify(e.data),
    origin: e.origin,
    lastEventId: e.lastEventId,
    portsLength: e.ports ? e.ports.length : -1,
    sourceIsPort0: e.source === e.ports[0],
    isTrusted: e.isTrusted,
    bubbles: e.bubbles,
    cancelable: e.cancelable,
  };
}

// Legacy-pattern audit: each pattern is run against the real event's data AND
// against the other world's value so the page can show what changes.
const PATTERNS = {
  "strict-null-check": (d) => d === null ? "treated as connect" : "treated as message",
  "loose-null-check": (d) => d == null ? "treated as connect" : "treated as message",
  "falsy-check": (d) => !d ? "treated as connect" : "treated as message",
  "typeof-object": (d) => typeof d === "object" ? "object branch" : "non-object branch",
  "nullish-default": (d) => JSON.stringify(d ?? "default-payload"),
  "or-default": (d) => JSON.stringify(d || "default-payload"),
  "string-coercion": (d) => JSON.stringify(String(d)),
  "template-literal": (d) => JSON.stringify(`payload=${d}`),
  "json-parse": (d) => {
    try {
      return `returned ${JSON.stringify(JSON.parse(d))}`;
    } catch (error) {
      return `threw ${error.name}`;
    }
  },
  "property-access": (d) => {
    try {
      return `d.length = ${d.length}`;
    } catch (error) {
      return `threw ${error.name}`;
    }
  },
};

function runPatterns(actual) {
  const other = actual === null ? "" : null;
  const out = {};
  for (const [name, fn] of Object.entries(PATTERNS)) {
    out[name] = { now: fn(actual), otherWorld: fn(other) };
  }
  return { actualJSON: JSON.stringify(actual), otherJSON: JSON.stringify(other), results: out };
}

function broadcast(msg) {
  for (const port of clients.keys()) port.postMessage(msg);
}

function roster() {
  return [...clients.values()].map((c) => ({ id: c.id, label: c.label }));
}

self.addEventListener("connect", (e) => {
  const snapshot = describeConnect(e);
  const audit = runPatterns(e.data);
  const port = e.ports[0];
  const id = nextId++;
  clients.set(port, { id, label: `client ${id}`, connectedAt: Date.now() });
  connectLog.push({ id, at: Date.now() - startedAt, dataJSON: snapshot.dataJSON });
  if (connectLog.length > 50) connectLog.shift();

  port.addEventListener("message", (m) => {
    const msg = m.data || {};
    const entry = clients.get(port);
    if (msg.type === "hello" && entry) {
      entry.label = String(msg.label || entry.label).slice(0, 40);
      broadcast({ type: "roster", roster: roster(), connectLog });
    } else if (msg.type === "bye") {
      clients.delete(port);
      broadcast({ type: "roster", roster: roster(), connectLog });
      port.close();
    } else if (msg.type === "constructor-default") {
      // Contrast: a MessageEvent constructed with no init dictionary.
      const synthetic = new MessageEvent("connect");
      port.postMessage({ type: "constructor-default", dataJSON: JSON.stringify(synthetic.data) });
    } else if (msg.type === "ping") {
      port.postMessage({ type: "pong", echoedData: msg.payload });
    }
  });
  port.start();
  port.postMessage({
    type: "connected",
    id,
    snapshot,
    audit,
    instanceAgeMs: Date.now() - startedAt,
  });
  broadcast({ type: "roster", roster: roster(), connectLog });
});
