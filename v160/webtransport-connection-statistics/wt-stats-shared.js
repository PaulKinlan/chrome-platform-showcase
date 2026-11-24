// Shared helpers for the "WebTransport connection statistics" concept pages.
// Classic script: exposes window.WTStats. No framework, no fake data — every
// number shown on these pages comes from a real WebTransport.getStats() call.
(() => {
  "use strict";

  const hasWT = typeof WebTransport === "function";
  const hasGetStats = hasWT && typeof WebTransport.prototype.getStats === "function";

  // Every member of WebTransportConnectionStats / WebTransportDatagramStats in
  // the spec (w3c.github.io/webtransport §6.13-6.14), with what Chromium's own
  // IDL (web_transport_connection_stats.idl / web_transport_datagram_stats.idl)
  // declares. `pooled` marks "pooled connection stats" — the only ones a
  // pooled session (transport.[[NewConnection]] is "no") may report.
  const CONNECTION_MEMBERS = [
    {
      name: "bytesSent",
      type: "unsigned long long",
      unit: "bytes",
      pooled: false,
      chromium: false,
    },
    {
      name: "bytesSentOverhead",
      type: "unsigned long long",
      unit: "bytes",
      pooled: false,
      chromium: false,
    },
    {
      name: "bytesAcknowledged",
      type: "unsigned long long",
      unit: "bytes",
      pooled: false,
      chromium: false,
      atRisk: true,
    },
    {
      name: "packetsSent",
      type: "unsigned long long",
      unit: "packets",
      pooled: false,
      chromium: false,
    },
    {
      name: "bytesLost",
      type: "unsigned long long",
      unit: "bytes",
      pooled: false,
      chromium: false,
    },
    {
      name: "packetsLost",
      type: "unsigned long long",
      unit: "packets",
      pooled: false,
      chromium: false,
    },
    {
      name: "bytesReceived",
      type: "unsigned long long",
      unit: "bytes",
      pooled: false,
      chromium: false,
    },
    {
      name: "packetsReceived",
      type: "unsigned long long",
      unit: "packets",
      pooled: false,
      chromium: false,
    },
    { name: "smoothedRtt", type: "DOMHighResTimeStamp", unit: "ms", pooled: true, chromium: true },
    { name: "rttVariation", type: "DOMHighResTimeStamp", unit: "ms", pooled: true, chromium: true },
    { name: "minRtt", type: "DOMHighResTimeStamp", unit: "ms", pooled: true, chromium: true },
    {
      name: "datagrams",
      type: "required WebTransportDatagramStats",
      unit: "dictionary",
      pooled: false,
      chromium: true,
    },
    {
      name: "estimatedSendRate",
      type: "unsigned long long? = null",
      unit: "bits/s",
      pooled: true,
      chromium: true,
    },
    {
      name: "atSendCapacity",
      type: "boolean = false",
      unit: "flag",
      pooled: true,
      chromium: false,
    },
  ];
  const DATAGRAM_MEMBERS = [
    {
      name: "droppedIncoming",
      type: "unsigned long long",
      unit: "datagrams",
      chromium: true,
      cause:
        "the page did not read datagrams.readable before the incoming queue overflowed (incomingHighWaterMark)",
    },
    {
      name: "expiredIncoming",
      type: "unsigned long long",
      unit: "datagrams",
      chromium: true,
      cause: "a received datagram sat unread for longer than incomingMaxAge",
    },
    {
      name: "expiredOutgoing",
      type: "unsigned long long",
      unit: "datagrams",
      chromium: true,
      cause: "a queued datagram waited longer than outgoingMaxAge before it could be sent",
    },
    {
      name: "lostOutgoing",
      type: "unsigned long long",
      unit: "datagrams",
      chromium: true,
      cause: "a sent datagram was declared lost (RFC 9002 §6.1)",
    },
  ];

  const DEAD = "https://127.0.0.1:44443/never";

  function fmtMs(v) {
    return typeof v === "number" ? v.toFixed(3) + " ms" : "absent";
  }
  function fmtBps(v) {
    if (v === null) return "null (no estimate right now)";
    if (typeof v !== "number") return "absent";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + " Mbit/s (" + v + " bit/s)";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + " kbit/s (" + v + " bit/s)";
    return v + " bit/s";
  }
  function fmtValue(name, v) {
    if (name === "estimatedSendRate") return fmtBps(v);
    if (/Rtt|rttVariation/.test(name)) return fmtMs(v);
    if (v === undefined) return "absent";
    return JSON.stringify(v);
  }

  function b64ToBytes(b64) {
    const clean = b64.replace(/\s+/g, "");
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Reads the shared endpoint fieldset (#wt-url, #wt-hash) and returns
  // { url, options } or throws an Error with a user-facing message.
  function readEndpoint(extra = {}) {
    const urlEl = document.getElementById("wt-url");
    const hashEl = document.getElementById("wt-hash");
    const url = (urlEl?.value || "").trim();
    if (!/^https:\/\//i.test(url)) {
      throw new Error("The endpoint must be an https:// URL (WebTransport runs over HTTP/3).");
    }
    const options = { ...extra };
    const hash = (hashEl?.value || "").trim();
    if (hash) {
      let bytes;
      try {
        bytes = b64ToBytes(hash);
      } catch {
        throw new Error("The certificate hash is not valid base64.");
      }
      if (bytes.length !== 32) {
        throw new Error(
          "A SHA-256 certificate hash is 32 bytes; this decodes to " + bytes.length + ".",
        );
      }
      options.serverCertificateHashes = [{ algorithm: "sha-256", value: bytes }];
    }
    return { url, options };
  }

  // Construct a transport and wait for ready with a timeout. Never fakes a
  // session: on failure the real error is returned.
  async function open(url, options, timeoutMs = 10000) {
    const transport = new WebTransport(url, options);
    transport.closed.catch(() => {});
    let timer;
    try {
      await Promise.race([
        transport.ready,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("No handshake within " + timeoutMs / 1000 + " s.")),
            timeoutMs,
          );
        }),
      ]);
      return { transport, error: null };
    } catch (error) {
      try {
        transport.close();
      } catch { /* already failed */ }
      return { transport, error };
    } finally {
      clearTimeout(timer);
    }
  }

  function errText(e) {
    return (e && e.name ? e.name : "Error") + ": " +
      String(e && e.message ? e.message : e).replace(/\.+$/, "");
  }

  // Wires the "use my values" persistence for the endpoint fieldset so a
  // developer pointing at their own local server does not retype it per page.
  function wireEndpointMemory() {
    const urlEl = document.getElementById("wt-url");
    const hashEl = document.getElementById("wt-hash");
    if (!urlEl) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("wt-stats-endpoint") || "null");
      if (
        saved && typeof saved.url === "string" && !new URLSearchParams(location.search).has("url")
      ) {
        urlEl.value = saved.url;
        if (hashEl && typeof saved.hash === "string") hashEl.value = saved.hash;
      }
    } catch { /* storage unavailable — defaults stand */ }
    const params = new URLSearchParams(location.search);
    if (params.get("url")) urlEl.value = params.get("url");
    if (hashEl && params.get("hash")) hashEl.value = params.get("hash");
    const save = () => {
      try {
        sessionStorage.setItem(
          "wt-stats-endpoint",
          JSON.stringify({ url: urlEl.value, hash: hashEl ? hashEl.value : "" }),
        );
      } catch { /* ignore */ }
    };
    urlEl.addEventListener("change", save);
    hashEl?.addEventListener("change", save);
  }

  globalThis.WTStats = {
    hasWT,
    hasGetStats,
    DEAD,
    CONNECTION_MEMBERS,
    DATAGRAM_MEMBERS,
    fmtMs,
    fmtBps,
    fmtValue,
    readEndpoint,
    open,
    errText,
    wireEndpointMemory,
  };
})();
