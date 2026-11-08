// AudioWorkletGlobalScope module: one wavetable store shared by every voice.
// Module scope is per AudioWorkletGlobalScope (one per AudioContext), so any
// processor instance created later reads the same Float32Array — no copy.
const tables = new Map(); // tableId -> Float32Array
let tableMessages = 0;
const sharedPort = (typeof globalThis.port === 'object' && globalThis.port !== null) ? globalThis.port : null;

function storeTable(d, replyPort, via) {
  tableMessages++;
  const table = new Float32Array(d.buffer);
  tables.set(d.tableId, table);
  let sum = 0;
  for (let i = 0; i < table.length; i++) sum += table[i];
  replyPort.postMessage({ type: 'table-stored', via, tableId: d.tableId, length: table.length, bytes: table.byteLength, checksum: Math.round(sum * 1000) / 1000, tableMessages });
}

if (sharedPort) {
  sharedPort.onmessage = (e) => {
    const d = e.data || {};
    if (d.type === 'table') storeTable(d, sharedPort, 'shared port');
    if (d.type === 'stats') sharedPort.postMessage({ type: 'stats', tables: tables.size, tableMessages });
  };
}

// OLD PATTERN: a bootstrap processor that exists only to receive the table.
registerProcessor('wavetable-bootstrap', class extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (e) => { const d = e.data || {}; if (d.type === 'table') storeTable(d, this.port, 'bootstrap node'); };
  }
  process() { return true; }
});

registerProcessor('wavetable-voice', class extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.freq = o.freq || 220;
    this.phase = 0;
    // Naive per-node approach: the table arrives inside processorOptions,
    // structured-cloned separately into EVERY voice.
    this.table = o.ownTable ? new Float32Array(o.ownTable) : tables.get(o.tableId) || null;
    let sum = 0;
    if (this.table) for (let i = 0; i < this.table.length; i++) sum += this.table[i];
    this.port.postMessage({
      type: 'voice-ready', voice: o.voice, found: !!this.table,
      source: o.ownTable ? 'own copy (processorOptions)' : 'module-scope store',
      length: this.table ? this.table.length : 0,
      sharesStore: !!this.table && this.table === tables.get(o.tableId),
      checksum: Math.round(sum * 1000) / 1000,
    });
  }
  process(inputs, outputs) {
    const out = outputs[0][0];
    if (!out || !this.table) return true;
    const n = this.table.length, inc = (this.freq * n) / sampleRate;
    for (let i = 0; i < out.length; i++) {
      out[i] = this.table[Math.floor(this.phase) % n] * 0.2;
      this.phase += inc;
      if (this.phase >= n) this.phase -= n;
    }
    return true;
  }
});
