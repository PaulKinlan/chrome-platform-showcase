// Shared Device Bound Session Credentials (DBSC) demo backend.
// Mounted by v135, v145, and v147 `_server.ts` sidecars so all three
// milestones share one bounded session store and verbatim protocol logic.

import { p256PublicJwkForStorage } from "../jwk.ts";
import { readBoundedText } from "../request-body.ts";
import { BoundedSessionStore } from "../session-store.ts";
import {
  base64UrlDecode,
  DEMO_BODY_LIMIT,
  jsonResponse,
  parseCookies,
  randomBase64Url,
  toArrayBuffer,
} from "./http-helpers.ts";

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
/** Long-lived demo cookie lifetime — the "long-lived" half of the DBSC narrative. */
const DBSC_LONG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
// The server-side session is bounded by entry count and by this TTL, which
// matches the long-lived cookie the demo itself sets (30 days) rather than the
// 6-hour default used by the other fixtures — an aggressive default here would
// silently contradict the long-lived-vs-short-lived story the demo tells.
const dbscSessions = new BoundedSessionStore<DbscSession>({
  ttlMs: DBSC_LONG_COOKIE_MAX_AGE * 1000,
});

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

type RequestJson =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

async function requestJson(req: Request): Promise<RequestJson> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { ok: true, value: {} };
  }
  const text = await readBoundedText(req, DEMO_BODY_LIMIT);
  if (!text.ok) return text;
  try {
    return { ok: true, value: JSON.parse(text.text) as Record<string, unknown> };
  } catch {
    return { ok: true, value: {} };
  }
}

export async function handleDbscRequest(req: Request, sub: string): Promise<Response | null> {
  if (!sub.startsWith("/device-bound-session-credentials/")) return null;
  const route = sub.slice("/device-bound-session-credentials".length);

  if (route === "/login" && req.method === "POST") {
    const session = createDbscSession();
    session.loginChallenge = randomBase64Url(32);
    recordDbscEvent(session, "login", "Issued long-lived cookie and registration header.");

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${DBSC_LONG_COOKIE}=${session.id}; ${dbscCookieAttributes(req, DBSC_LONG_COOKIE_MAX_AGE)}`,
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
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const proof = req.headers.get("Secure-Session-Response") ?? String(body.proof ?? "");
    const verified = await verifyDbscJwt(proof, session.loginChallenge, null);
    if (!verified.ok) {
      recordDbscEvent(session, "register-rejected", verified.error ?? "Proof rejected.");
      return jsonResponse({ error: verified.error }, { status: 400 });
    }

    // The proof's header JWK is caller-supplied, and importKey ignores the
    // properties it does not need, so store only what verification consumes:
    // otherwise padding rides along for the session's whole 30-day lifetime.
    session.publicKeyJwk = verified.publicKeyJwk
      ? p256PublicJwkForStorage(verified.publicKeyJwk)
      : null;
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
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
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
