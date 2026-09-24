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
const sampleN = Number(flag("--sample") ?? 0);
const milestone = flag("--milestone");
const explicitBase = flag("--base");
let base = explicitBase ?? "http://localhost:3000";

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

let chrome = null;
let conn = null;

try {
  chrome = await launchChrome();
  conn = await cdpConnection(chrome.wsUrl);
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
