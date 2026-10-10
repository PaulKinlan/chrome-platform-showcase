// Header-grammar guards for the two request-influenced response headers
// (bead chrome_platform_showcase-ypf).
//
// Two v151 fixture routes put a request value straight into a response header:
//   - `delayed-echo` builds `Server-Timing: edge;dur=<n>;desc="<label>"` from
//     `?label=`, and
//   - `policy-echo` builds `Permissions-Policy: local-network=(<local>),
//     loopback-network=(<loopback>)` from `?local=` / `?loopback=`.
//
// A request value that does not fit the header's grammar either throws while
// constructing the response headers (a CR/LF makes Deno's Headers reject the
// value, so the route 500s instead of answering) or silently rewrites the
// header the demo is trying to demonstrate (a `"` closes the Server-Timing
// `desc` quoted-string; a `)` can open a second policy entry). The routes must
// reject a value outside the grammar the fixture actually uses, with a 4xx, and
// never 500.
//
// Run: deno task test-header-grammar

import { handleLegacyReleaseEndpoints } from "../routes/release-endpoints.ts";
import { handleFeatureRequest as handlePolicyEchoFeatureRequest } from "../v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/_server.ts";

const noAsset = async () => null;

const DELAY_SUB =
  "/resource-timing-add-spec-compliant-service-worker-router-timing-fields/delayed-echo";
const POLICY_SUB =
  "/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/policy-echo";

const failures = [];
const sections = [];
function section(label, fn) {
  sections.push({ label, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// A route that throws while building its headers is what a 500 looks like from
// the caller's side; model it as one so the assertions read true to life.
async function call(release, sub, query) {
  const req = new Request(`http://localhost:3000/${release}${sub}${query ?? ""}`);
  try {
    return await handleLegacyReleaseEndpoints(req, release, sub, noAsset);
  } catch (err) {
    return new Response(JSON.stringify({ thrown: String(err) }), { status: 500 });
  }
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

const CRLF_ENC = "%0D%0A";
const EXPECTED_BAD_STATUS = 400;

// ---------------------------------------------------------------------------
// Server-Timing: desc="<label>"

section("delayed-echo keeps the demo's own label working", async () => {
  const res = await call("v151", DELAY_SUB, "?label=run-1759988000000-1&delay=0");
  assert(res.status === 200, `a normal demo label should still work, got ${res.status}`);
  const timing = res.headers.get("server-timing");
  assert(timing, "the response should still carry Server-Timing");
  assert(
    timing === 'edge;dur=0;desc="run-1759988000000-1"',
    `Server-Timing should be well formed, got ${JSON.stringify(timing)}`,
  );
});

section("delayed-echo never 500s on a CR/LF label", async () => {
  const res = await call("v151", DELAY_SUB, `?label=a${CRLF_ENC}X-Injected:%20yes&delay=0`);
  assert(
    res.status !== 500,
    "a CR/LF label must not crash the route (it currently throws while building the header)",
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a CR/LF label should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

section("delayed-echo rejects a label that breaks the desc quoted-string", async () => {
  const res = await call(
    "v151",
    DELAY_SUB,
    `?label=${encodeURIComponent('a", evil;dur=1')}&delay=0`,
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a quote in the label alters the demonstrated header and should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

section("delayed-echo bounds the label length", async () => {
  const res = await call("v151", DELAY_SUB, `?label=${"l".repeat(4096)}&delay=0`);
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `an oversized label should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

// ---------------------------------------------------------------------------
// Permissions-Policy: local-network=(<local>), loopback-network=(<loopback>)

section("policy-echo keeps the demo's own allowlist values working", async () => {
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

section("policy-echo never 500s on a CR/LF value", async () => {
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

section("policy-echo rejects a value that rewrites the demonstrated header", async () => {
  const res = await callPolicyEchoSidecar(
    POLICY_SUB,
    `?local=${encodeURIComponent("self), loopback-network=(*")}`,
  );
  assert(
    res.status === EXPECTED_BAD_STATUS,
    `a paren value alters the demonstrated policy and should be rejected with ${EXPECTED_BAD_STATUS}, got ${res.status}`,
  );
});

// ---------------------------------------------------------------------------

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
  console.error(`\nheader-grammar tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nheader-grammar tests: all sections passed");
