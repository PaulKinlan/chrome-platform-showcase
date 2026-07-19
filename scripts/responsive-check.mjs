#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Responsive-check harness for the mobile + desktop parity invariant.
//
// Exercises each published feature demo at TWO device classes and asserts the
// runtime invariants the parity policy requires:
//   - mobile  ≈360×740, deviceScaleFactor 3, touch  (constrained phone)
//   - desktop ≈1280×800, mouse + keyboard
// Per class it loads the page, screenshots it, and asserts programmatically:
//   - no horizontal overflow (documentElement.scrollWidth <= innerWidth + 1)
//   - no off-viewport / clipped interactive controls
//   - (mobile) primary tap targets ≈44px
//   - zero uncaught console errors / exceptions
//   - no failed same-origin demo request
// The agent then Reads the screenshots to judge legibility, tap targets, focus,
// and dialogs — this harness is the programmatic floor, not the whole judgment.
//
// Outcomes per class: ok | broken | blocked. `blocked` (device/browser genuinely
// unavailable, or navigation infra failure) is EXPLICIT and is NEVER a pass — it
// is reported and leaves the sidecar class untouched. It does NOT auto-download
// an absent large model to force a pass; the honest needs-WebGPU/needs-memory
// fallback is the correct constrained-class result.
//
// Usage:
//   deno task responsive-check --sample 12            # representative spread
//   deno task responsive-check v153/some-feature ...  # explicit ids
//   deno task responsive-check --milestone v153       # a whole milestone
//   deno task responsive-check --sample 12 --merge     # fold results into sidecar
//   deno task responsive-check --base http://localhost:3000 --no-server  # reuse a server
//
// Writes screenshots to reports/responsive/<id>/<class>.png and a run report to
// reports/responsive/last-run.json. With --merge it also updates
// responsive-support.json (ok/broken only; blocked never flips a class).

import { buildFromDisk, REPO_ROOT } from "./lib/manifest.mjs";
import { cdpConnection, cleanupChrome, launchChrome } from "./lib/cdp.mjs";

const CLASSES = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
  mobile: { width: 360, height: 740, deviceScaleFactor: 3, mobile: true },
};

const args = [...Deno.args];
function flag(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1];
  args.splice(i, v && !v.startsWith("--") ? 2 : 1);
  return v && !v.startsWith("--") ? v : true;
}
const doMerge = Boolean(flag("--merge"));
const noServer = Boolean(flag("--no-server"));
let base = flag("--base") ?? "http://localhost:3000";
const sampleN = Number(flag("--sample") ?? 0);
const milestone = flag("--milestone");
const explicitIds = args.filter((a) => !a.startsWith("--"));

// ── select target ids ────────────────────────────────────────────────────────
const manifest = buildFromDisk().filter((m) => m.status === "built");
let targets;
if (explicitIds.length) {
  targets = manifest.filter((m) => explicitIds.includes(m.id));
} else if (milestone) {
  targets = manifest.filter((m) => m.id.startsWith(`${milestone}/`));
} else if (sampleN > 0) {
  // Even spread across the sorted manifest so the sample spans milestones.
  const step = Math.max(1, Math.floor(manifest.length / sampleN));
  targets = manifest.filter((_, i) => i % step === 0).slice(0, sampleN);
} else {
  console.error("Specify ids, --milestone v<N>, or --sample <n>.");
  Deno.exit(2);
}
if (!targets.length) {
  console.error("No matching built demos.");
  Deno.exit(2);
}

// ── boot a local server unless told to reuse one ──────────────────────────────
let serverChild = null;
async function bootServer() {
  if (noServer) return;
  const port = 3000;
  base = `http://localhost:${port}`;
  serverChild = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
    env: { PORT: String(port) },
    stdout: "null",
    stderr: "null",
  }).spawn();
  // wait for readiness
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(1000) });
      await r.body?.cancel();
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("local server did not become ready");
}

// The in-page assertion the harness evaluates per class.
const PROBE = `(() => {
  const de = document.documentElement;
  const overflow = de.scrollWidth - window.innerWidth;
  const vw = window.innerWidth;
  const controls = Array.from(document.querySelectorAll(
    'button, a[href], input, select, textarea, [role=button], [tabindex]'
  ));
  let clipped = 0, small = 0, visible = 0;
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    visible++;
    if (r.right > vw + 1 || r.left < -1) clipped++;
    if (Math.min(r.width, r.height) > 0 && Math.min(r.width, r.height) < 44) small++;
  }
  return { overflow, scrollWidth: de.scrollWidth, innerWidth: vw, clipped, small, visible };
})()`;

async function checkPage(conn, url, cls) {
  const spec = CLASSES[cls];
  const consoleErrors = [];
  const netFailures = [];
  const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });

  conn.onEvent((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(msg.params?.exceptionDetails?.exception?.description ?? "exception");
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
      consoleErrors.push(
        (msg.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" "),
      );
    } else if (msg.method === "Log.entryAdded" && msg.params?.entry?.level === "error") {
      const e = msg.params.entry;
      // network 4xx/5xx surface here too; capture same-origin demo failures
      if (
        (e.source === "network" || e.source === "javascript") && e.url &&
        e.url.includes("localhost")
      ) {
        netFailures.push(`${e.text}`);
      } else if (e.source !== "network") {
        consoleErrors.push(e.text);
      }
    } else if (msg.method === "Network.loadingFailed") {
      netFailures.push(msg.params?.errorText ?? "loadingFailed");
    } else if (msg.method === "Network.responseReceived") {
      const res = msg.params?.response;
      if (res && res.status >= 400 && String(res.url).includes(new URL(base).host)) {
        netFailures.push(`HTTP ${res.status} ${res.url}`);
      }
    }
  });

  await conn.send("Page.enable", {}, sessionId);
  await conn.send("Runtime.enable", {}, sessionId);
  await conn.send("Log.enable", {}, sessionId);
  await conn.send("Network.enable", {}, sessionId);
  await conn.send("Emulation.setDeviceMetricsOverride", {
    width: spec.width,
    height: spec.height,
    deviceScaleFactor: spec.deviceScaleFactor,
    mobile: spec.mobile,
  }, sessionId);
  if (spec.mobile) {
    await conn.send(
      "Emulation.setTouchEmulationEnabled",
      { enabled: true, maxTouchPoints: 5 },
      sessionId,
    )
      .catch(() => {});
  }

  let outcome = "ok";
  let detail = "";
  let probe = null;
  try {
    const loaded = new Promise((res) => {
      const fn = (msg) => {
        if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") res();
      };
      conn.onEvent(fn);
    });
    const nav = await conn.send("Page.navigate", { url }, sessionId);
    if (nav.errorText) {
      outcome = "blocked";
      detail = `navigation failed: ${nav.errorText}`;
    } else {
      await Promise.race([loaded, new Promise((r) => setTimeout(r, 8000))]);
      await new Promise((r) => setTimeout(r, 1200)); // settle async work
      const evalRes = await conn.send("Runtime.evaluate", {
        expression: PROBE,
        returnByValue: true,
      }, sessionId);
      probe = evalRes.result?.value ?? null;

      // screenshot both classes
      try {
        const shot = await conn.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true,
        }, sessionId);
        if (shot?.data) {
          const dir = `${REPO_ROOT}/reports/responsive/${
            url.replace(base, "").replace(/^\/+|\/+$/g, "") || "root"
          }`;
          await Deno.mkdir(dir, { recursive: true });
          await Deno.writeFile(
            `${dir}/${cls}.png`,
            Uint8Array.from(atob(shot.data), (c) => c.charCodeAt(0)),
          );
        }
      } catch {
        // screenshot failure is non-fatal
      }

      const reasons = [];
      if (probe && probe.overflow > 1) reasons.push(`h-overflow ${probe.overflow}px`);
      if (probe && probe.clipped > 0) reasons.push(`${probe.clipped} clipped control(s)`);
      if (consoleErrors.length) reasons.push(`${consoleErrors.length} console error(s)`);
      if (netFailures.length) reasons.push(`${netFailures.length} network failure(s)`);
      if (reasons.length) {
        outcome = "broken";
        detail = reasons.join("; ");
      } else {
        const notes = [];
        if (spec.mobile && probe && probe.small > 0) {
          notes.push(`${probe.small} sub-44px target(s) — read screenshot`);
        }
        detail = notes.join("; ") || "clean";
      }
    }
  } catch (e) {
    outcome = "blocked";
    detail = `harness error: ${e.message}`;
  } finally {
    await conn.send("Target.closeTarget", { targetId }).catch(() => {});
  }
  return {
    outcome,
    detail,
    probe,
    consoleErrors: consoleErrors.slice(0, 5),
    netFailures: netFailures.slice(0, 5),
  };
}

// ── run ───────────────────────────────────────────────────────────────────────
async function main() {
  await bootServer();
  let chrome;
  try {
    chrome = await launchChrome();
  } catch (e) {
    // Chrome genuinely unavailable → every class blocked, never a pass.
    console.error(`CHROME UNAVAILABLE: ${e.message}. All classes recorded blocked (not a pass).`);
    const blockedReport = {};
    for (const t of targets) blockedReport[t.id] = { desktop: "blocked", mobile: "blocked" };
    await writeReport(blockedReport, {});
    if (serverChild) serverChild.kill();
    Deno.exit(1);
  }
  const conn = await cdpConnection(chrome.wsUrl);

  const results = {};
  const sidecarUpdate = {};
  let okD = 0, okM = 0, brokenN = 0, blockedN = 0;
  for (const t of targets) {
    const url = `${base}/${t.id}/`;
    results[t.id] = {};
    const rec = { source: "harness", lastChecked: new Date().toISOString().slice(0, 10) };
    for (const cls of Object.keys(CLASSES)) {
      const r = await checkPage(conn, url, cls);
      results[t.id][cls] = r;
      if (r.outcome === "ok") {
        rec[cls] = "ok";
        cls === "desktop" ? okD++ : okM++;
      } else if (r.outcome === "broken") {
        rec[cls] = "broken";
        brokenN++;
      } else {
        blockedN++; // blocked: leave sidecar class untouched
      }
      console.log(`  ${t.id} [${cls}] ${r.outcome.toUpperCase()} — ${r.detail}`);
    }
    if (rec.desktop || rec.mobile) sidecarUpdate[t.id] = rec;
  }

  conn.close();
  await cleanupChrome(chrome);
  if (serverChild) {
    try {
      serverChild.kill();
    } catch {
      // ignore
    }
  }

  await writeReport(
    Object.fromEntries(
      Object.entries(results).map(([id, cls]) => [id, {
        desktop: cls.desktop?.outcome,
        mobile: cls.mobile?.outcome,
      }]),
    ),
    results,
  );

  console.log(
    `\nresponsive-check: ${targets.length} demos · desktop ok ${okD}/${targets.length} · ` +
      `mobile ok ${okM}/${targets.length} · broken ${brokenN} · blocked ${blockedN}`,
  );

  if (doMerge && Object.keys(sidecarUpdate).length) {
    const tmp = await Deno.makeTempFile({ suffix: ".json" });
    await Deno.writeTextFile(tmp, JSON.stringify(sidecarUpdate, null, 2));
    const p = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "--allow-run",
        "--allow-env",
        "scripts/responsive-support.mjs",
        "merge",
        tmp,
      ],
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    await p.status;
    await Deno.remove(tmp).catch(() => {});
  }
}

async function writeReport(summary, full) {
  const dir = `${REPO_ROOT}/reports/responsive`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/last-run.json`,
    JSON.stringify({ generatedAt: new Date().toISOString(), summary, full }, null, 2) + "\n",
  );
}

await main();
