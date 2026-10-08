// Per-source failure throttling for the telemetry admin surface
// (bead chrome_platform_showcase-3er).
//
// Measured before this existed, against a local server over real HTTP: one
// unauthenticated client spent ~6,750 credential guesses per second across
// /telemetry/demo/{events,admin,triage,reset} with nothing metered — every
// response was a 401 with no Retry-After, about 583M guesses/day. The endpoints
// are public, so online guessing was limited only by the operator's password.
//
// This throttles FAILURES per source. It has to satisfy all of these at once:
//
//   - per source, so one client cannot spend another client's budget;
//   - no shared denial: a source over budget waits; it does not stop anyone else;
//   - no self-lockout: the refusal is a delay, never a ban, and a VALID credential
//     always clears the record — so an operator cannot be shut out by their own
//     fumbling, or by someone else's flood from a shared address;
//   - bounded memory: the map is capped and idle sources are dropped, the key is
//     length-capped, and no per-source state can grow without both;
//   - no new information: an over-budget refusal is identical whether or not a
//     password is configured, and no credential is ever logged or echoed.
//
// The bucket refills, so an over-budget source may still make one comparison per
// refill interval. That is deliberate: it is what lets a legitimate operator whose
// address is shared with an attacker (a proxy, a NAT, a corporate egress) retry
// successfully after the interval instead of being permanently locked out, while
// still capping an attacker to one guess per interval per source.
//
// Two limits are stated rather than hidden.
//
// 1. A source key is only as good as its trust anchor. The key is the socket peer
//    and nothing else — never a request header, which the client chooses. So a
//    client the platform cannot attribute (no peer) shares the "unknown" bucket with
//    every other such client, and an attacker with many distinct addresses gets a
//    full budget per address. A global cap would fix the latter by making one
//    attacker's flood everyone's problem — the shared denial this design is required
//    to avoid — so the trade is deliberate.
//
// 2. Recovery is guaranteed when a flood stops, not while it continues. A source
//    over budget under a continuous flood of failures from the same address — an
//    attacker behind the operator's own NAT or proxy, say — can consume each
//    refilled token before the operator's own attempt arrives, so the operator is
//    not guaranteed a comparison at any finite time while that flood lasts. No
//    source-keyed throttle can tell those two clients apart without a second
//    identity, so this is inherent to the approach rather than an oversight. The
//    escape hatches: the buckets are in memory, so restarting the service restores
//    access immediately, and a separately trusted operator channel can be added if
//    a hard guarantee is ever needed. Recovery after the flood stops is verified;
//    recovery *during* a flood is not claimed.

export const AUTH_THROTTLE_MAX_FAILURES = 10;
export const AUTH_THROTTLE_REFILL_MS = 10_000;
export const AUTH_THROTTLE_MAX_SOURCES = 512;
export const AUTH_THROTTLE_SOURCE_TTL_MS = 60 * 60 * 1000;
export const AUTH_THROTTLE_KEY_MAX_CHARS = 64;

export type ThrottleDecision = { allowed: true } | {
  allowed: false;
  retryAfterSeconds: number;
};

type Bucket = { tokens: number; updatedAt: number };

/**
 * Which source does this request come from?
 *
 * The socket peer, and nothing else. A request header must never be used:
 * `x-forwarded-for` is client-supplied, so keying on it would let one client rotate
 * its own key and spend a fresh budget per request — a throttle bypassable by the
 * very attacker it exists to stop, which is worse than no throttle because it looks
 * like protection. The deployment is therefore required to expose a peer address
 * (Deno Deploy does, and so does the local runtime). When it does not, every such
 * request shares one bucket: visible, and never bypassable.
 */
export function sourceKeyFrom(remoteAddr?: string | null): string {
  const peer = (remoteAddr ?? "").trim();
  return peer ? peer.slice(0, AUTH_THROTTLE_KEY_MAX_CHARS) : "unknown";
}

export interface AuthThrottleOptions {
  maxFailures?: number;
  refillMs?: number;
  maxSources?: number;
  ttlMs?: number;
  now?: () => number;
}

export function createAuthThrottle(options: AuthThrottleOptions = {}) {
  const maxFailures = options.maxFailures ?? AUTH_THROTTLE_MAX_FAILURES;
  const refillMs = options.refillMs ?? AUTH_THROTTLE_REFILL_MS;
  const maxSources = options.maxSources ?? AUTH_THROTTLE_MAX_SOURCES;
  const ttlMs = options.ttlMs ?? AUTH_THROTTLE_SOURCE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  function refill(bucket: Bucket, at: number): void {
    const elapsed = at - bucket.updatedAt;
    if (elapsed < refillMs) return;
    const gained = Math.floor(elapsed / refillMs);
    bucket.tokens = Math.min(maxFailures, bucket.tokens + gained);
    bucket.updatedAt += gained * refillMs;
  }

  function evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, bucket] of buckets) {
      if (bucket.updatedAt < oldestAt) {
        oldestAt = bucket.updatedAt;
        oldestKey = key;
      }
    }
    if (oldestKey !== null) buckets.delete(oldestKey);
  }

  function bucketFor(key: string, at: number): Bucket {
    const existing = buckets.get(key);
    if (existing) {
      // An idle source is dropped rather than remembered: its bucket would have
      // refilled to full anyway, so keeping it only spends memory.
      if (at - existing.updatedAt > ttlMs) buckets.delete(key);
      else return existing;
    }
    if (buckets.size >= maxSources) evictOldest();
    const fresh: Bucket = { tokens: maxFailures, updatedAt: at };
    buckets.set(key, fresh);
    return fresh;
  }

  return {
    /** May this source attempt authentication at all right now? */
    check(key: string): ThrottleDecision {
      const at = now();
      const bucket = bucketFor(key, at);
      refill(bucket, at);
      if (bucket.tokens > 0) return { allowed: true };
      const waitMs = bucket.updatedAt + refillMs - at;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
    },
    /** Count a failed authentication. */
    recordFailure(key: string): void {
      const at = now();
      const bucket = bucketFor(key, at);
      refill(bucket, at);
      bucket.tokens = Math.max(0, bucket.tokens - 1);
    },
    /**
     * Forget everything about a source that authenticated successfully. A valid
     * credential must never be punished for earlier failures from the same address.
     */
    recordSuccess(key: string): void {
      buckets.delete(key);
    },
    /** Live source count, for tests and for the bounded-memory assertion. */
    size(): number {
      return buckets.size;
    },
    /** Drop all state. Used by tests; safe to call at any time. */
    reset(): void {
      buckets.clear();
    },
  };
}

/**
 * The instance the telemetry route uses. Exported so tests can drive it
 * deterministically instead of waiting out real refill intervals.
 */
export const telemetryAuthThrottle = createAuthThrottle();
