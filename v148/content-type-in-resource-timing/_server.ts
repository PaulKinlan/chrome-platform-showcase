// Co-located feature server for v148/content-type-in-resource-timing:
// serves typed and intentionally mislabelled resource probes with
// `Timing-Allow-Origin: *` for PerformanceResourceTiming.contentType demos.

import { jsonResponse, toArrayBuffer } from "../../lib/feature-servers/http-helpers.ts";

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

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  return renderContentTypeTimingProbeRoute(req, sub);
}
