// Header-grammar guards for the request-influenced response headers
// (bead chrome_platform_showcase-ypf).
//
// Three fixture routes put request input straight into response headers:
//   - `delayed-echo` builds `Server-Timing: edge;dur=<n>;desc="<label>"` from
//     `?label=`,
//   - `policy-echo` builds `Permissions-Policy: local-network=(<local>),
//     loopback-network=(<loopback>)` from `?local=` / `?loopback=`, and
//   - `client-hints-echo` (v145/reduced-user-agent-strings-by-default, bead
//     chrome_platform_showcase-mm5.3) builds `Accept-CH: <hints>` and the
//     `Vary` list from `?hint=` / `?hints=none`.
//
// A request value that does not fit the header's grammar either throws while
// constructing the response headers (a CR/LF makes Deno's Headers reject the
// value, so the route 500s instead of answering) or silently rewrites the
// header the demo is trying to demonstrate (a `"` closes the Server-Timing
// `desc` quoted-string; a `)` can open a second policy entry). The routes must
// reject a value outside the grammar the fixture actually uses, with a 4xx, and
// never 500.
//
// Migrated in place to named Deno.test cases (Stage 6 of the dty proposal, bead
// dty.6): same file path, same task id `test-header-grammar`, same ordered gate
// step, same seven subjects and the same assertions — the custom `section()`
// registry, its trailing loop and the legacy `Deno.exit(1)` branch are gone, so a
// failure names the sidecar behaviour it broke and Deno's runner owns the exit code.
//
// The child needs NO permission (the two sidecar modules are imported, not read), so
// the task passes no child flags and no `--` separator, as Stage 5 does.
//
// Output rebaseline (deliberate, documented): the legacy final line had no
// `PASS — ` prefix, so the task now prints `PASS — header-grammar tests` /
// `FAIL — header-grammar tests (1 file(s) failed)` — a neutral label, truthfully
// prefixed in both directions. A read-only audit found no consumer of the old text.
//
// Stage 7 (bead dty.7): the legacy `call()` helper, its `noAsset` stub and the
// `handleLegacyReleaseEndpoints` import were kept verbatim through the Stage 6
// migration and are removed here now that all seven cases drive the two sidecar
// modules directly. Only the module graph this suite loads shrinks; the subjects,
// assertions, task id, gate step and sidecar mappings are unchanged.
//
// Run: deno task test-header-grammar

import { handleFeatureRequest as handlePolicyEchoFeatureRequest } from "../v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/_server.ts";
import { handleFeatureRequest as handleDelayedEchoFeatureRequest } from "../v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields/_server.ts";
import { handleFeatureRequest as handleUaChMigrationFeatureRequest } from "../v145/reduced-user-agent-strings-by-default/_server.ts";

const DELAY_SUB =
  "/resource-timing-add-spec-compliant-service-worker-router-timing-fields/delayed-echo";
const POLICY_SUB =
  "/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/policy-echo";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function callPolicyEchoSidecar(sub, query) {
  const req = new Request(`http://localhost:3000/v151${sub}${query ?? ""}`);
  try {
    const res = await handlePolicyEchoFeatureRequest(req, sub);
    return res ?? new Response(null, { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ thrown: String(err) }), { status: 500 });
  }
}

async function callDelayedEchoSidecar(sub, query) {
  const req = new Request(`http://localhost:3000/v151${sub}${query ?? ""}`);
  try {
    const res = await handleDelayedEchoFeatureRequest(req, sub);
    return res ?? new Response(null, { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ thrown: String(err) }), { status: 500 });
  }
}

const CRLF_ENC = "%0D%0A";
const EXPECTED_BAD_STATUS = 400;

// ---------------------------------------------------------------------------
// Server-Timing: desc="<label>"

Deno.test("ok — delayed-echo keeps the demo's own label working", async () => {
  const res = await callDelayedEchoSidecar(DELAY_SUB, "?label=run-1759988000000-1&delay=0");
  assert(res.status === 200, `a normal demo label should still work, got ${res.status}`);
  const timing = res.headers.get("server-timing");
  assert(timing, "the response should still carry Server-Timing");
  assert(
    timing === 'edge;dur=0;desc="run-1759988000000-1"',
    `Server-Timing should be well formed, got ${JSON.stringify(timing)}`,
  );
});

Deno.test("ok — delayed-echo never 500s on a CR/LF label", async () => {
  const res = await callDelayedEchoSidecar(
    DELAY_SUB,
    `?label=a${CRLF_ENC}X-Injected:%20yes&delay=0`,
  );
  assert(
    res.status !== 500,
    "a CR/LF label must not crash the route (it currently throws while building the header)",
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a CR/LF label should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

Deno.test("ok — delayed-echo rejects a label that breaks the desc quoted-string", async () => {
  const res = await callDelayedEchoSidecar(
    DELAY_SUB,
    `?label=${encodeURIComponent('a", evil;dur=1')}&delay=0`,
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a quote in the label alters the demonstrated header and should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

Deno.test("ok — delayed-echo bounds the label length", async () => {
  const res = await callDelayedEchoSidecar(
    DELAY_SUB,
    `?label=${"l".repeat(4096)}&delay=0`,
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `an oversized label should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

// ---------------------------------------------------------------------------
// Permissions-Policy: local-network=(<local>), loopback-network=(<loopback>)

Deno.test("ok — policy-echo keeps the demo's own allowlist values working", async () => {
  const selfStar = await callPolicyEchoSidecar(
    POLICY_SUB,
    "?local=self&loopback=*&allow=trusted",
  );
  assert(selfStar.status === 200, `self/* should still work, got ${selfStar.status}`);
  assert(
    selfStar.headers.get("permissions-policy") === "local-network=(self), loopback-network=(*)",
    `unexpected header: ${JSON.stringify(selfStar.headers.get("permissions-policy"))}`,
  );

  const empty = await callPolicyEchoSidecar(POLICY_SUB, "?local=&loopback=&allow=none");
  assert(empty.status === 200, `the "none" option should still work, got ${empty.status}`);
  assert(
    empty.headers.get("permissions-policy") === "local-network=(), loopback-network=()",
    `unexpected header for the empty option: ${
      JSON.stringify(empty.headers.get("permissions-policy"))
    }`,
  );
});

Deno.test("ok — policy-echo never 500s on a CR/LF value", async () => {
  const res = await callPolicyEchoSidecar(
    POLICY_SUB,
    `?local=a${CRLF_ENC}X-Injected:%20yes&loopback=self`,
  );
  assert(
    res.status !== 500,
    "a CR/LF policy value must not crash the route (it currently throws while building the header)",
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a CR/LF policy value should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

Deno.test("ok — policy-echo rejects a value that rewrites the demonstrated header", async () => {
  const res = await callPolicyEchoSidecar(
    POLICY_SUB,
    `?local=${encodeURIComponent("self), loopback-network=(*")}`,
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a paren value alters the demonstrated policy and should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

// ── ua-ch-migration client-hints-echo (v145 sidecar, bead mm5.3) ───────────
const UA_CH_SUB = "/reduced-user-agent-strings-by-default/ua-ch-migration/client-hints-echo";

async function callUaChSidecar(sub, query, headers = {}) {
  const req = new Request(`http://localhost:3000/v145${sub}${query ?? ""}`, {
    headers,
  });
  return await handleUaChMigrationFeatureRequest(req, sub);
}

Deno.test("ok — client-hints-echo opts in to the two default high-entropy hints", async () => {
  const res = await callUaChSidecar(UA_CH_SUB, "");
  assert(res && res.status === 200, `expected 200, got ${res?.status}`);
  assert(
    res.headers.get("accept-ch") ===
      "Sec-CH-UA-Platform-Version, Sec-CH-UA-Full-Version-List",
    `unexpected Accept-CH: ${res.headers.get("accept-ch")}`,
  );
  const vary = res.headers.get("vary") ?? "";
  for (
    const name of [
      "User-Agent",
      "Sec-CH-UA",
      "Sec-CH-UA-Mobile",
      "Sec-CH-UA-Platform",
      "Sec-CH-UA-Platform-Version",
      "Sec-CH-UA-Full-Version-List",
    ]
  ) {
    assert(vary.includes(name), `Vary must include ${name}: ${vary}`);
  }
  assert(res.headers.get("cache-control") === "no-store", "must be no-store");
});

Deno.test("ok — client-hints-echo parses repeated and comma-split hint params, deduped, invalid dropped", async () => {
  const res = await callUaChSidecar(
    UA_CH_SUB,
    "?hint=Sec-CH-UA-Arch&hint=Sec-CH-UA-Arch,%20Not-A-Hint",
  );
  const body = await res.json();
  assert(
    JSON.stringify(body.optInHints) === JSON.stringify(["Sec-CH-UA-Arch"]),
    `expected deduped valid hints only, got ${JSON.stringify(body.optInHints)}`,
  );
  assert(
    res.headers.get("accept-ch") === "Sec-CH-UA-Arch",
    `Accept-CH must carry the deduped hint: ${res.headers.get("accept-ch")}`,
  );
});

Deno.test("ok — client-hints-echo ?hints=none omits Accept-CH entirely", async () => {
  const res = await callUaChSidecar(UA_CH_SUB, "?hints=none");
  assert(
    res.headers.get("accept-ch") === null,
    `Accept-CH must be omitted, got ${res.headers.get("accept-ch")}`,
  );
  const body = await res.json();
  assert(body.optInHints.length === 0, "optInHints must be empty");
  assert(
    body.note.includes("deliberately omits Accept-CH"),
    `unexpected note: ${body.note}`,
  );
});

Deno.test("ok — client-hints-echo reports missingOptedInHints against the request headers", async () => {
  const res = await callUaChSidecar(
    UA_CH_SUB,
    "?hint=Sec-CH-UA-Arch&hint=Sec-CH-UA-Model",
    { "sec-ch-ua-arch": "arm" },
  );
  const body = await res.json();
  assert(
    JSON.stringify(body.missingOptedInHints) === JSON.stringify(["Sec-CH-UA-Model"]),
    `expected only the unsent hint missing, got ${JSON.stringify(body.missingOptedInHints)}`,
  );
  assert(
    body.requestHeaders["Sec-CH-UA-Arch"] === "arm",
    "the received request header must be echoed back",
  );
});

Deno.test("ok — the v145 sidecar returns null for every path but the echo route", async () => {
  for (
    const sub of [
      "/reduced-user-agent-strings-by-default/ua-ch-migration",
      "/reduced-user-agent-strings-by-default/ua-ch-migration/index.html",
      "/reduced-user-agent-strings-by-default",
      "/unrelated",
    ]
  ) {
    const res = await callUaChSidecar(sub, "");
    assert(
      res === null,
      `sidecar must not answer ${sub} (the asset/HTML pipeline owns it)`,
    );
  }
});

// mm5.4: the v150 css-url-request-modifiers referrer-echo route is served by
// the feature sidecar (v150/css-url-request-modifiers/_server.ts), moved
// verbatim from the legacy dispatcher. These tests exercise the sidecar
// directly.

async function callReferrerEcho(
  sub,
  query = "",
  initHeaders = {},
  method = "GET",
) {
  const { handleFeatureRequest } = await import(
    "../v150/css-url-request-modifiers/_server.ts"
  );
  return handleFeatureRequest(
    new Request(
      `https://example.com/v150/css-url-request-modifiers${sub}${query}`,
      { method, headers: initHeaders },
    ),
    sub,
  );
}

Deno.test("ok — the referrer-echo route echoes policy, method, and fetch headers", async () => {
  const res = await callReferrerEcho(
    "/css-url-request-modifiers/referrer-echo",
    "?policy=strict-origin-when-cross-origin&nonce=1730000000000",
    {
      referer: "https://example.com/v150/css-url-request-modifiers/referrer-policy-demo/",
      origin: "https://example.com",
      "sec-fetch-site": "same-origin",
    },
  );
  assert(res, "the sidecar must answer the echo route");
  assert(res.status === 200, `expected 200, got ${res.status}`);
  assert(
    res.headers.get("cache-control") === "no-store",
    "the echo response must stay uncacheable",
  );
  const body = await res.json();
  assert(
    body.policy === "strict-origin-when-cross-origin",
    `policy must come from the query, got ${body.policy}`,
  );
  assert(body.method === "GET", `method must echo, got ${body.method}`);
  assert(
    body.referer.endsWith("/referrer-policy-demo/"),
    `referer must echo, got ${body.referer}`,
  );
  assert(body.origin === "https://example.com", `origin must echo, got ${body.origin}`);
  assert(
    body.secFetchSite === "same-origin",
    `sec-fetch-site must echo, got ${body.secFetchSite}`,
  );
});

Deno.test("ok — the referrer-echo route defaults policy and empty headers honestly", async () => {
  const res = await callReferrerEcho(
    "/css-url-request-modifiers/referrer-echo",
    "",
    {},
    "HEAD",
  );
  assert(res, "the sidecar must answer the echo route");
  const body = await res.json();
  assert(body.policy === "default", `missing policy must default, got ${body.policy}`);
  assert(body.method === "HEAD", `method must echo, got ${body.method}`);
  assert(
    body.referer === "" && body.origin === "" && body.secFetchSite === "",
    "absent headers echo as empty strings, not fabricated values",
  );
});

Deno.test("ok — the v150 sidecar returns null for every sibling/asset path", async () => {
  for (
    const sub of [
      "/css-url-request-modifiers",
      "/css-url-request-modifiers/referrer-policy-demo/",
      "/css-url-request-modifiers/crossorigin-integrity-demo/clean.svg",
      "/unrelated",
    ]
  ) {
    const res = await callReferrerEcho(sub);
    assert(
      res === null,
      `sidecar must not answer ${sub} (the legacy family/asset pipeline owns it)`,
    );
  }
});
