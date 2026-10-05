// Font-loading gate for the shared design system.
//
// The shared stylesheet must not put a remote stylesheet into the render
// critical path: no @import of a remote CSS URL, and every @font-face must
// point at a local font file that exists on disk and declare a font-display
// strategy. Run by `deno task test-font-loading` (wired into `deno task check`).

import { existsSync, readFileSync } from "node:fs";

const STYLES = new URL("../public/styles.css", import.meta.url);

function fail(message) {
  throw new Error(message);
}

const css = readFileSync(STYLES, "utf8");

// 1. No remote stylesheet @import (a remote CSS url() inside @import puts a
//    second, sequential stylesheet request in the render-critical path).
const remoteImports = [
  ...css.matchAll(/@import\s+(?:url\()?["']?(https?:\/\/[^)"'\s]+)/gi),
].map((m) => m[1]);
if (remoteImports.length > 0) {
  fail(`styles.css imports remote stylesheets: ${remoteImports.join(", ")}`);
}

// 2. Every @font-face src url() must be a local /public/fonts/ file on disk.
const fontFaces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
if (fontFaces.length === 0) {
  fail("styles.css declares no @font-face rules; the design system fonts are missing");
}
for (const face of fontFaces) {
  const src = face.match(/src:\s*url\(([^)]+)\)/);
  if (!src) fail(`@font-face without a src url(): ${face.slice(0, 80)}`);
  const url = src[1].replace(/["']/g, "");
  if (!url.startsWith("/public/fonts/")) {
    fail(`@font-face src is not a local /public/fonts/ asset: ${url}`);
  }
  const file = new URL(`..${url}`, import.meta.url);
  if (!existsSync(file)) fail(`@font-face points at a missing file: ${url}`);
  if (!/font-display:\s*\w+/.test(face)) {
    fail(`@font-face without font-display: ${face.slice(0, 80)}`);
  }
}

// 3. The three design-system families must actually be declared locally.
for (const family of ["Joan", "Lora", "JetBrains Mono"]) {
  if (!css.includes(`font-family: "${family}"`)) {
    fail(`styles.css has no local @font-face for the design-system family "${family}"`);
  }
}

console.log(
  `PASS — font loading: no remote stylesheet @import; ${fontFaces.length} local @font-face rules, all files present, font-display declared`,
);
