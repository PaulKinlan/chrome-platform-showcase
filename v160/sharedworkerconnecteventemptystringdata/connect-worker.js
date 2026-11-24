// Shared worker used by every concept page of
// v160/sharedworkerconnecteventemptystringdata.
// https://chromestatus.com/feature/5142074717503488
//
// It records the REAL, user-agent-fired `connect` MessageEvent for every
// connection (nothing here is simulated) and answers commands sent over the
// connecting port. HTML "run a worker" + the SharedWorker constructor both say:
//   fire an event named connect at worker global scope, using MessageEvent,
//   with the data attribute initialized to the empty string, the ports
//   attribute initialized to a new frozen array containing inside port, and
//   the source attribute initialized to inside port.
// Chrome <= 159 left data at null; Chrome 160 (Blink runtime feature
// SharedWorkerConnectEventEmptyStringData) initialises it to "".

"use strict";

var startedAt = Date.now();
var connections = []; // { index, snapshot, port, label }
var firstConnectEvent = null;

// Describe a value so null / "" / undefined survive structured clone + JSON
// without ambiguity.
function describe(v) {
  if (v === null) return { kind: "null", text: "null" };
  if (v === undefined) return { kind: "undefined", text: "undefined" };
  if (typeof v === "string") return { kind: "string", text: JSON.stringify(v) };
  try {
    return { kind: typeof v, text: String(v) };
  } catch (_e) {
    return { kind: typeof v, text: "[unprintable]" };
  }
}

function snapshot(e) {
  var ports = e.ports;
  return {
    type: e.type,
    constructorName: e.constructor && e.constructor.name,
    isMessageEvent: e instanceof MessageEvent,
    data: describe(e.data),
    dataTypeof: typeof e.data,
    dataIsEmptyString: e.data === "",
    dataIsNull: e.data === null,
    origin: describe(e.origin),
    lastEventId: describe(e.lastEventId),
    portsLength: ports ? ports.length : -1,
    portsFrozen: Object.isFrozen(ports),
    portsIsArray: Array.isArray(ports),
    sourceIsPort0: !!ports && ports.length > 0 && e.source === ports[0],
    sourceIsMessagePort: e.source instanceof MessagePort,
    bubbles: e.bubbles,
    cancelable: e.cancelable,
    isTrusted: e.isTrusted,
    composed: e.composed,
    defaultPrevented: e.defaultPrevented,
  };
}

// Legacy patterns real code has used on the connect event. Each runs against
// the REAL event object, so the branch taken is what this engine does.
function runPatterns(e) {
  var out = [];
  function add(id, code, fn) {
    var result;
    try {
      result = fn(e);
    } catch (err) {
      result = { threw: String(err && err.message || err) };
    }
    out.push({ id: id, code: code, result: result });
  }
  add("strict-null-sentinel", "if (e.data === null) { /* handshake */ }", function (ev) {
    return ev.data === null ? "handshake branch" : "fell through to payload branch";
  });
  add("loose-null-sentinel", "if (e.data == null) { /* handshake */ }", function (ev) {
    return ev.data == null ? "handshake branch" : "fell through to payload branch";
  });
  add("nullish-default", "const p = e.data ?? { kind: 'connect' }; p.kind", function (ev) {
    var p = ev.data ?? { kind: "connect" };
    return "p.kind = " + JSON.stringify(p.kind === undefined ? "(undefined)" : p.kind);
  });
  add(
    "typeof-object",
    "typeof e.data === 'object'  // shared message+connect router",
    function (ev) {
      return typeof ev.data === "object" ? "routed as structured payload" : "routed as primitive";
    },
  );
  add("json-log", "JSON.stringify(e.data)", function (ev) {
    return JSON.stringify(ev.data);
  });
  add("string-coerce", "String(e.data)", function (ev) {
    return JSON.stringify(String(ev.data));
  });
  add("falsy-check", "if (!e.data) { /* handshake */ }", function (ev) {
    return !ev.data ? "handshake branch" : "fell through to payload branch";
  });
  add("type-check", "if (e.type === 'connect') { const port = e.ports[0]; }", function (ev) {
    return ev.type === "connect" && ev.ports[0] instanceof MessagePort
      ? "handshake branch (port acquired)"
      : "no port";
  });
  return out;
}

// Build synthetic connect events with the MessageEvent constructor and compare
// each, field by field, against the real one.
function syntheticComparison(realEvent, initKey) {
  var ch = new MessageChannel();
  var inits = {
    "no-init": undefined,
    "ports-only": { ports: [ch.port1], source: ch.port1 },
    "spec-shaped": { data: "", ports: [ch.port1], source: ch.port1 },
    "legacy-null": { data: null, ports: [ch.port1], source: ch.port1 },
  };
  var keys = initKey && inits.hasOwnProperty(initKey) ? [initKey] : Object.keys(inits);
  var real = snapshot(realEvent);
  return keys.map(function (k) {
    var ev = inits[k] === undefined
      ? new MessageEvent("connect")
      : new MessageEvent("connect", inits[k]);
    var s = snapshot(ev);
    var fields = [
      "data",
      "dataTypeof",
      "origin",
      "lastEventId",
      "portsLength",
      "portsFrozen",
      "sourceIsPort0",
      "bubbles",
      "cancelable",
      "isTrusted",
    ];
    var diff = fields.map(function (f) {
      var a = real[f], b = s[f];
      var av = a && typeof a === "object" ? a.text : String(a);
      var bv = b && typeof b === "object" ? b.text : String(b);
      return { field: f, real: av, synthetic: bv, same: av === bv };
    });
    return { init: k, diff: diff };
  });
}

function broadcast(msg) {
  for (var i = 0; i < connections.length; i++) {
    if (connections[i].open) connections[i].port.postMessage(msg);
  }
}

function roster() {
  return connections.map(function (c) {
    return {
      index: c.index,
      label: c.label,
      open: c.open,
      data: c.snapshot.data,
      dataTypeof: c.snapshot.dataTypeof,
      path: c.path,
    };
  });
}

self.addEventListener("connect", function (e) {
  if (!firstConnectEvent) firstConnectEvent = e;
  var port = e.ports[0];
  var entry = {
    index: connections.length + 1,
    snapshot: snapshot(e),
    port: port,
    label: "connection " + (connections.length + 1),
    open: true,
    // The first connect a shared worker global ever sees comes from
    // "run a worker"; every later one from the SharedWorker constructor's
    // "connect to an existing worker" step.
    path: connections.length === 0
      ? "run a worker (new global)"
      : "SharedWorker constructor (existing global)",
  };
  connections.push(entry);

  port.onmessage = function (m) {
    var cmd = m.data && m.data.cmd;
    if (cmd === "hello") {
      entry.label = String(m.data.label || entry.label).slice(0, 60);
      port.postMessage({
        type: "hello",
        index: entry.index,
        snapshot: entry.snapshot,
        path: entry.path,
        workerName: self.name,
        startedAt: startedAt,
      });
      broadcast({ type: "roster", roster: roster() });
    } else if (cmd === "patterns") {
      port.postMessage({
        type: "patterns",
        index: entry.index,
        dataTypeof: entry.snapshot.dataTypeof,
        results: runPatterns(e),
      });
    } else if (cmd === "synthetic") {
      port.postMessage({
        type: "synthetic",
        real: entry.snapshot,
        rows: syntheticComparison(e, m.data.init),
      });
    } else if (cmd === "bye") {
      entry.open = false;
      broadcast({ type: "roster", roster: roster() });
    } else if (cmd === "roster") {
      port.postMessage({ type: "roster", roster: roster() });
    }
  };
  port.start();
});
