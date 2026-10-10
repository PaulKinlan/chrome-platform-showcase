// Per-enrollment payload bound for the SPC browser-bound-key fixture
// (bead chrome_platform_showcase-4cx, from the 1e5 review follow-up).
//
// `spcBbkEnrollments` is capped at 512 entries (1e5), but the request body still
// controls `deviceName` up to the 1 MiB DEMO_BODY_LIMIT, the value is retained on
// the enrollment for its whole lifetime, and it is echoed back by both /enroll
// and /state. The demo client only ever sends a short display label, so the
// fixture loses nothing by bounding it to a display length while the unbounded
// retention path disappears.
//
// This suite drives the real route handlers (no server). A single unauthenticated
// POST /enroll with two P-256 public JWKs is enough to create an entry and get
// the stored name echoed back, which is also the reachability claim.
//
// Migrated in place to named Deno.test cases (Stage 5 of the dty proposal, bead
// dty.5): same file path, same task id `test-spc-bbk-device-name`, same ordered
// gate step, same five subjects and the same assertions — the custom `section()`
// registry, its trailing loop and the legacy `Deno.exit(1)` branch are gone, so a
// failure names the behaviour and Deno's runner owns the exit code.
//
// The child needs NO permission at all (probe: `deno run
// scripts/spc-bbk-device-name.test.mjs` with no flags passes all five sections), so
// the task deliberately passes no child flags and no `--` separator: kty/crv-style
// filesystem access is not part of this suite, and the wrapper's `childArgs(file,
// [])` path is now exercised by a real suite rather than only by unit tests.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — spc-bbk device-name tests` /
// `FAIL — spc-bbk device-name tests (1 file(s) failed)` — a neutral label,
// truthfully prefixed in both directions. The old text `all sections passed` is
// gone; a read-only audit found no consumer of it.
//
// Run: deno task test-spc-bbk-device-name

import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";

// What this suite expects the bound to be. The demo's own names are at most 32
// characters, so anything in this region preserves the fixture's UX.
const DEVICE_NAME_MAX = 128;
const ENROLL_SUB = "/secure-payment-confirmation-browser-bound-keys/enroll";
const STATE_SUB = "/secure-payment-confirmation-browser-bound-keys/state";
const COOKIE = "showcase_spc_bbk";

const noAsset = async () => null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function publicJwk() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  return await crypto.subtle.exportKey("jwk", pair.publicKey);
}

// POST /enroll with no cookie: the route mints a fresh enrollment on every call.
async function enroll(deviceName) {
  const body = {
    passkeyPublicJwk: await publicJwk(),
    browserBoundPublicJwk: await publicJwk(),
  };
  if (deviceName !== undefined) body.deviceName = deviceName;
  const req = new Request(`http://localhost:3000/v145${ENROLL_SUB}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await handleLegacyReleaseEndpoints(req, "v145", ENROLL_SUB, noAsset);
  assert(res, "the SPC BBK enroll route should be handled by the release router");
  return { res, body: await res.json() };
}

// The stored value as the fixture reports it back on a later request.
async function storedState(enrollmentId) {
  const req = new Request(`http://localhost:3000/v145${STATE_SUB}`, {
    headers: { cookie: `${COOKIE}=${enrollmentId}` },
  });
  const res = await handleLegacyReleaseEndpoints(req, "v145", STATE_SUB, noAsset);
  assert(res, "the SPC BBK state route should be handled");
  return await res.json();
}

// ---------------------------------------------------------------------------

Deno.test("ok — the fixture's own device names are stored and echoed unchanged", async () => {
  // Every value the published demos send.
  const demoNames = [
    "Primary checkout browser",
    "Chrome 145 SPC verifier",
    "PSD2 enrolled browser",
    "Primary SPC browser",
    "Risk scenario Device A",
    "Device A",
  ];
  for (const name of demoNames) {
    const { res, body } = await enroll(name);
    assert(res.status === 200, `enrolling as ${JSON.stringify(name)} should succeed`);
    assert(
      body.deviceName === name,
      `the fixture's own name should be stored verbatim, got ${JSON.stringify(body.deviceName)}`,
    );
    const state = await storedState(body.enrollmentId);
    assert(
      state.deviceName === name,
      `the stored name should come back on /state, got ${JSON.stringify(state.deviceName)}`,
    );
  }
  // A name exactly at the bound must survive intact (no over-eager trimming).
  const atBound = "n".repeat(DEVICE_NAME_MAX);
  const { body } = await enroll(atBound);
  assert(
    body.deviceName === atBound,
    `a name of exactly ${DEVICE_NAME_MAX} characters should be stored unchanged`,
  );
});

Deno.test("ok — the default device name is used when the body omits it", async () => {
  const { res, body } = await enroll(undefined);
  assert(res.status === 200, "enrolling without a deviceName should still succeed");
  assert(
    body.deviceName === "Primary browser",
    `the default should be used, got ${JSON.stringify(body.deviceName)}`,
  );
});

Deno.test("ok — an oversized device name is not retained in full", async () => {
  // DEMO_BODY_LIMIT is 1 MiB for the whole JSON body, and the two P-256 JWKs
  // plus the JSON envelope take a few hundred bytes of it, so the largest name a
  // caller can actually park here is just under 1 MiB. A name of exactly 1 MiB
  // is refused by the body ceiling instead.
  const HUGE = 1024 * 1024 - 4096;
  const huge = "D".repeat(HUGE);
  const { res, body } = await enroll(huge);
  assert(
    res.status === 200,
    `a ${HUGE}-character deviceName is inside the body limit and should enroll, got ${res.status}`,
  );
  assert(
    typeof body.deviceName === "string" && body.deviceName.length <= DEVICE_NAME_MAX,
    `a ~1 MiB deviceName must not be retained in full (got ${body.deviceName?.length} characters)`,
  );

  // The truncated value must still be the caller's prefix, not empty.
  assert(
    body.deviceName.length > 0 && huge.startsWith(body.deviceName),
    "the retained name should be a non-empty prefix of what the caller sent",
  );

  // And the bound must hold on the stored copy, not just the create response.
  const state = await storedState(body.enrollmentId);
  assert(
    typeof state.deviceName === "string" && state.deviceName.length <= DEVICE_NAME_MAX,
    `the stored copy must also be bounded (got ${state.deviceName?.length} characters)`,
  );
});

Deno.test("ok — the body ceiling is what caps the raw request, not the name itself", async () => {
  // Documents where the pre-existing 1 MiB DEMO_BODY_LIMIT bites: a name of
  // exactly 1 MiB pushes the envelope over the limit, so the request is refused
  // before the name is ever stored. This section is about the ceiling, not the
  // new bound, and must pass before and after the fix.
  const { res } = await enroll("F".repeat(1024 * 1024));
  assert(
    res.status === 413,
    `a body over DEMO_BODY_LIMIT should be refused with 413, got ${res.status}`,
  );
});

Deno.test("ok — the retained device-name budget stays small across a full store", async () => {
  // Eight oversized enrollments stand in for a caller filling the store: with
  // no bound this retains ~8 MiB of names alone, and the 512-entry cap (1e5)
  // multiplies it to ~0.5 GiB.
  const SAMPLES = 8;
  const huge = "E".repeat(1024 * 1024 - 4096);
  let retained = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const { body } = await enroll(huge);
    retained += body.deviceName.length;
  }
  const budget = SAMPLES * DEVICE_NAME_MAX;
  assert(
    retained <= budget,
    `${SAMPLES} sessions retained ${retained} device-name characters; the bound allows at most ${budget}`,
  );
});
