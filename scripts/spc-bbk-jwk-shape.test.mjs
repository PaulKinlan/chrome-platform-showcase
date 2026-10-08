// Retained-JWK shape guard for the SPC browser-bound-key fixture
// (bead chrome_platform_showcase-9v7, from the 4cx review).
//
// The fixture stores the passkey and browser-bound public JWKs on the enrollment
// and keeps using them for signature verification. WebCrypto's importKey ignores
// properties it does not need, so before this change a body could attach
// arbitrary extras to either JWK and have them retained, unread, for the
// enrollment's lifetime — inside the same 1 MiB request ceiling that 4cx bounded
// deviceName against.
//
// This suite checks the shape that is actually stored, that the stored key still
// imports and verifies (so the projection does not break the crypto fixture), the
// full enroll -> challenge -> verify payment flow with oversized extras attached,
// a rotation, and the retained heap cost measured with a real GC.
//
// Run: deno task test-spc-bbk-jwk-shape   (needs --v8-flags=--expose-gc)

import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";
import { p256PublicJwkForStorage } from "../lib/jwk.ts";

const PREFIX = "secure-payment-confirmation-browser-bound-keys";
// Per-JWK padding. Two of these plus the JWKs and the JSON envelope must stay
// under the 1 MiB DEMO_BODY_LIMIT, so the ceiling - not the shape - is what a
// bigger number would be measuring.
const OVERSIZED_JWK_CHARS = 384 * 1024;
const ENROLL_SUB = `/${PREFIX}/enroll`;
const CHALLENGE_SUB = `/${PREFIX}/challenge`;
const VERIFY_SUB = `/${PREFIX}/verify`;
const ROTATE_SUB = `/${PREFIX}/rotate`;

const noAsset = async () => null;

const failures = [];
const sections = [];
function section(label, fn) {
  sections.push({ label, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ── helpers ─────────────────────────────────────────────────────────────────

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

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(privateKey, payload) {
  return toBase64Url(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(payload),
    ),
  );
}

async function post(sub, body) {
  const req = new Request(`http://localhost:3000/v145${sub}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await handleLegacyReleaseEndpoints(req, "v145", sub, noAsset);
  assert(res, `${sub} should be handled by the release router`);
  return { res, body: await res.json() };
}

// The fixture hashes exactly these four fields (spcBbkJwkThumbprint).
function expectedThumbprint(jwk) {
  return toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }),
    ),
  ).slice(0, 18);
}

// A Chrome-shaped exported public JWK with the extras a caller can attach.
async function publicJwkWithExtras(extraChars = 0) {
  const { publicJwk } = await p256Pair();
  const jwk = { ...publicJwk };
  if (extraChars > 0) jwk.junk = "X".repeat(extraChars);
  return jwk;
}

// ── sections ────────────────────────────────────────────────────────────────

section("the projection keeps exactly the fields the fixture consumes", () => {
  const source = {
    kty: "EC",
    crv: "P-256",
    x: "AAAA",
    y: "BBBB",
    ext: true,
    key_ops: ["verify"],
    kid: "caller-supplied",
    alg: "ES256",
    use: "sig",
    junk: "Z".repeat(1024),
  };
  const projected = p256PublicJwkForStorage(source);
  assert(
    JSON.stringify(Object.keys(projected).sort()) === JSON.stringify(["crv", "kty", "x", "y"]),
    `only kty/crv/x/y should survive, got ${JSON.stringify(Object.keys(projected))}`,
  );
  assert(
    projected.kty === "EC" && projected.crv === "P-256" && projected.x === "AAAA" &&
      projected.y === "BBBB",
    "the consumed fields must keep their values",
  );
});

section("a projected key still imports and verifies signatures", async () => {
  const { publicJwk, privateKey } = await p256Pair();
  const projected = p256PublicJwkForStorage(
    { ...publicJwk, ext: true, key_ops: ["verify"], junk: "ignored" },
  );
  // Same import the fixture performs, so a projection that dropped something
  // WebCrypto needs would fail here.
  const key = await crypto.subtle.importKey(
    "jwk",
    projected,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const payload = "payment payload";
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(payload),
  );
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signature,
    new TextEncoder().encode(payload),
  );
  assert(verified, "a projected public key must still verify its signatures");
});

section("oversized JWK extras do not break the enroll -> challenge -> verify flow", async () => {
  const passkey = await p256Pair();
  const browserBound = await p256Pair();
  const extras = OVERSIZED_JWK_CHARS;

  const { res, body: enrolled } = await post(ENROLL_SUB, {
    deviceName: "Oversized extras",
    passkeyPublicJwk: { ...passkey.publicJwk, junk: "P".repeat(extras) },
    browserBoundPublicJwk: { ...browserBound.publicJwk, junk: "B".repeat(extras) },
  });
  assert(res.status === 200, `enrolling with extras should succeed, got ${res.status}`);

  const { body: challenge } = await post(CHALLENGE_SUB, { enrollmentId: enrolled.enrollmentId });
  assert(typeof challenge.payload === "string" && challenge.payload, "a payload is issued");

  const { res: verifyRes, body: verified } = await post(VERIFY_SUB, {
    enrollmentId: enrolled.enrollmentId,
    payload: challenge.payload,
    passkeySignature: await sign(passkey.privateKey, challenge.payload),
    browserBoundSignature: await sign(browserBound.privateKey, challenge.payload),
  });
  assert(
    verifyRes.status === 200 && verified.accepted === true,
    `the stored keys must still verify (accepted=${verified.accepted}, error=${verified.error})`,
  );
  assert(
    verified.expectedBrowserBoundThumbprint === expectedThumbprint(browserBound.publicJwk),
    "the thumbprint must be unchanged by the projection",
  );
});

section("a rotation stores only the consumed fields", async () => {
  const passkey = await p256Pair();
  const oldBound = await p256Pair();
  const newBound = await p256Pair();

  const { body: enrolled } = await post(ENROLL_SUB, {
    deviceName: "Rotation with extras",
    passkeyPublicJwk: passkey.publicJwk,
    browserBoundPublicJwk: oldBound.publicJwk,
  });

  const proofPayload = "rotate-proof";
  const { res, body: rotated } = await post(ROTATE_SUB, {
    enrollmentId: enrolled.enrollmentId,
    payload: proofPayload,
    oldBrowserBoundSignature: await sign(oldBound.privateKey, proofPayload),
    newBrowserBoundPublicJwk: {
      ...newBound.publicJwk,
      junk: "N".repeat(OVERSIZED_JWK_CHARS),
      kid: "x",
    },
  });
  assert(res.status === 200, `rotation should succeed, got ${res.status}`);
  assert(
    rotated.message === "Browser-bound key rotated.",
    `rotation should be recorded, got ${JSON.stringify(rotated.message)}`,
  );
  assert(
    rotated.browserBoundThumbprint === expectedThumbprint(newBound.publicJwk),
    "the rotated thumbprint must match the new key's consumed fields",
  );

  // The rotated key must be the one that verifies from now on.
  const { body: challenge } = await post(CHALLENGE_SUB, { enrollmentId: enrolled.enrollmentId });
  const { body: verified } = await post(VERIFY_SUB, {
    enrollmentId: enrolled.enrollmentId,
    payload: challenge.payload,
    passkeySignature: await sign(passkey.privateKey, challenge.payload),
    browserBoundSignature: await sign(newBound.privateKey, challenge.payload),
  });
  assert(verified.accepted === true, "the rotated browser-bound key must verify");
});

section("the extras are not retained across a full store", async () => {
  assert(
    typeof globalThis.gc === "function",
    "this section measures retained heap and needs a real GC: run deno task test-spc-bbk-jwk-shape",
  );
  const SAMPLES = 24;
  const extras = OVERSIZED_JWK_CHARS; // per JWK, so ~0.75 MiB per enrollment offered
  const offered = (SAMPLES * extras * 2) / (1024 * 1024);

  globalThis.gc();
  const before = Deno.memoryUsage().heapUsed;
  for (let i = 0; i < SAMPLES; i++) {
    const passkey = await p256Pair();
    const browserBound = await p256Pair();
    const { res } = await post(ENROLL_SUB, {
      deviceName: `budget-${i}`,
      passkeyPublicJwk: { ...passkey.publicJwk, junk: "P".repeat(extras) },
      browserBoundPublicJwk: { ...browserBound.publicJwk, junk: "B".repeat(extras) },
    });
    assert(res.status === 200, `enrollment ${i} should succeed`);
  }
  globalThis.gc();
  const after = Deno.memoryUsage().heapUsed;
  const retainedMiB = (after - before) / (1024 * 1024);
  // The offers total ~18 MiB of padding; a shape that retains it cannot come
  // close to this ceiling, and a shape that drops it stays far below it.
  assert(
    retainedMiB < 8,
    `${SAMPLES} enrollments offering ${offered} MiB of JWK padding retained ${
      retainedMiB.toFixed(1)
    } MiB of heap`,
  );
  console.log(
    `     (offered ${offered} MiB of padding; retained ${retainedMiB.toFixed(1)} MiB of heap)`,
  );
});

// ── runner ──────────────────────────────────────────────────────────────────

for (const { label, fn } of sections) {
  try {
    await fn();
    console.log(`ok   ${label}`);
  } catch (err) {
    failures.push({ label, err });
    console.log(`FAIL ${label}: ${err?.message ?? err}`);
  }
}

if (failures.length > 0) {
  console.error(`\nspc-bbk jwk-shape tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nspc-bbk jwk-shape tests: all sections passed");
