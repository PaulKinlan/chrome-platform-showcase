import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSafeHttpUrl, renderMarkdown } from "../../lib/markdown.ts";
import { renderCategoryCard, renderDemoCard } from "../../routes/pages.ts";

describe("isSafeHttpUrl", () => {
  it("accepts http and https URLs", () => {
    assert.equal(isSafeHttpUrl("https://wpt.fyi/interop-2026"), true);
    assert.equal(
      isSafeHttpUrl("https://chromeenterprise.google/resources/release-notes/?ver=158&featId=123"),
      true,
    );
    assert.equal(isSafeHttpUrl("http://example.com/path_(1)#frag"), true);
  });

  it("rejects non-http(s) schemes and unsafe characters", () => {
    for (
      const bad of [
        "",
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "file:///etc/passwd",
        "//evil.example/path",
        "/relative/path",
        'https://example.com/"onmouseover="alert(1)',
        "https://example.com/<script>",
        "https://example.com/\nfoo",
      ]
    ) {
      assert.equal(isSafeHttpUrl(bad), false, `expected reject for ${JSON.stringify(bad)}`);
    }
  });
});

describe("renderMarkdown", () => {
  it("renders markdown links, inline code, bold, and italic safely", () => {
    const html = renderMarkdown(
      "The [WebHID API](https://developer.chrome.com/docs/webhid) adds `<install>` and **libxslt** (*beta*).",
    );
    assert.equal(
      html,
      '<p>The <a href="https://developer.chrome.com/docs/webhid" target="_blank" rel="noopener">WebHID API</a> adds <code>&lt;install&gt;</code> and <strong>libxslt</strong> (<em>beta</em>).</p>',
    );
  });

  it("escapes HTML inside link labels and query-string ampersands", () => {
    const html = renderMarkdown(
      "Launching with [HTML <install> element](https://chromeenterprise.google/resources/release-notes/?ver=158&featId=5152834368700416).",
    );
    assert.equal(
      html,
      '<p>Launching with <a href="https://chromeenterprise.google/resources/release-notes/?ver=158&amp;featId=5152834368700416" target="_blank" rel="noopener">HTML &lt;install&gt; element</a>.</p>',
    );
  });

  it("linkifies bare URLs without swallowing trailing sentence punctuation", () => {
    const html = renderMarkdown(
      "Match <audio> and <video> elements.\n\nThis is one of the focus areas in https://wpt.fyi/interop-2026.",
    );
    assert.equal(
      html,
      '<p>Match &lt;audio&gt; and &lt;video&gt; elements.</p><p>This is one of the focus areas in <a href="https://wpt.fyi/interop-2026" target="_blank" rel="noopener">https://wpt.fyi/interop-2026</a>.</p>',
    );
  });

  it("preserves balanced parentheses in URLs and strips outer closing parens", () => {
    const html = renderMarkdown("See (https://en.wikipedia.org/wiki/Foo_(bar)).");
    assert.equal(
      html,
      '<p>See (<a href="https://en.wikipedia.org/wiki/Foo_(bar)" target="_blank" rel="noopener">https://en.wikipedia.org/wiki/Foo_(bar)</a>).</p>',
    );
  });

  it("renders unordered and ordered lists even immediately after a paragraph line", () => {
    const html = renderMarkdown(
      [
        "Admins can control this feature in either of two ways:",
        "1. With enterprise policy, [WebAppInstallByUserEnabled](https://chromeenterprise.google/policies/#WebAppInstallByUserEnabled).",
        "2. With `Permissions-Policy`.",
      ].join("\n"),
    );
    assert.equal(
      html,
      '<p>Admins can control this feature in either of two ways:</p><ol><li>With enterprise policy, <a href="https://chromeenterprise.google/policies/#WebAppInstallByUserEnabled" target="_blank" rel="noopener">WebAppInstallByUserEnabled</a>.</li><li>With <code>Permissions-Policy</code>.</li></ol>',
    );

    const ulHtml = renderMarkdown(
      'When fetching:\n\n- Use "compression-dictionary".\n- Respect <link>.',
    );
    assert.equal(
      ulHtml,
      "<p>When fetching:</p><ul><li>Use &quot;compression-dictionary&quot;.</li><li>Respect &lt;link&gt;.</li></ul>",
    );
  });

  it("does not mangle CSS selectors, underscore identifiers, math, or non-link brackets", () => {
    const html = renderMarkdown(
      "Supports ::highlight(*), (_blank, _self, _parent, _top), snake_case_api, 2 * 3 * 4, and [css-grid-3][masonry].",
    );
    assert.equal(
      html,
      "<p>Supports ::highlight(*), (_blank, _self, _parent, _top), snake_case_api, 2 * 3 * 4, and [css-grid-3][masonry].</p>",
    );
  });

  it("does not parse markdown or links inside inline code spans", () => {
    const html = renderMarkdown(
      "Run `<script>alert(1)</script>` and `**not bold** https://example.com`.",
    );
    assert.equal(
      html,
      "<p>Run <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> and <code>**not bold** https://example.com</code>.</p>",
    );
  });

  it("neutralizes XSS payloads and hostile link schemes", () => {
    const payload = [
      '<img src=x onerror="alert(1)"><script>alert(2)</script>',
      "[click](javascript:alert(1))",
      "[data](data:text/html,<script>alert(3)</script>)",
      "<javascript:alert(4)>",
    ].join(" ");
    const html = renderMarkdown(payload);
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("<a "), false);
    assert.equal(html.includes("onerror="), true);
    assert.equal(html.includes("&lt;img"), true);
    assert.equal(html.includes("&lt;script&gt;"), true);
  });

  it("truncates by visible text length without breaking links, code spans, or words", () => {
    const summary =
      "Chrome can now trigger a request for the browser to install a web app, given a manifest URL and optional manifest ID. The `<install>` element enables cross-origin web app installation without JavaScript and provides a better developer experience than handling `beforeinstallprompt` events. The element is launching in parallel with [Web Install API](https://chromeenterprise.google/resources/release-notes/?ver=158&featId=5183481574850560).";
    const html = renderMarkdown(summary, { maxChars: 280 });
    assert.equal(html.includes("<code>&lt;install&gt;</code>"), true);
    assert.equal(html.includes("<code>beforeinstallprompt</code>…"), true);
    assert.equal(html.includes("ev…"), false);
    assert.equal(html.endsWith("</p>"), true);
  });

  it("does not count hidden URL characters against the visible excerpt budget", () => {
    const summary =
      "The [WebHID API](https://developer.chrome.com/docs/extensions/how-to/web-platform/webhid) enables web applications to interact with HID devices over USB and Bluetooth.";
    const html = renderMarkdown(summary, { maxChars: 170 });
    assert.equal(
      html,
      '<p>The <a href="https://developer.chrome.com/docs/extensions/how-to/web-platform/webhid" target="_blank" rel="noopener">WebHID API</a> enables web applications to interact with HID devices over USB and Bluetooth.</p>',
    );
  });

  it("returns empty string for empty or whitespace-only input", () => {
    assert.equal(renderMarkdown(""), "");
    assert.equal(renderMarkdown("   \n\n  "), "");
  });
});

describe("card summary rendering", () => {
  it("renders markdown inside demo-summary on milestone and category cards", () => {
    const demoCard = renderDemoCard(
      {
        id: 5152834368700416,
        name: "HTML install element",
        summary: "Adds `<install>` alongside [Web Install API](https://example.com/install).",
      },
      { href: "/v158/html-install-element/", release: "v158", sameRelease: true },
      undefined,
      { category: "Enabled by default" },
    );
    assert.equal(demoCard.includes('<div class="demo-summary">'), true);
    assert.equal(demoCard.includes("<code>&lt;install&gt;</code>"), true);
    assert.equal(
      demoCard.includes(
        '<a href="https://example.com/install" target="_blank" rel="noopener">Web Install API</a>',
      ),
      true,
    );

    const catCard = renderCategoryCard({
      id: 5152834368700416,
      name: "HTML install element",
      summary: "Uses **libxslt** and [click](javascript:alert(1)).",
      demo: null,
    });
    assert.equal(catCard.includes('<div class="demo-summary">'), true);
    assert.equal(catCard.includes("<strong>libxslt</strong>"), true);
    assert.equal(catCard.includes("javascript:alert(1)"), true);
    assert.equal(catCard.includes('href="javascript:'), false);
  });
});
