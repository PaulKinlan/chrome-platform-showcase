// Deno KV-shaped adapter over a Cloudflare D1 database.
//
// The telemetry routes (routes/demo-telemetry.ts: /telemetry/demo, the
// Reporting API endpoint /telemetry/demo/report, triage; and the v151 DPO
// sidecar) were written against Deno KV. On Workers they store into D1 through
// this adapter, unchanged. D1 rather than Workers KV because telemetry is
// write-heavy and read newest-first: D1 has no 1,000-writes/day free cap, its
// reads are strongly consistent, and `reverse` + `limit` is one indexed query
// instead of listing every key.
//
// Schema: migrations/0001_kv.sql. Keys use worker/kv.ts's order-preserving
// encoding, so `ORDER BY key` is Deno KV order and a prefix is a key range.
// Expired rows are hidden on read and swept opportunistically on write.

import type { MinimalKv } from "../lib/platform.ts";
import { decodeKey, encodeKey, KEY_SEPARATOR } from "./kv.ts";

export interface D1PreparedLike {
  bind(...values: unknown[]): D1PreparedLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedLike;
}

// One past the separator: every key that starts with `prefix + SEP` sorts
// below `prefix + END`.
const RANGE_END = String.fromCharCode(KEY_SEPARATOR.charCodeAt(0) + 1);
const SWEEP_EVERY = 200;

export function d1Kv(db: D1DatabaseLike): MinimalKv {
  let writes = 0;
  const now = () => Date.now();
  return {
    async get<T>(key: unknown[]) {
      const row = await db
        .prepare("SELECT value FROM kv WHERE key = ?1 AND (expires_at IS NULL OR expires_at > ?2)")
        .bind(encodeKey(key), now())
        .first<{ value: string }>();
      return { key, value: row ? (JSON.parse(row.value) as T) : null };
    },
    async set(key, value, options) {
      const expiresAt = options?.expireIn ? now() + options.expireIn : null;
      await db
        .prepare(
          "INSERT INTO kv (key, value, expires_at) VALUES (?1, ?2, ?3) " +
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at",
        )
        .bind(encodeKey(key), JSON.stringify(value), expiresAt)
        .run();
      if (++writes % SWEEP_EVERY === 0) {
        await db.prepare("DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= ?1")
          .bind(now()).run().catch(() => {});
      }
      return { ok: true };
    },
    async delete(key) {
      await db.prepare("DELETE FROM kv WHERE key = ?1").bind(encodeKey(key)).run();
    },
    list<T>(selector: { prefix: unknown[] }, options?: { reverse?: boolean; limit?: number }) {
      return {
        async *[Symbol.asyncIterator]() {
          const base = selector.prefix.length ? encodeKey(selector.prefix) + KEY_SEPARATOR : "";
          const lo = base;
          const hi = base ? encodeKey(selector.prefix) + RANGE_END : "￿";
          const order = options?.reverse ? "DESC" : "ASC";
          const limit = Math.min(options?.limit ?? 1_000_000, 1_000_000);
          // Page so a large scan never materialises in one result set.
          const PAGE = 500;
          let cursor: string | null = null;
          let yielded = 0;
          while (yielded < limit) {
            const take = Math.min(PAGE, limit - yielded);
            const after = cursor === null ? "" : options?.reverse ? "AND key < ?4" : "AND key > ?4";
            const stmt: D1PreparedLike = db.prepare(
              `SELECT key, value FROM kv WHERE key >= ?1 AND key < ?2 ` +
                `AND (expires_at IS NULL OR expires_at > ?3) ${after} ` +
                `ORDER BY key ${order} LIMIT ${take}`,
            );
            const query: D1PreparedLike = cursor === null
              ? stmt.bind(lo, hi, now())
              : stmt.bind(lo, hi, now(), cursor);
            const page: { results: { key: string; value: string }[] } = await query.all<
              { key: string; value: string }
            >();
            const results = page.results;
            for (const row of results) {
              yielded++;
              yield { key: decodeKey(row.key), value: JSON.parse(row.value) as T };
            }
            if (results.length < take) return;
            cursor = results[results.length - 1].key;
          }
        },
      };
    },
  };
}
