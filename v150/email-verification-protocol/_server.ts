// Co-located feature server for v150/email-verification-protocol:
// implements the Email Verification Protocol sample token issuer and JWT
// validator with a bounded fail-closed nonce replay cache.

import {
  base64UrlDecode,
  base64UrlEncode,
  DEMO_BODY_LIMIT,
  jsonResponse,
  toArrayBuffer,
} from "../../lib/feature-servers/http-helpers.ts";
import { readBoundedText } from "../../lib/request-body.ts";
import { BoundedSessionStore } from "../../lib/session-store.ts";

let evpKeyPairPromise: Promise<CryptoKeyPair> | null = null;

// Replay cache for the validator's nonces. The nonce is caller-supplied - the
// sample token echoes whatever `expectedNonce` the request sent, and
// `stringValue` puts no bound on its length - so the cache must not retain the
// raw value. It stores a fixed-size SHA-256 fingerprint instead: hashing rather
// than truncating or refusing keeps distinct nonces distinct at any length,
// which is exactly what replay rejection depends on.
//
// The TTL has to outlive the token it guards. A nonce becomes replayable only
// once its entry is gone, so a TTL shorter than the token lifetime would let a
// still-valid token be replayed after eviction; EVP_SAMPLE_TOKEN_TTL_SECONDS is
// the lifetime the sample issuer mints, and the test suite asserts this TTL
// exceeds it. With fingerprints the cache is bounded in time, in size (4096
// entries of 64 hex characters) and in per-entry cost.
//
// The same reasoning applies to the entry cap, which is why this store is not
// used the way the fixture session stores are. For those the cap is a memory
// bound and evicting the oldest entry only costs a client its session; here the
// cache is a deny-list, so an entry the cap evicted is a marker whose token is
// still live and the next validation of that nonce is trusted as a replay. An
// evicting cap therefore defeats replay rejection silently, and there is no
// bound on how recently the evicted nonce was seen. So the cap is a security
// bound too: `evpNonceReplayCacheIsFull` reports it and `verifyEvpJwt` fails
// *closed* when it is reached - with all 4096 slots holding unexpired markers it
// refuses the token rather than evicting a live marker to record it. Capacity
// recovers on its own as entries age out, the memory bound is unchanged, and
// scripts/evp-nonce-replay.test.mjs asserts that a nonce validated before the
// cap is still rejected after more than EVP_NONCE_REPLAY_MAX_ENTRIES newer ones.
export const EVP_SAMPLE_TOKEN_TTL_SECONDS = 300;
export const EVP_NONCE_REPLAY_TTL_MS = 15 * 60 * 1000;
export const EVP_NONCE_REPLAY_MAX_ENTRIES = 4096;
const evpUsedNonces = new BoundedSessionStore<true>({
  ttlMs: EVP_NONCE_REPLAY_TTL_MS,
  maxEntries: EVP_NONCE_REPLAY_MAX_ENTRIES,
});

// True when every slot holds a marker whose token may still be replayed, so one
// more marker cannot be recorded without evicting a live one. `size` drops
// expired entries before counting, so a full cache is one where nothing can go.
export function evpNonceReplayCacheIsFull(): boolean {
  return evpUsedNonces.size >= EVP_NONCE_REPLAY_MAX_ENTRIES;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

type RequestJson =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

async function requestJson(req: Request): Promise<RequestJson> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { ok: true, value: {} };
  }
  const text = await readBoundedText(req, DEMO_BODY_LIMIT);
  if (!text.ok) return text;
  try {
    return { ok: true, value: JSON.parse(text.text) as Record<string, unknown> };
  } catch {
    return { ok: true, value: {} };
  }
}

async function evpNonceFingerprint(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getEvpKeyPair(): Promise<CryptoKeyPair> {
  evpKeyPairPromise ??= crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  return evpKeyPairPromise;
}

async function signEvpJwt(payload: Record<string, unknown>): Promise<string> {
  const keyPair = await getEvpKeyPair();
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const header = {
    alg: "ES256",
    typ: "evp+jwt",
    kid: "showcase-evp-p256",
    jwk: {
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
      y: publicJwk.y,
    },
  };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyEvpJwt(
  token: string,
  expectedAud: string,
  expectedNonce: string,
): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  const checks: Array<Record<string, unknown>> = [];
  const now = Math.floor(Date.now() / 1000);
  let header: Record<string, unknown> = {};
  let payload: Record<string, unknown> = {};
  let signatureOk = false;

  if (parts.length !== 3) {
    return {
      valid: false,
      checks: [{
        title: "JWT structure is valid",
        detail: "Expected three base64url-encoded parts.",
        value: `parts = ${parts.length}`,
        pass: false,
      }],
    };
  }

  try {
    header = decodeBase64UrlJson(parts[0]);
    payload = decodeBase64UrlJson(parts[1]);
    checks.push({
      title: "JWT structure is valid",
      detail: "Token has 3 base64url-encoded parts.",
      value: `header.alg = "${header.alg ?? "missing"}"`,
      pass: true,
    });
  } catch (error) {
    return {
      valid: false,
      checks: [{
        title: "JWT structure is valid",
        detail: "Header or payload failed base64url JSON decoding.",
        value: String((error as Error).message),
        pass: false,
      }],
    };
  }

  try {
    const publicJwk = objectValue(header.jwk) as JsonWebKey;
    const key = await crypto.subtle.importKey(
      "jwk",
      publicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    signatureOk = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      toArrayBuffer(base64UrlDecode(parts[2])),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    signatureOk = false;
  }

  const nonceFingerprint = typeof payload.nonce === "string"
    ? await evpNonceFingerprint(payload.nonce)
    : null;

  checks.push(
    {
      title: "Signature verifies against provider JWK",
      detail:
        "Server imported the JWK from the JWT header and verified the ES256 signature over header.payload.",
      value: `signature = ${signatureOk ? "valid" : "invalid"}`,
      pass: signatureOk,
    },
    {
      title: "Issuer (iss) is present",
      detail: "The iss claim identifies the mail provider. Check against your provider allowlist.",
      value: `iss = "${payload.iss ?? "(missing)"}"`,
      pass: Boolean(payload.iss),
    },
    {
      title: "Audience (aud) matches your site",
      detail: `Expected: "${expectedAud}". Reject tokens issued to other origins.`,
      value: `aud = "${payload.aud ?? "(missing)"}"`,
      pass: payload.aud === expectedAud,
    },
    {
      title: "Token has not expired (exp)",
      detail: `exp must be greater than ${now}.`,
      value: typeof payload.exp === "number" ? `exp = ${payload.exp}` : "exp: missing",
      pass: typeof payload.exp === "number" && payload.exp > now,
    },
    {
      title: "Nonce matches session nonce",
      detail: `Expected nonce: "${expectedNonce}".`,
      value: `nonce = "${payload.nonce ?? "(missing)"}"`,
      pass: payload.nonce === expectedNonce,
    },
    {
      title: "Nonce has not been replayed",
      detail: "Server keeps a nonce replay cache and marks successful nonces as used.",
      value: `nonce = "${payload.nonce ?? "(missing)"}"`,
      pass: nonceFingerprint !== null && !evpUsedNonces.has(nonceFingerprint),
    },
    {
      title: "Email claim is present",
      detail: "The email address the mail provider vouches the user controls.",
      value: `email = "${payload.email ?? "(missing)"}"`,
      pass: typeof payload.email === "string" && payload.email.includes("@"),
    },
    {
      title: "email_verified is true",
      detail: "Must be the boolean true.",
      value: `email_verified = ${JSON.stringify(payload.email_verified ?? null)}`,
      pass: payload.email_verified === true,
    },
  );

  let valid = checks.every((check) => check.pass === true);
  if (valid && nonceFingerprint) {
    // Recording the marker is what makes the check above reject the next
    // presentation of this nonce. The cap never evicts a live marker to make
    // room (see the cache comment), so at capacity the token is refused instead.
    if (evpNonceReplayCacheIsFull()) {
      checks.push({
        title: "Replay cache can record this nonce",
        detail:
          "The replay cache is full of nonces whose tokens have not expired, and it does not evict a live marker - an evicted marker is a replay the validator would accept. The validator fails closed until entries expire, so this token is refused rather than trusted unrecorded.",
        value: `live markers = ${evpUsedNonces.size}/${EVP_NONCE_REPLAY_MAX_ENTRIES}`,
        pass: false,
      });
      valid = false;
    } else {
      evpUsedNonces.set(nonceFingerprint, true);
    }
  }
  return { valid, checks, header, payload };
}

async function renderEmailVerificationRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix = "/email-verification-protocol/server-validator/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);

  if (route === "/sample" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const aud = stringValue(body.expectedAud, "https://myapp.example.com");
    const nonce = stringValue(body.expectedNonce, "nonce-abc123");
    const email = stringValue(body.email, "alice@example-provider.com");
    const now = Math.floor(Date.now() / 1000);
    const token = await signEvpJwt({
      iss: "https://mail.example-provider.com",
      aud,
      exp: now + EVP_SAMPLE_TOKEN_TTL_SECONDS,
      iat: now - 10,
      email,
      email_verified: true,
      nonce,
      sub: email,
    });
    evpUsedNonces.delete(await evpNonceFingerprint(nonce));
    return jsonResponse({ token });
  }

  if (route === "/validate" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    return jsonResponse(
      await verifyEvpJwt(
        stringValue(body.token),
        stringValue(body.expectedAud, "https://myapp.example.com"),
        stringValue(body.expectedNonce, "nonce-abc123"),
      ),
    );
  }

  return null;
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  return await renderEmailVerificationRoute(req, sub);
}
