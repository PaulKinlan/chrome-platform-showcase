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
// stay distinct at any length, the retained memory is bounded, the TTL invariant
// holds, and the entry cap refuses a new marker rather than evicting a live one
// (chrome_platform_showcase-lri, where an evicting cap let a still-valid token
// be replayed once 4096 newer nonces had filled the cache).
//
// Run: deno task test-evp-nonce-replay   (needs --v8-flags=--expose-gc)
//
// Migrated in place to named Deno.test cases (Stage 12 of the dty proposal, bead
// dty.14): same file path, same task id `test-evp-nonce-replay`, the same ordered
// gate step 15, the same seven subjects and the same assertions — the custom
// `section()` registry, its trailing loop and the legacy `Deno.exit(1)` branch are
// gone, so a failure names the case it broke and Deno's runner owns the exit code.
//
// ORDER IS LOAD-BEARING in one direction only, and it is why this file must run
// alone: the memory case ("retained nonce memory stays bounded") asserts that EVERY
// one of its samples validates, and the last case saturates the module-level replay
// cache on purpose, so any later sample would be refused. The memory case therefore
// has to come first and the saturating case has to stay LAST. Deno.test runs the
// tests of one file serially in declaration order and scripts/native-test.mjs runs
// exactly one file per process, so the ordering holds; do not add per-test
// concurrency, do not batch this file with `--dir`, and do not run it with
// --parallel.
//
// The child needs NO permission (the imported modules are imported, not read), so
// the task forwards ONLY `--v8-flags=--expose-gc` — measured, not assumed: the whole
// seven-case suite passes on the native runner with the flag alone, which is what
// justified dropping the `--allow-read` the old direct-run task carried. The flag is
// what the memory case needs to measure anything at all, it stays confined to this
// one file by the task's `--serial evp-nonce-replay.test.mjs` and by one process per
// file, and it is never set repository-wide. Without the flag that case fails loudly
// by name rather than passing vacuously.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — evp nonce replay tests` /
// `FAIL — evp nonce replay tests (1 file(s) failed)` - a neutral label, truthfully
// prefixed in both directions. A per-suite audit found no consumer of the old text.

import {
  EVP_NONCE_REPLAY_MAX_ENTRIES,
  EVP_NONCE_REPLAY_TTL_MS,
  EVP_SAMPLE_TOKEN_TTL_SECONDS,
  evpNonceReplayCacheIsFull,
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

Deno.test("a validated nonce is rejected when it is replayed", async () => {
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

Deno.test("replay rejection survives an arbitrarily long nonce", async () => {
  const nonce = "L".repeat(LONG_NONCE_CHARS);
  const token = await sample(nonce);
  assert((await validate(token, nonce)).valid === true, "a long nonce should validate once");
  assert(
    (await validate(token, nonce)).valid === false,
    "a long nonce must be rejected on replay — hashing must not lose the entry",
  );
});

Deno.test("two long nonces sharing a prefix are still distinct", async () => {
  // Guards the choice of fingerprinting over truncation: a truncated key would
  // collide here and reject a nonce that was never seen.
  //
  // BOTH tokens are minted before either is validated. /sample re-arms the marker
  // for the nonce it mints (the case below), so sampling `second` after validating
  // `first` would clear a key the two could be sharing and hide exactly the
  // collision this case exists to catch.
  const base = "P".repeat(LONG_NONCE_CHARS);
  const first = `${base}-one`;
  const second = `${base}-two`;
  const firstToken = await sample(first);
  const secondToken = await sample(second);

  assert(
    (await validate(firstToken, first)).valid === true,
    "the first of the pair should validate",
  );
  assert(
    (await validate(secondToken, second)).valid === true,
    "a second nonce sharing a 64 KiB prefix must not be treated as a replay (fingerprint collision)",
  );

  // Both nonces were genuinely recorded, so each replay has to be rejected now.
  // This is the half that fails when nothing is retained at all - a cache that
  // refuses an over-long key would otherwise be accepted here.
  assert(
    (await validate(firstToken, first)).valid === false,
    "the first of the pair must be rejected on replay",
  );
  assert(
    (await validate(secondToken, second)).valid === false,
    "the second of the pair must be rejected on replay too, not merely accepted once",
  );
});

Deno.test("the sample endpoint re-arms a nonce for a deliberate re-run", async () => {
  // The mock mail provider's "send the email again" action: /sample clears the
  // marker for the nonce it mints. That is the fixture's existing behaviour and
  // is deliberately unchanged here - replay rejection still applies to a token
  // that has already been validated (the case above), it is just re-armed by
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

Deno.test("the replay TTL outlives the token it guards", () => {
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

Deno.test("the replay cache uses the project's declared policy numbers", () => {
  // The case above pins the RELATION between the replay TTL and the token
  // lifetime, and the case below pins memory. Neither can see the numbers
  // themselves: both sides of the relation are imported, and the entry count is
  // only asserted to be positive, so the cache could keep its relation and its
  // memory bound while the policy silently changed - the cap was measured moving
  // 4096 -> 1024 with every case still green. These are the declared values
  // (routes/release-endpoints.ts), stated here as decimal literals rather than
  // restated as the expressions the route uses, so a change to any of them fails
  // HERE by name. A rewrite that keeps the same value (15 * 60 * 1000, or 900_000)
  // is correctly accepted.
  //
  // They are checked numerically rather than behaviourally on purpose: the replay
  // cache is constructed at module scope, so a test cannot inject a clock into it
  // the way the session-store cases do, and a behavioural TTL test would mean
  // waiting out the TTL or patching the global Date.now. The value IS the policy,
  // and the token lifetime is pinned too because the relation above has two moving
  // sides: raising it to 400s would keep `900000 >= 400000` true while changing
  // what the relation is supposed to protect.
  assert(
    EVP_NONCE_REPLAY_TTL_MS === 900_000,
    `the replay TTL must be the declared 900000 ms (15 minutes), got ${EVP_NONCE_REPLAY_TTL_MS}`,
  );
  assert(
    EVP_NONCE_REPLAY_MAX_ENTRIES === 4096,
    `the replay entry cap must be the declared 4096, got ${EVP_NONCE_REPLAY_MAX_ENTRIES}`,
  );
  assert(
    EVP_SAMPLE_TOKEN_TTL_SECONDS === 300,
    `the token lifetime must be the declared 300 s, got ${EVP_SAMPLE_TOKEN_TTL_SECONDS}`,
  );
});

Deno.test("retained nonce memory stays bounded", async () => {
  assert(
    typeof globalThis.gc === "function",
    "this case measures retained heap and needs a real GC: run deno task test-evp-nonce-replay",
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
  // added, a 1000-sample run of the same case reported 1.3 MiB of noise as
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

Deno.test("a nonce validated before the entry cap is still rejected after it fills", async () => {
  // Regression for chrome_platform_showcase-lri. The cache is a deny-list, so an
  // evicting entry cap silently defeated replay rejection: once 4096 newer
  // nonces had been validated the oldest marker was gone and a token still
  // inside its 300s lifetime validated a second time. The cap now refuses new
  // markers instead of evicting live ones, which has to be measured across a
  // real crossing - the store's eviction only happens on a successful write.
  //
  // This case saturates the module-level cache, so it runs last.
  const nonce = `cap-${crypto.randomUUID()}`;
  const token = await sample(nonce);
  assert(
    (await validate(token, nonce)).valid === true,
    "the pre-cap nonce should validate once",
  );

  let refused = 0;
  const target = EVP_NONCE_REPLAY_MAX_ENTRIES + 64;
  for (let i = 0; i < target; i++) {
    const floodNonce = `cap-flood-${i}-${crypto.randomUUID()}`;
    const result = await validate(await sample(floodNonce), floodNonce);
    if (result.valid === true) continue;
    refused += 1;
    // A refusal has to be the capacity decision, not some other check quietly
    // failing on a token the issuer just minted.
    assert(
      (result.checks ?? []).some((check) =>
        check.title === "Replay cache can record this nonce" && check.pass === false
      ),
      `flood validation ${i} was refused without naming the replay cache as the reason`,
    );
  }
  assert(
    evpNonceReplayCacheIsFull(),
    `${target} validations should have filled the ${EVP_NONCE_REPLAY_MAX_ENTRIES}-entry replay cache`,
  );
  assert(
    refused > 0,
    "reaching the cap must refuse new tokens rather than evicting a live marker",
  );

  const replay = await validate(token, nonce);
  assert(
    replay.valid === false,
    `a nonce validated before the ${EVP_NONCE_REPLAY_MAX_ENTRIES}-entry cap must still be rejected after it fills`,
  );
  assert(
    replayCheck(replay)?.pass === false,
    "the post-cap rejection must be the replay check specifically",
  );
});
