// Bounded request-body reads for public POST routes.
//
// Public endpoints read request bodies with an explicit byte cap. A declared
// content-length larger than the cap is rejected before a single body byte is
// read, and a streamed body is cancelled as soon as a chunk would take the
// running total over the cap, without that chunk being retained, so the bytes
// buffered for one request never exceed the cap. A single chunk the stream has
// already delivered can itself be larger than the cap; it is dropped here
// rather than appended. Over-limit requests get a 413 whose message names the
// byte limit.

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
  const declaredHeader = req.headers.get("content-length");
  if (declaredHeader !== null) {
    const declared = Number(declaredHeader);
    if (Number.isFinite(declared) && declared > limitBytes) {
      return { ok: false, response: payloadTooLargeResponse(limitBytes, message) };
    }
  }
  if (!req.body) return { ok: true, bytes: new Uint8Array(0) };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // Test the running total BEFORE retaining the chunk. Appending first (the
    // 21cf7695 order) put one over-limit chunk in the buffer on the way to
    // rejecting the request; the claim above is only literally true when the
    // chunk is dropped instead. A chunk the stream has already handed over can
    // itself exceed the cap - that is the one chunk the header comment allows -
    // and it is never appended here.
    const nextTotal = total + value.byteLength;
    if (nextTotal > limitBytes) {
      try {
        await reader.cancel();
      } catch {
        // The sender may already have gone away; the cap still holds.
      }
      return { ok: false, response: payloadTooLargeResponse(limitBytes, message) };
    }
    chunks.push(value);
    total = nextTotal;
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
