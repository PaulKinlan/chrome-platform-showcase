// Retained-JWK shape guard for the DBSC fixture
// (bead chrome_platform_showcase-cf3, from the 9v7 review).
//
// The DBSC /register handler takes the public key straight out of the proof
// JWT's header:
//
//   const publicKeyJwk = (header.jwk as JsonWebKey | undefined) ?? jwk ?? undefined;   (:2610)
//   session.publicKeyJwk = verified.publicKeyJwk ?? null;                              (:2746)
//
// WebCrypto's importKey ignores every property it does not need, so a caller can
// pad the header JWK and have that padding retained, unread, for the session's
// whole lifetime — and this store's TTL is the 30-day DBSC_LONG_COOKIE_MAX_AGE,
// not the six hours the SPC BBK fixture uses.
//
// The suite drives the real route handlers (no server): it forges the ES256
// registration proof the browser would send, checks the padded registration is
// accepted, proves the STORED key still verifies a refresh proof (so a
// projection cannot break the crypto), and measures the retained heap.
//
// Migrated in place to named Deno.test cases (Stage 4 of the dty proposal, bead
// dty.4): same file path, same task id `test-dbsc-jwk-shape`, same ordered gate
// step, same four subjects and the same assertions — the custom `section()`
// registry and its trailing loop are gone, so a failure names the behaviour and the
// legacy `Deno.exit(1)` branch is no longer needed (Deno's runner owns the exit
// code). The task runs through scripts/native-test.mjs, which passes the child
// exactly the legacy flags (`--allow-read --v8-flags=--expose-gc`) and runs this
// single file alone (`--serial`), so the runner-wide GC flag can never reach another
// suite and the heap delta is measured in a process with nothing else in it.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — dbsc jwk-shape tests` /
// `FAIL — dbsc jwk-shape tests (1 file(s) failed)` — a neutral label, truthfully
// prefixed in both directions. The old text `all sections passed` is gone; a
// read-only audit found no consumer of it.
//
// Run: deno task test-dbsc-jwk-shape   (needs --v8-flags=--expose-gc)

import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";

const PREFIX = "/device-bound-session-credentials";
const RELEASE = "v147";
const LONG_COOKIE = "showcase_dbsc";
const NO_ASSET = async () => null;

// Padding per JWK. Base64url of the JWT inflates this by ~4/3, so the whole
// request body has to stay under the 1 MiB DEMO_BODY_LIMIT: 512 KiB of padding
// becomes ~683 KiB of proof. A larger number would measure the body ceiling
// rather than the retention shape.
const PADDING_CHARS = 512 * 1024;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlJson(value) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function p256Pair() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  return {
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKey: pair.privateKey,
  };
}

// The ES256 proof the browser sends: header.payload signed with the bound key.
async function proofJwt(privateKey, { jwk, jti }) {
  const header = { alg: "ES256", typ: "dbsc+jwt" };
  if (jwk) header.jwk = jwk;
  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson({ jti });
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  return `${encodedHeader}.${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

async function call(sub, { body, cookie } = {}) {
  const headers = {};
  if (body) headers["content-type"] = "application/json";
  if (cookie) headers.cookie = cookie;
  const req = new Request(`http://localhost:3000/${RELEASE}${sub}`, {
    method: "POST",
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const res = await handleLegacyReleaseEndpoints(req, RELEASE, sub, NO_ASSET);
  assert(res, `${sub} should be handled by the release router`);
  return { res, body: await res.json().catch(() => ({})) };
}

async function login() {
  const { res, body } = await call(`${PREFIX}/login`);
  assert(res.status === 200, `login should succeed, got ${res.status}`);
  const id = (res.headers.get("set-cookie") ?? "").match(/showcase_dbsc=([^;]+)/)?.[1];
  assert(id, "login must set the long-lived DBSC cookie");
  return { id, challenge: body.challenge };
}

// Registers, then proves ownership through the refresh flow using a proof with
// NO header jwk — which forces verifyDbscJwt to use the STORED key.
async function registerAndVerifyStoredKey({ paddingChars = 0 } = {}) {
  const { id, challenge } = await login();
  const { publicJwk, privateKey } = await p256Pair();
  const jwk = paddingChars > 0 ? { ...publicJwk, junk: "D".repeat(paddingChars) } : publicJwk;

  const registered = await call(`${PREFIX}/register`, {
    cookie: `${LONG_COOKIE}=${id}`,
    body: { proof: await proofJwt(privateKey, { jwk, jti: challenge }) },
  });
  assert(
    registered.res.status === 200 && registered.body.registered === true,
    `registration should succeed, got ${registered.res.status} ${
      JSON.stringify(registered.body.error ?? "")
    }`,
  );

  // Ask for a refresh challenge, then prove with the stored key.
  const asked = await call(`${PREFIX}/refresh`, { cookie: `${LONG_COOKIE}=${id}` });
  assert(
    typeof asked.body.challenge === "string" && asked.body.challenge,
    `a refresh challenge should be issued, got ${asked.res.status}`,
  );
  const refreshed = await call(`${PREFIX}/refresh`, {
    cookie: `${LONG_COOKIE}=${id}`,
    body: { proof: await proofJwt(privateKey, { jti: asked.body.challenge }) },
  });
  return refreshed;
}

// ── cases ────────────────────────────────────────────────────────────────

Deno.test("ok — an ordinary registration is accepted and its stored key verifies", async () => {
  const refreshed = await registerAndVerifyStoredKey();
  assert(
    refreshed.res.status === 200 && refreshed.body.proofVerified === true,
    `a stored key must verify a refresh proof (status ${refreshed.res.status})`,
  );
});

Deno.test("ok — a registration with a padded header JWK is accepted", async () => {
  const { id, challenge } = await login();
  const { publicJwk, privateKey } = await p256Pair();
  const { res, body } = await call(`${PREFIX}/register`, {
    cookie: `${LONG_COOKIE}=${id}`,
    body: {
      proof: await proofJwt(privateKey, {
        jwk: { ...publicJwk, junk: "D".repeat(PADDING_CHARS) },
        jti: challenge,
      }),
    },
  });
  assert(
    res.status === 200,
    `a padded header JWK should not block registration, got ${res.status}`,
  );
  assert(body.registered === true, "the padded registration should be recorded");
});

Deno.test("ok — a padded registration still verifies through its stored key", async () => {
  const refreshed = await registerAndVerifyStoredKey({ paddingChars: PADDING_CHARS });
  assert(
    refreshed.res.status === 200 && refreshed.body.proofVerified === true,
    `the stored key of a padded registration must verify (status ${refreshed.res.status})`,
  );
});

Deno.test("ok — the JWK padding is not retained across many registrations", async () => {
  assert(
    typeof globalThis.gc === "function",
    "this section measures retained heap and needs a real GC: run deno task test-dbsc-jwk-shape",
  );
  const SAMPLES = 16;
  const offered = (SAMPLES * PADDING_CHARS) / (1024 * 1024);

  globalThis.gc();
  const before = Deno.memoryUsage().heapUsed;
  for (let i = 0; i < SAMPLES; i++) {
    const { id, challenge } = await login();
    const { publicJwk, privateKey } = await p256Pair();
    const { res } = await call(`${PREFIX}/register`, {
      cookie: `${LONG_COOKIE}=${id}`,
      body: {
        proof: await proofJwt(privateKey, {
          jwk: { ...publicJwk, junk: "D".repeat(PADDING_CHARS) },
          jti: challenge,
        }),
      },
    });
    assert(res.status === 200, `registration ${i} should succeed, got ${res.status}`);
  }
  globalThis.gc();
  const retainedMiB = (Deno.memoryUsage().heapUsed - before) / (1024 * 1024);

  // The offers total 8 MiB of padding; the 512-entry cap and the TTL do not
  // shrink a single session's retention, so anything near the offer means the
  // padding is being kept.
  assert(
    retainedMiB < 3,
    `${SAMPLES} registrations offering ${offered} MiB of JWK padding retained ${
      retainedMiB.toFixed(1)
    } MiB of heap`,
  );
  console.log(
    `     (offered ${offered} MiB of padding; retained ${retainedMiB.toFixed(1)} MiB of heap)`,
  );
});
