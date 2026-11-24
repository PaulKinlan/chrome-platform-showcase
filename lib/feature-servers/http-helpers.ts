// Shared, host-independent HTTP/crypto helpers for co-located feature
// `_server.ts` handlers and multi-milestone helpers in `lib/feature-servers/`.
// Must remain strictly Workers-compatible (no node:fs/http/process.env/Deno.*).

export type AssetReader = (release: string, sub: string) => Promise<Response | null>;

export interface FeatureServerContext {
  release: string;
  readReleaseAsset: AssetReader;
}

export type FeatureServerHandler = (
  req: Request,
  sub: string,
  ctx?: FeatureServerContext,
) => Response | Promise<Response | null> | null;

/** Byte cap for demo JSON/form POST bodies on public endpoints. */
export const DEMO_BODY_LIMIT = 1024 * 1024;

/** Byte cap for telemetry-family POST bodies, matching the demo telemetry contract. */
export const TELEMETRY_BODY_LIMIT = 128 * 1024;

export function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

export function withHeaders(
  response: Response,
  extraHeaders: Record<string, string>,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function appendVary(headers: Headers, value: string): void {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }
  const parts = existing.split(",").map((part) => part.trim().toLowerCase());
  if (!parts.includes(value.toLowerCase())) {
    headers.set("vary", `${existing}, ${value}`);
  }
}

export function clampNumber(
  value: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomBase64Url(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function parseCookies(req: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, rawValue.join("="));
  }
  return cookies;
}

export async function sha256Base64(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function sha384Sri(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-384", toArrayBuffer(bytes)));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return `sha384-${btoa(binary)}`;
}
