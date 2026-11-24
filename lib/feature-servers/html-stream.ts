// Shared server helper for the `renewed-html-insertion-streaming-methods`
// `/html-stream` endpoint across milestones (v151, v152).

function renderV151HtmlStream(req: Request): Response {
  const url = new URL(req.url);
  const chunks = Math.min(Math.max(Number(url.searchParams.get("chunks") ?? 6), 1), 12);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 180), 0), 1200);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<article class="stream-item"><h3>stream started</h3>`));
      for (let i = 1; i <= chunks; i++) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        controller.enqueue(
          encoder.encode(
            `<p><strong>Chunk ${i}</strong> arrived after ${delay}ms and can be parsed without buffering the full response.</p>`,
          ),
        );
      }
      controller.enqueue(encoder.encode(`<p><strong>complete</strong></p></article>`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

export function handleHtmlStreamRequest(
  req: Request,
  sub: string,
): Response | null {
  if (sub !== "/renewed-html-insertion-streaming-methods/html-stream") return null;
  return renderV151HtmlStream(req);
}
