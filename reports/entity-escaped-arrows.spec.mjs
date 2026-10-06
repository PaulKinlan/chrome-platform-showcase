#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Browser evidence for bead chrome_platform_showcase-br0: entity-escaped
// `=&gt;` in executable JavaScript. Driven before and after the repair so the
// console SyntaxError (before) and the working interaction (after) are both on
// record. `upsert-counter-pattern` is included as a control: its entities sit
// in HTML text / innerHTML strings and it must drive cleanly in both runs.
//
//   deno task drive reports/entity-escaped-arrows.spec.mjs --out <dir>

export const cases = [
  {
    url: "/v139/corner-shaping-corner-shape-superellipse-squircle/superellipse-comparator/",
    name: "superellipse-comparator",
  },
  {
    url: "/v139/css-custom-functions/functional-design-tokens/",
    name: "functional-design-tokens",
  },
  {
    url: "/v139/fire-error-event-instead-of-throwing-for-csp-blocked-worker/catch-vs-onerror/",
    name: "catch-vs-onerror",
  },
  {
    url: "/v139/softnavigation-performance-entry/observer-playground/",
    name: "observer-playground",
  },
  {
    url: "/v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/",
    name: "raw-vs-smooth-router",
  },
  {
    url: "/v137/blob-url-partitioning-fetching-navigation/partition-inspector/",
    name: "partition-inspector",
  },
  {
    url: "/v143/upsert/upsert-counter-pattern/",
    name: "upsert-counter-pattern (control: entities in HTML text / innerHTML)",
  },
];
