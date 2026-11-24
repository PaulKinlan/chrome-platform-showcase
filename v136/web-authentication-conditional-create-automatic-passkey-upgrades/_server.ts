// Co-located server handler for v136/web-authentication-conditional-create-automatic-passkey-upgrades.

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

interface AutoPasskeySession {
  id: string;
  userName: string | null;
  authenticated: boolean;
  challenge: string | null;
  credentials: { id: string; createdAt: string; clientDataType: string; origin: string }[];
}

const AUTO_PASSKEY_COOKIE = "showcase_auto_passkey";
const autoPasskeySessions = new BoundedSessionStore<AutoPasskeySession>();

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function webAuthnRpId(req: Request): string {
  const host = new URL(req.url).hostname;
  return host === "0.0.0.0" ? "localhost" : host;
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

function getAutoPasskeySession(req: Request): { session: AutoPasskeySession; headers: Headers } {
  const headers = new Headers();
  const cookies = parseCookies(req);
  let id = cookies.get(AUTO_PASSKEY_COOKIE);
  if (!id || !autoPasskeySessions.has(id)) {
    id = randomBase64Url(18);
    autoPasskeySessions.set(id, {
      id,
      userName: null,
      authenticated: false,
      challenge: null,
      credentials: [],
    });
    headers.set(
      "set-cookie",
      `${AUTO_PASSKEY_COOKIE}=${id}; Path=/v136/web-authentication-conditional-create-automatic-passkey-upgrades/auto-passkey; SameSite=Lax`,
    );
  }
  return { session: autoPasskeySessions.get(id)!, headers };
}

function autoPasskeyPayload(session: AutoPasskeySession): Record<string, unknown> {
  return {
    authenticated: session.authenticated,
    userName: session.userName,
    pendingChallenge: session.challenge,
    credentials: session.credentials,
  };
}

export async function handleFeatureRequest(req: Request, sub: string): Promise<Response | null> {
  const prefix =
    "/web-authentication-conditional-create-automatic-passkey-upgrades/auto-passkey/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  const { session, headers } = getAutoPasskeySession(req);

  if (route === "/state") return jsonResponse(autoPasskeyPayload(session), { headers });

  if (route === "/login" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const userName = stringValue(body.userName, "ada@example.com");
    const password = stringValue(body.password);
    if (!password) {
      return jsonResponse({ error: "Password is required for the demo sign-in." }, {
        status: 400,
        headers,
      });
    }
    session.userName = userName;
    session.authenticated = true;
    session.challenge = randomBase64Url(32);
    return jsonResponse({
      ...autoPasskeyPayload(session),
      publicKey: {
        rp: { name: "chrome-platform-showcase", id: webAuthnRpId(req) },
        user: {
          id: base64UrlEncode(new TextEncoder().encode(userName)),
          name: userName,
          displayName: userName,
        },
        challenge: session.challenge,
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        excludeCredentials: session.credentials.map((credential) => ({
          type: "public-key",
          id: credential.id,
        })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
        timeout: 60000,
        attestation: "none",
      },
    }, { headers });
  }

  if (route === "/register" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const response = objectValue(body.response);
    const clientData = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(stringValue(response.clientDataJSON))),
    );
    if (!session.authenticated) {
      return jsonResponse({ error: "Complete the backend sign-in first." }, {
        status: 401,
        headers,
      });
    }
    if (clientData.type !== "webauthn.create") {
      return jsonResponse({ error: "Expected webauthn.create client data." }, {
        status: 400,
        headers,
      });
    }
    if (!session.challenge || clientData.challenge !== session.challenge) {
      return jsonResponse({ error: "Challenge did not match this sign-in session." }, {
        status: 400,
        headers,
      });
    }
    if (clientData.origin !== new URL(req.url).origin) {
      return jsonResponse({ error: `Origin mismatch: ${clientData.origin}` }, {
        status: 400,
        headers,
      });
    }

    const rawId = stringValue(body.rawId) || stringValue(body.id);
    if (!session.credentials.some((credential) => credential.id === rawId)) {
      session.credentials.unshift({
        id: rawId,
        createdAt: new Date().toISOString(),
        clientDataType: clientData.type,
        origin: clientData.origin,
      });
    }
    session.challenge = null;
    return jsonResponse({ registered: true, ...autoPasskeyPayload(session) }, { headers });
  }

  if (route === "/reset" && req.method === "POST") {
    session.authenticated = false;
    session.challenge = null;
    session.credentials = [];
    return jsonResponse(autoPasskeyPayload(session), { headers });
  }

  return null;
}
