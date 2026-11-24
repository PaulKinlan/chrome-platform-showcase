// Co-located feature server for v150/out-of-order-streaming:
// streams live HTML documents with processing-instruction patch ranges and
// out-of-order `<template for="...">` chunks for each concept demo.

import { escapeHTML } from "../../routes/html.ts";

interface PatchingChunk {
  delay: number;
  label: string;
  html: string;
}

function numberParam(url: URL, name: string, fallback: number, min: number, max: number): number {
  const value = Number(url.searchParams.get(name) ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

function renderOutOfOrderStreamingLiveRoute(req: Request, sub: string): Response | null {
  const match = sub.match(/^\/out-of-order-streaming\/([^/]+)\/live\/?$/);
  if (!match) return null;

  const concept = match[1];
  const url = new URL(req.url);
  const baseDelay = numberParam(url, "delay", 700, 100, 2400);
  const slow = url.searchParams.get("slow") ?? "profile";
  const scenario = url.searchParams.get("scenario") ?? "related-first";

  function loading(label: string): string {
    return `<div class="skeleton" data-placeholder>${escapeHTML(label)}</div>`;
  }

  function shellForConcept(): {
    title: string;
    lede: string;
    body: string;
    chunks: PatchingChunk[];
  } {
    if (concept === "ai-chat-simulation") {
      const slowToken = numberParam(url, "token", 4, 1, 8);
      const tokens = [
        "Out-of-order ",
        "HTML ",
        "patching ",
        "lets ",
        "ready ",
        "tokens ",
        "paint ",
        "first.",
      ];
      return {
        title: "AI response patch stream",
        lede:
          "The server appends each generated token with repeated template patches and a marker that keeps the insertion point alive while preserving token order.",
        body: `
          <section class="panel chat-panel">
            <h2>Assistant reply</h2>
            <p class="muted">Initial HTML contains only the shell and a processing-instruction range.</p>
            <div class="chat-bubble">
              <?start name="ai-tokens">${loading("Waiting for streamed tokens...")}<?end>
            </div>
          </section>
          <section class="panel">
            <h2>Server events</h2>
            <ol class="event-log">
              <?start name="server-log">${loading("No template chunks sent yet.")}<?end>
            </ol>
          </section>`,
        chunks: tokens.map((token, index) => {
          const position = index + 1;
          const delay = position < slowToken
            ? 180 + index * 130
            : baseDelay + 900 + (position - slowToken) * 130;
          return {
            delay,
            label: `token ${position}`,
            html: `
              <template for="ai-tokens"><span class="token">${
              escapeHTML(token)
            }</span><?marker name="ai-tokens"></template>
              <template for="server-log"><li>Token ${position} patch arrived after ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }),
      };
    }

    if (concept === "pipeline-demo") {
      const bottleneck = url.searchParams.get("stage") ?? "transform";
      const stages = [
        ["fetch", "Fetch user record", "The HTML shell can show route chrome immediately."],
        [
          "transform",
          "Format recommendation",
          "The slow middle task no longer blocks later patches.",
        ],
        ["write", "Render final CTA", "The final action lands when its server work completes."],
      ] as const;
      return {
        title: "Server pipeline patch stream",
        lede:
          "Each backend stage is represented by a processing-instruction range. The server writes the ready stage as a template patch.",
        body: `
          <section class="pipeline-grid">
            ${
          stages.map(([id, title]) =>
            `<article class="panel">
              <h2>${escapeHTML(title)}</h2>
              <?start name="${id}">${loading(`${title} pending...`)}<?end>
            </article>`
          ).join("")
        }
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("Pipeline not flushed yet.")
        }<?end></ol>
          </section>`,
        chunks: stages.map(([id, title, detail], index) => {
          const delay = id === bottleneck ? baseDelay + 900 : 220 + index * 180;
          return {
            delay,
            label: title,
            html: `
              <template for="${id}">
                <div class="result-card">
                  <strong>${escapeHTML(title)}</strong>
                  <p>${escapeHTML(detail)}</p>
                  <span class="pill">patched at ${delay}ms</span>
                </div>
              </template>
              <template for="server-log"><li>${
              escapeHTML(title)
            } template sent at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }),
      };
    }

    if (concept === "chunk-visualizer") {
      const slowTarget = ["hero", "stats", "activity"].includes(slow) ? slow : "stats";
      const targets = [
        ["hero", "Hero summary", "Revenue forecast ready before the slow analytics table."],
        ["stats", "Metric cards", "Four KPI cards streamed from an expensive aggregation."],
        ["activity", "Activity feed", "Recent events append independently at the bottom."],
      ] as const;
      return {
        title: "Configurable delayed patch stream",
        lede:
          "Choose which section is slow. The other template patches can still update their named ranges first.",
        body: `
          <section class="dashboard-grid">
            ${
          targets.map(([id, title]) =>
            `<article class="panel">
              <h2>${escapeHTML(title)}</h2>
              <?start name="${id}">${loading(`${title} placeholder`)}<?end>
            </article>`
          ).join("")
        }
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("Waiting for chunks...")
        }<?end></ol>
          </section>`,
        chunks: targets.map(([id, title, detail], index) => {
          const delay = id === slowTarget ? baseDelay + 1000 : 240 + index * 170;
          return {
            delay,
            label: title,
            html: `
              <template for="${id}">
                <div class="result-card">
                  <strong>${escapeHTML(title)}</strong>
                  <p>${escapeHTML(detail)}</p>
                </div>
              </template>
              <template for="server-log"><li>${
              escapeHTML(title)
            } patch flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }),
      };
    }

    if (concept === "chunk-timing-chart") {
      const chunks = [
        ["chunk-one", "Chunk 1", 180],
        ["chunk-two", "Chunk 2", baseDelay + 900],
        ["chunk-three", "Chunk 3", 320],
        ["chunk-four", "Chunk 4", 460],
        ["chunk-five", "Chunk 5", 620],
        ["chunk-six", "Chunk 6", 760],
      ] as const;
      return {
        title: "Timing chart patch stream",
        lede:
          "Chunk 2 is intentionally slow. The later template patches are sent earlier and can patch their rows before chunk 2 completes.",
        body: `
          <section class="panel">
            <h2>Rows patched by the parser</h2>
            <ol class="timing-list">
              ${
          chunks.map(([id, label]) =>
            `<li><strong>${escapeHTML(label)}</strong><?start name="${id}">${
              loading("pending")
            }<?end></li>`
          ).join("")
        }
            </ol>
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("No rows patched yet.")
        }<?end></ol>
          </section>`,
        chunks: chunks.map(([id, label, delay]) => ({
          delay,
          label,
          html: `
            <template for="${id}"><span class="pill">template arrived at ${delay}ms</span></template>
            <template for="server-log"><li>${
            escapeHTML(label)
          } template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
        })),
      };
    }

    if (concept === "streaming-demo") {
      return {
        title: "Minimal parser patch stream",
        lede:
          "A small page shell is parsed first. Later bytes contain template patches that replace the fallback without client DOM code.",
        body: `
          <section class="two-column">
            <article class="panel">
              <h2>Primary slot</h2>
              <?start name="primary">${loading("Primary content loading...")}<?end>
            </article>
            <article class="panel">
              <h2>Secondary slot</h2>
              <?start name="secondary">${loading("Secondary content loading...")}<?end>
            </article>
          </section>
          <section class="panel">
            <h2>Patch order</h2>
            <ol class="event-log"><?start name="server-log">${
          loading("Waiting for the response body...")
        }<?end></ol>
          </section>`,
        chunks: [
          {
            delay: 260,
            label: "secondary",
            html: `
              <template for="secondary"><p>Secondary content was ready first and patched before the primary slot.</p></template>
              <template for="server-log"><li>Secondary template arrived first.</li><?marker name="server-log"></template>`,
          },
          {
            delay: baseDelay,
            label: "primary",
            html: `
              <template for="primary"><p>Primary content arrived later, but no client script selected this node.</p></template>
              <template for="server-log"><li>Primary template arrived after ${baseDelay}ms.</li><?marker name="server-log"></template>`,
          },
        ],
      };
    }

    const order: Array<[string, number]> = scenario === "hero-first"
      ? [
        ["hero", 250],
        ["related", baseDelay],
        ["results-a", 500],
        ["results-b", 850],
      ]
      : [
        ["related", 240],
        ["results-a", 420],
        ["hero", baseDelay + 700],
        ["results-b", 760],
      ];
    const delayFor = (id: string) => Number(order.find(([name]) => name === id)?.[1] ?? baseDelay);
    return {
      title: "Chunk ordering patch stream",
      lede:
        "The shell declares hero, related, and result ranges. The server sends templates in readiness order, not DOM order.",
      body: `
        <section class="two-column">
          <article class="panel feature-panel">
            <h2>Hero</h2>
            <?start name="hero">${loading("Hero query still running...")}<?end>
          </article>
          <aside class="panel">
            <h2>Related links</h2>
            <?start name="related">${loading("Related links pending...")}<?end>
          </aside>
        </section>
        <section class="panel">
          <h2>Search results</h2>
          <ol class="result-list"><?start name="results">${
        loading("Results stream waiting...")
      }<?end></ol>
        </section>
        <section class="panel">
          <h2>Patch order</h2>
          <ol class="event-log"><?start name="server-log">${
        loading("No template chunks sent yet.")
      }<?end></ol>
        </section>`,
      chunks: order.map(([id]) => {
        if (id === "hero") {
          const delay = delayFor(id);
          return {
            delay,
            label: "hero",
            html: `
              <template for="hero">
                <div class="result-card">
                  <strong>Hero patched after ${delay}ms</strong>
                  <p>This slow section no longer blocks related links or result rows.</p>
                </div>
              </template>
              <template for="server-log"><li>Hero template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }
        if (id === "related") {
          const delay = delayFor(id);
          return {
            delay,
            label: "related",
            html: `
              <template for="related">
                <nav class="link-stack">
                  <a href="#spec">Patching explainer</a>
                  <a href="#constraints">Same-tree constraints</a>
                  <a href="#markers">Repeated markers</a>
                </nav>
              </template>
              <template for="server-log"><li>Related links template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
          };
        }
        const resultNumber = id === "results-a" ? 1 : 2;
        const delay = delayFor(id);
        return {
          delay,
          label: `result ${resultNumber}`,
          html: `
            <template for="results">
              <li>Result ${resultNumber} patched at ${delay}ms.</li>
              <?marker name="results">
            </template>
            <template for="server-log"><li>Result ${resultNumber} template flushed at ${delay}ms.</li><?marker name="server-log"></template>`,
        };
      }),
    };
  }

  const demo = shellForConcept();
  const encoder = new TextEncoder();
  const started = Date.now();
  const chunks = [...demo.chunks].sort((a, b) => a.delay - b.delay);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(demo.title)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    body { background: var(--bg-ivory); }
    main { max-width: 920px; padding: var(--space-5); }
    .stream-shell { display: grid; gap: var(--space-4); }
    .panel { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-4); }
    .panel h2 { font-size: 1rem; margin-top: 0; }
    .muted, .lede { color: var(--text-muted); }
    .two-column, .dashboard-grid, .pipeline-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dashboard-grid, .pipeline-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .feature-panel { min-height: 10rem; }
    .skeleton { background: var(--bg-stone); border: 1px dashed var(--border-black); color: var(--text-muted); font-family: var(--font-mono); padding: var(--space-3); }
    .result-card { display: grid; gap: var(--space-2); }
    .pill { border: 1px solid var(--accent-blue); color: var(--accent-blue); display: inline-block; font-family: var(--font-mono); font-size: 0.75rem; padding: 0.15rem 0.4rem; }
    .event-log, .result-list, .timing-list { display: grid; gap: var(--space-2); padding-left: 1.3rem; }
    .chat-bubble { border: 1px solid var(--border-black); min-height: 5rem; padding: var(--space-4); }
    .token { font-size: 1.15rem; line-height: 1.7; }
    .link-stack { display: grid; gap: var(--space-2); }
    .support-warning { background: color-mix(in srgb, var(--accent-rose) 10%, var(--bg-paper)); border: 2px solid var(--accent-rose); color: var(--text-black); padding: var(--space-3); }
    @media (max-width: 720px) { .two-column, .dashboard-grid, .pipeline-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<main>
  <header class="lede-block">
    <p class="eyebrow">live streamed document</p>
    <h1>${escapeHTML(demo.title)}</h1>
    <p class="lede">${escapeHTML(demo.lede)}</p>
  </header>
  <div id="support-warning" class="support-warning" hidden>
    This browser did not apply the streamed template patches. Enable Chrome 150+ support or experimental web platform features, then reload this streamed route.
  </div>
  <div class="stream-shell">
${demo.body}
`));

      for (const chunk of chunks) {
        const wait = Math.max(0, started + chunk.delay - Date.now());
        await new Promise((resolve) => setTimeout(resolve, wait));
        controller.enqueue(
          encoder.encode(`\n<!-- ${escapeHTML(chunk.label)} patch -->\n${chunk.html}\n`),
        );
      }

      controller.enqueue(encoder.encode(`
  </div>
  <script>
    setTimeout(() => {
      const unappliedTemplates = document.querySelectorAll("template[for]").length;
      const placeholders = document.querySelectorAll("[data-placeholder]").length;
      const warning = document.getElementById("support-warning");
      if (warning && (unappliedTemplates > 0 || placeholders > 0)) {
        warning.hidden = false;
      }
    }, 80);
  </script>
</main>
</body>
</html>`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  return renderOutOfOrderStreamingLiveRoute(req, sub);
}
