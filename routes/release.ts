import { renderBreadcrumbs } from "../lib/breadcrumbs.ts";
import { getChannels } from "../lib/chromestatus.ts";
import { handleFeatureRequest as handleDpoServer } from "../v151/declarative-performance-observer/_server.ts";
import { escapeHTML } from "./html.ts";
import { knownReleaseMilestones, renderReleasePage } from "./pages.ts";
import {
  handleLegacyReleaseEndpoints,
  renderFedCmWellKnown,
  renderProfileTelemetryRoute,
} from "./release-endpoints.ts";

export { renderFedCmWellKnown, renderProfileTelemetryRoute };

export type FeatureServerHandler = (
  req: Request,
  sub: string,
) => Response | Promise<Response | null> | null;

// Static registry of co-located `v<N>/<feature-slug>/_server.ts` handlers so
// Deno Deploy's static module graph includes them, plus a dynamic import
// fallback for newly created `v<N>/<feature-slug>/_server.ts` modules in local
// or routine sessions.
const STATIC_FEATURE_SERVERS: Record<string, FeatureServerHandler> = {
  "v151/declarative-performance-observer": handleDpoServer,
};

const dynamicFeatureServerCache = new Map<string, FeatureServerHandler | null>();

async function resolveFeatureServer(
  release: string,
  sub: string,
): Promise<FeatureServerHandler | null> {
  const firstSegment = sub.replace(/^\/+/, "").split("/")[0];
  if (!firstSegment || firstSegment.includes(".")) return null;
  const key = `${release}/${firstSegment}`;
  if (STATIC_FEATURE_SERVERS[key]) return STATIC_FEATURE_SERVERS[key];
  if (dynamicFeatureServerCache.has(key)) {
    return dynamicFeatureServerCache.get(key) ?? null;
  }

  try {
    const stat = await Deno.stat(`./${key}/_server.ts`);
    if (!stat.isFile) {
      dynamicFeatureServerCache.set(key, null);
      return null;
    }
    const mod = await import(`../${key}/_server.ts`);
    const fn: FeatureServerHandler | null = typeof mod.handleFeatureRequest === "function"
      ? mod.handleFeatureRequest
      : typeof mod.default === "function"
      ? mod.default
      : null;
    dynamicFeatureServerCache.set(key, fn);
    return fn;
  } catch {
    dynamicFeatureServerCache.set(key, null);
    return null;
  }
}

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
  jxl: "image/jxl",
  avif: "image/avif",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  glsl: "text/plain; charset=utf-8",
  sql: "text/plain; charset=utf-8",
  tmpl: "text/plain; charset=utf-8",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  woff2: "font/woff2",
};

function injectDemoTelemetry(html: string): string {
  if (html.includes("/public/demo-telemetry.js")) return html;
  const script = '<script src="/public/demo-telemetry.js" defer></script>';
  return html.includes("</head>")
    ? html.replace("</head>", `  ${script}\n</head>`)
    : `${html}\n${script}`;
}

const fileExistsCache = new Map<string, boolean>();

async function fileExists(path: string): Promise<boolean> {
  const cached = fileExistsCache.get(path);
  if (cached !== undefined) return cached;
  try {
    const ok = (await Deno.stat(path)).isFile;
    fileExistsCache.set(path, ok);
    return ok;
  } catch {
    fileExistsCache.set(path, false);
    return false;
  }
}

let gendnRoutesPromise: Promise<Set<string>> | undefined;

function gendnRoutes(): Promise<Set<string>> {
  if (!gendnRoutesPromise) {
    gendnRoutesPromise = Deno.readTextFile("./gendn-links.json")
      .then((text) => new Set<string>((JSON.parse(text).routes ?? []) as string[]))
      .catch(() => new Set<string>());
  }
  return gendnRoutesPromise;
}

async function injectGendnReference(
  html: string,
  release: string,
  key: string,
): Promise<string> {
  if (!key.endsWith("index.html") || html.includes('class="gendn-reference"')) return html;
  const segments = key.replace(/\/index\.html$/, "").split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return html;
  const featureRoute = `/${release}/${segments[0]}/`;
  if (!(await gendnRoutes()).has(featureRoute)) return html;

  const referenceUrl = `https://gendn.paulkinlan-ea.deno.net${featureRoute}`;
  const block = `<section class="gendn-reference" aria-labelledby="gendn-reference-title">
    <h2 id="gendn-reference-title">implementation reference</h2>
    <p>Need the exact API surface, compatibility boundaries, errors, lifecycle, and source links? <a href="${
    escapeHTML(referenceUrl)
  }" target="_blank" rel="noopener">Read the matching gendn reference ↗</a></p>
  </section>`;
  return /<footer\s+class=["']byline["']/i.test(html)
    ? html.replace(/<footer\s+class=["']byline["']/i, `${block}\n  <footer class="byline"`)
    : html.replace("</main>", `${block}\n</main>`);
}

async function injectConformancePanel(
  html: string,
  release: string,
  key: string,
): Promise<string> {
  if (!key.endsWith("index.html") || html.includes("/public/conformance-panel.js")) return html;

  const segments = key.replace(/\/index\.html$/, "").split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return html;

  const feature = segments[0];
  const concept = segments[1];
  const conceptPath = concept ? `${release}/${feature}/${concept}/conformance.json` : "";
  const featurePath = `${release}/${feature}/conformance.json`;
  const suitePath = conceptPath && await fileExists(conceptPath)
    ? conceptPath
    : await fileExists(featurePath)
    ? featurePath
    : "";
  if (!suitePath) return html;

  const suiteUrl = `/${suitePath}`;
  const conformancePage = `/${suitePath.replace(/\/conformance\.json$/, "/conformance/")}`;
  const scope = conceptPath === suitePath ? "concept" : "feature";
  const script = `<script type="module" src="/public/conformance-panel.js" data-suite-url="${
    escapeHTML(suiteUrl)
  }" data-conformance-page="${escapeHTML(conformancePage)}" data-suite-scope="${scope}"></script>`;
  return html.includes("</head>")
    ? html.replace("</head>", `  ${script}\n</head>`)
    : `${html}\n${script}`;
}

function headingText(html: string): string {
  const heading = html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  return heading
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const featureHeadingCache = new Map<string, string>();

async function getFeatureHeading(release: string, featureSlug: string): Promise<string> {
  const cacheKey = `${release}/${featureSlug}`;
  const cached = featureHeadingCache.get(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const featureHTML = await Deno.readTextFile(`./${release}/${featureSlug}/index.html`);
    const title = headingText(featureHTML);
    featureHeadingCache.set(cacheKey, title);
    return title;
  } catch {
    featureHeadingCache.set(cacheKey, "");
    return "";
  }
}

async function injectReleaseBreadcrumbs(
  html: string,
  release: string,
  key: string,
  origin: string,
): Promise<string> {
  if (!key.endsWith("index.html")) return html;
  const segments = key.replace(/\/index\.html$/, "").split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return html;

  const milestone = release.replace(/^v/, "");
  const currentTitle = headingText(html);
  if (!currentTitle) return html;

  const items = [
    { name: "Chrome platform showcase", path: "/" },
    { name: `Chrome ${milestone}`, path: `/${release}/` },
  ];

  if (segments.length === 2) {
    const featureTitle = await getFeatureHeading(release, segments[0]);
    if (featureTitle) {
      items.push({ name: featureTitle, path: `/${release}/${segments[0]}/` });
    }
  }

  items.push({
    name: currentTitle,
    path: `/${release}/${segments.join("/")}/`,
  });

  const breadcrumbs = renderBreadcrumbs(items, origin);
  const withNavigation = /<p\s+class=["']crumbs["'][^>]*>[\s\S]*?<\/p>/i.test(html)
    ? html.replace(
      /<p\s+class=["']crumbs["'][^>]*>[\s\S]*?<\/p>/i,
      breadcrumbs.navigation,
    )
    : html.replace(/<main(?:\s[^>]*)?>/i, (main) => `${main}\n${breadcrumbs.navigation}`);

  return withNavigation.includes("</head>")
    ? withNavigation.replace(
      "</head>",
      `  ${breadcrumbs.canonical}\n  ${breadcrumbs.structuredData}\n</head>`,
    )
    : withNavigation;
}

function demoTelemetryHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set("reporting-endpoints", 'default="/telemetry/demo/report"');
  headers.set(
    "content-security-policy-report-only",
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; " +
      "img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; " +
      "connect-src 'self' https: data: blob:; report-uri /telemetry/demo/report; report-to default",
  );
  return headers;
}

async function readReleaseAssetFromDisk(
  release: string,
  sub: string,
  origin: string,
): Promise<Response | null> {
  if (sub.includes("..")) return null;
  let key = sub.replace(/^\/+/, "");
  if (!key) return null;
  if (key.endsWith("/")) key += "index.html";
  else if (!/\.[a-z0-9]+$/i.test(key)) key += "/index.html";

  // Never serve internal `_server.ts` modules as raw static files.
  if (key.endsWith("_server.ts")) return null;

  try {
    const file = await Deno.readFile(`./${release}/${key}`);
    const ext = key.split(".").pop() ?? "";
    if (ext === "html") {
      const html = new TextDecoder().decode(file);
      const withBreadcrumbs = await injectReleaseBreadcrumbs(html, release, key, origin);
      const withGendn = await injectGendnReference(withBreadcrumbs, release, key);
      const withConformance = await injectConformancePanel(withGendn, release, key);
      return new Response(injectDemoTelemetry(withConformance), {
        headers: demoTelemetryHeaders({ "content-type": MIME[ext] }),
      });
    }
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

export async function handleReleaseRoute(req: Request): Promise<Response | null> {
  const requestURL = new URL(req.url);
  const path = requestURL.pathname;
  const releaseMatch = path.match(/^\/(v\d+)(\/.*)?$/);
  if (!releaseMatch) return null;

  const release = releaseMatch[1];
  const milestone = Number(release.slice(1));
  const sub = releaseMatch[2] ?? "/";
  const readReleaseAsset = (releaseName: string, assetPath: string) =>
    readReleaseAssetFromDisk(releaseName, assetPath, requestURL.origin);

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
      return new Response(
        await renderReleasePage(release, milestone, channels, requestURL.origin),
        {
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      );
    } catch (err) {
      return new Response(`Failed to render release: ${err}`, { status: 502 });
    }
  }

  // 1. Co-located per-feature server handler (`v<N>/<feature-slug>/_server.ts`)
  const featureServer = await resolveFeatureServer(release, sub);
  if (featureServer) {
    const response = await featureServer(req, sub);
    if (response) return response;
  }

  // 2. Extracted legacy per-release server endpoints (`routes/release-endpoints.ts`)
  const endpointResponse = await handleLegacyReleaseEndpoints(req, release, sub, readReleaseAsset);
  if (endpointResponse) return endpointResponse;

  // 3. Static asset + HTML shell injection
  return (await readReleaseAsset(release, sub)) ??
    new Response("Not found", { status: 404 });
}
