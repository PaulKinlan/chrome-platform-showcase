// Bounded request-body reads for public POST routes.
//
// Public endpoints read request bodies with an explicit byte cap. A declared
// content-length larger than the cap is rejected before a single body byte is
// read, and a streamed body is cancelled as soon as the cap is exceeded, so a
// request can never make the server buffer more than the cap's worth of body
// bytes. Over-limit requests get a 413 whose message names the byte limit.

export interface BoundedBodyOk {
  ok: true;
  bytes: Uint8Array;
}

export interface BoundedBodyRejected {
  ok: false;
  response: Response;
}

export type BoundedBody = BoundedBodyOk | BoundedBodyRejected;

export interface BoundedTextOk {
  ok: true;
  text: string;
}

export interface BoundedTextRejected {
  ok: false;
  response: Response;
}

export type BoundedText = BoundedTextOk | BoundedTextRejected;

export function payloadTooLargeResponse(limitBytes: number, message?: string): Response {
  return new Response(
    JSON.stringify(
      { error: message ?? `Request body exceeds the ${limitBytes} byte limit.` },
      null,
      2,
    ),
    {
      status: 413,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export async function readBoundedBody(
  req: Request,
  limitBytes: number,
  message?: string,
): Promise<BoundedBody> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limitBytes) {
    return { ok: false, response: payloadTooLargeResponse(limitBytes, message) };
  }
  if (!req.body) return { ok: true, bytes: new Uint8Array(0) };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
    if (total > limitBytes) {
      try {
        await reader.cancel();
      } catch {
        // The sender may already have gone away; the cap still holds.
      }
      return { ok: false, response: payloadTooLargeResponse(limitBytes, message) };
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

export async function readBoundedText(
  req: Request,
  limitBytes: number,
  message?: string,
): Promise<BoundedText> {
  const body = await readBoundedBody(req, limitBytes, message);
  if (!body.ok) return body;
  return { ok: true, text: new TextDecoder().decode(body.bytes) };
}
