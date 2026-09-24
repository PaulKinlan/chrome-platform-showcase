// Worker that does some real CPU work and self-profiles it.
self.addEventListener("message", async (e) => {
  if (e.data !== "go") return;

  // Constructing the worker Profiler needs Document Policy active in THIS
  // worker context, which Chrome 152 does not grant even when the worker script
  // response carries `document-policy: js-profiling` (measured: NotSupportedError
  // "Document Policy is not enabled for this context"). Without this catch the
  // rejection is swallowed and the page sits on "running…" forever.
  const report = (error) => self.postMessage({ error });

  if (typeof self.Profiler !== "function") {
    report(
      "Profiler not available in this worker. The main-thread Profiler (Blink feature ProfilerAPI) is stable; the worker-global Profiler (Blink feature ProfilerAPIForDedicatedWorker) is experimental and off by default. Launch Chrome with --enable-blink-features=ProfilerAPIForDedicatedWorker, or enable chrome://flags/#enable-experimental-web-platform-features, to get the worker API. This page is already served with Document-Policy: js-profiling.",
    );
    return;
  }

  let profiler;
  try {
    profiler = new self.Profiler({ sampleInterval: 10, maxBufferSize: 10000 });
  } catch (err) {
    report(
      "Worker Profiler API is present (ProfilerAPIForDedicatedWorker is enabled) but construction failed: " +
        (err && err.name ? err.name + ": " + err.message : String(err)) +
        " — Chrome 152 does not enable Document Policy inside the dedicated-worker context, so the worker cannot profile here even with the flag. The main-thread Profiler on this page works.",
    );
    return;
  }
  const t0 = performance.now();

  // CPU work loop with a few distinct hot functions so the profile has structure.
  function hashy(n) {
    let h = 0;
    for (let i = 0; i < n; i++) h = (h * 31 + i) | 0;
    return h;
  }
  function fibby(n) {
    return n < 2 ? n : fibby(n - 1) + fibby(n - 2);
  }
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

  const trace = await profiler.stop().catch((err) => {
    report(
      "Worker Profiler.stop() failed: " +
        (err && err.name ? err.name + ": " + err.message : String(err)),
    );
    return null;
  });
  if (!trace) return;
  self.postMessage({ trace });
});
