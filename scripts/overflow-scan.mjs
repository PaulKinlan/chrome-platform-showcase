#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Cheap automated mobile-overflow scan for the mobile + desktop parity invariant.
//
// A fast sweep that loads each demo and checks only
// `documentElement.scrollWidth <= innerWidth + 1`. Its ONLY job is to SEED
// support records and flag obvious breakage — an overflow hit is written as
// `needs-review` (NOT a pass, NOT `broken`); a clean automated result is left
// `untested`. A real matrix pass via responsive-check is what flips a class to
// `ok` / `broken`. This keeps automated-only signal honest.
//
// `--concepts` scans the concept pages under each feature
// (v<N>/<feature>/<concept>/) instead of the feature folders. Nothing else in the
// toolchain measures those: responsive-check, the route gate's coverage number
// and the default mode of this script all key off feature folders. Two rules
// learned from the concept sweep that found the 4va/llk overflow backlog:
//
//   * BOTH classes matter. Of the offenders found across the concept pages, all
//     but one were desktop-only, and the one that also broke mobile was the worst
//     desktop case — a mobile-only sweep sees a fraction of this class of bug.
//   * The CULPRIT must skip scroll-container contents. A `<pre>` with
//     `overflow-x: auto` inside a 184px box can carry 1000px of content and be
//     perfectly correct; a naive element-rect sweep reports it forever.
//
// Concept mode writes a REPORT (reports/responsive/concept-overflow-scan.json) and
// never merges into the sidecar: `responsive-support.json` is keyed by feature
// folder, and inventing 3,900 concept keys would make the route gate demand
// records for pages it does not model. Promoting concept findings into the
// sidecar is a separate decision.
//
// Usage:
//   deno task overflow-scan --sample 60          # spread across milestones
//   deno task overflow-scan --milestone v153
//   deno task overflow-scan --all                # every built demo (slow)
//   deno task overflow-scan --sample 60 --merge  # write needs-review into sidecar
//   deno task overflow-scan --concepts --sample 40 --classes both
//   deno task overflow-scan --concepts --milestone v151 --stride 3 --classes both
//
// Without --base the harness picks a FREE port, so concurrent lanes cannot
// collide. With --base it honours the port exactly and aborts if something else
// already holds it — measuring another lane's server is never a useful result
// (beads chrome-platform-showcase-bn2 and -7b0).

import { buildFromDisk, REPO_ROOT } from "./lib/manifest.mjs";
import { cdpConnection, cleanupChrome, launchChrome } from "./lib/cdp.mjs";

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
const all = Boolean(flag("--all"));
const concepts = Boolean(flag("--concepts"));
const sampleN = Number(flag("--sample") ?? 0);
const milestone = flag("--milestone");
const strideN = Number(flag("--stride") ?? 0);
const classesArg = String(flag("--classes") ?? (concepts ? "both" : "mobile"));
const perPageMs = Number(flag("--timeout-ms") ?? 8000);
const explicitBase = flag("--base");
let base = explicitBase ?? "http://localhost:3000";

const CLASSES = {
  mobile: { width: 360, height: 740, deviceScaleFactor: 3, mobile: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
};
const classList = classesArg === "both"
  ? ["mobile", "desktop"]
  : classesArg.split(",").map((c) => c.trim()).filter((c) => CLASSES[c]);
if (!classList.length) {
  console.error("--classes must be mobile, desktop or both");
  Deno.exit(2);
}
if (concepts && doMerge) {
  console.error(
    "--merge is not available with --concepts: the sidecar is keyed by feature folder. Concept results go to reports/responsive/concept-overflow-scan.json.",
  );
  Deno.exit(2);
}
// Feature mode also refuses --merge while the sidecar's existing records predate the
// layout-viewport signal (bead ayg). The signal is right and stays; what must not
// happen is a bulk sweep rewriting shared verdicts ahead of the re-verification
// wave: a `broken` write fails the route gate with no escape until the page is
// fixed, and an `ok -> needs-review` write fails the monotonic check unless a
// migration record names the id. Either way every lane's pre-push gate would fail
// on files it never touched (the bn2 failure shape). Targeted runs stay available:
// `responsive-check <id> --merge` records one demo the caller deliberately touched.
if (doMerge && !concepts) {
  console.error(
    "--merge is disabled for the feature-mode sweep until the ayg re-verification wave lands.\n" +
      "The measured signal is correct (layout viewport), but the existing sidecar records predate it, so a bulk write\n" +
      "would flip ok -> needs-review/broken for pages no caller touched and fail every lane's check-routes gate.\n" +
      "Record a specific demo you are actually working on with: deno task responsive-check <id> --merge",
  );
  Deno.exit(2);
}

// Concept pages: any v<N>/<feature>/<concept>/index.html.
async function conceptPages() {
  const pages = [];
  for await (const release of Deno.readDir(REPO_ROOT)) {
    if (!release.isDirectory || !/^v\d+$/.test(release.name)) continue;
    for await (const feature of Deno.readDir(`${REPO_ROOT}/${release.name}`)) {
      if (!feature.isDirectory) continue;
      for await (const concept of Deno.readDir(`${REPO_ROOT}/${release.name}/${feature.name}`)) {
        if (!concept.isDirectory) continue;
        const rel = `${release.name}/${feature.name}/${concept.name}`;
        try {
          await Deno.stat(`${REPO_ROOT}/${rel}/index.html`);
          pages.push(rel);
        } catch {
          // not a demo folder
        }
      }
    }
  }
  return pages.sort();
}

const manifest = buildFromDisk().filter((m) => m.status === "built");
let targets;
if (concepts) {
  const pages = await conceptPages();
  if (milestone) targets = pages.filter((p) => p.startsWith(`${milestone}/`));
  else if (strideN > 1) targets = pages.filter((_, i) => i % strideN === 0);
  else if (sampleN > 0) {
    const step = Math.max(1, Math.floor(pages.length / sampleN));
    targets = pages.filter((_, i) => i % step === 0).slice(0, sampleN);
  } else if (all) targets = pages;
  else {
    console.error(
      "Concept mode needs a scope: --all, --milestone v<N>, --sample <n> or --stride <n> (3,893 pages is a long run).",
    );
    Deno.exit(2);
  }
} else if (all) targets = manifest.map((m) => m.id);
else if (milestone) {
  targets = manifest.filter((m) => m.id.startsWith(`${milestone}/`)).map((m) => m.id);
} else if (sampleN > 0) {
  const step = Math.max(1, Math.floor(manifest.length / sampleN));
  targets = manifest.filter((_, i) => i % step === 0).slice(0, sampleN).map((m) => m.id);
} else {
  console.error("Specify --all, --milestone v<N>, --sample <n>, or --concepts with one of those.");
  Deno.exit(2);
}
if (!targets.length) {
  console.error("No matching built demos.");
  Deno.exit(2);
}

// ── Server guards (bn2 / 7b0 port collision & identity verification) ─────────
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

function findFreePort() {
  for (let i = 0; i < 64; i++) {
    const port = 3400 + Math.floor(Math.random() * 600);
    if (portIsFree(port)) return port;
  }
  throw new Error("no free port found in 3400-3999 after 64 attempts");
}

async function assertServingThisTree() {
  const targetId = typeof targets[0] === "string" ? targets[0] : targets[0].id;
  const probe = `${base}/${targetId}/`;
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
      `  Refusing to measure: a server without these demos reports every page broken/overflowed, ` +
      `and --merge would contaminate responsive-support.json.\n` +
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

  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(1000) });
      await r.body?.cancel();
      if (r.ok) {
        try {
          await assertServingThisTree();
          return;
        } catch (err) {
          if (serverChild) {
            try {
              serverChild.kill("SIGKILL");
            } catch {
              // ignore
            }
          }
          throw err;
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("is not serving this working tree")) throw e;
      // waiting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (serverChild) {
    try {
      serverChild.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
  throw new Error(`local server on port ${port} did not become ready`);
}

// ── Run scan ─────────────────────────────────────────────────────────────────
try {
  await bootServer();
} catch (e) {
  console.error(`overflow-scan: ${e.message}`);
  if (serverChild) {
    try {
      serverChild.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
  Deno.exit(2);
}

const PROBE =
  // Page-level signal first, then the widest element whose ancestors all have a
  // visible overflow-x — contents of a scroll container are NOT offenders.
  //
  // The signal is scrollWidth - clientWidth, NOT scrollWidth - innerWidth. Under
  // mobile emulation Chrome can expand the layout viewport to fit wide content in
  // normal flow (measured: innerWidth 1424 and visualViewport 360 on a page with a
  // 1400px block), so innerWidth reports 0 overflow for content a phone user
  // cannot fit on screen. documentElement.clientWidth is the layout viewport
  // (360) and scrollWidth is the content, which is the honest difference. Both
  // numbers are reported so the reference is never implicit.
  `(() => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const past = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.right > vw + 1)) continue;
      let inScroller = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).overflowX !== "visible") { inScroller = true; break; }
      }
      if (!inScroller) past.push({ tag: el.tagName, cls: String(el.className || "").slice(0, 24), right: Math.round(r.right), width: Math.round(r.width) });
      if (past.length >= 3) break;
    }
    // An element walk cannot see a text line box: a long unbreakable token inside a
    // box that itself fits (e.g. max-width:56ch with no overflow-wrap) overflows the
    // layout viewport with no element box past the edge. Ranges do see it, so report
    // the widest text line rather than asserting a cause the walk did not measure.
    //
    // The walk applies the SAME two filters as the element walk, because a text line
    // inside a scroll container is not an offender (a <pre overflow-x:auto> holding a
    // 725px line clips correctly and contributes 0 to document overflow), and a line
    // that does not reach past the layout viewport is not one either. Dropping the
    // viewport filter also made the honest "not attributable" fallback unreachable:
    // some text line exists on every page, so textLine was never null.
    let textLine = null;
    if (!past.length) {
      const range = document.createRange();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        let inScroller = false;
        for (let n = node.parentElement; n && n !== document.body; n = n.parentElement) {
          if (getComputedStyle(n).overflowX !== "visible") { inScroller = true; break; }
        }
        if (inScroller) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width > 0 && r.right > vw + 1 && (!textLine || r.right > textLine.right)) {
            const host = node.parentElement;
            textLine = {
              right: Math.round(r.right),
              width: Math.round(r.width),
              tag: host ? host.tagName : null,
              cls: host ? String(host.className || "").slice(0, 24) : null,
              text: node.textContent.trim().slice(0, 60),
            };
          }
        }
      }
    }
    return {
      o: de.scrollWidth - vw,
      sw: de.scrollWidth,
      layoutViewport: vw,
      innerWidth: window.innerWidth,
      visualViewport: window.visualViewport ? Math.round(window.visualViewport.width) : null,
      past,
      textLine,
    };
  })()`;

function evaluateWithin(conn, sessionId, expression, ms) {
  const call = conn.send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
  // A page that stalls the renderer must not stall the scan: cdp.mjs would wait
  // its own 120s timeout and then reject. Race a budget and, crucially, keep a
  // handler on the losing promise so its later rejection is not unhandled.
  call.catch(() => {});
  return Promise.race([
    call,
    new Promise((resolve) => setTimeout(() => resolve("TIMEOUT"), ms)),
  ]);
}

let chrome = null;
let conn = null;

try {
  chrome = await launchChrome();
  conn = await cdpConnection(chrome.wsUrl);
  const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
  await conn.send("Page.enable", {}, sessionId);
  await conn.send("Runtime.enable", {}, sessionId);

  const rows = [];
  let overflow = 0, clean = 0, blocked = 0, unmeasured = 0;
  const update = {};
  for (const id of targets) {
    const url = `${base}/${id}/`;
    for (const cls of classList) {
      const spec = CLASSES[cls];
      let row = { page: id, class: cls };
      try {
        await conn.send("Emulation.setDeviceMetricsOverride", spec, sessionId);
        const loaded = new Promise((res) => {
          const onEvent = (m) => {
            if (m.sessionId === sessionId && m.method === "Page.loadEventFired") res();
          };
          conn.onEvent(onEvent);
        });
        await conn.send("Page.navigate", { url }, sessionId);
        await Promise.race([loaded, new Promise((r) => setTimeout(r, 6000))]);
        await new Promise((r) => setTimeout(r, 300));
        const res = await evaluateWithin(conn, sessionId, PROBE, perPageMs);
        if (res === "TIMEOUT") {
          unmeasured++;
          row = {
            ...row,
            overflow: null,
            state: "unmeasured",
            note: `no answer within ${perPageMs}ms`,
          };
        } else {
          const v = res.result?.value;
          if (!v) {
            unmeasured++;
            row = { ...row, overflow: null, state: "unmeasured", note: "no value" };
          } else if (v.o > 1) {
            overflow++;
            row = {
              ...row,
              overflow: v.o,
              state: "overflow",
              culprit: v.past[0] ?? null,
              textLine: v.textLine ?? null,
              past: v.past,
              layoutViewport: v.layoutViewport,
              innerWidth: v.innerWidth,
              visualViewport: v.visualViewport,
            };
            const culprit = v.past[0]
              ? `${v.past[0].tag}.${v.past[0].cls}`
              : v.textLine
              ? `text line in ${v.textLine.tag}.${v.textLine.cls} (${v.textLine.width}px): "${v.textLine.text}"`
              : "not attributable to an element (no element or text line past the layout viewport)";
            console.log(`  OVERFLOW ${String(v.o).padStart(5)}px [${cls}] ${id} :: ${culprit}`);
          } else {
            clean++;
            row = { ...row, overflow: v.o, state: "clean" };
          }
        }
      } catch (e) {
        blocked++;
        row = { ...row, overflow: null, state: "blocked", note: e.message };
        console.log(`  BLOCKED [${cls}] ${id} — ${e.message}`);
      }
      rows.push(row);
      // Feature mode keeps its sidecar seeding behaviour; a concept page has no
      // feature-folder key, so concept mode reports instead.
      if (!concepts && row.state === "overflow") {
        update[id] = {
          [cls]: "needs-review",
          source: "overflow-scan",
          lastChecked: new Date().toISOString().slice(0, 10),
        };
      }
    }
  }

  const dir = `${REPO_ROOT}/reports/responsive`;
  await Deno.mkdir(dir, { recursive: true });
  const reportPath = concepts ? `${dir}/concept-overflow-scan.json` : `${dir}/overflow-scan.json`;
  await Deno.writeTextFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: concepts ? "concepts" : "features",
        classes: classList,
        perPageTimeoutMs: perPageMs,
        scanned: targets.length,
        pageClasses: targets.length * classList.length,
        overflow,
        clean,
        blocked,
        unmeasured,
        // Per page-class rows so a desktop-only offender is visible as such; the
        // 4va sweep found all but one offender were desktop-only.
        rows,
        ...(concepts ? {} : { flagged: update }),
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `\noverflow-scan (${concepts ? "concepts" : "features"}, ${
      classList.join("+")
    }): ${targets.length} pages · ${
      targets.length * classList.length
    } page-classes · ${overflow} overflow · ${clean} clean · ${blocked} blocked · ${unmeasured} unmeasured`,
  );
  console.log(`report: ${reportPath}`);

  if (doMerge && Object.keys(update).length) {
    const tmp = await Deno.makeTempFile({ suffix: ".json" });
    await Deno.writeTextFile(tmp, JSON.stringify(update, null, 2));
    await new Deno.Command("deno", {
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
    }).spawn().status;
    await Deno.remove(tmp).catch(() => {});
  }
} finally {
  if (conn) conn.close?.();
  if (chrome) await cleanupChrome(chrome);
  if (serverChild) {
    try {
      serverChild.kill("SIGKILL");
      await serverChild.status;
    } catch {
      // ignore
    }
  }
}

Deno.exit(0);
