#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Cheap automated mobile-overflow scan for the mobile + desktop parity invariant.
//
// A fast, single-class (mobile ≈360×740) sweep that loads each demo and checks
// only `documentElement.scrollWidth <= innerWidth + 1`. Its ONLY job is to SEED
// support records and flag obvious breakage — an overflow hit is written as
// `needs-review` (NOT a pass, NOT `broken`); a clean automated result is left
// `untested`. A real matrix pass via responsive-check is what flips a class to
// `ok` / `broken`. This keeps automated-only signal honest.
//
// Usage:
//   deno task overflow-scan --sample 60          # spread across milestones
//   deno task overflow-scan --milestone v153
//   deno task overflow-scan --all                # every built demo (slow)
//   deno task overflow-scan --sample 60 --merge  # write needs-review into sidecar

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
const all = Boolean(flag("--all"));
const sampleN = Number(flag("--sample") ?? 0);
const milestone = flag("--milestone");
const port = 3000;
const base = `http://localhost:${port}`;

const manifest = buildFromDisk().filter((m) => m.status === "built");
let targets;
if (all) targets = manifest;
else if (milestone) targets = manifest.filter((m) => m.id.startsWith(`${milestone}/`));
else if (sampleN > 0) {
  const step = Math.max(1, Math.floor(manifest.length / sampleN));
  targets = manifest.filter((_, i) => i % step === 0).slice(0, sampleN);
} else {
  console.error("Specify --all, --milestone v<N>, or --sample <n>.");
  Deno.exit(2);
}

const server = new Deno.Command("deno", {
  args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
  env: { PORT: String(port) },
  stdout: "null",
  stderr: "null",
}).spawn();
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(1000) });
    await r.body?.cancel();
    if (r.ok) break;
  } catch {
    // not up
  }
  await new Promise((r) => setTimeout(r, 500));
}

const chrome = await launchChrome();
const conn = await cdpConnection(chrome.wsUrl);
const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
await conn.send("Page.enable", {}, sessionId);
await conn.send("Runtime.enable", {}, sessionId);
await conn.send("Emulation.setDeviceMetricsOverride", {
  width: 360,
  height: 740,
  deviceScaleFactor: 3,
  mobile: true,
}, sessionId);

const PROBE =
  `({ o: document.documentElement.scrollWidth - window.innerWidth, sw: document.documentElement.scrollWidth })`;

const update = {};
let overflow = 0, clean = 0, blocked = 0;
for (const t of targets) {
  const url = `${base}/${t.id}/`;
  try {
    const loaded = new Promise((res) => {
      conn.onEvent((m) => {
        if (m.sessionId === sessionId && m.method === "Page.loadEventFired") res();
      });
    });
    await conn.send("Page.navigate", { url }, sessionId);
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 6000))]);
    await new Promise((r) => setTimeout(r, 300));
    const res = await conn.send(
      "Runtime.evaluate",
      { expression: PROBE, returnByValue: true },
      sessionId,
    );
    const v = res.result?.value;
    if (v && v.o > 1) {
      overflow++;
      update[t.id] = {
        mobile: "needs-review",
        source: "overflow-scan",
        lastChecked: new Date().toISOString().slice(0, 10),
      };
      console.log(`  OVERFLOW ${t.id} (+${v.o}px)`);
    } else {
      clean++;
    }
  } catch (e) {
    blocked++;
    console.log(`  BLOCKED ${t.id} — ${e.message}`);
  }
}

conn.close();
await cleanupChrome(chrome);
try {
  server.kill();
} catch {
  // ignore
}

const dir = `${REPO_ROOT}/reports/responsive`;
await Deno.mkdir(dir, { recursive: true });
await Deno.writeTextFile(
  `${dir}/overflow-scan.json`,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scanned: targets.length,
      overflow,
      clean,
      blocked,
      flagged: update,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `\noverflow-scan: ${targets.length} scanned · ${overflow} overflow (needs-review) · ${clean} clean · ${blocked} blocked`,
);

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
