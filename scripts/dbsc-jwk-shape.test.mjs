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
// Added in bead dty.3: the fifth case pins the storage projection's field set
// directly (extra and private JWK fields cannot survive it), because the heap case
// is the only other guard and it cannot see a small-field leak. Same file, task,
// flags and gate step — no task/permission/plan change.
//
// Run: deno task test-dbsc-jwk-shape   (needs --v8-flags=--expose-gc)

import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";
import { P256_PUBLIC_JWK_FIELDS, p256PublicJwkForStorage } from "../lib/jwk.ts";

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

// The storage projection contract, asserted directly rather than through a
// response. The DBSC register handler stores
// `p256PublicJwkForStorage(verified.publicKeyJwk)` (routes/release-endpoints.ts
// :2862-2863), so this pins the helper that call site depends on — the field set
// comes from the module's own P256_PUBLIC_JWK_FIELDS so the assertion cannot drift
// from the contract. What this case deliberately does NOT claim: it does not read
// the stored session record (dbscSessions is module-private, with no test seam, and
// the DBSC state echo exposes only `registered: Boolean(...)`, `registeredAt` and
// `events`), so a call-site bypass is covered by the heap case, not by this one.
Deno.test("ok — the storage projection keeps only the contracted public JWK fields", () => {
  // A caller-supplied key as it can arrive in a proof header: the private scalar, a
  // large padded extra, the WebCrypto bookkeeping fields, and a nested object.
  const source = {
    kty: "EC",
    crv: "P-256",
    x: "AAAA",
    y: "BBBB",
    d: "PRIVATE-KEY-MATERIAL",
    junk: "J".repeat(1024),
    kid: "caller-supplied",
    alg: "ES256",
    use: "sig",
    ext: true,
    key_ops: ["verify"],
    nested: { deep: [1, 2] },
  };
  const projected = p256PublicJwkForStorage(source);
  assert(
    JSON.stringify(Object.keys(projected).sort()) ===
      JSON.stringify([...P256_PUBLIC_JWK_FIELDS].sort()),
    `only the contracted fields may survive, got ${JSON.stringify(Object.keys(projected))}`,
  );
  // Own-property negatives, by name. `Object.hasOwn` rather than `in`, which is true
  // for anything inherited from Object.prototype; and not a JSON round-trip, which
  // collapses undefined-valued keys.
  for (const field of ["d", "junk", "kid", "alg", "use", "ext", "key_ops", "nested"]) {
    assert(
      !Object.hasOwn(projected, field),
      `the storage projection must not keep an own property named ${field}`,
    );
  }
  assert(projected !== source, "the projection must hand back a new object, not the caller's");
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
