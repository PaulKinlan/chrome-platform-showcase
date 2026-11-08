// Shared helpers for the WebTransport connection statistics demos.
// Exposes one global, WTS. Nothing here fabricates a statistic: every number a
// page shows comes from a real WebTransport.getStats() result (or, on the one
// page that offers it, an explicitly labelled recorded trace).
(function () {
  "use strict";

  // Every member of WebTransportConnectionStats in the W3C editor's draft, in
  // spec order, with whether Chromium's IDL
  // (third_party/blink/renderer/modules/webtransport/web_transport_connection_stats.idl)
  // declares it. Chromium omits the byte/packet totals and atSendCapacity.
  const CONNECTION_FIELDS = [
    { name: "bytesSent", type: "unsigned long long", chromium: false },
    { name: "bytesSentOverhead", type: "unsigned long long", chromium: false },
    { name: "bytesAcknowledged", type: "unsigned long long", chromium: false },
    { name: "packetsSent", type: "unsigned long long", chromium: false },
    { name: "bytesLost", type: "unsigned long long", chromium: false },
    { name: "packetsLost", type: "unsigned long long", chromium: false },
    { name: "bytesReceived", type: "unsigned long long", chromium: false },
    { name: "packetsReceived", type: "unsigned long long", chromium: false },
    { name: "smoothedRtt", type: "DOMHighResTimeStamp (ms)", chromium: true },
    { name: "rttVariation", type: "DOMHighResTimeStamp (ms)", chromium: true },
    { name: "minRtt", type: "DOMHighResTimeStamp (ms)", chromium: true },
    { name: "datagrams", type: "required WebTransportDatagramStats", chromium: true },
    { name: "estimatedSendRate", type: "unsigned long long? = null (bit/s)", chromium: true },
    { name: "atSendCapacity", type: "boolean = false", chromium: false },
  ];
  const DATAGRAM_FIELDS = [
    { name: "droppedIncoming", type: "unsigned long long", chromium: true },
    { name: "expiredIncoming", type: "unsigned long long", chromium: true },
    { name: "expiredOutgoing", type: "unsigned long long", chromium: true },
    { name: "lostOutgoing", type: "unsigned long long", chromium: true },
  ];

  const ECHO_SERVERS = [
    {
      url: "https://wt-ord.akaleapi.net:6161/echo",
      label: "Microsoft Edge sample echo server, Chicago (public)",
    },
    {
      url: "https://wt-ams.akaleapi.net:6161/echo",
      label: "Microsoft Edge sample echo server, Amsterdam (public)",
    },
    {
      url: "https://127.0.0.1:4433/echo",
      label: "Your own local echo server (see the feature page)",
    },
  ];

  function hasWebTransport() {
    return typeof globalThis.WebTransport === "function";
  }
  // The exact surface: the method on the prototype. Can return false.
  function supported() {
    return hasWebTransport() && typeof WebTransport.prototype.getStats === "function";
  }

  function err(e) {
    if (e && typeof e === "object" && "name" in e) {
      const src = "source" in e && e.source ? ` (source: ${e.source})` : "";
      return `${e.name}: ${e.message}${src}`;
    }
    return String(e);
  }

  function parseHash(text) {
    const clean = String(text || "").trim();
    if (!clean) return null;
    let bin;
    if (/^[0-9a-f:]+$/i.test(clean) && clean.replace(/:/g, "").length === 64) {
      const hex = clean.replace(/:/g, "");
      const out = new Uint8Array(32);
      for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return out;
    }
    try {
      bin = atob(clean);
    } catch {
      throw new TypeError("Certificate hash must be base64 or 64 hex digits.");
    }
    if (bin.length !== 32) {
      throw new TypeError(`Certificate hash must be 32 bytes (SHA-256); got ${bin.length}.`);
    }
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  function open(url, hashText) {
    const hash = parseHash(hashText);
    const options = hash
      ? { serverCertificateHashes: [{ algorithm: "sha-256", value: hash }] }
      : {};
    return new WebTransport(url, options);
  }

  // Classify one member of a stats dictionary honestly.
  function classify(obj, name) {
    if (obj === null || obj === undefined) return { state: "absent", text: "—" };
    if (!Object.hasOwn(obj, name)) return { state: "absent", text: "not returned" };
    const v = obj[name];
    if (v === null) return { state: "null", text: "null" };
    if (typeof v === "object") return { state: "present", text: "{…}" };
    return { state: "present", text: String(v) };
  }

  function fmtMs(v) {
    return typeof v === "number" ? `${v.toFixed(3)} ms` : "not returned";
  }
  function fmtRate(v) {
    if (v === null) return "null (no estimate)";
    if (typeof v !== "number") return "not returned";
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} Gbit/s`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} Mbit/s`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)} kbit/s`;
    return `${v} bit/s`;
  }
  function count(v) {
    return typeof v === "number" ? String(v) : "not returned";
  }

  // Wire the shared connection panel. Expected ids inside `root`:
  // conn-url, conn-hash, conn-connect, conn-close, conn-state.
  function bindPanel(root, hooks) {
    const $ = (id) => root.querySelector("#" + id);
    const urlEl = $("conn-url"), hashEl = $("conn-hash");
    const connectBtn = $("conn-connect"), closeBtn = $("conn-close"), stateEl = $("conn-state");
    let transport = null;
    let phase = "idle";
    const sup = supported();

    function sync() {
      connectBtn.disabled = !sup || phase === "connecting" || phase === "connected" ||
        phase === "closing";
      closeBtn.disabled = phase !== "connected";
      urlEl.disabled = hashEl.disabled = phase === "connecting" || phase === "connected" ||
        phase === "closing";
    }
    function say(text, cls) {
      stateEl.textContent = text;
      stateEl.className = "status" + (cls ? " " + cls : "");
    }
    if (!hasWebTransport()) {
      say(
        "WebTransport itself is not exposed here (it needs a secure context: https or localhost). Nothing can connect.",
        "fallback",
      );
    } else if (!sup) {
      say(
        "WebTransport exists, but WebTransport.prototype.getStats is undefined in this browser — enable the flag in the banner above. Connecting is disabled because there would be nothing to read.",
        "fallback",
      );
    } else {
      say("Not connected. Enter a WebTransport (HTTP/3) URL and connect.");
    }
    sync();

    connectBtn.addEventListener("click", async () => {
      if (!sup || phase === "connecting" || phase === "connected") return;
      let wt;
      try {
        wt = open(urlEl.value.trim(), hashEl.value);
      } catch (e) {
        say("Could not create the WebTransport: " + err(e), "fallback");
        hooks.onCreateError?.(e);
        return;
      }
      transport = wt;
      phase = "connecting";
      say(`Connecting to ${urlEl.value.trim()} …`);
      sync();
      hooks.onCreate?.(wt);
      wt.closed.then(
        (info) =>
          finish(
            wt,
            `Closed cleanly (closeCode ${info?.closeCode ?? "—"}, reason "${
              info?.reason ?? ""
            }"). Stats stay readable.`,
            "",
            info,
          ),
        (e) => finish(wt, "Connection ended with an error: " + err(e), "fallback", e),
      );
      try {
        await wt.ready;
      } catch (e) {
        finish(wt, "", "fallback", e);
        return;
      }
      if (transport !== wt) return;
      phase = "connected";
      say(`Connected to ${urlEl.value.trim()}.`, "ok");
      sync();
      hooks.onReady?.(wt);
    });
    closeBtn.addEventListener("click", () => {
      if (phase !== "connected" || !transport) return;
      phase = "closing";
      sync();
      try {
        transport.close({ closeCode: 0, reason: "user pressed close" });
      } catch (e) {
        say("close() threw: " + err(e), "fallback");
      }
    });
    function finish(wt, text, cls, info) {
      if (transport !== wt || phase === "ended") return;
      const was = phase;
      phase = "ended";
      if (was === "connecting") {
        text = "Connection failed: " + err(info) +
          ". The handshake never completed, so getStats() has no snapshot to return.";
        cls = "fallback";
      }
      say(text, cls);
      sync();
      hooks.onEnd?.(wt, { was, info, failed: was === "connecting" });
    }
    return {
      get transport() {
        return transport;
      },
      get phase() {
        return phase;
      },
      supported: sup,
    };
  }

  function fillDatalist(el) {
    for (const s of ECHO_SERVERS) {
      const o = document.createElement("option");
      o.value = s.url;
      o.label = s.label;
      el.append(o);
    }
  }

  globalThis.WTS = {
    CONNECTION_FIELDS,
    DATAGRAM_FIELDS,
    ECHO_SERVERS,
    hasWebTransport,
    supported,
    err,
    parseHash,
    open,
    classify,
    fmtMs,
    fmtRate,
    count,
    bindPanel,
    fillDatalist,
  };
})();
