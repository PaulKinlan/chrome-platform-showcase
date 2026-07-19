// Minimal Chrome DevTools Protocol client (Deno) shared by the responsive
// harnesses. Launches headless Chrome and drives it over a flat CDP session.
// Portable across the responsive-check matrix and the cheap overflow-scan.

export const CHROME_BIN = Deno.env.get("CHROME_BIN") ??
  ["/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/opt/google/chrome/chrome"]
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
      }, 30000);
    });
  }
  return { ws, send, onEvent: (fn) => listeners.add(fn), close: () => ws.close() };
}
