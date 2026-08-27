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

async function readPublicAsset(path: string): Promise<Response> {
  try {
    const file = await Deno.readFile("." + path);
    const ext = path.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

/**
 * A synthetic slow stream, for demos about cancelling one.
 *
 * Over localhost a real file arrives in a single chunk, so a demo that wants
 * to show a download being cancelled part-way has nothing to cancel. This
 * emits `bytes` bytes in `chunk`-sized pieces with `delayMs` between them, so
 * the body is genuinely still arriving while the page is interactive.
 *
 * Everything is clamped: at most 8 MB, at most 200 ms per chunk, and at most
 * ~30 s of total delay, so a mistyped query cannot tie up a connection.
 */
function slowStream(url: URL): Response {
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

  const bytes = clamp(Number(url.searchParams.get("bytes")), 1024, 8 * 1024 * 1024, 262144);
  const chunk = clamp(Number(url.searchParams.get("chunk")), 256, 65536, 8192);
  const delayMs = clamp(Number(url.searchParams.get("delayMs")), 0, 200, 40);
  const chunks = Math.ceil(bytes / chunk);
  const totalDelay = chunks * delayMs;
  const pace = totalDelay > 30_000 ? Math.floor(30_000 / chunks) : delayMs;

  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (sent >= bytes) {
        controller.close();
        return;
      }
      const size = Math.min(chunk, bytes - sent);
      // Deterministic filler, so the bytes are real without being random.
      const piece = new Uint8Array(size);
      for (let index = 0; index < size; index++) piece[index] = (sent + index) & 0xff;
      sent += size;
      if (pace) await new Promise((resolve) => setTimeout(resolve, pace));
      controller.enqueue(piece);
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(bytes),
      "cache-control": "no-store",
    },
  });
}

export async function handlePublicRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  if (path === "/public/slow-stream") return slowStream(url);
  return path.startsWith("/public/") ? await readPublicAsset(path) : null;
}
