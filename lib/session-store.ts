// Bounded, expiring keyed store for client-scoped demo sessions.
//
// The release fixtures keep per-client session state in module-level Maps keyed
// by values a client controls (a `?session=` query value, or a session id the
// server put in a cookie). A plain Map grows without limit: every unrecognised
// cookie or novel query value mints an entry that is never dropped, and the
// prefetch monitor accepted an arbitrarily long session key. That is an
// unbounded-memory path driven entirely by request input (2026-10-08 audit,
// bead chrome_platform_showcase-1e5).
//
// BoundedSessionStore keeps the same Map-facing API (`get`/`set`/`has`/`delete`)
// so call sites do not change shape, and adds three bounds:
//   - a maximum key length: longer keys are refused, so an untrusted value can
//     never become a stored key (`get`/`has` report a miss, `set` is a no-op);
//   - a maximum entry count: the oldest entries are evicted (Map insertion
//     order is the recency order, and `set` re-inserts to mark use);
//   - a time-to-live: entries older than `ttlMs` are dropped on access, so an
//     abandoned session does not pin memory, and a stale client cannot revive
//     a session that the server has already forgotten.
//
// The defaults are deliberately generous for these fixtures: a demo ceremony
// (WebAuthn registration, SPC checkout, DBSC binding) must survive a whole
// user-visible flow, and 512 concurrent sessions is far beyond what a
// single-user demo produces.

export const SESSION_STORE_MAX_ENTRIES = 512;
export const SESSION_STORE_TTL_MS = 6 * 60 * 60 * 1000;
export const SESSION_KEY_MAX_LENGTH = 128;

export interface BoundedSessionStoreOptions {
  /** Maximum retained entries; the oldest are evicted first. */
  maxEntries?: number;
  /** Retain an entry for at most this long after it was last written. */
  ttlMs?: number;
  /** Keys longer than this are refused rather than stored. */
  maxKeyLength?: number;
  /** Clock, injectable so expiry can be tested without waiting. */
  now?: () => number;
}

interface StoredEntry<V> {
  value: V;
  storedAt: number;
}

export class BoundedSessionStore<V> {
  readonly maxEntries: number;
  readonly ttlMs: number;
  readonly maxKeyLength: number;
  #entries = new Map<string, StoredEntry<V>>();
  #now: () => number;

  constructor(options: BoundedSessionStoreOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? SESSION_STORE_MAX_ENTRIES);
    this.ttlMs = Math.max(1, options.ttlMs ?? SESSION_STORE_TTL_MS);
    this.maxKeyLength = Math.max(1, options.maxKeyLength ?? SESSION_KEY_MAX_LENGTH);
    this.#now = options.now ?? (() => Date.now());
  }

  /** Number of live entries (expired entries are dropped first). */
  get size(): number {
    this.#sweep();
    return this.#entries.size;
  }

  #acceptableKey(key: string): boolean {
    return key.length > 0 && key.length <= this.maxKeyLength;
  }

  #isExpired(entry: StoredEntry<V>, now: number): boolean {
    return now - entry.storedAt >= this.ttlMs;
  }

  #expire(key: string): void {
    const entry = this.#entries.get(key);
    if (entry && this.#isExpired(entry, this.#now())) this.#entries.delete(key);
  }

  /** Drop expired entries, then evict oldest until within the entry cap. */
  #sweep(): void {
    const now = this.#now();
    for (const [key, entry] of this.#entries) {
      if (this.#isExpired(entry, now)) this.#entries.delete(key);
    }
    while (this.#entries.size > this.maxEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done) break;
      this.#entries.delete(oldest.value);
    }
  }

  has(key: string): boolean {
    if (!this.#acceptableKey(key)) return false;
    this.#expire(key);
    return this.#entries.has(key);
  }

  get(key: string): V | undefined {
    if (!this.#acceptableKey(key)) return undefined;
    this.#expire(key);
    return this.#entries.get(key)?.value;
  }

  set(key: string, value: V): this {
    if (!this.#acceptableKey(key)) return this;
    // Re-insert so insertion order tracks recency (a write marks the entry as
    // used and moves it to the most-recent end of the eviction order).
    this.#entries.delete(key);
    this.#entries.set(key, { value, storedAt: this.#now() });
    this.#sweep();
    return this;
  }

  delete(key: string): boolean {
    return this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }
}
