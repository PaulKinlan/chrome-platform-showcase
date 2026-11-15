// Shared helpers for the v159 Regular Expression Buffer Boundaries demos.
//
// IMPORTANT: every pattern containing \A, \z or \Z is built with
// `new RegExp(string, flags)` — never a regex literal. A literal such as
// /\A/u is an EARLY SyntaxError in an engine without the proposal, which would
// stop this whole script from parsing and turn an honest "unsupported" verdict
// into a blank page.
//
// Proposal: https://tc39.es/proposal-regexp-buffer-boundaries (Stage 3)
//   \A -> (?-m:^)      start of input, ignores the m flag
//   \z -> (?-m:$)      end of input, ignores the m flag
//   \Z -> (?=(?:\r\n|\n|\r|\u2028|\u2029)?(?-m:$))
//                      end of input, allowing one trailing line terminator
// Grammar: Assertion :: [+UnicodeMode] \A | \z | \Z — so only with the u or v
// flag. Without them Annex B keeps \A, \z, \Z as identity escapes (literal
// "A", "z", "Z"). Not valid inside a character class.

export const DESUGAR = {
  A: "(?-m:^)",
  z: "(?-m:$)",
  Z: "(?=(?:\\r\\n|\\n|\\r|\\u2028|\\u2029)?(?-m:$))",
};

/** Try to compile one pattern natively; never throws. */
export function tryCompile(source, flags) {
  try {
    return { ok: true, re: new RegExp(source, flags), error: null };
  } catch (e) {
    return { ok: false, re: null, error: `${e.name}: ${e.message}` };
  }
}

/** Behavioural support probe for each escape. Each can return false. */
export function probeSupport() {
  const out = {};
  for (const ch of ["A", "z", "Z"]) {
    out[ch] = tryCompile(`\\${ch}`, "u");
  }
  out.all = out.A.ok && out.z.ok && out.Z.ok;
  // RegExp modifiers are what the desugared fallback relies on.
  out.modifiers = tryCompile("(?-m:^)", "mu").ok;
  return out;
}

/**
 * Rewrite \A \z \Z outside character classes into their proposal-defined
 * modifier equivalents. Only meaningful for u/v-mode patterns; escaped
 * backslashes (\\A) are left alone. Tracks nested [] for the v flag.
 */
export function desugar(source) {
  let out = "";
  let depth = 0;
  let replaced = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\") {
      const n = source[i + 1];
      if (n === undefined) {
        out += c;
        continue;
      }
      if (depth === 0 && (n === "A" || n === "z" || n === "Z")) {
        out += DESUGAR[n];
        replaced++;
      } else {
        out += c + n;
      }
      i++;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]" && depth > 0) depth--;
    out += c;
  }
  return { source: out, replaced };
}

/**
 * Compile with the native escapes when the engine supports them; otherwise
 * (u/v mode only) compile the desugared equivalent and SAY SO.
 */
export function compileWithFallback(source, flags) {
  const native = tryCompile(source, flags);
  if (native.ok) return { ...native, via: "native", compiledSource: source };
  const unicodeMode = flags.includes("u") || flags.includes("v");
  if (!unicodeMode) return { ...native, via: "error", compiledSource: source };
  const d = desugar(source);
  if (d.replaced === 0) return { ...native, via: "error", compiledSource: source };
  const fb = tryCompile(d.source, flags);
  if (fb.ok) {
    return { ...fb, via: "desugared", compiledSource: d.source, nativeError: native.error };
  }
  return { ...fb, via: "error", compiledSource: d.source, nativeError: native.error };
}

/** Decode \n \r \t \u2028 \u2029 escapes typed in a single-line input. */
export function decodeEscapes(str) {
  return str.replace(/\\(r|n|t|u2028|u2029|\\)/g, (m, k) =>
    ({
      r: "\r",
      n: "\n",
      t: "\t",
      u2028: "\u2028",
      u2029: "\u2029",
      "\\": "\\",
    })[k]);
}

export function encodeEscapes(str) {
  return str.replace(/[\\\r\n\t\u2028\u2029]/g, (c) =>
    ({
      "\\": "\\\\",
      "\r": "\\r",
      "\n": "\\n",
      "\t": "\\t",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029",
    })[c]);
}

export const FLAG_STEPS =
  "Not on by default in this browser. ChromeStatus lists it for Chrome 159 (V8 Finch name V8Flag_js_regexp_buffer_boundaries). To try it today, launch Chrome/Canary with --js-flags=--js-regexp-buffer-boundaries (no chrome://flags entry exists; it is a V8 flag, not a Blink runtime feature). Firefox ships it from 155.";
