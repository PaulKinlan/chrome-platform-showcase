// Stage 0 opt-in native Deno.test pilot (bead chrome_platform_showcase-9th, from dty).
//
// Scope: the four pure helpers in lib/request-guards.ts. Pure means pure: no I/O,
// no globals, no timers — so `deno task test:unit` grants ZERO permissions and
// every case below still runs. If a case ever needs a permission the run fails
// with NotCapable instead of quietly widening the runner (see dty §2).
//
// Opt-in: this suite is deliberately NOT part of `deno task check` or CI yet. The
// only thing that registers it is the `test:unit` task, pinned by the three
// assertions in scripts/gate-parity.test.mjs; nothing here may claim the
// migration to native Deno.test is complete.
//
// Assertions use the built-in node:assert/strict, so the pilot adds no jsr
// dependency and does not move deno.lock.
import assert from "node:assert/strict";

import {
  allowlistedCorsOrigin,
  forbiddenResponse,
  sameOriginRequest,
  validatedHeaderOrigin,
} from "../../lib/request-guards.ts";

const siteUrl = (raw = "https://showcase.example") => new URL(raw);
const request = ({ origin, site } = {}) => {
  const headers = new Headers();
  if (origin !== undefined) headers.set("origin", origin);
  if (site !== undefined) headers.set("sec-fetch-site", site);
  return new Request("https://showcase.example/api/release", { headers });
};

Deno.test("sameOriginRequest accepts same-origin and non-browser signals", async (t) => {
  await t.step("accepts sec-fetch-site: same-origin with a matching Origin", () => {
    assert.equal(
      sameOriginRequest(
        request({ site: "same-origin", origin: "https://showcase.example" }),
        siteUrl(),
      ),
      true,
    );
  });

  await t.step("accepts a non-browser client with no Origin and no Sec-Fetch-Site", () => {
    assert.equal(sameOriginRequest(request(), siteUrl()), true);
    assert.equal(sameOriginRequest(request({ site: "none" }), siteUrl()), true);
  });

  await t.step("refuses cross-site even when the Origin header matches the URL", () => {
    assert.equal(
      sameOriginRequest(
        request({ site: "cross-site", origin: "https://showcase.example" }),
        siteUrl(),
      ),
      false,
    );
    assert.equal(
      sameOriginRequest(
        request({ site: "same-site", origin: "https://showcase.example" }),
        siteUrl(),
      ),
      false,
    );
  });

  await t.step("refuses an Origin that is not the request's own origin", () => {
    assert.equal(
      sameOriginRequest(
        request({ site: "same-origin", origin: "https://evil.example" }),
        siteUrl(),
      ),
      false,
    );
  });
});

Deno.test("forbiddenResponse is a 403 JSON document with no header injection", async (t) => {
  await t.step("status, content-type and cache-control", () => {
    const res = forbiddenResponse("nope");
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(res.headers.get("cache-control"), "no-store");
  });

  await t.step("body is the pretty-printed error document", async () => {
    const res = forbiddenResponse("cross-site request");
    assert.equal(await res.text(), JSON.stringify({ error: "cross-site request" }, null, 2));
  });

  await t.step("a hostile reason stays in the body and cannot add a header", async () => {
    const reason = 'bad "quote"\nX-Injected: 1';
    const res = forbiddenResponse(reason);
    assert.deepEqual(JSON.parse(await res.text()), { error: reason });
    assert.equal(res.headers.get("x-injected"), null);
    assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
  });
});

Deno.test("allowlistedCorsOrigin allows the site and its loopback pair only", async (t) => {
  await t.step("no Origin header returns the site's own origin", () => {
    assert.equal(allowlistedCorsOrigin(request(), siteUrl()), "https://showcase.example");
  });

  await t.step("the exact site origin is echoed back", () => {
    assert.equal(
      allowlistedCorsOrigin(request({ origin: "https://showcase.example" }), siteUrl()),
      "https://showcase.example",
    );
  });

  await t.step("the localhost/127.0.0.1 pair on the same port and scheme is the site", () => {
    const site = siteUrl("http://localhost:3000");
    assert.equal(
      allowlistedCorsOrigin(request({ origin: "http://127.0.0.1:3000" }), site),
      "http://127.0.0.1:3000",
    );
  });

  await t.step("a different port or scheme breaks the loopback pair", () => {
    const site = siteUrl("http://localhost:3000");
    assert.equal(allowlistedCorsOrigin(request({ origin: "http://127.0.0.1:3001" }), site), null);
    assert.equal(allowlistedCorsOrigin(request({ origin: "https://127.0.0.1:3000" }), site), null);
  });

  await t.step("a lookalike or foreign origin is refused", () => {
    const site = siteUrl("http://localhost:3000");
    assert.equal(
      allowlistedCorsOrigin(request({ origin: "http://localhost:3000.evil.com" }), site),
      null,
    );
    assert.equal(
      allowlistedCorsOrigin(request({ origin: "https://showcase.example.evil" }), siteUrl()),
      null,
    );
    assert.equal(
      allowlistedCorsOrigin(request({ origin: "http://127.0.0.1:3000" }), siteUrl()),
      null,
    );
  });
});

Deno.test("validatedHeaderOrigin passes well-formed origins and falls back otherwise", async (t) => {
  const fallback = "https://showcase.example";

  await t.step("well-formed http(s) origins pass through unchanged", () => {
    assert.equal(validatedHeaderOrigin("https://example.com", fallback), "https://example.com");
    assert.equal(
      validatedHeaderOrigin("http://example.com:8443", fallback),
      "http://example.com:8443",
    );
    assert.equal(validatedHeaderOrigin("https://[::1]:3000", fallback), "https://[::1]:3000");
  });

  await t.step("null and empty values fall back", () => {
    assert.equal(validatedHeaderOrigin(null, fallback), fallback);
    assert.equal(validatedHeaderOrigin("", fallback), fallback);
  });

  await t.step("injection, non-http schemes and paths fall back", () => {
    for (
      const raw of [
        'https://evil.com" x="',
        "https://evil.com/\r\nset-cookie: a=b",
        "https://exa mple.com",
        "javascript:alert(1)",
        "https://example.com/path",
        "//example.com",
      ]
    ) {
      assert.equal(
        validatedHeaderOrigin(raw, fallback),
        fallback,
        `should refuse ${JSON.stringify(raw)}`,
      );
    }
  });

  await t.step("the 255-character bound is exact", () => {
    const ok = `https://${"a".repeat(247)}`; // 255 chars
    assert.equal(ok.length, 255);
    assert.equal(validatedHeaderOrigin(ok, fallback), ok);
    assert.equal(validatedHeaderOrigin(`${ok}a`, fallback), fallback);
  });
});
