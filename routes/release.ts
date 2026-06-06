import { getChannels } from "../lib/chromestatus.ts";
import { knownReleaseMilestones, renderReleasePage } from "./pages.ts";

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

const CSS_URL_MODIFIER_DEMO_PREFIX = "/css-url-request-modifiers/crossorigin-integrity-demo";

const CSS_URL_MODIFIER_CLEAN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="Verified CSS resource">
  <rect width="320" height="180" fill="ivory"/>
  <path d="M40 130 L118 58 L170 100 L214 72 L280 130 Z" fill="teal"/>
  <circle cx="238" cy="52" r="20" fill="royalblue"/>
  <text x="34" y="34" font-family="monospace" font-size="16" fill="black">verified CSS resource</text>
</svg>`;

const CSS_URL_MODIFIER_TAMPERED_SVG = CSS_URL_MODIFIER_CLEAN_SVG
  .replace("verified CSS resource", "tampered CSS resource")
  .replace('fill="teal"', 'fill="crimson"');

function appendVary(headers: Headers, value: string): void {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }
  const parts = existing.split(",").map((part) => part.trim().toLowerCase());
  if (!parts.includes(value.toLowerCase())) {
    headers.set("vary", `${existing}, ${value}`);
  }
}

async function sha384Sri(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-384", toArrayBuffer(bytes)));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return `sha384-${btoa(binary)}`;
}

function applyCssUrlModifierDemoCors(headers: Headers, req: Request, mode: string): void {
  appendVary(headers, "Origin");
  headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set(
    "access-control-expose-headers",
    "x-demo-cors-mode, x-demo-sha384, x-demo-variant, x-demo-resource-bytes",
  );
  headers.set("timing-allow-origin", "*");

  if (mode === "public") {
    headers.set("access-control-allow-origin", "*");
    return;
  }

  if (mode === "credentialed") {
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
  }
}

async function renderCssUrlModifierDemoRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (!sub.startsWith(`${CSS_URL_MODIFIER_DEMO_PREFIX}/`)) return null;

  const route = sub.slice(CSS_URL_MODIFIER_DEMO_PREFIX.length);
  if (route !== "/asset-meta" && route !== "/resource.svg") return null;

  const url = new URL(req.url);
  const cleanHash = await sha384Sri(CSS_URL_MODIFIER_CLEAN_SVG);
  const tamperedHash = await sha384Sri(CSS_URL_MODIFIER_TAMPERED_SVG);
  const variant = url.searchParams.get("variant") === "tampered" ||
      url.searchParams.get("tamper") === "1"
    ? "tampered"
    : "clean";
  const body = variant === "tampered" ? CSS_URL_MODIFIER_TAMPERED_SVG : CSS_URL_MODIFIER_CLEAN_SVG;
  const hash = variant === "tampered" ? tamperedHash : cleanHash;
  const corsMode = ["public", "credentialed", "blocked"].includes(
      url.searchParams.get("cors") ?? "",
    )
    ? url.searchParams.get("cors")!
    : "public";
  const headers = new Headers({
    "cache-control": "no-store",
    "x-demo-cors-mode": corsMode,
  });
  applyCssUrlModifierDemoCors(headers, req, corsMode);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (route === "/asset-meta") {
    return jsonResponse({
      cleanUrl: `/v150${CSS_URL_MODIFIER_DEMO_PREFIX}/resource.svg?variant=clean`,
      tamperedUrl: `/v150${CSS_URL_MODIFIER_DEMO_PREFIX}/resource.svg?variant=tampered`,
      cleanSha384: cleanHash,
      tamperedSha384: tamperedHash,
      corsModes: {
        public: "Access-Control-Allow-Origin: *",
        credentialed:
          "Access-Control-Allow-Origin: <request Origin>, Access-Control-Allow-Credentials: true",
        blocked: "No Access-Control-Allow-Origin response header",
      },
    }, { headers });
  }

  headers.set("content-type", "image/svg+xml; charset=utf-8");
  headers.set("x-demo-variant", variant);
  headers.set("x-demo-sha384", hash);
  headers.set("x-demo-resource-bytes", String(new TextEncoder().encode(body).byteLength));

  if (req.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(body, { headers });
}

const DEVICE_MEMORY_CLIENT_HINT_ECHO_ROUTES = new Set([
  "/update-device-memory-api-limits/compatibility-lab/client-hint-echo",
  "/update-device-memory-api-limits/memory-inspector/client-hint-echo",
]);

function renderDeviceMemoryClientHintRoute(req: Request, sub: string): Response | null {
  if (!DEVICE_MEMORY_CLIENT_HINT_ECHO_ROUTES.has(sub)) {
    return null;
  }

  const url = new URL(req.url);
  const secCHDeviceMemory = req.headers.get("sec-ch-device-memory");
  const legacyDeviceMemory = req.headers.get("device-memory");
  const payload = {
    endpoint: url.pathname,
    round: url.searchParams.get("round"),
    optInResponseHeader: "Accept-CH: Sec-CH-Device-Memory",
    expectedRequestHeader: "Sec-CH-Device-Memory",
    received: {
      secCHDeviceMemory,
      legacyDeviceMemory,
      accept: req.headers.get("accept"),
      userAgent: req.headers.get("user-agent"),
    },
    note: secCHDeviceMemory
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

const CONTENT_TYPE_TIMING_PROBE_PREFIX =
  "/content-type-in-resource-timing/mime-type-performance-analyzer/probe";

interface ContentTypeTimingProbe {
  body: string | Uint8Array;
  contentType?: string;
}

const CONTENT_TYPE_TIMING_PROBES: Record<string, ContentTypeTimingProbe> = {
  html: {
    contentType: "text/html; charset=utf-8",
    body: "<!doctype html><title>Resource Timing probe</title><p>HTML probe</p>",
  },
  css: {
    contentType: "text/css; charset=utf-8",
    body: ".probe-card{display:block;color:var(--text-black)}",
  },
  js: {
    contentType: "text/javascript; charset=utf-8",
    body: "globalThis.__contentTypeTimingProbe = true;",
  },
  json: {
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({ demo: "contentType", kind: "json" }),
  },
  image: {
    contentType: "image/svg+xml",
    body:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" fill="ivory"/><circle cx="60" cy="30" r="18" fill="teal"/></svg>`,
  },
  font: {
    contentType: "font/woff2",
    body: new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]),
  },
  video: {
    contentType: "video/mp4",
    body: new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
  },
  wasm: {
    contentType: "application/wasm",
    body: new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
  },
  "script-as-html": {
    contentType: "text/html; charset=utf-8",
    body: "<!doctype html><title>Mislabelled script</title>",
  },
  "script-as-plain": {
    contentType: "text/plain; charset=utf-8",
    body: "console.log('served as text/plain');",
  },
  "missing-type": {
    body: new TextEncoder().encode(JSON.stringify({ demo: "missing content-type header" })),
  },
};

function renderContentTypeTimingProbeRoute(req: Request, sub: string): Response | null {
  if (sub !== CONTENT_TYPE_TIMING_PROBE_PREFIX) return null;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "";
  const probe = CONTENT_TYPE_TIMING_PROBES[kind];
  if (!probe) {
    return jsonResponse({ error: "Unknown content type timing probe", kind }, { status: 404 });
  }

  const headers = new Headers({
    "cache-control": "no-store",
    "timing-allow-origin": "*",
    "x-showcase-probe-kind": kind,
  });
  if (probe.contentType) headers.set("content-type", probe.contentType);

  if (req.method === "HEAD") return new Response(null, { headers });
  const body = probe.body instanceof Uint8Array ? toArrayBuffer(probe.body) : probe.body;
  return new Response(body, { headers });
}

const PREFETCH_BUDGET_MONITOR_ROUTE =
  "/pass-sec-purpose-prefetch-header-with-link-rel-prefetch/prefetch-budget-monitor/budget-endpoint";
const PREFETCH_BUDGET_MONITOR_LIMIT_KB = 80;

interface PrefetchBudgetEntry {
  id: string;
  nonce: string;
  label: string;
  resource: string;
  receivedAt: string;
  received: {
    secPurpose: string | null;
    purpose: string | null;
    secFetchDest: string | null;
    secFetchMode: string | null;
  };
  decision: "slim" | "blocked" | "full";
  status: number;
  fullKb: number;
  slimKb: number;
  servedKb: number;
  budget: {
    limitKb: number;
    usedKb: number;
    remainingKb: number;
  };
}

interface PrefetchBudgetSession {
  usedKb: number;
  entries: PrefetchBudgetEntry[];
}

const prefetchBudgetSessions = new Map<string, PrefetchBudgetSession>();

function getPrefetchBudgetSession(key: string): PrefetchBudgetSession {
  const existing = prefetchBudgetSessions.get(key);
  if (existing) return existing;
  const session = { usedKb: 0, entries: [] };
  prefetchBudgetSessions.set(key, session);
  return session;
}

function resetPrefetchBudgetSession(key: string): PrefetchBudgetSession {
  const session = { usedKb: 0, entries: [] };
  prefetchBudgetSessions.set(key, session);
  return session;
}

function boundedKb(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(500, Math.round(parsed)));
}

function prefetchBudgetSnapshot(session: PrefetchBudgetSession) {
  return {
    limitKb: PREFETCH_BUDGET_MONITOR_LIMIT_KB,
    usedKb: session.usedKb,
    remainingKb: Math.max(0, PREFETCH_BUDGET_MONITOR_LIMIT_KB - session.usedKb),
    entries: session.entries,
  };
}

function renderPrefetchBudgetMonitorRoute(req: Request, sub: string): Response | null {
  if (sub !== PREFETCH_BUDGET_MONITOR_ROUTE) return null;

  const url = new URL(req.url);
  const sessionKey = (url.searchParams.get("session") || "default").replace(/[^\w.-]/g, "_");
  const session = url.searchParams.get("reset") === "1"
    ? resetPrefetchBudgetSession(sessionKey)
    : getPrefetchBudgetSession(sessionKey);

  if (url.searchParams.get("read") === "1" || url.searchParams.get("reset") === "1") {
    return jsonResponse(prefetchBudgetSnapshot(session), {
      headers: {
        "vary": "Sec-Purpose, Purpose",
      },
    });
  }

  const nonce = (url.searchParams.get("nonce") || crypto.randomUUID()).replace(/[^\w.-]/g, "_");
  const duplicate = session.entries.find((entry) => entry.nonce === nonce);
  if (duplicate) {
    return jsonResponse(duplicate, {
      status: duplicate.status,
      headers: {
        "vary": "Sec-Purpose, Purpose",
      },
    });
  }

  const secPurpose = req.headers.get("sec-purpose");
  const purpose = req.headers.get("purpose");
  const purposeText = `${secPurpose ?? ""} ${purpose ?? ""}`.toLowerCase();
  const isPrefetch = purposeText.includes("prefetch");
  const fullKb = boundedKb(url.searchParams.get("fullKb"), 50);
  const slimKb = boundedKb(url.searchParams.get("slimKb"), Math.max(8, Math.round(fullKb / 3)));
  const resource = url.searchParams.get("resource") || "resource";
  const label = url.searchParams.get("label") || resource;
  const wouldUseKb = session.usedKb + slimKb;
  const decision: PrefetchBudgetEntry["decision"] = isPrefetch
    ? wouldUseKb > PREFETCH_BUDGET_MONITOR_LIMIT_KB ? "blocked" : "slim"
    : "full";
  const servedKb = decision === "blocked" ? 0 : decision === "slim" ? slimKb : fullKb;
  if (decision === "slim") {
    session.usedKb += slimKb;
  }

  const entry: PrefetchBudgetEntry = {
    id: url.searchParams.get("id") || resource,
    nonce,
    label,
    resource,
    receivedAt: new Date().toISOString(),
    received: {
      secPurpose,
      purpose,
      secFetchDest: req.headers.get("sec-fetch-dest"),
      secFetchMode: req.headers.get("sec-fetch-mode"),
    },
    decision,
    status: 200,
    fullKb,
    slimKb,
    servedKb,
    budget: {
      limitKb: PREFETCH_BUDGET_MONITOR_LIMIT_KB,
      usedKb: session.usedKb,
      remainingKb: Math.max(0, PREFETCH_BUDGET_MONITOR_LIMIT_KB - session.usedKb),
    },
  };
  session.entries.push(entry);
  if (session.entries.length > 40) session.entries.splice(0, session.entries.length - 40);

  const headers = new Headers({
    "vary": "Sec-Purpose, Purpose",
    "x-demo-decision": decision,
    "x-demo-sec-purpose": secPurpose ?? "",
    "x-demo-purpose": purpose ?? "",
    "x-demo-served-kb": String(servedKb),
    "x-demo-budget-used-kb": String(session.usedKb),
    "access-control-expose-headers":
      "x-demo-decision, x-demo-sec-purpose, x-demo-purpose, x-demo-served-kb, x-demo-budget-used-kb",
  });

  if (req.method === "HEAD") {
    return new Response(null, { status: entry.status, headers });
  }

  return jsonResponse({
    ...entry,
    bodyKind: decision === "slim"
      ? "speculative slim response"
      : decision === "blocked"
      ? "budget block"
      : "full navigation response",
    note: isPrefetch
      ? "The server observed a prefetch purpose header and applied the speculative budget policy."
      : "No prefetch purpose header was present, so the server used the full navigation path.",
  }, { status: entry.status, headers });
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
  const hasAdvertisedDictionary = typeof body.availableDictionary === "string" &&
    body.availableDictionary.length > 0;
  const advertisedHash = hasAdvertisedDictionary ? body.availableDictionary as string : "";
  const dictionaryMatches = hasAdvertisedDictionary && advertisedHash === actualHash;

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
      hasAdvertisedDictionary,
      actualHash,
      advertisedHash,
      dictionaryId: "cart-v42",
      note: dictionaryMatches
        ? "The server accepted the advertised dictionary hash. The dcb byte count uses RFC 9842's 36-byte dcb header plus a real zlib dictionary-compressed payload as a local stand-in for Shared Brotli."
        : hasAdvertisedDictionary
        ? "The advertised hash did not match the dictionary bytes, so the server ignored dcb/dcz and fell back to regular Brotli."
        : "No Available-Dictionary hash was advertised, so the server used the regular Brotli fallback.",
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

export async function renderProfileTelemetryRoute(
  req: Request,
  path: string,
): Promise<Response | null> {
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

export function renderFedCmWellKnown(req: Request): Response {
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

export async function handleReleaseRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const releaseMatch = path.match(/^\/(v\d+)(\/.*)?$/);
  if (!releaseMatch) return null;

  const release = releaseMatch[1];
  const milestone = Number(release.slice(1));
  const sub = releaseMatch[2] ?? "/";

  let channels;
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
      return new Response(await renderReleasePage(release, milestone, channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render release: ${err}`, { status: 502 });
    }
  }

  if (release === "v150") {
    const cssUrlModifierDemoResponse = await renderCssUrlModifierDemoRoute(req, sub);
    if (cssUrlModifierDemoResponse) return cssUrlModifierDemoResponse;
    if (sub === "/css-url-request-modifiers/referrer-echo") {
      return renderReferrerEcho(req);
    }
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

  if (release === "v138") {
    const prefetchBudgetResponse = renderPrefetchBudgetMonitorRoute(req, sub);
    if (prefetchBudgetResponse) return prefetchBudgetResponse;
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
      sub === "/update-device-memory-api-limits/compatibility-lab/index.html" ||
      sub === "/update-device-memory-api-limits/memory-inspector" ||
      sub === "/update-device-memory-api-limits/memory-inspector/" ||
      sub === "/update-device-memory-api-limits/memory-inspector/index.html"
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
          "document-policy": "js-profiling",
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
    const contentTypeTimingResponse = renderContentTypeTimingProbeRoute(req, sub);
    if (contentTypeTimingResponse) return contentTypeTimingResponse;
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
    sub ===
      "/resource-timing-add-spec-compliant-service-worker-router-timing-fields/delayed-echo"
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
