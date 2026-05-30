// Worker that does some real CPU work and self-profiles it.
self.addEventListener("message", async (e) => {
  if (e.data !== "go") return;

  if (typeof self.Profiler !== "function") {
    self.postMessage({ error: "Profiler not available in this worker. Enable Document-Policy: js-profiling on the worker script response, or run Chrome with the JS Self-Profiling flag." });
    return;
  }

  const profiler = new self.Profiler({ sampleInterval: 10, maxBufferSize: 10000 });
  const t0 = performance.now();

  // CPU work loop with a few distinct hot functions so the profile has structure.
  function hashy(n) { let h = 0; for (let i = 0; i < n; i++) h = (h * 31 + i) | 0; return h; }
  function fibby(n) { return n < 2 ? n : fibby(n - 1) + fibby(n - 2); }
  function sortyData() {
    const a = new Array(8000);
    for (let i = 0; i < a.length; i++) a[i] = Math.random();
    a.sort();
    return a[0];
  }

  const end = t0 + 2000;
  while (performance.now() < end) {
    hashy(50000);
    fibby(22);
    sortyData();
  }

  const trace = await profiler.stop();
  self.postMessage({ trace });
});
