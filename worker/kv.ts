// Deno KV-shaped adapter over a Cloudflare Workers KV namespace, plus the
// order-preserving key encoding shared with the D1 adapter (worker/d1.ts).
//
// The Worker uses D1 (SHOWCASE_DB) for telemetry when it is bound and falls
// back to this Workers KV adapter (SHOWCASE_KV) only if D1 is not.
//
// The telemetry routes (routes/demo-telemetry.ts, the v151 DPO sidecar) were
// written against Deno KV: array keys, prefix listing, newest-first listing
// with `reverse`, `expireIn`. This maps that subset onto Workers KV so they run
// unchanged.
//
// Key encoding keeps Deno KV's ordering under Workers KV's byte-wise ordering:
// each part is tagged by type, numbers are encoded as order-preserving hex of
// their float64 bits, strings are escaped so the separator never appears
// inside a part. A prefix list is then a plain Workers KV prefix list.
//
// Limits worth knowing (Workers KV, not this adapter): writes are eventually
// consistent across locations (~60s), the free plan allows 1,000 writes/day,
// and `reverse` has to read every key under the prefix before taking `limit`.
// High-volume telemetry would sit better in D1 or Analytics Engine.

import type { MinimalKv } from "../lib/platform.ts";

export interface KVNamespaceLike {
  get(key: string, type: "text"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

const SEP = "\u001f";
/** Joins encoded key parts; a prefix list matches `encodeKey(prefix) + KEY_SEPARATOR`. */
export const KEY_SEPARATOR = SEP;
const ESC = "\u001e";

function encodeNumber(n: number): string {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, n);
  let bits = view.getBigUint64(0);
  // Flip so unsigned byte order matches numeric order: negatives invert all
  // bits, non-negatives set the sign bit.
  bits = bits & (1n << 63n) ? ~bits & 0xffffffffffffffffn : bits | (1n << 63n);
  return bits.toString(16).padStart(16, "0");
}

function decodeNumber(hex: string): number {
  let bits = BigInt(`0x${hex}`);
  bits = bits & (1n << 63n) ? bits & ~(1n << 63n) : ~bits & 0xffffffffffffffffn;
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}

function encodePart(part: unknown): string {
  if (typeof part === "number") return `n${encodeNumber(part)}`;
  if (typeof part === "bigint") return `b${part.toString()}`;
  if (typeof part === "boolean") return part ? "t" : "f";
  const text = String(part);
  return `s${text.replaceAll(ESC, `${ESC}${ESC}`).replaceAll(SEP, `${ESC}0`)}`;
}

function decodePart(raw: string): unknown {
  const tag = raw[0];
  const body = raw.slice(1);
  if (tag === "n") return decodeNumber(body);
  if (tag === "b") return BigInt(body);
  if (tag === "t") return true;
  if (tag === "f") return false;
  return body.replaceAll(`${ESC}0`, SEP).replaceAll(`${ESC}${ESC}`, ESC);
}

export function encodeKey(key: unknown[]): string {
  return key.map(encodePart).join(SEP);
}

export function decodeKey(raw: string): unknown[] {
  return raw.split(SEP).map(decodePart);
}

export function cloudflareKv(ns: KVNamespaceLike): MinimalKv {
  return {
    async get<T>(key: unknown[]) {
      const text = await ns.get(encodeKey(key), "text");
      return { key, value: text === null ? null : (JSON.parse(text) as T) };
    },
    async set(key, value, options) {
      const ttl = options?.expireIn
        ? { expirationTtl: Math.max(60, Math.ceil(options.expireIn / 1000)) }
        : undefined;
      await ns.put(encodeKey(key), JSON.stringify(value), ttl);
      return { ok: true };
    },
    async delete(key) {
      await ns.delete(encodeKey(key));
    },
    list<T>(selector: { prefix: unknown[] }, options?: { reverse?: boolean; limit?: number }) {
      return {
        async *[Symbol.asyncIterator]() {
          const prefix = selector.prefix.length ? encodeKey(selector.prefix) + SEP : "";
          const limit = options?.limit ?? Infinity;
          const names: string[] = [];
          let cursor: string | undefined;
          do {
            const page = await ns.list({ prefix, cursor, limit: 1000 });
            for (const k of page.keys) names.push(k.name);
            cursor = page.list_complete ? undefined : page.cursor;
            // Ascending listings can stop as soon as `limit` keys are known.
            if (!options?.reverse && names.length >= limit) break;
          } while (cursor);
          if (options?.reverse) names.reverse();
          let yielded = 0;
          for (const name of names) {
            if (yielded >= limit) return;
            const text = await ns.get(name, "text");
            // Listed-then-expired/deleted keys read back null: skip them.
            if (text === null) continue;
            yielded++;
            yield { key: decodeKey(name), value: JSON.parse(text) as T };
          }
        },
      };
    },
  };
}
