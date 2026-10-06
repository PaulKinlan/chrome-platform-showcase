#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Targeted browser assertions for bead br0, for the two pages whose outcome is
// not obvious from a generic control sweep:
//   - raw-vs-smooth-router builds its table rows via innerHTML from a template
//     literal, so an HTML-escaped tag surfaces as literal markup text (rows with
//     zero cells) instead of real <td> elements;
//   - partition-inspector's same-site lane depends on the srcdoc script running
//     (the `=&gt;` there produced "SyntaxError: Unexpected token '&'").
// A case throws to fail and returns an `assert` map so the driver grades it.
//
//   deno task drive reports/entity-escaped-arrows-detail.spec.mjs --out <dir>

export const cases = [
  {
    url: "/v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/",
    name: "router table is real cells, not escaped markup text",
    script: `
      const tbody = document.querySelector("#m tbody");
      if (!tbody) throw new Error("table body #m tbody not found");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      if (rows.length !== 4) throw new Error("expected 4 recommendation rows, got " + rows.length);
      const cellCounts = rows.map((r) => r.children.length);
      if (!cellCounts.every((c) => c === 3)) {
        throw new Error("expected 3 <td> cells per row, got " + JSON.stringify(cellCounts));
      }
      if (tbody.textContent.includes("<td>") || tbody.textContent.includes("</td>")) {
        throw new Error("escaped markup rendered as literal text: " + tbody.textContent.slice(0, 120));
      }
      if (!tbody.querySelector("td.best")) throw new Error("no td.best cell — the row markup was not parsed");
      return { assert: { "recommendation table renders four 3-cell rows with a td.best": true } };
    `,
  },
  {
    url: "/v137/blob-url-partitioning-fetching-navigation/partition-inspector/",
    name: "same-site srcdoc probe runs and succeeds",
    script: `
      document.getElementById("mint").click();
      document.getElementById("probe-all").click();
      await new Promise((r) => setTimeout(r, 2600));
      const lane = document.getElementById("lane-samesite");
      if (!lane) throw new Error("lane-samesite not found");
      const text = (lane.textContent || "").replace(/\\s+/g, " ").trim();
      if (!/fetch via same-site iframe/.test(text)) {
        throw new Error("same-site lane did not report a probe result: " + text.slice(0, 160));
      }
      if (!lane.querySelector(".row.ok")) {
        throw new Error("same-site lane did not succeed (no .row.ok): " + text.slice(0, 160));
      }
      return { assert: { "same-site srcdoc probe reports ok": true } };
    `,
  },
];
