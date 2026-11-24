// Shared server helper for the `responsively-sized-iframe` feature across
// milestones (v150, v152). Serves the dynamic `/embed` fixture with
// `Supports-Responsive-Sizing: 1` and wraps `/iframe-resize-demo/child.html`
// with the same response header.

import { escapeHTML } from "../../routes/html.ts";
import { clampNumber, type FeatureServerContext, withHeaders } from "./http-helpers.ts";

function renderResponsiveIframeEmbed(req: Request, sub: string): Response | null {
  if (sub !== "/responsively-sized-iframe/embed") return null;

  const url = new URL(req.url);
  const demo = url.searchParams.get("demo") ?? "blocks";
  const report = url.searchParams.get("report") === "1";
  const channel = url.searchParams.get("channel") ?? demo;
  const count = demo === "feed"
    ? clampNumber(url.searchParams.get("count"), 0, 24, 0)
    : clampNumber(url.searchParams.get("count"), 1, 12, 3);

  const title = demo === "accordion"
    ? "Responsive FAQ embed"
    : demo === "feed"
    ? "Responsive feed embed"
    : "Responsive block embed";
  const body = demo === "accordion"
    ? `<section class="faq" id="faq"></section>`
    : demo === "feed"
    ? `<section class="feed" id="feed"></section>`
    : `<section class="blocks" id="blocks"></section>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(title)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 14px;
      background: var(--bg-paper);
      color: var(--text-black);
      font-family: system-ui, sans-serif;
    }
    .block, .feed-item, .faq-item {
      border: 1px solid var(--border-black);
      background: var(--bg-ivory);
      margin: 0 0 10px;
      box-shadow: 2px 2px 0 var(--border-black);
    }
    .block {
      border-left: 5px solid var(--accent-blue);
      padding: 12px;
      font-size: 0.9rem;
    }
    .feed-item { padding: 12px 14px; font-family: Georgia, serif; }
    .feed-meta {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.74rem;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .feed-body { font-size: 0.9rem; line-height: 1.55; }
    .feed-media {
      margin-top: 10px;
      min-height: 72px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--accent-blue) 12%, var(--bg-ivory));
      border: 1px dashed var(--accent-blue);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      color: var(--accent-blue);
    }
    .faq-button {
      width: 100%;
      border: 0;
      border-bottom: 1px solid var(--border-black);
      background: var(--bg-stone);
      color: var(--text-black);
      padding: 12px;
      font: 700 0.86rem ui-monospace, SFMono-Regular, Menlo, monospace;
      text-align: left;
      cursor: pointer;
    }
    .faq-answer {
      display: none;
      padding: 12px;
      font-size: 0.9rem;
      line-height: 1.55;
    }
    .faq-item[data-open="true"] .faq-answer { display: block; }
    .fixture-note {
      margin: 0 0 12px;
      font: 0.72rem ui-monospace, SFMono-Regular, Menlo, monospace;
      color: var(--text-muted);
    }
  </style>
</head>
<body data-demo="${escapeHTML(demo)}">
  <p class="fixture-note">Embedded document served with <code>Supports-Responsive-Sizing: 1</code>.</p>
  ${body}
  <script>
    const reportSize = ${report ? "true" : "false"};
    const channel = ${JSON.stringify(channel)};
    const feedItems = [
      ["Alex Rivera", "2m ago", "Responsive iframes remove the fixed-height contract from embeddable widgets.", false],
      ["Jamie Chen", "5m ago", "The browser can now propagate layout overflow instead of waiting for a ResizeObserver round trip.", true],
      ["Sam Patel", "12m ago", "This kills the nested-scroll widget pattern that made embeds feel broken on mobile.", false],
      ["Morgan Lee", "18m ago", "A feed that grows in the parent page keeps the reading flow intact.", false],
      ["Casey Zhou", "25m ago", "Third-party widgets can opt in safely through a response header controlled by their server.", true],
      ["Drew Kim", "31m ago", "The legacy postMessage path is still useful as a fallback, but it is no longer the ideal path.", false]
    ];
    const faqs = [
      ["What has to opt in?", "Both sides. The parent iframe has allow-responsive-sizing and this embedded document sends Supports-Responsive-Sizing: 1."],
      ["What changes when an item opens?", "The embedded document's layout overflow grows. Chrome 150 can propagate that size to the iframe box in the parent page."],
      ["Why a response header?", "It lets the embedded origin consent to exposing its layout overflow to the parent, including cross-origin embeds."],
      ["What is the fallback?", "Older browsers can keep using ResizeObserver and postMessage, but the parent should only apply that fallback when native support is absent."]
    ];
    let blockCount = ${count};
    let feedCount = ${count};

    function sendSize() {
      if (!reportSize) return;
      requestAnimationFrame(() => {
        parent.postMessage({
          type: "responsive-iframe-height",
          channel,
          height: document.documentElement.scrollHeight
        }, "*");
      });
    }

    function renderBlocks() {
      const root = document.getElementById("blocks");
      if (!root) return;
      root.innerHTML = "";
      for (let i = 1; i <= blockCount; i++) {
        const item = document.createElement("article");
        item.className = "block";
        item.textContent = "Embedded content block " + i + " - layout overflow contributes to iframe height.";
        root.appendChild(item);
      }
      sendSize();
    }

    function renderFeed() {
      const root = document.getElementById("feed");
      if (!root) return;
      root.innerHTML = "";
      for (let i = 0; i < feedCount; i++) {
        const source = feedItems[i % feedItems.length];
        const item = document.createElement("article");
        item.className = "feed-item";
        item.innerHTML =
          '<div class="feed-meta"><strong>' + source[0] + '</strong> - ' + source[1] + '</div>' +
          '<div class="feed-body">' + source[2] + '</div>' +
          (source[3] ? '<div class="feed-media">media preview</div>' : '');
        root.appendChild(item);
      }
      sendSize();
    }

    function renderAccordion() {
      const root = document.getElementById("faq");
      if (!root || root.childElementCount) return;
      for (const [question, answer] of faqs) {
        const item = document.createElement("article");
        item.className = "faq-item";
        item.dataset.open = "false";
        const button = document.createElement("button");
        button.className = "faq-button";
        button.type = "button";
        button.textContent = question;
        const content = document.createElement("div");
        content.className = "faq-answer";
        content.textContent = answer;
        button.addEventListener("click", () => {
          item.dataset.open = item.dataset.open === "true" ? "false" : "true";
          sendSize();
        });
        item.append(button, content);
        root.appendChild(item);
      }
      sendSize();
    }

    addEventListener("message", (event) => {
      const data = event.data || {};
      if (data.type === "set-block-count") {
        const nextCount = Number(data.count);
        blockCount = Number.isFinite(nextCount)
          ? Math.max(1, Math.min(12, nextCount))
          : blockCount;
        renderBlocks();
      }
      if (data.type === "set-feed-count") {
        const nextCount = Number(data.count);
        feedCount = Number.isFinite(nextCount)
          ? Math.max(0, Math.min(24, nextCount))
          : feedCount;
        renderFeed();
      }
      if (data.type === "add-feed-post") {
        feedCount = Math.max(0, Math.min(24, feedCount + 1));
        renderFeed();
      }
      if (data.type === "reset-feed") {
        feedCount = 0;
        renderFeed();
      }
    });

    renderBlocks();
    renderFeed();
    renderAccordion();
    addEventListener("load", sendSize);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "supports-responsive-sizing": "1",
    },
  });
}

export async function handleResponsiveIframeRequest(
  req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  const responsiveIframeResponse = renderResponsiveIframeEmbed(req, sub);
  if (responsiveIframeResponse) return responsiveIframeResponse;

  if (sub === "/responsively-sized-iframe/iframe-resize-demo/child.html" && ctx) {
    const child = await ctx.readReleaseAsset(ctx.release, sub);
    if (child) {
      return withHeaders(child, {
        "supports-responsive-sizing": "1",
        "cache-control": "no-store",
      });
    }
  }

  return null;
}
