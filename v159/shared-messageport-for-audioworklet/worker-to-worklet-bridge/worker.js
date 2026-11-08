// Dedicated Worker: a 50 Hz "sequencer" clock. It sends ticks either straight
// into the AudioWorkletGlobalScope (over a MessagePort that was handed to the
// scope through audioWorklet.port) or to the main thread, which relays them.
let target = null; // MessagePort (direct) or null (relay via main thread)
let timer = 0, seq = 0;

self.onmessage = (e) => {
  const d = e.data || {};
  if (d.type === "config") {
    if (target) target.close();
    target = d.mode === "direct" ? e.ports[0] : null;
    seq = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      seq++;
      const msg = { type: "tick", seq, sentAt: Date.now() };
      if (target) target.postMessage(msg);
      else self.postMessage(msg);
    }, 20);
    self.postMessage({ type: "configured", mode: d.mode });
  } else if (d.type === "stop") {
    clearInterval(timer);
    if (target) {
      target.close();
      target = null;
    }
  }
};
