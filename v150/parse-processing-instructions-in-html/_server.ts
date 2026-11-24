// Co-located feature server for v150/parse-processing-instructions-in-html:
// streams an HTML document containing literal `<?target data?>` processing
// instructions across delayed chunks for parser inspection demos.

import { escapeHTML } from "../../routes/html.ts";

function numberParam(url: URL, name: string, fallback: number, min: number, max: number): number {
  const value = Number(url.searchParams.get(name) ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

function renderProcessingInstructionStreamingUseCaseRoute(
  req: Request,
  sub: string,
): Response | null {
  if (sub !== "/parse-processing-instructions-in-html/streaming-use-case/live") return null;

  const url = new URL(req.url);
  const delay = numberParam(url, "delay", 700, 100, 2400);
  const scenario = url.searchParams.get("scenario") === "metadata" ? "metadata" : "range";
  const encoder = new TextEncoder();
  const chunks = scenario === "metadata"
    ? [
      {
        wait: 160,
        label: "metadata pi",
        html:
          `<?build-info commit="8fd3" region="edge"?>\n<section class="panel"><h2>Fast shell</h2><p>The first streamed chunk carried build metadata as a processing instruction.</p></section>`,
      },
      {
        wait: delay,
        label: "feature flag pi",
        html:
          `<?feature-flags experiment="native-pi-parser" cohort="demo"?>\n<section class="panel"><h2>Delayed flags</h2><p>Later bytes can carry app metadata without adding elements that CSS or layout need to account for.</p></section>`,
      },
      {
        wait: delay + 300,
        label: "trace pi",
        html: `<?trace-point name="after-delayed-flags" elapsed="${
          delay + 300
        }"?>\n<section class="panel"><h2>Trace marker</h2><p>The final processing instruction is still a DOM node when the report script walks the tree.</p></section>`,
      },
    ]
    : [
      {
        wait: 160,
        label: "range start pi",
        html:
          `<?stream-start name="recommendations" phase="placeholder"?>\n<section class="panel"><h2>Recommendations shell</h2><p class="skeleton">Placeholder rendered while the server waits on a slow source.</p></section>`,
      },
      {
        wait: delay,
        label: "range end and data pi",
        html:
          `<?stream-end name="recommendations"?>\n<?server-data source="recommendations-db" rows="3"?>\n<section class="panel"><h2>Recommendations ready</h2><ul><li>Parser-visible range markers</li><li>No wrapper element needed for the marker</li><li>TreeWalker can find the nodes</li></ul></section>`,
      },
      {
        wait: delay + 320,
        label: "append range pi",
        html:
          `<?stream-start name="activity" phase="append"?>\n<section class="panel"><h2>Activity stream</h2><p>Another range marker arrives later in the same HTML response.</p></section>\n<?stream-end name="activity"?>`,
      },
    ];

  const started = Date.now();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Live ProcessingInstruction stream</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    body { background: var(--bg-ivory); }
    main { display: grid; gap: var(--space-4); max-width: 820px; padding: var(--space-5); }
    .panel { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-4); }
    .panel h2 { font-size: 1rem; margin-top: 0; }
    .skeleton { background: var(--bg-stone); border: 1px dashed var(--border-black); color: var(--text-muted); padding: var(--space-3); }
    .report { background: var(--text-black); color: var(--bg-ivory); font-family: var(--font-mono); font-size: 0.78rem; overflow: auto; padding: var(--space-3); white-space: pre-wrap; }
    .unsupported { background: color-mix(in srgb, var(--accent-rose) 12%, var(--bg-paper)); border: 2px solid var(--accent-rose); padding: var(--space-3); }
  </style>
</head>
<body>
<main>
  <header class="lede-block">
    <p class="eyebrow">streamed HTML parser probe</p>
    <h1>ProcessingInstruction nodes from streamed HTML</h1>
    <p class="lede">The server is still sending this document. Each later chunk contains literal <code>&lt;?target data?&gt;</code> syntax, not nodes created by script.</p>
  </header>
`));

      for (const chunk of chunks) {
        const wait = Math.max(0, started + chunk.wait - Date.now());
        await new Promise((resolve) => setTimeout(resolve, wait));
        controller.enqueue(
          encoder.encode(`\n<!-- ${escapeHTML(chunk.label)} -->\n${chunk.html}\n`),
        );
      }

      controller.enqueue(encoder.encode(`
  <section class="panel">
    <h2>Parser report</h2>
    <div id="unsupported" class="unsupported" hidden>The HTML parser did not expose any ProcessingInstruction nodes from this streamed document.</div>
    <pre id="pi-report" class="report">Waiting for parser inspection...</pre>
  </section>
  <script>
    (() => {
      const report = document.getElementById("pi-report");
      const warning = document.getElementById("unsupported");
      const rows = [];
      try {
        const walker = document.createTreeWalker(document, NodeFilter.SHOW_PROCESSING_INSTRUCTION);
        let node;
        while ((node = walker.nextNode())) {
          rows.push({
            target: node.target,
            data: node.data,
            nodeType: node.nodeType,
            constructor: node.constructor.name
          });
        }
      } catch (error) {
        rows.push({ error: error.message || String(error) });
      }
      if (!rows.length) warning.hidden = false;
      report.textContent = rows.length
        ? rows.map((row, index) => {
          if (row.error) return "error: " + row.error;
          return (index + 1) + ". target=" + row.target + "\\n   data=" + row.data + "\\n   nodeType=" + row.nodeType + "\\n   constructor=" + row.constructor;
        }).join("\\n\\n")
        : "No ProcessingInstruction nodes found.";
    })();
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
  return renderProcessingInstructionStreamingUseCaseRoute(req, sub);
}
