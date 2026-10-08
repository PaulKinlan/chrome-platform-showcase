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
// Known limit, stated rather than hidden: a source key is only as good as its
// trust anchor. An attacker with many distinct addresses, or one who can rotate
// the key, gets the full budget per key. A global cap would fix that by making one
// attacker's flood everyone's problem — which is the shared denial this design is
// required to avoid — so the trade is deliberate.

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
 * `remoteAddr` is the socket peer, which the client cannot forge, so it is
 * preferred. `x-forwarded-for` is client-supplied: only the RIGHTMOST entry is
 * added by the proxy in front of us, and the leftmost entry is the classic
 * rate-limit bypass, so anything the client could have written is ignored. If
 * neither is available every such request shares one bucket — which delays but
 * never bans, so the failure mode is a wait rather than a lockout.
 */
export function sourceKeyFrom(headers: Headers, remoteAddr?: string | null): string {
  const peer = (remoteAddr ?? "").trim();
  if (peer) return peer.slice(0, AUTH_THROTTLE_KEY_MAX_CHARS);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    const rightmost = hops[hops.length - 1];
    if (rightmost) return rightmost.slice(0, AUTH_THROTTLE_KEY_MAX_CHARS);
  }
  return "unknown";
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
