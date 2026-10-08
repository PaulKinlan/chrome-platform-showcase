// Bounded, expiring record store for the Speculation-Rules CSP probe
// (bead chrome_platform_showcase-vu7, from the 1e5 review).
//
// The probe keeps one record per client token for five minutes. The original
// implementation was a plain Map that was swept **in full on every access**, so
// each request cost O(n) and ingesting n requests cost O(n^2), and nothing
// capped n at all: measured on the route, the average access took 0.20 ms with
// the store near 5,500 entries and 0.97 ms near 19,500, and 4,000 distinct
// tokens retained 1.32 MiB with the only bound being the five-minute TTL.
//
// Both exposures are fixed by one property of the data: records are inserted
// with a non-decreasing `createdAt` and are never re-inserted on access, so Map
// insertion order IS age order (spec: re-setting an existing key keeps its
// original position, and this store only sets on insert). Expiry can therefore
// stop at the first live entry instead of scanning to the end, and cap eviction
// can take from the front. The store keeps the Map it is given — the route's own
// Map — so the invariants are testable against an instrumented Map and a fake
// clock without any injection hooks in the route.

/** How long a probe record is kept (unchanged from the original implementation). */
export const SPECULATION_RULES_PROBE_TTL_MS = 5 * 60 * 1000;

// Concurrent probe tokens in a five-minute window. A demo page load uses one to
// three tokens, so this is far beyond a demo or a theatre, while the worst-case
// retained size stays small (512 records of a few hundred bytes).
export const SPECULATION_RULES_PROBE_MAX_RECORDS = 512;

export interface AgedProbeRecord {
  createdAt: number;
}

/**
 * Drop expired records and report how many entries were visited.
 *
 * Relies on insertion order being age order, so it stops at the first live
 * record: a store with 50,000 live records costs one visit per access rather
 * than 50,000. The returned visit count exists so tests can assert that bound
 * without timing anything.
 */
export function sweepExpiredProbeRecords<V extends AgedProbeRecord>(
  records: Map<string, V>,
  now: number,
  ttlMs: number = SPECULATION_RULES_PROBE_TTL_MS,
): number {
  let visits = 0;
  for (const [key, record] of records) {
    visits += 1;
    if (now - record.createdAt <= ttlMs) break;
    records.delete(key);
  }
  return visits;
}

/**
 * Evict oldest-first until at most `maxRecords` remain, reporting how many went.
 *
 * The cap is independent of the TTL: a record younger than the TTL is still
 * evicted once the store is full, which is the price of a hard memory bound. The
 * cap is set high enough that a demo flow never reaches it.
 */
export function evictOldestProbeRecords<V>(
  records: Map<string, V>,
  maxRecords: number = SPECULATION_RULES_PROBE_MAX_RECORDS,
): number {
  let removed = 0;
  while (records.size > Math.max(1, maxRecords)) {
    const oldest = records.keys().next();
    if (oldest.done) break;
    records.delete(oldest.value);
    removed += 1;
  }
  return removed;
}
