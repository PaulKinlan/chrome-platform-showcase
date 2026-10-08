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

import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";
import { BoundedSessionStore } from "../lib/session-store.ts";

// Well above any sane per-store cap, so the assertions do not depend on the
// exact limit chosen in the implementation.
const MANY = 2000;

const noAsset = async () => null;

const failures = [];
const sections = [];
function section(label, fn) {
  sections.push({ label, fn });
}

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

// ---------------------------------------------------------------------------

section("prefetch session count is bounded (oldest sessions stop being retained)", async () => {
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

section("an over-long prefetch session key is never retained", async () => {
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

section("webauthn cookie sessions are bounded (oldest cookies are re-minted)", async () => {
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

// ---------------------------------------------------------------------------
// Contract of the shared store itself: the route-level sections above prove the
// fixtures use it, these pin the bounds it promises (TTL is not reachable from
// a route test, so the clock is injected).

section("store drops an entry once its ttl has passed", async () => {
  let clock = 1_000;
  const store = new BoundedSessionStore({ ttlMs: 500, now: () => clock });
  store.set("session", "value");

  clock = 1_499;
  assert(store.get("session") === "value", "entry should live until its ttl expires");

  clock = 1_500;
  assert(store.get("session") === undefined, "entry outlived its ttl");
  assert(store.size === 0, "an expired entry should not still count towards the store size");
});

section("store refuses a key longer than its maximum", async () => {
  const store = new BoundedSessionStore({ maxKeyLength: 8 });
  store.set("12345678", "kept");
  store.set("123456789", "refused");

  assert(store.get("12345678") === "kept", "an acceptable key should be stored");
  assert(store.get("123456789") === undefined, "an over-long key should never be retrievable");
  assert(store.has("123456789") === false, "an over-long key should report a miss");
  assert(store.size === 1, "an over-long key must not occupy an entry");
});

section("store evicts the oldest written entry past its cap", async () => {
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
  console.error(`\nsession-bounds tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nsession-bounds tests: all sections passed");
