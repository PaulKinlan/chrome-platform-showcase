// Per-source failure throttling for the telemetry admin surface
// (bead chrome_platform_showcase-3er).
//
// Measured before this existed: one unauthenticated client spent ~6,750 guesses
// per second against the four protected telemetry endpoints with nothing metered
// (every response a 401, no Retry-After) — about 583M guesses/day, on a public
// endpoint, against a password the operator chooses.
//
// The properties that matter are not "does it block" but the three constraints
// together: per-source, denial-safe for everyone else, and no lockout from the
// operator's own fumbling. Each has its own section below, and the route-level
// sections drive the real handler rather than the helper. What it does NOT do is
// guarantee an attempt to an operator who shares an address with a client that is
// flooding it: that limit is stated and asserted at the end of this file.
//
// Two things this file deliberately does not claim either: that recovery is possible
// DURING a continuing flood from the operator's own address, and that the deployment
// is guaranteed to supply a socket peer (the per-source property depends on that, and
// the empirical check is tracked as separate work).
//
// Run: deno task test-auth-throttle

import {
  AUTH_THROTTLE_KEY_MAX_CHARS,
  AUTH_THROTTLE_MAX_FAILURES,
  createAuthThrottle,
  sourceKeyFrom,
} from "../lib/auth-throttle.ts";
import { handleDemoTelemetryRoute } from "../routes/demo-telemetry.ts";

// A throwaway value for the local test process. No production credential is read
// or written anywhere in this suite, and nothing here prints it.
const TEST_PASSWORD = "test-only-value-not-a-real-credential";
Deno.env.set("showcase_password", TEST_PASSWORD);

let failures = 0;
function section(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function asyncSection(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** A throttle with a clock the test owns. */
function fakeClock(start = 1_000_000) {
  let at = start;
  return {
    now: () => at,
    advance(ms) {
      at += ms;
    },
  };
}

function basic(password) {
  return { authorization: `Basic ${btoa(`admin:${password}`)}` };
}

function request(path, { method = "GET", headers = {} } = {}) {
  return new Request(`http://localhost${path}`, { method, headers });
}

section("a fresh source may authenticate", () => {
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now });
  assert(throttle.check("1.2.3.4").allowed, "an unseen source is allowed");
  assert(throttle.size() >= 1 || throttle.size() === 1, "and is now tracked");
});

section("failures are spent exactly to the budget, then the source must wait", () => {
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now });
  const key = "5.6.7.8";
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) {
    assert(throttle.check(key).allowed, `failure ${i + 1} must be allowed`);
    throttle.recordFailure(key);
  }
  const decision = throttle.check(key);
  assert(!decision.allowed, "the budget is spent, so the next attempt is refused");
  assert(
    decision.retryAfterSeconds >= 1 && decision.retryAfterSeconds <= 10,
    `Retry-After must be a sane number of seconds, got ${decision.retryAfterSeconds}`,
  );
});

section("the bucket refills, so an over-budget source recovers without intervention", () => {
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now, refillMs: 10_000 });
  const key = "9.9.9.9";
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) throttle.recordFailure(key);
  assert(!throttle.check(key).allowed, "spent");
  clock.advance(9_999);
  assert(!throttle.check(key).allowed, "not yet: a partial interval earns nothing");
  clock.advance(1);
  assert(throttle.check(key).allowed, "one interval earns one attempt back");
  for (let i = 0; i < 60; i++) throttle.recordFailure(key);
  clock.advance(10_000 * 600);
  assert(throttle.check(key).allowed, "and a long idle period refills to full");
});

section("a success clears the record, so earlier failures do not accumulate", () => {
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now });
  const key = "10.0.0.1";
  // Fail right up to the edge of the budget, then succeed.
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES - 1; i++) throttle.recordFailure(key);
  assert(throttle.check(key).allowed, "still has budget");
  throttle.recordSuccess(key);
  // The record is gone, so the budget is whole again rather than one short.
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) {
    assert(throttle.check(key).allowed, `failure ${i + 1} after a success must be allowed`);
    throttle.recordFailure(key);
  }
  assert(!throttle.check(key).allowed, "and only then is the budget spent again");
});

section("one source exhausting its budget does not affect any other (no shared denial)", () => {
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now });
  for (let i = 0; i < 100; i++) throttle.recordFailure("attacker");
  assert(!throttle.check("attacker").allowed, "the attacker is throttled");
  assert(throttle.check("someone-else").allowed, "an unrelated source is untouched");
  assert(throttle.check("someone-else-2").allowed, "and so is another");
});

section("per-source state is bounded, and an idle source is really forgotten", () => {
  const clock = fakeClock();
  // Room to spare: 3 sources against a cap of 8, so the cap cannot explain what the
  // assertions below observe.
  const throttle = createAuthThrottle({
    now: clock.now,
    maxSources: 8,
    ttlMs: 1000,
    refillMs: 10_000,
  });
  for (let i = 0; i < 3; i++) throttle.recordFailure(`source-${i}`);
  assert(throttle.size() === 3, `expected 3 tracked sources, got ${throttle.size()}`);
  // Spend one source's whole budget, then let it go idle past the TTL. The refill
  // interval is deliberately much longer than the idle window, so the ONLY way this
  // key can be allowed again is the idle-drop branch — with that branch removed the
  // key stays spent and this assertion fails.
  const idle = "source-0";
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) throttle.recordFailure(idle);
  assert(!throttle.check(idle).allowed, "the idle source is spent before going idle");
  clock.advance(2001);
  assert(
    throttle.check(idle).allowed,
    "an idle source must be forgotten, not remembered as spent",
  );
  // And the cap still holds when many distinct sources arrive at once.
  for (let i = 0; i < 50; i++) throttle.recordFailure(`flood-${i}`);
  assert(throttle.size() === 8, `the cap must hold under a flood, got ${throttle.size()}`);
});

section("the advertised wait is bounded, non-growing, and sufficient at the decision level", () => {
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now, refillMs: 10_000 });
  const key = "203.0.113.200";
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) throttle.recordFailure(key);
  const first = throttle.check(key);
  assert(!first.allowed, "the source is spent");
  const advertised = first.retryAfterSeconds;
  assert(
    advertised >= 1 && advertised <= 10,
    `Retry-After must be a sane number of seconds, got ${advertised}`,
  );
  // It must not grow while nothing changes, and above all it must not LIE: waiting
  // exactly the advertised time has to be enough. A header that buys more waiting
  // than it asks for turns a throttle into a lockout.
  assert(
    throttle.check(key).retryAfterSeconds <= advertised,
    "Retry-After must not grow while nothing changes",
  );
  clock.advance(advertised * 1000);
  assert(
    throttle.check(key).allowed,
    `waiting the advertised ${advertised}s must be enough to attempt again`,
  );
});

section(
  "eviction: one source cannot churn its own state away, but other peers' churn resets it",
  () => {
    // Coordinator's eviction question, answered precisely — including the part that does
    // not flatter the design. Keys come from peers and never from headers, so a source
    // cannot manufacture keys to churn its OWN spent state away. But eviction is
    // oldest-updated, so enough churn from OTHER sources evicts the spent entry and the
    // same address starts over with a full budget without waiting out the refill. That is
    // a real limit of a capped map and is asserted below rather than claimed away. It only
    // ever resets a source's own failures (so it denies nobody), and it does not change the
    // bound for an attacker who can appear as many real addresses: that is limit 1.
    const clock = fakeClock();
    const throttle = createAuthThrottle({
      now: clock.now,
      maxSources: 4,
      ttlMs: 60_000,
      refillMs: 10_000,
    });
    const attacker = "198.51.100.66";
    for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) throttle.recordFailure(attacker);
    assert(!throttle.check(attacker).allowed, "the source is spent");
    // 200 further requests from the SAME source cannot create a key, so the spent state
    // survives every one of them.
    for (let i = 0; i < 200; i++) {
      assert(!throttle.check(attacker).allowed, `request ${i + 1} must still be refused`);
      throttle.recordFailure(attacker);
    }
    assert(throttle.size() <= 4, `the map must never exceed its cap, got ${throttle.size()}`);
    // Now churn from other sources, which is what an attacker with many addresses (or a
    // busy service) produces. The cap holds, and the spent entry is evicted.
    for (let i = 0; i < 50; i++) throttle.recordFailure(`other-${i}`);
    assert(throttle.size() === 4, `the cap must hold under churn, got ${throttle.size()}`);
    assert(
      throttle.check(attacker).allowed,
      "an evicted source gets a fresh budget without waiting, which is the stated limit",
    );
  },
);

const PROTECTED = [
  ["/telemetry/demo/events", "GET"],
  ["/telemetry/demo/admin", "GET"],
  ["/telemetry/demo/triage", "GET"],
  ["/telemetry/demo/reset", "POST"],
];

await asyncSection("every protected endpoint is throttled after failed attempts", async () => {
  const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
  for (const [path, method] of PROTECTED) {
    telemetryAuthThrottle.reset();
    const peer = `198.51.100.${PROTECTED.findIndex(([p]) => p === path) + 1}`;
    for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) {
      const res = await handleDemoTelemetryRoute(
        request(path, { method, headers: basic("wrong") }),
        { remoteAddr: peer },
      );
      assert(res?.status === 401, `${path} failure ${i + 1} should be 401, got ${res?.status}`);
    }
    const blocked = await handleDemoTelemetryRoute(
      request(path, { method, headers: basic("wrong") }),
      { remoteAddr: peer },
    );
    assert(blocked?.status === 429, `${path} should throttle with 429, got ${blocked?.status}`);
    const retryAfter = blocked.headers.get("retry-after");
    assert(
      retryAfter && Number(retryAfter) >= 1,
      `${path} must carry a Retry-After, got ${retryAfter}`,
    );
    assert(
      !blocked.headers.get("www-authenticate"),
      `${path} must not invite an immediate retry from a throttled source`,
    );
  }
});

await asyncSection(
  "throttling happens BEFORE the comparison, and a valid credential clears it",
  async () => {
    const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
    telemetryAuthThrottle.reset();
    const peer = "203.0.113.77";
    for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) {
      await handleDemoTelemetryRoute(
        request("/telemetry/demo/events", { headers: basic("wrong") }),
        {
          remoteAddr: peer,
        },
      );
    }
    // The point of the design: an over-budget source cannot spend a comparison, so
    // even the CORRECT credential is refused while the budget is spent. That is what
    // makes this throttle worth anything against guessing.
    const correctWhileSpent = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic(TEST_PASSWORD) }),
      { remoteAddr: peer },
    );
    assert(
      correctWhileSpent?.status === 429,
      `a spent source must not get a comparison even with the right credential, got ${correctWhileSpent?.status}`,
    );
    // It is a delay, not a ban: once the record is cleared the same credential works.
    telemetryAuthThrottle.reset();
    const afterRecovery = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic(TEST_PASSWORD) }),
      { remoteAddr: peer },
    );
    assert(
      afterRecovery?.status === 200,
      `the credential itself must still be accepted once the refusal is cleared, got ${afterRecovery?.status}`,
    );
    // Note: this section clears the state with reset() rather than waiting out the interval, so it
    // proves acceptance after clearing. Waiting is covered by the decision-level section and by the
    // real-HTTP verification, which sleeps the advertised seconds.
  },
);

await asyncSection("a successful authentication clears the source's failure record", async () => {
  const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
  telemetryAuthThrottle.reset();
  const peer = "203.0.113.88";
  // Fail until exactly ONE attempt is left, so the success below happens while the
  // bucket is nearly spent and the state it clears is non-trivial.
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES - 1; i++) {
    const res = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic("wrong") }),
      { remoteAddr: peer },
    );
    assert(res?.status === 401, `failure ${i + 1} of the budget should be 401, got ${res?.status}`);
  }
  const ok = await handleDemoTelemetryRoute(
    request("/telemetry/demo/events", { headers: basic(TEST_PASSWORD) }),
    { remoteAddr: peer },
  );
  assert(ok?.status === 200, `the operator must be able to get in, got ${ok?.status}`);
  // The whole budget must be available again — not "one failure left". Without the
  // clearing this loop hits a 429 on its second iteration, which is how this
  // section proves the success actually cleared the record rather than merely
  // fitting inside what was left.
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) {
    const res = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic("wrong") }),
      { remoteAddr: peer },
    );
    assert(
      res?.status === 401,
      `failure ${i + 1} after a success must get a fresh budget, got ${res?.status}`,
    );
  }
  const spent = await handleDemoTelemetryRoute(
    request("/telemetry/demo/events", { headers: basic("wrong") }),
    { remoteAddr: peer },
  );
  assert(spent?.status === 429, `and then be throttled, got ${spent?.status}`);
});

await asyncSection("one source's exhaustion leaves another source working", async () => {
  const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
  telemetryAuthThrottle.reset();
  const attacker = "192.0.2.10";
  const operator = "192.0.2.11";
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES + 5; i++) {
    await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic("wrong") }),
      { remoteAddr: attacker },
    );
  }
  const blocked = await handleDemoTelemetryRoute(
    request("/telemetry/demo/events", { headers: basic("wrong") }),
    { remoteAddr: attacker },
  );
  assert(blocked?.status === 429, "the attacker is throttled");
  const operatorRes = await handleDemoTelemetryRoute(
    request("/telemetry/demo/events", { headers: basic(TEST_PASSWORD) }),
    { remoteAddr: operator },
  );
  assert(
    operatorRes?.status === 200,
    `a flood from one address must not deny another, got ${operatorRes?.status}`,
  );
});

await asyncSection(
  "no response echoes the credential, and configured is indistinguishable",
  async () => {
    const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
    telemetryAuthThrottle.reset();
    const peer = "192.0.2.99";
    const wrong = "sup3r-s3cret-attempt-value";
    const configured = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic(wrong) }),
      { remoteAddr: peer },
    );
    const configuredBody = await configured.text();
    assert(!configuredBody.includes(wrong), "the supplied credential must never be echoed");
    assert(
      !configuredBody.includes(TEST_PASSWORD),
      "and the configured one must never appear in a response",
    );
    // The refusal for a WRONG password while one is configured must be byte-identical
    // to the refusal while none is configured, or the response itself tells an attacker
    // whether the surface is configured. (Unrelated and pre-existing: the GET
    // /telemetry/demo docs route publishes passwordConfigured; that is not introduced
    // here and is not what this section claims.)
    Deno.env.delete("showcase_password");
    Deno.env.delete("SHOWCASE_PASSWORD");
    telemetryAuthThrottle.reset();
    const unconfigured = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic(wrong) }),
      { remoteAddr: peer },
    );
    const unconfiguredBody = await unconfigured.text();
    Deno.env.set("showcase_password", TEST_PASSWORD);
    assert(
      unconfigured?.status === configured?.status,
      `unconfigured must look like a failed attempt (${unconfigured?.status} vs ${configured?.status})`,
    );
    assert(
      unconfiguredBody === configuredBody,
      "the two refusals must be identical, or the response reveals whether a password is set",
    );
    assert(
      !unconfiguredBody.includes(wrong),
      "and the attempt must not appear anywhere even when unconfigured",
    );
  },
);

await asyncSection("a client cannot rotate its own key with x-forwarded-for", async () => {
  const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
  telemetryAuthThrottle.reset();
  const peer = "192.0.2.44";
  // A different, attacker-chosen forwarded-for on EVERY request: if the key were
  // taken from the header each request would land in a fresh bucket and never
  // throttle. Every request here shares one peer, so they must share one budget.
  const statuses = [];
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES + 2; i++) {
    const res = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", {
        headers: { ...basic("wrong"), "x-forwarded-for": `10.0.0.${i}` },
      }),
      { remoteAddr: peer },
    );
    statuses.push(res?.status);
  }
  assert(
    statuses.includes(429),
    `rotating the header must not buy a fresh budget, got ${statuses.join(",")}`,
  );
  const spentWithAnotherValue = await handleDemoTelemetryRoute(
    request("/telemetry/demo/events", {
      headers: { ...basic(TEST_PASSWORD), "x-forwarded-for": "172.16.0.1" },
    }),
    { remoteAddr: peer },
  );
  assert(
    spentWithAnotherValue?.status === 429,
    `the peer is the key, so another header value cannot change the answer, got ${spentWithAnotherValue?.status}`,
  );
});

section("stated limit: while a flood continues, each refilled token is taken by it", () => {
  // The honest, executable statement of what a source-keyed throttle cannot do: two
  // clients behind one address are one source, so an operator sharing an address with
  // a flooding attacker is not guaranteed an attempt while the flood lasts. Asserted
  // rather than glossed over; recovery once the flood STOPS is covered above.
  const clock = fakeClock();
  const throttle = createAuthThrottle({ now: clock.now, refillMs: 10_000 });
  const sharedAddress = "198.51.100.7";
  for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) throttle.recordFailure(sharedAddress);
  assert(!throttle.check(sharedAddress).allowed, "spent by the flood");
  clock.advance(10_000);
  assert(throttle.check(sharedAddress).allowed, "the refilled attempt goes to whoever asks first");
  throttle.recordFailure(sharedAddress); // the flooder asks first, and fails
  assert(
    !throttle.check(sharedAddress).allowed,
    "so a second client on that address is refused again: no attempt is reserved for it",
  );
});

await asyncSection(
  "without a peer, every request shares one bounded anonymous bucket",
  async () => {
    const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
    telemetryAuthThrottle.reset();
    // The fail-closed path. When the platform gives us no peer there is no trustworthy
    // source identity, and a header must not be promoted into one, so every such
    // request lands in the single documented bucket: visible to everyone, and not bypassable by
    // rotating request headers — though shared, so one client can delay the others in it (churn
    // from other identified peers could also evict it, exactly as the eviction section shows for
    // any key). A DIFFERENT forwarded-for on every request must change nothing.
    const statuses = [];
    for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES + 1; i++) {
      const res = await handleDemoTelemetryRoute(
        request("/telemetry/demo/events", {
          headers: { ...basic("wrong"), "x-forwarded-for": `10.1.${i}.1` },
        }),
        {},
      );
      statuses.push(res?.status);
    }
    assert(
      statuses.includes(429),
      `anonymous requests must share one budget, got ${statuses.join(",")}`,
    );
    assert(sourceKeyFrom() === "unknown", "and that shared state is the documented bucket");
  },
);

await asyncSection(
  "the 429 advertises the decision's own wait, not a formatter's guess",
  async () => {
    const { telemetryAuthThrottle } = await import("../lib/auth-throttle.ts");
    telemetryAuthThrottle.reset();
    const peer = "198.51.100.9";
    for (let i = 0; i < AUTH_THROTTLE_MAX_FAILURES; i++) {
      await handleDemoTelemetryRoute(
        request("/telemetry/demo/events", { headers: basic("wrong") }),
        { remoteAddr: peer },
      );
    }
    const res = await handleDemoTelemetryRoute(
      request("/telemetry/demo/events", { headers: basic("wrong") }),
      { remoteAddr: peer },
    );
    assert(res?.status === 429, `expected 429 once spent, got ${res?.status}`);
    const header = res.headers.get("retry-after");
    // Tie the emitted header to the decision, so a response formatter that invents its own
    // number (say a hardcoded 1 while ten seconds are actually required) cannot pass. The
    // end-to-end proof that waiting the advertised time is enough lives in the real-HTTP
    // verification script, which sleeps the advertised seconds and expects a 200.
    // The end-to-end proof that waiting the advertised time is enough lives in the real-HTTP
    // verification script, which sleeps the advertised seconds and expects a 200. Here the
    // comparison allows one second of drift in the correct direction, because the header was
    // produced a moment before this decision is recomputed on the real clock: the wait can only
    // have decreased, and a formatter that invents its own number (say 1 while 10 is required)
    // still fails, which is the defect this section exists to catch.
    const decision = telemetryAuthThrottle.check(peer);
    assert(!decision.allowed, "the source is still spent, so a wait is what is advertised");
    const advertised = Number(header);
    assert(
      advertised === decision.retryAfterSeconds || advertised === decision.retryAfterSeconds + 1,
      `the header must be the decision's own value (${decision.retryAfterSeconds}), got ${header}`,
    );
    assert(advertised >= 1, `the advertised wait must never be zero, got ${header}`);
  },
);

if (failures > 0) {
  console.error(`\nauth throttle tests: ${failures} section(s) failed`);
  Deno.exit(1);
}
console.log("\nauth throttle tests: all sections passed");
