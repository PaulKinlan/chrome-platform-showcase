#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Worker-profile check: does the demo either produce a real worker profile or
// say truthfully why it cannot — without hanging?
//
//   deno task drive reports/devtools-mcp/js-profiling-worker-flag-check.spec.mjs \
//     --base http://localhost:3000
//   CHROME_FLAGS="--enable-blink-features=ProfilerAPIForDedicatedWorker" \
//     deno task drive reports/devtools-mcp/js-profiling-worker-flag-check.spec.mjs \
//     --base http://localhost:3000
//
// What is actually true in Chrome 152 (measured 2026-09-24, both configurations,
// with `worker.onerror` + a CDP attach to the worker target — see the notes on
// bead chrome-platform-showcase-aa5):
//   - main thread: ProfilerAPI is stable, Profiler.stop() resolves with samples.
//   - flag off: the worker global has no Profiler; the demo says so.
//   - flag on (`ProfilerAPIForDedicatedWorker`): the worker global DOES expose
//     Profiler, and construction then throws
//     "NotSupportedError: Failed to construct 'Profiler': Document Policy is not
//     enabled for this context" even though the worker script response carries
//     document-policy: js-profiling. A blob: worker behaves identically.
//   So "enable the flag and you get a worker profile" is FALSE, and the demo
//   honest outcome is an explicit reason, never a profile it did not produce.
//
// The demo previously swallowed that constructor rejection (no try/catch in
// worker.js), so the table sat on "running…" forever and this check's predecessor
// still reported PASS — the placeholder satisfied a `table tr > 0` assertion
// (bead chrome-platform-showcase-aa5). This version fails on exactly that.
//
// The script THROWS when an assertion is falsy (bead chrome-platform-showcase-6s3):
// the current driver grades only "no exception + no console error" and never
// reads the returned `assert` map, so returning the map alone could not fail.

export const cases = [
  {
    url: "/v147/js-profiling-in-dedicated-workers/worker-profile/",
    name:
      "Profile worker either yields a real profile or states the reason — never hangs or fakes one",
    script: `
      const mainThreadProfiler = typeof Profiler;
      const button = document.querySelector("#go") ?? Array.from(document.querySelectorAll("button"))
        .find((b) => /profile worker/i.test(b.textContent || ""));
      if (!button) throw new Error("worker-profile check: the Profile worker button was not found");
      button.click();

      const readRows = () => Array.from(document.querySelectorAll("#tb tr")).map((tr) => {
        const cells = Array.from(tr.children);
        const samples = cells[1]?.textContent?.trim() ?? null;
        return {
          text: tr.innerText.replace(/\\s+/g, " ").trim(),
          cellCount: cells.length,
          count: samples !== null && /^\\d+$/.test(samples) ? Number(samples) : null,
        };
      });

      const REASON = /Profiler not available in this worker|NotSupportedError|Document Policy|Profiler\\.stop\\(\\) failed|no samples/i;
      let rows = [];
      let settled = false;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 500));
        rows = readRows();
        // "running…" is the in-flight placeholder; any other content is a result.
        if (rows.length && !rows.some((r) => /^running…?$/.test(r.text))) { settled = true; break; }
      }

      const profileRows = rows.filter((r) => r.cellCount === 2 && r.count > 0);
      const reasonRow = rows.find((r) => REASON.test(r.text)) ?? null;
      const stuck = rows.some((r) => /^running…?$/.test(r.text));

      const assert = {
        "main thread Profiler exists": mainThreadProfiler === "function",
        "the table left the in-flight state": settled && !stuck,
        "outcome is a real profile row or an explicit reason":
          profileRows.length > 0 || reasonRow !== null,
        "no row arrives without either samples or a named reason":
          rows.every((r) => r.cellCount === 2 || REASON.test(r.text)),
      };
      const failed = Object.entries(assert).filter(([, ok]) => !ok).map(([name]) => name);
      if (failed.length) {
        throw new Error(
          "worker-profile check failed: " + failed.join("; ") +
          " | rows=" + JSON.stringify(rows.map((r) => r.text.slice(0, 140))) +
          " | mainThreadProfiler=" + mainThreadProfiler,
        );
      }

      return {
        mainThreadProfiler,
        outcome: profileRows.length > 0
          ? { kind: "profile", rows: profileRows.length }
          : { kind: "explicit-reason", reason: reasonRow.text.slice(0, 200) },
        rows: rows.map((r) => r.text.slice(0, 140)),
        assert,
      };
    `,
  },
];
