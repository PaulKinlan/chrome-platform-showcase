// Shared helpers for the WebTransport connection statistics concepts.
// Everything here talks to the real WebTransport API. Nothing is simulated:
// when no session can be established, callers get the real error plus a
// plain-language diagnosis of the missing prerequisite, never stand-in stats.

export const DEAD = "https://127.0.0.1:44443/never";
export const DEFAULT_URL = "https://echo.webtransport.day:4433";

// WebTransportConnectionStats, in spec order (w3c.github.io/webtransport §6.13).
// `pooled` marks a "pooled connection stat" — the only members a pooled session sees.
export const CONNECTION_MEMBERS = [
  { name: "bytesSent", unit: "bytes", pooled: false },
  { name: "bytesSentOverhead", unit: "bytes", pooled: false },
  { name: "bytesAcknowledged", unit: "bytes", pooled: false },
  { name: "packetsSent", unit: "packets", pooled: false },
  { name: "bytesLost", unit: "bytes", pooled: false },
  { name: "packetsLost", unit: "packets", pooled: false },
  { name: "bytesReceived", unit: "bytes", pooled: false },
  { name: "packetsReceived", unit: "packets", pooled: false },
  { name: "smoothedRtt", unit: "ms", pooled: true },
  { name: "rttVariation", unit: "ms", pooled: true },
  { name: "minRtt", unit: "ms", pooled: true },
  { name: "estimatedSendRate", unit: "bit/s (nullable)", pooled: true },
  { name: "atSendCapacity", unit: "boolean", pooled: true },
];

// WebTransportDatagramStats (§6.14), reached via stats.datagrams.
export const DATAGRAM_MEMBERS = [
  { name: "droppedIncoming", unit: "datagrams" },
  { name: "expiredIncoming", unit: "datagrams" },
  { name: "expiredOutgoing", unit: "datagrams" },
  { name: "lostOutgoing", unit: "datagrams" },
];

export function hasWebTransport() {
  return typeof globalThis.WebTransport === "function";
}

// The exact surface every concept depends on.
export function hasGetStats() {
  return hasWebTransport() &&
    typeof globalThis.WebTransport.prototype.getStats === "function";
}

export const FLAG_STEPS =
  "chrome://flags/#enable-experimental-web-platform-features, or launch with --enable-blink-features=WebTransportStats";

// Parse a SHA-256 certificate hash typed as hex (spaces/colons allowed).
// Returns null for empty input; throws a TypeError for anything malformed.
export function parseHashHex(text) {
  const clean = String(text || "").replace(/[\s:]/g, "").toLowerCase();
  if (!clean) return null;
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new TypeError(
      "A SHA-256 hash is 64 hex characters (32 bytes); got " + clean.length + " characters.",
    );
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function buildOptions(hashText, extra = {}) {
  const hash = parseHashHex(hashText);
  const options = { ...extra };
  if (hash) options.serverCertificateHashes = [{ algorithm: "sha-256", value: hash }];
  return options;
}

// Plain-language reason a session could not be established. Never guesses
// beyond what the error says; lists the concrete prerequisites to check.
export function diagnose(error, url) {
  let host = url;
  try {
    host = new URL(url).host;
  } catch { /* keep raw */ }
  if (!globalThis.isSecureContext) {
    return "This page is not a secure context, and WebTransport is only exposed to secure contexts (https or localhost).";
  }
  if (!hasWebTransport()) {
    return "This browser exposes no WebTransport constructor at all.";
  }
  if (!error) return "Unknown failure.";
  if (error.name === "TimeoutError") {
    return "No answer from " + host +
      " within the time limit. A QUIC handshake that never completes usually means UDP to that port is dropped by your network or firewall.";
  }
  if (error.name === "SyntaxError") {
    return "The URL was rejected by the constructor: it must be an absolute https: URL with no fragment.";
  }
  if (error.name === "TypeError") {
    return "The constructor rejected the options: " + error.message;
  }
  if (error.name === "NotSupportedError") {
    return "The constructor rejected the certificate-hash option (" + error.message +
      "). serverCertificateHashes cannot be combined with allowPooling, and only sha-256 is accepted.";
  }
  if (
    error.name === "WebTransportError" || error instanceof (globalThis.WebTransportError || Error)
  ) {
    return "No HTTP/3 WebTransport session with " + host + " (source: " + (error.source ?? "n/a") +
      "). The opening handshake failed, which means one of: UDP to that port is blocked on this network; the server is down or does not speak WebTransport over HTTP/3; or its certificate is not trusted (a self-signed development certificate needs its SHA-256 hash pasted above, must use ECDSA, and must be valid for 14 days or less).";
  }
  return error.name + ": " + error.message;
}

// Construct a real session and await ready, with a timeout. Resolves to the
// open transport; rejects with the real error (or a TimeoutError) and closes
// whatever was half-open.
export async function openSession(url, hashText, extra = {}, timeoutMs = 12000) {
  const options = buildOptions(hashText, extra);
  const transport = new WebTransport(url, options);
  transport.closed.catch(() => {});
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new DOMException("ready did not settle within " + timeoutMs / 1000 + " s", "TimeoutError"),
      );
    }, timeoutMs);
  });
  try {
    await Promise.race([transport.ready, timeout]);
    return transport;
  } catch (error) {
    try {
      transport.close();
    } catch { /* already failed */ }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function fmtNumber(v) {
  if (v === undefined) return "absent";
  if (v === null) return "null";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("en") : v.toFixed(3);
  return String(v);
}

export function fmtRate(bitsPerSecond) {
  if (bitsPerSecond === undefined) return "absent";
  if (bitsPerSecond === null) return "null (no estimate yet)";
  if (bitsPerSecond >= 1e6) return (bitsPerSecond / 1e6).toFixed(2) + " Mbit/s";
  if (bitsPerSecond >= 1e3) return (bitsPerSecond / 1e3).toFixed(1) + " kbit/s";
  return bitsPerSecond + " bit/s";
}

// One row per spec member, recording whether this browser exposed it.
export function inventory(stats) {
  const rows = CONNECTION_MEMBERS.map((m) => ({
    path: m.name,
    unit: m.unit,
    pooled: m.pooled,
    present: stats != null && m.name in stats,
    value: stats?.[m.name],
  }));
  for (const m of DATAGRAM_MEMBERS) {
    const d = stats?.datagrams;
    rows.push({
      path: "datagrams." + m.name,
      unit: m.unit,
      pooled: false,
      present: d != null && m.name in d,
      value: d?.[m.name],
    });
  }
  return rows;
}

// Members that are present in `stats` (connection + datagram), as path strings.
export function presentPaths(stats) {
  return inventory(stats).filter((r) => r.present).map((r) => r.path);
}

export function wireEndpointForm(urlInput, hashInput, hashError) {
  function validate() {
    try {
      parseHashHex(hashInput.value);
      hashInput.removeAttribute("aria-invalid");
      hashError.textContent = "";
      return true;
    } catch (error) {
      hashInput.setAttribute("aria-invalid", "true");
      hashError.textContent = error.message;
      return false;
    }
  }
  hashInput.addEventListener("change", validate);
  return { validate, url: () => urlInput.value.trim(), hash: () => hashInput.value };
}

// Datagram writer that works on both shapes of the API: the current spec's
// datagrams.createWritable() and the older single datagrams.writable.
export function datagramWriter(transport) {
  const dg = transport.datagrams;
  if (typeof dg.createWritable === "function") return dg.createWritable().getWriter();
  return dg.writable.getWriter();
}

// Name of the receive-queue size attribute: the spec's
// incomingMaxBufferedDatagrams, else the older incomingHighWaterMark.
export function incomingQueueAttr(transport) {
  const dg = transport.datagrams;
  if ("incomingMaxBufferedDatagrams" in dg) return "incomingMaxBufferedDatagrams";
  if ("incomingHighWaterMark" in dg) return "incomingHighWaterMark";
  return null;
}
