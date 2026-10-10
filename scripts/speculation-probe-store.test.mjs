// Bounds and cost guard for the Speculation-Rules CSP probe store
// (bead chrome_platform_showcase-vu7, from the 1e5 review).
//
// The probe kept one record per client token in a plain Map that was swept in
// full on every access: O(n) work per request, quadratic ingest, and no entry
// cap (only the five-minute TTL). `lib/probe-record-store.ts` fixes both by
// relying on one property — records are inserted in non-decreasing `createdAt`
// order and never re-inserted on access, so Map order is age order — and this
// suite keeps that property honest:
//
//   - how many entries a sweep VISITS is counted with an instrumented Map, so
//     the cost bound is deterministic instead of a timing assertion;
//   - the cap is asserted independently of expiry;
//   - the route is driven directly to prove the demo's own output is unchanged.
//
// Run: deno task test-speculation-probe-store
//
// Migrated in place to named Deno.test cases (Stage 8 of the dty proposal, bead
// dty.8): same file path, same task id `test-speculation-probe-store`, the same
// ordered gate step 15, the same ten subjects and the same assertions - the custom
// `section()` registry, its trailing loop and the legacy `Deno.exit(1)` branch are
// gone, so a failure names the case it broke and Deno's runner owns the exit code.
//
// ORDER IS LOAD-BEARING: cases 8-10 ("the probe route...", "past the cap...",
// "the route evicts by creation order...") all drive the SAME module-level store
// behind the route, and case 10's expectation is only justified after case 9 has
// filled that store. Deno.test runs the tests of one file serially in declaration
// order and scripts/native-test.mjs runs exactly one file per process, so both
// properties hold; do not add per-test concurrency or run this file with
// --parallel. Cases 1-7 build their own maps and are order-independent.
//
// The child needs NO permission (the imported modules are imported, not read), so
// the task passes no child flags and no `--` separator, as Stage 5 and 6 do.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — speculation probe store tests`
// / `FAIL — speculation probe store tests (1 file(s) failed)` - a neutral label,
// truthfully prefixed in both directions. A per-suite audit found no consumer of
// the old text.
//
// Known limit carried over unchanged: an in-place `createdAt` refresh on access
// would still pass every case here (see the comment on the last case). This
// migration does not change that.

import {
  evictOldestProbeRecords,
  SPECULATION_RULES_PROBE_MAX_RECORDS,
  SPECULATION_RULES_PROBE_TTL_MS,
  sweepExpiredProbeRecords,
} from "../lib/probe-record-store.ts";
import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";

const RELEASE = "v131";
const PREFIX = "/exempt-speculation-rules-header-from-csp-restrictions";
const NO_ASSET = async () => null;
const TTL = SPECULATION_RULES_PROBE_TTL_MS;
const CAP = SPECULATION_RULES_PROBE_MAX_RECORDS;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** A Map that counts how many entries a `for...of` actually visits. */
class CountingMap extends Map {
  visits = 0;
  [Symbol.iterator]() {
    const inner = super[Symbol.iterator]();
    return {
      next: () => {
        const step = inner.next();
        if (!step.done) this.visits += 1;
        return step;
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }
}

function records(entries) {
  // entries: [key, createdAt]
  return new CountingMap(entries.map(([key, createdAt]) => [key, { createdAt }]));
}

// ── sweep cost and expiry ───────────────────────────────────────────────────

Deno.test("a sweep visits only the expired prefix, not the whole store", () => {
  const now = 1_000_000;
  const map = records([
    ["expired-a", now - TTL - 5000],
    ["expired-b", now - TTL - 1000],
    ["live-1", now - TTL + 1],
    ["live-2", now],
    ["live-3", now],
  ]);
  const visits = sweepExpiredProbeRecords(map, now, TTL);
  assert(map.size === 3, `expected the two expired records to go, size is ${map.size}`);
  assert(!map.has("expired-a") && !map.has("expired-b"), "both expired records must be removed");
  assert(visits === 3, `a sweep must stop at the first live record: visited ${visits} of 5`);
  assert(
    map.visits === visits,
    `the sweep must visit exactly what it reports: map counted ${map.visits}, sweep returned ${visits}`,
  );
});

Deno.test("a large live store costs one visit per access", () => {
  const now = 2_000_000;
  const map = records(
    Array.from({ length: 50_000 }, (_, i) => [`token-${i}`, now - 1_000 + i]),
  );
  const visits = sweepExpiredProbeRecords(map, now, TTL);
  assert(visits === 1, `50,000 live records must cost one visit, cost ${visits}`);
  assert(map.visits === visits, `only one entry may be touched, the map counted ${map.visits}`);
  assert(map.size === 50_000, "no live record may be dropped");
});

Deno.test("every expired record goes when age order holds", () => {
  const now = 3_000_000;
  const map = records([
    ...Array.from({ length: 100 }, (_, i) => [`gone-${i}`, now - TTL - 100 + i]),
    ...Array.from({ length: 100 }, (_, i) => [`kept-${i}`, now - 10 + i]),
  ]);
  const visits = sweepExpiredProbeRecords(map, now, TTL);
  assert(map.size === 100, `expected every expired record to go, ${map.size} remain`);
  assert([...map.keys()].every((key) => key.startsWith("kept-")), "only live records may remain");
  assert(
    visits === 101 && map.visits === visits,
    `expected 100 expired records and one look at the first live one, got ${visits}/${map.visits}`,
  );
});

Deno.test("a sweep stops at the first live record (the helper's contract)", () => {
  // This asserts what the HELPER does on the map it is given, which is why it
  // cannot by itself prove the route maintains the ordering it relies on: the
  // map here is synthetic. The route's half of the contract is covered below by
  // "the route evicts by creation order, not by last access", which fails if the
  // route ever re-inserts a record on access — the change that would let an
  // expired record sit behind a live one and never be swept.
  const now = 4_000_000;
  const map = records([
    ["live-first", now],
    ["expired-behind", now - TTL - 1],
  ]);
  const visits = sweepExpiredProbeRecords(map, now, TTL);
  assert(visits === 1, `the sweep must not scan past the first live record, visited ${visits}`);
  assert(
    map.visits === visits,
    `the map counted ${map.visits} entries for ${visits} reported visits`,
  );
  assert(
    map.size === 2,
    "an out-of-order store is NOT fully swept — the route must never build one",
  );
});

Deno.test("a live record ages from creation, not from access", () => {
  const created = 5_000_000;
  const map = records([["live", created]]);
  for (const offset of [1, 1000, TTL - 1]) {
    sweepExpiredProbeRecords(map, created + offset, TTL);
    assert(map.has("live"), `record must survive an access at +${offset}ms`);
    assert(
      map.get("live").createdAt === created,
      "an access must not refresh the record's age (TTL semantics unchanged)",
    );
  }
  sweepExpiredProbeRecords(map, created + TTL + 1, TTL);
  assert(!map.has("live"), "the record must go once the TTL has passed");
});

// ── cap ────────────────────────────────────────────────────────────────────

Deno.test("the cap bounds the store independently of expiry", () => {
  const now = 6_000_000;
  const map = new Map();
  for (let i = 0; i < 5_000; i++) {
    map.set(`token-${i}`, { createdAt: now });
    evictOldestProbeRecords(map, CAP);
  }
  assert(map.size === CAP, `the store must stay at the cap, size is ${map.size}`);
  assert(map.has("token-4999"), "the newest record must survive");
  assert(!map.has("token-0"), "the oldest record must be evicted");
});

Deno.test("eviction is oldest-first and exact", () => {
  const now = 7_000_000;
  const map = new Map();
  for (let i = 0; i < CAP + 250; i++) map.set(`token-${i}`, { createdAt: now + i });
  const removed = evictOldestProbeRecords(map, CAP);
  assert(removed === 250, `expected exactly 250 evictions, got ${removed}`);
  assert(map.size === CAP, `expected ${CAP} records, got ${map.size}`);
  assert(!map.has("token-0") && !map.has("token-249"), "the 250 oldest must be the ones evicted");
  assert(map.has("token-250") && map.has(`token-${CAP + 249}`), "the newest must remain");
});

// ── the route itself ───────────────────────────────────────────────────────

async function probeRoute(route, params = {}) {
  const query = new URLSearchParams(params).toString();
  const sub = `${PREFIX}/spec-rules-csp/${route}`;
  const req = new Request(`http://localhost:3000/${RELEASE}${sub}${query ? `?${query}` : ""}`);
  const res = await handleLegacyReleaseEndpoints(req, RELEASE, sub, NO_ASSET);
  assert(res, `${route} should be handled`);
  return { res, body: await res.json().catch(() => ({})) };
}

Deno.test("the probe route still produces its demo output", async () => {
  const token = `vu7-demo-${crypto.randomUUID().slice(0, 8)}`;
  const probe = await probeRoute("header-probe", { token });
  assert(probe.res.status === 200, `header-probe should answer 200, got ${probe.res.status}`);
  assert(
    typeof probe.res.headers.get("speculation-rules") === "string" &&
      probe.res.headers.get("speculation-rules").length > 0,
    "the probe page must still set the Speculation-Rules header",
  );

  await probeRoute("prefetch-target", { token, doc: "/rules.json" });
  await probeRoute("rules.json", { token, doc: "/rules-a.json" });

  const status = await probeRoute("probe-status", { token });
  assert(
    status.body.pageLoads === 1,
    `pageLoads should count the probe load, got ${status.body.pageLoads}`,
  );
  assert(
    Array.isArray(status.body.targetRequests) && status.body.targetRequests.includes("/rules.json"),
    "the probe must still record prefetch targets",
  );
  assert(
    Array.isArray(status.body.ruleRequests) && status.body.ruleRequests.includes("/rules-a.json"),
    "the probe must still record rule requests",
  );
});

Deno.test("past the cap the oldest client is evicted and the newest kept", async () => {
  // Named for what actually happens: the OLDEST client (`active`) is the one
  // evicted, while the newest keeps its own record. Getting this backwards would
  // hide a cap that discarded the wrong end.
  const active = `vu7-active-${crypto.randomUUID().slice(0, 8)}`;
  await probeRoute("header-probe", { token: active });
  await probeRoute("header-probe", { token: active });

  // Push the store past the cap with fresh tokens; `active` is now the oldest.
  let newest = "";
  for (let i = 0; i < CAP + 5; i++) {
    newest = `vu7-fill-${i}`;
    await probeRoute("header-probe", { token: newest });
  }

  const newestStatus = await probeRoute("probe-status", { token: newest });
  assert(
    newestStatus.body.pageLoads === 1,
    `the newest client's own count must survive, got ${newestStatus.body.pageLoads}`,
  );

  const evictedStatus = await probeRoute("probe-status", { token: active });
  assert(
    evictedStatus.body.pageLoads === 0,
    `the oldest client is the one evicted, so its record restarts at zero, got ${evictedStatus.body.pageLoads}`,
  );
});

Deno.test("the route evicts by creation order, not by last access", async () => {
  // The ordering the sweep depends on, tested through the route rather than on a
  // synthetic map. It covers KEY ORDER specifically: a route that re-inserted a
  // record on access would move the touched client to the tail, so the single
  // eviction below would take the first filler instead of the touched client,
  // and the touched client would still report its original count.
  //
  // It does NOT cover an in-place refresh of `createdAt`. Mutating a property of
  // an object held in a Map leaves key iteration order unchanged, so that change
  // would still evict the touched client and this section would still pass —
  // confirmed by mutating the route to refresh `createdAt` on access and watching
  // every section pass. What that refresh actually breaks is the sweep's premise
  // that age order matches key order, and the consequence (an expired record
  // stranded behind a live one, never swept) is covered by the helper-level
  // "stops at the first live record" section above, not here.
  const touched = `vu7-order-${crypto.randomUUID().slice(0, 8)}`;
  await probeRoute("header-probe", { token: touched });
  await probeRoute("header-probe", { token: touched });

  for (let i = 0; i < CAP - 1; i++) await probeRoute("header-probe", { token: `vu7-fill-a-${i}` });

  // Touch the oldest record once more, without adding a new one: under correct
  // ordering this cannot change its position.
  await probeRoute("rules.json", { token: touched, doc: "/rules-order.json" });

  // One more new record exceeds the cap, so exactly one record is evicted.
  await probeRoute("header-probe", { token: "vu7-fill-final" });

  const status = await probeRoute("probe-status", { token: touched });
  assert(
    status.body.pageLoads === 0,
    `the touched client was created first, so it is the one evicted; pageLoads=${status.body.pageLoads} means a record survived an access that should not have moved it`,
  );
});
