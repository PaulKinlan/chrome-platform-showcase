export function handleFaviconRoute(req: Request): Response | null {
  const url = new URL(req.url);
  if (url.pathname !== "/favicon.ico") return null;

  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "public, max-age=86400",
    },
  });
}
