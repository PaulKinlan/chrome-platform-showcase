#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Responsive-check harness for the mobile + desktop parity invariant.
//
// Exercises each published feature demo — the overview page AND every
// published concept route — at TWO device classes and asserts the runtime
// invariants the parity policy requires (per class the worst page outcome
// becomes the feature's verdict):
//   - mobile  ≈360×740, deviceScaleFactor 3, touch  (constrained phone)
//   - desktop ≈1280×800, mouse + keyboard
// Per class it loads the page, screenshots it, and asserts programmatically:
//   - no horizontal overflow (documentElement.scrollWidth <= innerWidth + 1)
//   - no off-viewport / clipped interactive controls
//   - (mobile) primary tap targets ≈44px
//   - zero uncaught console errors / exceptions
//   - no failed demo request, same-origin or cross-origin (only the optional
//     web-font hosts and deliberately canceled requests are exempt)
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

// Only the design system's OWN decorative font requests are exempt from
// failure counting: the css2 stylesheet public/styles.css imports (its
// family=Joan… query is a unique marker) and any request INITIATED by that
// stylesheet (its woff2 files). Demos that request fonts themselves — even
// the same families — have a page/script initiator and still count (e.g.
// v150's integrity-chain demo fetches a jetbrainsmono woff2 as the feature
// under test).
const SHELL_FONT_CSS_MARKER = "fonts.googleapis.com/css2?family=Joan";
function isShellFontRequest(url, initiatorUrl) {
  return String(url).includes(SHELL_FONT_CSS_MARKER) ||
    String(initiatorUrl ?? "").includes(SHELL_FONT_CSS_MARKER);
}

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

// The in-page assertion the harness evaluates per class. Comparing
// scrollWidth against innerWidth alone is blind to content that WIDENS the
// mobile layout viewport itself (both grow together), so the probe also
// reports how far innerWidth exceeds the emulated width.
const probeFor = (expectedWidth) =>
  `(() => {
  const de = document.documentElement;
  const overflow = de.scrollWidth - window.innerWidth;
  const widened = window.innerWidth - ${expectedWidth};
  const vw = window.innerWidth;
  const controls = Array.from(document.querySelectorAll(
    'button, a[href], input, select, textarea, [role=button], [tabindex]'
  ));
  let clipped = 0, small = 0, smallLinks = 0, visible = 0;
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    visible++;
    if (r.right > vw + 1 || r.left < -1) clipped++;
    if (Math.min(r.width, r.height) > 0 && Math.min(r.width, r.height) < 44) {
      // Only anchors that actually flow inline with text fall under WCAG
      // 2.5.8's inline exception. A button-styled link (inline-block, flex,
      // block…) is a real control and counts with the buttons.
      const isInlineProseLink = el.tagName === 'A' &&
        getComputedStyle(el).display === 'inline';
      if (isInlineProseLink) smallLinks++;
      else small++;
    }
  }
  return { overflow, widened, scrollWidth: de.scrollWidth, innerWidth: vw, clipped, small, smallLinks, visible };
})()`;

async function checkPage(conn, url, cls) {
  const spec = CLASSES[cls];
  const consoleErrors = [];
  const netFailures = [];
  const requestUrls = new Map();
  const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });

  const offEvents = conn.onEvent((msg) => {
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
    } else if (msg.method === "Network.requestWillBeSent") {
      requestUrls.set(msg.params?.requestId, {
        url: msg.params?.request?.url ?? "",
        initiatorUrl: msg.params?.initiator?.url ?? "",
      });
    } else if (msg.method === "Network.loadingFailed") {
      // A canceled request (e.g. a demo's own deliberate abort) is not a
      // failure. Beyond that, only the OPTIONAL_HOSTS decoration requests
      // (web fonts) are exempt: demos that genuinely depend on cross-origin
      // media/CDN content must still fail when that content breaks.
      if (msg.params?.canceled) return;
      const req = requestUrls.get(msg.params?.requestId) ?? { url: "", initiatorUrl: "" };
      if (isShellFontRequest(req.url, req.initiatorUrl)) return;
      netFailures.push(
        `${msg.params?.errorText ?? "loadingFailed"}${req.url ? ` ${req.url}` : ""}`,
      );
    } else if (msg.method === "Network.responseReceived") {
      // Same policy as loadingFailed: an HTTP error from ANY host is a demo
      // failure unless it comes from the optional decoration hosts.
      const res = msg.params?.response;
      const req = requestUrls.get(msg.params?.requestId) ?? { initiatorUrl: "" };
      if (res && res.status >= 400 && !isShellFontRequest(res.url, req.initiatorUrl)) {
        netFailures.push(`HTTP ${res.status} ${res.url}`);
      }
    }
  });

  await conn.send("Page.enable", {}, sessionId);
  await conn.send("Runtime.enable", {}, sessionId);
  await conn.send("Log.enable", {}, sessionId);
  await conn.send("Network.enable", {}, sessionId);
  // public/styles.css @imports the font CDN, so a HANGING font request holds
  // the whole stylesheet back and the probe would measure unstyled layout.
  // The shell fonts are the declared-optional decoration (system-font
  // fallback), so the harness blocks them for deterministic styling; their
  // failures are exempt from counting either way.
  await conn.send("Network.setBlockedURLs", {
    urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"],
  }, sessionId).catch(() => {});
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
  // Snapshots taken when the verdict is computed: CDP failure events can keep
  // arriving during the closeTarget await in the finally block, so slicing the
  // live arrays at return time lets the reported list disagree with the count
  // baked into `detail`.
  let consoleErrorsAtVerdict = null;
  let netFailuresAtVerdict = null;
  let offLoad = () => {};
  try {
    const loaded = new Promise((res) => {
      const fn = (msg) => {
        if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") res();
      };
      offLoad = conn.onEvent(fn);
    });
    const nav = await conn.send("Page.navigate", { url }, sessionId);
    if (nav.errorText) {
      outcome = "blocked";
      detail = `navigation failed: ${nav.errorText}`;
    } else {
      await Promise.race([loaded, new Promise((r) => setTimeout(r, 8000))]);
      await new Promise((r) => setTimeout(r, 1200)); // settle async work
      const evalRes = await conn.send("Runtime.evaluate", {
        expression: probeFor(spec.width),
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

      consoleErrorsAtVerdict = [...consoleErrors];
      netFailuresAtVerdict = [...netFailures];
      const reasons = [];
      if (probe && probe.widened > 1) {
        reasons.push(
          `layout viewport widened to ${probe.innerWidth}px (expected ~${spec.width}px)`,
        );
      }
      if (probe && probe.overflow > 1) reasons.push(`h-overflow ${probe.overflow}px`);
      if (probe && probe.clipped > 0) reasons.push(`${probe.clipped} clipped control(s)`);
      if (consoleErrorsAtVerdict.length) {
        reasons.push(`${consoleErrorsAtVerdict.length} console error(s)`);
      }
      if (netFailuresAtVerdict.length) {
        reasons.push(`${netFailuresAtVerdict.length} network failure(s)`);
      }
      if (reasons.length) {
        outcome = "broken";
        detail = reasons.join("; ");
      } else {
        const notes = [];
        if (spec.mobile && probe && probe.small > 0) {
          notes.push(`${probe.small} sub-44px control(s) — read screenshot`);
        }
        if (spec.mobile && probe && probe.smallLinks > 0) {
          notes.push(`${probe.smallLinks} sub-44px inline link(s) (WCAG 2.5.8 inline exception)`);
        }
        detail = notes.join("; ") || "clean";
      }
    }
  } catch (e) {
    outcome = "blocked";
    detail = `harness error: ${e.message}`;
  } finally {
    offEvents();
    offLoad();
    await conn.send("Target.closeTarget", { targetId }).catch(() => {});
  }
  return {
    outcome,
    detail,
    probe,
    consoleErrors: (consoleErrorsAtVerdict ?? consoleErrors).slice(0, 5),
    netFailures: (netFailuresAtVerdict ?? netFailures).slice(0, 5),
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
    // A feature's verdict covers its overview page AND every published concept
    // route — an `ok` merged into the sidecar must not rest on the static
    // parent page alone. Per class the WORST page outcome wins
    // (broken > blocked > ok).
    const pages = [
      `${base}/${t.id}/`,
      ...(t.concepts ?? []).map((c) => `${base}/${t.id}/${c}/`),
    ];
    results[t.id] = {};
    const rec = { source: "harness", lastChecked: new Date().toISOString().slice(0, 10) };
    for (const cls of Object.keys(CLASSES)) {
      // Every page's result is kept in the report (auditable concept-level
      // coverage); the aggregate verdict is the worst outcome across them.
      const rank = { broken: 2, blocked: 1, ok: 0 };
      const pageResults = [];
      let worst = null;
      for (const url of pages) {
        const pr = await checkPage(conn, url, cls);
        const rel = url.replace(`${base}/${t.id}/`, "") || "(index)";
        pageResults.push({ page: rel, ...pr });
        if (!worst || rank[pr.outcome] > rank[worst.outcome]) {
          worst = { ...pr, detail: pages.length > 1 ? `${rel}: ${pr.detail}` : pr.detail };
        }
      }
      const r = { ...worst, pages: pageResults };
      results[t.id][cls] = r;
      if (r.outcome === "ok") {
        rec[cls] = "ok";
        cls === "desktop" ? okD++ : okM++;
      } else if (r.outcome === "broken") {
        rec[cls] = "broken";
        brokenN++;
      } else {
        blockedN++;
        // blocked never fabricates a pass OR preserves one: if the sidecar
        // currently claims ok for this class, the claim is stale (a current
        // route was not verified this run) — downgrade it to needs-review.
        // Genuine unsupported/broken records stay untouched.
        if (t.support?.[cls] === "ok") rec[cls] = "needs-review";
      }
      console.log(
        `  ${t.id} [${cls}] ${r.outcome.toUpperCase()} (${pages.length} page(s)) — ${r.detail}`,
      );
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
