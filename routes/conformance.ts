import { htmlResponse } from "./html.ts";
import {
  collectConformanceSuites,
  readConformance,
  renderConformanceIndex,
  renderConformancePage,
  renderConformanceRunAllPage,
} from "./conformance-renderers.ts";

// Suites whose assertions construct a JS Self-Profiling `Profiler`, which the
// browser refuses without `Document-Policy: js-profiling`. Mirrors the header
// the demo pages themselves get in routes/release-endpoints.ts.
const JS_PROFILING_SUITES = new Set([
  "v147/js-profiling-in-dedicated-workers",
  "v153/js-self-profiling-markers",
]);

function conformanceHeaders(release: string, featureSlug: string): HeadersInit | undefined {
  if (JS_PROFILING_SUITES.has(`${release}/${featureSlug}`)) {
    return {
      "document-policy": "js-profiling",
    };
  }
  return undefined;
}

export async function handleConformanceRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  if (path === "/conformance" || path === "/conformance/") {
    try {
      return htmlResponse(await renderConformanceIndex());
    } catch (err) {
      return new Response(`Failed to render conformance: ${err}`, { status: 502 });
    }
  }

  if (path === "/conformance/run-all" || path === "/conformance/run-all/") {
    try {
      const all = await collectConformanceSuites();
      return htmlResponse(renderConformanceRunAllPage(all));
    } catch (err) {
      return new Response(`Failed to render run-all: ${err}`, { status: 502 });
    }
  }

  const match = path.match(/^\/(v\d+)\/([^/]+)(?:\/([^/]+))?\/conformance\/?$/);
  if (!match) return null;

  const [, release, featureSlug, conceptSlug] = match;
  const filePath = conceptSlug
    ? `${release}/${featureSlug}/${conceptSlug}/conformance.json`
    : `${release}/${featureSlug}/conformance.json`;
  const suite = await readConformance(filePath);
  if (!suite) {
    return new Response("No conformance suite yet for this page", { status: 404 });
  }
  return htmlResponse(renderConformancePage(suite), {
    headers: conformanceHeaders(release, featureSlug),
  });
}
