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
//   deno task responsive-check --base http://localhost:4000 --no-server  # reuse a server
//
// Without --base the harness picks a FREE port, so concurrent lanes cannot
// collide. With --base it honours the port exactly and aborts if something else
// already holds it — measuring another lane's server is never a useful result
// (bead chrome-platform-showcase-bn2).
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
function flag(name, { boolean = false } = {}) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  if (boolean) {
    args.splice(i, 1);
    return true;
  }
  const v = args[i + 1];
  args.splice(i, v && !v.startsWith("--") ? 2 : 1);
  return v && !v.startsWith("--") ? v : true;
}
const doMerge = Boolean(flag("--merge", { boolean: true }));
const noServer = Boolean(flag("--no-server", { boolean: true }));
const explicitBase = flag("--base");
let base = explicitBase ?? "http://localhost:3000";
const sampleN = Number(flag("--sample") ?? 0);
const nextN = Number(flag("--next") ?? flag("--untested") ?? 0);
const milestone = flag("--milestone");
const explicitIds = args.filter((a) => !a.startsWith("--"));

// ── select target ids ────────────────────────────────────────────────────────
const manifest = buildFromDisk().filter((m) => m.status === "built");
let targets;
if (explicitIds.length) {
  targets = manifest.filter((m) => explicitIds.includes(m.id));
} else if (milestone) {
  targets = manifest.filter((m) => m.id.startsWith(`${milestone}/`));
} else if (nextN > 0) {
  // Prioritize untested or needs-review demos, newest milestone first, so
  // batch runs (`--next 25 --merge`) systematically burn down the backlog.
  const pending = manifest
    .filter((m) => {
      const sup = m.support ?? { desktop: "untested", mobile: "untested" };
      const dDone = sup.desktop === "ok" || sup.desktop === "unsupported";
      const mDone = sup.mobile === "ok" || sup.mobile === "unsupported";
      return !dDone || !mDone;
    })
    .sort((a, b) => {
      const ma = Number(a.id.slice(1).split("/")[0]) || 0;
      const mb = Number(b.id.slice(1).split("/")[0]) || 0;
      return mb - ma || a.id.localeCompare(b.id);
    });
  targets = pending.slice(0, nextN);
} else if (sampleN > 0) {
  // Even spread across the sorted manifest so the sample spans milestones.
  const step = Math.max(1, Math.floor(manifest.length / sampleN));
  targets = manifest.filter((_, i) => i % step === 0).slice(0, sampleN);
} else {
  console.error("Specify ids, --milestone v<N>, --next <n>, or --sample <n>.");
  Deno.exit(2);
}
if (!targets.length) {
  console.error("No matching built demos.");
  Deno.exit(2);
}

// ── boot a local server unless told to reuse one ──────────────────────────────
//
// This used to spawn a server on :3000 and then poll `GET /` until something
// answered. When another lane already held that port the spawn lost the bind,
// the poll succeeded against the FOREIGN server, every demo under test 404ed,
// and the checker recorded `broken` for pages it never loaded — which --merge
// then wrote into the shared, git-tracked responsive-support.json. check-routes
// fails on any `broken` record for a supported class, so one lane's port
// collision became every lane's red gate, and the obvious reaction ("the gate
// says broken, record broken") writes the lie into main.
//
// Two guards, because the failure has two distinct faces:
//   1. Bind the port ourselves before spawning. AddrInUse is the collision, and
//      it is now a loud abort instead of a silent handover to someone else's
//      server. Without --base we pick a free port so lanes cannot collide at all.
//   2. Before measuring anything, fetch a demo this run is actually going to
//      check. A 404 means the server is not serving this working tree — abort
//      rather than record a result about another tree's files. This also covers
//      --no-server, where the caller may point at the wrong server by hand.
let serverChild = null;

function portIsFree(port) {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.AddrInUse) return false;
    throw e;
  }
}

// Only used when the caller did not pin a port. There is a small window between
// the probe closing and the server binding; guard 2 catches the consequence if
// anything slips into it.
function findFreePort() {
  for (let i = 0; i < 64; i++) {
    const port = 3400 + Math.floor(Math.random() * 600);
    if (portIsFree(port)) return port;
  }
  throw new Error("no free port found in 3400-3999 after 64 attempts");
}

// `targets` is already resolved and non-empty here, so any one of them is a page
// this run will measure — the right identity probe for "is this my tree?".
async function assertServingThisTree() {
  const probe = `${base}/${targets[0].id}/`;
  let status = "no response";
  try {
    const r = await fetch(probe, { signal: AbortSignal.timeout(5000) });
    await r.body?.cancel();
    if (r.ok) return;
    status = `HTTP ${r.status}`;
  } catch (e) {
    status = e?.message ?? String(e);
  }
  throw new Error(
    `${base} is not serving this working tree (${probe} -> ${status}).\n` +
      `  Refusing to measure: a server without these demos reports every class broken, ` +
      `and --merge would write that into responsive-support.json.\n` +
      `  Start a server from THIS worktree and pass --base http://localhost:<port> --no-server.`,
  );
}

async function bootServer() {
  if (noServer) {
    await assertServingThisTree();
    return;
  }
  const requested = explicitBase ? Number(new URL(base).port) || 3000 : null;
  if (requested !== null && !portIsFree(requested)) {
    throw new Error(
      `port ${requested} is already in use, so this run would have measured whatever ` +
        `is listening there instead of this worktree.\n` +
        `  Free the port, omit --base to get a free one automatically, or point at that ` +
        `server deliberately with --base http://localhost:${requested} --no-server.`,
    );
  }
  const port = requested ?? findFreePort();
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
      if (r.ok) {
        await assertServingThisTree();
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`local server on port ${port} did not become ready`);
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
  const cancelled = [];
  // Requests the conformance suite made, by requestId. A conformance assertion
  // is often a NEGATIVE probe whose passing condition is that the request
  // fails: local-network-access fetches http://127.0.0.1:1 (ERR_UNSAFE_PORT)
  // and blob-url-partitioning fetches a revoked blob URL (ERR_FILE_NOT_FOUND),
  // and each assertion returns true precisely because the fetch rejected.
  // Charging those to the demo marked working pages broken.
  const probes = [];
  const probeRequests = new Set();
  const probeUrls = ["conformance-runner.js", "conformance-panel.js"];
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
        if (probeRequests.has(e.networkRequestId)) probes.push(`${e.text}`);
        else netFailures.push(`${e.text}`);
      } else if (e.source !== "network") {
        consoleErrors.push(e.text);
      }
    } else if (msg.method === "Network.requestWillBeSent") {
      // Walk the initiator's async stack chain: an assertion body runs through
      // `new Function`, so its own frame has no URL and the conformance module
      // is the parent.
      const seen = [];
      for (let frame = msg.params?.initiator?.stack; frame; frame = frame.parent) {
        for (const call of frame.callFrames ?? []) seen.push(call.url ?? "");
      }
      if (seen.some((u) => probeUrls.some((probe) => u.includes(probe)))) {
        probeRequests.add(msg.params.requestId);
      }
    } else if (msg.method === "Network.loadingFailed") {
      // ERR_ABORTED means the request was CANCELLED, not that it failed: the
      // page tore down while a probe was in flight, or the demo aborted it on
      // purpose via AbortController. Counting cancellations as breakage marked
      // four demos broken whose requests all return 200 — the conformance
      // suite's HEAD probes for local media fixtures simply had not finished
      // inside the settle window. Genuine failures (refused, DNS, blocked) and
      // 4xx/5xx responses are still recorded below.
      const errorText = msg.params?.errorText ?? "loadingFailed";
      if (probeRequests.has(msg.params?.requestId)) probes.push(errorText);
      else if (errorText !== "net::ERR_ABORTED") netFailures.push(errorText);
      else cancelled.push(msg.params?.requestId ?? "request");
    } else if (msg.method === "Network.responseReceived") {
      const res = msg.params?.response;
      if (res && res.status >= 400 && String(res.url).includes(new URL(base).host)) {
        if (probeRequests.has(msg.params?.requestId)) {
          probes.push(`HTTP ${res.status} ${res.url}`);
        } else {
          netFailures.push(`HTTP ${res.status} ${res.url}`);
        }
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
    cancelledRequests: cancelled.length,
    conformanceProbeFailures: probes.slice(0, 5),
  };
}

// ── run ───────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await bootServer();
  } catch (e) {
    // A setup failure is not a measurement. Exit before anything can be recorded.
    console.error(`responsive-check: ${e.message}`);
    Deno.exit(2);
  }
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
      serverChild.kill("SIGKILL");
      await serverChild.status;
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
Deno.exit(0);
