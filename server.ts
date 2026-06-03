// chrome-platform-showcase
// Deno HTTP entry. The index and each release page are rendered live from the
// chromestatus.com JSON API so the catalogue always reflects what's currently
// shipping. Per-feature demos live as static files inside the matching /v<N>/
// folder once they've been built.

import {
  Channel,
  Channels,
  chromeStatusUrl,
  FeatureSummary,
  getChannels,
  getMilestoneFeatures,
  MilestoneFeatures,
  slugify,
} from "./lib/chromestatus.ts";

const PORT = Number(Deno.env.get("PORT") ?? 3000);
const CHROMIUM_DASH_BASE = "https://chromiumdash.appspot.com";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  woff2: "font/woff2",
};

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ----- Last-commit info (fetched from GitHub, cached for 5 minutes) -----

interface CommitInfo {
  sha: string;
  shortSha: string;
  date: string;
  htmlUrl: string;
}

const COMMIT_TTL_MS = 5 * 60 * 1000;
let commitCache: { at: number; value: CommitInfo | null } | null = null;

async function getLatestCommit(): Promise<CommitInfo | null> {
  if (commitCache && Date.now() - commitCache.at < COMMIT_TTL_MS) return commitCache.value;
  try {
    const res = await fetch(
      "https://api.github.com/repos/PaulKinlan/chrome-platform-showcase/commits/main",
      { headers: { accept: "application/vnd.github+json" } },
    );
    if (!res.ok) {
      commitCache = { at: Date.now(), value: null };
      return null;
    }
    const data = await res.json();
    const value: CommitInfo = {
      sha: data.sha,
      shortSha: String(data.sha).slice(0, 7),
      date: data.commit?.author?.date ?? data.commit?.committer?.date ?? "",
      htmlUrl: data.html_url,
    };
    commitCache = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

function formatCommitLine(c: CommitInfo | null): string {
  if (!c) return "";
  const when = c.date ? new Date(c.date) : null;
  const relative = when ? relativeTime(when) : "";
  const absolute = when
    ? when.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
    : "";
  return `<p class="updated-line">Last updated ${escapeHTML(relative)} <span class="updated-abs">(${
    escapeHTML(absolute)
  })</span> &middot; commit <a href="${
    escapeHTML(c.htmlUrl)
  }" target="_blank" rel="noopener"><code>${escapeHTML(c.shortSha)}</code></a></p>`;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// ----- Milestone schedule info (fetched from Chromium Dash, cached for 1 hour) -----

interface MilestoneSchedule {
  mstone: number;
  stable_date?: string;
  late_stable_date?: string;
  stable_refresh_first?: string;
}

interface MilestoneScheduleResponse {
  mstones?: MilestoneSchedule[];
}

const MILESTONE_SCHEDULE_TTL_MS = 60 * 60 * 1000;
const milestoneScheduleCache = new Map<number, {
  at: number;
  value: MilestoneSchedule | null;
}>();

async function getMilestoneSchedule(milestone: number): Promise<MilestoneSchedule | null> {
  const hit = milestoneScheduleCache.get(milestone);
  if (hit && Date.now() - hit.at < MILESTONE_SCHEDULE_TTL_MS) return hit.value;

  try {
    const url = new URL("/fetch_milestone_schedule", CHROMIUM_DASH_BASE);
    url.searchParams.set("mstone", String(milestone));
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`chromiumdash ${milestone} returned ${res.status}`);
    const data = await res.json() as MilestoneScheduleResponse;
    const value = data.mstones?.find((m) => m.mstone === milestone) ?? null;
    milestoneScheduleCache.set(milestone, { at: Date.now(), value });
    return value;
  } catch {
    milestoneScheduleCache.set(milestone, { at: Date.now(), value: null });
    return null;
  }
}

async function readPublicAsset(path: string): Promise<Response> {
  try {
    const file = await Deno.readFile("." + path);
    const ext = path.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function readReleaseAsset(release: string, sub: string): Promise<Response | null> {
  if (sub.includes("..")) return null;
  // Trailing slash or path with no extension: serve <path>/index.html.
  let key = sub.replace(/^\/+/, "");
  if (!key) return null;
  if (key.endsWith("/")) key += "index.html";
  else if (!/\.[a-z0-9]+$/i.test(key)) key += "/index.html";

  try {
    const file = await Deno.readFile(`./${release}/${key}`);
    const ext = key.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

function renderReferrerEcho(req: Request): Response {
  const url = new URL(req.url);
  const payload = {
    policy: url.searchParams.get("policy") ?? "default",
    method: req.method,
    referer: req.headers.get("referer") ?? "",
    origin: req.headers.get("origin") ?? "",
    secFetchSite: req.headers.get("sec-fetch-site") ?? "",
    note:
      "This endpoint echoes request metadata so CSS URL request modifier demos can compare per-request referrer behavior.",
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function renderDeviceMemoryClientHintRoute(req: Request, sub: string): Response | null {
  if (sub !== "/update-device-memory-api-limits/compatibility-lab/client-hint-echo") {
    return null;
  }

  const payload = {
    endpoint: new URL(req.url).pathname,
    optInResponseHeader: "Accept-CH: Sec-CH-Device-Memory",
    expectedRequestHeader: "Sec-CH-Device-Memory",
    received: {
      secCHDeviceMemory: req.headers.get("sec-ch-device-memory"),
      accept: req.headers.get("accept"),
      userAgent: req.headers.get("user-agent"),
    },
    note: req.headers.get("sec-ch-device-memory")
      ? "The browser sent the Device Memory client hint after this origin opted in."
      : "No Device Memory client hint was received. That is the failure mode for unsupported browsers, first requests before opt-in, or clients that do not expose this Chromium-only hint.",
  };

  return jsonResponse(payload, {
    headers: {
      "accept-ch": "Sec-CH-Device-Memory",
      "vary": "Sec-CH-Device-Memory",
      "cache-control": "no-store",
    },
  });
}

const UA_CH_MIGRATION_ECHO_ROUTE =
  "/reduced-user-agent-strings-by-default/ua-ch-migration/client-hints-echo";

const UA_CH_LOW_ENTROPY_HEADERS = [
  "Sec-CH-UA",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Platform",
];

const UA_CH_HIGH_ENTROPY_HEADERS = [
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-WoW64",
];

function renderUaChMigrationEchoRoute(req: Request, sub: string): Response | null {
  if (sub !== UA_CH_MIGRATION_ECHO_ROUTE) return null;

  const url = new URL(req.url);
  const requestedHighEntropyHints = url.searchParams.getAll("hint").flatMap((value) =>
    value.split(",").map((hint) => hint.trim()).filter((hint) =>
      UA_CH_HIGH_ENTROPY_HEADERS.includes(hint)
    )
  );
  const suppressHighEntropyOptIn = url.searchParams.get("hints") === "none";
  const optInHints = suppressHighEntropyOptIn
    ? []
    : requestedHighEntropyHints.length
    ? [...new Set(requestedHighEntropyHints)]
    : ["Sec-CH-UA-Platform-Version", "Sec-CH-UA-Full-Version-List"];
  const varyHeaders = [
    "User-Agent",
    ...UA_CH_LOW_ENTROPY_HEADERS,
    ...optInHints,
  ];
  const responseHeaders: Record<string, string> = {
    "vary": [...new Set(varyHeaders)].join(", "),
    "cache-control": "no-store",
  };
  if (optInHints.length) responseHeaders["accept-ch"] = optInHints.join(", ");
  const observedHeaderNames = [
    "User-Agent",
    ...UA_CH_LOW_ENTROPY_HEADERS,
    ...UA_CH_HIGH_ENTROPY_HEADERS,
  ];
  const requestHeaders = Object.fromEntries(
    observedHeaderNames.map((name) => [name, req.headers.get(name)]),
  );
  const missingOptedInHints = optInHints.filter((name) => !req.headers.has(name));

  return jsonResponse({
    endpoint: url.pathname,
    status: 200,
    method: req.method,
    receivedAt: new Date().toISOString(),
    requestHeaders,
    responseHeaders: {
      "accept-ch": responseHeaders["accept-ch"] ?? "<omitted>",
      "vary": responseHeaders["vary"],
      "cache-control": responseHeaders["cache-control"],
    },
    optInHints,
    missingOptedInHints,
    note: optInHints.length === 0
      ? "This response deliberately omits Accept-CH because the selected migration path does not need high-entropy UA-CH headers."
      : missingOptedInHints.length
      ? "High-entropy UA-CH headers were not present on this request. That is expected on first requests, unsupported browsers, or clients that decline these hints."
      : "The browser sent every high-entropy UA-CH header this route opted in to receive.",
  }, { headers: responseHeaders });
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

const CDT_MEASURE_ROUTE =
  "/compression-dictionary-transport-with-shared-brotli-and-shared-zstandard/cdt-shared/measure";
const CDT_MAX_MEASURE_BYTES = 64 * 1024;

async function sha256Base64(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function renderCompressionDictionaryMeasureRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub !== CDT_MEASURE_ROUTE) return null;

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST dictionary and response text to measure compression." }, {
      status: 405,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const dictionary = typeof body.dictionary === "string" ? body.dictionary : "";
  const response = typeof body.response === "string" ? body.response : "";
  const encoder = new TextEncoder();
  const dictionaryBytes = encoder.encode(dictionary);
  const responseBytes = encoder.encode(response);
  if (dictionaryBytes.byteLength + responseBytes.byteLength > CDT_MAX_MEASURE_BYTES) {
    return jsonResponse({
      error: "Keep the dictionary and response under 64 KiB for this live demo.",
    }, { status: 413 });
  }

  const actualHash = await sha256Base64(dictionaryBytes);
  const advertisedHash = typeof body.availableDictionary === "string"
    ? body.availableDictionary
    : actualHash;
  const dictionaryMatches = advertisedHash === actualHash;

  try {
    const { brotliCompressSync, constants, gzipSync } = await import("node:zlib");
    const { deflateRaw } = await import("npm:pako@2.1.0");
    const brotliOptions = {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: 6,
      },
    };
    const rawBytes = responseBytes.byteLength;
    const gzipBytes = gzipSync(responseBytes).byteLength;
    const brotliBytes = brotliCompressSync(responseBytes, brotliOptions).byteLength;
    const deflateBytes = deflateRaw(responseBytes).byteLength;
    const dictionaryDeflateBytes = deflateRaw(responseBytes, {
      dictionary: dictionaryBytes,
    }).byteLength;
    const dcbHeaderBytes = 36;
    const dictionaryFramedBytes = dictionaryDeflateBytes + dcbHeaderBytes;
    const selectedEncoding = dictionaryMatches ? "dcb" : "br";
    const selectedBytes = dictionaryMatches ? dictionaryFramedBytes : brotliBytes;

    return jsonResponse({
      rawBytes,
      gzipBytes,
      brotliBytes,
      deflateBytes,
      dictionaryDeflateBytes,
      dcbHeaderBytes,
      dictionaryFramedBytes,
      selectedEncoding,
      selectedBytes,
      dictionaryMatches,
      actualHash,
      advertisedHash,
      dictionaryId: "cart-v42",
      note: dictionaryMatches
        ? "The server accepted the advertised dictionary hash. The dcb byte count uses RFC 9842's 36-byte dcb header plus a real zlib dictionary-compressed payload as a local stand-in for Shared Brotli."
        : "The advertised hash did not match the dictionary bytes, so the server ignored dcb/dcz and fell back to regular Brotli.",
    });
  } catch (err) {
    return jsonResponse({ error: `Compression route failed: ${(err as Error).message}` }, {
      status: 500,
    });
  }
}

function withHeaders(response: Response, extraHeaders: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function clampNumber(value: string | null, min: number, max: number, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function renderResponsiveIframeEmbed(req: Request, sub: string): Response | null {
  if (sub !== "/responsively-sized-iframe/embed") return null;

  const url = new URL(req.url);
  const demo = url.searchParams.get("demo") ?? "blocks";
  const report = url.searchParams.get("report") === "1";
  const channel = url.searchParams.get("channel") ?? demo;
  const count = demo === "feed"
    ? clampNumber(url.searchParams.get("count"), 0, 24, 0)
    : clampNumber(url.searchParams.get("count"), 1, 12, 3);

  const title = demo === "accordion"
    ? "Responsive FAQ embed"
    : demo === "feed"
    ? "Responsive feed embed"
    : "Responsive block embed";
  const body = demo === "accordion"
    ? `<section class="faq" id="faq"></section>`
    : demo === "feed"
    ? `<section class="feed" id="feed"></section>`
    : `<section class="blocks" id="blocks"></section>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(title)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 14px;
      background: var(--bg-paper);
      color: var(--text-black);
      font-family: system-ui, sans-serif;
    }
    .block, .feed-item, .faq-item {
      border: 1px solid var(--border-black);
      background: var(--bg-ivory);
      margin: 0 0 10px;
      box-shadow: 2px 2px 0 var(--border-black);
    }
    .block {
      border-left: 5px solid var(--accent-blue);
      padding: 12px;
      font-size: 0.9rem;
    }
    .feed-item { padding: 12px 14px; font-family: Georgia, serif; }
    .feed-meta {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.74rem;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .feed-body { font-size: 0.9rem; line-height: 1.55; }
    .feed-media {
      margin-top: 10px;
      min-height: 72px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent-blue) 12%, var(--bg-ivory));
      border: 1px dashed var(--accent-blue);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      color: var(--accent-blue);
    }
    .faq-button {
      width: 100%;
      border: 0;
      border-bottom: 1px solid var(--border-black);
      background: var(--bg-stone);
      color: var(--text-black);
      padding: 12px;
      font: 700 0.86rem ui-monospace, SFMono-Regular, Menlo, monospace;
      text-align: left;
      cursor: pointer;
    }
    .faq-answer {
      display: none;
      padding: 12px;
      font-size: 0.9rem;
      line-height: 1.55;
    }
    .faq-item[data-open="true"] .faq-answer { display: block; }
    .fixture-note {
      margin: 0 0 12px;
      font: 0.72rem ui-monospace, SFMono-Regular, Menlo, monospace;
      color: var(--text-muted);
    }
  </style>
</head>
<body data-demo="${escapeHTML(demo)}">
  <p class="fixture-note">Embedded document served with <code>Supports-Responsive-Sizing: 1</code>.</p>
  ${body}
  <script>
    const reportSize = ${report ? "true" : "false"};
    const channel = ${JSON.stringify(channel)};
    const feedItems = [
      ["Alex Rivera", "2m ago", "Responsive iframes remove the fixed-height contract from embeddable widgets.", false],
      ["Jamie Chen", "5m ago", "The browser can now propagate layout overflow instead of waiting for a ResizeObserver round trip.", true],
      ["Sam Patel", "12m ago", "This kills the nested-scroll widget pattern that made embeds feel broken on mobile.", false],
      ["Morgan Lee", "18m ago", "A feed that grows in the parent page keeps the reading flow intact.", false],
      ["Casey Zhou", "25m ago", "Third-party widgets can opt in safely through a response header controlled by their server.", true],
      ["Drew Kim", "31m ago", "The legacy postMessage path is still useful as a fallback, but it is no longer the ideal path.", false]
    ];
    const faqs = [
      ["What has to opt in?", "Both sides. The parent iframe has allow-responsive-sizing and this embedded document sends Supports-Responsive-Sizing: 1."],
      ["What changes when an item opens?", "The embedded document's layout overflow grows. Chrome 150 can propagate that size to the iframe box in the parent page."],
      ["Why a response header?", "It lets the embedded origin consent to exposing its layout overflow to the parent, including cross-origin embeds."],
      ["What is the fallback?", "Older browsers can keep using ResizeObserver and postMessage, but the parent should only apply that fallback when native support is absent."]
    ];
    let blockCount = ${count};
    let feedCount = ${count};

    function sendSize() {
      if (!reportSize) return;
      requestAnimationFrame(() => {
        parent.postMessage({
          type: "responsive-iframe-height",
          channel,
          height: document.documentElement.scrollHeight
        }, "*");
      });
    }

    function renderBlocks() {
      const root = document.getElementById("blocks");
      if (!root) return;
      root.innerHTML = "";
      for (let i = 1; i <= blockCount; i++) {
        const item = document.createElement("article");
        item.className = "block";
        item.textContent = "Embedded content block " + i + " - layout overflow contributes to iframe height.";
        root.appendChild(item);
      }
      sendSize();
    }

    function renderFeed() {
      const root = document.getElementById("feed");
      if (!root) return;
      root.innerHTML = "";
      for (let i = 0; i < feedCount; i++) {
        const source = feedItems[i % feedItems.length];
        const item = document.createElement("article");
        item.className = "feed-item";
        item.innerHTML =
          '<div class="feed-meta"><strong>' + source[0] + '</strong> - ' + source[1] + '</div>' +
          '<div class="feed-body">' + source[2] + '</div>' +
          (source[3] ? '<div class="feed-media">media preview</div>' : '');
        root.appendChild(item);
      }
      sendSize();
    }

    function renderAccordion() {
      const root = document.getElementById("faq");
      if (!root || root.childElementCount) return;
      for (const [question, answer] of faqs) {
        const item = document.createElement("article");
        item.className = "faq-item";
        item.dataset.open = "false";
        const button = document.createElement("button");
        button.className = "faq-button";
        button.type = "button";
        button.textContent = question;
        const content = document.createElement("div");
        content.className = "faq-answer";
        content.textContent = answer;
        button.addEventListener("click", () => {
          item.dataset.open = item.dataset.open === "true" ? "false" : "true";
          sendSize();
        });
        item.append(button, content);
        root.appendChild(item);
      }
      sendSize();
    }

    addEventListener("message", (event) => {
      const data = event.data || {};
      if (data.type === "set-block-count") {
        const nextCount = Number(data.count);
        blockCount = Number.isFinite(nextCount)
          ? Math.max(1, Math.min(12, nextCount))
          : blockCount;
        renderBlocks();
      }
      if (data.type === "set-feed-count") {
        const nextCount = Number(data.count);
        feedCount = Number.isFinite(nextCount)
          ? Math.max(0, Math.min(24, nextCount))
          : feedCount;
        renderFeed();
      }
      if (data.type === "add-feed-post") {
        feedCount = Math.max(0, Math.min(24, feedCount + 1));
        renderFeed();
      }
      if (data.type === "reset-feed") {
        feedCount = 0;
        renderFeed();
      }
    });

    renderBlocks();
    renderFeed();
    renderAccordion();
    addEventListener("load", sendSize);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "supports-responsive-sizing": "1",
    },
  });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function randomBase64Url(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function parseCookies(req: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, rawValue.join("="));
  }
  return cookies;
}

interface WebAuthnSignalCredential {
  id: string;
  createdAt: string;
  revokedAt: string | null;
  source: "webauthn-create";
}

interface WebAuthnSignalSession {
  id: string;
  userId: string;
  name: string;
  displayName: string;
  challenge: string | null;
  credentials: WebAuthnSignalCredential[];
}

const WEBAUTHN_SIGNAL_COOKIE = "showcase_webauthn_signal";
const webAuthnSignalSessions = new Map<string, WebAuthnSignalSession>();

function getWebAuthnSignalSession(req: Request): {
  session: WebAuthnSignalSession;
  setCookie?: string;
} {
  const cookies = parseCookies(req);
  let id = cookies.get(WEBAUTHN_SIGNAL_COOKIE);
  let setCookie: string | undefined;
  if (!id || !webAuthnSignalSessions.has(id)) {
    id = randomBase64Url(18);
    setCookie = `${WEBAUTHN_SIGNAL_COOKIE}=${id}; Path=/v130/webauthn-signal-api; SameSite=Lax`;
    webAuthnSignalSessions.set(id, {
      id,
      userId: base64UrlEncode(new TextEncoder().encode(`showcase-user-${id}`)),
      name: "alice@example.com",
      displayName: "Alice Example",
      challenge: null,
      credentials: [],
    });
  }
  return { session: webAuthnSignalSessions.get(id)!, setCookie };
}

function webAuthnRpId(req: Request): string {
  const host = new URL(req.url).hostname;
  return host === "0.0.0.0" ? "localhost" : host;
}

function webAuthnSessionPayload(req: Request, session: WebAuthnSignalSession): unknown {
  return {
    rpId: webAuthnRpId(req),
    user: {
      id: session.userId,
      name: session.name,
      displayName: session.displayName,
    },
    credentials: session.credentials,
  };
}

async function renderWebAuthnSignalRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/webauthn-signal-api/")) return null;
  const route = sub.slice("/webauthn-signal-api".length);
  const { session, setCookie } = getWebAuthnSignalSession(req);
  const headers = new Headers();
  if (setCookie) headers.set("set-cookie", setCookie);

  if (route === "/session-state") {
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/register-options") {
    session.challenge = randomBase64Url(32);
    const rpId = webAuthnRpId(req);
    return jsonResponse({
      publicKey: {
        challenge: session.challenge,
        rp: { name: "Chrome Platform Showcase", id: rpId },
        user: {
          id: session.userId,
          name: session.name,
          displayName: session.displayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        attestation: "none",
        timeout: 60000,
      },
    }, { headers });
  }

  if (route === "/register" && req.method === "POST") {
    const body = await req.json();
    const clientData = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body.response?.clientDataJSON ?? "")),
    );
    const expectedOrigin = new URL(req.url).origin;
    if (clientData.type !== "webauthn.create") {
      return jsonResponse({ error: "Expected webauthn.create client data." }, {
        status: 400,
        headers,
      });
    }
    if (!session.challenge || clientData.challenge !== session.challenge) {
      return jsonResponse({ error: "Challenge did not match this server session." }, {
        status: 400,
        headers,
      });
    }
    if (clientData.origin !== expectedOrigin) {
      return jsonResponse({ error: `Origin mismatch: ${clientData.origin}` }, {
        status: 400,
        headers,
      });
    }
    if (!session.credentials.some((credential) => credential.id === body.id)) {
      session.credentials.unshift({
        id: body.id,
        createdAt: new Date().toISOString(),
        revokedAt: null,
        source: "webauthn-create",
      });
    }
    session.challenge = null;
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/revoke" && req.method === "POST") {
    const body = await req.json();
    const credential = session.credentials.find((item) => item.id === body.id);
    if (!credential) {
      return jsonResponse({ error: "Credential not found." }, { status: 404, headers });
    }
    credential.revokedAt = credential.revokedAt ? null : new Date().toISOString();
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/reset" && req.method === "POST") {
    session.challenge = null;
    session.credentials = [];
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  return null;
}

// ----- Storage Access Headers live probe -----

interface StorageAccessHeaderEvent {
  id: string;
  session: string;
  receivedAt: string;
  request: Record<string, string | null>;
  config: Record<string, string>;
  responseHeaders: Record<string, string>;
}

const storageAccessHeaderEvents: StorageAccessHeaderEvent[] = [];

function renderStorageAccessHeadersRoute(req: Request, sub: string): Response | null {
  if (!sub.startsWith("/storage-access-headers/")) return null;
  const route = sub.slice("/storage-access-headers".length);
  if (route !== "/probe" && route !== "/events" && route !== "/reset") return null;

  const url = new URL(req.url);
  const session = url.searchParams.get("session") ?? "default";

  if (route === "/events") {
    return jsonResponse({
      events: storageAccessHeaderEvents.filter((event) => event.session === session).slice(0, 20),
    });
  }

  if (route === "/reset" && req.method === "POST") {
    for (let i = storageAccessHeaderEvents.length - 1; i >= 0; i--) {
      if (storageAccessHeaderEvents[i].session === session) storageAccessHeaderEvents.splice(i, 1);
    }
    return jsonResponse({ reset: true, session });
  }

  const activate = url.searchParams.get("activate") ?? "retry";
  const grant = url.searchParams.get("grant") === "1";
  const resource = url.searchParams.get("resource") ?? "fetch";
  const phase = url.searchParams.get("phase") ?? "initial";
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const responseHeaders: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "vary": "Sec-Fetch-Storage-Access, Origin, Cookie",
  };
  if (grant && activate === "retry") {
    responseHeaders["activate-storage-access"] = `retry; allowed-origin="${origin}"`;
  } else if (grant && activate === "load") {
    responseHeaders["activate-storage-access"] = "load";
  }

  const event: StorageAccessHeaderEvent = {
    id: randomBase64Url(9),
    session,
    receivedAt: new Date().toISOString(),
    request: {
      method: req.method,
      url: url.pathname + url.search,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      cookie: req.headers.get("cookie"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      secFetchMode: req.headers.get("sec-fetch-mode"),
      secFetchDest: req.headers.get("sec-fetch-dest"),
      secFetchStorageAccess: req.headers.get("sec-fetch-storage-access"),
    },
    config: { activate, grant: String(grant), resource, phase },
    responseHeaders,
  };
  storageAccessHeaderEvents.unshift(event);
  storageAccessHeaderEvents.splice(100);

  return new Response(
    JSON.stringify(
      {
        accepted: true,
        event,
        observed: storageAccessHeaderEvents.filter((item) => item.session === session).slice(0, 10),
        note:
          "This endpoint emits real Storage Access Headers response headers and records the request headers that the browser actually sent.",
      },
      null,
      2,
    ),
    {
      status: grant && activate === "retry" && phase === "initial" ? 401 : 200,
      headers: responseHeaders,
    },
  );
}

async function renderProtectedAudienceBiddingRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  const prefix = "/protected-audience-bidding-auction-services/pa-bas";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  if (route !== "/auction") return null;

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST an encrypted B&A payload to this endpoint." }, {
      status: 405,
    });
  }

  const bytes = await req.arrayBuffer();
  return jsonResponse({
    received: true,
    receivedBytes: bytes.byteLength,
    contentType: req.headers.get("content-type") ?? "",
    requestId: req.headers.get("x-pa-request-id") ?? "",
    status: "encrypted-payload-received",
    nextStep:
      "A real seller Bidding & Auction service running in a trusted execution environment must decrypt and score this request. The local showcase server does not fabricate a winning ad response.",
  }, { status: 501 });
}

async function renderAttributionTriggerContextRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  const prefix =
    "/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont/trigger-context-id-builder";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  if (route !== "/register-trigger") return null;

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a trigger registration JSON body." }, { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Expected JSON request body." }, { status: 400 });
  }

  const registration = body.registration;
  if (!registration || typeof registration !== "object" || Array.isArray(registration)) {
    return jsonResponse({ error: "registration must be an object." }, { status: 400 });
  }

  const conversionCount = Math.max(1, Math.min(500, Number(body.conversionCount ?? 1) || 1));
  const triggerContext = (registration as Record<string, unknown>).trigger_context_id;
  const hasTriggerContext = typeof triggerContext === "string" && triggerContext.length > 0;
  const legacyLimit = 20;
  const acceptedReports = hasTriggerContext
    ? conversionCount
    : Math.min(conversionCount, legacyLimit);
  const droppedReports = conversionCount - acceptedReports;
  const headerValue = JSON.stringify(registration);
  const headers = new Headers({
    "Attribution-Reporting-Register-Trigger": headerValue,
    "Attribution-Reporting-Eligible": "trigger",
  });

  return jsonResponse({
    registered: true,
    headerName: "Attribution-Reporting-Register-Trigger",
    headerValue,
    eligibleHeader: "Attribution-Reporting-Eligible: trigger",
    triggerContextIdPresent: hasTriggerContext,
    conversionCount,
    acceptedReports,
    droppedReports,
    legacyLimit,
    responsePreview:
      `HTTP/1.1 204 No Content\nAttribution-Reporting-Eligible: trigger\nAttribution-Reporting-Register-Trigger: ${headerValue}`,
  }, { status: 200, headers });
}

// ----- Email Verification Protocol server validator -----

let evpKeyPairPromise: Promise<CryptoKeyPair> | null = null;
const evpUsedNonces = new Set<string>();

function getEvpKeyPair(): Promise<CryptoKeyPair> {
  evpKeyPairPromise ??= crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  return evpKeyPairPromise;
}

async function signEvpJwt(payload: Record<string, unknown>): Promise<string> {
  const keyPair = await getEvpKeyPair();
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const header = {
    alg: "ES256",
    typ: "evp+jwt",
    kid: "showcase-evp-p256",
    jwk: {
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
      y: publicJwk.y,
    },
  };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyEvpJwt(
  token: string,
  expectedAud: string,
  expectedNonce: string,
): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  const checks: Array<Record<string, unknown>> = [];
  const now = Math.floor(Date.now() / 1000);
  let header: Record<string, unknown> = {};
  let payload: Record<string, unknown> = {};
  let signatureOk = false;

  if (parts.length !== 3) {
    return {
      valid: false,
      checks: [{
        title: "JWT structure is valid",
        detail: "Expected three base64url-encoded parts.",
        value: `parts = ${parts.length}`,
        pass: false,
      }],
    };
  }

  try {
    header = decodeBase64UrlJson(parts[0]);
    payload = decodeBase64UrlJson(parts[1]);
    checks.push({
      title: "JWT structure is valid",
      detail: "Token has 3 base64url-encoded parts.",
      value: `header.alg = "${header.alg ?? "missing"}"`,
      pass: true,
    });
  } catch (error) {
    return {
      valid: false,
      checks: [{
        title: "JWT structure is valid",
        detail: "Header or payload failed base64url JSON decoding.",
        value: String((error as Error).message),
        pass: false,
      }],
    };
  }

  try {
    const publicJwk = objectValue(header.jwk) as JsonWebKey;
    const key = await crypto.subtle.importKey(
      "jwk",
      publicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    signatureOk = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      toArrayBuffer(base64UrlDecode(parts[2])),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    signatureOk = false;
  }

  checks.push(
    {
      title: "Signature verifies against provider JWK",
      detail:
        "Server imported the JWK from the JWT header and verified the ES256 signature over header.payload.",
      value: `signature = ${signatureOk ? "valid" : "invalid"}`,
      pass: signatureOk,
    },
    {
      title: "Issuer (iss) is present",
      detail: "The iss claim identifies the mail provider. Check against your provider allowlist.",
      value: `iss = "${payload.iss ?? "(missing)"}"`,
      pass: Boolean(payload.iss),
    },
    {
      title: "Audience (aud) matches your site",
      detail: `Expected: "${expectedAud}". Reject tokens issued to other origins.`,
      value: `aud = "${payload.aud ?? "(missing)"}"`,
      pass: payload.aud === expectedAud,
    },
    {
      title: "Token has not expired (exp)",
      detail: `exp must be greater than ${now}.`,
      value: typeof payload.exp === "number" ? `exp = ${payload.exp}` : "exp: missing",
      pass: typeof payload.exp === "number" && payload.exp > now,
    },
    {
      title: "Nonce matches session nonce",
      detail: `Expected nonce: "${expectedNonce}".`,
      value: `nonce = "${payload.nonce ?? "(missing)"}"`,
      pass: payload.nonce === expectedNonce,
    },
    {
      title: "Nonce has not been replayed",
      detail: "Server keeps a nonce replay cache and marks successful nonces as used.",
      value: `nonce = "${payload.nonce ?? "(missing)"}"`,
      pass: typeof payload.nonce === "string" && !evpUsedNonces.has(payload.nonce),
    },
    {
      title: "Email claim is present",
      detail: "The email address the mail provider vouches the user controls.",
      value: `email = "${payload.email ?? "(missing)"}"`,
      pass: typeof payload.email === "string" && payload.email.includes("@"),
    },
    {
      title: "email_verified is true",
      detail: "Must be the boolean true.",
      value: `email_verified = ${JSON.stringify(payload.email_verified ?? null)}`,
      pass: payload.email_verified === true,
    },
  );

  const valid = checks.every((check) => check.pass === true);
  if (valid && typeof payload.nonce === "string") evpUsedNonces.add(payload.nonce);
  return { valid, checks, header, payload };
}

async function renderEmailVerificationRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix = "/email-verification-protocol/server-validator/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);

  if (route === "/sample" && req.method === "POST") {
    const body = await requestJson(req);
    const aud = stringValue(body.expectedAud, "https://myapp.example.com");
    const nonce = stringValue(body.expectedNonce, "nonce-abc123");
    const email = stringValue(body.email, "alice@example-provider.com");
    const now = Math.floor(Date.now() / 1000);
    const token = await signEvpJwt({
      iss: "https://mail.example-provider.com",
      aud,
      exp: now + 300,
      iat: now - 10,
      email,
      email_verified: true,
      nonce,
      sub: email,
    });
    evpUsedNonces.delete(nonce);
    return jsonResponse({ token });
  }

  if (route === "/validate" && req.method === "POST") {
    const body = await requestJson(req);
    return jsonResponse(
      await verifyEvpJwt(
        stringValue(body.token),
        stringValue(body.expectedAud, "https://myapp.example.com"),
        stringValue(body.expectedNonce, "nonce-abc123"),
      ),
    );
  }

  return null;
}

// ----- Conditional Create auto-passkey demo backend -----

interface AutoPasskeySession {
  id: string;
  userName: string | null;
  authenticated: boolean;
  challenge: string | null;
  credentials: { id: string; createdAt: string; clientDataType: string; origin: string }[];
}

const AUTO_PASSKEY_COOKIE = "showcase_auto_passkey";
const autoPasskeySessions = new Map<string, AutoPasskeySession>();

function getAutoPasskeySession(req: Request): { session: AutoPasskeySession; headers: Headers } {
  const headers = new Headers();
  const cookies = parseCookies(req);
  let id = cookies.get(AUTO_PASSKEY_COOKIE);
  if (!id || !autoPasskeySessions.has(id)) {
    id = randomBase64Url(18);
    autoPasskeySessions.set(id, {
      id,
      userName: null,
      authenticated: false,
      challenge: null,
      credentials: [],
    });
    headers.set(
      "set-cookie",
      `${AUTO_PASSKEY_COOKIE}=${id}; Path=/v136/web-authentication-conditional-create-automatic-passkey-upgrades/auto-passkey; SameSite=Lax`,
    );
  }
  return { session: autoPasskeySessions.get(id)!, headers };
}

function autoPasskeyPayload(session: AutoPasskeySession): Record<string, unknown> {
  return {
    authenticated: session.authenticated,
    userName: session.userName,
    pendingChallenge: session.challenge,
    credentials: session.credentials,
  };
}

async function renderAutoPasskeyRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix =
    "/web-authentication-conditional-create-automatic-passkey-upgrades/auto-passkey/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  const { session, headers } = getAutoPasskeySession(req);

  if (route === "/state") return jsonResponse(autoPasskeyPayload(session), { headers });

  if (route === "/login" && req.method === "POST") {
    const body = await requestJson(req);
    const userName = stringValue(body.userName, "ada@example.com");
    const password = stringValue(body.password);
    if (!password) {
      return jsonResponse({ error: "Password is required for the demo sign-in." }, {
        status: 400,
        headers,
      });
    }
    session.userName = userName;
    session.authenticated = true;
    session.challenge = randomBase64Url(32);
    return jsonResponse({
      ...autoPasskeyPayload(session),
      publicKey: {
        rp: { name: "chrome-platform-showcase", id: webAuthnRpId(req) },
        user: {
          id: base64UrlEncode(new TextEncoder().encode(userName)),
          name: userName,
          displayName: userName,
        },
        challenge: session.challenge,
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        excludeCredentials: session.credentials.map((credential) => ({
          type: "public-key",
          id: credential.id,
        })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
        timeout: 60000,
        attestation: "none",
      },
    }, { headers });
  }

  if (route === "/register" && req.method === "POST") {
    const body = await requestJson(req);
    const response = objectValue(body.response);
    const clientData = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(stringValue(response.clientDataJSON))),
    );
    if (!session.authenticated) {
      return jsonResponse({ error: "Complete the backend sign-in first." }, {
        status: 401,
        headers,
      });
    }
    if (clientData.type !== "webauthn.create") {
      return jsonResponse({ error: "Expected webauthn.create client data." }, {
        status: 400,
        headers,
      });
    }
    if (!session.challenge || clientData.challenge !== session.challenge) {
      return jsonResponse({ error: "Challenge did not match this sign-in session." }, {
        status: 400,
        headers,
      });
    }
    if (clientData.origin !== new URL(req.url).origin) {
      return jsonResponse({ error: `Origin mismatch: ${clientData.origin}` }, {
        status: 400,
        headers,
      });
    }

    const rawId = stringValue(body.rawId) || stringValue(body.id);
    if (!session.credentials.some((credential) => credential.id === rawId)) {
      session.credentials.unshift({
        id: rawId,
        createdAt: new Date().toISOString(),
        clientDataType: clientData.type,
        origin: clientData.origin,
      });
    }
    session.challenge = null;
    return jsonResponse({ registered: true, ...autoPasskeyPayload(session) }, { headers });
  }

  if (route === "/reset" && req.method === "POST") {
    session.authenticated = false;
    session.challenge = null;
    session.credentials = [];
    return jsonResponse(autoPasskeyPayload(session), { headers });
  }

  return null;
}

// ----- Secure Payment Confirmation / WebAuthn verifier demo -----

type CborValue =
  | number
  | string
  | Uint8Array
  | CborValue[]
  | Map<CborValue, CborValue>
  | boolean
  | null;

interface CborReadResult {
  value: CborValue;
  offset: number;
}

interface SpcAuthCredential {
  id: string;
  rawId: string;
  rpId: string;
  publicKeyJwk: JsonWebKey;
  signCount: number;
  createdAt: string;
  extensionResults: Record<string, unknown>;
}

interface SpcAuthSession {
  id: string;
  userId: string;
  userName: string;
  registerChallenge: string | null;
  authChallenge: string | null;
  rpId: string;
  credential: SpcAuthCredential | null;
  payment: {
    amount: string;
    currency: string;
    merchant: string;
    createdAt: string;
  } | null;
  events: { at: string; event: string; detail: string }[];
}

const SPC_AUTH_COOKIE = "showcase_spc_auth";
const spcAuthSessions = new Map<string, SpcAuthSession>();

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function spcAuthCookieAttributes(req: Request, maxAge = 60 * 60 * 6): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=/v147/get-secure-payment-confirmation-capabilities; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function getSpcAuthSession(req: Request): { session: SpcAuthSession; headers: Headers } {
  const headers = new Headers();
  const cookies = parseCookies(req);
  let id = cookies.get(SPC_AUTH_COOKIE);
  if (!id || !spcAuthSessions.has(id)) {
    id = randomBase64Url(18);
    const rpId = webAuthnRpId(req);
    spcAuthSessions.set(id, {
      id,
      userId: randomBase64Url(16),
      userName: "alice@example.com",
      registerChallenge: null,
      authChallenge: null,
      rpId,
      credential: null,
      payment: null,
      events: [],
    });
    headers.set("set-cookie", `${SPC_AUTH_COOKIE}=${id}; ${spcAuthCookieAttributes(req)}`);
  }
  return { session: spcAuthSessions.get(id)!, headers };
}

function recordSpcAuthEvent(session: SpcAuthSession, event: string, detail: string) {
  session.events.unshift({ at: new Date().toISOString(), event, detail });
  session.events = session.events.slice(0, 12);
}

function spcAuthPayload(session: SpcAuthSession): Record<string, unknown> {
  return {
    rpId: session.rpId,
    user: {
      id: session.userId,
      name: session.userName,
      displayName: session.userName,
    },
    hasCredential: Boolean(session.credential),
    credential: session.credential
      ? {
        id: session.credential.id,
        rawId: session.credential.rawId,
        rpId: session.credential.rpId,
        signCount: session.credential.signCount,
        createdAt: session.credential.createdAt,
        publicKey: {
          kty: session.credential.publicKeyJwk.kty,
          crv: session.credential.publicKeyJwk.crv,
          x: session.credential.publicKeyJwk.x,
          y: session.credential.publicKeyJwk.y,
        },
        extensionResults: session.credential.extensionResults,
      }
      : null,
    pendingRegisterChallenge: session.registerChallenge,
    pendingAuthChallenge: session.authChallenge,
    payment: session.payment,
    events: session.events,
  };
}

function readCborLength(bytes: Uint8Array, offset: number, additional: number): {
  value: number;
  offset: number;
} {
  if (additional < 24) return { value: additional, offset };
  if (additional === 24) return { value: bytes[offset], offset: offset + 1 };
  if (additional === 25) {
    return { value: (bytes[offset] << 8) | bytes[offset + 1], offset: offset + 2 };
  }
  if (additional === 26) {
    return {
      value: (bytes[offset] * 2 ** 24) + (bytes[offset + 1] << 16) +
        (bytes[offset + 2] << 8) + bytes[offset + 3],
      offset: offset + 4,
    };
  }
  throw new Error("Unsupported CBOR length encoding.");
}

function readCbor(bytes: Uint8Array, offset = 0): CborReadResult {
  if (offset >= bytes.length) throw new Error("Unexpected end of CBOR data.");
  const initial = bytes[offset++];
  const major = initial >> 5;
  const additional = initial & 0x1f;
  if (additional === 31) throw new Error("Indefinite-length CBOR is not supported.");

  if (major === 0 || major === 1) {
    const length = readCborLength(bytes, offset, additional);
    const unsigned = length.value;
    return { value: major === 0 ? unsigned : -1 - unsigned, offset: length.offset };
  }

  if (major === 2) {
    const length = readCborLength(bytes, offset, additional);
    const end = length.offset + length.value;
    return { value: bytes.slice(length.offset, end), offset: end };
  }

  if (major === 3) {
    const length = readCborLength(bytes, offset, additional);
    const end = length.offset + length.value;
    return { value: new TextDecoder().decode(bytes.slice(length.offset, end)), offset: end };
  }

  if (major === 4) {
    const length = readCborLength(bytes, offset, additional);
    const values: CborValue[] = [];
    let next = length.offset;
    for (let i = 0; i < length.value; i++) {
      const item = readCbor(bytes, next);
      values.push(item.value);
      next = item.offset;
    }
    return { value: values, offset: next };
  }

  if (major === 5) {
    const length = readCborLength(bytes, offset, additional);
    const map = new Map<CborValue, CborValue>();
    let next = length.offset;
    for (let i = 0; i < length.value; i++) {
      const key = readCbor(bytes, next);
      const value = readCbor(bytes, key.offset);
      map.set(key.value, value.value);
      next = value.offset;
    }
    return { value: map, offset: next };
  }

  if (major === 6) {
    const tagged = readCbor(bytes, readCborLength(bytes, offset, additional).offset);
    return { value: tagged.value, offset: tagged.offset };
  }

  if (major === 7) {
    if (additional === 20) return { value: false, offset };
    if (additional === 21) return { value: true, offset };
    if (additional === 22) return { value: null, offset };
  }

  throw new Error("Unsupported CBOR value.");
}

function getCborMapNumber(map: Map<CborValue, CborValue>, key: number): number | null {
  const value = map.get(key);
  return typeof value === "number" ? value : null;
}

function getCborMapBytes(map: Map<CborValue, CborValue>, key: number): Uint8Array | null {
  const value = map.get(key);
  return value instanceof Uint8Array ? value : null;
}

function coseEc2ToJwk(value: CborValue): JsonWebKey {
  if (!(value instanceof Map)) throw new Error("Credential public key is not a COSE map.");
  const kty = getCborMapNumber(value, 1);
  const alg = getCborMapNumber(value, 3);
  const crv = getCborMapNumber(value, -1);
  const x = getCborMapBytes(value, -2);
  const y = getCborMapBytes(value, -3);

  if (kty !== 2 || alg !== -7 || crv !== 1 || !x || !y) {
    throw new Error("Only ES256 P-256 WebAuthn credentials are supported by this demo verifier.");
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    ext: true,
  };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function readSignCount(authenticatorData: Uint8Array): number {
  return (authenticatorData[33] * 2 ** 24) + (authenticatorData[34] << 16) +
    (authenticatorData[35] << 8) + authenticatorData[36];
}

async function rpIdHash(rpId: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
}

async function parseRegistrationResponse(
  req: Request,
  session: SpcAuthSession,
  body: Record<string, unknown>,
): Promise<SpcAuthCredential> {
  const response = objectValue(body.response);
  const clientDataBytes = base64UrlDecode(stringValue(response.clientDataJSON));
  const attestationBytes = base64UrlDecode(stringValue(response.attestationObject));
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  const expectedOrigin = new URL(req.url).origin;

  if (clientData.type !== "webauthn.create") {
    throw new Error("Expected webauthn.create client data.");
  }
  if (!session.registerChallenge || clientData.challenge !== session.registerChallenge) {
    throw new Error("Registration challenge did not match this server session.");
  }
  if (clientData.origin !== expectedOrigin) {
    throw new Error(`Origin mismatch: ${clientData.origin}`);
  }

  const attestation = readCbor(attestationBytes).value;
  if (!(attestation instanceof Map)) throw new Error("Attestation object was not a CBOR map.");
  const authData = attestation.get("authData");
  if (!(authData instanceof Uint8Array)) {
    throw new Error("Attestation object did not include authData.");
  }
  if (!bytesEqual(authData.slice(0, 32), await rpIdHash(session.rpId))) {
    throw new Error("Credential rpIdHash did not match the relying party ID.");
  }

  const flags = authData[32];
  if ((flags & 0x40) === 0) {
    throw new Error("Authenticator data did not include attested credential data.");
  }

  let offset = 37 + 16;
  const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;
  const credentialId = authData.slice(offset, offset + credentialIdLength);
  offset += credentialIdLength;
  const cosePublicKey = readCbor(authData, offset).value;
  const publicKeyJwk = coseEc2ToJwk(cosePublicKey);
  const rawId = stringValue(body.rawId) || stringValue(body.id);
  const extensionResults = objectValue(body.clientExtensionResults);

  if (!bytesEqual(credentialId, base64UrlDecode(rawId))) {
    throw new Error("Credential ID in authenticator data did not match rawId.");
  }

  return {
    id: stringValue(body.id),
    rawId,
    rpId: session.rpId,
    publicKeyJwk,
    signCount: readSignCount(authData),
    createdAt: new Date().toISOString(),
    extensionResults,
  };
}

function normalizeEcdsaSignature(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  if (signature[0] !== 0x30) throw new Error("ECDSA signature is not ASN.1 DER or raw P-1363.");
  let offset = 2;
  if (signature[1] & 0x80) offset = 2 + (signature[1] & 0x7f);
  if (signature[offset++] !== 0x02) throw new Error("Invalid DER ECDSA signature.");
  const rLength = signature[offset++];
  let r = signature.slice(offset, offset + rLength);
  offset += rLength;
  if (signature[offset++] !== 0x02) throw new Error("Invalid DER ECDSA signature.");
  const sLength = signature[offset++];
  let s = signature.slice(offset, offset + sLength);
  while (r.length > 32 && r[0] === 0) r = r.slice(1);
  while (s.length > 32 && s[0] === 0) s = s.slice(1);
  if (r.length > 32 || s.length > 32) throw new Error("ECDSA signature component too large.");
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}

async function verifyWebAuthnAssertion(
  req: Request,
  session: SpcAuthSession,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!session.credential) throw new Error("Register a credential before authenticating.");
  const response = objectValue(body.response);
  const clientDataBytes = base64UrlDecode(stringValue(response.clientDataJSON));
  const authenticatorData = base64UrlDecode(stringValue(response.authenticatorData));
  const signature = base64UrlDecode(stringValue(response.signature));
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  const expectedOrigin = new URL(req.url).origin;

  if (clientData.type !== "webauthn.get") throw new Error("Expected webauthn.get client data.");
  if (!session.authChallenge || clientData.challenge !== session.authChallenge) {
    throw new Error("Authentication challenge did not match this server session.");
  }
  if (clientData.origin !== expectedOrigin) {
    throw new Error(`Origin mismatch: ${clientData.origin}`);
  }
  if (!bytesEqual(authenticatorData.slice(0, 32), await rpIdHash(session.credential.rpId))) {
    throw new Error("Assertion rpIdHash did not match the stored credential.");
  }

  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", toArrayBuffer(clientDataBytes)),
  );
  const signedBytes = new Uint8Array(authenticatorData.byteLength + clientDataHash.byteLength);
  signedBytes.set(authenticatorData);
  signedBytes.set(clientDataHash, authenticatorData.byteLength);

  const key = await crypto.subtle.importKey(
    "jwk",
    session.credential.publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const normalizedSignature = normalizeEcdsaSignature(signature);
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(normalizedSignature),
    signedBytes,
  );
  if (!verified) throw new Error("WebAuthn assertion signature verification failed.");

  const previousSignCount = session.credential.signCount;
  const signCount = readSignCount(authenticatorData);
  session.credential.signCount = signCount;
  return {
    verified,
    clientData,
    authenticatorData: base64UrlEncode(authenticatorData),
    signature: base64UrlEncode(signature),
    signCount,
    signCountAdvanced: signCount === 0 || previousSignCount === 0
      ? null
      : signCount > previousSignCount,
  };
}

async function renderSpcAuthRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix = "/get-secure-payment-confirmation-capabilities/spc-auth-flow/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  const { session, headers } = getSpcAuthSession(req);

  if (route === "/state") return jsonResponse(spcAuthPayload(session), { headers });

  if (route === "/register-options" && req.method === "POST") {
    const body = await requestJson(req);
    session.userName = stringValue(body.userName, session.userName);
    session.rpId = stringValue(body.rpId, webAuthnRpId(req)) || webAuthnRpId(req);
    session.registerChallenge = randomBase64Url(32);
    session.authChallenge = null;
    recordSpcAuthEvent(session, "register-options", "Issued server registration challenge.");
    return jsonResponse({
      publicKey: {
        challenge: session.registerChallenge,
        rp: { id: session.rpId, name: "Chrome Platform Showcase SPC" },
        user: {
          id: session.userId,
          name: session.userName,
          displayName: session.userName,
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: stringValue(body.authenticatorAttachment, "platform"),
          residentKey: "preferred",
          userVerification: stringValue(body.userVerification, "required"),
        },
        timeout: 60000,
        attestation: "none",
        extensions: { payment: { isPayment: true } },
      },
      ...spcAuthPayload(session),
    }, { headers });
  }

  if (route === "/register" && req.method === "POST") {
    try {
      const body = await requestJson(req);
      session.credential = await parseRegistrationResponse(req, session, body);
      session.registerChallenge = null;
      recordSpcAuthEvent(session, "registered", "Stored ES256 credential public key.");
      return jsonResponse({ verified: true, ...spcAuthPayload(session) }, { headers });
    } catch (error) {
      recordSpcAuthEvent(session, "register-rejected", String((error as Error).message));
      return jsonResponse({ error: String((error as Error).message), ...spcAuthPayload(session) }, {
        status: 400,
        headers,
      });
    }
  }

  if (route === "/challenge-options" && req.method === "POST") {
    if (!session.credential) {
      return jsonResponse({ error: "Register a credential before requesting a challenge." }, {
        status: 409,
        headers,
      });
    }
    const body = await requestJson(req);
    session.authChallenge = randomBase64Url(32);
    session.payment = {
      amount: stringValue(body.amount, "$42.00"),
      currency: stringValue(body.currency, "USD"),
      merchant: stringValue(body.merchant, "ACME Store"),
      createdAt: new Date().toISOString(),
    };
    recordSpcAuthEvent(session, "challenge-options", "Issued server authentication challenge.");
    return jsonResponse({
      publicKey: {
        challenge: session.authChallenge,
        rpId: session.credential.rpId,
        allowCredentials: [{
          type: "public-key",
          id: session.credential.rawId,
          transports: ["internal", "hybrid", "usb", "nfc", "ble"],
        }],
        userVerification: stringValue(body.userVerification, "required"),
        timeout: 60000,
        extensions: {
          payment: {
            isPayment: true,
            payeeOrigin: new URL(req.url).origin,
            total: {
              currency: session.payment.currency,
              value: session.payment.amount,
            },
            instrument: { displayName: session.payment.merchant, icon: "" },
            rpId: session.credential.rpId,
          },
        },
      },
      ...spcAuthPayload(session),
    }, { headers });
  }

  if (route === "/verify" && req.method === "POST") {
    try {
      const body = await requestJson(req);
      const verification = await verifyWebAuthnAssertion(req, session, body);
      session.authChallenge = null;
      recordSpcAuthEvent(
        session,
        "verified",
        "Verified assertion signature with stored public key.",
      );
      return jsonResponse({ ...verification, ...spcAuthPayload(session) }, { headers });
    } catch (error) {
      recordSpcAuthEvent(session, "verify-rejected", String((error as Error).message));
      return jsonResponse({ error: String((error as Error).message), ...spcAuthPayload(session) }, {
        status: 400,
        headers,
      });
    }
  }

  if (route === "/reset" && req.method === "POST") {
    session.registerChallenge = null;
    session.authChallenge = null;
    session.credential = null;
    session.payment = null;
    session.events = [];
    return jsonResponse(spcAuthPayload(session), { headers });
  }

  return null;
}

const spcCheckoutOrders: Record<string, unknown>[] = [];

async function renderSpcCheckoutRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix = "/get-secure-payment-confirmation-capabilities/spc-checkout-flow/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);

  if (route === "/orders" && req.method === "POST") {
    const body = await requestJson(req);
    const order = {
      id: `CPX-${randomBase64Url(5).toUpperCase()}`,
      method: stringValue(body.method, "card-fallback"),
      total: stringValue(body.total, "32.49"),
      currency: stringValue(body.currency, "GBP"),
      createdAt: new Date().toISOString(),
      storedBy: "chrome-platform-showcase backend",
    };
    spcCheckoutOrders.unshift(order);
    spcCheckoutOrders.splice(20);
    return jsonResponse({ order, recent: spcCheckoutOrders.slice(0, 5) });
  }

  return null;
}

interface DbscSession {
  id: string;
  loginChallenge: string | null;
  refreshChallenge: string | null;
  authorization: string;
  publicKeyJwk: JsonWebKey | null;
  registeredAt: string | null;
  shortCookieValue: string | null;
  shortCookieExpiresAt: number | null;
  events: { at: string; event: string; detail: string }[];
}

const DBSC_LONG_COOKIE = "showcase_dbsc";
const DBSC_SHORT_COOKIE = "showcase_dbsc_short";
const DBSC_DEFAULT_PATH = "/v145/device-bound-session-credentials";
const DBSC_SHORT_COOKIE_MAX_AGE = 90;
const dbscSessions = new Map<string, DbscSession>();

function dbscPath(req: Request): string {
  const pathname = new URL(req.url).pathname;
  return pathname.match(/^\/v\d+\/device-bound-session-credentials/)?.[0] ?? DBSC_DEFAULT_PATH;
}

function dbscCookieAttributes(req: Request, maxAge: number): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=${dbscPath(req)}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function createDbscSession(): DbscSession {
  const id = randomBase64Url(18);
  const session: DbscSession = {
    id,
    loginChallenge: null,
    refreshChallenge: null,
    authorization: `demo-auth-${randomBase64Url(12)}`,
    publicKeyJwk: null,
    registeredAt: null,
    shortCookieValue: null,
    shortCookieExpiresAt: null,
    events: [],
  };
  dbscSessions.set(id, session);
  return session;
}

function getDbscSessionFromRequest(req: Request): DbscSession | null {
  const cookies = parseCookies(req);
  const sessionId = req.headers.get("Sec-Secure-Session-Id") ??
    cookies.get(DBSC_LONG_COOKIE);
  if (!sessionId) return null;
  return dbscSessions.get(sessionId) ?? null;
}

function recordDbscEvent(session: DbscSession, event: string, detail: string) {
  session.events.unshift({ at: new Date().toISOString(), event, detail });
  session.events = session.events.slice(0, 12);
}

function dbscOrigin(req: Request): string {
  return new URL(req.url).origin;
}

function dbscRegistrationHeader(req: Request, session: DbscSession): string {
  return `(ES256);path="${
    dbscPath(req)
  }/register";challenge="${session.loginChallenge}";authorization="${session.authorization}"`;
}

function dbscChallengeHeader(session: DbscSession): string {
  return `"${session.refreshChallenge}";id="${session.id}"`;
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

async function verifyDbscJwt(
  jwt: string,
  challenge: string,
  jwk: JsonWebKey | null,
): Promise<{ ok: boolean; publicKeyJwk?: JsonWebKey; error?: string }> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "Proof is not a compact JWT." };

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodeBase64UrlJson(parts[0]);
    payload = decodeBase64UrlJson(parts[1]);
  } catch {
    return { ok: false, error: "Proof header or payload is not valid base64url JSON." };
  }

  if (header.alg !== "ES256") return { ok: false, error: "Only ES256 proofs are accepted." };
  if (header.typ !== "dbsc+jwt") return { ok: false, error: "Proof typ must be dbsc+jwt." };
  if (payload.jti !== challenge) {
    return { ok: false, error: "Proof challenge (jti) did not match this session." };
  }

  const publicKeyJwk = (header.jwk as JsonWebKey | undefined) ?? jwk ?? undefined;
  if (!publicKeyJwk) return { ok: false, error: "Proof did not include a public key." };

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    return { ok: false, error: "Public key JWK could not be imported." };
  }

  const signature = toArrayBuffer(base64UrlDecode(parts[2]));
  const signedBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signature,
    signedBytes,
  );
  return ok ? { ok, publicKeyJwk } : { ok, error: "ECDSA signature verification failed." };
}

function dbscInstructions(req: Request, session: DbscSession): Record<string, unknown> {
  const path = dbscPath(req);
  return {
    session_identifier: session.id,
    refresh_url: `${path}/refresh`,
    scope: {
      origin: dbscOrigin(req),
      include_site: false,
      scope_specification: [{
        type: "include",
        domain: new URL(req.url).hostname,
        path,
      }],
    },
    credentials: [{
      type: "cookie",
      name: DBSC_SHORT_COOKIE,
      attributes: `Path=${path}; HttpOnly; SameSite=Lax`,
    }],
  };
}

function dbscSessionState(req: Request, session: DbscSession | null): Record<string, unknown> {
  const cookies = parseCookies(req);
  const hasShortCookie = Boolean(cookies.get(DBSC_SHORT_COOKIE));
  const shortCookieValid = Boolean(
    session?.shortCookieValue &&
      cookies.get(DBSC_SHORT_COOKIE) === session.shortCookieValue &&
      session.shortCookieExpiresAt &&
      session.shortCookieExpiresAt > Date.now(),
  );
  return {
    hasSession: Boolean(session),
    sessionId: session?.id ?? null,
    registered: Boolean(session?.publicKeyJwk),
    registeredAt: session?.registeredAt ?? null,
    hasShortCookie,
    shortCookieValid,
    shortCookieExpiresAt: session?.shortCookieExpiresAt
      ? new Date(session.shortCookieExpiresAt).toISOString()
      : null,
    pendingLoginChallenge: session?.loginChallenge ?? null,
    pendingRefreshChallenge: session?.refreshChallenge ?? null,
    events: session?.events ?? [],
  };
}

async function requestJson(req: Request): Promise<Record<string, unknown>> {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) return {};
    return await req.json();
  } catch {
    return {};
  }
}

async function renderDbscRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/device-bound-session-credentials/")) return null;
  const route = sub.slice("/device-bound-session-credentials".length);

  if (route === "/login" && req.method === "POST") {
    const session = createDbscSession();
    session.loginChallenge = randomBase64Url(32);
    recordDbscEvent(session, "login", "Issued long-lived cookie and registration header.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_LONG_COOKIE}=${session.id}; ${dbscCookieAttributes(req, 60 * 60 * 24 * 30)}`,
    );
    headers.set("Secure-Session-Registration", dbscRegistrationHeader(req, session));
    return jsonResponse({
      message: "Login accepted. Browser can now register a device-bound session.",
      registrationHeader: dbscRegistrationHeader(req, session),
      challenge: session.loginChallenge,
      authorization: session.authorization,
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/state") {
    return jsonResponse(dbscSessionState(req, getDbscSessionFromRequest(req)));
  }

  if (route === "/register" && req.method === "POST") {
    const session = getDbscSessionFromRequest(req);
    if (!session?.loginChallenge) {
      return jsonResponse({ error: "No DBSC login challenge is pending for this session." }, {
        status: 400,
      });
    }
    const body = await requestJson(req);
    const proof = req.headers.get("Secure-Session-Response") ?? String(body.proof ?? "");
    const verified = await verifyDbscJwt(proof, session.loginChallenge, null);
    if (!verified.ok) {
      recordDbscEvent(session, "register-rejected", verified.error ?? "Proof rejected.");
      return jsonResponse({ error: verified.error }, { status: 400 });
    }

    session.publicKeyJwk = verified.publicKeyJwk ?? null;
    session.registeredAt = new Date().toISOString();
    session.loginChallenge = null;
    session.shortCookieValue = randomBase64Url(18);
    session.shortCookieExpiresAt = Date.now() + DBSC_SHORT_COOKIE_MAX_AGE * 1000;
    recordDbscEvent(session, "registered", "Verified ES256 proof and stored public key.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_SHORT_COOKIE}=${session.shortCookieValue}; ${
        dbscCookieAttributes(req, DBSC_SHORT_COOKIE_MAX_AGE)
      }`,
    );
    return jsonResponse({
      message: "Registration proof verified. Short-lived session cookie issued.",
      proofVerified: true,
      instructions: dbscInstructions(req, session),
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/resource") {
    const session = getDbscSessionFromRequest(req);
    if (!session?.publicKeyJwk) {
      return jsonResponse({ error: "Register a DBSC session before calling this resource." }, {
        status: 401,
      });
    }
    const cookies = parseCookies(req);
    const shortCookieValid = Boolean(
      session.shortCookieValue &&
        cookies.get(DBSC_SHORT_COOKIE) === session.shortCookieValue &&
        session.shortCookieExpiresAt &&
        session.shortCookieExpiresAt > Date.now(),
    );
    if (!shortCookieValid) {
      session.refreshChallenge = randomBase64Url(32);
      recordDbscEvent(session, "resource-blocked", "Short-lived cookie missing or expired.");
      const headers = new Headers();
      headers.set("Secure-Session-Challenge", dbscChallengeHeader(session));
      return jsonResponse({
        error: "Short-lived cookie missing or expired. Refresh proof required.",
        challenge: session.refreshChallenge,
        sessionId: session.id,
        ...dbscSessionState(req, session),
      }, { status: 401, headers });
    }

    recordDbscEvent(session, "resource-ok", "Protected resource accepted the short-lived cookie.");
    return jsonResponse({
      message: "Protected resource returned account data.",
      account: {
        email: "alice@example.com",
        assurance: "device-bound-session",
        generatedAt: new Date().toISOString(),
      },
      ...dbscSessionState(req, session),
    });
  }

  if (route === "/refresh" && req.method === "POST") {
    const body = await requestJson(req);
    const session = getDbscSessionFromRequest(req) ??
      dbscSessions.get(String(body.sessionId ?? ""));
    if (!session?.publicKeyJwk) {
      return jsonResponse({ error: "No registered DBSC session found." }, { status: 401 });
    }
    const proof = req.headers.get("Secure-Session-Response") ?? String(body.proof ?? "");
    if (!proof) {
      session.refreshChallenge = randomBase64Url(32);
      recordDbscEvent(session, "refresh-challenge", "Issued refresh challenge.");
      const headers = new Headers();
      headers.set("Secure-Session-Challenge", dbscChallengeHeader(session));
      return jsonResponse({
        message: "Refresh challenge issued. Sign it with the bound key.",
        challenge: session.refreshChallenge,
        sessionId: session.id,
        ...dbscSessionState(req, session),
      }, { status: 403, headers });
    }

    if (!session.refreshChallenge) {
      return jsonResponse({ error: "No refresh challenge is pending for this session." }, {
        status: 400,
      });
    }

    const verified = await verifyDbscJwt(proof, session.refreshChallenge, session.publicKeyJwk);
    if (!verified.ok) {
      recordDbscEvent(session, "refresh-rejected", verified.error ?? "Proof rejected.");
      return jsonResponse({ error: verified.error }, { status: 403 });
    }

    session.refreshChallenge = null;
    session.shortCookieValue = randomBase64Url(18);
    session.shortCookieExpiresAt = Date.now() + DBSC_SHORT_COOKIE_MAX_AGE * 1000;
    recordDbscEvent(session, "refreshed", "Verified refresh proof and reissued short cookie.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_SHORT_COOKIE}=${session.shortCookieValue}; ${
        dbscCookieAttributes(req, DBSC_SHORT_COOKIE_MAX_AGE)
      }`,
    );
    return jsonResponse({
      message: "Refresh proof verified. Short-lived cookie renewed.",
      proofVerified: true,
      instructions: dbscInstructions(req, session),
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/expire" && req.method === "POST") {
    const session = getDbscSessionFromRequest(req);
    if (!session) return jsonResponse({ error: "No DBSC session found." }, { status: 404 });
    session.shortCookieValue = null;
    session.shortCookieExpiresAt = Date.now() - 1000;
    recordDbscEvent(session, "expired", "Short-lived cookie expired by the demo control.");
    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_SHORT_COOKIE}=; ${dbscCookieAttributes(req, 0)}`,
    );
    return jsonResponse({
      message: "Short-lived cookie expired.",
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/reset" && req.method === "POST") {
    const session = getDbscSessionFromRequest(req);
    if (session) {
      dbscSessions.delete(session.id);
    }
    const headers = new Headers();
    headers.append("set-cookie", `${DBSC_LONG_COOKIE}=; ${dbscCookieAttributes(req, 0)}`);
    headers.append("set-cookie", `${DBSC_SHORT_COOKIE}=; ${dbscCookieAttributes(req, 0)}`);
    return jsonResponse({ message: "DBSC demo session reset.", hasSession: false }, { headers });
  }

  return null;
}

// ----- Secure Payment Confirmation browser-bound key verifier demos -----

interface SpcBbkEvent {
  at: string;
  type: string;
  detail: string;
}

interface SpcBbkEnrollment {
  id: string;
  version: string;
  deviceName: string;
  createdAt: string;
  passkeyPublicJwk: JsonWebKey;
  browserBoundPublicJwk: JsonWebKey;
  pendingPayload: string | null;
  events: SpcBbkEvent[];
}

const SPC_BBK_COOKIE = "showcase_spc_bbk";
const spcBbkEnrollments = new Map<string, SpcBbkEnrollment>();

function spcBbkBasePath(req: Request): string {
  return new URL(req.url).pathname.match(/^\/v\d+\/secure-payment-confirmation-browser-bound-keys/)
    ?.[0] ?? "/v145/secure-payment-confirmation-browser-bound-keys";
}

function spcBbkCookieAttributes(req: Request, maxAge: number): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=${spcBbkBasePath(req)}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function spcBbkEvent(enrollment: SpcBbkEnrollment, type: string, detail: string) {
  enrollment.events.unshift({ at: new Date().toISOString(), type, detail });
  enrollment.events = enrollment.events.slice(0, 20);
}

function getSpcBbkEnrollment(req: Request, body: Record<string, unknown> = {}) {
  const id = String(body.enrollmentId ?? parseCookies(req).get(SPC_BBK_COOKIE) ?? "");
  return id ? spcBbkEnrollments.get(id) ?? null : null;
}

async function importSpcBbkPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

async function verifySpcBbkSignature(
  publicJwk: JsonWebKey,
  signature: string,
  payload: string,
): Promise<boolean> {
  const key = await importSpcBbkPublicKey(publicJwk);
  return await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(base64UrlDecode(signature)),
    new TextEncoder().encode(payload),
  );
}

function spcBbkJwkThumbprint(jwk: JsonWebKey): string {
  return base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })),
  ).slice(0, 18);
}

function spcBbkEnrollmentState(enrollment: SpcBbkEnrollment | null) {
  if (!enrollment) return { enrolled: false };
  return {
    enrolled: true,
    enrollmentId: enrollment.id,
    version: enrollment.version,
    deviceName: enrollment.deviceName,
    createdAt: enrollment.createdAt,
    passkeyThumbprint: spcBbkJwkThumbprint(enrollment.passkeyPublicJwk),
    browserBoundThumbprint: spcBbkJwkThumbprint(enrollment.browserBoundPublicJwk),
    hasPendingPayload: Boolean(enrollment.pendingPayload),
    events: enrollment.events,
  };
}

async function renderSpcBbkRoute(
  req: Request,
  release: string,
  sub: string,
): Promise<Response | null> {
  if (!sub.startsWith("/secure-payment-confirmation-browser-bound-keys/")) return null;
  const route = sub.slice("/secure-payment-confirmation-browser-bound-keys".length);

  if (route === "/enroll" && req.method === "POST") {
    const body = await requestJson(req);
    const passkeyPublicJwk = body.passkeyPublicJwk as JsonWebKey | undefined;
    const browserBoundPublicJwk = body.browserBoundPublicJwk as JsonWebKey | undefined;
    if (
      !passkeyPublicJwk?.x || !passkeyPublicJwk?.y || !browserBoundPublicJwk?.x ||
      !browserBoundPublicJwk?.y
    ) {
      return jsonResponse({
        error: "passkeyPublicJwk and browserBoundPublicJwk must be P-256 public JWKs.",
      }, { status: 400 });
    }

    try {
      await importSpcBbkPublicKey(passkeyPublicJwk);
      await importSpcBbkPublicKey(browserBoundPublicJwk);
    } catch (err) {
      return jsonResponse({ error: `Public key import failed: ${err}` }, { status: 400 });
    }

    const enrollment: SpcBbkEnrollment = {
      id: randomBase64Url(18),
      version: release,
      deviceName: String(body.deviceName ?? "Primary browser"),
      createdAt: new Date().toISOString(),
      passkeyPublicJwk,
      browserBoundPublicJwk,
      pendingPayload: null,
      events: [],
    };
    spcBbkEvent(enrollment, "enrolled", "Stored passkey and browser-bound public keys.");
    spcBbkEnrollments.set(enrollment.id, enrollment);

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${SPC_BBK_COOKIE}=${enrollment.id}; ${spcBbkCookieAttributes(req, 60 * 60 * 6)}`,
    );
    return jsonResponse({
      message: "Enrollment stored. Server can now verify dual-signature payment assertions.",
      ...spcBbkEnrollmentState(enrollment),
    }, { headers });
  }

  if (route === "/state") {
    const body = req.method === "POST" ? await requestJson(req) : {};
    return jsonResponse(spcBbkEnrollmentState(getSpcBbkEnrollment(req, body)));
  }

  if (route === "/challenge" && req.method === "POST") {
    const body = await requestJson(req);
    const enrollment = getSpcBbkEnrollment(req, body);
    if (!enrollment) {
      return jsonResponse({ error: "Enroll keys before requesting a payment challenge." }, {
        status: 404,
      });
    }
    const payment = {
      type: "payment.get",
      challenge: randomBase64Url(32),
      amount: String(body.amount ?? "49.99"),
      currency: String(body.currency ?? "GBP"),
      payeeName: String(body.payeeName ?? "Chrome Platform Store"),
      payeeOrigin: String(body.payeeOrigin ?? new URL(req.url).origin),
      rpId: new URL(req.url).hostname,
      enrollmentId: enrollment.id,
      issuedAt: new Date().toISOString(),
    };
    enrollment.pendingPayload = JSON.stringify(payment);
    spcBbkEvent(
      enrollment,
      "challenge",
      `Issued ${payment.currency} ${payment.amount} payment challenge.`,
    );
    return jsonResponse({
      message: "Payment challenge issued. Sign payload with both keys.",
      payload: enrollment.pendingPayload,
      payment,
      ...spcBbkEnrollmentState(enrollment),
    });
  }

  if (route === "/verify" && req.method === "POST") {
    const body = await requestJson(req);
    const enrollment = getSpcBbkEnrollment(req, body);
    if (!enrollment) return jsonResponse({ error: "Enrollment not found." }, { status: 404 });
    const payload = String(body.payload ?? enrollment.pendingPayload ?? "");
    const passkeySignature = String(body.passkeySignature ?? "");
    const browserBoundSignature = String(body.browserBoundSignature ?? "");
    if (!payload || !passkeySignature || !browserBoundSignature) {
      return jsonResponse({
        error: "payload, passkeySignature, and browserBoundSignature are required.",
      }, { status: 400 });
    }

    let passkeyVerified = false;
    let browserBoundVerified = false;
    let error: string | null = null;
    try {
      passkeyVerified = await verifySpcBbkSignature(
        enrollment.passkeyPublicJwk,
        passkeySignature,
        payload,
      );
      browserBoundVerified = await verifySpcBbkSignature(
        enrollment.browserBoundPublicJwk,
        browserBoundSignature,
        payload,
      );
    } catch (err) {
      error = String(err);
    }

    const accepted = passkeyVerified && browserBoundVerified;
    spcBbkEvent(
      enrollment,
      accepted ? "verify-ok" : "verify-rejected",
      accepted
        ? "Both passkey and browser-bound signatures verified."
        : `passkey=${passkeyVerified}, browserBound=${browserBoundVerified}`,
    );
    if (accepted && payload === enrollment.pendingPayload) enrollment.pendingPayload = null;
    return jsonResponse({
      accepted,
      passkeyVerified,
      browserBoundVerified,
      error,
      expectedBrowserBoundThumbprint: spcBbkJwkThumbprint(enrollment.browserBoundPublicJwk),
      ...spcBbkEnrollmentState(enrollment),
    }, { status: accepted ? 200 : 403 });
  }

  if (route === "/rotate" && req.method === "POST") {
    const body = await requestJson(req);
    const enrollment = getSpcBbkEnrollment(req, body);
    const newBrowserBoundPublicJwk = body.newBrowserBoundPublicJwk as JsonWebKey | undefined;
    const payload = String(body.payload ?? "");
    const oldBrowserBoundSignature = String(body.oldBrowserBoundSignature ?? "");
    if (!enrollment) return jsonResponse({ error: "Enrollment not found." }, { status: 404 });
    if (
      !newBrowserBoundPublicJwk?.x || !newBrowserBoundPublicJwk?.y || !payload ||
      !oldBrowserBoundSignature
    ) {
      return jsonResponse({
        error: "newBrowserBoundPublicJwk, payload, and oldBrowserBoundSignature are required.",
      }, { status: 400 });
    }

    let oldKeyVerified = false;
    try {
      oldKeyVerified = await verifySpcBbkSignature(
        enrollment.browserBoundPublicJwk,
        oldBrowserBoundSignature,
        payload,
      );
      await importSpcBbkPublicKey(newBrowserBoundPublicJwk);
    } catch (err) {
      return jsonResponse({ error: `Rotation verification failed: ${err}` }, { status: 400 });
    }
    if (!oldKeyVerified) {
      spcBbkEvent(enrollment, "rotation-rejected", "Old browser-bound key proof failed.");
      return jsonResponse({ error: "Old browser-bound key proof did not verify." }, {
        status: 403,
      });
    }

    enrollment.browserBoundPublicJwk = newBrowserBoundPublicJwk;
    enrollment.pendingPayload = null;
    spcBbkEvent(enrollment, "rotated", "Browser-bound public key rotated after old-key proof.");
    return jsonResponse({
      message: "Browser-bound key rotated.",
      ...spcBbkEnrollmentState(enrollment),
    });
  }

  if (route === "/reset" && req.method === "POST") {
    const enrollment = getSpcBbkEnrollment(req);
    if (enrollment) spcBbkEnrollments.delete(enrollment.id);
    const headers = new Headers();
    headers.set("set-cookie", `${SPC_BBK_COOKIE}=; ${spcBbkCookieAttributes(req, 0)}`);
    return jsonResponse({ message: "SPC browser-bound key enrollment reset.", enrolled: false }, {
      headers,
    });
  }

  return null;
}

// ----- fetchLater receiver demos -----

interface FetchLaterEvent {
  id: string;
  receivedAt: string;
  method: string;
  path: string;
  body: unknown;
  bodyBytes: number;
  userAgent: string;
}

const fetchLaterEvents: FetchLaterEvent[] = [];

async function renderFetchLaterRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/fetchlater-api/")) return null;
  const route = sub.slice("/fetchlater-api".length);

  if ((route === "/log" || route === "/echo") && req.method === "POST") {
    const text = await req.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    const event: FetchLaterEvent = {
      id: randomBase64Url(9),
      receivedAt: new Date().toISOString(),
      method: req.method,
      path: new URL(req.url).pathname,
      body,
      bodyBytes: new TextEncoder().encode(text).byteLength,
      userAgent: req.headers.get("user-agent") ?? "",
    };
    fetchLaterEvents.unshift(event);
    fetchLaterEvents.splice(50);
    return jsonResponse({
      accepted: true,
      event,
      recent: fetchLaterEvents.slice(0, 10),
    });
  }

  if (route === "/events") {
    return jsonResponse({ events: fetchLaterEvents.slice(0, 25) });
  }

  if (route === "/reset" && req.method === "POST") {
    fetchLaterEvents.splice(0);
    return jsonResponse({ reset: true, events: [] });
  }

  return null;
}

// ----- JS Self-Profiling telemetry receiver -----

interface ProfileTelemetryEvent {
  id: string;
  receivedAt: string;
  contentType: string;
  bodyBytes: number;
  totalSamples: number | null;
  hotFunctionCount: number | null;
  topFunction: string | null;
  userAgent: string;
}

const profileTelemetryEvents: ProfileTelemetryEvent[] = [];

async function renderProfileTelemetryRoute(req: Request, path: string): Promise<Response | null> {
  if (!path.startsWith("/telemetry/profile")) return null;

  if (path === "/telemetry/profile/events" && req.method === "GET") {
    return jsonResponse({ events: profileTelemetryEvents.slice(0, 25) });
  }

  if (path === "/telemetry/profile/reset" && req.method === "POST") {
    profileTelemetryEvents.splice(0);
    return jsonResponse({ reset: true, events: [] });
  }

  if (path !== "/telemetry/profile") return null;

  if (req.method === "GET") {
    return jsonResponse({ events: profileTelemetryEvents.slice(0, 25) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a JSON profiling payload to this endpoint." }, {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  const text = await req.text();
  const bodyBytes = new TextEncoder().encode(text).byteLength;
  let payload: Record<string, unknown> = {};
  try {
    const parsed = text ? JSON.parse(text) : {};
    payload = objectValue(parsed);
  } catch {
    payload = {};
  }
  const hot = Array.isArray(payload.hot) ? payload.hot : [];
  const top = objectValue(hot[0]);
  const event: ProfileTelemetryEvent = {
    id: randomBase64Url(9),
    receivedAt: new Date().toISOString(),
    contentType: req.headers.get("content-type") ?? "",
    bodyBytes,
    totalSamples: typeof payload.totalSamples === "number" ? payload.totalSamples : null,
    hotFunctionCount: hot.length || null,
    topFunction: stringValue(top.name) || null,
    userAgent: req.headers.get("user-agent") ?? "",
  };
  profileTelemetryEvents.unshift(event);
  profileTelemetryEvents.splice(50);

  return jsonResponse({ accepted: true, event, recent: profileTelemetryEvents.slice(0, 5) }, {
    status: 202,
  });
}

function renderWebSocketBfcacheRoute(req: Request, sub: string): Response | null {
  if (sub !== "/disconnect-websockets-on-bfcache-entry/ws") return null;
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return jsonResponse({ error: "Expected WebSocket upgrade." }, { status: 426 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const id = randomBase64Url(6);
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "hello",
      id,
      at: new Date().toISOString(),
      message: "Showcase WebSocket connected.",
    }));
    heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "heartbeat", id, at: new Date().toISOString() }));
      }
    }, 3000);
  };
  socket.onmessage = (event) => {
    socket.send(JSON.stringify({
      type: "echo",
      id,
      at: new Date().toISOString(),
      data: event.data,
    }));
  };
  socket.onclose = () => {
    if (heartbeat !== undefined) clearInterval(heartbeat);
  };
  socket.onerror = () => {
    if (heartbeat !== undefined) clearInterval(heartbeat);
  };
  return response;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildInlineScriptCacheProbeSource(variant: string): string {
  const mutated = variant === "mutated";
  const evalDisqualified = variant === "eval-disqualified";
  const salt = mutated ? "B" : "A";
  const functions = Array.from(
    { length: 720 },
    (_, i) => `function op_${i}(x){return (((x+${i})*(x^${i + 17}))+${(i * 13) % 97})%1000003;}`,
  ).join("\n");
  const dispatch = Array.from({ length: 720 }, (_, i) => `op_${i}`).join(",");
  const evalLine = evalDisqualified ? "checksum += eval('1');" : "";

  return `const scriptElement = document.currentScript;
const meta = scriptElement.dataset;
const observedEntries = [];
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.startsWith('script-')) {
      observedEntries.push({
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  }
});
observer.observe({ entryTypes: ['mark', 'measure'] });
performance.mark('script-start');
const salt = '${salt}';
${functions}
const dispatch = [${dispatch}];
let checksum = salt.charCodeAt(0);
for (let i = 0; i < dispatch.length; i++) {
  checksum = (checksum + dispatch[i](i)) % 2147483647;
}
${evalLine}
performance.mark('script-end');
performance.measure('script-runtime', 'script-start', 'script-end');
setTimeout(() => {
  const entries = [...observedEntries];
  for (const entry of performance.getEntriesByType('mark')) {
    if (entry.name.startsWith('script-')) {
      entries.push({
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  }
  for (const entry of performance.getEntriesByType('measure')) {
    if (entry.name.startsWith('script-')) {
      entries.push({
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
      });
    }
  }
  parent.postMessage({
    type: 'inline-script-cache-probe',
    variant: meta.variant,
    hash: meta.hash,
    bytes: Number(meta.bytes),
    checksum,
    entries,
  }, location.origin);
}, 0);`;
}

async function renderInlineScriptCacheProbeRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub !== "/inline-script-cache/cold-vs-warm/probe") return null;

  const url = new URL(req.url);
  const requestedVariant = url.searchParams.get("variant") ?? "stable";
  const variant = ["stable", "mutated", "eval-disqualified"].includes(requestedVariant)
    ? requestedVariant
    : "stable";
  const source = buildInlineScriptCacheProbeSource(variant);
  const hash = await sha256Hex(source);
  const bytes = new TextEncoder().encode(source).byteLength;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Inline script cache probe</title>
</head>
<body>
  <p>Inline script cache probe: ${escapeHTML(variant)}</p>
  <script data-variant="${escapeHTML(variant)}" data-hash="${hash}" data-bytes="${bytes}">
${source}
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-inline-script-cache-probe": "1",
      "x-script-variant": variant,
      "x-script-hash": hash,
      "x-script-bytes": String(bytes),
    },
  });
}

const FEDCM_BASE = "/v148/agentic-federated-login/fedcm";
const FEDCM_IDP_COOKIE = "showcase_fedcm_idp";
const FEDCM_CLIENT_ID = "chrome-platform-showcase";
const FEDCM_SECRET = "chrome-platform-showcase-fedcm-demo-secret";

const fedCmAccounts = [
  {
    id: "alice-001",
    given_name: "Alice",
    name: "Alice Example",
    email: "alice@example.com",
    username: "alice",
    approved_clients: [FEDCM_CLIENT_ID],
    login_hints: ["alice@example.com", "alice"],
    domain_hints: ["example.com"],
    label_hints: ["agentic", "developer"],
  },
  {
    id: "casey-002",
    given_name: "Casey",
    name: "Casey Partner",
    email: "casey@partner.example",
    username: "casey",
    approved_clients: [],
    login_hints: ["casey@partner.example", "casey"],
    domain_hints: ["partner.example"],
    label_hints: ["agentic"],
  },
];

function fedCmCookieAttributes(req: Request, maxAge: number): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=/v148/agentic-federated-login; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function fedCmSignedInAccount(req: Request) {
  const accountId = parseCookies(req).get(FEDCM_IDP_COOKIE);
  return fedCmAccounts.find((account) => account.id === accountId) ?? null;
}

async function hmacSha256(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(FEDCM_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

async function signFedCmJwt(payload: Record<string, unknown>): Promise<string> {
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${header}.${body}.${await hmacSha256(`${header}.${body}`)}`;
}

async function verifyFedCmJwt(token: string): Promise<{
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "Token is not a compact JWT." };
  const expected = await hmacSha256(`${parts[0]}.${parts[1]}`);
  if (parts[2] !== expected) return { ok: false, error: "JWT signature did not verify." };
  let payload: Record<string, unknown>;
  try {
    payload = decodeBase64UrlJson(parts[1]);
  } catch {
    return { ok: false, error: "JWT payload is not valid JSON." };
  }
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "JWT is expired.", payload };
  }
  return { ok: true, payload };
}

async function fedCmRequestBody(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await req.text());
  }
  if (contentType.includes("application/json")) {
    const json = await req.json();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(json)) {
      if (value != null) params.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    return params;
  }
  return new URLSearchParams(await req.text());
}

function fedCmCorsHeaders(req: Request): Headers {
  const headers = new Headers();
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    "content-type, sec-fetch-dest, x-showcase-fedcm-trace",
  );
  return headers;
}

function fedCmProviderUrls(req: Request): Record<string, string> {
  const origin = new URL(req.url).origin;
  return {
    config: `${origin}${FEDCM_BASE}/config.json`,
    accounts: `${origin}${FEDCM_BASE}/accounts`,
    metadata: `${origin}${FEDCM_BASE}/client-metadata`,
    assertion: `${origin}${FEDCM_BASE}/assertion`,
    disconnect: `${origin}${FEDCM_BASE}/disconnect`,
    login: `${origin}${FEDCM_BASE}/login`,
  };
}

function renderFedCmWellKnown(req: Request): Response {
  const urls = fedCmProviderUrls(req);
  return jsonResponse({
    provider_urls: [urls.config],
    accounts_endpoint: urls.accounts,
    login_url: urls.login,
  });
}

async function renderFedCmRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/agentic-federated-login/fedcm/")) return null;
  const route = sub.slice("/agentic-federated-login/fedcm".length);
  const urls = fedCmProviderUrls(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: fedCmCorsHeaders(req) });

  if (route === "/config.json") {
    return jsonResponse({
      accounts_endpoint: urls.accounts,
      client_metadata_endpoint: urls.metadata,
      id_assertion_endpoint: urls.assertion,
      disconnect_endpoint: urls.disconnect,
      login_url: urls.login,
      account_label: "agentic",
      supports_use_other_account: true,
      branding: {
        background_color: "black",
        color: "white",
      },
    });
  }

  if (route === "/login") {
    const url = new URL(req.url);
    const account = fedCmAccounts.find((item) => item.id === url.searchParams.get("account")) ??
      fedCmAccounts[0];
    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${FEDCM_IDP_COOKIE}=${account.id}; ${fedCmCookieAttributes(req, 60 * 60)}`,
    );
    if (req.method === "GET") {
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(
        `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>FedCM demo IdP login</title><link rel="stylesheet" href="/public/styles.css"></head>
<body><main><h1>FedCM demo IdP login</h1><p>Signed in to the showcase IdP as ${
          escapeHTML(account.email)
        }.</p></main></body></html>`,
        {
          headers,
        },
      );
    }
    return jsonResponse({
      message: "IdP session established for FedCM endpoints.",
      account,
      provider: urls.config,
    }, { headers });
  }

  if (route === "/logout" || route === "/disconnect") {
    const headers = fedCmCorsHeaders(req);
    headers.append("set-cookie", `${FEDCM_IDP_COOKIE}=; ${fedCmCookieAttributes(req, 0)}`);
    return jsonResponse({ message: "FedCM IdP session cleared." }, { headers });
  }

  if (route === "/accounts") {
    const headers = fedCmCorsHeaders(req);
    const account = fedCmSignedInAccount(req);
    if (!account) {
      return jsonResponse({
        error: "No IdP session. POST to /fedcm/login first or use the login_url.",
        secFetchDest: req.headers.get("sec-fetch-dest") ?? null,
      }, { status: 401, headers });
    }
    return jsonResponse({
      accounts: [account],
      secFetchDest: req.headers.get("sec-fetch-dest") ?? null,
    }, { headers });
  }

  if (route === "/client-metadata") {
    return jsonResponse({
      privacy_policy_url: `${new URL(req.url).origin}/v148/agentic-federated-login/`,
      terms_of_service_url: `${new URL(req.url).origin}/v148/agentic-federated-login/`,
    }, { headers: fedCmCorsHeaders(req) });
  }

  if (route === "/assertion" && req.method === "POST") {
    const headers = fedCmCorsHeaders(req);
    const account = fedCmSignedInAccount(req);
    if (!account) {
      return jsonResponse({ error: "No signed-in IdP account." }, { status: 401, headers });
    }
    const body = await fedCmRequestBody(req);
    const accountId = body.get("account_id") ?? account.id;
    const clientId = body.get("client_id") ?? FEDCM_CLIENT_ID;
    if (accountId !== account.id) {
      return jsonResponse({ error: "Requested account does not match the IdP session." }, {
        status: 403,
        headers,
      });
    }
    if (clientId !== FEDCM_CLIENT_ID) {
      return jsonResponse({ error: `Unknown client_id: ${clientId}` }, { status: 403, headers });
    }
    const params = (() => {
      const raw = body.get("params");
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    })() as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const scope = typeof params.scope === "string" ? params.scope : "openid email profile";
    const scopes = scope.split(/\s+/).filter(Boolean);
    const agent = typeof params.agent === "string" && params.agent ? params.agent : null;
    const delegationRequested = params.delegation === true || params.delegation === "true";
    const token = await signFedCmJwt({
      iss: new URL(req.url).origin,
      aud: clientId,
      sub: account.id,
      email: account.email,
      name: account.name,
      iat: now,
      exp: now + 3600,
      nonce: body.get("nonce") ?? params.nonce ?? null,
      scope,
      agentic: Boolean(agent || delegationRequested),
      ...(agent ? { agent } : {}),
      ...(delegationRequested && agent
        ? {
          sub_delegation: {
            delegatee: agent,
            scopes,
            granted_at: now,
            user_consent: body.get("disclosure_text_shown") === "true",
          },
        }
        : {}),
      origin: req.headers.get("origin") ?? new URL(req.url).origin,
      disclosure_shown_for: body.get("disclosure_shown_for") ?? "",
      is_auto_selected: body.get("is_auto_selected") ?? "false",
    });
    return jsonResponse({ token }, { headers });
  }

  if (route === "/validate" && req.method === "POST") {
    const body = await requestJson(req);
    const result = await verifyFedCmJwt(String(body.token ?? ""));
    return jsonResponse(result, { status: result.ok ? 200 : 400 });
  }

  if (route === "/refresh" && req.method === "POST") {
    const body = await requestJson(req);
    const result = await verifyFedCmJwt(String(body.token ?? ""));
    if (!result.ok || !result.payload) return jsonResponse(result, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const token = await signFedCmJwt({
      ...result.payload,
      iat: now,
      exp: now + 3600,
      refresh_count: Number(result.payload.refresh_count ?? 0) + 1,
    });
    return jsonResponse({ token, previous: result.payload });
  }

  if (route === "/delegated-api" && req.method === "POST") {
    const body = await requestJson(req);
    const action = String(body.action ?? "");
    const token = String(body.token ?? "");
    const requiredScopes: Record<string, string> = {
      calendar: "calendar.read",
      email: "email.read",
      tasks: "tasks.write",
      admin: "admin.write",
    };
    const result = await verifyFedCmJwt(token);
    if (!result.ok || !result.payload) return jsonResponse(result, { status: 401 });
    const required = requiredScopes[action];
    if (!required) return jsonResponse({ error: `Unknown action: ${action}` }, { status: 400 });
    const delegation = typeof result.payload.sub_delegation === "object" &&
        result.payload.sub_delegation !== null
      ? result.payload.sub_delegation as Record<string, unknown>
      : null;
    if (!delegation) {
      return jsonResponse({
        error: "not_delegated",
        message: "Token is valid, but it does not carry a delegated authority claim.",
      }, { status: 403 });
    }
    const scopes = Array.isArray(delegation.scopes)
      ? delegation.scopes.map((scope) => String(scope)).filter(Boolean)
      : [];
    if (!scopes.includes(required)) {
      return jsonResponse({
        error: "scope_not_delegated",
        required,
        delegated: scopes,
      }, { status: 403 });
    }
    const responses: Record<string, unknown> = {
      calendar: {
        events: [
          { id: "evt1", title: "Team standup", start: "2026-05-31T09:00:00Z" },
          { id: "evt2", title: "Product review", start: "2026-05-31T14:00:00Z" },
        ],
      },
      email: {
        messages: [
          { id: "m1", from: "bob@example.com", subject: "Quarterly report" },
          { id: "m2", from: "carol@example.com", subject: "Re: project update" },
        ],
      },
      tasks: {
        task_id: `tsk_${randomBase64Url(5)}`,
        title: "Follow up on quarterly report",
        status: "created",
      },
    };
    return jsonResponse({
      action,
      required,
      delegated_by: result.payload.email,
      agent: delegation.delegatee,
      result: responses[action],
    });
  }

  return null;
}

function renderV151CapabilityEcho(req: Request): Response {
  const url = new URL(req.url);
  const started = performance.now();
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 0), 0), 1200);
  const scenario = url.searchParams.get("scenario") ?? "balanced";
  const tier = Number(url.searchParams.get("tier") ?? 2);
  const profile = tier >= 4 ? "full-fidelity" : tier >= 2 ? "balanced" : "conservative";
  const payload = {
    scenario,
    requestedTier: tier,
    selectedProfile: profile,
    serverTiming: `app;dur=${Math.round(delay)}, profile;desc="${profile}"`,
    request: {
      method: req.method,
      userAgent: req.headers.get("user-agent") ?? "",
      secFetchMode: req.headers.get("sec-fetch-mode") ?? "",
      secFetchSite: req.headers.get("sec-fetch-site") ?? "",
      accept: req.headers.get("accept") ?? "",
    },
    elapsedMs: Math.round(performance.now() - started + delay),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "server-timing": `app;dur=${Math.round(delay)}, profile;desc="${profile}"`,
    },
  });
}

async function renderV151DelayedEcho(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 80), 0), 2000);
  const label = url.searchParams.get("label") ?? "resource";
  await new Promise((resolve) => setTimeout(resolve, delay));
  return jsonResponse({
    label,
    delay,
    time: new Date().toISOString(),
    request: {
      destination: req.headers.get("sec-fetch-dest") ?? "",
      mode: req.headers.get("sec-fetch-mode") ?? "",
      site: req.headers.get("sec-fetch-site") ?? "",
    },
    note:
      "Use PerformanceResourceTiming to inspect duration, transfer size, Server-Timing, and Chrome 151 service-worker router fields when a static router is active.",
  }, {
    headers: { "server-timing": `edge;dur=${delay};desc="${label}"` },
  });
}

function renderV151PolicyEcho(req: Request): Response {
  const url = new URL(req.url);
  const local = url.searchParams.get("local") ?? "self";
  const loopback = url.searchParams.get("loopback") ?? "self";
  const allow = url.searchParams.get("allow") ?? "none";
  const policy = `local-network=(${local}), loopback-network=(${loopback})`;
  return jsonResponse({
    permissionsPolicy: policy,
    iframeAllow: allow === "trusted" ? "local-network; loopback-network" : "",
    request: {
      origin: req.headers.get("origin") ?? "",
      referer: req.headers.get("referer") ?? "",
      secFetchSite: req.headers.get("sec-fetch-site") ?? "",
    },
    migration: {
      chrome150:
        `Permissions-Policy: direct-sockets-private=(${local}), local-network=(${local}), loopback-network=(${loopback})`,
      chrome151: `Permissions-Policy: ${policy}`,
    },
  }, {
    headers: { "permissions-policy": policy },
  });
}

function renderV151HtmlStream(req: Request): Response {
  const url = new URL(req.url);
  const chunks = Math.min(Math.max(Number(url.searchParams.get("chunks") ?? 6), 1), 12);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 180), 0), 1200);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<article class="stream-item"><h3>stream started</h3>`));
      for (let i = 1; i <= chunks; i++) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        controller.enqueue(
          encoder.encode(
            `<p><strong>Chunk ${i}</strong> arrived after ${delay}ms and can be parsed without buffering the full response.</p>`,
          ),
        );
      }
      controller.enqueue(encoder.encode(`<p><strong>complete</strong></p></article>`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

interface PatchingChunk {
  delay: number;
  label: string;
  html: string;
}

function numberParam(url: URL, name: string, fallback: number, min: number, max: number): number {
  const value = Number(url.searchParams.get(name) ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

function renderOutOfOrderStreamingLiveRoute(req: Request, sub: string): Response | null {
  const match = sub.match(/^\/out-of-order-streaming\/([^/]+)\/live\/?$/);
  if (!match) return null;

  const concept = match[1];
  const url = new URL(req.url);
  const baseDelay = numberParam(url, "delay", 700, 100, 2400);
  const slow = url.searchParams.get("slow") ?? "profile";
  const scenario = url.searchParams.get("scenario") ?? "related-first";

  function loading(label: string): string {
    return `<div class="skeleton" data-placeholder>${escapeHTML(label)}</div>`;
  }

  function shellForConcept(): {
    title: string;
    lede: string;
    body: string;
    chunks: PatchingChunk[];
  } {
    if (concept === "ai-chat-simulation") {
      const slowToken = numberParam(url, "token", 4, 1, 8);
      const tokens = [
        "Out-of-order ",
        "HTML ",
        "patching ",
        "lets ",
        "ready ",
        "tokens ",
        "paint ",
        "first.",
      ];
      return {
        title: "AI response patch stream",
        lede:
          "The server appends each generated token with repeated template patches and a marker that keeps the insertion point alive.",
        body: `
          <section class="panel chat-panel">
            <h2>Assistant reply</h2>
            <p class="muted">Initial HTML contains only the shell and a processing-instruction range.</p>
            <div class="chat-bubble">
              <?start name="ai-tokens">${loading("Waiting for streamed tokens...")}<?end>
            </div>
          </section>
          <section class="panel">
            <h2>Server events</h2>
            <ol class="event-log">
              <?start name="server-log">${loading("No template chunks sent yet.")}<?end>
            </ol>
          </section>`,
        chunks: tokens.map((token, index) => {
          const position = index + 1;
          const delay = position === slowToken ? baseDelay + 900 : 180 + index * 130;
          return {
            delay,
            label: `token ${position}`,
            html: `
              <template for="ai-tokens"><span class="token">${
              escapeHTML(token)
            }</span><?marker name="ai-tokens"></template>
              <template for="server-log"><li>Token ${position} patch arrived after ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }),
      };
    }

    if (concept === "pipeline-demo") {
      const bottleneck = url.searchParams.get("stage") ?? "transform";
      const stages = [
        ["fetch", "Fetch user record", "The HTML shell can show route chrome immediately."],
        [
          "transform",
          "Format recommendation",
          "The slow middle task no longer blocks later patches.",
        ],
        ["write", "Render final CTA", "The final action lands when its server work completes."],
      ] as const;
      return {
        title: "Server pipeline patch stream",
        lede:
          "Each backend stage is represented by a processing-instruction range. The server writes the ready stage as a template patch.",
        body: `
          <section class="pipeline-grid">
            ${
          stages.map(([id, title]) =>
            `<article class="panel">
              <h2>${escapeHTML(title)}</h2>
              <?start name="${id}">${loading(`${title} pending...`)}<?end>
            </article>`
          ).join("")
        }
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("Pipeline not flushed yet.")
        }<?end></ol>
          </section>`,
        chunks: stages.map(([id, title, detail], index) => {
          const delay = id === bottleneck ? baseDelay + 900 : 220 + index * 180;
          return {
            delay,
            label: title,
            html: `
              <template for="${id}">
                <div class="result-card">
                  <strong>${escapeHTML(title)}</strong>
                  <p>${escapeHTML(detail)}</p>
                  <span class="pill">patched at ${delay}ms</span>
                </div>
              </template>
              <template for="server-log"><li>${
              escapeHTML(title)
            } template sent at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }),
      };
    }

    if (concept === "chunk-visualizer") {
      const slowTarget = ["hero", "stats", "activity"].includes(slow) ? slow : "stats";
      const targets = [
        ["hero", "Hero summary", "Revenue forecast ready before the slow analytics table."],
        ["stats", "Metric cards", "Four KPI cards streamed from an expensive aggregation."],
        ["activity", "Activity feed", "Recent events append independently at the bottom."],
      ] as const;
      return {
        title: "Configurable delayed patch stream",
        lede:
          "Choose which section is slow. The other template patches can still update their named ranges first.",
        body: `
          <section class="dashboard-grid">
            ${
          targets.map(([id, title]) =>
            `<article class="panel">
              <h2>${escapeHTML(title)}</h2>
              <?start name="${id}">${loading(`${title} placeholder`)}<?end>
            </article>`
          ).join("")
        }
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("Waiting for chunks...")
        }<?end></ol>
          </section>`,
        chunks: targets.map(([id, title, detail], index) => {
          const delay = id === slowTarget ? baseDelay + 1000 : 240 + index * 170;
          return {
            delay,
            label: title,
            html: `
              <template for="${id}">
                <div class="result-card">
                  <strong>${escapeHTML(title)}</strong>
                  <p>${escapeHTML(detail)}</p>
                </div>
              </template>
              <template for="server-log"><li>${
              escapeHTML(title)
            } patch flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }),
      };
    }

    if (concept === "chunk-timing-chart") {
      const chunks = [
        ["chunk-one", "Chunk 1", 180],
        ["chunk-two", "Chunk 2", baseDelay + 900],
        ["chunk-three", "Chunk 3", 320],
        ["chunk-four", "Chunk 4", 460],
        ["chunk-five", "Chunk 5", 620],
        ["chunk-six", "Chunk 6", 760],
      ] as const;
      return {
        title: "Timing chart patch stream",
        lede:
          "Chunk 2 is intentionally slow. The later template patches are sent earlier and can patch their rows before chunk 2 completes.",
        body: `
          <section class="panel">
            <h2>Rows patched by the parser</h2>
            <ol class="timing-list">
              ${
          chunks.map(([id, label]) =>
            `<li><strong>${escapeHTML(label)}</strong><?start name="${id}">${
              loading("pending")
            }<?end></li>`
          ).join("")
        }
            </ol>
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("No rows patched yet.")
        }<?end></ol>
          </section>`,
        chunks: chunks.map(([id, label, delay]) => ({
          delay,
          label,
          html: `
            <template for="${id}"><span class="pill">template arrived at ${delay}ms</span></template>
            <template for="server-log"><li>${
            escapeHTML(label)
          } template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
        })),
      };
    }

    if (concept === "streaming-demo") {
      return {
        title: "Minimal parser patch stream",
        lede:
          "A small page shell is parsed first. Later bytes contain template patches that replace the fallback without client DOM code.",
        body: `
          <section class="two-column">
            <article class="panel">
              <h2>Primary slot</h2>
              <?start name="primary">${loading("Primary content loading...")}<?end>
            </article>
            <article class="panel">
              <h2>Secondary slot</h2>
              <?start name="secondary">${loading("Secondary content loading...")}<?end>
            </article>
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("Waiting for the response body...")
        }<?end></ol>
          </section>`,
        chunks: [
          {
            delay: 260,
            label: "secondary",
            html: `
              <template for="secondary"><p>Secondary content was ready first and patched before the primary slot.</p></template>
              <template for="server-log"><li>Secondary template arrived first.</li><?marker name="server-log"></template>`,
          },
          {
            delay: baseDelay,
            label: "primary",
            html: `
              <template for="primary"><p>Primary content arrived later, but no client script selected this node.</p></template>
              <template for="server-log"><li>Primary template arrived after ${baseDelay}ms.</li><?marker name="server-log"></template>`,
          },
        ],
      };
    }

    const order: Array<[string, number]> = scenario === "hero-first"
      ? [
        ["hero", 250],
        ["related", baseDelay],
        ["results-a", 500],
        ["results-b", 850],
      ]
      : [
        ["related", 240],
        ["results-a", 420],
        ["hero", baseDelay + 700],
        ["results-b", 760],
      ];
    const delayFor = (id: string) => Number(order.find(([name]) => name === id)?.[1] ?? baseDelay);
    return {
      title: "Chunk ordering patch stream",
      lede:
        "The shell declares hero, related, and result ranges. The server sends templates in readiness order, not DOM order.",
      body: `
        <section class="two-column">
          <article class="panel feature-panel">
            <h2>Hero</h2>
            <?start name="hero">${loading("Hero query still running...")}<?end>
          </article>
          <aside class="panel">
            <h2>Related links</h2>
            <?start name="related">${loading("Related links pending...")}<?end>
          </aside>
        </section>
        <section class="panel">
          <h2>Search results</h2>
          <ol class="result-list"><?start name="results">${
        loading("Results stream waiting...")
      }<?end></ol>
        </section>
        <section class="panel">
          <h2>Patch order</h2>
          <ol class="event-log"><?start name="server-log">${
        loading("No template chunks sent yet.")
      }<?end></ol>
        </section>`,
      chunks: order.map(([id]) => {
        if (id === "hero") {
          const delay = delayFor(id);
          return {
            delay,
            label: "hero",
            html: `
              <template for="hero">
                <div class="result-card">
                  <strong>Hero patched after ${delay}ms</strong>
                  <p>This slow section no longer blocks related links or result rows.</p>
                </div>
              </template>
              <template for="server-log"><li>Hero template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }
        if (id === "related") {
          const delay = delayFor(id);
          return {
            delay,
            label: "related",
            html: `
              <template for="related">
                <nav class="link-stack">
                  <a href="#spec">Patching explainer</a>
                  <a href="#constraints">Same-tree constraints</a>
                  <a href="#markers">Repeated markers</a>
                </nav>
              </template>
              <template for="server-log"><li>Related links template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }
        const resultNumber = id === "results-a" ? 1 : 2;
        const delay = delayFor(id);
        return {
          delay,
          label: `result ${resultNumber}`,
          html: `
            <template for="results">
              <li>Result ${resultNumber} patched at ${delay}ms.</li>
              <?marker name="results">
            </template>
            <template for="server-log"><li>Result ${resultNumber} template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
        };
      }),
    };
  }

  const demo = shellForConcept();
  const encoder = new TextEncoder();
  const started = Date.now();
  const chunks = [...demo.chunks].sort((a, b) => a.delay - b.delay);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(demo.title)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    body { background: var(--bg-ivory); }
    main { max-width: 920px; padding: var(--space-5); }
    .stream-shell { display: grid; gap: var(--space-4); }
    .panel { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-4); }
    .panel h2 { font-size: 1rem; margin-top: 0; }
    .muted, .lede { color: var(--text-muted); }
    .two-column, .dashboard-grid, .pipeline-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dashboard-grid, .pipeline-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .feature-panel { min-height: 10rem; }
    .skeleton { background: var(--bg-stone); border: 1px dashed var(--border-black); color: var(--text-muted); font-family: var(--font-mono); padding: var(--space-3); }
    .result-card { display: grid; gap: var(--space-2); }
    .pill { border: 1px solid var(--accent-blue); color: var(--accent-blue); display: inline-block; font-family: var(--font-mono); font-size: 0.75rem; padding: 0.15rem 0.4rem; }
    .event-log, .result-list, .timing-list { display: grid; gap: var(--space-2); padding-left: 1.3rem; }
    .chat-bubble { border: 1px solid var(--border-black); min-height: 5rem; padding: var(--space-4); }
    .token { font-size: 1.15rem; line-height: 1.7; }
    .link-stack { display: grid; gap: var(--space-2); }
    .support-warning { background: color-mix(in srgb, var(--accent-rose) 10%, var(--bg-paper)); border: 2px solid var(--accent-rose); color: var(--text-black); padding: var(--space-3); }
    @media (max-width: 720px) { .two-column, .dashboard-grid, .pipeline-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<main>
  <header class="lede-block">
    <p class="eyebrow">live streamed document</p>
    <h1>${escapeHTML(demo.title)}</h1>
    <p class="lede">${escapeHTML(demo.lede)}</p>
  </header>
  <div id="support-warning" class="support-warning" hidden>
    This browser did not apply the streamed template patches. Enable Chrome 150+ support or experimental web platform features, then reload this streamed route.
  </div>
  <div class="stream-shell">
${demo.body}
`));

      for (const chunk of chunks) {
        const wait = Math.max(0, started + chunk.delay - Date.now());
        await new Promise((resolve) => setTimeout(resolve, wait));
        controller.enqueue(
          encoder.encode(`\n<!-- ${escapeHTML(chunk.label)} patch -->\n${chunk.html}\n`),
        );
      }

      controller.enqueue(encoder.encode(`
  </div>
  <script>
    setTimeout(() => {
      const unappliedTemplates = document.querySelectorAll("template[for]").length;
      const placeholders = document.querySelectorAll("[data-placeholder]").length;
      const warning = document.getElementById("support-warning");
      if (warning && (unappliedTemplates > 0 || placeholders > 0)) {
        warning.hidden = false;
      }
    }, 80);
  </script>
</main>
</body>
</html>`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function renderProcessingInstructionStreamingUseCaseRoute(
  req: Request,
  sub: string,
): Response | null {
  if (sub !== "/parse-processing-instructions-in-html/streaming-use-case/live") return null;

  const url = new URL(req.url);
  const delay = numberParam(url, "delay", 700, 100, 2400);
  const scenario = url.searchParams.get("scenario") === "metadata" ? "metadata" : "range";
  const encoder = new TextEncoder();
  const chunks = scenario === "metadata"
    ? [
      {
        wait: 160,
        label: "metadata pi",
        html:
          `<?build-info commit="8fd3" region="edge"?>\n<section class="panel"><h2>Fast shell</h2><p>The first streamed chunk carried build metadata as a processing instruction.</p></section>`,
      },
      {
        wait: delay,
        label: "feature flag pi",
        html:
          `<?feature-flags experiment="native-pi-parser" cohort="demo"?>\n<section class="panel"><h2>Delayed flags</h2><p>Later bytes can carry app metadata without adding elements that CSS or layout need to account for.</p></section>`,
      },
      {
        wait: delay + 300,
        label: "trace pi",
        html: `<?trace-point name="after-delayed-flags" elapsed="${
          delay + 300
        }"?>\n<section class="panel"><h2>Trace marker</h2><p>The final processing instruction is still a DOM node when the report script walks the tree.</p></section>`,
      },
    ]
    : [
      {
        wait: 160,
        label: "range start pi",
        html:
          `<?stream-start name="recommendations" phase="placeholder"?>\n<section class="panel"><h2>Recommendations shell</h2><p class="skeleton">Placeholder rendered while the server waits on a slow source.</p></section>`,
      },
      {
        wait: delay,
        label: "range end and data pi",
        html:
          `<?stream-end name="recommendations"?>\n<?server-data source="recommendations-db" rows="3"?>\n<section class="panel"><h2>Recommendations ready</h2><ul><li>Parser-visible range markers</li><li>No wrapper element needed for the marker</li><li>TreeWalker can find the nodes</li></ul></section>`,
      },
      {
        wait: delay + 320,
        label: "append range pi",
        html:
          `<?stream-start name="activity" phase="append"?>\n<section class="panel"><h2>Activity stream</h2><p>Another range marker arrives later in the same HTML response.</p></section>\n<?stream-end name="activity"?>`,
      },
    ];

  const started = Date.now();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Live ProcessingInstruction stream</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    body { background: var(--bg-ivory); }
    main { display: grid; gap: var(--space-4); max-width: 820px; padding: var(--space-5); }
    .panel { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-4); }
    .panel h2 { font-size: 1rem; margin-top: 0; }
    .skeleton { background: var(--bg-stone); border: 1px dashed var(--border-black); color: var(--text-muted); padding: var(--space-3); }
    .report { background: var(--text-black); color: var(--bg-ivory); font-family: var(--font-mono); font-size: 0.78rem; overflow: auto; padding: var(--space-3); white-space: pre-wrap; }
    .unsupported { background: color-mix(in srgb, var(--accent-rose) 12%, var(--bg-paper)); border: 2px solid var(--accent-rose); padding: var(--space-3); }
  </style>
</head>
<body>
<main>
  <header class="lede-block">
    <p class="eyebrow">streamed HTML parser probe</p>
    <h1>ProcessingInstruction nodes from streamed HTML</h1>
    <p class="lede">The server is still sending this document. Each later chunk contains literal <code>&lt;?target data?&gt;</code> syntax, not nodes created by script.</p>
  </header>
`));

      for (const chunk of chunks) {
        const wait = Math.max(0, started + chunk.wait - Date.now());
        await new Promise((resolve) => setTimeout(resolve, wait));
        controller.enqueue(
          encoder.encode(`\n<!-- ${escapeHTML(chunk.label)} -->\n${chunk.html}\n`),
        );
      }

      controller.enqueue(encoder.encode(`
  <section class="panel">
    <h2>Parser report</h2>
    <div id="unsupported" class="unsupported" hidden>The HTML parser did not expose any ProcessingInstruction nodes from this streamed document.</div>
    <pre id="pi-report" class="report">Waiting for parser inspection...</pre>
  </section>
  <script>
    (() => {
      const report = document.getElementById("pi-report");
      const warning = document.getElementById("unsupported");
      const rows = [];
      try {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_PROCESSING_INSTRUCTION);
        let node;
        while ((node = walker.nextNode())) {
          rows.push({
            target: node.target,
            data: node.data,
            nodeType: node.nodeType,
            constructor: node.constructor.name
          });
        }
      } catch (error) {
        rows.push({ error: error.message || String(error) });
      }
      if (!rows.length) warning.hidden = false;
      report.textContent = rows.length
        ? rows.map((row, index) => {
          if (row.error) return "error: " + row.error;
          return (index + 1) + ". target=" + row.target + "\\n   data=" + row.data + "\\n   nodeType=" + row.nodeType + "\\n   constructor=" + row.constructor;
        }).join("\\n\\n")
        : "No ProcessingInstruction nodes found.";
    })();
  </script>
</main>
</body>
</html>`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

// ----- Page rendering -----

function statusBadgeFor(channels: Channels, milestone: number): string {
  if (milestone === channels.stable.mstone) return "Stable";
  if (milestone === channels.beta.mstone) return "Beta";
  if (milestone === channels.dev.mstone) return "Dev";
  if (milestone < channels.stable.mstone) return "Released";
  return "Upcoming";
}

function parseDate(date: string | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function datePart(date: Date, part: "day" | "month" | "year"): string {
  if (part === "month") return date.toLocaleDateString("en-GB", { month: "short" });
  return date.toLocaleDateString("en-GB", { [part]: "numeric" });
}

function stableDateRangeFromDates(
  stableDate: string | undefined,
  finalStableDate: string | undefined,
): string {
  const start = parseDate(stableDate);
  if (!start) return "";
  const end = parseDate(finalStableDate);
  if (!end || end.getTime() === start.getTime()) {
    return start.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const startYear = datePart(start, "year");
  const endYear = datePart(end, "year");
  const startMonth = datePart(start, "month");
  const endMonth = datePart(end, "month");
  const startDay = datePart(start, "day");
  const endDay = datePart(end, "day");

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}-${endDay} ${endMonth} ${endYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${startMonth}-${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} ${startYear}-${endDay} ${endMonth} ${endYear}`;
}

function stableDateRange(channel: Channel | MilestoneSchedule): string {
  return stableDateRangeFromDates(
    channel.stable_date,
    channel.late_stable_date ?? channel.stable_refresh_first,
  );
}

async function renderIndex(channels: Channels): Promise<string> {
  const commit = await getLatestCommit();
  // Chromestatus's "stable.mstone" is the *next* stable cut, even when its
  // stable_date is still a few days away. Most users are on stable-1 until
  // the cut lands. Show that release too so the issue stream and the catalogue
  // line up with what's actually deployed.
  const prevStable = channels.stable.mstone - 1;
  const releases: { mstone: number; status: string; stableRange: string }[] = [
    { mstone: channels.dev.mstone, status: "Dev", stableRange: stableDateRange(channels.dev) },
    { mstone: channels.beta.mstone, status: "Beta", stableRange: stableDateRange(channels.beta) },
    {
      mstone: channels.stable.mstone,
      status: "Stable (rolling out)",
      stableRange: stableDateRange(channels.stable),
    },
    { mstone: prevStable, status: "Stable (live)", stableRange: "" },
  ];

  // Surface older releases that have v<N>/ folders too, so a
  // demo for an older Chrome doesn't get hidden just because the channels API
  // no longer mentions it.
  const seen = new Set(releases.map((r) => r.mstone));
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        const m = Number(entry.name.slice(1));
        if (!seen.has(m)) {
          releases.push({ mstone: m, status: "Archive", stableRange: "" });
          seen.add(m);
        }
      }
    }
  } catch {
    // ignore — Deno Deploy can refuse the readDir at root in some isolates.
  }

  await Promise.all(releases.map(async (release) => {
    if (release.stableRange) return;
    const schedule = await getMilestoneSchedule(release.mstone);
    if (schedule) release.stableRange = stableDateRange(schedule);
  }));

  releases.sort((a, b) => b.mstone - a.mstone);

  const cards = releases.map((r) => {
    let note: string;
    if (r.stableRange) {
      note = `Stable date range: ${r.stableRange}`;
    } else if (r.status === "Archive") {
      note = "Stable date unavailable";
    } else {
      note = "Most users are here";
    }
    return `<li class="release-card">
      <a class="release-card-link" href="/v${r.mstone}/">
        <span class="release-card-row">
          <span class="release-label">Chrome ${r.mstone}</span>
          <span class="release-status">${escapeHTML(r.status)}</span>
        </span>
        <span class="release-note">${escapeHTML(note)}</span>
      </a>
    </li>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <main>
    <header class="lede-block">
      <p class="eyebrow">work in progress</p>
      <h1>chrome platform showcase</h1>
      <p class="lede">A premium, hand-crafted demo for every new web platform feature shipping in Chrome. One per API. One uber-demo per release. Maintained by an automated routine; reviewed and merged by humans.</p>
      ${formatCommitLine(commit)}
    </header>

    <section>
      <h2>releases</h2>
      <ol class="release-list">${cards}</ol>
      <p class="note">Or jump straight to <a href="/features">the full feature catalogue</a>, <a href="/categories/">browse by category</a> (identity, on-device AI, CSS layout, WebGPU, privacy…), the <a href="/critiques/">self-critique</a> (a reviewer agent's open-questions list per concept), or run the <a href="/conformance/">conformance probes</a> in your browser (live pass/fail against the spec). Release cards show stable rollout ranges from ChromeStatus and Chromium Dash schedules when available.</p>
    </section>

    <section class="how">
      <h2>how it works</h2>
      <ol>
        <li>The routine reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">chromestatus.com</a> JSON API for current, upcoming, and archived milestones.</li>
        <li>It builds every missing feature directly from the listing name, feature details, specs, docs, samples, and explainers.</li>
        <li>Each feature gets a feature index plus every distinct interactive concept the API needs; 2-3 concepts is a floor, not a cap.</li>
        <li>The routine commits one feature at a time to <code>main</code>. Deno Deploy redeploys from GitHub.</li>
        <li>Humans review the live output and tighten demos, server routes, and the routine prompt as needed.</li>
      </ol>
      <p class="note">Repo: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>.</p>
    </section>

    <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
  </main>
</body>
</html>`;
}

// ----- Categories taxonomy -----
//
// A thematic grouping over features that's coarser than chromestatus's own
// category field. The goal is to let visitors browse by interest area (identity
// & auth, CSS layout, WebGPU, etc.) rather than by chromestatus's own
// engineering-team bucketing.
//
// Per-feature primary category is derived by keyword match against the feature
// name and (as a fallback) the chromestatus category. The first matching
// taxonomy entry wins, so ordering matters: put more specific rules first.

interface Category {
  slug: string;
  label: string;
  blurb: string;
  patterns: RegExp[];
}

const CATEGORIES: Category[] = [
  {
    slug: "identity-and-auth",
    label: "Identity & Auth",
    blurb:
      "Passkeys, WebAuthn, FedCM, Digital Credentials, autofill, payment confirmation, sign-in flows.",
    patterns: [
      /webauthn/i,
      /passkey/i,
      /fedcm/i,
      /\bdbsc\b/i,
      /device.bound.session/i,
      /\bcredential\b/i,
      /autofill/i,
      /publickeycredential/i,
      /payment.confirmation/i,
      /\bspc\b/i,
      /digital.credential/i,
      /email.verification/i,
      /web.install/i,
      /facilitated.payment/i,
      /identity/i,
      /storage.access/i,
      /related.website.set/i,
      /requeststorageaccessfor/i,
    ],
  },
  {
    slug: "on-device-ai",
    label: "On-device AI",
    blurb:
      "Prompt API, Summariser, Translator, Language Detector, Proofreader, Writer, Rewriter, on-device speech.",
    patterns: [
      /prompt.api/i,
      /summari[sz]er/i,
      /translator/i,
      /language.detector/i,
      /proofreader/i,
      /\bwriter.api/i,
      /\brewriter.api/i,
      /language.model/i,
      /on.device/i,
      /web.speech/i,
      /webnn/i,
      /abusive.notif/i,
    ],
  },
  {
    slug: "css-layout",
    label: "CSS Layout",
    blurb:
      "Anchor positioning, container queries, scroll-state, view transitions, reading-flow, focusgroup, carousels.",
    patterns: [
      /anchor.positioning/i,
      /anchor.scope/i,
      /\banchor-size\b/i,
      /container.quer/i,
      /container.name/i,
      /scroll.state/i,
      /scroll.target.group/i,
      /scroll.button/i,
      /scroll.marker/i,
      /scroll.triggered/i,
      /overscroll/i,
      /reading.flow/i,
      /reading.order/i,
      /focusgroup/i,
      /carousel/i,
      /flex.wrap/i,
      /flex.basis/i,
      /grid/i,
      /sideways.writing/i,
      /logical.overflow/i,
      /page.margin.box/i,
      /\b@page\b/i,
    ],
  },
  {
    slug: "css-typography",
    label: "CSS Typography",
    blurb:
      "Text wrap, text-box-trim, font-feature/variation, ruby, font-language-override, font-variant-emoji, line decorations.",
    patterns: [
      /text.wrap/i,
      /text.box/i,
      /font.feature/i,
      /font.variation/i,
      /font.language/i,
      /font.variant.emoji/i,
      /\bruby\b/i,
      /letter.spacing/i,
      /text.decoration/i,
      /text.size.adjust/i,
      /h1.within/i,
      /cursive.scripts/i,
      /textmetrics/i,
      /opentype/i,
      /open.font.format/i,
    ],
  },
  {
    slug: "css-visual",
    label: "CSS Visual",
    blurb:
      "Corner-shape, colour functions, dynamic-range-limit, accent-color, caret-, paint, image, table borders.",
    patterns: [
      /corner.shap/i,
      /squircle/i,
      /superellipse/i,
      /dynamic.range/i,
      /accent.color/i,
      /accentcolor/i,
      /\bcaret\b/i,
      /\b::view-transition/i,
      /currentcolor/i,
      /print.color/i,
      /background.position/i,
      /background.clip/i,
      /box.decoration.break/i,
      /image.rendering/i,
      /smoothing/i,
      /color.fn/i,
      /relative.alpha/i,
      /css.image.color/i,
      /light.dark/i,
      /border.color/i,
      /clip.text/i,
    ],
  },
  {
    slug: "css-functions",
    label: "CSS Functions & Syntax",
    blurb:
      "if(), attr(), counter, sibling-index, custom @function, nesting, @supports/at-rule(), @property, shape(), progress().",
    patterns: [
      /css.if/i,
      /attr\(/i,
      /\bcounter\b/i,
      /sibling.index/i,
      /custom.function/i,
      /custom.functions/i,
      /nesting/i,
      /supports/i,
      /at.rule/i,
      /\b@property\b/i,
      /property.support/i,
      /shape\b.*function/i,
      /progress\(/i,
      /typed.arithmetic/i,
      /sign.related/i,
      /short.circuit/i,
      /name.only/i,
      /comma.separated.container/i,
      /declarative.css.module/i,
      /raw.string/i,
      /style.container/i,
      /named.feature.function/i,
    ],
  },
  {
    slug: "forms-and-input",
    label: "Forms & Input",
    blurb:
      "Customizable <select>, popover, dialog, autofill event, focusgroup, interestfor, invoker commands, keyboard input.",
    patterns: [
      /\bselect\b/i,
      /selectedcontent/i,
      /popover/i,
      /dialog/i,
      /invoker/i,
      /\binterestfor\b/i,
      /\bcommand\b/i,
      /\bhint\b/i,
      /pointer.lock/i,
      /pointer.event/i,
      /pointerrawupdate/i,
      /keyboard/i,
      /virtual.keyboard/i,
      /mouseup/i,
      /click/i,
      /aria/i,
      /focus/i,
      /selection/i,
      /ime/i,
      /editcontext/i,
      /content.editable/i,
      /textarea/i,
      /opaquerange/i,
      /input.event/i,
      /event.handler/i,
      /gamepad/i,
      /spellcheck/i,
      /spelling/i,
    ],
  },
  {
    slug: "privacy-and-security",
    label: "Privacy & Security",
    blurb:
      "CSP, COOP, Document-Isolation-Policy, Local Network Access, partitioning, signature integrity, sandboxing, removals of legacy attack surface.",
    patterns: [
      /\bcsp\b/i,
      /content.security.policy/i,
      /coop\b/i,
      /coep\b/i,
      /document.isolation/i,
      /local.network/i,
      /attribution.report/i,
      /partition/i,
      /\bhsts\b/i,
      /strict.transport/i,
      /private.aggregation/i,
      /shared.storage/i,
      /protected.audience/i,
      /\bpst\b/i,
      /private.state.token/i,
      /\bfenced/i,
      /signature.based.integrity/i,
      /integrity.policy/i,
      /\bsri\b/i,
      /sandboxed/i,
      /isolation/i,
      /noopener/i,
      /allowlist/i,
      /permissions.policy/i,
      /xslt/i,
      /xxe/i,
      /externally.loaded.entities/i,
      /xss/i,
      /clickjack/i,
      /bounce.tracking/i,
      /document.policy/i,
      /visited.links/i,
      /opaque.origin/i,
      /noopener.allow.popups/i,
      /event.interfaces/i,
      /sub.resource.integrity/i,
      /report.to/i,
      /reporting/i,
      /crash.reporting/i,
      /connection.allowlist/i,
      /focus.without.user.activation/i,
      /agentic.federated/i,
    ],
  },
  {
    slug: "webgpu",
    label: "WebGPU",
    blurb:
      "Adapters, devices, textures, buffers, WGSL features, subgroups, dual-source blending, compatibility mode.",
    patterns: [
      /webgpu/i,
      /\bgpu\w*/i,
      /\bwgsl\b/i,
      /subgroup/i,
      /clip.distance/i,
      /uniform.buffer/i,
      /vertex.format/i,
      /texture.compress/i,
      /dual.source/i,
      /externaltexture/i,
      /copybuffer/i,
      /linear.indexing/i,
      /maxinterstage/i,
      /compatibility.mode/i,
      /core.features/i,
      /primitive.index/i,
    ],
  },
  {
    slug: "webassembly",
    label: "WebAssembly",
    blurb: "Wasm features: memory64, branch hints, JSPI, JS String Builtins, custom descriptors.",
    patterns: [
      /webassembly/i,
      /\bwasm\b/i,
      /jspi/i,
      /js.promise.integration/i,
      /custom.descriptors/i,
      /memory64/i,
      /branch.hints/i,
      /js.string.builtins/i,
    ],
  },
  {
    slug: "workers-and-runtime",
    label: "Workers & Runtime",
    blurb:
      "SharedWorker, Dedicated Workers, Service Workers, scheduling, freeze/resume lifecycle, runtime extras.",
    patterns: [
      /sharedworker/i,
      /shared.worker/i,
      /service.worker/i,
      /dedicated.workers?/i,
      /workers?(?!.let|.tablet)/i,
      /scheduler/i,
      /scheduling/i,
      /\bfreez/i,
      /resume/i,
      /background.freeze/i,
      /energy.saver/i,
      /static.router/i,
      /autopreload/i,
      /atomics/i,
      /\bset(interval|timeout)\b/i,
      /explicit.resource.management/i,
      /await.using/i,
      /\busing\b/i,
      /import.maps/i,
      /js.profiling/i,
      /v8.profiler/i,
      /inline.script.cache/i,
      /compile.hints/i,
      /platform.provided.behavior/i,
      /element.internals/i,
      /element.reflection/i,
      /element.scoped/i,
      /element.capture/i,
    ],
  },
  {
    slug: "media-and-realtime",
    label: "Media & Realtime",
    blurb:
      "WebRTC, MediaStream, getDisplayMedia, MediaSession, WebCodecs, MediaRecorder, captured surface, PiP, Speech API.",
    patterns: [
      /webrtc/i,
      /\brtc\b/i,
      /mediastream/i,
      /getdisplaymedia/i,
      /mediasession/i,
      /webcodecs/i,
      /mediarecorder/i,
      /captured.surface/i,
      /picture.in.picture/i,
      /\bpip\b/i,
      /videoframe/i,
      /audio.level/i,
      /audio.context/i,
      /audio.output/i,
      /webaudio/i,
      /audio.worklet/i,
      /h26/i,
      /\bhevc\b/i,
      /h265/i,
      /restrictown/i,
      /windowaudio/i,
      /capabilit.*usermedia/i,
      /usermedia/i,
      /encoded.transform/i,
      /encoded.frame/i,
      /rtp/i,
      /rtcdegradation/i,
      /track.processor/i,
      /webxr/i,
      /xrvisibilit/i,
      /immersive/i,
      /xr/i,
      /captured.pointer/i,
      /facilitated/i,
      /scaleresolution/i,
      /echo.cancellation/i,
    ],
  },
  {
    slug: "storage-and-files",
    label: "Storage & Files",
    blurb:
      "IndexedDB, OPFS, FileSystemObserver, quota, Clipboard, ClipboardItem, blob, file pickers.",
    patterns: [
      /indexeddb/i,
      /\bidb\b/i,
      /storage.quota/i,
      /quota/i,
      /opfs/i,
      /filesystem/i,
      /file.system.access/i,
      /file.system.observer/i,
      /file.api/i,
      /clipboard/i,
      /\bblob\b/i,
      /readablestream/i,
      /writablestream/i,
      /upsert/i,
      /\bclear.site.data/i,
      /persistent/i,
      /storage.access.headers/i,
    ],
  },
  {
    slug: "network-and-loading",
    label: "Network & Loading",
    blurb:
      "Fetch, HTTP cache, No-Vary-Search, Speculation Rules, prerendering, prefetch, sec-purpose, WebTransport, sockets, Smart Card.",
    patterns: [
      /fetch.retry/i,
      /fetch.later/i,
      /fetchlater/i,
      /\bfetch\b/i,
      /no.vary.search/i,
      /speculation.rules/i,
      /prerender/i,
      /prefetch/i,
      /sec.purpose/i,
      /websocket/i,
      /webtransport/i,
      /\btcp\b/i,
      /direct.socket/i,
      /multicast/i,
      /smart.card/i,
      /serial/i,
      /hid/i,
      /\busb\b/i,
      /bluetooth/i,
      /\bhttp\b/i,
      /cookie/i,
      /compression.dictionary/i,
      /shared.brotli/i,
      /shared.zstandard/i,
      /referrer.policy/i,
      /cors/i,
      /cache/i,
      /pervasive/i,
      /preload/i,
      /interest.group/i,
    ],
  },
  {
    slug: "performance-and-timing",
    label: "Performance & Timing",
    blurb:
      "Long Animation Frames, Event Timing, Soft Navigation, render-blocking, freeze, CPU performance, bimodal timings.",
    patterns: [
      /long.animation.frame/i,
      /event.timing/i,
      /soft.navigation/i,
      /interaction.count/i,
      /performance.event/i,
      /performance.api/i,
      /performance.observer/i,
      /render.blocking/i,
      /render.quantum/i,
      /\bfreeze/i,
      /cpu.performance/i,
      /bimodal/i,
      /render.time/i,
      /resource.timing/i,
      /first.response.headers/i,
      /container.timing/i,
      /content.type.in.resource/i,
      /performance.timing/i,
      /preload/i,
      /perf/i,
      /priority/i,
    ],
  },
  {
    slug: "dom-and-interop",
    label: "DOM & Interop",
    blurb:
      "DOM mutation, ranges, parser, navigation API, streaming, Observable, Atomics, async iterators, Intl, Temporal.",
    patterns: [
      /dom/i,
      /document/i,
      /range/i,
      /selection/i,
      /processing.instruction/i,
      /parse.processing/i,
      /streaming/i,
      /html.insertion/i,
      /html.in.canvas/i,
      /observable/i,
      /error.is.error/i,
      /promise/i,
      /\btemporal\b/i,
      /intl\b/i,
      /unicode/i,
      /\bicu\b/i,
      /mirroring/i,
      /idn[a]?/i,
      /relaunch/i,
      /\bxml\b/i,
      /event/i,
      /navigateevent/i,
      /navigation.api/i,
      /\bnavigation\b/i,
      /toggleevent/i,
      /\bdetails/i,
      /hidden.until.found/i,
      /reveal/i,
      /tab.navigation/i,
      /float16/i,
      /uint8array/i,
      /regexp/i,
      /encoding/i,
      /document.subtitle/i,
      /quotaexceeded/i,
      /domexception/i,
      /clonable/i,
      /clone.into/i,
      /selectedcontent/i,
      /shadow.dom/i,
      /shadow.root/i,
      /reference.target/i,
      /aria.element/i,
      /move.before/i,
      /state.preserving/i,
      /idna/i,
      /css.module/i,
      /declarative.css/i,
    ],
  },
  {
    slug: "view-transitions",
    label: "View Transitions",
    blurb:
      "View Transitions API: nested groups, element-scoped, waitUntil, pseudos, finished promise.",
    patterns: [
      /view.transition/i,
      /::view-transition/i,
      /activeviewtransition/i,
      /viewtransition/i,
    ],
  },
  {
    slug: "pwa-and-installability",
    label: "PWA & Installability",
    blurb:
      "Web App Manifest, install elements, scope extensions, Controlled Frame, Isolated Web Apps, window-drag, unframed mode.",
    patterns: [
      /\bpwa\b/i,
      /web.app/i,
      /manifest/i,
      /install.element/i,
      /install.api/i,
      /scope.extensions/i,
      /scope_extensions/i,
      /controlled.frame/i,
      /isolated.web.app/i,
      /unframed/i,
      /window.drag/i,
      /window.controls/i,
      /borderless/i,
      /capture/i,
      /related.apps/i,
      /sub.title/i,
      /document.subtitle/i,
      /related.application/i,
      /user.navigation.capturing/i,
      /origin.migration/i,
    ],
  },
  {
    slug: "removals-and-deprecations",
    label: "Removals & Deprecations",
    blurb:
      "Features the platform is phasing out: deprecated APIs, removed legacy behaviours, paired with replacement guidance.",
    patterns: [
      /deprecat/i,
      /\bremove\b/i,
      /removal/i,
      /removes/i,
      /legacy/i,
      /retire/i,
    ],
  },
  {
    slug: "miscellaneous",
    label: "Miscellaneous",
    blurb: "Features that don't fit a single theme — interop fixes, platform hygiene, niche APIs.",
    patterns: [/.*/i],
  },
];

function slugifyCategory(slug: string): string {
  return slug;
}

function categoryForFeature(name: string, fallbackCategory: string): Category {
  const haystack = `${name} ${fallbackCategory}`;
  for (const cat of CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(name)) return cat;
    }
  }
  for (const cat of CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(haystack)) return cat;
    }
  }
  // Final fallback — should be unreachable because Misc matches /.*/.
  return CATEGORIES[CATEGORIES.length - 1];
}

function categoryTag(category: string): string {
  // Compress some of the chromestatus category names into something readable.
  const short = category
    .replace("In developer trial (Behind a flag)", "Dev Trial")
    .replace("Enabled by default", "Shipped")
    .replace("Origin trial", "Origin Trial")
    .replace("Stepped rollout", "Stepped rollout")
    .replace("Browser Intervention", "Intervention");
  return short;
}

async function featureHasDemo(release: string, feature: FeatureSummary): Promise<boolean> {
  // A feature is "built" once its folder index page exists. The feature index
  // is what the routine writes after each concept page is in place.
  try {
    await Deno.stat(`./${release}/${slugify(feature.name)}/index.html`);
    return true;
  } catch {
    return false;
  }
}

async function renderReleasePage(
  release: string,
  milestone: number,
  channels: Channels,
): Promise<string> {
  let features: MilestoneFeatures;
  try {
    features = await getMilestoneFeatures(milestone);
  } catch (err) {
    return `<!doctype html><html><body><main><h1>Chrome ${milestone}</h1><p>Could not load features: ${
      escapeHTML(String(err))
    }</p></main></body></html>`;
  }

  const status = statusBadgeFor(channels, milestone);
  const sections = await Promise.all(features.groups.map(async (group) => {
    const cards = await Promise.all(group.features.map(async (f) => {
      const hasDemo = await featureHasDemo(release, f);
      const slug = slugify(f.name);
      const summary = (f.summary ?? "").slice(0, 220);
      return `<li class="demo-card">
        <h3><a href="${chromeStatusUrl(f.id)}" target="_blank" rel="noopener">${
        escapeHTML(f.name)
      }</a></h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <span class="tag">${escapeHTML(categoryTag(group.category))}</span>
          ${
        hasDemo
          ? `<a class="tag tag-live" href="/${release}/${slug}/">demo &rarr;</a>`
          : `<span class="tag tag-pending">demo pending</span>`
      }
        </div>
      </li>`;
    }));
    return `<section>
      <h3 class="group-title">${
      escapeHTML(categoryTag(group.category))
    } <span class="group-count">(${group.features.length})</span></h3>
      <ol class="demo-list">${cards.join("")}</ol>
    </section>`;
  }));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome ${milestone} demos — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; all releases</a></p>

  <header class="lede-block">
    <p class="eyebrow">chrome ${milestone} · ${escapeHTML(status.toLowerCase())}</p>
    <h1>chrome ${milestone} platform demos</h1>
    <p class="lede">${features.total} features tracked for Chrome ${milestone}. Each card links to its ChromeStatus entry; the live demos drop in as the routine builds them. A single "uber" demo per release combines several APIs into one larger experience.</p>
  </header>

  <section>
    <h2>uber demo</h2>
    <p>The release-level experience lives at <code>/${release}/uber-demo/</code> when it has been built. Per-feature demos below are built automatically, one feature per commit, and every distinct use case should become an interactive concept page.</p>
  </section>

  <section>
    <h2>features (${features.total})</h2>
    ${sections.join("\n")}
  </section>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- /features (flat, filterable catalogue) -----

async function renderFeaturesCatalogue(channels: Channels): Promise<string> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);

  type Row = {
    mstone: number;
    id: number;
    name: string;
    summary: string;
    category: string;
    hasDemo: boolean;
  };

  const rows: Row[] = [];
  for (const m of known) {
    try {
      const feats = await getMilestoneFeatures(m);
      for (const g of feats.groups) {
        for (const f of g.features) {
          const hasDemo = await featureHasDemo(`v${m}`, f);
          // The catalogue is the index of what's actually been built. Pending
          // features still appear on the per-release pages.
          if (!hasDemo) continue;
          rows.push({
            mstone: m,
            id: f.id,
            name: f.name,
            summary: f.summary ?? "",
            category: g.category,
            hasDemo,
          });
        }
      }
    } catch {
      // skip milestones we can't fetch
    }
  }

  const tableRows = rows.map((r) => {
    const slug = slugify(r.name);
    const cat = categoryTag(r.category);
    const demoCell = r.hasDemo
      ? `<a class="tag tag-live" href="/v${r.mstone}/${slug}/">demo &rarr;</a>`
      : `<span class="tag tag-pending">pending</span>`;
    const search = `${r.name} ${r.summary} ${cat} v${r.mstone}`.toLowerCase();
    return `<tr data-search="${escapeHTML(search)}" data-mstone="${r.mstone}" data-status="${
      escapeHTML(cat)
    }" data-built="${r.hasDemo}">
      <td><a href="https://chromestatus.com/feature/${r.id}" target="_blank" rel="noopener">${
      escapeHTML(r.name)
    }</a></td>
      <td><span class="release-status">v${r.mstone}</span></td>
      <td><span class="tag">${escapeHTML(cat)}</span></td>
      <td>${demoCell}</td>
    </tr>`;
  }).join("");

  const mstoneOptions = known.map((m) => `<option value="${m}">v${m}</option>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>all features — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    .filters {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 1rem 0 1.5rem;
      padding: 1rem;
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .filters input, .filters select {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      padding: 0.45rem 0.6rem;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
      outline: none;
    }
    .filters input:focus { box-shadow: var(--thin-shadow); }
    .filters input[type=search] { flex: 1; min-width: 160px; }
    .features-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .features-table th, .features-table td { padding: 0.6rem 0.6rem; text-align: left; border-bottom: 1px solid var(--border-black); vertical-align: top; }
    .features-table th {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: var(--bg-stone);
    }
    .features-table tr.hidden { display: none; }
    .features-table td a { color: var(--text-black); text-decoration: underline; text-underline-offset: 3px; }
    .features-table td a:hover { color: var(--accent-blue); }
    .features-table td .tag, .features-table td .release-status { font-family: var(--font-mono); }
    .features-table td .release-status { background: var(--text-black); color: var(--bg-ivory); padding: 0.15rem 0.5rem; font-size: 0.75rem; }
    .stats { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }

    @media (max-width: 640px) {
      main { padding-left: var(--space-4); padding-right: var(--space-4); }
      .features-table thead { display: none; }
      .features-table, .features-table tbody, .features-table tr, .features-table td {
        display: block;
        width: 100%;
      }
      .features-table tr {
        border: 2px solid var(--border-black);
        background: var(--bg-paper);
        margin-bottom: var(--space-3);
        padding: var(--space-3);
        box-shadow: var(--thin-shadow);
      }
      .features-table td {
        border: none;
        padding: 0.25rem 0;
      }
      .features-table td:first-child { font-weight: 600; padding-bottom: var(--space-2); }
      .features-table td:not(:first-child) {
        display: inline-block;
        margin-right: var(--space-2);
      }
      .filters { padding: var(--space-3); gap: var(--space-2); }
      .filters input, .filters select { flex: 1 1 100%; min-width: 0; }
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>

  <header class="lede-block">
    <p class="eyebrow">catalogue</p>
    <h1>all features</h1>
    <p class="lede">Every feature with a demo available, across every milestone. Filter by name, milestone, or status. Pending features still show up on the per-release pages.</p>
  </header>

  <div class="filters">
    <input type="search" id="q" placeholder="search by name, summary, category">
    <select id="mstone">
      <option value="">all milestones</option>
      ${mstoneOptions}
    </select>
    <select id="status">
      <option value="">any status</option>
      <option value="Shipped">Shipped</option>
      <option value="Origin Trial">Origin Trial</option>
      <option value="Dev Trial">Dev Trial</option>
      <option value="Stepped rollout">Stepped rollout</option>
    </select>
  </div>

  <p class="stats"><span id="visible">${rows.length}</span> / ${rows.length} demos</p>

  <table class="features-table">
    <thead>
      <tr><th>feature</th><th>milestone</th><th>status</th><th>demo</th></tr>
    </thead>
    <tbody id="rows">${tableRows}</tbody>
  </table>

  <script>
    const q = document.getElementById('q');
    const mstone = document.getElementById('mstone');
    const status = document.getElementById('status');
    const rows = document.querySelectorAll('#rows tr');
    const visible = document.getElementById('visible');

    function applyFilter() {
      const qv = q.value.toLowerCase().trim();
      const mv = mstone.value;
      const sv = status.value;
      let count = 0;
      for (const row of rows) {
        const search = row.dataset.search;
        const okq = !qv || search.includes(qv);
        const okm = !mv || row.dataset.mstone === mv;
        const oks = !sv || row.dataset.status === sv;
        const show = okq && okm && oks;
        row.classList.toggle('hidden', !show);
        if (show) count++;
      }
      visible.textContent = count;
    }

    q.addEventListener('input', applyFilter);
    mstone.addEventListener('change', applyFilter);
    status.addEventListener('change', applyFilter);
  </script>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- /categories (explorer index) and /categories/<slug> -----

interface CategorizedRow {
  mstone: number;
  id: number;
  name: string;
  summary: string;
  category: Category;
  hasDemo: boolean;
}

async function collectCategorizedRows(channels: Channels): Promise<CategorizedRow[]> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);
  const rows: CategorizedRow[] = [];
  for (const m of known) {
    try {
      const feats = await getMilestoneFeatures(m);
      // Chromestatus puts the same feature in multiple groups when it's under
      // several statuses (e.g. "Origin trial" + "In developer trial"). Dedupe
      // by (milestone, slug) so we don't list the same demo twice on the
      // category page.
      const seen = new Set<string>();
      for (const g of feats.groups) {
        for (const f of g.features) {
          const slug = slugify(f.name);
          const key = `${m}:${slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const hasDemo = await featureHasDemo(`v${m}`, f);
          rows.push({
            mstone: m,
            id: f.id,
            name: f.name,
            summary: f.summary ?? "",
            category: categoryForFeature(f.name, g.category),
            hasDemo,
          });
        }
      }
    } catch {
      // skip milestones we can't fetch
    }
  }
  return rows;
}

async function renderCategoriesIndex(channels: Channels): Promise<string> {
  const rows = await collectCategorizedRows(channels);
  const byCategory = new Map<string, CategorizedRow[]>();
  for (const cat of CATEGORIES) byCategory.set(cat.slug, []);
  for (const row of rows) {
    if (!row.hasDemo) continue; // only count built features
    byCategory.get(row.category.slug)!.push(row);
  }

  const tiles = CATEGORIES
    .filter((c) => (byCategory.get(c.slug) ?? []).length > 0)
    .map((c) => {
      const count = byCategory.get(c.slug)!.length;
      return `<li class="category-tile">
        <a href="/categories/${c.slug}/">
          <h3>${escapeHTML(c.label)}</h3>
          <p class="category-blurb">${escapeHTML(c.blurb)}</p>
          <p class="category-count">${count} ${count === 1 ? "demo" : "demos"}</p>
        </a>
      </li>`;
    }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>browse by category — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    .category-grid {
      list-style: none;
      padding: 0;
      margin: var(--space-5) 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-4);
    }
    .category-tile {
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--flat-shadow);
      transition: transform 80ms ease, box-shadow 80ms ease;
    }
    .category-tile:hover { transform: translate(-2px, -2px); box-shadow: var(--flat-shadow-hover); }
    .category-tile a {
      display: block;
      padding: var(--space-4);
      text-decoration: none;
      color: var(--text-black);
    }
    .category-tile h3 {
      margin: 0 0 var(--space-2);
      font-family: var(--font-display);
      font-size: 1.4rem;
      letter-spacing: -0.01em;
    }
    .category-blurb {
      margin: 0 0 var(--space-3);
      font-family: var(--font-serif);
      color: var(--text-charcoal);
      line-height: 1.5;
      font-size: 0.95rem;
    }
    .category-count {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>

  <header class="lede-block">
    <p class="eyebrow">explore</p>
    <h1>browse by category</h1>
    <p class="lede">Demos grouped by theme. Identity bundles passkeys + WebAuthn + FedCM + autofill. On-device AI bundles Prompt + Summariser + Translator + speech. Drill into any category to see every demo, grouped by milestone.</p>
  </header>

  <ol class="category-grid">${tiles}</ol>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

async function renderCategoryPage(slug: string, channels: Channels): Promise<string | null> {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return null;
  const rows = await collectCategorizedRows(channels);
  const matching = rows.filter((r) => r.category.slug === slug);
  if (matching.length === 0) return null;

  // Group by milestone, descending.
  matching.sort((a, b) => b.mstone - a.mstone || a.name.localeCompare(b.name));
  const byMstone = new Map<number, CategorizedRow[]>();
  for (const r of matching) {
    if (!byMstone.has(r.mstone)) byMstone.set(r.mstone, []);
    byMstone.get(r.mstone)!.push(r);
  }

  const milestoneSections = [...byMstone.entries()].map(([m, rs]) => {
    const cards = rs.map((r) => {
      const slugged = slugify(r.name);
      const summary = (r.summary ?? "").slice(0, 220);
      return `<li class="demo-card">
        <h3>${
        r.hasDemo
          ? `<a href="/v${r.mstone}/${slugged}/">${escapeHTML(r.name)}</a>`
          : escapeHTML(r.name)
      }</h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <a class="tag" href="https://chromestatus.com/feature/${r.id}" target="_blank" rel="noopener">chromestatus</a>
          ${
        r.hasDemo
          ? `<a class="tag tag-live" href="/v${r.mstone}/${slugged}/">demo &rarr;</a>`
          : `<span class="tag tag-pending">demo pending</span>`
      }
        </div>
      </li>`;
    }).join("");
    return `<section>
      <h3 class="group-title">Chrome ${m} <span class="group-count">(${rs.length})</span></h3>
      <ol class="demo-list">${cards}</ol>
    </section>`;
  }).join("\n");

  const builtCount = matching.filter((r) => r.hasDemo).length;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(cat.label)} — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
<main>
  <p class="crumbs"><a href="/categories/">&larr; all categories</a></p>

  <header class="lede-block">
    <p class="eyebrow">category</p>
    <h1>${escapeHTML(cat.label)}</h1>
    <p class="lede">${escapeHTML(cat.blurb)}</p>
    <p class="updated-line">${builtCount} of ${matching.length} demos built, across ${byMstone.size} ${
    byMstone.size === 1 ? "release" : "releases"
  }.</p>
  </header>

  ${milestoneSections}

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- Critique rollup -----
//
// Self-critique reports live on disk at v<N>/<feature>/_questions.json and
// v<N>/<feature>/<concept>/_questions.json. We walk the tree at request time
// and render summaries; the file path is the database.

import type { CritiqueReport } from "./lib/critique.ts";
import { scoreVerdicts } from "./lib/critique.ts";
import type { ConformanceAssertion, ConformanceSuite } from "./lib/conformance.ts";

async function readCritique(path: string): Promise<CritiqueReport | null> {
  try {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as CritiqueReport;
  } catch {
    return null;
  }
}

async function collectCritiques(): Promise<CritiqueReport[]> {
  const out: CritiqueReport[] = [];
  try {
    for await (const entry of Deno.readDir(".")) {
      if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
      const release = entry.name;
      for await (const fd of Deno.readDir(release)) {
        if (!fd.isDirectory) continue;
        const featureSlug = fd.name;
        const featureCrit = await readCritique(`${release}/${featureSlug}/_questions.json`);
        if (featureCrit) out.push(featureCrit);
        try {
          for await (const cd of Deno.readDir(`${release}/${featureSlug}`)) {
            if (!cd.isDirectory) continue;
            const conceptCrit = await readCritique(
              `${release}/${featureSlug}/${cd.name}/_questions.json`,
            );
            if (conceptCrit) out.push(conceptCrit);
          }
        } catch {
          // ignore — feature folder may not be readable in this isolate.
        }
      }
    }
  } catch {
    // ignore — root may not be readable.
  }
  return out;
}

function verdictBadge(state: string): string {
  const cls = state === "pass"
    ? "ok"
    : state === "fail"
    ? "bad"
    : state === "partial"
    ? "warn"
    : "na";
  return `<span class="verdict verdict-${cls}">${escapeHTML(state)}</span>`;
}

async function renderCritiquesIndex(): Promise<string> {
  const all = await collectCritiques();
  // Sort by lowest ratio first — most needy at the top.
  const scored = all.map((c) => ({ c, s: scoreVerdicts(c.rubric) }));
  scored.sort((a, b) => a.s.ratio - b.s.ratio);

  let totalQuestions = 0;
  let totalConcepts = 0;
  for (const { c } of scored) {
    totalQuestions += c.openQuestions.length;
    if (c.conceptSlug) totalConcepts++;
  }

  const rows = scored.map(({ c, s }) => {
    const href = c.conceptSlug
      ? `/${c.release}/${c.featureSlug}/${c.conceptSlug}/`
      : `/${c.release}/${c.featureSlug}/`;
    const label = c.conceptSlug
      ? `${c.release} ${c.featureSlug} / ${c.conceptSlug}`
      : `${c.release} ${c.featureSlug}`;
    return `<tr>
      <td><a href="${escapeHTML(href)}">${escapeHTML(label)}</a></td>
      <td class="num">${(s.ratio * 100).toFixed(0)}%</td>
      <td class="num">${c.openQuestions.length}</td>
      <td>${
      c.openQuestions.map((q) =>
        `<span class="qchip qchip-${q.severity ?? "minor"}">${escapeHTML(q.title)}</span>`
      ).join("")
    }</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>self-critique — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .verdict { padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); }
    .verdict-ok { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-warn { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
    .verdict-bad { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    .qchip { display: inline-block; padding: 0.15rem 0.5rem; margin: 0.1rem 0.2rem 0.1rem 0; font-size: 0.7rem; border: 1px solid var(--border-black); background: var(--bg-stone); color: var(--text-charcoal); }
    .qchip-major { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .qchip-moderate { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>
  <header class="lede-block">
    <p class="eyebrow">self-critique</p>
    <h1>open questions</h1>
    <p class="lede">A second pair of eyes on every concept page. A reviewer agent reads each page cold against the rubric (does the demo demonstrate what the spec promises? edge cases? interactive surface? blurb match? references? design system?) and writes the verdict plus follow-up work items here. The list below is sorted weakest first so the next routine fire knows where to focus.</p>
    <p class="updated-line">${scored.length} pages reviewed · ${totalConcepts} concepts · ${totalQuestions} open questions</p>
  </header>

  <table>
    <thead>
      <tr>
        <th>page</th>
        <th>rubric score</th>
        <th>open</th>
        <th>questions</th>
      </tr>
    </thead>
    <tbody>${
    rows ||
    `<tr><td colspan="4">No critiques yet. Run the reviewer pass to populate this page.</td></tr>`
  }</tbody>
  </table>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

function renderCritiqueDetail(c: CritiqueReport): string {
  const s = scoreVerdicts(c.rubric);
  const rows = Object.entries(c.rubric).map(([k, v]) =>
    `<tr><th>${escapeHTML(k.replace(/_/g, " "))}</th><td>${verdictBadge(v.state)}</td><td>${
      escapeHTML(v.rationale)
    }</td></tr>`
  ).join("");
  const questions = c.openQuestions.length
    ? `<ol class="open-questions">${
      c.openQuestions.map((q) =>
        `<li>
      <h3>${escapeHTML(q.title)}${
          q.severity ? ` <span class="qchip qchip-${q.severity}">${q.severity}</span>` : ""
        }</h3>
      <p>${escapeHTML(q.detail)}</p>
      ${
          q.suggestedSlug
            ? `<p class="updated-line">suggested concept slug: <code>${
              escapeHTML(q.suggestedSlug)
            }</code></p>`
            : ""
        }
    </li>`
      ).join("")
    }</ol>`
    : `<p class="updated-line">No open questions. The reviewer signed off.</p>`;

  const label = c.conceptSlug
    ? `${c.release} · ${c.featureSlug} / ${c.conceptSlug}`
    : `${c.release} · ${c.featureSlug}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>critique — ${escapeHTML(label)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 920px; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; margin: var(--space-3) 0; }
    th, td { padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); width: 180px; }
    .verdict { padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); }
    .verdict-ok { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-warn { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
    .verdict-bad { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    .open-questions { padding-left: 1.2rem; }
    .open-questions li { margin-bottom: var(--space-4); }
    .open-questions h3 { margin: 0 0 var(--space-2); font-family: var(--font-display); font-size: 1.1rem; }
    .qchip { display: inline-block; padding: 0.1rem 0.5rem; font-size: 0.7rem; font-family: var(--font-mono); border: 1px solid var(--border-black); margin-left: 0.4rem; }
    .qchip-major { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .qchip-moderate { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/critiques/">&larr; all critiques</a></p>
  <header class="lede-block">
    <p class="eyebrow">critique · ${escapeHTML(c.release)}</p>
    <h1>${escapeHTML(label)}</h1>
    ${c.summary ? `<p class="lede">${escapeHTML(c.summary)}</p>` : ""}
    <p class="updated-line">reviewed ${escapeHTML(c.reviewedAt)} by ${
    escapeHTML(c.reviewer)
  } · rubric ${(s.ratio * 100).toFixed(0)}%</p>
  </header>

  <section>
    <h2>rubric</h2>
    <table><tbody>${rows}</tbody></table>
  </section>

  <section>
    <h2>open questions (${c.openQuestions.length})</h2>
    ${questions}
  </section>

  <p><a href="https://chromestatus.com/feature/${c.chromestatusId}" target="_blank" rel="noopener">ChromeStatus #${c.chromestatusId}</a> · <a href="/${
    escapeHTML(c.release)
  }/${escapeHTML(c.featureSlug)}/${
    c.conceptSlug ? escapeHTML(c.conceptSlug) + "/" : ""
  }">view the page being critiqued &rarr;</a></p>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- Conformance: spec-vs-implementation probes -----
//
// A conformance suite is a list of assertions against a feature's contract.
// We render a page per suite that runs the assertions live in the visitor's
// browser, so the verdict reflects what the visitor's browser ACTUALLY does
// — Chrome stable, Chrome canary, Firefox, Safari each see their own truth.
// The rollup gives a per-feature view of how many checks exist; the future
// nightly-headless job will turn this into a real cross-browser matrix.

async function readConformance(path: string): Promise<ConformanceSuite | null> {
  try {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as ConformanceSuite;
  } catch {
    return null;
  }
}

async function collectConformanceSuites(): Promise<ConformanceSuite[]> {
  const out: ConformanceSuite[] = [];
  try {
    for await (const entry of Deno.readDir(".")) {
      if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
      const release = entry.name;
      for await (const fd of Deno.readDir(release)) {
        if (!fd.isDirectory) continue;
        const featureSuite = await readConformance(
          `${release}/${fd.name}/conformance.json`,
        );
        if (featureSuite) out.push(featureSuite);
        try {
          for await (const cd of Deno.readDir(`${release}/${fd.name}`)) {
            if (!cd.isDirectory) continue;
            const conceptSuite = await readConformance(
              `${release}/${fd.name}/${cd.name}/conformance.json`,
            );
            if (conceptSuite) out.push(conceptSuite);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  return out;
}

function renderConformancePage(s: ConformanceSuite): string {
  const label = s.conceptSlug
    ? `${s.release} · ${s.featureSlug} / ${s.conceptSlug}`
    : `${s.release} · ${s.featureSlug}`;
  const back = s.conceptSlug
    ? `/${s.release}/${s.featureSlug}/${s.conceptSlug}/`
    : `/${s.release}/${s.featureSlug}/`;

  const rows = s.assertions.map((a) => {
    return `<tr data-id="${escapeHTML(a.id)}" data-kind="${escapeHTML(a.kind)}" data-test="${
      escapeHTML(a.test)
    }"${a.expect ? ` data-expect="${escapeHTML(a.expect)}"` : ""}>
      <td><code>${escapeHTML(a.id)}</code></td>
      <td>${escapeHTML(a.description)}${
      a.specSection
        ? ` <a class="spec-link" href="${
          escapeHTML(a.specSection)
        }" target="_blank" rel="noopener">spec ↗</a>`
        : ""
    }</td>
      <td><span class="kind">${escapeHTML(a.kind)}</span></td>
      <td class="verdict-cell"><span class="verdict verdict-na" data-verdict>…</span></td>
      <td class="detail-cell" data-detail></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance — ${escapeHTML(label)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1000px; }
    .meta { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); display: flex; gap: var(--space-3); flex-wrap: wrap; margin: var(--space-3) 0; }
    .summary { display: flex; gap: var(--space-4); flex-wrap: wrap; margin: var(--space-3) 0 var(--space-5); }
    .stat { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-3) var(--space-4); min-width: 120px; }
    .stat .n { font-family: var(--font-display); font-size: 2.2rem; color: var(--text-black); font-variant-numeric: tabular-nums; line-height: 1; }
    .stat .label { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    .kind { font-size: 0.72rem; color: var(--text-muted); padding: 0.1rem 0.4rem; border: 1px solid var(--border-black); background: var(--bg-stone); }
    .verdict { padding: 0.15rem 0.55rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); }
    .verdict-pass { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-fail { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    .detail-cell { font-size: 0.78rem; color: var(--text-muted); max-width: 260px; word-break: break-word; }
    .spec-link { font-size: 0.78rem; color: var(--accent-blue); }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="${escapeHTML(back)}">&larr; back to ${escapeHTML(label)}</a></p>

  <header class="lede-block">
    <p class="eyebrow">conformance · ${escapeHTML(s.release)}</p>
    <h1>${escapeHTML(label)} — conformance probe</h1>
    <p class="lede">${s.assertions.length} assertion${
    s.assertions.length === 1 ? "" : "s"
  } drawn from the spec. Each is a single contract the spec text makes; the verdict reflects what THIS browser does right now. Open the page in Chrome stable / canary / Firefox / Safari to see the matrix manually.</p>
    <div class="meta">
      <span>browser: <strong id="ua">…</strong></span>
      ${
    s.specUrl
      ? `<span>spec: <a href="${escapeHTML(s.specUrl)}" target="_blank" rel="noopener">${
        escapeHTML(s.specUrl)
      }</a></span>`
      : ""
  }
      <span>chromestatus: <a href="https://chromestatus.com/feature/${s.chromestatusId}" target="_blank" rel="noopener">#${s.chromestatusId}</a></span>
      <span>generated ${escapeHTML(s.generatedAt)} by ${escapeHTML(s.author)}</span>
    </div>
  </header>

  <div class="summary">
    <div class="stat"><div class="n" id="n-pass">0</div><div class="label">pass</div></div>
    <div class="stat"><div class="n" id="n-fail">0</div><div class="label">fail</div></div>
    <div class="stat"><div class="n">${s.assertions.length}</div><div class="label">total</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>id</th>
        <th>contract</th>
        <th>kind</th>
        <th>verdict</th>
        <th>detail</th>
      </tr>
    </thead>
    <tbody id="rows">${rows}</tbody>
  </table>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>

<script>
(async () => {
  document.getElementById("ua").textContent = navigator.userAgent;
  const rows = document.querySelectorAll("#rows tr");
  let pass = 0, fail = 0;

  async function runAssertion(kind, test, expect) {
    try {
      function propertyDescriptor(target, property) {
        let cur = Object(target);
        while (cur) {
          const descriptor = Object.getOwnPropertyDescriptor(cur, property);
          if (descriptor) return descriptor;
          cur = Object.getPrototypeOf(cur);
        }
        return undefined;
      }

      if (kind === "css-supports") {
        // CSS.supports accepts either ("prop: value") or ("prop", "value");
        // we pass the raw declaration form.
        return { ok: !!CSS.supports(test), detail: "" };
      }
      if (kind === "exists") {
        // Walk a dotted path against the global.
        const parts = test.split(".");
        let cur = globalThis;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (cur == null) return { ok: false, detail: "missing at " + p };
          if (i === parts.length - 1) {
            const ok = p in Object(cur);
            return { ok, detail: ok ? "" : "undefined" };
          }
          cur = cur[p];
        }
        return { ok: false, detail: "empty path" };
      }
      if (kind === "typeof") {
        const parts = test.split(".");
        let cur = globalThis;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (cur == null) return { ok: false, detail: "missing at " + p };
          if (i === parts.length - 1) {
            let actual;
            try {
              actual = typeof cur[p];
            } catch (e) {
              const descriptor = propertyDescriptor(cur, p);
              if (!descriptor) throw e;
              actual = "value" in descriptor ? typeof descriptor.value : "accessor";
            }
            return { ok: actual === expect, detail: "typeof = " + actual };
          }
          cur = cur[p];
        }
        return { ok: false, detail: "empty path" };
      }
      if (kind === "script") {
        // eslint-disable-next-line no-new-func
        const result = new Function("return (" + test + ")")();
        const resolved = (result instanceof Promise) ? await result : result;
        return { ok: !!resolved, detail: String(resolved) };
      }
      if (kind === "throws") {
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function("return (" + test + ")")();
          const resolved = (result instanceof Promise) ? await result : result;
          return { ok: false, detail: "no throw (resolved to " + resolved + ")" };
        } catch (e) {
          return { ok: true, detail: e && e.name ? e.name : "threw" };
        }
      }
      return { ok: false, detail: "unknown kind" };
    } catch (e) {
      return { ok: false, detail: (e && e.message) ? e.message : String(e) };
    }
  }

  for (const row of rows) {
    const kind = row.dataset.kind;
    const test = row.dataset.test;
    const expect = row.dataset.expect;
    const { ok, detail } = await runAssertion(kind, test, expect);
    const cell = row.querySelector("[data-verdict]");
    cell.classList.remove("verdict-na");
    cell.classList.add(ok ? "verdict-pass" : "verdict-fail");
    cell.textContent = ok ? "pass" : "fail";
    if (detail) row.querySelector("[data-detail]").textContent = detail;
    if (ok) pass++; else fail++;
  }
  document.getElementById("n-pass").textContent = pass;
  document.getElementById("n-fail").textContent = fail;
})();
</script>
</body>
</html>`;
}

function renderConformanceRunAllPage(all: ConformanceSuite[]): string {
  const totalAssertions = all.reduce((n, s) => n + s.assertions.length, 0);

  // Unique milestones for the filter dropdown
  const milestones = Array.from(new Set(all.map((s) => s.release))).sort((a, b) => {
    return Number(b.slice(1)) - Number(a.slice(1));
  });

  const milestoneOptions = milestones.map((m) =>
    `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance run-all — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1200px; }
    .meta { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); margin: var(--space-3) 0; }
    .summary { display: flex; gap: var(--space-4); flex-wrap: wrap; margin: var(--space-3) 0 var(--space-5); }
    .stat { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-3) var(--space-4); min-width: 140px; }
    .stat .n { font-family: var(--font-display); font-size: 2.2rem; color: var(--text-black); font-variant-numeric: tabular-nums; line-height: 1; }
    .stat .label { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    
    /* Filter Bar Styling */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
      padding: var(--space-4);
      background: var(--bg-stone);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
      align-items: center;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .filter-group label {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .filter-group input, .filter-group select {
      font-family: var(--font-sans);
      padding: 0.4rem 0.8rem;
      border: 2px solid var(--border-black);
      background: var(--bg-paper);
      font-size: 0.85rem;
    }
    .filter-group input:focus, .filter-group select:focus {
      outline: 2px solid var(--accent-blue);
    }
    .actions {
      display: flex;
      gap: var(--space-2);
      margin-left: auto;
      align-self: flex-end;
    }
    
    /* High-performance Table */
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    .kind { font-size: 0.72rem; color: var(--text-muted); padding: 0.1rem 0.4rem; border: 1px solid var(--border-black); background: var(--bg-stone); }
    
    /* Verdict Badges */
    .verdict { padding: 0.15rem 0.55rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); display: inline-block; }
    .verdict-pass { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-fail { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    
    .detail-cell { font-size: 0.78rem; color: var(--text-muted); max-width: 320px; word-break: break-all; }
    .spec-link { font-size: 0.78rem; color: var(--accent-blue); }
    
    /* Loader */
    .progress-container {
      width: 100%;
      height: 6px;
      background: var(--bg-stone);
      border: 1px solid var(--border-black);
      margin-bottom: var(--space-5);
      overflow: hidden;
      display: none;
    }
    .progress-bar {
      height: 100%;
      background: var(--accent-blue);
      width: 0%;
      transition: width 0.1s ease-out;
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/conformance">&larr; all conformance suites</a></p>

  <header class="lede-block">
    <p class="eyebrow">conformance · run all</p>
    <h1>conformance dashboard</h1>
    <p class="lede">Run all spec-vs-implementation probes in this Deno instance simultaneously. Running directly in your browser context, this verifies which contracts actually pass or fail in Chrome, Firefox, Safari, or Edge instantly.</p>
    <div class="meta">
      <span>browser: <strong id="ua">…</strong></span>
    </div>
  </header>

  <div class="summary">
    <div class="stat"><div class="n" id="n-pass">0</div><div class="label">pass</div></div>
    <div class="stat"><div class="n" id="n-fail">0</div><div class="label">fail</div></div>
    <div class="stat"><div class="n" id="n-pct">0%</div><div class="label">pass rate</div></div>
    <div class="stat"><div class="n">${totalAssertions}</div><div class="label">total probes</div></div>
    <div class="stat"><div class="n">${all.length}</div><div class="label">suites</div></div>
  </div>

  <div class="progress-container" id="progress-container">
    <div class="progress-bar" id="progress-bar"></div>
  </div>

  <div class="filter-bar">
    <div class="filter-group">
      <label for="filter-search">Search Probes</label>
      <input type="text" id="filter-search" placeholder="e.g., gpu, css-gap...">
    </div>
    <div class="filter-group">
      <label for="filter-milestone">Milestone</label>
      <select id="filter-milestone">
        <option value="all">All Milestones</option>
        ${milestoneOptions}
      </select>
    </div>
    <div class="filter-group">
      <label for="filter-verdict">Status</label>
      <select id="filter-verdict">
        <option value="all">All (Pass & Fail)</option>
        <option value="pass">Pass Only</option>
        <option value="fail">Fail Only</option>
      </select>
    </div>
    <div class="actions">
      <button id="btn-run" class="btn">Run All Probes</button>
      <button id="btn-copy-json" class="btn">Copy JSON Report</button>
      <button id="btn-copy-failures" class="btn">Copy Failures Only</button>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>feature / suite</th>
        <th>probe id</th>
        <th>contract assertion</th>
        <th>kind</th>
        <th>verdict</th>
        <th>detail</th>
      </tr>
    </thead>
    <tbody id="rows">
      <!-- Rows dynamically populated in JS -->
    </tbody>
  </table>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>

<script>
(async () => {
  const SUITES = ${JSON.stringify(all).replace(/</g, "\\u003c")};
  
  document.getElementById("ua").textContent = navigator.userAgent;
  const chromeMajor = Number(
    (navigator.userAgent.match(/(?:Chrome|HeadlessChrome)\\/(\\d+)/) || [])[1] || 0
  );
  
  const rowsContainer = document.getElementById("rows");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  
  const filterSearch = document.getElementById("filter-search");
  const filterMilestone = document.getElementById("filter-milestone");
  const filterVerdict = document.getElementById("filter-verdict");
  
  let results = []; // holds flat assertion results

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  
  // Populate Table Rows Initially
  function populateTable() {
    let index = 0;
    const html = [];
    for (const suite of SUITES) {
      const suiteLabel = suite.conceptSlug 
        ? suite.release + " · " + suite.featureSlug + " / " + suite.conceptSlug
        : suite.release + " · " + suite.featureSlug;
      
      const suiteUrl = suite.conceptSlug 
        ? "/" + suite.release + "/" + suite.featureSlug + "/" + suite.conceptSlug + "/conformance/"
        : "/" + suite.release + "/" + suite.featureSlug + "/conformance/";
      
      for (const assertion of suite.assertions) {
        const specLink = assertion.specSection
          ? \` <a class="spec-link" href="\${escapeHTML(assertion.specSection)}" target="_blank" rel="noopener">spec ↗</a>\`
          : "";
        html.push(\`<tr data-index="\${index}" data-milestone="\${suite.release}" data-verdict="na">
          <td><a href="\${escapeHTML(suiteUrl)}" target="_blank" rel="noopener"><strong>\${escapeHTML(suite.release)}</strong> · \${escapeHTML(suite.featureSlug)}</a></td>
          <td><code>\${escapeHTML(assertion.id)}</code></td>
          <td>\${escapeHTML(assertion.description)}\${specLink}</td>
          <td><span class="kind">\${escapeHTML(assertion.kind)}</span></td>
          <td class="verdict-cell"><span class="verdict verdict-na" data-verdict-badge>pending</span></td>
          <td class="detail-cell" data-detail-cell>—</td>
        </tr>\`);
        
        results.push({
          release: suite.release,
          featureSlug: suite.featureSlug,
          conceptSlug: suite.conceptSlug,
          id: assertion.id,
          description: assertion.description,
          kind: assertion.kind,
          test: assertion.test,
          expect: assertion.expect,
          ok: null,
          detail: ""
        });
        
        index++;
      }
    }
    rowsContainer.innerHTML = html.join("");
  }
  
  populateTable();
  
  async function runAssertion(kind, test, expect) {
    try {
      function propertyDescriptor(target, property) {
        let cur = Object(target);
        while (cur) {
          const descriptor = Object.getOwnPropertyDescriptor(cur, property);
          if (descriptor) return descriptor;
          cur = Object.getPrototypeOf(cur);
        }
        return undefined;
      }

      if (kind === "css-supports") {
        return { ok: !!CSS.supports(test), detail: "" };
      }
      if (kind === "exists") {
        const parts = test.split(".");
        let cur = globalThis;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (cur == null) return { ok: false, detail: "missing at " + p };
          if (i === parts.length - 1) {
            const ok = p in Object(cur);
            return { ok, detail: ok ? "" : "undefined" };
          }
          cur = cur[p];
        }
        return { ok: false, detail: "empty path" };
      }
      if (kind === "typeof") {
        const parts = test.split(".");
        let cur = globalThis;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (cur == null) return { ok: false, detail: "missing at " + p };
          if (i === parts.length - 1) {
            let actual;
            try {
              actual = typeof cur[p];
            } catch (e) {
              const descriptor = propertyDescriptor(cur, p);
              if (!descriptor) throw e;
              actual = "value" in descriptor ? typeof descriptor.value : "accessor";
            }
            return { ok: actual === expect, detail: "typeof = " + actual };
          }
          cur = cur[p];
        }
        return { ok: false, detail: "empty path" };
      }
      if (kind === "script") {
        const result = new Function("return (" + test + ")")();
        const resolved = (result instanceof Promise) ? await result : result;
        return { ok: !!resolved, detail: String(resolved) };
      }
      if (kind === "throws") {
        try {
          const result = new Function("return (" + test + ")")();
          const resolved = (result instanceof Promise) ? await result : result;
          return { ok: false, detail: "no throw (resolved to " + resolved + ")" };
        } catch (e) {
          return { ok: true, detail: e && e.name ? e.name : "threw" };
        }
      }
      return { ok: false, detail: "unknown kind" };
    } catch (e) {
      return { ok: false, detail: (e && e.message) ? e.message : String(e) };
    }
  }
  
  async function runAll() {
    progressContainer.style.display = "block";
    document.getElementById("btn-run").disabled = true;
    document.getElementById("btn-run").textContent = "Running...";
    
    let passed = 0;
    let failed = 0;
    const total = results.length;
    
    console.group("🚀 Starting Platform Showcase Conformance Probes Run");
    
    for (let i = 0; i < total; i++) {
      const res = results[i];
      const row = rowsContainer.querySelector(\`tr[data-index="\${i}"]\`);
      const releaseNumber = Number(String(res.release).replace(/^v/, ""));

      if (chromeMajor && releaseNumber > chromeMajor) {
        res.ok = null;
        res.detail = \`future milestone for Chrome \${chromeMajor}\`;

        const badge = row.querySelector("[data-verdict-badge]");
        badge.className = "verdict verdict-na";
        badge.textContent = "future";
        row.dataset.verdict = "na";

        const detailCell = row.querySelector("[data-detail-cell]");
        detailCell.textContent = res.detail;

        progressBar.style.width = ((i + 1) / total * 100) + "%";
        if (i % 20 === 0) {
          await new Promise(r => requestAnimationFrame(r));
        }
        continue;
      }
      
      const { ok, detail } = await runAssertion(res.kind, res.test, res.expect);
      res.ok = ok;
      res.detail = detail;
      
      // Update UI
      const badge = row.querySelector("[data-verdict-badge]");
      badge.className = \`verdict \${ok ? 'verdict-pass' : 'verdict-fail'}\`;
      badge.textContent = ok ? "pass" : "fail";
      row.dataset.verdict = ok ? "pass" : "fail";
      
      const detailCell = row.querySelector("[data-detail-cell]");
      detailCell.textContent = detail || "—";
      
      if (ok) passed++; else failed++;
      
      // Stats
      document.getElementById("n-pass").textContent = passed;
      document.getElementById("n-fail").textContent = failed;
      document.getElementById("n-pct").textContent = ((passed / (passed + failed)) * 100).toFixed(0) + "%";
      
      // Progress
      progressBar.style.width = ((i + 1) / total * 100) + "%";
      
      if (!ok) {
        console.warn(\`❌ [\${res.release}] \${res.featureSlug} / \${res.id} (\${res.kind}): \${detail || "failed"}\`);
      }
      
      // Yield to avoid freezing UI
      if (i % 20 === 0) {
        await new Promise(r => requestAnimationFrame(r));
      }
    }
    
    console.groupEnd();
    console.log(\`✅ Done! Passed: \${passed}, Failed: \${failed}, Pass Rate: \${((passed / total) * 100).toFixed(1)}%\`);
    
    progressContainer.style.display = "none";
    document.getElementById("btn-run").disabled = false;
    document.getElementById("btn-run").textContent = "Run All Probes";
    
    applyFilters();
  }
  
  function applyFilters() {
    const q = filterSearch.value.toLowerCase();
    const milestone = filterMilestone.value;
    const verdict = filterVerdict.value;
    
    const rows = rowsContainer.querySelectorAll("tr");
    for (const row of rows) {
      const index = Number(row.dataset.index);
      const res = results[index];
      
      const matchesSearch = !q || 
        res.featureSlug.toLowerCase().includes(q) ||
        res.id.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q);
      
      const matchesMilestone = milestone === "all" || res.release === milestone;
      const matchesVerdict = verdict === "all" || row.dataset.verdict === verdict;
      
      if (matchesSearch && matchesMilestone && matchesVerdict) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    }
  }
  
  // Filters & Search Listeners
  filterSearch.addEventListener("input", applyFilters);
  filterMilestone.addEventListener("change", applyFilters);
  filterVerdict.addEventListener("change", applyFilters);
  
  document.getElementById("btn-run").addEventListener("click", runAll);
  
  document.getElementById("btn-copy-json").addEventListener("click", () => {
    const data = results.map(r => ({
      release: r.release,
      feature: r.featureSlug,
      concept: r.conceptSlug,
      assertion: r.id,
      kind: r.kind,
      ok: r.ok,
      detail: r.detail
    }));
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("JSON report copied to clipboard!");
  });
  
  document.getElementById("btn-copy-failures").addEventListener("click", () => {
    const failures = results.filter(r => r.ok === false).map(r => ({
      release: r.release,
      feature: r.featureSlug,
      concept: r.conceptSlug,
      assertion: r.id,
      kind: r.kind,
      detail: r.detail
    }));
    navigator.clipboard.writeText(JSON.stringify(failures, null, 2));
    alert(\`Copied \${failures.length} failures to clipboard!\`);
  });
  
  // Auto-run on load
  await runAll();
})();
</script>
</body>
</html>`;
}

async function renderConformanceIndex(): Promise<string> {
  const all = await collectConformanceSuites();
  all.sort((a, b) => {
    const am = Number(a.release.slice(1));
    const bm = Number(b.release.slice(1));
    if (am !== bm) return bm - am;
    return a.featureSlug.localeCompare(b.featureSlug);
  });
  const totalAssertions = all.reduce((n, s) => n + s.assertions.length, 0);
  const rows = all.map((s) => {
    const label = s.conceptSlug
      ? `${s.release} · ${s.featureSlug} / ${s.conceptSlug}`
      : `${s.release} · ${s.featureSlug}`;
    const href = s.conceptSlug
      ? `/${s.release}/${s.featureSlug}/${s.conceptSlug}/conformance/`
      : `/${s.release}/${s.featureSlug}/conformance/`;
    return `<tr>
      <td><a href="${escapeHTML(href)}">${escapeHTML(label)}</a></td>
      <td class="num">${s.assertions.length}</td>
      <td>${
      s.assertions.map((a) => `<code class="kind">${escapeHTML(a.kind)}</code>`).join(" ")
    }</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1000px; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .kind { font-size: 0.72rem; color: var(--text-muted); padding: 0.05rem 0.35rem; border: 1px solid var(--border-black); background: var(--bg-stone); margin-right: 0.2rem; }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>
  <header class="lede-block">
    <p class="eyebrow">conformance</p>
    <h1>spec-vs-implementation probes</h1>
    <p class="lede">Each suite is a list of assertions drawn from the spec text. Click into one and your browser runs the assertions live — Chrome stable, Chrome canary, Firefox, and Safari each give their own verdict. This is the live "does it actually work the way the spec says" matrix.</p>
    <p class="updated-line">${all.length} suite${
    all.length === 1 ? "" : "s"
  } · ${totalAssertions} total assertion${totalAssertions === 1 ? "" : "s"}</p>
  </header>

  <table>
    <thead><tr><th>page</th><th>assertions</th><th>kinds</th></tr></thead>
    <tbody>${
    rows ||
    `<tr><td colspan="3">No conformance suites yet. Generate them with the conformance-author subagent.</td></tr>`
  }</tbody>
  </table>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

async function knownReleaseMilestones(channels: Channels): Promise<Set<number>> {
  // Always accept the three live channels plus the previous stable (since
  // chromestatus's "stable" is the next cut, the previous mstone is what most
  // users actually have installed). Also accept any v<N>/ directory in the
  // repo, which covers archived older releases.
  const set = new Set<number>([
    channels.stable.mstone - 1,
    channels.stable.mstone,
    channels.beta.mstone,
    channels.dev.mstone,
  ]);
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        set.add(Number(entry.name.slice(1)));
      }
    }
  } catch {
    // ignore — Deno Deploy filesystem may not allow readDir at the root.
  }
  return set;
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    try {
      const channels = await getChannels();
      return new Response(await renderIndex(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render index: ${err}`, { status: 502 });
    }
  }

  if (path === "/features" || path === "/features/") {
    try {
      const channels = await getChannels();
      return new Response(await renderFeaturesCatalogue(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render features: ${err}`, { status: 502 });
    }
  }

  if (path === "/conformance" || path === "/conformance/") {
    try {
      return new Response(await renderConformanceIndex(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render conformance: ${err}`, { status: 502 });
    }
  }

  if (path === "/conformance/run-all" || path === "/conformance/run-all/") {
    try {
      const all = await collectConformanceSuites();
      return new Response(renderConformanceRunAllPage(all), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render run-all: ${err}`, { status: 502 });
    }
  }

  // Per-page conformance at /v<N>/<feature>/conformance/ or
  // /v<N>/<feature>/<concept>/conformance/.
  const confMatch = path.match(/^\/(v\d+)\/([^/]+)(?:\/([^/]+))?\/conformance\/?$/);
  if (confMatch) {
    const [, release, featureSlug, conceptSlug] = confMatch;
    const filePath = conceptSlug
      ? `${release}/${featureSlug}/${conceptSlug}/conformance.json`
      : `${release}/${featureSlug}/conformance.json`;
    const suite = await readConformance(filePath);
    if (!suite) {
      return new Response("No conformance suite yet for this page", { status: 404 });
    }
    return new Response(renderConformancePage(suite), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (path === "/critiques" || path === "/critiques/") {
    try {
      return new Response(await renderCritiquesIndex(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render critiques: ${err}`, { status: 502 });
    }
  }

  // Per-page critique detail at /v<N>/<feature>/critique/ or
  // /v<N>/<feature>/<concept>/critique/. The HTML is rendered from the
  // _questions.json that lives alongside the page.
  const critMatch = path.match(/^\/(v\d+)\/([^/]+)(?:\/([^/]+))?\/critique\/?$/);
  if (critMatch) {
    const [, release, featureSlug, conceptSlug] = critMatch;
    const filePath = conceptSlug
      ? `${release}/${featureSlug}/${conceptSlug}/_questions.json`
      : `${release}/${featureSlug}/_questions.json`;
    const critique = await readCritique(filePath);
    if (!critique) {
      return new Response("No critique yet for this page", { status: 404 });
    }
    return new Response(renderCritiqueDetail(critique), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (path === "/categories" || path === "/categories/") {
    try {
      const channels = await getChannels();
      return new Response(await renderCategoriesIndex(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render categories: ${err}`, { status: 502 });
    }
  }

  const catMatch = path.match(/^\/categories\/([a-z0-9-]+)\/?$/);
  if (catMatch) {
    try {
      const channels = await getChannels();
      const html = await renderCategoryPage(catMatch[1], channels);
      if (!html) return new Response("Unknown category", { status: 404 });
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch (err) {
      return new Response(`Failed to render category: ${err}`, { status: 502 });
    }
  }

  if (path.startsWith("/public/")) return readPublicAsset(path);

  const telemetryResponse = await renderProfileTelemetryRoute(req, path);
  if (telemetryResponse) return telemetryResponse;

  if (path === "/.well-known/web-identity") return renderFedCmWellKnown(req);

  // Per-release routes: /vNNN/ and /vNNN/<sub>.
  const releaseMatch = path.match(/^\/(v\d+)(\/.*)?$/);
  if (releaseMatch) {
    const release = releaseMatch[1];
    const milestone = Number(release.slice(1));
    const sub = releaseMatch[2] ?? "/";

    let channels: Channels;
    try {
      channels = await getChannels();
    } catch (err) {
      return new Response(`Failed to load channels: ${err}`, { status: 502 });
    }
    const known = await knownReleaseMilestones(channels);
    if (!known.has(milestone)) {
      return new Response(`Release ${release} not configured yet`, { status: 404 });
    }

    if (sub === "/" || sub === "/index.html") {
      try {
        const channels = await getChannels();
        return new Response(await renderReleasePage(release, milestone, channels), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        return new Response(`Failed to render release: ${err}`, { status: 502 });
      }
    }

    if (release === "v150" && sub === "/css-url-request-modifiers/referrer-echo") {
      return renderReferrerEcho(req);
    }
    if (release === "v150") {
      const processingInstructionStreamResponse = renderProcessingInstructionStreamingUseCaseRoute(
        req,
        sub,
      );
      if (processingInstructionStreamResponse) return processingInstructionStreamResponse;
      const outOfOrderStreamingResponse = renderOutOfOrderStreamingLiveRoute(req, sub);
      if (outOfOrderStreamingResponse) return outOfOrderStreamingResponse;
      const responsiveIframeResponse = renderResponsiveIframeEmbed(req, sub);
      if (responsiveIframeResponse) return responsiveIframeResponse;
      if (sub === "/responsively-sized-iframe/iframe-resize-demo/child.html") {
        const child = await readReleaseAsset(release, sub);
        if (child) {
          return withHeaders(child, {
            "supports-responsive-sizing": "1",
            "cache-control": "no-store",
          });
        }
      }
      const evpResponse = await renderEmailVerificationRoute(req, sub);
      if (evpResponse) return evpResponse;
    }
    if (release === "v130") {
      const compressionDictionaryMeasureResponse = await renderCompressionDictionaryMeasureRoute(
        req,
        sub,
      );
      if (compressionDictionaryMeasureResponse) return compressionDictionaryMeasureResponse;
      const webAuthnSignalResponse = await renderWebAuthnSignalRoute(req, sub);
      if (webAuthnSignalResponse) return webAuthnSignalResponse;
      const storageAccessHeadersResponse = renderStorageAccessHeadersRoute(req, sub);
      if (storageAccessHeadersResponse) return storageAccessHeadersResponse;
      const protectedAudienceResponse = await renderProtectedAudienceBiddingRoute(req, sub);
      if (protectedAudienceResponse) return protectedAudienceResponse;
    }
    if (release === "v134") {
      const attributionTriggerResponse = await renderAttributionTriggerContextRoute(req, sub);
      if (attributionTriggerResponse) return attributionTriggerResponse;
    }
    if (
      release === "v133" &&
      (
        sub === "/atomics-pause/spsc-queue" ||
        sub.startsWith("/atomics-pause/spsc-queue/") ||
        sub === "/atomics-pause/worker-spinlock" ||
        sub.startsWith("/atomics-pause/worker-spinlock/")
      )
    ) {
      const asset = await readReleaseAsset(release, sub);
      if (asset) {
        return withHeaders(asset, {
          "cross-origin-opener-policy": "same-origin",
          "cross-origin-embedder-policy": "require-corp",
        });
      }
    }
    if (release === "v136") {
      const autoPasskeyResponse = await renderAutoPasskeyRoute(req, sub);
      if (autoPasskeyResponse) return autoPasskeyResponse;
    }
    if (release === "v147") {
      const spcAuthResponse = await renderSpcAuthRoute(req, sub);
      if (spcAuthResponse) return spcAuthResponse;
      const spcCheckoutResponse = await renderSpcCheckoutRoute(req, sub);
      if (spcCheckoutResponse) return spcCheckoutResponse;
      const deviceMemoryHintResponse = renderDeviceMemoryClientHintRoute(req, sub);
      if (deviceMemoryHintResponse) return deviceMemoryHintResponse;
      if (
        sub === "/update-device-memory-api-limits/compatibility-lab" ||
        sub === "/update-device-memory-api-limits/compatibility-lab/" ||
        sub === "/update-device-memory-api-limits/compatibility-lab/index.html"
      ) {
        const asset = await readReleaseAsset(release, sub);
        if (asset) {
          return withHeaders(asset, {
            "accept-ch": "Sec-CH-Device-Memory",
            "vary": "Sec-CH-Device-Memory",
          });
        }
      }
      if (
        sub === "/js-profiling-in-dedicated-workers" ||
        sub.startsWith("/js-profiling-in-dedicated-workers/")
      ) {
        const asset = await readReleaseAsset(release, sub);
        if (asset) {
          return withHeaders(asset, {
            "document-policy": "js-profiling-mode=lazy, js-profiling",
          });
        }
      }
    }
    if (release === "v135" || release === "v145" || release === "v147") {
      if (release === "v135") {
        const fetchLaterResponse = await renderFetchLaterRoute(req, sub);
        if (fetchLaterResponse) return fetchLaterResponse;
      }
      if (release === "v145") {
        const uaChMigrationResponse = renderUaChMigrationEchoRoute(req, sub);
        if (uaChMigrationResponse) return uaChMigrationResponse;
      }
      if (release === "v135" || release === "v145") {
        const spcBbkResponse = await renderSpcBbkRoute(req, release, sub);
        if (spcBbkResponse) return spcBbkResponse;
      }
      const dbscResponse = await renderDbscRoute(req, sub);
      if (dbscResponse) return dbscResponse;
    }
    if (release === "v148") {
      const fedCmResponse = await renderFedCmRoute(req, sub);
      if (fedCmResponse) return fedCmResponse;
    }
    if (release === "v149") {
      const inlineScriptCacheResponse = await renderInlineScriptCacheProbeRoute(req, sub);
      if (inlineScriptCacheResponse) return inlineScriptCacheResponse;
      const wsBfcacheResponse = renderWebSocketBfcacheRoute(req, sub);
      if (wsBfcacheResponse) return wsBfcacheResponse;
    }
    if (release === "v151" && sub === "/cpu-performance-api/capability-echo") {
      return renderV151CapabilityEcho(req);
    }
    if (
      release === "v151" &&
      sub === "/resource-timing-add-spec-compliant-service-worker-router-timing-fields/delayed-echo"
    ) {
      return await renderV151DelayedEcho(req);
    }
    if (
      release === "v151" &&
      sub ===
        "/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/policy-echo"
    ) {
      return renderV151PolicyEcho(req);
    }
    if (release === "v151" && sub === "/renewed-html-insertion-streaming-methods/html-stream") {
      return renderV151HtmlStream(req);
    }

    return (await readReleaseAsset(release, sub)) ??
      new Response("Not found", { status: 404 });
  }

  return new Response("Not found", { status: 404 });
});

console.log(`Listening on http://localhost:${PORT}`);
