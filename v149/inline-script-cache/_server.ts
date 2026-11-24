// Co-located feature server for v149/inline-script-cache:
// serves the cold-vs-warm inline script cache probe HTML document with
// selectable script variants and SHA-256 content hash headers.

import { escapeHTML } from "../../routes/html.ts";

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

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  return await renderInlineScriptCacheProbeRoute(req, sub);
}
