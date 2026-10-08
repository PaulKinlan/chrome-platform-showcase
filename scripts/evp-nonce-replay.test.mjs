// Replay-cache bounds for the Email Verification Protocol validator
// (bead chrome_platform_showcase-69j, from the 1e5 review).
//
// `evpUsedNonces` was an unbounded Set that retained the raw nonce. The nonce is
// caller-supplied — /sample echoes `expectedNonce` into the token it signs, and
// `stringValue` puts no bound on that string — so a client could grow the cache
// with arbitrarily long, never-expiring entries simply by asking for a sample
// and validating it.
//
// The cache now stores a fixed-size SHA-256 fingerprint in a bounded store, with
// a TTL that has to outlive the token it guards (a nonce may only become
// replayable once its token is expired and therefore rejected on `exp`). This
// suite keeps both halves honest: replay rejection still works, distinct nonces
// stay distinct at any length, the retained memory is bounded, and the TTL
// invariant holds.
//
// Run: deno task test-evp-nonce-replay   (needs --v8-flags=--expose-gc)

import {
  EVP_NONCE_REPLAY_MAX_ENTRIES,
  EVP_NONCE_REPLAY_TTL_MS,
  EVP_SAMPLE_TOKEN_TTL_SECONDS,
  handleLegacyReleaseEndpoints,
} from "../routes/release-endpoints.ts";

const RELEASE = "v150";
const PREFIX = "/email-verification-protocol/server-validator/api";
const NO_ASSET = async () => null;

// Nonce length chosen so the retained size dominates cache bookkeeping rather
// than the other way round: at 64 KiB per nonce the pre-fix cache retained
// 13.1 MiB against a 12.5 MiB offer, while fingerprints retain 0.6 MiB. Well
// under the 1 MiB DEMO_BODY_LIMIT (the sample request carries it twice).
const LONG_NONCE_CHARS = 64 * 1024;
const WARMUP_SAMPLES = 20;
const LONG_SAMPLES = 200;

const failures = [];
const sections = [];
function section(label, fn) {
  sections.push({ label, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function post(path, body) {
  const req = new Request(`http://localhost:3000/${RELEASE}${PREFIX}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await handleLegacyReleaseEndpoints(req, RELEASE, `${PREFIX}${path}`, NO_ASSET);
  assert(res, `${path} should be handled by the release router`);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

function replayCheck(result) {
  return (result.checks ?? []).find((check) => check.title === "Nonce has not been replayed");
}

async function sample(nonce, aud = "https://myapp.example.com") {
  const { body } = await post("/sample", { expectedAud: aud, expectedNonce: nonce });
  assert(typeof body.token === "string" && body.token, "the sample issuer must return a token");
  return body.token;
}

async function validate(token, nonce, aud = "https://myapp.example.com") {
  const { body } = await post("/validate", { token, expectedAud: aud, expectedNonce: nonce });
  return body;
}

// ── sections ────────────────────────────────────────────────────────────────

section("a validated nonce is rejected when it is replayed", async () => {
  const nonce = `replay-${crypto.randomUUID()}`;
  const token = await sample(nonce);

  const first = await validate(token, nonce);
  assert(
    first.valid === true,
    `the first validation should succeed: ${JSON.stringify(replayCheck(first)?.pass)}`,
  );
  assert(replayCheck(first)?.pass === true, "the first validation should not look like a replay");

  const second = await validate(token, nonce);
  assert(second.valid === false, "the second validation of the same nonce must not be valid");
  assert(
    replayCheck(second)?.pass === false,
    "the second validation must fail the replay check specifically",
  );
});

section("replay rejection survives an arbitrarily long nonce", async () => {
  const nonce = "L".repeat(LONG_NONCE_CHARS);
  const token = await sample(nonce);
  assert((await validate(token, nonce)).valid === true, "a long nonce should validate once");
  assert(
    (await validate(token, nonce)).valid === false,
    "a long nonce must be rejected on replay — hashing must not lose the entry",
  );
});

section("two long nonces sharing a prefix are still distinct", async () => {
  // Guards the choice of fingerprinting over truncation: a truncated key would
  // collide here and reject a nonce that was never seen.
  const base = "P".repeat(LONG_NONCE_CHARS);
  const first = `${base}-one`;
  const second = `${base}-two`;
  const firstToken = await sample(first);
  assert(
    (await validate(firstToken, first)).valid === true,
    "the first of the pair should validate",
  );

  const secondToken = await sample(second);
  assert(
    (await validate(secondToken, second)).valid === true,
    "a second nonce sharing a 4 KiB prefix must not be treated as a replay (fingerprint collision)",
  );
});

section("the sample endpoint re-arms a nonce for a deliberate re-run", async () => {
  // The mock mail provider's "send the email again" action: /sample clears the
  // marker for the nonce it mints. That is the fixture's existing behaviour and
  // is deliberately unchanged here - replay rejection still applies to a token
  // that has already been validated (the section above), it is just re-armed by
  // asking for a fresh sample.
  const nonce = `rearm-${crypto.randomUUID()}`;
  const token = await sample(nonce);
  assert((await validate(token, nonce)).valid === true, "the first run should validate");
  assert(
    (await validate(token, nonce)).valid === false,
    "the same token must still be rejected as a replay",
  );
  assert(
    (await validate(await sample(nonce), nonce)).valid === true,
    "a fresh sample must re-arm the nonce so the demo can be replayed deliberately",
  );
});

section("the replay TTL outlives the token it guards", () => {
  // The executable form of "bounding must not weaken replay rejection": an entry
  // may only disappear after any token carrying that nonce has expired anyway.
  assert(
    EVP_NONCE_REPLAY_TTL_MS >= EVP_SAMPLE_TOKEN_TTL_SECONDS * 1000,
    `replay TTL ${EVP_NONCE_REPLAY_TTL_MS}ms must cover the ${EVP_SAMPLE_TOKEN_TTL_SECONDS}s token lifetime`,
  );
  assert(
    EVP_NONCE_REPLAY_MAX_ENTRIES > 0,
    "the replay cache must carry an explicit entry bound",
  );
});

section("retained nonce memory stays bounded", async () => {
  assert(
    typeof globalThis.gc === "function",
    "this section measures retained heap and needs a real GC: run deno task test-evp-nonce-replay",
  );
  const offered = (LONG_SAMPLES * LONG_NONCE_CHARS) / (1024 * 1024);

  async function batch(count, offset) {
    for (let i = 0; i < count; i++) {
      const nonce = `${offset + i}${"N".repeat(LONG_NONCE_CHARS)}`;
      const result = await validate(await sample(nonce), nonce);
      assert(result.valid === true, `sample ${offset + i} should validate`);
    }
  }

  // Warm up first. Signing and verifying 200 tokens would otherwise charge JIT
  // code and crypto buffer pools to the measurement: before this warmup was
  // added, a 1000-sample run of the same section reported 1.3 MiB of noise as
  // "retained", against a 0.6 MiB reading with it.
  await batch(WARMUP_SAMPLES, 0);
  globalThis.gc();
  const before = Deno.memoryUsage().heapUsed;
  await batch(LONG_SAMPLES, WARMUP_SAMPLES);
  globalThis.gc();
  const retainedMiB = (Deno.memoryUsage().heapUsed - before) / (1024 * 1024);

  // Measured on this suite: 13.1 MiB retained at the pre-fix commit (204eb184),
  // 0.6 MiB after the change, repeatably. A 4 MiB line sits well clear of both.
  assert(
    retainedMiB < 4,
    `${LONG_SAMPLES} validated ${LONG_NONCE_CHARS}-character nonces (${
      offered.toFixed(1)
    } MiB offered) retained ${retainedMiB.toFixed(1)} MiB of heap`,
  );
  console.log(
    `     (offered ${offered.toFixed(1)} MiB of nonce text; retained ${
      retainedMiB.toFixed(2)
    } MiB)`,
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
  console.error(`\nevp nonce replay tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nevp nonce replay tests: all sections passed");
