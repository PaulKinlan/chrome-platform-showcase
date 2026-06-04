import { htmlResponse } from "./html.ts";
import {
  collectConformanceSuites,
  readConformance,
  renderConformanceIndex,
  renderConformancePage,
  renderConformanceRunAllPage,
} from "./conformance-renderers.ts";

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
  return htmlResponse(renderConformancePage(suite));
}
