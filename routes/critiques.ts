import { htmlResponse } from "./html.ts";
import { readCritique, renderCritiqueDetail, renderCritiquesIndex } from "./critique-renderers.ts";

export async function handleCritiquesRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  if (path === "/critiques" || path === "/critiques/") {
    try {
      return htmlResponse(await renderCritiquesIndex());
    } catch (err) {
      return new Response(`Failed to render critiques: ${err}`, { status: 502 });
    }
  }

  const match = path.match(/^\/(v\d+)\/([^/]+)(?:\/([^/]+))?\/critique\/?$/);
  if (!match) return null;

  const [, release, featureSlug, conceptSlug] = match;
  const filePath = conceptSlug
    ? `${release}/${featureSlug}/${conceptSlug}/_questions.json`
    : `${release}/${featureSlug}/_questions.json`;
  const critique = await readCritique(filePath);
  if (!critique) {
    return new Response("No critique yet for this page", { status: 404 });
  }
  return htmlResponse(renderCritiqueDetail(critique));
}
