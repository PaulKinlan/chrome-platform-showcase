import { getChannels } from "../lib/chromestatus.ts";
import { htmlResponse } from "./html.ts";
import { renderCategoriesIndex, renderCategoryPage } from "./pages.ts";

export async function handleCategoriesRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  if (path === "/categories" || path === "/categories/") {
    try {
      const channels = await getChannels();
      return htmlResponse(await renderCategoriesIndex(channels));
    } catch (err) {
      return new Response(`Failed to render categories: ${err}`, { status: 502 });
    }
  }

  const match = path.match(/^\/categories\/([a-z0-9-]+)\/?$/);
  if (!match) return null;

  try {
    const channels = await getChannels();
    const html = await renderCategoryPage(match[1], channels);
    return html ? htmlResponse(html) : new Response("Unknown category", { status: 404 });
  } catch (err) {
    return new Response(`Failed to render category: ${err}`, { status: 502 });
  }
}
