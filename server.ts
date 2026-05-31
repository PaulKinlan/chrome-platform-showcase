// chrome-platform-showcase
// Deno HTTP entry. The index and each release page are rendered live from the
// chromestatus.com JSON API so the catalogue always reflects what's currently
// shipping. Per-feature demos live as static files inside the matching /v<N>/
// folder once they've been built.

import {
  Channel,
  Channels,
  chromeStatusUrl,
  FeatureSummary,
  getChannels,
  getMilestoneFeatures,
  MilestoneFeatures,
  slugify,
} from "./lib/chromestatus.ts";

const PORT = Number(Deno.env.get("PORT") ?? 3000);

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  woff2: "font/woff2",
};

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ----- Last-commit info (fetched from GitHub, cached for 5 minutes) -----

interface CommitInfo {
  sha: string;
  shortSha: string;
  date: string;
  htmlUrl: string;
}

const COMMIT_TTL_MS = 5 * 60 * 1000;
let commitCache: { at: number; value: CommitInfo | null } | null = null;

async function getLatestCommit(): Promise<CommitInfo | null> {
  if (commitCache && Date.now() - commitCache.at < COMMIT_TTL_MS) return commitCache.value;
  try {
    const res = await fetch(
      "https://api.github.com/repos/PaulKinlan/chrome-platform-showcase/commits/main",
      { headers: { accept: "application/vnd.github+json" } },
    );
    if (!res.ok) {
      commitCache = { at: Date.now(), value: null };
      return null;
    }
    const data = await res.json();
    const value: CommitInfo = {
      sha: data.sha,
      shortSha: String(data.sha).slice(0, 7),
      date: data.commit?.author?.date ?? data.commit?.committer?.date ?? "",
      htmlUrl: data.html_url,
    };
    commitCache = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

function formatCommitLine(c: CommitInfo | null): string {
  if (!c) return "";
  const when = c.date ? new Date(c.date) : null;
  const relative = when ? relativeTime(when) : "";
  const absolute = when
    ? when.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
    : "";
  return `<p class="updated-line">Last updated ${escapeHTML(relative)} <span class="updated-abs">(${
    escapeHTML(absolute)
  })</span> &middot; commit <a href="${
    escapeHTML(c.htmlUrl)
  }" target="_blank" rel="noopener"><code>${escapeHTML(c.shortSha)}</code></a></p>`;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

async function readPublicAsset(path: string): Promise<Response> {
  try {
    const file = await Deno.readFile("." + path);
    const ext = path.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function readReleaseAsset(release: string, sub: string): Promise<Response | null> {
  if (sub.includes("..")) return null;
  // Trailing slash or path with no extension: serve <path>/index.html.
  let key = sub.replace(/^\/+/, "");
  if (!key) return null;
  if (key.endsWith("/")) key += "index.html";
  else if (!/\.[a-z0-9]+$/i.test(key)) key += "/index.html";

  try {
    const file = await Deno.readFile(`./${release}/${key}`);
    const ext = key.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

function renderReferrerEcho(req: Request): Response {
  const url = new URL(req.url);
  const payload = {
    policy: url.searchParams.get("policy") ?? "default",
    method: req.method,
    referer: req.headers.get("referer") ?? "",
    origin: req.headers.get("origin") ?? "",
    secFetchSite: req.headers.get("sec-fetch-site") ?? "",
    note:
      "This endpoint echoes request metadata so CSS URL request modifier demos can compare per-request referrer behavior.",
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function randomBase64Url(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function parseCookies(req: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, rawValue.join("="));
  }
  return cookies;
}

interface WebAuthnSignalCredential {
  id: string;
  createdAt: string;
  revokedAt: string | null;
  source: "webauthn-create";
}

interface WebAuthnSignalSession {
  id: string;
  userId: string;
  name: string;
  displayName: string;
  challenge: string | null;
  credentials: WebAuthnSignalCredential[];
}

const WEBAUTHN_SIGNAL_COOKIE = "showcase_webauthn_signal";
const webAuthnSignalSessions = new Map<string, WebAuthnSignalSession>();

function getWebAuthnSignalSession(req: Request): {
  session: WebAuthnSignalSession;
  setCookie?: string;
} {
  const cookies = parseCookies(req);
  let id = cookies.get(WEBAUTHN_SIGNAL_COOKIE);
  let setCookie: string | undefined;
  if (!id || !webAuthnSignalSessions.has(id)) {
    id = randomBase64Url(18);
    setCookie = `${WEBAUTHN_SIGNAL_COOKIE}=${id}; Path=/v130/webauthn-signal-api; SameSite=Lax`;
    webAuthnSignalSessions.set(id, {
      id,
      userId: base64UrlEncode(new TextEncoder().encode(`showcase-user-${id}`)),
      name: "alice@example.com",
      displayName: "Alice Example",
      challenge: null,
      credentials: [],
    });
  }
  return { session: webAuthnSignalSessions.get(id)!, setCookie };
}

function webAuthnRpId(req: Request): string {
  const host = new URL(req.url).hostname;
  return host === "0.0.0.0" ? "localhost" : host;
}

function webAuthnSessionPayload(req: Request, session: WebAuthnSignalSession): unknown {
  return {
    rpId: webAuthnRpId(req),
    user: {
      id: session.userId,
      name: session.name,
      displayName: session.displayName,
    },
    credentials: session.credentials,
  };
}

async function renderWebAuthnSignalRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/webauthn-signal-api/")) return null;
  const route = sub.slice("/webauthn-signal-api".length);
  const { session, setCookie } = getWebAuthnSignalSession(req);
  const headers = new Headers();
  if (setCookie) headers.set("set-cookie", setCookie);

  if (route === "/session-state") {
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/register-options") {
    session.challenge = randomBase64Url(32);
    const rpId = webAuthnRpId(req);
    return jsonResponse({
      publicKey: {
        challenge: session.challenge,
        rp: { name: "Chrome Platform Showcase", id: rpId },
        user: {
          id: session.userId,
          name: session.name,
          displayName: session.displayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        attestation: "none",
        timeout: 60000,
      },
    }, { headers });
  }

  if (route === "/register" && req.method === "POST") {
    const body = await req.json();
    const clientData = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body.response?.clientDataJSON ?? "")),
    );
    const expectedOrigin = new URL(req.url).origin;
    if (clientData.type !== "webauthn.create") {
      return jsonResponse({ error: "Expected webauthn.create client data." }, {
        status: 400,
        headers,
      });
    }
    if (!session.challenge || clientData.challenge !== session.challenge) {
      return jsonResponse({ error: "Challenge did not match this server session." }, {
        status: 400,
        headers,
      });
    }
    if (clientData.origin !== expectedOrigin) {
      return jsonResponse({ error: `Origin mismatch: ${clientData.origin}` }, {
        status: 400,
        headers,
      });
    }
    if (!session.credentials.some((credential) => credential.id === body.id)) {
      session.credentials.unshift({
        id: body.id,
        createdAt: new Date().toISOString(),
        revokedAt: null,
        source: "webauthn-create",
      });
    }
    session.challenge = null;
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/revoke" && req.method === "POST") {
    const body = await req.json();
    const credential = session.credentials.find((item) => item.id === body.id);
    if (!credential) {
      return jsonResponse({ error: "Credential not found." }, { status: 404, headers });
    }
    credential.revokedAt = credential.revokedAt ? null : new Date().toISOString();
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/reset" && req.method === "POST") {
    session.challenge = null;
    session.credentials = [];
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  return null;
}

interface DbscSession {
  id: string;
  loginChallenge: string | null;
  refreshChallenge: string | null;
  authorization: string;
  publicKeyJwk: JsonWebKey | null;
  registeredAt: string | null;
  shortCookieValue: string | null;
  shortCookieExpiresAt: number | null;
  events: { at: string; event: string; detail: string }[];
}

const DBSC_LONG_COOKIE = "showcase_dbsc";
const DBSC_SHORT_COOKIE = "showcase_dbsc_short";
const DBSC_DEFAULT_PATH = "/v145/device-bound-session-credentials";
const DBSC_SHORT_COOKIE_MAX_AGE = 90;
const dbscSessions = new Map<string, DbscSession>();

function dbscPath(req: Request): string {
  const pathname = new URL(req.url).pathname;
  return pathname.match(/^\/v\d+\/device-bound-session-credentials/)?.[0] ?? DBSC_DEFAULT_PATH;
}

function dbscCookieAttributes(req: Request, maxAge: number): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=${dbscPath(req)}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function createDbscSession(): DbscSession {
  const id = randomBase64Url(18);
  const session: DbscSession = {
    id,
    loginChallenge: null,
    refreshChallenge: null,
    authorization: `demo-auth-${randomBase64Url(12)}`,
    publicKeyJwk: null,
    registeredAt: null,
    shortCookieValue: null,
    shortCookieExpiresAt: null,
    events: [],
  };
  dbscSessions.set(id, session);
  return session;
}

function getDbscSessionFromRequest(req: Request): DbscSession | null {
  const cookies = parseCookies(req);
  const sessionId = req.headers.get("Sec-Secure-Session-Id") ??
    cookies.get(DBSC_LONG_COOKIE);
  if (!sessionId) return null;
  return dbscSessions.get(sessionId) ?? null;
}

function recordDbscEvent(session: DbscSession, event: string, detail: string) {
  session.events.unshift({ at: new Date().toISOString(), event, detail });
  session.events = session.events.slice(0, 12);
}

function dbscOrigin(req: Request): string {
  return new URL(req.url).origin;
}

function dbscRegistrationHeader(req: Request, session: DbscSession): string {
  return `(ES256);path="${
    dbscPath(req)
  }/register";challenge="${session.loginChallenge}";authorization="${session.authorization}"`;
}

function dbscChallengeHeader(session: DbscSession): string {
  return `"${session.refreshChallenge}";id="${session.id}"`;
}

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

async function verifyDbscJwt(
  jwt: string,
  challenge: string,
  jwk: JsonWebKey | null,
): Promise<{ ok: boolean; publicKeyJwk?: JsonWebKey; error?: string }> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return { ok: false, error: "Proof is not a compact JWT." };

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodeBase64UrlJson(parts[0]);
    payload = decodeBase64UrlJson(parts[1]);
  } catch {
    return { ok: false, error: "Proof header or payload is not valid base64url JSON." };
  }

  if (header.alg !== "ES256") return { ok: false, error: "Only ES256 proofs are accepted." };
  if (header.typ !== "dbsc+jwt") return { ok: false, error: "Proof typ must be dbsc+jwt." };
  if (payload.jti !== challenge) {
    return { ok: false, error: "Proof challenge (jti) did not match this session." };
  }

  const publicKeyJwk = (header.jwk as JsonWebKey | undefined) ?? jwk ?? undefined;
  if (!publicKeyJwk) return { ok: false, error: "Proof did not include a public key." };

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    return { ok: false, error: "Public key JWK could not be imported." };
  }

  const signature = toArrayBuffer(base64UrlDecode(parts[2]));
  const signedBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signature,
    signedBytes,
  );
  return ok ? { ok, publicKeyJwk } : { ok, error: "ECDSA signature verification failed." };
}

function dbscInstructions(req: Request, session: DbscSession): Record<string, unknown> {
  const path = dbscPath(req);
  return {
    session_identifier: session.id,
    refresh_url: `${path}/refresh`,
    scope: {
      origin: dbscOrigin(req),
      include_site: false,
      scope_specification: [{
        type: "include",
        domain: new URL(req.url).hostname,
        path,
      }],
    },
    credentials: [{
      type: "cookie",
      name: DBSC_SHORT_COOKIE,
      attributes: `Path=${path}; HttpOnly; SameSite=Lax`,
    }],
  };
}

function dbscSessionState(req: Request, session: DbscSession | null): Record<string, unknown> {
  const cookies = parseCookies(req);
  const hasShortCookie = Boolean(cookies.get(DBSC_SHORT_COOKIE));
  const shortCookieValid = Boolean(
    session?.shortCookieValue &&
      cookies.get(DBSC_SHORT_COOKIE) === session.shortCookieValue &&
      session.shortCookieExpiresAt &&
      session.shortCookieExpiresAt > Date.now(),
  );
  return {
    hasSession: Boolean(session),
    sessionId: session?.id ?? null,
    registered: Boolean(session?.publicKeyJwk),
    registeredAt: session?.registeredAt ?? null,
    hasShortCookie,
    shortCookieValid,
    shortCookieExpiresAt: session?.shortCookieExpiresAt
      ? new Date(session.shortCookieExpiresAt).toISOString()
      : null,
    pendingLoginChallenge: session?.loginChallenge ?? null,
    pendingRefreshChallenge: session?.refreshChallenge ?? null,
    events: session?.events ?? [],
  };
}

async function requestJson(req: Request): Promise<Record<string, unknown>> {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) return {};
    return await req.json();
  } catch {
    return {};
  }
}

async function renderDbscRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/device-bound-session-credentials/")) return null;
  const route = sub.slice("/device-bound-session-credentials".length);

  if (route === "/login" && req.method === "POST") {
    const session = createDbscSession();
    session.loginChallenge = randomBase64Url(32);
    recordDbscEvent(session, "login", "Issued long-lived cookie and registration header.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_LONG_COOKIE}=${session.id}; ${dbscCookieAttributes(req, 60 * 60 * 24 * 30)}`,
    );
    headers.set("Secure-Session-Registration", dbscRegistrationHeader(req, session));
    return jsonResponse({
      message: "Login accepted. Browser can now register a device-bound session.",
      registrationHeader: dbscRegistrationHeader(req, session),
      challenge: session.loginChallenge,
      authorization: session.authorization,
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/state") {
    return jsonResponse(dbscSessionState(req, getDbscSessionFromRequest(req)));
  }

  if (route === "/register" && req.method === "POST") {
    const session = getDbscSessionFromRequest(req);
    if (!session?.loginChallenge) {
      return jsonResponse({ error: "No DBSC login challenge is pending for this session." }, {
        status: 400,
      });
    }
    const body = await requestJson(req);
    const proof = req.headers.get("Secure-Session-Response") ?? String(body.proof ?? "");
    const verified = await verifyDbscJwt(proof, session.loginChallenge, null);
    if (!verified.ok) {
      recordDbscEvent(session, "register-rejected", verified.error ?? "Proof rejected.");
      return jsonResponse({ error: verified.error }, { status: 400 });
    }

    session.publicKeyJwk = verified.publicKeyJwk ?? null;
    session.registeredAt = new Date().toISOString();
    session.loginChallenge = null;
    session.shortCookieValue = randomBase64Url(18);
    session.shortCookieExpiresAt = Date.now() + DBSC_SHORT_COOKIE_MAX_AGE * 1000;
    recordDbscEvent(session, "registered", "Verified ES256 proof and stored public key.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_SHORT_COOKIE}=${session.shortCookieValue}; ${
        dbscCookieAttributes(req, DBSC_SHORT_COOKIE_MAX_AGE)
      }`,
    );
    return jsonResponse({
      message: "Registration proof verified. Short-lived session cookie issued.",
      proofVerified: true,
      instructions: dbscInstructions(req, session),
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/resource") {
    const session = getDbscSessionFromRequest(req);
    if (!session?.publicKeyJwk) {
      return jsonResponse({ error: "Register a DBSC session before calling this resource." }, {
        status: 401,
      });
    }
    const cookies = parseCookies(req);
    const shortCookieValid = Boolean(
      session.shortCookieValue &&
        cookies.get(DBSC_SHORT_COOKIE) === session.shortCookieValue &&
        session.shortCookieExpiresAt &&
        session.shortCookieExpiresAt > Date.now(),
    );
    if (!shortCookieValid) {
      session.refreshChallenge = randomBase64Url(32);
      recordDbscEvent(session, "resource-blocked", "Short-lived cookie missing or expired.");
      const headers = new Headers();
      headers.set("Secure-Session-Challenge", dbscChallengeHeader(session));
      return jsonResponse({
        error: "Short-lived cookie missing or expired. Refresh proof required.",
        challenge: session.refreshChallenge,
        sessionId: session.id,
        ...dbscSessionState(req, session),
      }, { status: 401, headers });
    }

    recordDbscEvent(session, "resource-ok", "Protected resource accepted the short-lived cookie.");
    return jsonResponse({
      message: "Protected resource returned account data.",
      account: {
        email: "alice@example.com",
        assurance: "device-bound-session",
        generatedAt: new Date().toISOString(),
      },
      ...dbscSessionState(req, session),
    });
  }

  if (route === "/refresh" && req.method === "POST") {
    const body = await requestJson(req);
    const session = getDbscSessionFromRequest(req) ??
      dbscSessions.get(String(body.sessionId ?? ""));
    if (!session?.publicKeyJwk) {
      return jsonResponse({ error: "No registered DBSC session found." }, { status: 401 });
    }
    const proof = req.headers.get("Secure-Session-Response") ?? String(body.proof ?? "");
    if (!proof) {
      session.refreshChallenge = randomBase64Url(32);
      recordDbscEvent(session, "refresh-challenge", "Issued refresh challenge.");
      const headers = new Headers();
      headers.set("Secure-Session-Challenge", dbscChallengeHeader(session));
      return jsonResponse({
        message: "Refresh challenge issued. Sign it with the bound key.",
        challenge: session.refreshChallenge,
        sessionId: session.id,
        ...dbscSessionState(req, session),
      }, { status: 403, headers });
    }

    if (!session.refreshChallenge) {
      return jsonResponse({ error: "No refresh challenge is pending for this session." }, {
        status: 400,
      });
    }

    const verified = await verifyDbscJwt(proof, session.refreshChallenge, session.publicKeyJwk);
    if (!verified.ok) {
      recordDbscEvent(session, "refresh-rejected", verified.error ?? "Proof rejected.");
      return jsonResponse({ error: verified.error }, { status: 403 });
    }

    session.refreshChallenge = null;
    session.shortCookieValue = randomBase64Url(18);
    session.shortCookieExpiresAt = Date.now() + DBSC_SHORT_COOKIE_MAX_AGE * 1000;
    recordDbscEvent(session, "refreshed", "Verified refresh proof and reissued short cookie.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_SHORT_COOKIE}=${session.shortCookieValue}; ${
        dbscCookieAttributes(req, DBSC_SHORT_COOKIE_MAX_AGE)
      }`,
    );
    return jsonResponse({
      message: "Refresh proof verified. Short-lived cookie renewed.",
      proofVerified: true,
      instructions: dbscInstructions(req, session),
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/expire" && req.method === "POST") {
    const session = getDbscSessionFromRequest(req);
    if (!session) return jsonResponse({ error: "No DBSC session found." }, { status: 404 });
    session.shortCookieValue = null;
    session.shortCookieExpiresAt = Date.now() - 1000;
    recordDbscEvent(session, "expired", "Short-lived cookie expired by the demo control.");
    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_SHORT_COOKIE}=; ${dbscCookieAttributes(req, 0)}`,
    );
    return jsonResponse({
      message: "Short-lived cookie expired.",
      ...dbscSessionState(req, session),
    }, { headers });
  }

  if (route === "/reset" && req.method === "POST") {
    const session = getDbscSessionFromRequest(req);
    if (session) {
      dbscSessions.delete(session.id);
    }
    const headers = new Headers();
    headers.append("set-cookie", `${DBSC_LONG_COOKIE}=; ${dbscCookieAttributes(req, 0)}`);
    headers.append("set-cookie", `${DBSC_SHORT_COOKIE}=; ${dbscCookieAttributes(req, 0)}`);
    return jsonResponse({ message: "DBSC demo session reset.", hasSession: false }, { headers });
  }

  return null;
}

const FEDCM_BASE = "/v148/agentic-federated-login/fedcm";
const FEDCM_IDP_COOKIE = "showcase_fedcm_idp";
const FEDCM_CLIENT_ID = "chrome-platform-showcase";
const FEDCM_SECRET = "chrome-platform-showcase-fedcm-demo-secret";

const fedCmAccounts = [
  {
    id: "alice-001",
    given_name: "Alice",
    name: "Alice Example",
    email: "alice@example.com",
    username: "alice",
    approved_clients: [FEDCM_CLIENT_ID],
    login_hints: ["alice@example.com", "alice"],
    domain_hints: ["example.com"],
    label_hints: ["agentic", "developer"],
  },
  {
    id: "casey-002",
    given_name: "Casey",
    name: "Casey Partner",
    email: "casey@partner.example",
    username: "casey",
    approved_clients: [],
    login_hints: ["casey@partner.example", "casey"],
    domain_hints: ["partner.example"],
    label_hints: ["agentic"],
  },
];

function fedCmCookieAttributes(req: Request, maxAge: number): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=/v148/agentic-federated-login; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function fedCmSignedInAccount(req: Request) {
  const accountId = parseCookies(req).get(FEDCM_IDP_COOKIE);
  return fedCmAccounts.find((account) => account.id === accountId) ?? null;
}

async function hmacSha256(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(FEDCM_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

async function signFedCmJwt(payload: Record<string, unknown>): Promise<string> {
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${header}.${body}.${await hmacSha256(`${header}.${body}`)}`;
}

async function verifyFedCmJwt(token: string): Promise<{
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "Token is not a compact JWT." };
  const expected = await hmacSha256(`${parts[0]}.${parts[1]}`);
  if (parts[2] !== expected) return { ok: false, error: "JWT signature did not verify." };
  let payload: Record<string, unknown>;
  try {
    payload = decodeBase64UrlJson(parts[1]);
  } catch {
    return { ok: false, error: "JWT payload is not valid JSON." };
  }
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "JWT is expired.", payload };
  }
  return { ok: true, payload };
}

async function fedCmRequestBody(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await req.text());
  }
  if (contentType.includes("application/json")) {
    const json = await req.json();
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(json)) {
      if (value != null) params.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    return params;
  }
  return new URLSearchParams(await req.text());
}

function fedCmCorsHeaders(req: Request): Headers {
  const headers = new Headers();
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    "content-type, sec-fetch-dest, x-showcase-fedcm-trace",
  );
  return headers;
}

function fedCmProviderUrls(req: Request): Record<string, string> {
  const origin = new URL(req.url).origin;
  return {
    config: `${origin}${FEDCM_BASE}/config.json`,
    accounts: `${origin}${FEDCM_BASE}/accounts`,
    metadata: `${origin}${FEDCM_BASE}/client-metadata`,
    assertion: `${origin}${FEDCM_BASE}/assertion`,
    disconnect: `${origin}${FEDCM_BASE}/disconnect`,
    login: `${origin}${FEDCM_BASE}/login`,
  };
}

function renderFedCmWellKnown(req: Request): Response {
  const urls = fedCmProviderUrls(req);
  return jsonResponse({
    provider_urls: [urls.config],
    accounts_endpoint: urls.accounts,
    login_url: urls.login,
  });
}

async function renderFedCmRoute(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/agentic-federated-login/fedcm/")) return null;
  const route = sub.slice("/agentic-federated-login/fedcm".length);
  const urls = fedCmProviderUrls(req);

  if (req.method === "OPTIONS") return new Response(null, { headers: fedCmCorsHeaders(req) });

  if (route === "/config.json") {
    return jsonResponse({
      accounts_endpoint: urls.accounts,
      client_metadata_endpoint: urls.metadata,
      id_assertion_endpoint: urls.assertion,
      disconnect_endpoint: urls.disconnect,
      login_url: urls.login,
      account_label: "agentic",
      supports_use_other_account: true,
      branding: {
        background_color: "black",
        color: "white",
      },
    });
  }

  if (route === "/login") {
    const url = new URL(req.url);
    const account = fedCmAccounts.find((item) => item.id === url.searchParams.get("account")) ??
      fedCmAccounts[0];
    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${FEDCM_IDP_COOKIE}=${account.id}; ${fedCmCookieAttributes(req, 60 * 60)}`,
    );
    if (req.method === "GET") {
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(
        `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>FedCM demo IdP login</title><link rel="stylesheet" href="/public/styles.css"></head>
<body><main><h1>FedCM demo IdP login</h1><p>Signed in to the showcase IdP as ${
          escapeHTML(account.email)
        }.</p></main></body></html>`,
        {
          headers,
        },
      );
    }
    return jsonResponse({
      message: "IdP session established for FedCM endpoints.",
      account,
      provider: urls.config,
    }, { headers });
  }

  if (route === "/logout" || route === "/disconnect") {
    const headers = fedCmCorsHeaders(req);
    headers.append("set-cookie", `${FEDCM_IDP_COOKIE}=; ${fedCmCookieAttributes(req, 0)}`);
    return jsonResponse({ message: "FedCM IdP session cleared." }, { headers });
  }

  if (route === "/accounts") {
    const headers = fedCmCorsHeaders(req);
    const account = fedCmSignedInAccount(req);
    if (!account) {
      return jsonResponse({
        error: "No IdP session. POST to /fedcm/login first or use the login_url.",
        secFetchDest: req.headers.get("sec-fetch-dest") ?? null,
      }, { status: 401, headers });
    }
    return jsonResponse({
      accounts: [account],
      secFetchDest: req.headers.get("sec-fetch-dest") ?? null,
    }, { headers });
  }

  if (route === "/client-metadata") {
    return jsonResponse({
      privacy_policy_url: `${new URL(req.url).origin}/v148/agentic-federated-login/`,
      terms_of_service_url: `${new URL(req.url).origin}/v148/agentic-federated-login/`,
    }, { headers: fedCmCorsHeaders(req) });
  }

  if (route === "/assertion" && req.method === "POST") {
    const headers = fedCmCorsHeaders(req);
    const account = fedCmSignedInAccount(req);
    if (!account) {
      return jsonResponse({ error: "No signed-in IdP account." }, { status: 401, headers });
    }
    const body = await fedCmRequestBody(req);
    const accountId = body.get("account_id") ?? account.id;
    const clientId = body.get("client_id") ?? FEDCM_CLIENT_ID;
    if (accountId !== account.id) {
      return jsonResponse({ error: "Requested account does not match the IdP session." }, {
        status: 403,
        headers,
      });
    }
    if (clientId !== FEDCM_CLIENT_ID) {
      return jsonResponse({ error: `Unknown client_id: ${clientId}` }, { status: 403, headers });
    }
    const params = (() => {
      const raw = body.get("params");
      if (!raw) return {};
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    })() as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const scope = typeof params.scope === "string" ? params.scope : "openid email profile";
    const scopes = scope.split(/\s+/).filter(Boolean);
    const agent = typeof params.agent === "string" && params.agent ? params.agent : null;
    const delegationRequested = params.delegation === true || params.delegation === "true";
    const token = await signFedCmJwt({
      iss: new URL(req.url).origin,
      aud: clientId,
      sub: account.id,
      email: account.email,
      name: account.name,
      iat: now,
      exp: now + 3600,
      nonce: body.get("nonce") ?? params.nonce ?? null,
      scope,
      agentic: Boolean(agent || delegationRequested),
      ...(agent ? { agent } : {}),
      ...(delegationRequested && agent
        ? {
          sub_delegation: {
            delegatee: agent,
            scopes,
            granted_at: now,
            user_consent: body.get("disclosure_text_shown") === "true",
          },
        }
        : {}),
      origin: req.headers.get("origin") ?? new URL(req.url).origin,
      disclosure_shown_for: body.get("disclosure_shown_for") ?? "",
      is_auto_selected: body.get("is_auto_selected") ?? "false",
    });
    return jsonResponse({ token }, { headers });
  }

  if (route === "/validate" && req.method === "POST") {
    const body = await requestJson(req);
    const result = await verifyFedCmJwt(String(body.token ?? ""));
    return jsonResponse(result, { status: result.ok ? 200 : 400 });
  }

  if (route === "/refresh" && req.method === "POST") {
    const body = await requestJson(req);
    const result = await verifyFedCmJwt(String(body.token ?? ""));
    if (!result.ok || !result.payload) return jsonResponse(result, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    const token = await signFedCmJwt({
      ...result.payload,
      iat: now,
      exp: now + 3600,
      refresh_count: Number(result.payload.refresh_count ?? 0) + 1,
    });
    return jsonResponse({ token, previous: result.payload });
  }

  if (route === "/delegated-api" && req.method === "POST") {
    const body = await requestJson(req);
    const action = String(body.action ?? "");
    const token = String(body.token ?? "");
    const requiredScopes: Record<string, string> = {
      calendar: "calendar.read",
      email: "email.read",
      tasks: "tasks.write",
      admin: "admin.write",
    };
    const result = await verifyFedCmJwt(token);
    if (!result.ok || !result.payload) return jsonResponse(result, { status: 401 });
    const required = requiredScopes[action];
    if (!required) return jsonResponse({ error: `Unknown action: ${action}` }, { status: 400 });
    const delegation = typeof result.payload.sub_delegation === "object" &&
        result.payload.sub_delegation !== null
      ? result.payload.sub_delegation as Record<string, unknown>
      : null;
    if (!delegation) {
      return jsonResponse({
        error: "not_delegated",
        message: "Token is valid, but it does not carry a delegated authority claim.",
      }, { status: 403 });
    }
    const scopes = Array.isArray(delegation.scopes)
      ? delegation.scopes.map((scope) => String(scope)).filter(Boolean)
      : [];
    if (!scopes.includes(required)) {
      return jsonResponse({
        error: "scope_not_delegated",
        required,
        delegated: scopes,
      }, { status: 403 });
    }
    const responses: Record<string, unknown> = {
      calendar: {
        events: [
          { id: "evt1", title: "Team standup", start: "2026-05-31T09:00:00Z" },
          { id: "evt2", title: "Product review", start: "2026-05-31T14:00:00Z" },
        ],
      },
      email: {
        messages: [
          { id: "m1", from: "bob@example.com", subject: "Quarterly report" },
          { id: "m2", from: "carol@example.com", subject: "Re: project update" },
        ],
      },
      tasks: {
        task_id: `tsk_${randomBase64Url(5)}`,
        title: "Follow up on quarterly report",
        status: "created",
      },
    };
    return jsonResponse({
      action,
      required,
      delegated_by: result.payload.email,
      agent: delegation.delegatee,
      result: responses[action],
    });
  }

  return null;
}

function renderV151CapabilityEcho(req: Request): Response {
  const url = new URL(req.url);
  const started = performance.now();
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 0), 0), 1200);
  const scenario = url.searchParams.get("scenario") ?? "balanced";
  const tier = Number(url.searchParams.get("tier") ?? 2);
  const profile = tier >= 4 ? "full-fidelity" : tier >= 2 ? "balanced" : "conservative";
  const payload = {
    scenario,
    requestedTier: tier,
    selectedProfile: profile,
    serverTiming: `app;dur=${Math.round(delay)}, profile;desc="${profile}"`,
    request: {
      method: req.method,
      userAgent: req.headers.get("user-agent") ?? "",
      secFetchMode: req.headers.get("sec-fetch-mode") ?? "",
      secFetchSite: req.headers.get("sec-fetch-site") ?? "",
      accept: req.headers.get("accept") ?? "",
    },
    elapsedMs: Math.round(performance.now() - started + delay),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "server-timing": `app;dur=${Math.round(delay)}, profile;desc="${profile}"`,
    },
  });
}

async function renderV151DelayedEcho(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 80), 0), 2000);
  const label = url.searchParams.get("label") ?? "resource";
  await new Promise((resolve) => setTimeout(resolve, delay));
  return jsonResponse({
    label,
    delay,
    time: new Date().toISOString(),
    request: {
      destination: req.headers.get("sec-fetch-dest") ?? "",
      mode: req.headers.get("sec-fetch-mode") ?? "",
      site: req.headers.get("sec-fetch-site") ?? "",
    },
    note:
      "Use PerformanceResourceTiming to inspect duration, transfer size, Server-Timing, and Chrome 151 service-worker router fields when a static router is active.",
  }, {
    headers: { "server-timing": `edge;dur=${delay};desc="${label}"` },
  });
}

function renderV151PolicyEcho(req: Request): Response {
  const url = new URL(req.url);
  const local = url.searchParams.get("local") ?? "self";
  const loopback = url.searchParams.get("loopback") ?? "self";
  const allow = url.searchParams.get("allow") ?? "none";
  const policy = `local-network=(${local}), loopback-network=(${loopback})`;
  return jsonResponse({
    permissionsPolicy: policy,
    iframeAllow: allow === "trusted" ? "local-network; loopback-network" : "",
    request: {
      origin: req.headers.get("origin") ?? "",
      referer: req.headers.get("referer") ?? "",
      secFetchSite: req.headers.get("sec-fetch-site") ?? "",
    },
    migration: {
      chrome150:
        `Permissions-Policy: direct-sockets-private=(${local}), local-network=(${local}), loopback-network=(${loopback})`,
      chrome151: `Permissions-Policy: ${policy}`,
    },
  }, {
    headers: { "permissions-policy": policy },
  });
}

function renderV151HtmlStream(req: Request): Response {
  const url = new URL(req.url);
  const chunks = Math.min(Math.max(Number(url.searchParams.get("chunks") ?? 6), 1), 12);
  const delay = Math.min(Math.max(Number(url.searchParams.get("delay") ?? 180), 0), 1200);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<article class="stream-item"><h3>stream started</h3>`));
      for (let i = 1; i <= chunks; i++) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        controller.enqueue(
          encoder.encode(
            `<p><strong>Chunk ${i}</strong> arrived after ${delay}ms and can be parsed without buffering the full response.</p>`,
          ),
        );
      }
      controller.enqueue(encoder.encode(`<p><strong>complete</strong></p></article>`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

// ----- Page rendering -----

function statusBadgeFor(channels: Channels, milestone: number): string {
  if (milestone === channels.stable.mstone) return "Stable";
  if (milestone === channels.beta.mstone) return "Beta";
  if (milestone === channels.dev.mstone) return "Dev";
  if (milestone < channels.stable.mstone) return "Released";
  return "Upcoming";
}

async function renderIndex(channels: Channels): Promise<string> {
  const commit = await getLatestCommit();
  // Chromestatus's "stable.mstone" is the *next* stable cut, even when its
  // stable_date is still a few days away. Most users are on stable-1 until
  // the cut lands. Show that release too so the issue stream and the catalogue
  // line up with what's actually deployed.
  const prevStable = channels.stable.mstone - 1;
  const releases: { mstone: number; status: string; date: string }[] = [
    { mstone: channels.dev.mstone, status: "Dev", date: channels.dev.stable_date },
    { mstone: channels.beta.mstone, status: "Beta", date: channels.beta.stable_date },
    {
      mstone: channels.stable.mstone,
      status: "Stable (rolling out)",
      date: channels.stable.stable_date,
    },
    { mstone: prevStable, status: "Stable (live)", date: "" },
  ];

  // Surface any backfilled older releases that have v<N>/ folders too, so a
  // demo for an older Chrome doesn't get hidden just because the channels API
  // no longer mentions it.
  const seen = new Set(releases.map((r) => r.mstone));
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        const m = Number(entry.name.slice(1));
        if (!seen.has(m)) {
          releases.push({ mstone: m, status: "Archive", date: "" });
          seen.add(m);
        }
      }
    }
  } catch {
    // ignore — Deno Deploy can refuse the readDir at root in some isolates.
  }
  releases.sort((a, b) => b.mstone - a.mstone);

  const cards = releases.map((r) => {
    let note: string;
    if (r.date) {
      note = `Stable date: ${
        new Date(r.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      }`;
    } else if (r.status === "Archive") {
      note = "Backfilled";
    } else {
      note = "Most users are here";
    }
    return `<li class="release-card">
      <a class="release-card-link" href="/v${r.mstone}/">
        <span class="release-card-row">
          <span class="release-label">Chrome ${r.mstone}</span>
          <span class="release-status">${escapeHTML(r.status)}</span>
        </span>
        <span class="release-note">${escapeHTML(note)}</span>
      </a>
    </li>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <main>
    <header class="lede-block">
      <p class="eyebrow">work in progress</p>
      <h1>chrome platform showcase</h1>
      <p class="lede">A premium, hand-crafted demo for every new web platform feature shipping in Chrome. One per API. One uber-demo per release. Maintained by an automated routine; reviewed and merged by humans.</p>
      ${formatCommitLine(commit)}
    </header>

    <section>
      <h2>releases</h2>
      <ol class="release-list">${cards}</ol>
      <p class="note">Or jump straight to <a href="/features">the full feature catalogue</a> to search across every release at once. Older Chrome releases will be backfilled as the routine works through the chromestatus archive.</p>
    </section>

    <section class="how">
      <h2>how it works</h2>
      <ol>
        <li>The routine reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">chromestatus.com</a> JSON API for current, upcoming, and backfilled milestones.</li>
        <li>It builds every missing feature directly from the listing name, feature details, specs, docs, samples, and explainers.</li>
        <li>Each feature gets a feature index plus every distinct interactive concept the API needs; 2-3 concepts is a floor, not a cap.</li>
        <li>The routine commits one feature at a time to <code>main</code>. Deno Deploy redeploys from GitHub.</li>
        <li>Humans review the live output and tighten demos, server routes, and the routine prompt as needed.</li>
      </ol>
      <p class="note">Repo: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>.</p>
    </section>

    <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
  </main>
</body>
</html>`;
}

// ----- Categories taxonomy -----
//
// A thematic grouping over features that's coarser than chromestatus's own
// category field. The goal is to let visitors browse by interest area (identity
// & auth, CSS layout, WebGPU, etc.) rather than by chromestatus's own
// engineering-team bucketing.
//
// Per-feature primary category is derived by keyword match against the feature
// name and (as a fallback) the chromestatus category. The first matching
// taxonomy entry wins, so ordering matters: put more specific rules first.

interface Category {
  slug: string;
  label: string;
  blurb: string;
  patterns: RegExp[];
}

const CATEGORIES: Category[] = [
  {
    slug: "identity-and-auth",
    label: "Identity & Auth",
    blurb:
      "Passkeys, WebAuthn, FedCM, Digital Credentials, autofill, payment confirmation, sign-in flows.",
    patterns: [
      /webauthn/i,
      /passkey/i,
      /fedcm/i,
      /\bdbsc\b/i,
      /device.bound.session/i,
      /\bcredential\b/i,
      /autofill/i,
      /publickeycredential/i,
      /payment.confirmation/i,
      /\bspc\b/i,
      /digital.credential/i,
      /email.verification/i,
      /web.install/i,
      /facilitated.payment/i,
      /identity/i,
      /storage.access/i,
      /related.website.set/i,
      /requeststorageaccessfor/i,
    ],
  },
  {
    slug: "on-device-ai",
    label: "On-device AI",
    blurb:
      "Prompt API, Summariser, Translator, Language Detector, Proofreader, Writer, Rewriter, on-device speech.",
    patterns: [
      /prompt.api/i,
      /summari[sz]er/i,
      /translator/i,
      /language.detector/i,
      /proofreader/i,
      /\bwriter.api/i,
      /\brewriter.api/i,
      /language.model/i,
      /on.device/i,
      /web.speech/i,
      /webnn/i,
      /abusive.notif/i,
    ],
  },
  {
    slug: "css-layout",
    label: "CSS Layout",
    blurb:
      "Anchor positioning, container queries, scroll-state, view transitions, reading-flow, focusgroup, carousels.",
    patterns: [
      /anchor.positioning/i,
      /anchor.scope/i,
      /\banchor-size\b/i,
      /container.quer/i,
      /container.name/i,
      /scroll.state/i,
      /scroll.target.group/i,
      /scroll.button/i,
      /scroll.marker/i,
      /scroll.triggered/i,
      /overscroll/i,
      /reading.flow/i,
      /reading.order/i,
      /focusgroup/i,
      /carousel/i,
      /flex.wrap/i,
      /flex.basis/i,
      /grid/i,
      /sideways.writing/i,
      /logical.overflow/i,
      /page.margin.box/i,
      /\b@page\b/i,
    ],
  },
  {
    slug: "css-typography",
    label: "CSS Typography",
    blurb:
      "Text wrap, text-box-trim, font-feature/variation, ruby, font-language-override, font-variant-emoji, line decorations.",
    patterns: [
      /text.wrap/i,
      /text.box/i,
      /font.feature/i,
      /font.variation/i,
      /font.language/i,
      /font.variant.emoji/i,
      /\bruby\b/i,
      /letter.spacing/i,
      /text.decoration/i,
      /text.size.adjust/i,
      /h1.within/i,
      /cursive.scripts/i,
      /textmetrics/i,
      /opentype/i,
      /open.font.format/i,
    ],
  },
  {
    slug: "css-visual",
    label: "CSS Visual",
    blurb:
      "Corner-shape, colour functions, dynamic-range-limit, accent-color, caret-, paint, image, table borders.",
    patterns: [
      /corner.shap/i,
      /squircle/i,
      /superellipse/i,
      /dynamic.range/i,
      /accent.color/i,
      /accentcolor/i,
      /\bcaret\b/i,
      /\b::view-transition/i,
      /currentcolor/i,
      /print.color/i,
      /background.position/i,
      /background.clip/i,
      /box.decoration.break/i,
      /image.rendering/i,
      /smoothing/i,
      /color.fn/i,
      /relative.alpha/i,
      /css.image.color/i,
      /light.dark/i,
      /border.color/i,
      /clip.text/i,
    ],
  },
  {
    slug: "css-functions",
    label: "CSS Functions & Syntax",
    blurb:
      "if(), attr(), counter, sibling-index, custom @function, nesting, @supports/at-rule(), @property, shape(), progress().",
    patterns: [
      /css.if/i,
      /attr\(/i,
      /\bcounter\b/i,
      /sibling.index/i,
      /custom.function/i,
      /custom.functions/i,
      /nesting/i,
      /supports/i,
      /at.rule/i,
      /\b@property\b/i,
      /property.support/i,
      /shape\b.*function/i,
      /progress\(/i,
      /typed.arithmetic/i,
      /sign.related/i,
      /short.circuit/i,
      /name.only/i,
      /comma.separated.container/i,
      /declarative.css.module/i,
      /raw.string/i,
      /style.container/i,
      /named.feature.function/i,
    ],
  },
  {
    slug: "forms-and-input",
    label: "Forms & Input",
    blurb:
      "Customizable <select>, popover, dialog, autofill event, focusgroup, interestfor, invoker commands, keyboard input.",
    patterns: [
      /\bselect\b/i,
      /selectedcontent/i,
      /popover/i,
      /dialog/i,
      /invoker/i,
      /\binterestfor\b/i,
      /\bcommand\b/i,
      /\bhint\b/i,
      /pointer.lock/i,
      /pointer.event/i,
      /pointerrawupdate/i,
      /keyboard/i,
      /virtual.keyboard/i,
      /mouseup/i,
      /click/i,
      /aria/i,
      /focus/i,
      /selection/i,
      /ime/i,
      /editcontext/i,
      /content.editable/i,
      /textarea/i,
      /opaquerange/i,
      /input.event/i,
      /event.handler/i,
      /gamepad/i,
      /spellcheck/i,
      /spelling/i,
    ],
  },
  {
    slug: "privacy-and-security",
    label: "Privacy & Security",
    blurb:
      "CSP, COOP, Document-Isolation-Policy, Local Network Access, partitioning, signature integrity, sandboxing, removals of legacy attack surface.",
    patterns: [
      /\bcsp\b/i,
      /content.security.policy/i,
      /coop\b/i,
      /coep\b/i,
      /document.isolation/i,
      /local.network/i,
      /attribution.report/i,
      /partition/i,
      /\bhsts\b/i,
      /strict.transport/i,
      /private.aggregation/i,
      /shared.storage/i,
      /protected.audience/i,
      /\bpst\b/i,
      /private.state.token/i,
      /\bfenced/i,
      /signature.based.integrity/i,
      /integrity.policy/i,
      /\bsri\b/i,
      /sandboxed/i,
      /isolation/i,
      /noopener/i,
      /allowlist/i,
      /permissions.policy/i,
      /xslt/i,
      /xxe/i,
      /externally.loaded.entities/i,
      /xss/i,
      /clickjack/i,
      /bounce.tracking/i,
      /document.policy/i,
      /visited.links/i,
      /opaque.origin/i,
      /noopener.allow.popups/i,
      /event.interfaces/i,
      /sub.resource.integrity/i,
      /report.to/i,
      /reporting/i,
      /crash.reporting/i,
      /connection.allowlist/i,
      /focus.without.user.activation/i,
      /agentic.federated/i,
    ],
  },
  {
    slug: "webgpu",
    label: "WebGPU",
    blurb:
      "Adapters, devices, textures, buffers, WGSL features, subgroups, dual-source blending, compatibility mode.",
    patterns: [
      /webgpu/i,
      /\bgpu\w*/i,
      /\bwgsl\b/i,
      /subgroup/i,
      /clip.distance/i,
      /uniform.buffer/i,
      /vertex.format/i,
      /texture.compress/i,
      /dual.source/i,
      /externaltexture/i,
      /copybuffer/i,
      /linear.indexing/i,
      /maxinterstage/i,
      /compatibility.mode/i,
      /core.features/i,
      /primitive.index/i,
    ],
  },
  {
    slug: "webassembly",
    label: "WebAssembly",
    blurb: "Wasm features: memory64, branch hints, JSPI, JS String Builtins, custom descriptors.",
    patterns: [
      /webassembly/i,
      /\bwasm\b/i,
      /jspi/i,
      /js.promise.integration/i,
      /custom.descriptors/i,
      /memory64/i,
      /branch.hints/i,
      /js.string.builtins/i,
    ],
  },
  {
    slug: "workers-and-runtime",
    label: "Workers & Runtime",
    blurb:
      "SharedWorker, Dedicated Workers, Service Workers, scheduling, freeze/resume lifecycle, runtime extras.",
    patterns: [
      /sharedworker/i,
      /shared.worker/i,
      /service.worker/i,
      /dedicated.workers?/i,
      /workers?(?!.let|.tablet)/i,
      /scheduler/i,
      /scheduling/i,
      /\bfreez/i,
      /resume/i,
      /background.freeze/i,
      /energy.saver/i,
      /static.router/i,
      /autopreload/i,
      /atomics/i,
      /\bset(interval|timeout)\b/i,
      /explicit.resource.management/i,
      /await.using/i,
      /\busing\b/i,
      /import.maps/i,
      /js.profiling/i,
      /v8.profiler/i,
      /inline.script.cache/i,
      /compile.hints/i,
      /platform.provided.behavior/i,
      /element.internals/i,
      /element.reflection/i,
      /element.scoped/i,
      /element.capture/i,
    ],
  },
  {
    slug: "media-and-realtime",
    label: "Media & Realtime",
    blurb:
      "WebRTC, MediaStream, getDisplayMedia, MediaSession, WebCodecs, MediaRecorder, captured surface, PiP, Speech API.",
    patterns: [
      /webrtc/i,
      /\brtc\b/i,
      /mediastream/i,
      /getdisplaymedia/i,
      /mediasession/i,
      /webcodecs/i,
      /mediarecorder/i,
      /captured.surface/i,
      /picture.in.picture/i,
      /\bpip\b/i,
      /videoframe/i,
      /audio.level/i,
      /audio.context/i,
      /audio.output/i,
      /webaudio/i,
      /audio.worklet/i,
      /h26/i,
      /\bhevc\b/i,
      /h265/i,
      /restrictown/i,
      /windowaudio/i,
      /capabilit.*usermedia/i,
      /usermedia/i,
      /encoded.transform/i,
      /encoded.frame/i,
      /rtp/i,
      /rtcdegradation/i,
      /track.processor/i,
      /webxr/i,
      /xrvisibilit/i,
      /immersive/i,
      /xr/i,
      /captured.pointer/i,
      /facilitated/i,
      /scaleresolution/i,
      /echo.cancellation/i,
    ],
  },
  {
    slug: "storage-and-files",
    label: "Storage & Files",
    blurb:
      "IndexedDB, OPFS, FileSystemObserver, quota, Clipboard, ClipboardItem, blob, file pickers.",
    patterns: [
      /indexeddb/i,
      /\bidb\b/i,
      /storage.quota/i,
      /quota/i,
      /opfs/i,
      /filesystem/i,
      /file.system.access/i,
      /file.system.observer/i,
      /file.api/i,
      /clipboard/i,
      /\bblob\b/i,
      /readablestream/i,
      /writablestream/i,
      /upsert/i,
      /\bclear.site.data/i,
      /persistent/i,
      /storage.access.headers/i,
    ],
  },
  {
    slug: "network-and-loading",
    label: "Network & Loading",
    blurb:
      "Fetch, HTTP cache, No-Vary-Search, Speculation Rules, prerendering, prefetch, sec-purpose, WebTransport, sockets, Smart Card.",
    patterns: [
      /fetch.retry/i,
      /fetch.later/i,
      /fetchlater/i,
      /\bfetch\b/i,
      /no.vary.search/i,
      /speculation.rules/i,
      /prerender/i,
      /prefetch/i,
      /sec.purpose/i,
      /websocket/i,
      /webtransport/i,
      /\btcp\b/i,
      /direct.socket/i,
      /multicast/i,
      /smart.card/i,
      /serial/i,
      /hid/i,
      /\busb\b/i,
      /bluetooth/i,
      /\bhttp\b/i,
      /cookie/i,
      /compression.dictionary/i,
      /shared.brotli/i,
      /shared.zstandard/i,
      /referrer.policy/i,
      /cors/i,
      /cache/i,
      /pervasive/i,
      /preload/i,
      /interest.group/i,
    ],
  },
  {
    slug: "performance-and-timing",
    label: "Performance & Timing",
    blurb:
      "Long Animation Frames, Event Timing, Soft Navigation, render-blocking, freeze, CPU performance, bimodal timings.",
    patterns: [
      /long.animation.frame/i,
      /event.timing/i,
      /soft.navigation/i,
      /interaction.count/i,
      /performance.event/i,
      /performance.api/i,
      /performance.observer/i,
      /render.blocking/i,
      /render.quantum/i,
      /\bfreeze/i,
      /cpu.performance/i,
      /bimodal/i,
      /render.time/i,
      /resource.timing/i,
      /first.response.headers/i,
      /container.timing/i,
      /content.type.in.resource/i,
      /performance.timing/i,
      /preload/i,
      /perf/i,
      /priority/i,
    ],
  },
  {
    slug: "dom-and-interop",
    label: "DOM & Interop",
    blurb:
      "DOM mutation, ranges, parser, navigation API, streaming, Observable, Atomics, async iterators, Intl, Temporal.",
    patterns: [
      /dom/i,
      /document/i,
      /range/i,
      /selection/i,
      /processing.instruction/i,
      /parse.processing/i,
      /streaming/i,
      /html.insertion/i,
      /html.in.canvas/i,
      /observable/i,
      /error.is.error/i,
      /promise/i,
      /\btemporal\b/i,
      /intl\b/i,
      /unicode/i,
      /\bicu\b/i,
      /mirroring/i,
      /idn[a]?/i,
      /relaunch/i,
      /\bxml\b/i,
      /event/i,
      /navigateevent/i,
      /navigation.api/i,
      /\bnavigation\b/i,
      /toggleevent/i,
      /\bdetails/i,
      /hidden.until.found/i,
      /reveal/i,
      /tab.navigation/i,
      /float16/i,
      /uint8array/i,
      /regexp/i,
      /encoding/i,
      /document.subtitle/i,
      /quotaexceeded/i,
      /domexception/i,
      /clonable/i,
      /clone.into/i,
      /selectedcontent/i,
      /shadow.dom/i,
      /shadow.root/i,
      /reference.target/i,
      /aria.element/i,
      /move.before/i,
      /state.preserving/i,
      /idna/i,
      /css.module/i,
      /declarative.css/i,
    ],
  },
  {
    slug: "view-transitions",
    label: "View Transitions",
    blurb:
      "View Transitions API: nested groups, element-scoped, waitUntil, pseudos, finished promise.",
    patterns: [
      /view.transition/i,
      /::view-transition/i,
      /activeviewtransition/i,
      /viewtransition/i,
    ],
  },
  {
    slug: "pwa-and-installability",
    label: "PWA & Installability",
    blurb:
      "Web App Manifest, install elements, scope extensions, Controlled Frame, Isolated Web Apps, window-drag, unframed mode.",
    patterns: [
      /\bpwa\b/i,
      /web.app/i,
      /manifest/i,
      /install.element/i,
      /install.api/i,
      /scope.extensions/i,
      /scope_extensions/i,
      /controlled.frame/i,
      /isolated.web.app/i,
      /unframed/i,
      /window.drag/i,
      /window.controls/i,
      /borderless/i,
      /capture/i,
      /related.apps/i,
      /sub.title/i,
      /document.subtitle/i,
      /related.application/i,
      /user.navigation.capturing/i,
      /origin.migration/i,
    ],
  },
  {
    slug: "removals-and-deprecations",
    label: "Removals & Deprecations",
    blurb:
      "Features the platform is phasing out: deprecated APIs, removed legacy behaviours, paired with replacement guidance.",
    patterns: [
      /deprecat/i,
      /\bremove\b/i,
      /removal/i,
      /removes/i,
      /legacy/i,
      /retire/i,
    ],
  },
  {
    slug: "miscellaneous",
    label: "Miscellaneous",
    blurb: "Features that don't fit a single theme — interop fixes, platform hygiene, niche APIs.",
    patterns: [/.*/i],
  },
];

function slugifyCategory(slug: string): string {
  return slug;
}

function categoryForFeature(name: string, fallbackCategory: string): Category {
  const haystack = `${name} ${fallbackCategory}`;
  for (const cat of CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(name)) return cat;
    }
  }
  for (const cat of CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(haystack)) return cat;
    }
  }
  // Final fallback — should be unreachable because Misc matches /.*/.
  return CATEGORIES[CATEGORIES.length - 1];
}

function categoryTag(category: string): string {
  // Compress some of the chromestatus category names into something readable.
  const short = category
    .replace("In developer trial (Behind a flag)", "Dev Trial")
    .replace("Enabled by default", "Shipped")
    .replace("Origin trial", "Origin Trial")
    .replace("Stepped rollout", "Stepped rollout")
    .replace("Browser Intervention", "Intervention");
  return short;
}

async function featureHasDemo(release: string, feature: FeatureSummary): Promise<boolean> {
  // A feature is "built" once its folder index page exists. The feature index
  // is what the routine writes after each concept page is in place.
  try {
    await Deno.stat(`./${release}/${slugify(feature.name)}/index.html`);
    return true;
  } catch {
    return false;
  }
}

async function renderReleasePage(
  release: string,
  milestone: number,
  channels: Channels,
): Promise<string> {
  let features: MilestoneFeatures;
  try {
    features = await getMilestoneFeatures(milestone);
  } catch (err) {
    return `<!doctype html><html><body><main><h1>Chrome ${milestone}</h1><p>Could not load features: ${
      escapeHTML(String(err))
    }</p></main></body></html>`;
  }

  const status = statusBadgeFor(channels, milestone);
  const sections = await Promise.all(features.groups.map(async (group) => {
    const cards = await Promise.all(group.features.map(async (f) => {
      const hasDemo = await featureHasDemo(release, f);
      const slug = slugify(f.name);
      const summary = (f.summary ?? "").slice(0, 220);
      return `<li class="demo-card">
        <h3><a href="${chromeStatusUrl(f.id)}" target="_blank" rel="noopener">${
        escapeHTML(f.name)
      }</a></h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <span class="tag">${escapeHTML(categoryTag(group.category))}</span>
          ${
        hasDemo
          ? `<a class="tag tag-live" href="/${release}/${slug}/">demo &rarr;</a>`
          : `<span class="tag tag-pending">demo pending</span>`
      }
        </div>
      </li>`;
    }));
    return `<section>
      <h3 class="group-title">${
      escapeHTML(categoryTag(group.category))
    } <span class="group-count">(${group.features.length})</span></h3>
      <ol class="demo-list">${cards.join("")}</ol>
    </section>`;
  }));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome ${milestone} demos — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; all releases</a></p>

  <header class="lede-block">
    <p class="eyebrow">chrome ${milestone} · ${escapeHTML(status.toLowerCase())}</p>
    <h1>chrome ${milestone} platform demos</h1>
    <p class="lede">${features.total} features tracked for Chrome ${milestone}. Each card links to its ChromeStatus entry; the live demos drop in as the routine builds them. A single "uber" demo per release combines several APIs into one larger experience.</p>
  </header>

  <section>
    <h2>uber demo</h2>
    <p>The release-level experience lives at <code>/${release}/uber-demo/</code> when it has been built. Per-feature demos below are built automatically, one feature per commit, and every distinct use case should become an interactive concept page.</p>
  </section>

  <section>
    <h2>features (${features.total})</h2>
    ${sections.join("\n")}
  </section>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- /features (flat, filterable catalogue) -----

async function renderFeaturesCatalogue(channels: Channels): Promise<string> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);

  type Row = {
    mstone: number;
    id: number;
    name: string;
    summary: string;
    category: string;
    hasDemo: boolean;
  };

  const rows: Row[] = [];
  for (const m of known) {
    try {
      const feats = await getMilestoneFeatures(m);
      for (const g of feats.groups) {
        for (const f of g.features) {
          const hasDemo = await featureHasDemo(`v${m}`, f);
          // The catalogue is the index of what's actually been built. Pending
          // features still appear on the per-release pages.
          if (!hasDemo) continue;
          rows.push({
            mstone: m,
            id: f.id,
            name: f.name,
            summary: f.summary ?? "",
            category: g.category,
            hasDemo,
          });
        }
      }
    } catch {
      // skip milestones we can't fetch
    }
  }

  const tableRows = rows.map((r) => {
    const slug = slugify(r.name);
    const cat = categoryTag(r.category);
    const demoCell = r.hasDemo
      ? `<a class="tag tag-live" href="/v${r.mstone}/${slug}/">built &rarr;</a>`
      : `<span class="tag tag-pending">pending</span>`;
    const search = `${r.name} ${r.summary} ${cat} v${r.mstone}`.toLowerCase();
    return `<tr data-search="${escapeHTML(search)}" data-mstone="${r.mstone}" data-status="${
      escapeHTML(cat)
    }" data-built="${r.hasDemo}">
      <td><a href="https://chromestatus.com/feature/${r.id}" target="_blank" rel="noopener">${
      escapeHTML(r.name)
    }</a></td>
      <td><span class="release-status">v${r.mstone}</span></td>
      <td><span class="tag">${escapeHTML(cat)}</span></td>
      <td>${demoCell}</td>
    </tr>`;
  }).join("");

  const mstoneOptions = known.map((m) => `<option value="${m}">v${m}</option>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>all features — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    .filters {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 1rem 0 1.5rem;
      padding: 1rem;
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .filters input, .filters select {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      padding: 0.45rem 0.6rem;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
      outline: none;
    }
    .filters input:focus { box-shadow: var(--thin-shadow); }
    .filters input[type=search] { flex: 1; min-width: 160px; }
    .features-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .features-table th, .features-table td { padding: 0.6rem 0.6rem; text-align: left; border-bottom: 1px solid var(--border-black); vertical-align: top; }
    .features-table th {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: var(--bg-stone);
    }
    .features-table tr.hidden { display: none; }
    .features-table td a { color: var(--text-black); text-decoration: underline; text-underline-offset: 3px; }
    .features-table td a:hover { color: var(--accent-blue); }
    .features-table td .tag, .features-table td .release-status { font-family: var(--font-mono); }
    .features-table td .release-status { background: var(--text-black); color: var(--bg-ivory); padding: 0.15rem 0.5rem; font-size: 0.75rem; }
    .stats { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }

    @media (max-width: 640px) {
      main { padding-left: var(--space-4); padding-right: var(--space-4); }
      .features-table thead { display: none; }
      .features-table, .features-table tbody, .features-table tr, .features-table td {
        display: block;
        width: 100%;
      }
      .features-table tr {
        border: 2px solid var(--border-black);
        background: var(--bg-paper);
        margin-bottom: var(--space-3);
        padding: var(--space-3);
        box-shadow: var(--thin-shadow);
      }
      .features-table td {
        border: none;
        padding: 0.25rem 0;
      }
      .features-table td:first-child { font-weight: 600; padding-bottom: var(--space-2); }
      .features-table td:not(:first-child) {
        display: inline-block;
        margin-right: var(--space-2);
      }
      .filters { padding: var(--space-3); gap: var(--space-2); }
      .filters input, .filters select { flex: 1 1 100%; min-width: 0; }
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>

  <header class="lede-block">
    <p class="eyebrow">catalogue</p>
    <h1>all features</h1>
    <p class="lede">Every feature with a built demo, across every milestone. Filter by name, milestone, or status. Pending features still show up on the per-release pages.</p>
  </header>

  <div class="filters">
    <input type="search" id="q" placeholder="search by name, summary, category">
    <select id="mstone">
      <option value="">all milestones</option>
      ${mstoneOptions}
    </select>
    <select id="status">
      <option value="">any status</option>
      <option value="Shipped">Shipped</option>
      <option value="Origin Trial">Origin Trial</option>
      <option value="Dev Trial">Dev Trial</option>
      <option value="Stepped rollout">Stepped rollout</option>
    </select>
  </div>

  <p class="stats"><span id="visible">${rows.length}</span> / ${rows.length} demos</p>

  <table class="features-table">
    <thead>
      <tr><th>feature</th><th>milestone</th><th>status</th><th>demo</th></tr>
    </thead>
    <tbody id="rows">${tableRows}</tbody>
  </table>

  <script>
    const q = document.getElementById('q');
    const mstone = document.getElementById('mstone');
    const status = document.getElementById('status');
    const rows = document.querySelectorAll('#rows tr');
    const visible = document.getElementById('visible');

    function applyFilter() {
      const qv = q.value.toLowerCase().trim();
      const mv = mstone.value;
      const sv = status.value;
      let count = 0;
      for (const row of rows) {
        const search = row.dataset.search;
        const okq = !qv || search.includes(qv);
        const okm = !mv || row.dataset.mstone === mv;
        const oks = !sv || row.dataset.status === sv;
        const show = okq && okm && oks;
        row.classList.toggle('hidden', !show);
        if (show) count++;
      }
      visible.textContent = count;
    }

    q.addEventListener('input', applyFilter);
    mstone.addEventListener('change', applyFilter);
    status.addEventListener('change', applyFilter);
  </script>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- /categories (explorer index) and /categories/<slug> -----

interface CategorizedRow {
  mstone: number;
  id: number;
  name: string;
  summary: string;
  category: Category;
  hasDemo: boolean;
}

async function collectCategorizedRows(channels: Channels): Promise<CategorizedRow[]> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);
  const rows: CategorizedRow[] = [];
  for (const m of known) {
    try {
      const feats = await getMilestoneFeatures(m);
      // Chromestatus puts the same feature in multiple groups when it's under
      // several statuses (e.g. "Origin trial" + "In developer trial"). Dedupe
      // by (milestone, slug) so we don't list the same demo twice on the
      // category page.
      const seen = new Set<string>();
      for (const g of feats.groups) {
        for (const f of g.features) {
          const slug = slugify(f.name);
          const key = `${m}:${slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const hasDemo = await featureHasDemo(`v${m}`, f);
          rows.push({
            mstone: m,
            id: f.id,
            name: f.name,
            summary: f.summary ?? "",
            category: categoryForFeature(f.name, g.category),
            hasDemo,
          });
        }
      }
    } catch {
      // skip milestones we can't fetch
    }
  }
  return rows;
}

async function renderCategoriesIndex(channels: Channels): Promise<string> {
  const rows = await collectCategorizedRows(channels);
  const byCategory = new Map<string, CategorizedRow[]>();
  for (const cat of CATEGORIES) byCategory.set(cat.slug, []);
  for (const row of rows) {
    if (!row.hasDemo) continue; // only count built features
    byCategory.get(row.category.slug)!.push(row);
  }

  const tiles = CATEGORIES
    .filter((c) => (byCategory.get(c.slug) ?? []).length > 0)
    .map((c) => {
      const count = byCategory.get(c.slug)!.length;
      return `<li class="category-tile">
        <a href="/categories/${c.slug}/">
          <h3>${escapeHTML(c.label)}</h3>
          <p class="category-blurb">${escapeHTML(c.blurb)}</p>
          <p class="category-count">${count} ${count === 1 ? "demo" : "demos"}</p>
        </a>
      </li>`;
    }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>browse by category — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    .category-grid {
      list-style: none;
      padding: 0;
      margin: var(--space-5) 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-4);
    }
    .category-tile {
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--flat-shadow);
      transition: transform 80ms ease, box-shadow 80ms ease;
    }
    .category-tile:hover { transform: translate(-2px, -2px); box-shadow: var(--flat-shadow-hover); }
    .category-tile a {
      display: block;
      padding: var(--space-4);
      text-decoration: none;
      color: var(--text-black);
    }
    .category-tile h3 {
      margin: 0 0 var(--space-2);
      font-family: var(--font-display);
      font-size: 1.4rem;
      letter-spacing: -0.01em;
    }
    .category-blurb {
      margin: 0 0 var(--space-3);
      font-family: var(--font-serif);
      color: var(--text-charcoal);
      line-height: 1.5;
      font-size: 0.95rem;
    }
    .category-count {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>

  <header class="lede-block">
    <p class="eyebrow">explore</p>
    <h1>browse by category</h1>
    <p class="lede">Demos grouped by theme. Identity bundles passkeys + WebAuthn + FedCM + autofill. On-device AI bundles Prompt + Summariser + Translator + speech. Drill into any category to see every demo, grouped by milestone.</p>
  </header>

  <ol class="category-grid">${tiles}</ol>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

async function renderCategoryPage(slug: string, channels: Channels): Promise<string | null> {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return null;
  const rows = await collectCategorizedRows(channels);
  const matching = rows.filter((r) => r.category.slug === slug);
  if (matching.length === 0) return null;

  // Group by milestone, descending.
  matching.sort((a, b) => b.mstone - a.mstone || a.name.localeCompare(b.name));
  const byMstone = new Map<number, CategorizedRow[]>();
  for (const r of matching) {
    if (!byMstone.has(r.mstone)) byMstone.set(r.mstone, []);
    byMstone.get(r.mstone)!.push(r);
  }

  const milestoneSections = [...byMstone.entries()].map(([m, rs]) => {
    const cards = rs.map((r) => {
      const slugged = slugify(r.name);
      const summary = (r.summary ?? "").slice(0, 220);
      return `<li class="demo-card">
        <h3>${
        r.hasDemo
          ? `<a href="/v${r.mstone}/${slugged}/">${escapeHTML(r.name)}</a>`
          : escapeHTML(r.name)
      }</h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <a class="tag" href="https://chromestatus.com/feature/${r.id}" target="_blank" rel="noopener">chromestatus</a>
          ${
        r.hasDemo
          ? `<a class="tag tag-live" href="/v${r.mstone}/${slugged}/">demo &rarr;</a>`
          : `<span class="tag tag-pending">demo pending</span>`
      }
        </div>
      </li>`;
    }).join("");
    return `<section>
      <h3 class="group-title">Chrome ${m} <span class="group-count">(${rs.length})</span></h3>
      <ol class="demo-list">${cards}</ol>
    </section>`;
  }).join("\n");

  const builtCount = matching.filter((r) => r.hasDemo).length;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(cat.label)} — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
<main>
  <p class="crumbs"><a href="/categories/">&larr; all categories</a></p>

  <header class="lede-block">
    <p class="eyebrow">category</p>
    <h1>${escapeHTML(cat.label)}</h1>
    <p class="lede">${escapeHTML(cat.blurb)}</p>
    <p class="updated-line">${builtCount} of ${matching.length} demos built, across ${byMstone.size} ${
    byMstone.size === 1 ? "release" : "releases"
  }.</p>
  </header>

  ${milestoneSections}

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

async function knownReleaseMilestones(channels: Channels): Promise<Set<number>> {
  // Always accept the three live channels plus the previous stable (since
  // chromestatus's "stable" is the next cut, the previous mstone is what most
  // users actually have installed). Also accept any v<N>/ directory in the
  // repo, which covers backfilled older releases.
  const set = new Set<number>([
    channels.stable.mstone - 1,
    channels.stable.mstone,
    channels.beta.mstone,
    channels.dev.mstone,
  ]);
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        set.add(Number(entry.name.slice(1)));
      }
    }
  } catch {
    // ignore — Deno Deploy filesystem may not allow readDir at the root.
  }
  return set;
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    try {
      const channels = await getChannels();
      return new Response(await renderIndex(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render index: ${err}`, { status: 502 });
    }
  }

  if (path === "/features" || path === "/features/") {
    try {
      const channels = await getChannels();
      return new Response(await renderFeaturesCatalogue(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render features: ${err}`, { status: 502 });
    }
  }

  if (path === "/categories" || path === "/categories/") {
    try {
      const channels = await getChannels();
      return new Response(await renderCategoriesIndex(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render categories: ${err}`, { status: 502 });
    }
  }

  const catMatch = path.match(/^\/categories\/([a-z0-9-]+)\/?$/);
  if (catMatch) {
    try {
      const channels = await getChannels();
      const html = await renderCategoryPage(catMatch[1], channels);
      if (!html) return new Response("Unknown category", { status: 404 });
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch (err) {
      return new Response(`Failed to render category: ${err}`, { status: 502 });
    }
  }

  if (path.startsWith("/public/")) return readPublicAsset(path);

  if (path === "/.well-known/web-identity") return renderFedCmWellKnown(req);

  // Per-release routes: /vNNN/ and /vNNN/<sub>.
  const releaseMatch = path.match(/^\/(v\d+)(\/.*)?$/);
  if (releaseMatch) {
    const release = releaseMatch[1];
    const milestone = Number(release.slice(1));
    const sub = releaseMatch[2] ?? "/";

    let channels: Channels;
    try {
      channels = await getChannels();
    } catch (err) {
      return new Response(`Failed to load channels: ${err}`, { status: 502 });
    }
    const known = await knownReleaseMilestones(channels);
    if (!known.has(milestone)) {
      return new Response(`Release ${release} not configured yet`, { status: 404 });
    }

    if (sub === "/" || sub === "/index.html") {
      try {
        const channels = await getChannels();
        return new Response(await renderReleasePage(release, milestone, channels), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        return new Response(`Failed to render release: ${err}`, { status: 502 });
      }
    }

    if (release === "v150" && sub === "/css-url-request-modifiers/referrer-echo") {
      return renderReferrerEcho(req);
    }
    if (release === "v130") {
      const webAuthnSignalResponse = await renderWebAuthnSignalRoute(req, sub);
      if (webAuthnSignalResponse) return webAuthnSignalResponse;
    }
    if (release === "v135" || release === "v145") {
      const dbscResponse = await renderDbscRoute(req, sub);
      if (dbscResponse) return dbscResponse;
    }
    if (release === "v148") {
      const fedCmResponse = await renderFedCmRoute(req, sub);
      if (fedCmResponse) return fedCmResponse;
    }
    if (release === "v151" && sub === "/cpu-performance-api/capability-echo") {
      return renderV151CapabilityEcho(req);
    }
    if (
      release === "v151" &&
      sub === "/resource-timing-add-spec-compliant-service-worker-router-timing-fields/delayed-echo"
    ) {
      return await renderV151DelayedEcho(req);
    }
    if (
      release === "v151" &&
      sub ===
        "/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/policy-echo"
    ) {
      return renderV151PolicyEcho(req);
    }
    if (release === "v151" && sub === "/renewed-html-insertion-streaming-methods/html-stream") {
      return renderV151HtmlStream(req);
    }

    return (await readReleaseAsset(release, sub)) ??
      new Response("Not found", { status: 404 });
  }

  return new Response("Not found", { status: 404 });
});

console.log(`Listening on http://localhost:${PORT}`);
