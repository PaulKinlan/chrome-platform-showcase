-- Deno KV-shaped store for the telemetry routes on Cloudflare (worker/d1.ts).
-- `key` is worker/kv.ts's order-preserving encoding of a Deno KV key array, so
-- ORDER BY key is Deno KV order and a key prefix is a contiguous range.
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER -- epoch ms; NULL = never
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS kv_expires_at ON kv (expires_at) WHERE expires_at IS NOT NULL;
