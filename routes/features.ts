import { getChannels } from "../lib/chromestatus.ts";
import { htmlResponse } from "./html.ts";
import { renderFeaturesCatalogue } from "./pages.ts";

export async function handleFeaturesRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  if (path !== "/features" && path !== "/features/") return null;

  try {
    const channels = await getChannels();
    return htmlResponse(await renderFeaturesCatalogue(channels));
  } catch (err) {
    return new Response(`Failed to render features: ${err}`, { status: 502 });
  }
}
