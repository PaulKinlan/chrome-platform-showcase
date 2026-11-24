// Co-located server handler for v130/webauthn-signal-api.

import { readBoundedText } from "../../lib/request-body.ts";
import { BoundedSessionStore } from "../../lib/session-store.ts";
import {
  base64UrlDecode,
  base64UrlEncode,
  DEMO_BODY_LIMIT,
  jsonResponse,
  parseCookies,
  randomBase64Url,
} from "../../lib/feature-servers/http-helpers.ts";

interface WebAuthnSignalCredential {
  id: string;
  createdAt: string;
  revokedAt: string | null;
  source: "webauthn-create";
}

interface WebAuthnSignalBody {
  id?: string;
  response?: { clientDataJSON?: string };
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
const webAuthnSignalSessions = new BoundedSessionStore<WebAuthnSignalSession>();

// Bounds for the WebAuthn signal fixture's per-session credentials. The caller
// supplies the credential ID up to the 1 MiB DEMO_BODY_LIMIT and can create
// multiple credentials per session.
//
// Per W3C WebAuthn Level 3 (§5.1, https://www.w3.org/TR/webauthn-3/#credential-id),
// authenticator credential IDs MUST NOT be longer than 1023 bytes. In base64url
// encoding, 1023 raw bytes produces at most 1364 characters (1023 / 3 * 4 = 1364).
// Rather than silently slicing or truncating IDs (which corrupts identity, breaks
// revoke/signal, and causes collisions), IDs beyond this limit are rejected with
// HTTP 400 without retaining. Retained count is capped at 20 per session with
// oldest-first eviction (beads chrome_platform_showcase-dpp and a68).
export const WEBAUTHN_SIGNAL_MAX_CREDENTIALS = 20;
export const WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_RAW_BYTES = 1023;
export const WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_LENGTH = 1364;

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

export async function handleFeatureRequest(req: Request, sub: string): Promise<Response | null> {
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
    const rawRegister = await readBoundedText(req, DEMO_BODY_LIMIT);
    if (!rawRegister.ok) return rawRegister.response;
    let body: WebAuthnSignalBody;
    try {
      body = JSON.parse(rawRegister.text) as WebAuthnSignalBody;
    } catch {
      return jsonResponse({ error: "Expected a JSON request body." }, { status: 400, headers });
    }
    let clientData: { type?: string; challenge?: string; origin?: string };
    try {
      clientData = JSON.parse(
        new TextDecoder().decode(base64UrlDecode(body.response?.clientDataJSON ?? "")),
      );
    } catch {
      return jsonResponse({ error: "Invalid clientDataJSON in request." }, {
        status: 400,
        headers,
      });
    }
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
    if (typeof body.id !== "string" || body.id.length === 0) {
      return jsonResponse({ error: "Expected a non-empty credential ID." }, {
        status: 400,
        headers,
      });
    }
    if (body.id.length > WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_LENGTH) {
      return jsonResponse({
        error:
          `Credential ID exceeds maximum allowed length of ${WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_LENGTH} characters (${WEBAUTHN_SIGNAL_CREDENTIAL_ID_MAX_RAW_BYTES} raw bytes).`,
      }, {
        status: 400,
        headers,
      });
    }
    const credentialId = body.id;
    if (!session.credentials.some((credential) => credential.id === credentialId)) {
      session.credentials.unshift({
        id: credentialId,
        createdAt: new Date().toISOString(),
        revokedAt: null,
        source: "webauthn-create",
      });
      session.credentials = session.credentials.slice(0, WEBAUTHN_SIGNAL_MAX_CREDENTIALS);
    }
    session.challenge = null;
    return jsonResponse(webAuthnSessionPayload(req, session), { headers });
  }

  if (route === "/revoke" && req.method === "POST") {
    const rawRevoke = await readBoundedText(req, DEMO_BODY_LIMIT);
    if (!rawRevoke.ok) return rawRevoke.response;
    let body: WebAuthnSignalBody;
    try {
      body = JSON.parse(rawRevoke.text) as WebAuthnSignalBody;
    } catch {
      return jsonResponse({ error: "Expected a JSON request body." }, { status: 400, headers });
    }
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
