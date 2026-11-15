// Dedicated worker: a control-rate LFO generator that writes straight into the
// AudioWorkletGlobalScope over a MessagePort it was handed. The main thread is
// not on this path once the pipe is set up.
let out = null;
let seq = 0;
let timer = 0;
self.onmessage = (e) => {
  if (e.data && e.data.type === "pipe") {
    out = e.data.port;
    clearInterval(timer);
    const rate = e.data.rateHz || 4;
    const t0 = performance.now();
    timer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      out.postMessage({ value: Math.sin(2 * Math.PI * rate * t), seq: ++seq });
    }, 20);
    self.postMessage({ type: "running" });
  } else if (e.data && e.data.type === "rate") {
    clearInterval(timer);
    self.onmessage({ data: { type: "pipe", port: out, rateHz: e.data.rateHz } });
  } else if (e.data && e.data.type === "stop") {
    clearInterval(timer);
    if (out) out.close();
    out = null;
  }
};
