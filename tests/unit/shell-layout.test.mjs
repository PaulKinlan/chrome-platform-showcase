import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { channelTone, renderSiteFooter, renderSiteHeader } from "../../routes/pages/layout.ts";

describe("shared site shell chrome", () => {
  it("renders a skip link, brand link, and marks the active nav item", () => {
    const html = renderSiteHeader("experiments");
    assert.ok(html.includes('href="#main-content"'));
    assert.ok(html.includes('class="site-brand"'));
    assert.ok(
      html.includes(
        'class="site-nav-link is-active" href="/experiments/" aria-current="page">Experiments</a>',
      ),
    );
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  });

  it("renders the editorial colophon footer with key navigation links", () => {
    const html = renderSiteFooter();
    assert.ok(html.includes('class="byline site-footer"'));
    assert.ok(html.includes("Paul Kinlan"));
    assert.ok(html.includes('href="/features"'));
    assert.ok(html.includes('href="/conformance/run-all/"'));
  });

  it("maps Chrome release channel labels to semantic tone tokens", () => {
    assert.equal(channelTone("Dev"), "dev");
    assert.equal(channelTone("Upcoming"), "dev");
    assert.equal(channelTone("Beta"), "beta");
    assert.equal(channelTone("Rolling out"), "rolling");
    assert.equal(channelTone("Stable (rolling out)"), "rolling");
    assert.equal(channelTone("Stable (live)"), "stable");
    assert.equal(channelTone("Stable"), "stable");
    assert.equal(channelTone("Archive"), "archive");
    assert.equal(channelTone("Released"), "archive");
  });
});
