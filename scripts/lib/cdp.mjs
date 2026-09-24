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

export async function launchChrome() {
  const userDataDir = await Deno.makeTempDir({ prefix: "cps-cdp-" });
  const port = 9200 + Math.floor(Math.random() * 400);
  const child = new Deno.Command(CHROME_BIN, {
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
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      wsUrl = (await r.json()).webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!wsUrl) {
    try {
      child.kill();
    } catch {
      // ignore
    }
    throw new Error("chrome devtools endpoint never came up");
  }
  return { child, wsUrl, userDataDir };
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
