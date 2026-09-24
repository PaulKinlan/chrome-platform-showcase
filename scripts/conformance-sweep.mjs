#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Conformance sweep — run EVERY feature/concept suite in one real Chrome and
// record the per-assertion verdicts to reports/conformance-sweep.json.
//
// PASS 1 (fast, whole catalogue): drive the site's own /conformance/run-all
// page. It loads every committed conformance.json, runs the assertions in-page
// with the same runner the per-feature conformance pages use, and marks
// assertions belonging to a milestone newer than the running Chrome as `future`
// (a suite for a not-yet-shipped Chrome is not a demo bug).
//
// PASS 2 (authoritative, failures only): re-run every FAILING assertion on the
// suite's OWN conformance page. A suite is authored against the environment of
// its page, so three classes of assertion verdict from pass 1 are instrument
// artifacts, not demo bugs:
//   - assertions that fetch a relative URL (`../some-concept/route`) — they
//     resolve against /conformance/run-all/ and 404,
//   - assertions that read the demo's own DOM (ids, markup, rendered state),
//   - assertions that depend on the page's response headers (Permissions-Policy,
//     Document-Policy, COOP/COEP) — /conformance/run-all/ sends none of them.
// Pass 2 is what the report calls real. A pass-1 failure that passes on its own
// page is recorded as an instrument false positive, never silently dropped.
//
// Nothing here is a gate. It is the audit instrument that says WHICH demos need
// work; each real finding still gets verified in chrome-devtools-mcp before it
// is treated as real.
//
// Usage:
//   deno run -A scripts/conformance-sweep.mjs                 # boot/reuse localhost:3000
//   deno run -A scripts/conformance-sweep.mjs --base http://localhost:3000 --no-server
//   deno run -A scripts/conformance-sweep.mjs --skip-recheck  # pass 1 only (fast, losier)

import { cdpConnection, cleanupChrome, launchChrome } from "./lib/cdp.mjs";

const args = [...Deno.args];
function flag(name, fallback = null) {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  const value = args[at + 1];
  args.splice(at, value && !value.startsWith("--") ? 2 : 1);
  return value && !value.startsWith("--") ? value : true;
}
const base = String(flag("--base", "http://localhost:3000")).replace(/\/+$/, "");
const noServer = Boolean(flag("--no-server"));
const skipRecheck = Boolean(flag("--skip-recheck"));
const outJson = String(flag("--out", "reports/conformance-sweep.json"));
const timeoutMin = Number(flag("--timeout-min", "60"));

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    await res.body?.cancel();
    return true;
  } catch {
    return false;
  }
}

// Reuse a server that is already serving (other lanes run their own on 3000);
// only boot one when the base is dead.
let serverChild = null;
if (!(await reachable(`${base}/`))) {
  if (noServer) throw new Error(`${base} is not reachable and --no-server was given`);
  const port = Number(new URL(base).port || 3000);
  serverChild = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
    env: { PORT: String(port) },
    stdout: "null",
    stderr: "null",
  }).spawn();
  for (let i = 0; i < 40; i++) {
    if (await reachable(`${base}/`)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!(await reachable(`${base}/`))) throw new Error("local server did not become ready");
}

// The assertion text itself lives on disk, not in either page's DOM. Read every
// suite once so the report is self-contained for triage.
const assertionMeta = new Map();
for await (const entry of walk(".")) {
  if (!entry.endsWith("/conformance.json")) continue;
  try {
    const suite = JSON.parse(await Deno.readTextFile(entry));
    for (const assertion of suite.assertions ?? []) {
      assertionMeta.set(assertion.id, {
        test: String(assertion.test ?? "").slice(0, 300),
        expect: assertion.expect ?? null,
        specSection: assertion.specSection ?? null,
      });
    }
  } catch {
    // a malformed suite is the per-feature conformance page's problem to surface
  }
}
async function* walk(dir) {
  for await (const entry of Deno.readDir(dir)) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      if (/^v\d+$/.test(entry.name) || dir !== ".") yield* walk(path);
    } else if (entry.name === "conformance.json") yield path;
  }
}

const RUN_ALL_SCRAPE = `(() => {
  const rows = Array.from(document.querySelectorAll("#rows tr"));
  const cell = (row, n) => row.children[n]?.innerText?.trim() ?? "";
  return {
    done: document.getElementById("progress-container")?.style.display === "none",
    pass: document.getElementById("n-pass")?.textContent ?? null,
    fail: document.getElementById("n-fail")?.textContent ?? null,
    blocked: document.getElementById("n-blocked")?.textContent ?? null,
    pct: document.getElementById("n-pct")?.textContent ?? null,
    ua: document.getElementById("ua")?.textContent ?? null,
    rows: rows.map((row) => ({
      href: row.querySelector("a")?.getAttribute("href") ?? "",
      suite: cell(row, 0),
      id: row.querySelector("code")?.textContent?.trim() ?? "",
      description: cell(row, 2),
      kind: cell(row, 3),
      verdict: row.dataset.verdict ?? "",
      detail: cell(row, 5) === "—" ? "" : cell(row, 5),
    })),
  };
})()`;

// Suite pages render a plain table: id | contract | kind | verdict | detail.
const SUITE_SCRAPE = `(() => {
  const rows = Array.from(document.querySelectorAll("tr"));
  return {
    rows: rows.map((row) => ({
      id: row.querySelector("code")?.textContent?.trim() ?? "",
      verdict: (row.querySelector(".verdict, [data-verdict]")?.textContent?.trim() ?? "").toLowerCase(),
      detail: row.querySelector(".detail-cell, [data-detail]")?.textContent?.trim() ?? "",
    })).filter((r) => r.id && r.id !== "ID"),
  };
})()`;

const chrome = await launchChrome();
let report = null;
try {
  const conn = await cdpConnection(chrome.wsUrl);
  const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
  await conn.send("Page.enable", {}, sessionId);
  await conn.send("Runtime.enable", {}, sessionId);

  const deadline = Date.now() + timeoutMin * 60_000;

  async function gotoAndEval(url, expression, { settle } = {}) {
    await conn.send("Page.navigate", { url }, sessionId);
    let last = null;
    let polls = 0;
    let stalls = 0;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      polls++;
      let value;
      try {
        const res = await conn.send(
          "Runtime.evaluate",
          { expression, returnByValue: true },
          sessionId,
        );
        value = res.result?.value;
      } catch (err) {
        // A single assertion can block the renderer past the CDP timeout (a
        // busy-loop probe, a GPU stall). That is a fact about the suite, not a
        // reason to lose the whole sweep: keep polling until the deadline.
        stalls++;
        console.log(`  renderer stall on ${new URL(url).pathname}: ${err.message} (polling on)`);
        if (stalls > 5) break;
        continue;
      }
      if (!value) continue;
      last = value;
      if (settle) {
        // Progress heartbeat: a long run-all must be visible, not silent.
        if (polls % 60 === 0) {
          console.log(
            `  waiting on ${new URL(url).pathname} (${polls}s): pass ${value.pass ?? "?"} · fail ${
              value.fail ?? "?"
            } · rows ${value.rows?.length ?? 0}`,
          );
        }
        if (!settle(value)) continue;
        return value;
      }
      if (Array.isArray(value.rows) && value.rows.length) return value;
    }
    return last;
  }

  // ── PASS 1 ──────────────────────────────────────────────────────────────────
  const pass1 = await gotoAndEval(`${base}/conformance/run-all/`, RUN_ALL_SCRAPE, {
    settle: (v) => v.done === true && v.rows.length > 0,
  });
  if (!pass1?.rows?.length) throw new Error("run-all page produced no assertion rows");
  if (pass1.done !== true) {
    throw new Error(
      `run-all never completed (${pass1.rows.length} rows, pass ${pass1.pass}/fail ${pass1.fail}) — refusing to write a half-run report`,
    );
  }

  const byVerdict = {};
  for (const row of pass1.rows) byVerdict[row.verdict] = (byVerdict[row.verdict] ?? 0) + 1;
  console.log(
    `pass 1: ${pass1.rows.length} assertions · pass ${pass1.pass} · fail ${pass1.fail} · blocked ${pass1.blocked} · future/na ${
      byVerdict.na ?? 0
    }`,
  );

  // ── PASS 2 — re-check failures on their own suite page ─────────────────────
  const failing = pass1.rows.filter((r) => r.verdict === "fail" || r.verdict === "blocked");
  const rechecked = new Map(); // "href::id" -> { verdict, detail }
  const recheckErrors = [];
  if (!skipRecheck) {
    const suites = [...new Set(failing.map((r) => r.href).filter(Boolean))];
    for (const href of suites) {
      const url = href.startsWith("http") ? href : `${base}${href}`;
      const snap = await gotoAndEval(url, SUITE_SCRAPE, {
        settle: (v) => v.rows.length > 0 && v.rows.every((r) => r.verdict && r.verdict !== "…"),
      });
      if (!snap?.rows?.length) {
        recheckErrors.push({ href, reason: "suite page produced no verdict rows" });
        continue;
      }
      for (const row of snap.rows) rechecked.set(`${href}::${row.id}`, row);
    }
  }

  // Why a real failure failed — the demo-work triage depends on telling a
  // browser that lacks the surface (the demo must show the flag / fallback)
  // apart from a demo that is actually behaving wrongly.
  function classify(row) {
    const detail = (row.rechecked?.detail || row.detail || "").toLowerCase();
    const test = (row.test || "").toLowerCase();
    if (
      /document policy|document-policy|permissions-policy|feature policy|not allowed by/.test(
        detail,
      )
    ) {
      return "policy-header-required";
    }
    if (/hardware|device|no adapter|swiftshader|gpu|not available|unsupported/.test(detail)) {
      return "hardware-or-platform-gated";
    }
    if (/user (activation|mediation)|permission|gesture/.test(detail)) {
      return "needs-user-mediation";
    }
    if (row.kind === "css-supports") return "css-property-absent-in-this-chrome";
    if (row.kind === "exists" || row.kind === "typeof") return "api-surface-absent-in-this-chrome";
    if (/prototype|typeof|undefined| in /.test(test)) return "api-surface-absent-in-this-chrome";
    return "behavioural-assertion-failed";
  }

  const rows = pass1.rows.map((row) => {
    const again = rechecked.get(`${row.href}::${row.id}`);
    const meta = assertionMeta.get(row.id) ?? { test: "", expect: null, specSection: null };
    return {
      ...row,
      ...meta,
      rechecked: again ? { verdict: again.verdict, detail: again.detail } : null,
      real: again
        ? again.verdict === "fail" || again.verdict === "blocked"
        : row.verdict === "fail" || row.verdict === "blocked",
      instrumentFalsePositive: Boolean(
        again && (row.verdict === "fail" || row.verdict === "blocked") && again.verdict === "pass",
      ),
    };
  });
  for (const row of rows) row.cause = classify(row);

  const realIssues = rows.filter((r) => r.real);
  const falsePositives = rows.filter((r) => r.instrumentFalsePositive);
  const featureOf = (r) => {
    const parts = r.href.split("/").filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : r.suite;
  };
  const group = (list) => {
    const map = {};
    for (const row of list) {
      (map[featureOf(row)] ??= []).push({
        id: row.id,
        kind: row.kind,
        verdict: row.rechecked?.verdict ?? row.verdict,
        detail: row.rechecked?.detail || row.detail,
        cause: row.cause,
        test: row.test,
      });
    }
    return Object.entries(map).map(([feature, items]) => ({
      feature,
      causes: items.reduce((acc, r) => ({ ...acc, [r.cause]: (acc[r.cause] ?? 0) + 1 }), {}),
      rows: items,
    }));
  };

  report = {
    generatedAt: new Date().toISOString(),
    base,
    chrome: pass1.ua,
    method: skipRecheck
      ? "pass 1 only (run-all page) — relative-URL, page-DOM and response-header assertions may be false positives"
      : "pass 1 on /conformance/run-all/ then pass 2 re-running every failure on the suite's own conformance page",
    totals: {
      assertions: rows.length,
      pass: Number(pass1.pass ?? byVerdict.pass ?? 0),
      fail: Number(pass1.fail ?? byVerdict.fail ?? 0),
      blocked: Number(pass1.blocked ?? byVerdict.blocked ?? 0),
      future: byVerdict.na ?? 0,
      byVerdict,
      realFailures: realIssues.filter((r) => (r.rechecked?.verdict ?? r.verdict) === "fail").length,
      realBlocked: realIssues.filter((r) =>
        (r.rechecked?.verdict ?? r.verdict) === "blocked"
      ).length,
      instrumentFalsePositives: falsePositives.length,
    },
    passRateExecuted: pass1.pct,
    realFeaturesWithIssues: group(realIssues).length,
    recheckErrors,
    issues: group(realIssues),
    instrumentFalsePositives: group(falsePositives),
  };

  await Deno.writeTextFile(outJson, JSON.stringify(report, null, 2) + "\n");

  const md = [
    "# Conformance sweep",
    "",
    `Generated: ${report.generatedAt}`,
    `Browser: ${report.chrome}`,
    `Method: ${report.method}`,
    "",
    "## Totals",
    "",
    `- Assertions run: **${report.totals.assertions}**`,
    `- Pass: **${report.totals.pass}** · Fail: **${report.totals.fail}** · Blocked: **${report.totals.blocked}** · Future milestone (\`future\`, not a failure): **${report.totals.future}**`,
    `- Executed pass rate: **${report.passRateExecuted ?? "—"}**`,
    `- After re-checking every failure on its own suite page: **${report.totals.realFailures} real fail** · **${report.totals.realBlocked} real blocked** · **${report.totals.instrumentFalsePositives} instrument false positive**`,
    `- Features with at least one real fail/blocked assertion: **${report.realFeaturesWithIssues}**`,
    "",
    "## Features with real failing or blocked assertions",
    "",
    "| feature | causes | assertions |",
    "|---|---|---|",
    ...report.issues.map((entry) =>
      `| \`${entry.feature}\` | ${
        Object.entries(entry.causes).map(([cause, n]) => `${cause}×${n}`).join(", ")
      } | ${entry.rows.map((r) => `${r.verdict}:${r.id}`).join("<br>")} |`
    ),
    "",
    report.instrumentFalsePositives.length
      ? "## Instrument false positives (pass on their own suite page)\n\n" +
        report.instrumentFalsePositives.map((e) =>
          `- \`${e.feature}\`: ${e.rows.map((r) => r.id).join(", ")}`
        ).join("\n") + "\n"
      : "",
    report.recheckErrors.length
      ? "## Suites that could not be re-checked\n\n" +
        report.recheckErrors.map((e) => `- \`${e.href}\`: ${e.reason}`).join("\n") + "\n"
      : "",
  ].join("\n");
  await Deno.writeTextFile("reports/conformance-sweep.md", md);

  console.log(
    `conformance-sweep: ${report.totals.assertions} assertions · pass ${report.totals.pass} · fail ${report.totals.fail} · blocked ${report.totals.blocked} · future ${report.totals.future} → after re-check: ${report.totals.realFailures} real fail, ${report.totals.realBlocked} real blocked, ${report.totals.instrumentFalsePositives} instrument false positive · ${report.realFeaturesWithIssues} feature(s) with real issues`,
  );
  console.log(`wrote ${outJson} and reports/conformance-sweep.md`);
} finally {
  await cleanupChrome(chrome);
  try {
    serverChild?.kill();
  } catch {
    // ignore
  }
}
