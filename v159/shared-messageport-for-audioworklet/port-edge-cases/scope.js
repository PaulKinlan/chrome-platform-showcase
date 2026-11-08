// AudioWorkletGlobalScope module for the port edge-case bench.
const sharedPort = (typeof globalThis.port === 'object' && globalThis.port !== null) ? globalThis.port : null;
const received = []; // every message the scope saw on its global port, in order

function handle(d, e, reply) {
  if (d.type === 'echo') reply.postMessage({ type: 'echo', seq: d.seq, via: reply === sharedPort ? 'shared' : 'node' });
  else if (d.type === 'list') reply.postMessage({ type: 'list', received: received.slice() });
  else if (d.type === 'buffer') reply.postMessage({ type: 'buffer', byteLength: d.buffer ? d.buffer.byteLength : -1, isArrayBuffer: d.buffer instanceof ArrayBuffer });
  else if (d.type === 'adopt-port') {
    const p = e.ports && e.ports[0];
    if (p) p.postMessage({ type: 'adopted', note: 'reply sent on the MessagePort transferred into the scope', isMessagePort: p instanceof MessagePort });
    reply.postMessage({ type: 'adopt-ack', gotPort: !!p, portsLength: e.ports ? e.ports.length : 0 });
  }
}

if (sharedPort) {
  sharedPort.onmessage = (e) => {
    const d = e.data || {};
    received.push(typeof d.tag === 'string' ? d.tag : d.type);
    handle(d, e, sharedPort);
  };
  sharedPort.postMessage({ type: 'evaluated', portIsMessagePort: sharedPort instanceof MessagePort });
}

// OLD PATTERN fallback used by the migration row only.
registerProcessor('edge-bootstrap', class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (e) => handle(e.data || {}, e, this.port);
  }
  process() { return true; }
});
