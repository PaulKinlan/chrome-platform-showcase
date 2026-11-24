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
// the demo pages themselves get from their co-located `_server.ts` handlers.
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
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/conformance" || path === "/conformance/") {
    try {
      return htmlResponse(await renderConformanceIndex());
    } catch (err) {
      return new Response(`Failed to render conformance: ${err}`, { status: 502 });
    }
  }

  if (path === "/conformance/suites.json") {
    try {
      const all = await collectConformanceSuites();
      const rawRelease = url.searchParams.get("release")?.trim();
      const release = rawRelease && rawRelease !== "all" ? rawRelease : null;
      const milestones = Array.from(new Set(all.map((s) => s.release))).sort((a, b) =>
        Number(b.slice(1)) - Number(a.slice(1))
      );
      const suites = release ? all.filter((s) => s.release === release) : all;
      const assertionCount = suites.reduce((n, s) => n + s.assertions.length, 0);
      return new Response(
        JSON.stringify({
          release,
          milestones,
          suiteCount: suites.length,
          assertionCount,
          suites,
        }),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=60",
          },
        },
      );
    } catch (err) {
      return new Response(`Failed to render suites JSON: ${err}`, { status: 502 });
    }
  }

  if (path === "/conformance/run-all" || path === "/conformance/run-all/") {
    try {
      const all = await collectConformanceSuites();
      const release = url.searchParams.get("release")?.trim() || undefined;
      return htmlResponse(renderConformanceRunAllPage(all, { release }));
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
