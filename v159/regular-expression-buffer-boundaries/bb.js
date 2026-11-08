// Shared helpers for the Regular Expression Buffer Boundaries concept pages.
// Classic script; exposes ONE namespaced global (globalThis.bufferBoundaries) to
// avoid host-global collisions. Every helper calls the real RegExp engine — the
// only "fallback" here is the spec's own desugaring to RegExp modifiers, and it
// is always labelled as such by the pages.
(() => {
  "use strict";

  // The three escapes and the exact synonyms the proposal defines
  // (https://tc39.es/proposal-regexp-buffer-boundaries, README "Relationship to RegExp Modifiers").
  const SYNONYMS = Object.freeze({
    A: "(?-m:^)",
    z: "(?-m:$)",
    Z: "(?=(?:\\r\\n|\\n|\\r|\\u2028|\\u2029)?(?-m:$))",
  });

  function errText(error) {
    return `${error?.name || "Error"}: ${error?.message || String(error)}`;
  }

  // Exact-surface probe. Compiling \A in Unicode mode is a SyntaxError
  // ("Invalid escape") in an engine without the proposal, so this can return
  // false. Compiling alone is not trusted as support: the three runtime
  // semantics are checked too (anti-regression: "constructor alone is not support").
  function probe() {
    const out = { compiles: false, compilesV: false, error: null, semantics: {}, supported: false };
    try {
      new RegExp(String.raw`\A\z\Z`, "u");
      out.compiles = true;
    } catch (error) {
      out.error = errText(error);
    }
    try {
      new RegExp(String.raw`\A\z\Z`, "v");
      out.compilesV = true;
    } catch (_) { /* reported via compilesV=false */ }
    if (out.compiles) {
      try {
        const a = new RegExp(String.raw`\Afoo`, "mu");
        const z = new RegExp(String.raw`foo\z`, "mu");
        const Z = new RegExp(String.raw`foo\Z`, "u");
        out.semantics.A = a.test("foo\nbar") && !a.test("bar\nfoo");
        out.semantics.z = z.test("bar\nfoo") && !z.test("foo\nbar");
        out.semantics.Z = Z.test("foo") && Z.test("foo\n") && Z.test("foo\r\n") &&
          !Z.test("foo\n\n") && !Z.test("foo\nbar");
      } catch (error) {
        out.error = errText(error);
      }
    }
    out.supported = out.compiles && out.compilesV && out.semantics.A === true &&
      out.semantics.z === true && out.semantics.Z === true;
    return out;
  }

  // Does this engine support the RegExp modifiers syntax the desugaring needs?
  function modifiersSupported() {
    try {
      return new RegExp("(?-m:^)a", "mu").test("a\nb") &&
        !new RegExp("(?-m:^)b", "mu").test("a\nb");
    } catch (_) {
      return false;
    }
  }

  const QUANTIFIER = /^(?:[*+?]|\{\d+(?:,\d*)?\})/;

  // Rewrites \A, \z, \Z (outside character classes, Unicode/UnicodeSets mode
  // only) into their RegExp-modifier synonyms. Non-Unicode patterns are returned
  // unchanged because there Annex B makes \A an identity escape for "A".
  // Quantified boundaries throw SyntaxError, mirroring the native grammar
  // (an Assertion is not quantifiable in Unicode mode) — otherwise the
  // desugared group "(?-m:^)*" would silently accept what native rejects.
  function desugar(pattern, flags) {
    if (!/[uv]/.test(flags)) return pattern;
    const setMode = flags.includes("v");
    let out = "";
    let depth = 0;
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === "\\") {
        const next = pattern[i + 1];
        if (next === undefined) {
          out += ch;
          continue;
        }
        if (depth === 0 && Object.hasOwn(SYNONYMS, next)) {
          if (QUANTIFIER.test(pattern.slice(i + 2))) {
            throw new SyntaxError(
              `Invalid regular expression: /${pattern}/${flags}: Nothing to repeat (\\${next} is an assertion)`,
            );
          }
          out += SYNONYMS[next];
        } else {
          out += ch + next;
        }
        i++;
        continue;
      }
      if (ch === "[") {
        if (depth === 0 || setMode) depth++;
      } else if (ch === "]" && depth > 0) {
        depth--;
      }
      out += ch;
    }
    return out;
  }

  function usesBoundaryEscape(pattern) {
    let depth = 0;
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === "\\") {
        if (depth === 0 && /[AzZ]/.test(pattern[i + 1] || "")) return true;
        i++;
      } else if (ch === "[") depth++;
      else if (ch === "]" && depth > 0) depth--;
    }
    return false;
  }

  // Compile natively; never silently substitutes the desugaring.
  function compileNative(pattern, flags) {
    try {
      return { re: new RegExp(pattern, flags), error: null, source: pattern };
    } catch (error) {
      return { re: null, error: errText(error), source: pattern };
    }
  }

  function compileDesugared(pattern, flags) {
    let source;
    try {
      source = desugar(pattern, flags);
    } catch (error) {
      return { re: null, error: errText(error), source: null };
    }
    try {
      return { re: new RegExp(source, flags), error: null, source };
    } catch (error) {
      return { re: null, error: errText(error), source };
    }
  }

  // All match positions (index + matched text), using a global copy of re.
  function matches(re, subject, cap = 400) {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const g = new RegExp(re.source, flags);
    const out = [];
    for (const m of subject.matchAll(g)) {
      out.push({
        index: m.index,
        end: m.index + m[0].length,
        text: m[0],
        groups: m.groups ? { ...m.groups } : null,
      });
      if (out.length >= cap) break;
    }
    return out;
  }

  const GLYPHS = {
    "\n": "␊",
    "\r": "␍",
    "\u2028": "⁂LS",
    "\u2029": "¶PS",
    "\u0085": "NEL",
    "\t": "⇥",
    "\v": "␋",
    "\f": "␌",
  };

  // Human-readable rendering of a subject string: line terminators shown as glyphs.
  function visible(str) {
    let s = "";
    for (const ch of str) s += GLYPHS[ch] ?? ch;
    return s;
  }

  // JSON-ish literal for display, e.g. "end\r\n".
  function literal(str) {
    return JSON.stringify(str).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }

  // Interpret \n \r \t \u2028 \u2029 \u0085 \\ typed into a text field.
  function unescapeSubject(str) {
    return str.replace(
      /\\(u\{[0-9a-fA-F]{1,6}\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[nrtvf\\])/g,
      (_, seq) => {
        switch (seq[0]) {
          case "n":
            return "\n";
          case "r":
            return "\r";
          case "t":
            return "\t";
          case "v":
            return "\v";
          case "f":
            return "\f";
          case "\\":
            return "\\";
          case "x":
            return String.fromCharCode(parseInt(seq.slice(1), 16));
          default: {
            const hex = seq[1] === "{" ? seq.slice(2, -1) : seq.slice(1);
            const cp = parseInt(hex, 16);
            return cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
          }
        }
      },
    );
  }

  // Renders subject into `host` as character cells, with zero-width boundary
  // markers at each index in `positions` (Set of indices) and highlighted
  // ranges for non-empty matches. Uses textContent only (no innerHTML).
  function renderSubject(host, subject, list, label) {
    host.replaceChildren();
    const starts = new Map();
    const covered = new Set();
    for (const m of list) {
      if (m.end === m.index) starts.set(m.index, (starts.get(m.index) || 0) + 1);
      for (let k = m.index; k < m.end; k++) covered.add(k);
    }
    const units = [...subject];
    let idx = 0;
    let pos = 0;
    const marker = (at) => {
      const mk = document.createElement("span");
      mk.className = "bb-marker";
      mk.textContent = "▼";
      mk.title = `${label}: zero-width match at index ${at}`;
      host.append(mk);
    };
    for (const ch of units) {
      if (starts.has(idx)) marker(idx);
      const cell = document.createElement("span");
      cell.className = "bb-ch" + (GLYPHS[ch] ? " bb-term" : "") +
        (covered.has(idx) ? " bb-hit" : "");
      cell.textContent = GLYPHS[ch] ?? ch;
      host.append(cell);
      const lineBreak = ch === "\n" || ch === "\u2028" || ch === "\u2029" ||
        (ch === "\r" && units[pos + 1] !== "\n");
      if (lineBreak) host.append(document.createElement("br"));
      idx += ch.length;
      pos++;
    }
    if (starts.has(idx)) marker(idx);
  }

  // Writes the engine verdict into `el` and returns the probe result.
  function renderEngineStatus(el) {
    const p = probe();
    const mods = modifiersSupported();
    if (p.supported) {
      el.className = "verdict yes";
      el.textContent =
        'This engine implements buffer boundaries: new RegExp(String.raw`\\A\\z\\Z`, "u") and the "v" variant compile, and \\A, \\z, \\Z behaved per spec on the probe inputs. Results below are NATIVE.';
    } else if (p.compiles) {
      el.className = "verdict no";
      el.textContent =
        `\\A\\z\\Z compiled, but the runtime semantics probe failed (A=${p.semantics.A}, z=${p.semantics.z}, Z=${p.semantics.Z}, v-mode compiles=${p.compilesV}${
          p.error ? ", " + p.error : ""
        }). Treating as NOT supported.`;
    } else {
      el.className = "verdict no";
      el.textContent =
        `Not supported in this engine: new RegExp(String.raw\`\\A\\z\\Z\`, "u") threw ${p.error}. Native rows show that real error; rows marked "desugared fallback" run the spec's RegExp-modifier synonyms instead${
          mods
            ? " (modifiers are supported here)"
            : " — but RegExp modifiers are ALSO unavailable here, so the fallback cannot run either"
        }.`;
    }
    return { ...p, modifiers: mods };
  }

  globalThis.bufferBoundaries = Object.freeze({
    renderEngineStatus,
    SYNONYMS,
    probe,
    modifiersSupported,
    desugar,
    usesBoundaryEscape,
    compileNative,
    compileDesugared,
    matches,
    visible,
    literal,
    unescapeSubject,
    renderSubject,
    errText,
  });
})();
