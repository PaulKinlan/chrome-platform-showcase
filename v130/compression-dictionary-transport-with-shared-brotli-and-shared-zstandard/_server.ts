// Co-located server handler for
// v130/compression-dictionary-transport-with-shared-brotli-and-shared-zstandard.

import { readBoundedText } from "../../lib/request-body.ts";
import {
  DEMO_BODY_LIMIT,
  jsonResponse,
  sha256Base64,
} from "../../lib/feature-servers/http-helpers.ts";

const CDT_MEASURE_ROUTE =
  "/compression-dictionary-transport-with-shared-brotli-and-shared-zstandard/cdt-shared/measure";
const CDT_MAX_MEASURE_BYTES = 64 * 1024;

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub !== CDT_MEASURE_ROUTE) return null;

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST dictionary and response text to measure compression." }, {
      status: 405,
    });
  }

  const rawMeasure = await readBoundedText(req, DEMO_BODY_LIMIT);
  if (!rawMeasure.ok) return rawMeasure.response;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawMeasure.text) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const dictionary = typeof body.dictionary === "string" ? body.dictionary : "";
  const response = typeof body.response === "string" ? body.response : "";
  const encoder = new TextEncoder();
  const dictionaryBytes = encoder.encode(dictionary);
  const responseBytes = encoder.encode(response);
  if (dictionaryBytes.byteLength + responseBytes.byteLength > CDT_MAX_MEASURE_BYTES) {
    return jsonResponse({
      error: "Keep the dictionary and response under 64 KiB for this live demo.",
    }, { status: 413 });
  }

  const actualHash = await sha256Base64(dictionaryBytes);
  const hasAdvertisedDictionary = typeof body.availableDictionary === "string" &&
    body.availableDictionary.length > 0;
  const advertisedHash = hasAdvertisedDictionary ? body.availableDictionary as string : "";
  const dictionaryMatches = hasAdvertisedDictionary && advertisedHash === actualHash;

  try {
    const { brotliCompressSync, constants, deflateRawSync, gzipSync } = await import("node:zlib");
    const brotliOptions = {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: 6,
      },
    };
    const rawBytes = responseBytes.byteLength;
    const gzipBytes = gzipSync(responseBytes).byteLength;
    const brotliBytes = brotliCompressSync(responseBytes, brotliOptions).byteLength;
    const deflateBytes = deflateRawSync(responseBytes).byteLength;
    const dictionaryDeflateBytes = deflateRawSync(responseBytes, {
      dictionary: dictionaryBytes,
    }).byteLength;
    const dcbHeaderBytes = 36;
    const dictionaryFramedBytes = dictionaryDeflateBytes + dcbHeaderBytes;
    const selectedEncoding = dictionaryMatches ? "dcb" : "br";
    const selectedBytes = dictionaryMatches ? dictionaryFramedBytes : brotliBytes;

    return jsonResponse({
      rawBytes,
      gzipBytes,
      brotliBytes,
      deflateBytes,
      dictionaryDeflateBytes,
      dcbHeaderBytes,
      dictionaryFramedBytes,
      selectedEncoding,
      selectedBytes,
      dictionaryMatches,
      hasAdvertisedDictionary,
      actualHash,
      advertisedHash,
      dictionaryId: "cart-v42",
      note: dictionaryMatches
        ? "The server accepted the advertised dictionary hash. The dcb byte count uses RFC 9842's 36-byte dcb header plus a real zlib dictionary-compressed payload as a local stand-in for Shared Brotli."
        : hasAdvertisedDictionary
        ? "The advertised hash did not match the dictionary bytes, so the server ignored dcb/dcz and fell back to regular Brotli."
        : "No Available-Dictionary hash was advertised, so the server used the regular Brotli fallback.",
    });
  } catch (err) {
    return jsonResponse({ error: `Compression route failed: ${(err as Error).message}` }, {
      status: 500,
    });
  }
}
