// Bounds for the per-record doc arrays of the Speculation-Rules CSP probe
// (bead chrome_platform_showcase-rh7, from the vu7 review).
//
// Each probe record carries the doc references it observed (`ruleRequests` from
// rules.json, `targetRequests` from prefetch-target). Those arrays were deduped
// with an O(k) `includes` scan and bounded in neither count nor entry length, and
// `?doc=` is caller-supplied with no validation beyond the URL itself. Measured
// at the base commit `ecc4d6b9`:
//
//   - one token with 5,000 distinct 200-character docs retained 1.96 MiB in that
//     single record, and appending got slower as the array grew — the last 4,000
//     prefix-sharing appends took 1,599 ms against 338 ms for the preceding 2,000;
//   - docs of 8 KiB, 16 KiB and 32 KiB were all accepted by the route and by the
//     HTTP layer, so the per-record ceiling was "whatever the client sends".
//
// `recordProbeDoc` now bounds the count and the entry length, which also makes the
// dedupe scan constant again. The bounds are display-only strings, so this suite
// checks both halves: the arrays stay bounded, and what the demo shows is intact.
//
// Run: deno task test-speculation-probe-docs
//
// Migrated in place to named Deno.test cases (Stage 11 of the dty proposal, bead
// dty.12): same file path, same task id `test-speculation-probe-docs`, the same
// ordered gate step 17, the same eight subjects and the same assertions — the
// custom `section()` registry, its trailing loop and the legacy `Deno.exit(1)`
// branch are gone, so a failure names the case it broke and Deno's runner owns the
// exit code.
//
// ORDER IS LOAD-BEARING: the last case measures retained heap and belongs last so
// nothing it allocates is charged to another case, and the route cases before it
// flood one record each with their own token. Deno.test runs the tests of one file
// serially in declaration order and this task runs exactly one file per process, so
// the ordering holds; do not add per-test concurrency or run this file with
// --parallel.
//
// The child needs no permission (the imported modules are imported, not read), so
// the task forwards ONLY `--v8-flags=--expose-gc` — that flag is what the last case
// needs to measure anything at all, and it stays confined to this one file by the
// task's `--serial speculation-probe-docs.test.mjs` and by one process per file.
// Without the flag the last case fails loudly by name rather than passing
// vacuously; the flag is never set repository-wide.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — speculation probe docs tests` /
// `FAIL — speculation probe docs tests (1 file(s) failed)` - a neutral label,
// truthfully prefixed in both directions. A per-suite audit found no consumer of
// the old text.
//
// The bound VALUES are pinned by the three cases immediately below "the route
// refuses over-long docs…" and above the heap case (bead dty.13). The older cases
// cannot see them: they build every fixture from the imported
// SPECULATION_RULES_PROBE_MAX_DOC_CHARS / …_MAX_DOCS_PER_RECORD and compare against
// the same imports, so they pin the relation and move with the implementation.
// Measured on the dty.12 branch: raising the character cap 256 -> 8192 alone, or the
// per-record count cap 64 -> 4096 alone, left all eight cases green. The three
// cases added by dty.13 state the project's declared numbers - 256 characters and
// 64 docs per record - as literals in the fixtures AND in the expectations, from
// both directions, and one of them drives the route so a route that passed the
// helper an explicit limit would fail too.

import {
  recordProbeDoc,
  SPECULATION_RULES_PROBE_MAX_DOC_CHARS,
  SPECULATION_RULES_PROBE_MAX_DOCS_PER_RECORD,
} from "../lib/probe-record-store.ts";
import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";

const RELEASE = "v131";
const PREFIX = "/exempt-speculation-rules-header-from-csp-restrictions";
const NO_ASSET = async () => null;
const MAX_DOCS = SPECULATION_RULES_PROBE_MAX_DOCS_PER_RECORD;
const MAX_CHARS = SPECULATION_RULES_PROBE_MAX_DOC_CHARS;

// What a demo run actually produces: the header-probe parser caps a `rules` value
// at four entries of 120 characters each, so a page load adds a handful of short
// paths. The bounds must never interfere with that.
const DEMO_DOCS = ["/rules.json", "/a/b.json", "/prefetch-target.json"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ── the helper's contract ───────────────────────────────────────────────────

Deno.test("a short doc is recorded once and duplicates are ignored", () => {
  const docs = [];
  assert(recordProbeDoc(docs, "/rules.json") === true, "a fresh doc should be recorded");
  assert(recordProbeDoc(docs, "/rules.json") === false, "a duplicate should not be recorded");
  assert(docs.length === 1, `expected one entry, got ${docs.length}`);
});

Deno.test("an over-long doc is ignored, not truncated, and later docs still record", () => {
  const docs = [];
  const tooLong = "/" + "y".repeat(MAX_CHARS);
  assert(recordProbeDoc(docs, tooLong) === false, "an over-long doc must be ignored");
  assert(docs.length === 0, "an ignored doc must leave no trace");
  assert(
    recordProbeDoc(docs, "/after.json") === true,
    "a valid doc after an ignored one must still be recorded",
  );
  assert(
    docs[0] === "/after.json",
    "the recorded doc must be the exact string, never a truncation",
  );
});

Deno.test("the boundary is exact", () => {
  const atLimit = "/" + "z".repeat(MAX_CHARS - 1);
  const oneOver = "/" + "z".repeat(MAX_CHARS);
  assert(atLimit.length === MAX_CHARS, "the boundary fixture must sit exactly at the limit");
  const kept = [];
  recordProbeDoc(kept, atLimit);
  const dropped = [];
  recordProbeDoc(dropped, oneOver);
  assert(kept.length === 1, `a doc of exactly ${MAX_CHARS} chars must be kept`);
  assert(dropped.length === 0, `a doc of ${MAX_CHARS + 1} chars must be dropped`);
});

Deno.test("the per-record count is capped and the cap is exact", () => {
  const docs = [];
  for (let i = 0; i < MAX_DOCS; i++) {
    assert(recordProbeDoc(docs, `/doc-${i}.json`) === true, `doc ${i} should fit in the cap`);
  }
  assert(docs.length === MAX_DOCS, `expected ${MAX_DOCS} entries, got ${docs.length}`);

  // Far more attempts than the cap, to prove the cap is a hard stop rather than
  // something an attacker can walk past.
  for (let i = 0; i < 1000; i++) {
    assert(
      recordProbeDoc(docs, `/overflow-${i}.json`) === false,
      "docs past the cap must be refused",
    );
  }
  assert(docs.length === MAX_DOCS, `the array must stay at ${MAX_DOCS}, got ${docs.length}`);
  assert(
    docs[0] === "/doc-0.json" && docs[MAX_DOCS - 1] === `/doc-${MAX_DOCS - 1}.json`,
    "the first entries must be the ones kept (oldest-first, matching the store's own policy)",
  );
});

Deno.test("a full array refuses new docs without scanning or mutating it", () => {
  // `recordProbeDoc` checks the count BEFORE its `includes` scan, which is what
  // makes the per-append cost constant again. That ordering is asserted here
  // rather than described: the array is wrapped so a call to `includes` is
  // observable. The two non-full cases below prove the probe can see a scan at
  // all, so the full-array case cannot pass vacuously.
  function watched(entries = []) {
    const inner = [...entries];
    let scans = 0;
    const proxy = new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === "includes") scans += 1;
        return Reflect.get(target, prop, receiver);
      },
    });
    return { proxy, scans: () => scans };
  }

  // A probe that cannot observe a scan would make the assertion below meaningless.
  const control = watched();
  assert(recordProbeDoc(control.proxy, "/fresh.json") === true, "a fresh doc should record");
  assert(control.scans() === 1, `the probe must see the dedupe scan, counted ${control.scans()}`);
  const duplicate = watched(["/dup.json"]);
  assert(recordProbeDoc(duplicate.proxy, "/dup.json") === false, "a duplicate should be refused");
  assert(
    duplicate.scans() === 1,
    `a duplicate must be found by scanning, counted ${duplicate.scans()}`,
  );

  // The real assertion: full arrays are refused by the length check, before any scan.
  const full = [];
  for (let i = 0; i < MAX_DOCS; i++) recordProbeDoc(full, `/doc-${i}.json`);
  const snapshot = [...full];
  const watchedFull = watched(full);
  assert(
    recordProbeDoc(watchedFull.proxy, "/never-seen.json") === false,
    "a full array must refuse new docs",
  );
  assert(
    watchedFull.scans() === 0,
    `a full array must be refused BEFORE the dedupe scan, but it scanned ${watchedFull.scans()} time(s)`,
  );
  assert(
    JSON.stringify([...watchedFull.proxy]) === JSON.stringify(snapshot),
    "refusing must not modify the array",
  );
});

// ── the route itself ────────────────────────────────────────────────────────

async function probeRoute(route, params = {}) {
  const query = new URLSearchParams(params).toString();
  const sub = `${PREFIX}/spec-rules-csp/${route}`;
  const req = new Request(`http://localhost:3000/${RELEASE}${sub}${query ? `?${query}` : ""}`);
  const res = await handleLegacyReleaseEndpoints(req, RELEASE, sub, NO_ASSET);
  assert(res, `${route} should be handled`);
  return { res, body: await res.json().catch(() => ({})) };
}

Deno.test("a demo-shaped run records every doc it asks for", async () => {
  const token = `rh7-demo-${crypto.randomUUID().slice(0, 8)}`;
  for (const doc of DEMO_DOCS) await probeRoute("rules.json", { token, doc });
  for (const doc of DEMO_DOCS) await probeRoute("prefetch-target", { token, doc });

  const status = await probeRoute("probe-status", { token });
  assert(
    status.body.ruleRequests.length === DEMO_DOCS.length,
    `the demo's ${DEMO_DOCS.length} docs must all be reported, got ${status.body.ruleRequests.length}`,
  );
  assert(
    JSON.stringify(status.body.ruleRequests) === JSON.stringify(DEMO_DOCS),
    `the reported docs must be exactly what the demo fetched, got ${
      JSON.stringify(status.body.ruleRequests)
    }`,
  );
  assert(
    status.body.targetRequests.length === DEMO_DOCS.length,
    `prefetch targets must be reported too, got ${status.body.targetRequests.length}`,
  );
});

Deno.test("the route refuses over-long docs and caps a flooded record", async () => {
  const token = `rh7-flood-${crypto.randomUUID().slice(0, 8)}`;
  const huge = "/" + "q".repeat(8 * 1024);
  await probeRoute("rules.json", { token, doc: huge });

  let status = await probeRoute("probe-status", { token });
  assert(
    status.body.ruleRequests.length === 0,
    `an 8 KiB doc must not be recorded, got ${status.body.ruleRequests.length} entries`,
  );

  // Flood one record through the route: the array must stop at the cap.
  for (let i = 0; i < MAX_DOCS + 50; i++) {
    await probeRoute("rules.json", { token, doc: `/flood-${i}.json` });
  }
  status = await probeRoute("probe-status", { token });
  assert(
    status.body.ruleRequests.length === MAX_DOCS,
    `a flooded record must stay at ${MAX_DOCS} docs, got ${status.body.ruleRequests.length}`,
  );
});

// ── the project's declared bounds, stated as literals (dty.13) ──────────────
//
// These three cases deliberately do NOT import the cap constants as expected
// values. 256 characters and 64 docs per record are this project's own policy
// (lib/probe-record-store.ts:52 and :54), so the literals are the specification;
// the fixtures are asserted against their literal lengths as well, so a fixture
// that drifted cannot make a case pass.

Deno.test("the per-record document size cap is exactly 256 characters", () => {
  const atLimit = "/" + "z".repeat(255);
  const oneOver = "/" + "z".repeat(256);
  assert(
    atLimit.length === 256,
    `the boundary fixture must sit exactly at 256 characters, got ${atLimit.length}`,
  );
  assert(
    oneOver.length === 257,
    `the over-limit fixture must be exactly 257 characters, got ${oneOver.length}`,
  );

  const kept = [];
  assert(recordProbeDoc(kept, atLimit) === true, "a doc of exactly 256 characters must be kept");
  assert(kept[0] === atLimit, "the kept doc must be the exact string, never a truncation");

  const dropped = [];
  assert(recordProbeDoc(dropped, oneOver) === false, "a doc of 257 characters must be dropped");
  assert(dropped.length === 0, "a dropped doc must leave no trace");
});

Deno.test("the per-record document count cap is exactly 64", () => {
  const docs = [];
  for (let i = 0; i < 64; i++) {
    assert(recordProbeDoc(docs, `/limit-${i}.json`) === true, `doc ${i} must fit the 64-doc cap`);
  }
  assert(docs.length === 64, `exactly 64 entries must be retained, got ${docs.length}`);
  assert(
    docs[0] === "/limit-0.json" && docs[63] === "/limit-63.json",
    "the entries kept must be the first 64 (oldest-first, matching the store's own policy)",
  );

  assert(
    recordProbeDoc(docs, "/limit-64.json") === false,
    "a 65th distinct doc must be refused",
  );
  assert(docs.length === 64, `the array must stay at exactly 64, got ${docs.length}`);
});

Deno.test("the route applies the project's document bounds to a probe record", async () => {
  // Its own token, so this shares no state with the other route cases.
  const token = `dty13-route-${crypto.randomUUID().slice(0, 8)}`;
  const atLimit = "/" + "s".repeat(255);
  const oneOver = "/" + "s".repeat(256);
  assert(
    atLimit.length === 256,
    `the boundary fixture must be 256 characters, got ${atLimit.length}`,
  );
  assert(
    oneOver.length === 257,
    `the over-limit fixture must be 257 characters, got ${oneOver.length}`,
  );

  // The over-limit doc goes first so this stays a test of the LENGTH rule rather
  // than of a full record: a route that accepted it would show it here.
  await probeRoute("rules.json", { token, doc: oneOver });
  let status = await probeRoute("probe-status", { token });
  assert(
    status.body.ruleRequests.length === 0,
    `the route must not record a 257-character doc, got ${
      JSON.stringify(status.body.ruleRequests)
    }`,
  );

  await probeRoute("rules.json", { token, doc: atLimit });
  status = await probeRoute("probe-status", { token });
  assert(
    status.body.ruleRequests.length === 1 && status.body.ruleRequests[0] === atLimit,
    `the route must report a 256-character doc back untruncated, got ${
      JSON.stringify(status.body.ruleRequests)
    }`,
  );

  // 64 distinct docs plus the one already kept: the route must stop at 64.
  for (let i = 0; i < 64; i++) await probeRoute("rules.json", { token, doc: `/route-${i}.json` });
  status = await probeRoute("probe-status", { token });
  assert(
    status.body.ruleRequests.length === 64,
    `the route must retain exactly 64 docs, got ${status.body.ruleRequests.length}`,
  );
});

Deno.test("one record cannot retain unbounded doc memory", async () => {
  assert(
    typeof globalThis.gc === "function",
    "this case measures retained heap and needs a real GC: run deno task test-speculation-probe-docs",
  );
  const docs = 500;
  const docChars = 8 * 1024;
  const token = `rh7-mem-${crypto.randomUUID().slice(0, 8)}`;

  // Warm up so JIT and buffer pools are not charged to the measurement.
  for (let i = 0; i < 20; i++) {
    await probeRoute("rules.json", { token: "rh7-warm", doc: `/w-${i}` });
  }
  globalThis.gc();
  const before = Deno.memoryUsage().heapUsed;
  for (let i = 0; i < docs; i++) {
    await probeRoute("rules.json", { token, doc: `/${"m".repeat(docChars - 8)}${i}` });
  }
  globalThis.gc();
  const retainedMiB = (Deno.memoryUsage().heapUsed - before) / (1024 * 1024);
  const offeredMiB = (docs * docChars) / (1024 * 1024);

  // At the base commit this retained essentially the whole offer (500 x 8 KiB);
  // now every one of those docs is over the entry limit and is refused, so the
  // record keeps nothing.
  assert(
    retainedMiB < 1,
    `${docs} docs of ${docChars} chars (${offeredMiB.toFixed(1)} MiB offered) retained ${
      retainedMiB.toFixed(2)
    } MiB`,
  );
  console.log(
    `     (offered ${offeredMiB.toFixed(1)} MiB of doc text; retained ${
      retainedMiB.toFixed(2)
    } MiB)`,
  );
});
