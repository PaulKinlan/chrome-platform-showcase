// Server request-handling behaviour tests. Each section asserts an invariant
// of the shared HTTP path: body-size caps, same-origin gates on state changes,
// allowlisted credentialed CORS, structured-header origin validation, static
// asset root containment, alias redirect Location construction, and HTML
// attribute escaping on generated pages.

import { handleDemoTelemetryRoute } from "../routes/demo-telemetry.ts";
import { readBoundedBody } from "../lib/request-body.ts";
import { buildAliasLocation, handleAliasRoute } from "../routes/aliases.ts";
import { renderCategoryCard, renderDemoCard, renderFeatureCatalogueRows } from "../routes/pages.ts";
import { renderConformancePage } from "../routes/conformance-renderers.ts";
import { renderCritiqueDetail, renderCritiquesIndex } from "../routes/critique-renderers.ts";
import { renderConformanceRunAllPage } from "../routes/conformance-renderers.ts";
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

// Teardown is part of the contract, not a formality, and two of these helpers
// are shaped by measured Deno 2.9.7 behaviour: `shutdown()` waits for in-flight
// requests, and a request that never answers keeps it pending forever, so the
// deadline below starts BEFORE the graceful close; and `abort()` AFTER
// `shutdown()` has been called throws an uncaught `BadResource` out of Deno's
// own signal listener, so there is deliberately no force-close fallback here and
// no promise that a hard kill of this process cleans anything up. A teardown
// that stalls or fails is reported as a named failure and counted with the
// section failures, so it can never be a silent green.
const TEARDOWN_BOUND_MS = 2000;
let teardownFailures = 0;

function teardownFailed(what) {
  teardownFailures++;
  const err = new Error(what);
  failures.push({ label: what, err });
  console.log(`FAIL ${what}`);
}

// Bounded, rejection-aware listener close: deadline first, graceful close
// second. A rejected `shutdown()` or `finished` is a failed close, not a pass,
// and the first genuine rejection message is preserved.
async function closeListener(listener, what) {
  let shutdownError = null;
  let finishedError = null;
  const graceful = Promise.all([
    Promise.resolve()
      .then(() => listener.shutdown())
      .then(() => true, (err) => {
        shutdownError = err;
        return false;
      }),
    Promise.resolve()
      .then(() => listener.finished)
      .then(() => true, (err) => {
        finishedError = err;
        return false;
      }),
  ]).then(([closed, released]) => closed === true && released === true);
  const stalled = Symbol("stalled");
  const first = await Promise.race([
    graceful,
    new Promise((resolve) => setTimeout(() => resolve(stalled), TEARDOWN_BOUND_MS)),
  ]);
  if (first === true) return;
  if (first === stalled) {
    teardownFailed(
      `${what} had not finished closing ${TEARDOWN_BOUND_MS}ms after it was asked to shut down ` +
        "(a request is still in flight; the listening socket is already closed, and Deno 2.9.7 " +
        "throws an uncaught BadResource if an abort fires after shutdown, so the listener is left " +
        "to the runtime rather than force-closed)",
    );
    // Bounded second wait, so a close that lands late is still observed.
    await Promise.race([
      graceful,
      new Promise((resolve) => setTimeout(resolve, TEARDOWN_BOUND_MS)),
    ]);
    return;
  }
  const context = [
    shutdownError ? `shutdown() rejected with ${shutdownError.message ?? shutdownError}` : null,
    finishedError ? `finished rejected with ${finishedError.message ?? finishedError}` : null,
  ].filter(Boolean).join("; ");
  teardownFailed(
    `${what} failed to close cleanly: ${
      context || "shutdown and finished did not both report success"
    }`,
  );
}

// Bounded SIGKILL reap. A rejected `status` is a failure, never a reap: reading
// it as success is how a Chrome that refused to die passes as clean teardown.
async function reapChild(child, what) {
  if (!child) return;
  try {
    child.kill("SIGKILL");
  } catch { /* already gone */ }
  const stalled = Symbol("stalled");
  const reaped = await Promise.race([
    Promise.resolve()
      .then(() => child.status)
      .then(() => true, (err) => {
        teardownFailed(`${what} status could not be read after SIGKILL: ${err?.message ?? err}`);
        return true;
      }),
    new Promise((resolve) => setTimeout(() => resolve(stalled), TEARDOWN_BOUND_MS)),
  ]);
  if (reaped === stalled) {
    teardownFailed(`${what} had not been reaped ${TEARDOWN_BOUND_MS}ms after SIGKILL`);
  }
}

// The legacy 20x100ms profile removal retry, with a final failure named
// instead of swallowed; an already-absent profile is still a success.
async function removeProfile(profile, what) {
  for (let i = 0; i < 20; i++) {
    try {
      await Deno.remove(profile, { recursive: true });
      return;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return;
      if (i === 19) {
        teardownFailed(
          `${what} ${profile} could not be removed after 20 attempts: ${err?.message ?? err}`,
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
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

// A body with caller-chosen chunk sizes plus a record of what the consumer did
// with it. `countingBody` above cannot express these cases: it caps every chunk
// at 64 KiB, so it can never hand over a chunk larger than the cap under test.
function sizedChunks(sizes) {
  const queue = [...sizes];
  const state = { pulled: 0, chunks: 0, cancelled: false };
  const stream = new ReadableStream({
    pull(controller) {
      const size = queue.shift();
      if (size === undefined) {
        controller.close();
        return;
      }
      state.chunks += 1;
      state.pulled += size;
      controller.enqueue(new Uint8Array(size));
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { stream, state };
}

section("an over-limit stream chunk is dropped, not retained", async () => {
  const label = "over-limit chunk";
  const cap = 128 * KIB;

  // One chunk, larger than the whole cap: the read cannot know to reject it
  // until it has the chunk, so one chunk past the cap is the bound the file
  // header states - and the chunk must be dropped on the way to the 413 rather
  // than appended to the retained buffer (21cf7695 appended it first).
  const one = sizedChunks([MIB]);
  const over = await readBoundedBody(
    post("/telemetry/demo", one.stream, { "content-type": "application/json" }),
    cap,
    "Over the cap.",
  );
  assert(over.ok === false, `${label}: an over-limit chunk must reject the body`);
  assertStatus(over.response.status, 413, label);
  assert(
    (await over.response.json()).error === "Over the cap.",
    `${label}: the 413 must carry the caller's message`,
  );
  assert(
    one.state.pulled === MIB,
    `${label}: the stream handed over ${one.state.pulled} bytes, expected the one chunk`,
  );
  assert(
    one.state.cancelled,
    `${label}: the reader must be cancelled once the cap is exceeded`,
  );

  // Both sides of the boundary: a body that lands exactly on the cap is
  // accepted, and the chunk that would take the running total past it is
  // refused without anything after it being pulled.
  const exact = sizedChunks([cap / 2, cap / 2]);
  const exactResult = await readBoundedBody(
    post("/telemetry/demo", exact.stream, { "content-type": "application/json" }),
    cap,
  );
  assert(
    exactResult.ok === true && exactResult.bytes.byteLength === cap,
    `${label}: a body of exactly the cap must be accepted, got ${
      exactResult.ok ? exactResult.bytes.byteLength : `status ${exactResult.response.status}`
    }`,
  );

  const past = sizedChunks([cap / 2, cap / 2, 8 * KIB, 8 * KIB]);
  const pastResult = await readBoundedBody(
    post("/telemetry/demo", past.stream, { "content-type": "application/json" }),
    cap,
  );
  assert(pastResult.ok === false, `${label}: the chunk past the cap must reject the body`);
  assertStatus(pastResult.response.status, 413, label);
  assert(
    past.state.pulled === cap + 8 * KIB,
    `${label}: pulled ${past.state.pulled} bytes, expected the cap plus the one over-limit chunk`,
  );
  assert(
    past.state.chunks === 3,
    `${label}: the consumer took ${past.state.chunks} chunks, expected the two that fit plus the one that did not`,
  );
  assert(
    past.state.cancelled,
    `${label}: the reader must be cancelled before the rest of the stream is read`,
  );
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

// ---------------------------------------------------------------------------
// 7. Milestone page cards escape every interpolated value for its HTML
//    attribute context, including the demo and ChromeStatus hrefs.
// ---------------------------------------------------------------------------

section("demo card escapes href values in attributes", async () => {
  const label = "demo card escapes href values in attributes";
  const hostileHref = `/v151/feature" onmouseover="alert(1)`;
  const card = renderDemoCard(
    { id: 506123456, name: "Feature", summary: "Summary" },
    { href: hostileHref, release: "v151", sameRelease: true },
    undefined,
    { category: "Enabled by default" },
  );
  assert(
    !card.includes(`"${hostileHref}"`) && !card.includes('onmouseover="alert'),
    `${label}: raw hostile href reached the attribute`,
  );
  assert(
    card.includes('href="/v151/feature&quot; onmouseover=&quot;alert(1)"'),
    `${label}: escaped href missing`,
  );
});

section("demo card escapes the no-demo ChromeStatus href", async () => {
  const label = "demo card escapes the no-demo ChromeStatus href";
  const card = renderDemoCard(
    { id: `5"x`, name: "Feature", summary: "" },
    null,
    undefined,
    { category: "Enabled by default" },
  );
  assert(
    !card.includes(`feature/5"x`) && card.includes("feature/5&quot;x"),
    `${label}: raw id reached the attribute`,
  );
});

section("category card escapes href values in attributes", async () => {
  const label = "category card escapes href values in attributes";
  const card = renderCategoryCard({
    id: 506123456,
    name: "Feature",
    summary: "Summary",
    demo: {
      href: `/v151/feature" onmouseover="alert(1)`,
      release: "v151",
      sameRelease: true,
    },
  });
  assert(
    !card.includes('onmouseover="alert') && card.includes("&quot; onmouseover=&quot;"),
    `${label}: raw hostile href reached the attribute`,
  );
});

section("credentialed CORS echoes the loopback host pair", async () => {
  const label = "credentialed CORS echoes the loopback host pair";
  // Local demos fetch their resource from the other loopback name to make a
  // genuinely cross-origin request against this same server; the pair must
  // still get credentialed CORS while a real foreign origin does not.
  const req = new Request(
    "http://127.0.0.1:3000/v150/css-url-request-modifiers/crossorigin-integrity-demo/resource.svg?cors=credentialed",
    { headers: { "origin": "http://localhost:3000" } },
  );
  const res = await handleLegacyReleaseEndpoints(
    req,
    "v150",
    "/css-url-request-modifiers/crossorigin-integrity-demo/resource.svg",
    noAsset,
  );
  assert(
    res.headers.get("access-control-allow-origin") === "http://localhost:3000" &&
      res.headers.get("access-control-allow-credentials") === "true",
    `${label}: loopback pair lost credentialed CORS`,
  );
});

// ---------------------------------------------------------------------------
// FedCM credentialed CORS: the browser's verdict, not just the server's
// headers. The header-level check earlier in this suite proves what the
// server SENDS (ACAO+ACAC echo for the site's own origin, no ACAO at all for
// a foreign one). It cannot prove what a real browser ACCEPTS or REFUSES:
// that is decided by the browser's CORS engine. This section drives a real
// headless Chrome twice against an in-process instance of the real handler:
//
//   own-origin family: a page at http://localhost:A (loopback pair of
//     http://127.0.0.1:A, which the allowlist treats as the site itself)
//     issues a CROSS-ORIGIN credentialed fetch of the client-metadata
//     endpoint. Expected: the browser ACCEPTS it and the JSON body is
//     readable — usable credentialed access for the site's own origin.
//
//   foreign origin: a page at http://127.0.0.1:B issues the same
//     credentialed fetch. Expected: the fetch promise REJECTS (TypeError) —
//     the browser refuses, and no response body of any kind is exposed.
//
// Cookies cannot cross the localhost/127.0.0.1 host pair, so the credentialed
// request carries no cookie in either direction — the accept/refuse verdict
// is decided by ACAO+ACAC alone, which is exactly what this section pins.
//
// Each page reports its own verdict back to this process (a same-origin
// navigation to /report, served by the same listeners), so the assertions run
// on data the test received directly and the server logs progress as it
// happens. Skipped (loudly) when no Chrome binary is available, or when Chrome
// starts but never reaches the page, so the gate never breaks on a browserless
// or saturated box; on this fleet's VMs it runs for real.
// ---------------------------------------------------------------------------
section("fedcm credentialed CORS browser verdict", async () => {
  const label = "fedcm credentialed CORS browser verdict";
  const chromeCandidates = [
    Deno.env.get("CHROME_BIN"),
    `${
      Deno.env.get("HOME") ?? ""
    }/.cache/browsers/chrome/linux-154.0.8037.92/chrome-linux64/chrome`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  let chromeBin = null;
  for (const c of chromeCandidates) {
    try {
      await Deno.stat(c);
      chromeBin = c;
      break;
    } catch { /* next candidate */ }
  }
  if (!chromeBin) {
    console.log(
      `skip ${label}: no Chrome binary (set CHROME_BIN); header-level sections still ran`,
    );
    return;
  }

  const FEDCM_PATH = "/v148/agentic-federated-login/fedcm/client-metadata";
  // Under heavy host steal a freshly-bound listener can take seconds before it
  // accepts; wait for it so Chrome never races a half-open port (an empty dump
  // from a refused navigation looks exactly like a failed verdict).
  const waitForListen = async (url, what) => {
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(url, { method: "HEAD" });
        return true;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw new Error(`${label}: ${what} never accepted a connection`);
  };
  const handler = (req) =>
    handleLegacyReleaseEndpoints(
      new Request(`http://127.0.0.1:3000${new URL(req.url).pathname}`, {
        method: req.method,
        headers: req.headers,
      }),
      "v148",
      "/agentic-federated-login/fedcm/client-metadata",
      noAsset,
    );

  // The page REPORTS its verdict to the test server (a same-origin navigation)
  // instead of the test dumping the DOM: the assertion then runs on data this
  // process received directly, which removes every load-vs-dump timing race and
  // makes progress visible as the server logs each hit. On this fleet's
  // contended 2-vCPU VMs Chrome can boot yet never produce a --dump-dom, which
  // is why this section no longer depends on that.
  const driverPage = (fetchUrl, caseName, reportUrl) =>
    `<!doctype html>
<html><body>
<p id="case">${caseName}</p>
<pre id="verdict">pending</pre>
<script>
(async () => {
  let verdict;
  try {
    const res = await fetch(${JSON.stringify(fetchUrl)}, {
      credentials: "include",
      mode: "cors",
    });
    let bodyOk = false;
    try {
      const body = await res.json();
      bodyOk = typeof body.privacy_policy_url === "string";
    } catch { /* unreadable or non-JSON body */ }
    verdict = "BROWSER-ACCEPTED status=" + res.status + " bodyReadable=" + bodyOk;
  } catch (e) {
    verdict = "BROWSER-REFUSED " + (e && e.name);
  }
  document.getElementById("verdict").textContent = verdict;
  location.href = ${JSON.stringify(reportUrl)} + "&result=" + encodeURIComponent(verdict);
})();
</script>
</body></html>`;

  let sitePort = 0, attackerPort = 0;
  // Both listeners live in this process, so a verdict reported to EITHER
  // origin (the foreign page reports to its own) lands in the same map.
  const reported = new Map();
  const reportWaiters = [];
  const reportRoute = (req) => {
    const u = new URL(req.url);
    const caseName = u.searchParams.get("case") ?? "unknown";
    const result = u.searchParams.get("result") ?? "missing-result";
    console.log(`     ${label}: browser reported case=${caseName} -> ${result}`);
    reported.set(caseName, result);
    for (const w of reportWaiters.splice(0)) w();
    return new Response("reported", { headers: { "content-type": "text/plain" } });
  };
  const waitForVerdict = (caseName, ms) =>
    new Promise((resolve) => {
      if (reported.has(caseName)) return resolve(reported.get(caseName));
      const timer = setTimeout(() => resolve(null), ms);
      reportWaiters.push(() => {
        clearTimeout(timer);
        resolve(reported.get(caseName));
      });
    });
  const site = Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen: ({ port }) => (sitePort = port) },
    (req) => {
      const path = new URL(req.url).pathname;
      if (path === FEDCM_PATH) return handler(req);
      if (path === "/report") return reportRoute(req);
      if (path === "/driver/own") {
        console.log(`     ${label}: chrome requested the own-origin driver page`);
        return new Response(
          driverPage(
            `http://localhost:${sitePort}${FEDCM_PATH}`,
            "own",
            `http://127.0.0.1:${sitePort}/report?case=own`,
          ),
          { headers: { "content-type": "text/html" } },
        );
      }
      return new Response("not found", { status: 404 });
    },
  );
  const attacker = Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen: ({ port }) => (attackerPort = port) },
    (req) => {
      const path = new URL(req.url).pathname;
      if (path === "/report") return reportRoute(req);
      console.log(`     ${label}: chrome requested the foreign-origin driver page`);
      return new Response(attackerHtml, { headers: { "content-type": "text/html" } });
    },
  );
  let attackerHtml = "";
  try {
    attackerHtml = driverPage(
      `http://127.0.0.1:${sitePort}${FEDCM_PATH}`,
      "foreign",
      `http://127.0.0.1:${attackerPort}/report?case=foreign`,
    );
    await waitForListen(`http://127.0.0.1:${sitePort}${FEDCM_PATH}`, "site server");
    await waitForListen(`http://127.0.0.1:${attackerPort}/`, "attacker server");

    // Launch Chrome at a page and wait for the PAGE ITSELF to report back; the
    // browser process is killed as soon as the verdict arrives (or after the
    // bound), so nothing here depends on dump timing.
    const driveCase = async (pageUrl, caseName) => {
      const profile = await Deno.makeTempDir({ prefix: "cors-probe-" });
      let child = null;
      try {
        child = new Deno.Command(chromeBin, {
          args: [
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--no-default-browser-check",
            `--user-data-dir=${profile}`,
            pageUrl,
          ],
          stdin: "null",
          stdout: "null",
          stderr: "null",
        }).spawn();
        const verdict = await waitForVerdict(caseName, 120000);
        return verdict;
      } finally {
        await reapChild(child, `${label}: the ${caseName} Chrome child`);
        await removeProfile(profile, `${label}: the ${caseName} Chrome profile`);
      }
    };

    const own = await driveCase(`http://localhost:${sitePort}/driver/own`, "own");
    const foreign = await driveCase(`http://127.0.0.1:${attackerPort}/`, "foreign");

    if (!own || !foreign) {
      // Chrome could not produce a verdict on this run: SKIP loudly rather than
      // fail — the header-level CORS sections above still ran, and the retained
      // artefact drive under ~/fleet-evidence/ carries the authoritative one.
      console.log(
        `skip ${label}: Chrome produced no verdict on this run ` +
          `(own=${own ?? "none"} foreign=${foreign ?? "none"}); ` +
          `header-level sections still ran`,
      );
      return;
    }
    assert(
      own.startsWith("BROWSER-ACCEPTED") &&
        own.includes("status=200") && own.includes("bodyReadable=true"),
      `${label}: own-origin loopback pair should be accepted with credentials, got: ${own}`,
    );
    assert(
      foreign.startsWith("BROWSER-REFUSED"),
      `${label}: foreign origin must be refused by the browser, got: ${foreign}`,
    );
    console.log(`     ${label}: own-origin-family -> ${own}`);
    console.log(`     ${label}: foreign-origin  -> ${foreign}`);
  } finally {
    await closeListener(site, `${label}: the own-origin listener`);
    await closeListener(attacker, `${label}: the foreign-origin listener`);
  }
});

// ---------------------------------------------------------------------------
// Compression dictionary echo: the ACAO on this demo route is an allowlist
// decision, not a reflection of the request's own Origin. Before this was
// guarded, ANY origin string was echoed back verbatim — a foreign origin got
// its own origin, `Origin: null` (sandboxed and data: documents) was granted
// ACAO: null, and an over-long value passed through untouched. The site's own
// origin and the loopback host pair must keep being echoed exactly as before,
// because the v156 demos exercise the route from the site itself.
// ---------------------------------------------------------------------------
section("dictionary echo echoes only the site origin", async () => {
  const label = "dictionary echo echoes only the site origin";
  const SUB = "/compression-dictionary-transport-updates/dict-echo/events";
  const acaoFor = async (origin) => {
    const headers = origin === null ? undefined : { origin };
    const res = await handleLegacyReleaseEndpoints(
      new Request(`http://127.0.0.1:3000/v156${SUB}?token=t`, { headers }),
      "v156",
      SUB,
      noAsset,
    );
    return res?.headers.get("access-control-allow-origin") ?? null;
  };

  assert(
    await acaoFor("http://127.0.0.1:3000") === "http://127.0.0.1:3000",
    `${label}: the site's own origin must still be echoed`,
  );
  assert(
    await acaoFor("http://localhost:3000") === "http://localhost:3000",
    `${label}: the loopback host pair must still be echoed`,
  );
  assert(
    await acaoFor("https://evil.example") === null,
    `${label}: a foreign origin received its own origin back in ACAO`,
  );
  assert(
    await acaoFor("null") === null,
    `${label}: a null (sandboxed/document) origin was granted ACAO: null`,
  );
  assert(
    await acaoFor("https://" + "a".repeat(292) + ".example") === null,
    `${label}: an over-long origin was reflected verbatim`,
  );
  assert(
    await acaoFor(null) === "http://127.0.0.1:3000",
    `${label}: a request with no Origin should receive the site origin, never a wildcard`,
  );
});

// ---------------------------------------------------------------------------
// 7c. The feature catalogue table escapes the ChromeStatus href it builds from
//     an upstream-supplied feature id, and the conformance run-all page escapes
//     the milestone values it renders.
// ---------------------------------------------------------------------------

section("feature catalogue rows escape the upstream ChromeStatus id", async () => {
  const label = "feature catalogue rows escape the upstream ChromeStatus id";
  const rows = renderFeatureCatalogueRows([
    {
      canonicalMstone: 151,
      milestones: [151],
      id: '5"x',
      name: "Feature",
      summary: "Summary",
      category: "Enabled by default",
      href: '/v151/feature" onmouseover="alert(1)',
    },
  ]);
  assert(
    !rows.includes('feature/5"x') && rows.includes("feature/5&quot;x"),
    `${label}: raw upstream id reached the href attribute`,
  );
  assert(
    !rows.includes('onmouseover="alert') && rows.includes("&quot; onmouseover=&quot;"),
    `${label}: raw upstream href reached the attribute`,
  );
});

section("conformance run-all page escapes the release value", async () => {
  const label = "conformance run-all page escapes the release value";
  const hostile = 'v9" onmouseover="alert(1)';
  const page = renderConformanceRunAllPage([
    {
      release: hostile,
      featureSlug: "feature",
      conceptSlug: null,
      assertions: [{ id: "a1", description: "d", kind: "k", specSection: null }],
    },
  ]);
  assert(
    !page.includes('onmouseover="alert') && !page.includes(`value="${hostile}"`),
    `${label}: raw hostile release reached a server-rendered attribute`,
  );
  assert(
    page.includes('value="v9&quot; onmouseover=&quot;alert(1)"'),
    `${label}: escaped release missing from the filter options`,
  );
  // The table rows are built in the page's own script, so assert on the
  // template it ships: the milestone attribute must call the page's escaper.
  assert(
    page.includes('data-milestone="${escapeHTML(suite.release)}"') &&
      !page.includes('data-milestone="${suite.release}"'),
    `${label}: row template does not escape the milestone attribute`,
  );
});

// 8. Conformance and critique pages escape values that arrive from repo JSON
//    (conformance.json / _questions.json), which is parsed without validation.
// ---------------------------------------------------------------------------

section("conformance page escapes the ChromeStatus id", async () => {
  const label = "conformance page escapes the ChromeStatus id";
  const html = renderConformancePage({
    release: "v151",
    featureSlug: "feature",
    chromestatusId: '5"x',
    generatedAt: "2026-10-08T00:00:00Z",
    author: "test",
    assertions: [],
  });
  assert(!html.includes('feature/5"x'), `${label}: raw id reached the href`);
  assert(html.includes("/feature/5&quot;x"), `${label}: escaped href missing`);

  // The visible link text is a SEPARATE sink from the href, so assert it too:
  // without this, deleting the text escape would leave this section passing.
  const textHtml = renderConformancePage({
    release: "v151",
    featureSlug: "feature",
    chromestatusId: "5<script>alert(1)</script>",
    generatedAt: "2026-10-08T00:00:00Z",
    author: "test",
    assertions: [],
  });
  assert(
    !textHtml.includes("<script>alert(1)</script>"),
    `${label}: raw id reached the link text`,
  );
  assert(
    textHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"),
    `${label}: link text was not encoded`,
  );
});

section("critique detail escapes the severity chip and the ChromeStatus link", async () => {
  const label = "critique detail escapes the severity chip and the ChromeStatus link";
  const html = renderCritiqueDetail({
    release: "v151",
    featureSlug: "feature",
    chromestatusId: '5"x',
    reviewedAt: "2026-10-08T00:00:00Z",
    reviewer: "test",
    rubric: { spec_match: { state: "pass", rationale: "checked" } },
    openQuestions: [
      { title: "q", detail: "d", severity: 'minor" onmouseover="alert(1)' },
    ],
  });
  assert(
    !html.includes('onmouseover="alert'),
    `${label}: raw severity reached the class attribute or the chip text`,
  );
  assert(!html.includes('feature/5"x'), `${label}: raw id reached the href`);
  assert(html.includes("&quot; onmouseover=&quot;"), `${label}: escaped severity missing`);
  assert(html.includes("/feature/5&quot;x"), `${label}: escaped href missing`);

  // Same again for the critique link text, which is a separate sink.
  const textHtml = renderCritiqueDetail({
    release: "v151",
    featureSlug: "feature",
    chromestatusId: "5<script>alert(1)</script>",
    reviewedAt: "2026-10-08T00:00:00Z",
    reviewer: "test",
    rubric: { spec_match: { state: "pass", rationale: "checked" } },
    openQuestions: [],
  });
  assert(
    !textHtml.includes("<script>alert(1)</script>"),
    `${label}: raw id reached the link text`,
  );
  assert(
    textHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"),
    `${label}: link text was not encoded`,
  );
});

// ---------------------------------------------------------------------------
// Focus cascade and roving tabindex: real browser measurement on the
// use-case-sampler demo page.
//
// Asserts that:
// 1. The .uc-card radio control is programmatically focusable;
// 2. The focus ring is visible (computed outlineStyle !== 'none' or non-zero
//    box-shadow) — pins that later/higher-specificity rules do not strip it;
// 3. The roving tabindex contract: dispatching ArrowRight keydown moves focus
//    and selection to the next card, updating activeElement, aria-checked,
//    and tabindex attributes according to the WAI-ARIA Radio Group pattern.
// ---------------------------------------------------------------------------
section("focus cascade and roving tabindex on use-case sampler", async () => {
  const label = "focus cascade and roving tabindex on use-case sampler";
  const chromeCandidates = [
    Deno.env.get("CHROME_BIN"),
    `${
      Deno.env.get("HOME") ?? ""
    }/.cache/browsers/chrome/linux-154.0.8037.92/chrome-linux64/chrome`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  let chromeBin = null;
  for (const c of chromeCandidates) {
    try {
      await Deno.stat(c);
      chromeBin = c;
      break;
    } catch { /* next candidate */ }
  }
  if (!chromeBin) {
    console.log(`skip ${label}: no Chrome binary (set CHROME_BIN)`);
    return;
  }

  const pagePath = new URL(
    "../v150/web-speech-api-on-device-recognition-quality/use-case-sampler/index.html",
    import.meta.url,
  ).pathname;
  const rawHtml = await Deno.readTextFile(pagePath);

  let reportedVerdict = null;
  let reportWaiter = null;
  let pageServed = 0;
  const waitForVerdict = (ms) =>
    new Promise((resolve) => {
      if (reportedVerdict) return resolve(reportedVerdict);
      const timer = setTimeout(() => resolve(null), ms);
      reportWaiter = () => {
        clearTimeout(timer);
        resolve(reportedVerdict);
      };
    });

  let serverPort = 0;
  const server = Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen: ({ port }) => (serverPort = port) },
    async (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/report") {
        const raw = u.searchParams.get("result");
        const err = u.searchParams.get("error");
        if (err) {
          reportedVerdict = { error: err };
        } else if (raw) {
          try {
            reportedVerdict = JSON.parse(raw);
          } catch {
            reportedVerdict = { raw };
          }
        }
        reportWaiter?.();
        return new Response("ok", { headers: { "content-type": "text/plain" } });
      }
      if (u.pathname.startsWith("/public/")) {
        const res = await handlePublicRoute(req);
        if (res) return res;
      }
      if (u.pathname === "/" || u.pathname === "/index.html") {
        const probe = `
<script>
window.addEventListener('load', () => {
  try {
    const cards = document.querySelectorAll('.uc-card');
    if (!cards || cards.length < 2) throw new Error('expected at least 2 .uc-card controls, found ' + (cards ? cards.length : 0));
    const first = cards[0];
    const second = cards[1];

    first.focus();
    const isFocusable = document.activeElement === first;
    const activeBefore = document.activeElement ? (document.activeElement.id || document.activeElement.className) : null;

    const cs = window.getComputedStyle(first);
    const outlineStyle = cs.outlineStyle;
    const outlineWidth = cs.outlineWidth;
    const outlineColor = cs.outlineColor;
    const boxShadow = cs.boxShadow;
    // A non-'none' outline style is not enough on its own: an outline of
    // '0px solid' computes to outlineStyle=solid and draws nothing. Require
    // real pixels.
    const outlinePx = parseFloat(outlineWidth) || 0;
    const focusRingVisible = (outlineStyle !== 'none' && outlinePx > 0) ||
      (boxShadow && boxShadow !== 'none');

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    const isNextFocused = document.activeElement === second;
    const activeAfter = document.activeElement ? (document.activeElement.id || document.activeElement.className) : null;
    const firstAriaChecked = first.getAttribute('aria-checked');
    const firstTabindex = first.getAttribute('tabindex');
    const secondAriaChecked = second.getAttribute('aria-checked');
    const secondTabindex = second.getAttribute('tabindex');

    const data = {
      isFocusable,
      activeBefore,
      outlineStyle,
      outlineWidth,
      outlineColor,
      boxShadow,
      outlinePx,
      focusRingVisible,
      isNextFocused,
      activeAfter,
      firstAriaChecked,
      firstTabindex,
      secondAriaChecked,
      secondTabindex
    };
    location.href = '/report?result=' + encodeURIComponent(JSON.stringify(data));
  } catch (e) {
    location.href = '/report?error=' + encodeURIComponent(e && e.message ? e.message : String(e));
  }
});
</script>
`;
        const html = rawHtml.replace("</body>", probe + "</body>");
        if (html === rawHtml) {
          throw new Error(`${label}: probe injection failed - no </body> in ${pagePath}`);
        }
        pageServed++;
        return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return new Response("not found", { status: 404 });
    },
  );

  const profile = await Deno.makeTempDir({ prefix: "focus-probe-" });
  let child = null;
  try {
    const pageUrl = `http://127.0.0.1:${serverPort}/`;
    child = new Deno.Command(chromeBin, {
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profile}`,
        pageUrl,
      ],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).spawn();

    const verdict = await waitForVerdict(120000);
    if (!verdict) {
      // Not a skip: the harness only reaches here with a Chrome binary present, so a
      // missing verdict means the injected probe never ran - the page did not load, or
      // its script threw. Nothing else in the repo measures this claim, so a silent
      // skip would retire the only coverage there is.
      throw new Error(
        `${label}: Chrome produced no verdict in 120s (page requests: ${pageServed}). ` +
          `With a Chrome binary present this is a failure, not a skip: the injected probe never ran.`,
      );
    }
    if (verdict.error) {
      throw new Error(`${label}: probe error: ${verdict.error}`);
    }

    assert(
      verdict.isFocusable,
      `${label}: activeElement after first.focus() was ${verdict.activeBefore}, expected uc-command`,
    );
    assert(
      verdict.focusRingVisible,
      `${label}: focus must be visible; got outlineStyle=${verdict.outlineStyle}, outlineWidth=${verdict.outlineWidth}, boxShadow=${verdict.boxShadow}`,
    );
    assert(
      verdict.isNextFocused,
      `${label}: activeElement after ArrowRight was ${verdict.activeAfter}, expected uc-dictation`,
    );
    assert(
      verdict.secondAriaChecked === "true" && verdict.secondTabindex === "0",
      `${label}: next card state invalid: aria-checked=${verdict.secondAriaChecked}, tabindex=${verdict.secondTabindex}`,
    );
    assert(
      verdict.firstAriaChecked === "false" && verdict.firstTabindex === "-1",
      `${label}: previous card state invalid: aria-checked=${verdict.firstAriaChecked}, tabindex=${verdict.firstTabindex}`,
    );
    console.log(
      `     ${label}: selector=.uc-card#uc-command computed outline="${verdict.outlineStyle} ${verdict.outlineWidth} ${verdict.outlineColor}" roving->#${verdict.activeAfter} aria-checked=${verdict.secondAriaChecked}`,
    );
  } finally {
    // Independent steps: a listener that fails to close must never stop the
    // Chrome reap or the profile removal, and none of the three can throw, so
    // all three are always attempted and always reported.
    await reapChild(child, `${label}: the Chrome child`);
    await removeProfile(profile, `${label}: the Chrome profile`);
    await closeListener(server, `${label}: the page listener`);
  }
});

// ---------------------------------------------------------------------------
// Rendered overflow of the /critiques table at 390px viewport width.
//
// Asserts that at a mobile viewport (390x740):
// 1. The scroll region genuinely scrolls: .table-scroll has clientWidth > 0,
//    scrollWidth > clientWidth, and horizontal scroll capability;
// 2. The DOCUMENT does not overflow: documentElement.scrollWidth <= clientWidth + 1;
// 3. The region is keyboard reachable in the rendered DOM (tabindex attribute present).
// ---------------------------------------------------------------------------
section("critiques table rendered overflow at 390px", async () => {
  const label = "critiques table rendered overflow at 390px";
  const chromeCandidates = [
    Deno.env.get("CHROME_BIN"),
    `${
      Deno.env.get("HOME") ?? ""
    }/.cache/browsers/chrome/linux-154.0.8037.92/chrome-linux64/chrome`,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  let chromeBin = null;
  for (const c of chromeCandidates) {
    try {
      await Deno.stat(c);
      chromeBin = c;
      break;
    } catch { /* next candidate */ }
  }
  if (!chromeBin) {
    console.log(`skip ${label}: no Chrome binary (set CHROME_BIN)`);
    return;
  }

  const rawHtml = await renderCritiquesIndex();

  let reportedVerdict = null;
  let reportWaiter = null;
  let pageServed = 0;
  const waitForVerdict = (ms) =>
    new Promise((resolve) => {
      if (reportedVerdict) return resolve(reportedVerdict);
      const timer = setTimeout(() => resolve(null), ms);
      reportWaiter = () => {
        clearTimeout(timer);
        resolve(reportedVerdict);
      };
    });

  let serverPort = 0;
  const server = Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen: ({ port }) => (serverPort = port) },
    async (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/report") {
        const raw = u.searchParams.get("result");
        const err = u.searchParams.get("error");
        if (err) {
          reportedVerdict = { error: err };
        } else if (raw) {
          try {
            reportedVerdict = JSON.parse(raw);
          } catch {
            reportedVerdict = { raw };
          }
        }
        reportWaiter?.();
        return new Response("ok", { headers: { "content-type": "text/plain" } });
      }
      if (u.pathname.startsWith("/public/")) {
        const res = await handlePublicRoute(req);
        if (res) return res;
      }
      if (u.pathname === "/critiques") {
        const probe = `
<script>
window.addEventListener('load', () => {
  try {
    const scrollRegion = document.querySelector('.table-scroll');
    if (!scrollRegion) throw new Error('.table-scroll element not found');
    const doc = document.documentElement;

    const initialLeft = scrollRegion.scrollLeft;
    scrollRegion.scrollLeft = 20;
    const canScroll = scrollRegion.scrollLeft > 0;
    scrollRegion.scrollLeft = initialLeft;

    const cs = window.getComputedStyle(scrollRegion);
    const overflowX = cs.overflowX;

    const data = {
      tableScrollWidth: scrollRegion.scrollWidth,
      tableClientWidth: scrollRegion.clientWidth,
      tableTabIndex: scrollRegion.getAttribute('tabindex'),
      tableOverflowX: overflowX,
      canScroll,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      windowInnerWidth: window.innerWidth,
    };
    location.href = '/report?result=' + encodeURIComponent(JSON.stringify(data));
  } catch (e) {
    location.href = '/report?error=' + encodeURIComponent(e && e.message ? e.message : String(e));
  }
});
</script>
`;
        const html = rawHtml.replace("</body>", probe + "</body>");
        if (html === rawHtml) {
          throw new Error(
            `${label}: probe injection failed - no </body> in the rendered /critiques page`,
          );
        }
        pageServed++;
        return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return new Response("not found", { status: 404 });
    },
  );

  const profile = await Deno.makeTempDir({ prefix: "critiques-overflow-" });
  let child = null;
  try {
    const pageUrl = `http://127.0.0.1:${serverPort}/critiques`;
    child = new Deno.Command(chromeBin, {
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=390,740",
        "--hide-scrollbars",
        `--app=${pageUrl}`,
        `--user-data-dir=${profile}`,
      ],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).spawn();

    const verdict = await waitForVerdict(120000);
    if (!verdict) {
      // Not a skip: the harness only reaches here with a Chrome binary present, so a
      // missing verdict means the injected probe never ran - the page did not load, or
      // its script threw. Nothing else in the repo measures this claim, so a silent
      // skip would retire the only coverage there is.
      throw new Error(
        `${label}: Chrome produced no verdict in 120s (page requests: ${pageServed}). ` +
          `With a Chrome binary present this is a failure, not a skip: the injected probe never ran.`,
      );
    }
    if (verdict.error) {
      throw new Error(`${label}: probe error: ${verdict.error}`);
    }

    assert(
      verdict.tableClientWidth > 0 && verdict.tableScrollWidth > verdict.tableClientWidth &&
        verdict.canScroll,
      `${label}: scroll region does not genuinely scroll (scrollWidth=${verdict.tableScrollWidth}, clientWidth=${verdict.tableClientWidth}, canScroll=${verdict.canScroll}, overflowX=${verdict.tableOverflowX})`,
    );
    assert(
      verdict.docScrollWidth <= verdict.docClientWidth + 1,
      `${label}: document overflows (scrollWidth=${verdict.docScrollWidth}, clientWidth=${verdict.docClientWidth})`,
    );
    assert(
      verdict.tableTabIndex !== null,
      `${label}: tabindex attribute missing on .table-scroll (got ${verdict.tableTabIndex})`,
    );
    console.log(
      `     ${label}: .table-scroll clientWidth=${verdict.tableClientWidth} scrollWidth=${verdict.tableScrollWidth} doc clientWidth=${verdict.docClientWidth} scrollWidth=${verdict.docScrollWidth}`,
    );
  } finally {
    await reapChild(child, `${label}: the Chrome child`);
    await removeProfile(profile, `${label}: the Chrome profile`);
    await closeListener(server, `${label}: the page listener`);
  }
});

// ---- end of sections ----

// ONE aggregate case: the runner reports a single pass/fail for the suite, while
// every section still runs even when an earlier one fails, so the failure
// breadth the legacy footer printed survives inside the case.
Deno.test("the server hardening contract holds across request caps, origin gates and a real headless browser", async () => {
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
    if (teardownFailures > 0) {
      console.error(
        `server-hardening tests: ${teardownFailures} of those failures came from teardown; see the FAIL lines above`,
      );
    }
    console.error(`\nserver-hardening tests: ${failures.length} section(s) failed`);
    throw new Error(`${failures.length} server-hardening section(s) failed`);
  }
  console.log("\nserver-hardening tests: all sections passed");
});
