import { getChannels } from "../lib/chromestatus.ts";
import { htmlResponse } from "./html.ts";
import { renderIndex } from "./pages.ts";

export async function handleIndexRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  if (path !== "/" && path !== "/index.html") return null;

  try {
    const channels = await getChannels();
    return htmlResponse(await renderIndex(channels));
  } catch (err) {
    return new Response(`Failed to render index: ${err}`, { status: 502 });
  }
}
