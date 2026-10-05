// Server request-handling behaviour tests. Each section asserts an invariant
// of the shared HTTP path: body-size caps, same-origin gates on state changes,
// allowlisted credentialed CORS, structured-header origin validation, static
// asset root containment, alias redirect Location construction, and HTML
// attribute escaping on generated pages.

import { handleDemoTelemetryRoute } from "../routes/demo-telemetry.ts";
import { buildAliasLocation, handleAliasRoute } from "../routes/aliases.ts";
import { handlePublicRoute } from "../routes/public.ts";
import {
  handleLegacyReleaseEndpoints,
  renderProfileTelemetryRoute,
} from "../routes/release-endpoints.ts";

const failures = [];
const sections = [];
function section(label, fn) {
  sections.push({ label, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatus(actual, expected, label) {
  assert(
    actual === expected,
    `${label}: expected status ${expected}, got ${actual}`,
  );
}

const noAsset = async () => null;

// A body stream that reports how many bytes were actually pulled from it, so
// tests can prove a capped read stops at the cap instead of buffering all of it.
function countingBody(totalBytes, onPull) {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close();
        return;
      }
      const size = Math.min(65536, totalBytes - sent);
      sent += size;
      onPull(size);
      controller.enqueue(new Uint8Array(size));
    },
  });
}

function post(path, body, headers = {}) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    body,
    headers,
  });
}

const KIB = 1024;
const MIB = 1024 * 1024;

// ---------------------------------------------------------------------------
// 1. Bounded request bodies: every public POST body read rejects payloads over
//    its cap with 413, honours a declared content-length before reading, and
//    stops pulling from the stream once the cap is exceeded.
// ---------------------------------------------------------------------------

section("protected-audience auction body cap", async () => {
  const label = "protected-audience auction body cap";
  let pulled = 0;
  const req = post(
    "/v130/protected-audience-bidding-auction-services/pa-bas/auction",
    countingBody(2 * MIB, (n) => (pulled += n)),
    { "content-type": "application/octet-stream" },
  );
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v130",
    "/protected-audience-bidding-auction-services/pa-bas/auction",
    noAsset,
  );
  assertStatus(res.status, 413, label);
  assert(pulled <= MIB + 128 * KIB, `${label}: pulled ${pulled} bytes, cap is ${MIB}`);
});

section("protected-audience auction declared content-length precheck", async () => {
  const label = "protected-audience auction declared content-length precheck";
  let pulled = 0;
  const req = post(
    "/v130/protected-audience-bidding-auction-services/pa-bas/auction",
    countingBody(2 * MIB, (n) => (pulled += n)),
    { "content-type": "application/octet-stream" },
  );
  // The fetch spec strips content-length from Request construction, so set it
  // the way a real socket delivers it: directly on the headers.
  req.headers.set("content-length", String(2 * MIB));
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v130",
    "/protected-audience-bidding-auction-services/pa-bas/auction",
    noAsset,
  );
  assertStatus(res.status, 413, label);
  // Deno's Request transport peeks the first chunk of a stream body on its
  // own; our precheck must not loop through the body (a capped read would
  // pull limit+chunk bytes before cancelling).
  assert(
    pulled <= 65536,
    `${label}: our code pulled ${pulled} bytes from a body it should not read`,
  );
});

section("protected-audience auction accepts under-cap body", async () => {
  const label = "protected-audience auction accepts under-cap body";
  const body = new Uint8Array(64 * KIB);
  const req = post(
    "/v130/protected-audience-bidding-auction-services/pa-bas/auction",
    body,
    { "content-type": "application/octet-stream" },
  );
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v130",
    "/protected-audience-bidding-auction-services/pa-bas/auction",
    noAsset,
  );
  const payload = await res.json();
  assert(
    res.status === 501 && payload.receivedBytes === 64 * KIB,
    `${label}: got ${res.status} ${JSON.stringify(payload)}`,
  );
});

section("fetchlater log body cap", async () => {
  const label = "fetchlater log body cap";
  const req = post("/v135/fetchlater-api/log", countingBody(2 * MIB, () => {}), {
    "content-type": "text/plain",
  });
  const res = await handleLegacyReleaseEndpoints(req, "v135", "/fetchlater-api/log", noAsset);
  assertStatus(res.status, 413, label);
});

section("profile telemetry body cap", async () => {
  const label = "profile telemetry body cap";
  const req = post("/telemetry/profile", "x".repeat(200 * KIB), {
    "content-type": "application/json",
  });
  const res = await renderProfileTelemetryRoute(req, "/telemetry/profile");
  assertStatus(res.status, 413, label);
});

section("profile telemetry accepts small body", async () => {
  const label = "profile telemetry accepts small body";
  const req = post("/telemetry/profile", JSON.stringify({ totalSamples: 3, hot: [] }), {
    "content-type": "application/json",
  });
  const res = await renderProfileTelemetryRoute(req, "/telemetry/profile");
  const payload = await res.json();
  assert(
    res.status === 202 && payload.event.bodyBytes > 0,
    `${label}: got ${res.status} ${JSON.stringify(payload)}`,
  );
});

section("demo telemetry body cap stops pulling at the cap", async () => {
  const label = "demo telemetry body cap stops pulling at the cap";
  let pulled = 0;
  const req = post("/telemetry/demo", countingBody(MIB, (n) => (pulled += n)), {
    "content-type": "application/json",
  });
  const res = await handleDemoTelemetryRoute(req);
  assertStatus(res.status, 413, label);
  assert(
    pulled <= 128 * KIB + 128 * KIB,
    `${label}: pulled ${pulled} bytes, cap is ${128 * KIB}`,
  );
});

section("compression-dictionary measure body cap", async () => {
  const label = "compression-dictionary measure body cap";
  const req = post(
    "/v130/compression-dictionary-transport-with-shared-brotli-and-shared-zstandard/cdt-shared/measure",
    "x".repeat(2 * MIB),
    { "content-type": "application/json" },
  );
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v130",
    "/compression-dictionary-transport-with-shared-brotli-and-shared-zstandard/cdt-shared/measure",
    noAsset,
  );
  assertStatus(res.status, 413, label);
});

section("attribution trigger body cap", async () => {
  const label = "attribution trigger body cap";
  const req = post(
    "/v134/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont/trigger-context-id-builder/register-trigger",
    "x".repeat(2 * MIB),
    { "content-type": "application/json" },
  );
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v134",
    "/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont/trigger-context-id-builder/register-trigger",
    noAsset,
  );
  assertStatus(res.status, 413, label);
});

section("webauthn register body cap", async () => {
  const label = "webauthn register body cap";
  const req = post("/v130/webauthn-signal-api/register", "x".repeat(2 * MIB), {
    "content-type": "application/json",
  });
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v130",
    "/webauthn-signal-api/register",
    noAsset,
  );
  assertStatus(res.status, 413, label);
});

section("fedcm assertion body cap", async () => {
  const label = "fedcm assertion body cap";
  const req = post("/v148/agentic-federated-login/fedcm/assertion", "x".repeat(2 * MIB), {
    "content-type": "application/x-www-form-urlencoded",
    "origin": "http://localhost:3000",
    "cookie": "showcase_fedcm_idp=alice-001",
  });
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v148",
    "/agentic-federated-login/fedcm/assertion",
    noAsset,
  );
  assertStatus(res.status, 413, label);
});

// ---------------------------------------------------------------------------
// 2. State-changing telemetry endpoints require a same-origin signal: a
//    cross-site Origin (or Sec-Fetch-Site) is refused with 403.
// ---------------------------------------------------------------------------

section("profile reset refuses cross-site origin", async () => {
  const label = "profile reset refuses cross-site origin";
  const req = post("/telemetry/profile/reset", "", {
    "origin": "https://foreign.example",
    "sec-fetch-site": "cross-site",
  });
  const res = await renderProfileTelemetryRoute(req, "/telemetry/profile/reset");
  assertStatus(res.status, 403, label);
});

section("profile reset refuses same-site-but-cross-origin signal", async () => {
  const label = "profile reset refuses same-site-but-cross-origin signal";
  const req = post("/telemetry/profile/reset", "", {
    "origin": "https://foreign.example",
    "sec-fetch-site": "same-site",
  });
  const res = await renderProfileTelemetryRoute(req, "/telemetry/profile/reset");
  assertStatus(res.status, 403, label);
});

section("profile reset accepts same-origin origin header", async () => {
  const label = "profile reset accepts same-origin origin header";
  const req = post("/telemetry/profile/reset", "", {
    "origin": "http://localhost:3000",
    "sec-fetch-site": "same-origin",
  });
  const res = await renderProfileTelemetryRoute(req, "/telemetry/profile/reset");
  const payload = await res.json();
  assert(res.status === 200 && payload.reset === true, `${label}: got ${res.status}`);
});

section("profile reset accepts browser top-level navigation signal", async () => {
  const label = "profile reset accepts browser top-level navigation signal";
  const req = post("/telemetry/profile/reset", "", { "sec-fetch-site": "none" });
  const res = await renderProfileTelemetryRoute(req, "/telemetry/profile/reset");
  assertStatus(res.status, 200, label);
});

// ---------------------------------------------------------------------------
// 3. Credentialed CORS is allowlisted: an Origin is echoed with
//    Access-Control-Allow-Credentials only when it is the showcase's own
//    origin; foreign origins get no credentialed CORS headers at all.
// ---------------------------------------------------------------------------

function corsRequest(path, headers = {}) {
  return new Request(`http://localhost:3000${path}`, { headers });
}

section("fedcm metadata echoes only the site's own origin with credentials", async () => {
  const label = "fedcm metadata echoes only the site's own origin with credentials";
  const own = corsRequest("/v148/agentic-federated-login/fedcm/client-metadata", {
    "origin": "http://localhost:3000",
  });
  const resOwn = await handleLegacyReleaseEndpoints(
    own,
    "v148",
    "/agentic-federated-login/fedcm/client-metadata",
    noAsset,
  );
  assert(
    resOwn.headers.get("access-control-allow-origin") === "http://localhost:3000" &&
      resOwn.headers.get("access-control-allow-credentials") === "true",
    `${label}: own-origin response missing credentialed CORS`,
  );

  const foreign = corsRequest("/v148/agentic-federated-login/fedcm/client-metadata", {
    "origin": "https://foreign.example",
  });
  const resForeign = await handleLegacyReleaseEndpoints(
    foreign,
    "v148",
    "/agentic-federated-login/fedcm/client-metadata",
    noAsset,
  );
  assert(
    resForeign.headers.get("access-control-allow-origin") === null,
    `${label}: foreign origin was echoed: ${resForeign.headers.get("access-control-allow-origin")}`,
  );
  assert(
    resForeign.headers.get("access-control-allow-credentials") === null,
    `${label}: credentials offered to a foreign origin`,
  );
});

section("fedcm preflight echoes only the site's own origin", async () => {
  const label = "fedcm preflight echoes only the site's own origin";
  const preflight = new Request(
    "http://localhost:3000/v148/agentic-federated-login/fedcm/accounts",
    {
      method: "OPTIONS",
      headers: {
        "origin": "https://foreign.example",
        "access-control-request-method": "POST",
      },
    },
  );
  const res = await handleLegacyReleaseEndpoints(
    preflight,
    "v148",
    "/agentic-federated-login/fedcm/accounts",
    noAsset,
  );
  assert(
    res.headers.get("access-control-allow-origin") === null,
    `${label}: foreign origin was echoed: ${res.headers.get("access-control-allow-origin")}`,
  );
  assert(
    res.headers.get("access-control-allow-credentials") === null,
    `${label}: credentials offered to a foreign origin`,
  );
});

section("css url modifier credentialed mode echoes only the site's own origin", async () => {
  const label = "css url modifier credentialed mode echoes only the site's own origin";
  const sub = "/css-url-request-modifiers/crossorigin-integrity-demo/resource.svg";
  const foreign = corsRequest(`/v150${sub}?cors=credentialed`, {
    "origin": "https://foreign.example",
  });
  const resForeign = await handleLegacyReleaseEndpoints(foreign, "v150", sub, noAsset);
  assert(
    resForeign.headers.get("access-control-allow-origin") === null &&
      resForeign.headers.get("access-control-allow-credentials") === null,
    `${label}: foreign origin got credentialed CORS`,
  );

  const sameOrigin = corsRequest(`/v150${sub}?cors=credentialed`);
  const resSame = await handleLegacyReleaseEndpoints(sameOrigin, "v150", sub, noAsset);
  assert(
    resSame.headers.get("access-control-allow-origin") === "http://localhost:3000" &&
      resSame.headers.get("access-control-allow-credentials") === "true",
    `${label}: same-origin request lost credentialed CORS`,
  );
});

// ---------------------------------------------------------------------------
// 4. The activate-storage-access structured header only ever carries a
//    validated origin value: a syntactically invalid Origin falls back to the
//    site's own origin and cannot alter the header's structure.
// ---------------------------------------------------------------------------

section("storage-access allowed-origin validates the reflected origin", async () => {
  const label = "storage-access allowed-origin validates the reflected origin";
  const hostile = corsRequest(
    "/v130/storage-access-headers/probe?grant=1&activate=retry",
    { "origin": `https://good.example" ; injected="yes` },
  );
  const res = await handleLegacyReleaseEndpoints(
    hostile,
    "v130",
    "/storage-access-headers/probe",
    noAsset,
  );
  const header = res.headers.get("activate-storage-access") ?? "";
  assert(
    header === 'retry; allowed-origin="http://localhost:3000"',
    `${label}: unexpected header value: ${header}`,
  );
});

section("storage-access allowed-origin accepts a well-formed origin", async () => {
  const label = "storage-access allowed-origin accepts a well-formed origin";
  const req = corsRequest("/v130/storage-access-headers/probe?grant=1&activate=retry", {
    "origin": "https://partner.example",
  });
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v130",
    "/storage-access-headers/probe",
    noAsset,
  );
  const header = res.headers.get("activate-storage-access") ?? "";
  assert(
    header === 'retry; allowed-origin="https://partner.example"',
    `${label}: unexpected header value: ${header}`,
  );
});

// ---------------------------------------------------------------------------
// 5. Static asset serving resolves every request inside the public root: a
//    path that resolves outside it (including via a symlink planted inside
//    public/) is a 404, while normal assets keep serving.
// ---------------------------------------------------------------------------

section("public assets stay inside the public root", async () => {
  const label = "public assets stay inside the public root";
  // A symlink inside public/ pointing at a file outside the root. This is the
  // only construction the URL parser's dot-segment normalisation cannot see.
  const linkPath = new URL("../public/.hardening-test-link", import.meta.url).pathname;
  await Deno.symlink(
    new URL("../server.ts", import.meta.url).pathname,
    linkPath,
  );
  try {
    const escape = await handlePublicRoute(
      new Request("http://localhost:3000/public/.hardening-test-link"),
    );
    assertStatus(escape?.status ?? 0, 404, `${label}: symlink escape`);

    const normal = await handlePublicRoute(
      new Request("http://localhost:3000/public/styles.css"),
    );
    assert(
      normal?.status === 200 && normal.headers.get("content-type") === "text/css; charset=utf-8",
      `${label}: styles.css no longer serves (${normal?.status})`,
    );
  } finally {
    await Deno.remove(linkPath);
  }
});

// ---------------------------------------------------------------------------
// 6. Alias redirect Location values are assembled from repo migration data
//    plus the request suffix and raw query: the alias target must be
//    site-relative and the assembled Location must be printable ASCII with no
//    spaces or control characters, or the request is refused.
// ---------------------------------------------------------------------------

section("alias redirect serves the recorded move", async () => {
  const label = "alias redirect serves the recorded move";
  const res = await handleAliasRoute(
    new Request(
      "http://localhost:3000/v150/disable-svg-filters-on-plugins-and-cross-origin-or-restricted-iframes/",
    ),
  );
  assert(
    res?.status === 301 &&
      res.headers.get("location") === "/v150/disable-svg-filters-on-plugins-and-iframes/",
    `${label}: got ${res?.status} ${res?.headers.get("location")}`,
  );
});

section("alias location builder keeps targets site-relative", async () => {
  const label = "alias location builder keeps targets site-relative";
  assert(
    buildAliasLocation({ to: "//foreign.example/x" }, "/a/", "?q=1") === null,
    `${label}: scheme-relative target accepted`,
  );
  assert(
    buildAliasLocation({ to: "https://foreign.example/x" }, "", "") === null,
    `${label}: absolute-URL target accepted`,
  );
});

section("alias location builder rejects non-printable or spaced locations", async () => {
  const label = "alias location builder rejects non-printable or spaced locations";
  assert(
    buildAliasLocation({ to: "/v150/x/" }, "", "?q=\r\nX-Injected: 1") === null,
    `${label}: CRLF in raw search accepted`,
  );
  assert(
    buildAliasLocation({ to: "/v150/x/" }, "", "?q=a b") === null,
    `${label}: space in raw search accepted`,
  );
  assert(
    buildAliasLocation({ to: "/v150/x/" }, "", "?q=\u0000") === null,
    `${label}: control character in raw search accepted`,
  );
  assert(
    buildAliasLocation({ to: "/v150/x/" }, "concept/", "?q=%E2%82%AC") ===
      "/v150/x/concept/?q=%E2%82%AC",
    `${label}: ordinary encoded query mangled`,
  );
});

// ---- end of sections ----

for (const { label, fn } of sections) {
  try {
    await fn();
    console.log(`ok   ${label}`);
  } catch (err) {
    failures.push({ label, err });
    console.log(`FAIL ${label}: ${err?.message ?? err}`);
  }
}

if (failures.length > 0) {
  console.error(`\nserver-hardening tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nserver-hardening tests: all sections passed");
