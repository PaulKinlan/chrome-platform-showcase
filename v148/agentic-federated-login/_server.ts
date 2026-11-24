// Co-located feature server for v148/agentic-federated-login:
// implements the showcase FedCM IdP endpoints (config, login, logout,
// disconnect, accounts, client-metadata, assertion, validate, refresh,
// delegated-api).

import {
  base64UrlDecode,
  base64UrlEncode,
  DEMO_BODY_LIMIT,
  jsonResponse,
  parseCookies,
  randomBase64Url,
} from "../../lib/feature-servers/http-helpers.ts";
import { readBoundedText } from "../../lib/request-body.ts";
import { allowlistedCorsOrigin } from "../../lib/request-guards.ts";
import { escapeHTML } from "../../routes/html.ts";

export const FEDCM_BASE = "/v148/agentic-federated-login/fedcm";
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

function decodeBase64UrlJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
}

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

type FedCmRequestBody =
  | { ok: true; params: URLSearchParams }
  | { ok: false; response: Response };

async function fedCmRequestBody(req: Request): Promise<FedCmRequestBody> {
  const contentType = req.headers.get("content-type") ?? "";
  const raw = await readBoundedText(req, DEMO_BODY_LIMIT);
  if (!raw.ok) return raw;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return { ok: true, params: new URLSearchParams(raw.text) };
  }
  if (contentType.includes("application/json")) {
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(raw.text || "{}") as Record<string, unknown>;
    } catch {
      json = {};
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(json)) {
      if (value != null) params.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    return { ok: true, params };
  }
  return { ok: true, params: new URLSearchParams(raw.text) };
}

function fedCmCorsHeaders(req: Request): Headers {
  const headers = new Headers();
  const allowedOrigin = allowlistedCorsOrigin(req, new URL(req.url));
  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-credentials", "true");
  }
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    "content-type, sec-fetch-dest, x-showcase-fedcm-trace",
  );
  headers.set("vary", "Origin");
  return headers;
}

export function fedCmProviderUrls(req: Request): Record<string, string> {
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
    const bodyResult = await fedCmRequestBody(req);
    if (!bodyResult.ok) return bodyResult.response;
    const body = bodyResult.params;
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
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const result = await verifyFedCmJwt(String(body.token ?? ""));
    return jsonResponse(result, { status: result.ok ? 200 : 400 });
  }

  if (route === "/refresh" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
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
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
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

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  return await renderFedCmRoute(req, sub);
}
