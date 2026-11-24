import { htmlResponse } from "./html.ts";
import { readCritique, renderCritiqueDetail, renderCritiquesIndex } from "./critique-renderers.ts";

function parseIntParam(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return undefined;
  return Number(trimmed);
}

export async function handleCritiquesRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/critiques" || path === "/critiques/") {
    try {
      const sp = url.searchParams;
      const release = sp.get("release")?.trim() || undefined;
      const page = parseIntParam(sp.get("page"));
      const limit = parseIntParam(sp.get("limit"));
      const allParam = sp.get("all")?.trim();
      const all = allParam === "1" || allParam === "true";
      return htmlResponse(await renderCritiquesIndex({ release, page, limit, all }));
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
