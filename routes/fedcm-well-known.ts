import { jsonResponse } from "../lib/feature-servers/http-helpers.ts";

const FEDCM_BASE = "/v148/agentic-federated-login/fedcm";

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

export function renderFedCmWellKnown(req: Request): Response {
  const urls = fedCmProviderUrls(req);
  return jsonResponse({
    provider_urls: [urls.config],
    accounts_endpoint: urls.accounts,
    login_url: urls.login,
  });
}

export function handleFedCmWellKnownRoute(req: Request): Response | null {
  const path = new URL(req.url).pathname;
  return path === "/.well-known/web-identity" ? renderFedCmWellKnown(req) : null;
}
