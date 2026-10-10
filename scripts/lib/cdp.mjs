// Minimal Chrome DevTools Protocol client (Deno) shared by the responsive
// harnesses. Launches headless Chrome and drives it over a flat CDP session.
// Portable across the responsive-check matrix and the cheap overflow-scan.

export const CHROME_BIN = Deno.env.get("CHROME_BIN") ??
  [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/opt/google/chrome/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ]
    .find((p) => {
      try {
        Deno.statSync(p);
        return true;
      } catch {
        return false;
      }
    }) ??
  "google-chrome-stable";

// The options exist for two reasons and change nothing for the four harnesses
// that call this with no arguments: `tries`/`intervalMs` let a test exercise the
// endpoint-never-up path without waiting the real ten seconds, and `bin` lets a
// test aim at a binary that cannot start. The defaults are the previous
// behaviour exactly (40 tries, 250ms apart, the module's CHROME_BIN).
export async function launchChrome({
  bin = CHROME_BIN,
  tries = 40,
  intervalMs = 250,
  boundMs = CDP_TEARDOWN_BOUND_MS,
} = {}) {
  const userDataDir = await Deno.makeTempDir({ prefix: "cps-cdp-" });
  let child = null;
  try {
    const port = 9200 + Math.floor(Math.random() * 400);
    child = new Deno.Command(bin, {
      args: [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        // Extra switches for flag-gated verification. A demo that claims a
        // feature is available behind a flag has to be driven behind that flag,
        // so CHROME_FLAGS carries them in rather than needing a second harness.
        ...(Deno.env.get("CHROME_FLAGS") ?? "").split(" ").filter(Boolean),
        "about:blank",
      ],
      stdout: "null",
      stderr: "null",
    }).spawn();
    let wsUrl = null;
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/json/version`, {
          signal: AbortSignal.timeout(1000),
        });
        wsUrl = (await r.json()).webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    if (!wsUrl) throw new Error("chrome devtools endpoint never came up");
    return { child, wsUrl, userDataDir };
  } catch (err) {
    // The temp profile this call created is ours to remove, whether the spawn
    // threw or Chrome started and never answered. This used to leak on both
    // paths (`makeTempDir` on line 1, then the kill-and-throw above without a
    // removal). The error that caused the failure stays the error the caller
    // sees: a cleanup failure is attached to it rather than replacing it.
    await teardownChrome({ child, userDataDir }, { primaryError: err, boundMs });
    throw err; // unreachable: teardownChrome rethrows the primary error
  }
}

export async function cleanupChrome(chrome) {
  try {
    chrome.child.kill();
  } catch {
    // ignore
  }
  try {
    await Deno.remove(chrome.userDataDir, { recursive: true });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Strict teardown (bead chrome_platform_showcase-1w1, Stage 1 of 3gt).
//
// `cleanupChrome` above deliberately stays as it is for the four harnesses that
// still call it: it swallows the kill AND the profile removal, so a profile that
// survives is invisible, and a `finally` that swallowed more would start masking
// the error that caused the teardown. Converting a caller changes its error
// precedence, so it happens one caller at a time in later stages, not here.
//
// `teardownChrome` is the strict counterpart a converted caller uses instead. It
// bounds every wait, escalates SIGTERM to SIGKILL, retries the removal, and
// never reports a cleanup it could not confirm. When the caller passes the error
// that caused the teardown, that error is rethrown unchanged with the cleanup
// failure attached as context, never replaced.
//
// Limits that are stated rather than papered over:
//   * `Deno.remove` cannot be cancelled. Racing it against a deadline reports a
//     named failure and leaves the deletion UNCONFIRMED; it does not stop the IO.
//   * A SIGKILL is a request, not a fact. If the child is still unresolved after
//     the second bounded wait, that is reported and NOT claimed as cleaned up.
//   * Nothing here runs after a hard parent SIGKILL, so a `finally` is not a
//     guarantee that a crash leaves no profile behind.
// ---------------------------------------------------------------------------
export const CDP_TEARDOWN_BOUND_MS = 2000;
const CDP_REMOVE_ATTEMPTS = 20;
const CDP_REMOVE_RETRY_MS = 100;

// Named so a caller can carry the failure into its own exit decision, and so a
// log line says which layer failed without parsing prose.
export class CdpTeardownError extends Error {
  constructor(message) {
    super(message);
    this.name = "CdpTeardownError";
  }
}

// Killing an already-reaped child and removing an already-absent profile are the
// normal success end of a race, not failures.
function alreadyGone(err) {
  return err instanceof Deno.errors.BadResource ||
    err instanceof Deno.errors.NotFound;
}

// Bounded wait shared by the reap and the removal. The deadline is created
// BEFORE the caller can await anything blocking, the timer is always cleared so
// an early settle cannot park the process open, and fulfilment, rejection and
// timeout stay DISTINCT: collapsing a rejection into "settled" here is how a
// removal that fails gets reported as a removal that worked.
async function boundedWait(promise, ms) {
  let timer;
  const timeout = new Promise((res) => {
    timer = setTimeout(() => res({ status: "timeout" }), ms);
  });
  try {
    return await Promise.race([
      Promise.resolve(promise).then(
        () => ({ status: "settled" }),
        (error) => ({ status: "rejected", error }),
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// SIGTERM, one bounded wait, SIGKILL, a second bounded wait. Returns
// `{ confirmable, failures }`. Only a SETTLED `child.status` counts as a reap: a
// timeout means it is still running, and a rejection means its exit could not be
// READ, which is not evidence that it exited. Both escalate to SIGKILL, and
// whatever the second read says decides the outcome - a second rejection is
// reported as unreadable rather than quietly counted as a clean exit.
async function reapChild(child, boundMs) {
  if (!child) return { confirmable: true, failures: [] };
  const failures = [];
  try {
    child.kill("SIGTERM");
  } catch (err) {
    if (!alreadyGone(err)) failures.push(`SIGTERM could not be delivered: ${err.message}`);
  }
  if ((await boundedWait(child.status, boundMs)).status === "settled") {
    return { confirmable: failures.length === 0, failures };
  }
  try {
    child.kill("SIGKILL");
  } catch (err) {
    if (!alreadyGone(err)) failures.push(`SIGKILL could not be delivered: ${err.message}`);
  }
  const second = await boundedWait(child.status, boundMs);
  if (second.status === "rejected") {
    failures.push(
      `child status could not be read after SIGKILL: ${second.error?.message ?? second.error}`,
    );
  } else if (second.status === "timeout") {
    failures.push(
      `child was still running ${boundMs}ms after SIGKILL, so it is not confirmed reaped`,
    );
  }
  return { confirmable: failures.length === 0, failures };
}

// Bounded, retried profile removal. `NotFound` is success (a concurrent cleanup
// or an already-removed directory is the outcome we wanted). A deadlock that
// exceeds the bound is reported as UNCONFIRMED, because the race reports and
// cannot cancel the IO underneath it.
//
// `remove` is an injection seam: the four harnesses never pass it, and a test
// uses it to drive the timeout path deterministically without needing real IO to
// hang.
async function removeProfile(dir, boundMs, remove) {
  if (!dir) return { confirmable: true, failures: [] };
  const failures = [];
  const deadline = Date.now() + boundMs;
  let lastError = null;
  let attempts = 0;
  for (let attempt = 1; attempt <= CDP_REMOVE_ATTEMPTS; attempt++) {
    // The budget is checked BEFORE an attempt starts, so an attempt is never
    // raced against an almost-empty window: that made the failure MESSAGE depend
    // on timing (an exhausted budget could report as a hung IO, or the reverse).
    // Each blocking wait gets the caller's full bound, and the timeout branch is
    // therefore reached only when one removal really does hang.
    if (Date.now() >= deadline) break;
    attempts = attempt;
    let outcome;
    try {
      outcome = await boundedWait(remove(dir, { recursive: true }), boundMs);
    } catch (err) {
      // A synchronous throw never reaches the race.
      outcome = { status: "rejected", error: err };
    }
    if (outcome.status === "settled") return { confirmable: true, failures };
    if (outcome.status === "timeout") {
      failures.push(
        `profile ${dir} was not confirmed removed within ${boundMs}ms ` +
          `(Deno.remove cannot be cancelled, so its deletion is UNCONFIRMED)`,
      );
      return { confirmable: false, failures };
    }
    if (alreadyGone(outcome.error)) return { confirmable: true, failures };
    lastError = outcome.error;
    await new Promise((res) => setTimeout(res, CDP_REMOVE_RETRY_MS));
  }
  failures.push(
    `profile ${dir} could not be removed after ${attempts} attempts: ` +
      `${lastError?.message ?? "no error reported"}`,
  );
  return { confirmable: false, failures };
}

// Strict, fail-visible teardown. Resolves with
// `{ childReaped, profileRemoved, failures }` when cleanup is confirmed, and
// throws a `CdpTeardownError` when it is not — unless the caller supplied the
// error that caused the teardown, in which case THAT error is rethrown with the
// cleanup failure attached as `teardownFailure` (and as `cause` when the primary
// has none of its own), so a cleanup problem can never hide the real one.
export async function teardownChrome(
  chrome,
  { primaryError = null, boundMs = CDP_TEARDOWN_BOUND_MS, remove = Deno.remove } = {},
) {
  const target = chrome ?? {};
  const reap = await reapChild(target.child ?? null, boundMs);
  const removal = await removeProfile(target.userDataDir ?? null, boundMs, remove);
  const failures = [...reap.failures, ...removal.failures];
  const result = {
    childReaped: reap.confirmable,
    profileRemoved: removal.confirmable,
    failures,
  };
  if (failures.length === 0) return result;
  const failure = new CdpTeardownError(`chrome teardown failed: ${failures.join("; ")}`);
  if (!primaryError) throw failure;
  // Annotating the primary is best-effort BY DESIGN. A frozen or non-extensible
  // error cannot take the property, and letting that throw would replace the
  // caller's real error with a TypeError about the annotation - leaving the
  // cleanup problem as the only thing anyone could see. So the annotation is
  // attempted, and when it cannot be attached the cleanup failure is reported on
  // stderr instead of being lost.
  let attached = false;
  try {
    Object.defineProperty(primaryError, "teardownFailure", {
      value: failure.message,
      enumerable: false,
      configurable: true,
      writable: true,
    });
    attached = true;
  } catch {
    attached = false;
  }
  try {
    if (primaryError.cause === undefined) primaryError.cause = failure;
  } catch {
    // a frozen primary keeps whatever cause it already had
  }
  if (!attached) {
    console.error(
      `chrome teardown failed alongside another error: ${failure.message} ` +
        `(the primary error is still thrown unchanged; it could not carry the cleanup failure)`,
    );
  }
  throw primaryError;
}

export async function cdpConnection(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  await new Promise((res, rej) => {
    ws.onopen = () => res();
    ws.onerror = (e) => rej(e);
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  };
  function send(method, params = {}, sessionId) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 120000);
    });
  }
  return {
    ws,
    send,
    // Returns a disposer. Long sweeps add a load listener per page, so a caller
    // that never removes one accumulates them for the whole run.
    onEvent: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close: () => ws.close(),
  };
}

// One page target and its own flat session.
//
// A renderer that wedges — an infinite loop on the main thread, a blocked
// parser — stops answering CDP, and because every message on a session shares
// one ordered queue, the pending call also blocks the calls queued behind it.
// A sweep that keeps one session for the whole run therefore cannot recover:
// the next Page.navigate never resolves and the run stalls while looking busy
// (measured 2026-09-24: a 481-page scan stopped dead at 320/481 for 10+ minutes
// with a live Chrome child; killing it by PID was the only way out).
//
// Recreating a target costs milliseconds, so the sweep can throw the wedged
// renderer away instead of inheriting its queue.
export async function openPageSession(conn, { url = "about:blank", metrics } = {}) {
  const { targetId } = await conn.send("Target.createTarget", { url });
  const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
  await conn.send("Page.enable", {}, sessionId);
  await conn.send("Runtime.enable", {}, sessionId);
  if (metrics) await conn.send("Emulation.setDeviceMetricsOverride", metrics, sessionId);
  return {
    targetId,
    sessionId,
    async close() {
      try {
        await conn.send("Target.closeTarget", { targetId });
      } catch {
        // already gone, or the queue is wedged and the call timed out
      }
    },
  };
}
