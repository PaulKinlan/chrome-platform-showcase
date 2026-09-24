#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Flag check: is the dedicated-worker half of JS Self-Profiling real in this
// Chrome, and does the demo produce a profile when it is?
//
// The main-thread `Profiler` comes from `ProfilerAPI` (Blink status: stable).
// The worker-global `Profiler` comes from `ProfilerAPIForDedicatedWorker`
// (Blink status: experimental) — see Chromium's
// third_party/blink/renderer/platform/runtime_enabled_features.json5. So this
// spec is expected to FAIL on stock Chrome and PASS behind the flag:
//
//   deno task drive reports/devtools-mcp/js-profiling-worker-flag-check.spec.mjs \
//     --base http://localhost:3000
//   CHROME_FLAGS="--enable-blink-features=ProfilerAPIForDedicatedWorker" \
//     deno task drive reports/devtools-mcp/js-profiling-worker-flag-check.spec.mjs \
//     --base http://localhost:3000
//
// The demo must stay honest in BOTH runs: with the flag off it has to say the
// worker Profiler is unavailable rather than render an empty or fake table.

export const cases = [
  {
    url: "/v147/js-profiling-in-dedicated-workers/worker-profile/",
    name: "clicking Profile worker produces a worker profile (needs ProfilerAPIForDedicatedWorker)",
    script: `
      const mainThreadProfiler = typeof Profiler;
      const button = Array.from(document.querySelectorAll("button"))
        .find((b) => /profile worker/i.test(b.textContent || ""));
      if (!button) return { assert: { "profile button exists": false }, mainThreadProfiler };
      button.click();

      let rows = [];
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        rows = Array.from(document.querySelectorAll("table tr"))
          .map((tr) => tr.innerText.replace(/\\s+/g, " ").trim())
          .filter((text) => text && !/^(FUNCTION|SAMPLES)/i.test(text));
        if (rows.length) break;
      }

      const body = document.body.innerText;
      const fallback = /Profiler not available in this worker/i.test(body);
      const timedOut = /timed out|timeout/i.test(body);
      return {
        mainThreadProfiler,
        rows: rows.length,
        firstRow: rows[0] || null,
        fallbackShown: fallback,
        fallbackText: fallback
          ? rows.find((r) => /Profiler not available/i.test(r)) || null
          : null,
        assert: {
          "main thread Profiler exists": mainThreadProfiler === "function",
          "worker profile produced rows": rows.length > 0,
          "no 'Profiler not available in this worker' fallback": !fallback,
          "no timeout": !timedOut,
        },
      };
    `,
  },
];
