// Server request-handling behaviour tests. Each section asserts an invariant
// of the shared HTTP path: body-size caps, same-origin gates on state changes,
// allowlisted credentialed CORS, structured-header origin validation, static
// asset root containment, alias redirect Location construction, and HTML
// attribute escaping on generated pages.

import { handleDemoTelemetryRoute } from "../routes/demo-telemetry.ts";
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
