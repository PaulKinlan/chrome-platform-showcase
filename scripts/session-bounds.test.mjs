// Bounded-session growth guard for the release fixture Maps
// (bead chrome_platform_showcase-1e5).
//
// The 2026-10-08 project audit found module-level, client-keyed session Maps in
// routes/release-endpoints.ts that mint an entry on every miss and never drop
// one: the prefetch budget monitor keys sessions off an untrusted `?session=`
// value (unbounded length, unbounded session count), and the WebAuthn / SPC /
// auto-passkey / DBSC / SPSC-BBK fixtures mint a fresh server-side session for
// every unrecognised cookie. A client that sends a new cookie or session value
// per request grows these Maps without limit.
//
// This suite drives the real route handlers (no server) and asserts the
// observable consequence of a bound: once many sessions exist, the oldest are
// no longer retained — so their state is gone — and an arbitrarily long
// untrusted key is never retained as a key at all.
//
// Run: deno task test-session-bounds
//
// Migrated in place to named Deno.test cases (Stage 9 of the dty proposal, bead
// dty.9): same file path, same task id `test-session-bounds`, the same ordered
// gate step 7, the same twelve subjects and the same assertions - the custom
// `section()` registry, its trailing loop and the legacy `Deno.exit(1)` branch are
// gone, so a failure names the case it broke and Deno's runner owns the exit code.
//
// ORDER IS LOAD-BEARING, but more mildly than Stage 8: the first nine cases drive
// TWO module-level stores inside the route (the prefetch budget store and the
// WebAuthn signal store), and case 4 registers into a session it creates after
// case 3 has flooded that same store past its cap. Deno.test runs the tests of one
// file serially in declaration order and scripts/native-test.mjs runs exactly one
// file per process, so the ordering holds; do not add per-test concurrency or run
// this file with --parallel. Cases 10-12 build their own stores, and cases 5-9
// each start from a fresh session, so they are order-independent.
//
// The child needs NO permission (the imported modules are imported, not read), so
// the task passes no child flags and no `--` separator, as Stages 5, 6 and 8 do.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — session-bounds tests` /
// `FAIL — session-bounds tests (1 file(s) failed)` - a neutral label, truthfully
// prefixed in both directions. A per-suite audit found no consumer of the old text.
//
// Blind spot for the twelve cases above, and where it is now covered: the three
// `BoundedSessionStore` cases below pass explicit options, so they cannot see the
// module defaults (SESSION_STORE_MAX_ENTRIES / SESSION_STORE_TTL_MS /
// SESSION_KEY_MAX_LENGTH) at all, while the route cases that do use the
// default-constructed stores only detect a cap made larger or unbounded, not one
// made smaller. The three cases at the END of this file (bead dty.10) pin those
// default values directly against hard-coded literals, from both directions - see
// "The DEFAULT VALUES of the store" below. What remains uncovered is the route's
// own WEBAUTHN_SIGNAL_MAX_CREDENTIALS, which the credential-cap case above
// compares against itself.

import {
  handleLegacyReleaseEndpoints,
  WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_LENGTH,
  WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_RAW_BYTES,
  WEBAUTHN_SIGNAL_MAX_CREDENTIALS,
} from "../routes/release-endpoints.ts";
import { BoundedSessionStore } from "../lib/session-store.ts";

// Well above any sane per-store cap, so the assertions do not depend on the
// exact limit chosen in the implementation.
const MANY = 2000;

const noAsset = async () => null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const PREFETCH_SUB =
  "/pass-sec-purpose-prefetch-header-with-link-rel-prefetch/prefetch-budget-monitor/budget-endpoint";

async function callPrefetch(query) {
  const req = new Request(`http://localhost:3000${PREFETCH_SUB}?${query}`);
  const res = await handleLegacyReleaseEndpoints(req, "v138", PREFETCH_SUB, noAsset);
  assert(res, "prefetch budget endpoint should be handled by the release router");
  return res;
}

async function prefetchEntries(session) {
  const res = await callPrefetch(`session=${encodeURIComponent(session)}&read=1`);
  const body = await res.json();
  return Array.isArray(body.entries) ? body.entries : [];
}

async function callWebAuthnSession(cookie) {
  const sub = "/webauthn-signal-api/session-state";
  const req = new Request(`http://localhost:3000/v130${sub}`, {
    headers: cookie ? { cookie } : {},
  });
  const res = await handleLegacyReleaseEndpoints(req, "v130", sub, noAsset);
  assert(res, "webauthn session-state route should be handled");
  return res;
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function registerWebAuthnCredential(cookie, id, expectedStatus = 200) {
  const origin = "http://localhost:3000";
  const optRes = await handleLegacyReleaseEndpoints(
    new Request(`${origin}/v130/webauthn-signal-api/register-options`, {
      headers: cookie ? { cookie } : {},
    }),
    "v130",
    "/webauthn-signal-api/register-options",
    noAsset,
  );
  const setCookie = optRes.headers.get("set-cookie")?.split(";")[0] ?? cookie;
  const opt = await optRes.json();
  const challenge = opt.publicKey.challenge;

  const clientData = JSON.stringify({
    type: "webauthn.create",
    challenge,
    origin,
  });
  const clientDataJSON = base64UrlEncode(new TextEncoder().encode(clientData));

  const regRes = await handleLegacyReleaseEndpoints(
    new Request(`${origin}/v130/webauthn-signal-api/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: setCookie,
      },
      body: JSON.stringify({
        id,
        response: { clientDataJSON },
      }),
    }),
    "v130",
    "/webauthn-signal-api/register",
    noAsset,
  );
  assert(
    regRes.status === expectedStatus,
    `webauthn register expected status ${expectedStatus}, got ${regRes.status}`,
  );
  const payload = await regRes.json();
  return { cookie: setCookie, payload, status: regRes.status, res: regRes };
}

async function revokeWebAuthnCredential(cookie, id) {
  const origin = "http://localhost:3000";
  const res = await handleLegacyReleaseEndpoints(
    new Request(`${origin}/v130/webauthn-signal-api/revoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ id }),
    }),
    "v130",
    "/webauthn-signal-api/revoke",
    noAsset,
  );
  return res;
}

// ---------------------------------------------------------------------------

Deno.test("prefetch session count is bounded (oldest sessions stop being retained)", async () => {
  // Each distinct `session` value mints a server-side session with one entry.
  for (let i = 0; i < MANY; i++) {
    const res = await callPrefetch(`session=bounded-${i}&nonce=n${i}&resource=r${i}`);
    assert(res.status === 200, `session bounded-${i} should record an entry`);
  }
  // The first sessions are the oldest; a bounded store must have evicted them,
  // so their recorded state is gone.
  const first = await prefetchEntries("bounded-0");
  assert(
    first.length === 0,
    `prefetch sessions are unbounded: session bounded-0 still retains ${first.length} entr(ies) after ${MANY} distinct sessions`,
  );
});

Deno.test("an over-long prefetch session key is never retained", async () => {
  const longKey = "A".repeat(100_000);
  const res = await callPrefetch(
    `session=${encodeURIComponent(longKey)}&nonce=long-key-nonce&resource=long-key-resource`,
  );
  assert(res.status === 200, "an over-long session key should not error the demo route");
  const retained = await prefetchEntries(longKey);
  assert(
    retained.length === 0,
    `an arbitrarily long untrusted session key was retained (${retained.length} entr(ies) under a 100k-character key)`,
  );
});

Deno.test("webauthn cookie sessions are bounded (oldest cookies are re-minted)", async () => {
  // First contact mints a session; the server keys it by the random id it puts
  // in Set-Cookie, so the id to reuse later is the one from that header.
  const first = await callWebAuthnSession("showcase_webauthn_signal=unknown-0");
  const setCookie = first.headers.get("set-cookie");
  assert(
    setCookie,
    "first contact with an unknown cookie should mint a session and set a cookie",
  );
  const mintedId = /showcase_webauthn_signal=([^;]+)/.exec(setCookie)?.[1];
  assert(mintedId, `could not read the minted session id from: ${setCookie}`);

  // Every unrecognised cookie mints another server-side session.
  for (let i = 1; i < MANY; i++) {
    await callWebAuthnSession(`showcase_webauthn_signal=unknown-${i}`);
  }

  // If the store is bounded, the oldest session has been evicted, so the id
  // minted first is unknown again and the route mints a fresh one.
  const again = await callWebAuthnSession(`showcase_webauthn_signal=${mintedId}`);
  assert(
    again.headers.get("set-cookie"),
    `webauthn sessions are unbounded: the session minted ${MANY} sessions ago was still retained`,
  );
});

Deno.test(
  "webauthn signal credential count is bounded per session (oldest credentials evicted past cap)",
  async () => {
    let cookie = "";
    const total = WEBAUTHN_SIGNAL_MAX_CREDENTIALS + 5;
    for (let i = 0; i < total; i++) {
      const res = await registerWebAuthnCredential(cookie, `cred-${i}`);
      cookie = res.cookie;
    }

    const res = await callWebAuthnSession(cookie);
    const state = await res.json();
    assert(
      state.credentials.length === WEBAUTHN_SIGNAL_MAX_CREDENTIALS,
      `expected credentials count to be capped at ${WEBAUTHN_SIGNAL_MAX_CREDENTIALS}, but got ${state.credentials.length}`,
    );
    const hasFirst = state.credentials.some((c) => c.id === "cred-0");
    assert(!hasFirst, "oldest credential (cred-0) should have been evicted past the cap");
    assert(
      state.credentials[0].id === `cred-${total - 1}`,
      `newest credential should be at the front, got ${state.credentials[0]?.id}`,
    );
  },
);

Deno.test(
  "webauthn signal preserves 300-byte credential ID on register and revoke round-trip",
  async () => {
    // 300 raw bytes produces 400 base64url characters.
    const rawBytes = new Uint8Array(300);
    for (let i = 0; i < 300; i++) rawBytes[i] = (i * 7 + 13) % 256;
    const id300 = base64UrlEncode(rawBytes);
    assert(id300.length === 400, "300 raw bytes must encode to 400 base64url characters");

    // 1. Register with the 300-byte raw (400 base64url char) ID.
    const { cookie, payload } = await registerWebAuthnCredential("", id300);
    assert(payload.credentials.length === 1, "expected 1 registered credential");
    assert(
      payload.credentials[0].id === id300,
      "registered credential ID must preserve full 400-char ID without truncation",
    );
    assert(payload.credentials[0].revokedAt === null, "new credential should not be revoked");

    // Verify server session state preserves the exact ID
    const stateRes = await callWebAuthnSession(cookie);
    const state = await stateRes.json();
    assert(state.credentials[0].id === id300, "session state must retain full 400-char ID");

    // 2. Revoke using the authentic full ID
    const revokeRes = await revokeWebAuthnCredential(cookie, id300);
    assert(
      revokeRes.status === 200,
      `revoke with authentic ID should return 200, got ${revokeRes.status}`,
    );
    const revokedState = await revokeRes.json();
    const revokedCred = revokedState.credentials.find((c) => c.id === id300);
    assert(revokedCred && revokedCred.revokedAt !== null, "credential should be marked revoked");

    // 3. Attempting to revoke with a sliced ID (e.g. 256 chars) returns 404
    const slicedRes = await revokeWebAuthnCredential(cookie, id300.slice(0, 256));
    assert(slicedRes.status === 404, "revoke with truncated ID should return 404");
  },
);

Deno.test(
  "webauthn signal allows max spec-compliant 1023-byte credential ID exact",
  async () => {
    // W3C WebAuthn L3 (§5.1): credential IDs MUST NOT be longer than 1023 bytes.
    // 1023 raw bytes encodes to exactly 1364 base64url characters (1023 / 3 * 4 = 1364).
    const rawBytes = new Uint8Array(1023);
    for (let i = 0; i < 1023; i++) rawBytes[i] = (i * 11 + 3) % 256;
    const id1023 = base64UrlEncode(rawBytes);
    assert(id1023.length === 1364, "1023 raw bytes must encode to 1364 base64url characters");

    const { cookie, payload } = await registerWebAuthnCredential("", id1023);
    assert(payload.credentials.length === 1, "expected 1 registered credential");
    assert(payload.credentials[0].id === id1023, "retained ID must match exact 1364-char ID");

    const stateRes = await callWebAuthnSession(cookie);
    const state = await stateRes.json();
    assert(
      state.credentials[0].id === id1023,
      "server state must retain exact 1023-byte (1364-char) credential ID",
    );
  },
);

Deno.test(
  "webauthn signal rejects >1023 byte and over-long credential IDs without retaining",
  async () => {
    // 1024 raw bytes encodes to 1366 base64url characters, exceeding the 1023-byte / 1364-char bound.
    const rawBytes1024 = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) rawBytes1024[i] = i % 256;
    const id1024 = base64UrlEncode(rawBytes1024);
    assert(id1024.length === 1366, "1024 raw bytes must encode to 1366 base64url characters");

    // Start with a valid session holding 1 credential
    const validRes = await registerWebAuthnCredential("", "initial-valid-cred");
    const cookie = validRes.cookie;

    // Attempt to register 1024 raw bytes (>1023 bound)
    const rej1024 = await registerWebAuthnCredential(cookie, id1024, 400);
    assert(
      rej1024.status === 400,
      `expected 400 for 1024-byte credential ID, got ${rej1024.status}`,
    );

    // Attempt to register over-long string (e.g. 200,000 characters)
    const overlongId = "x".repeat(200_000);
    const rejOverlong = await registerWebAuthnCredential(cookie, overlongId, 400);
    assert(
      rejOverlong.status === 400,
      `expected 400 for 200,000-char credential ID, got ${rejOverlong.status}`,
    );

    // Assert neither rejected ID was retained in the session
    const stateRes = await callWebAuthnSession(cookie);
    const state = await stateRes.json();
    assert(
      state.credentials.length === 1,
      "session should still have only the 1 initial credential",
    );
    assert(
      state.credentials[0].id === "initial-valid-cred",
      "only the valid credential should be retained",
    );
    assert(
      !state.credentials.some((c) => c.id === id1024),
      "1024-byte credential must not be retained",
    );
    assert(
      !state.credentials.some((c) => c.id === overlongId),
      "overlong credential must not be retained",
    );
  },
);

Deno.test(
  "webauthn signal preserves distinct credentials sharing 256-char prefix without collision",
  async () => {
    // Two distinct 301-byte raw credentials sharing the first 300 bytes (each 402 base64url chars).
    // Under the old 256-char slice, these collided and the second was silently dropped.
    const baseBytes = new Uint8Array(300);
    for (let i = 0; i < 300; i++) baseBytes[i] = 0x78; // 'x'
    const rawA = new Uint8Array(301);
    rawA.set(baseBytes);
    rawA[300] = 0x41; // 'A'
    const rawB = new Uint8Array(301);
    rawB.set(baseBytes);
    rawB[300] = 0x42; // 'B'

    const idA = base64UrlEncode(rawA);
    const idB = base64UrlEncode(rawB);
    assert(
      idA.length === 402 && idB.length === 402,
      "301 raw bytes must encode to 402 base64url chars",
    );
    assert(
      idA.slice(0, 256) === idB.slice(0, 256),
      "both IDs share their first 256 characters",
    );
    assert(idA !== idB, "the full IDs must be distinct");

    const regA = await registerWebAuthnCredential("", idA);
    const cookie = regA.cookie;
    const regB = await registerWebAuthnCredential(cookie, idB);

    const stateRes = await callWebAuthnSession(cookie);
    const state = await stateRes.json();
    assert(
      state.credentials.length === 2,
      `expected 2 distinct credentials, got ${state.credentials.length}`,
    );
    const hasA = state.credentials.some((c) => c.id === idA);
    const hasB = state.credentials.some((c) => c.id === idB);
    assert(hasA && hasB, "both distinct credentials must be retained in session");
  },
);

Deno.test(
  "webauthn signal partitions active vs revoked credentials for signal API consumption",
  async () => {
    // Workbench passes active IDs to PublicKeyCredential.signalAllAcceptedCredentials
    // and revoked IDs to PublicKeyCredential.signalUnknownCredential.
    const rawBytesA = new Uint8Array(300);
    for (let i = 0; i < 300; i++) rawBytesA[i] = (i + 1) % 256;
    const idActive = base64UrlEncode(rawBytesA);

    const rawBytesB = new Uint8Array(300);
    for (let i = 0; i < 300; i++) rawBytesB[i] = (i + 50) % 256;
    const idRevoked = base64UrlEncode(rawBytesB);

    let { cookie } = await registerWebAuthnCredential("", idActive);
    const reg2 = await registerWebAuthnCredential(cookie, idRevoked);
    cookie = reg2.cookie;

    // Revoke the second credential
    await revokeWebAuthnCredential(cookie, idRevoked);

    const stateRes = await callWebAuthnSession(cookie);
    const state = await stateRes.json();

    const activeIds = state.credentials.filter((c) => !c.revokedAt).map((c) => c.id);
    const revokedIds = state.credentials.filter((c) => c.revokedAt).map((c) => c.id);

    assert(
      activeIds.length === 1 && activeIds[0] === idActive,
      "signalAllAcceptedCredentials target ID must match exactly",
    );
    assert(
      revokedIds.length === 1 && revokedIds[0] === idRevoked,
      "signalUnknownCredential target ID must match exactly",
    );
  },
);

// ---------------------------------------------------------------------------
// Contract of the shared store itself: the route-level cases above prove the
// fixtures use it, these pin the bounds it promises (TTL is not reachable from
// a route test, so the clock is injected).

Deno.test("store drops an entry once its ttl has passed", async () => {
  let clock = 1_000;
  const store = new BoundedSessionStore({ ttlMs: 500, now: () => clock });
  store.set("session", "value");

  clock = 1_499;
  assert(store.get("session") === "value", "entry should live until its ttl expires");

  clock = 1_500;
  assert(store.get("session") === undefined, "entry outlived its ttl");
  assert(store.size === 0, "an expired entry should not still count towards the store size");
});

Deno.test("store refuses a key longer than its maximum", async () => {
  const store = new BoundedSessionStore({ maxKeyLength: 8 });
  store.set("12345678", "kept");
  store.set("123456789", "refused");

  assert(store.get("12345678") === "kept", "an acceptable key should be stored");
  assert(store.get("123456789") === undefined, "an over-long key should never be retrievable");
  assert(store.has("123456789") === false, "an over-long key should report a miss");
  assert(store.size === 1, "an over-long key must not occupy an entry");
});

Deno.test("store evicts the oldest written entry past its cap", async () => {
  const store = new BoundedSessionStore({ maxEntries: 3 });
  store.set("a", 1);
  store.set("b", 2);
  store.set("c", 3);
  store.set("a", 10); // rewriting marks `a` most recent, so `b` is now oldest
  store.set("d", 4);

  assert(store.size === 3, `store should hold at most its cap, held ${store.size}`);
  assert(store.get("b") === undefined, "the oldest written entry should have been evicted");
  assert(store.get("a") === 10, "the most recently written entry should survive");
  assert(store.get("c") === 3 && store.get("d") === 4, "other live entries should survive");
});

// ---------------------------------------------------------------------------
// The DEFAULT VALUES of the store, pinned directly (bead dty.10).
//
// The cases above prove the route's fixtures use the store, and the three store
// cases above pin the store's behaviour when it is given explicit options. None
// of them pins the three numbers a default-constructed store actually uses:
// SESSION_STORE_MAX_ENTRIES, SESSION_STORE_TTL_MS and SESSION_KEY_MAX_LENGTH.
// The route cases that DO use default-constructed stores assert only that an old
// entry is gone, which catches a cap made larger or unbounded and cannot catch one
// made smaller.
//
// These three cases close that gap. Every expectation is a hard-coded literal
// (512, 21_600_000, 128) and NEVER the module constant, so a widened or narrowed
// default fails here instead of moving the expectation with the implementation.
// If one of those defaults legitimately changes, these cases must fail and be
// updated on purpose - that is the point.
//
// The cap and key cases use an argument-free `new BoundedSessionStore()`. The ttl
// case overrides ONLY the clock seam - `{ now: () => clock }` - and therefore is
// NOT argument-free; ttlMs, maxEntries and maxKeyLength are all omitted, so all
// three numeric defaults still apply. A global `Date.now` patch was considered and
// rejected: it mutates shared state for no extra coverage.
//
// Known limits, unchanged and not claimed here: the runner's rule is >=1 executed
// test, so it cannot pin the case count; and the route's own
// WEBAUTHN_SIGNAL_MAX_CREDENTIALS (routes/release-endpoints.ts:934) is compared
// against itself by the credential-cap case earlier in this file and stays
// unpinned.

Deno.test("default store cap is exactly 512 entries", () => {
  const store = new BoundedSessionStore();
  for (let i = 0; i < 512; i++) store.set(`cap-key-${i}`, i);
  assert(
    store.size === 512,
    `a default store must hold exactly 512 entries, it held ${store.size}`,
  );
  assert(
    store.get("cap-key-0") === 0,
    "the 512th insert must not evict the oldest entry",
  );

  store.set("cap-key-512", 512);
  assert(
    store.size === 512,
    `a default store must stay at 512 entries, it held ${store.size}`,
  );
  assert(store.get("cap-key-0") === undefined, "the 513th insert must evict the oldest entry");
  assert(store.get("cap-key-1") === 1, "only the oldest entry may be evicted");
  assert(store.get("cap-key-512") === 512, "the newest entry must survive");

  // Control: the fixture is not vacuous - a store with an explicit, different cap
  // must show THAT boundary, so a passing default case is a real measurement.
  const five = new BoundedSessionStore({ maxEntries: 5 });
  for (let i = 0; i < 6; i++) five.set(`ctrl-${i}`, i);
  assert(five.size === 5, `an explicit 5-entry cap must hold 5, it held ${five.size}`);
  assert(five.get("ctrl-0") === undefined, "the explicit cap must evict the oldest entry");
});

Deno.test("default store ttl is exactly six hours", () => {
  const base = 1_700_000_000_000;
  let clock = base;
  const store = new BoundedSessionStore({ now: () => clock });
  store.set("ttl-key", "value");

  clock = base + 21_600_000 - 1;
  assert(
    store.get("ttl-key") === "value",
    "an entry must survive until its six-hour ttl has passed",
  );

  clock = base + 21_600_000;
  assert(
    store.get("ttl-key") === undefined,
    "an entry must be gone once exactly six hours have passed",
  );
  assert(store.size === 0, "an expired entry must not still count towards the store size");
});

Deno.test("default store key bound is exactly 128 characters", () => {
  const store = new BoundedSessionStore();
  const accepted = "k".repeat(128);
  const refused = "k".repeat(129);

  store.set(accepted, "kept");
  store.set(refused, "refused");

  assert(store.get(accepted) === "kept", "a 128-character key must be stored");
  assert(store.get(refused) === undefined, "a 129-character key must never be retrievable");
  assert(store.has(refused) === false, "a 129-character key must report a miss");
  assert(store.size === 1, "a refused key must not occupy an entry");
});
