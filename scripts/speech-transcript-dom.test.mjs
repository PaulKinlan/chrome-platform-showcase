// Focused guard for the speech demos' transcript rendering. A transcript is
// recognizer output, so it is text: it must reach the DOM as text nodes rather
// than being composed into an HTML string and parsed as markup.
//
// This is a structural guard (the demos have no DOM here). The behavioural
// proof - a hostile transcript driven into these real pages in a browser, with
// a pre-fix control - is recorded on bead chrome_platform_showcase-5c8.
//
// Migrated in place to a native Deno.test case (Stage 15 of the dty proposal, bead
// dty.20): same file path, same task id `test-speech-transcript-dom`, the same ordered
// gate step 23, the same first-failure abort - ONE case covers BOTH demo files,
// deliberately, so that a failure in the first file still stops the second from
// being checked. The scanner itself was rebuilt (bead chrome_platform_showcase-vbp,
// architect design pass) after four rounds of literal-needle bypasses: a transcript
// 'must never be parsed as markup', and the guard now enforces that by
//   1. extracting the inline <script> bodies - so inert markup (an
//      `srcdoc="..."` attribute) never reaches the patterns - and
//   2. matching a small set of whitespace-AND-comment-tolerant regexes against
//      the extracted JavaScript only. `deno fmt` excludes these HTML files, so
//      nothing normalises hand-edited spacing; the WS token below spans spaces,
//      line and block comments, so `outerHTML /*x*/ = text` is the same write as
//      `outerHTML=text`.
// Covered: direct writes to `innerHTML`/`outerHTML`/`srcdoc` at any spacing,
// their object-key forms (`Object.assign(el, { outerHTML : text })`, quoted or
// not), computed-bracket assignment (`el["innerHTML"] = text`), the parse-family
// calls (`createContextualFragment`, `parseFromString`, `setHTML`/`setHTMLUnsafe`,
// `parseHTMLUnsafe`, `sanitize`, `insertAdjacentHTML`) at any spacing before the
// paren, `setAttribute("srcdoc", ...)` and `document.write/writeln` in both
// casings (`contentDocument.write`). Green by construction: reads of
// `outerHTML`/`srcdoc`/`el["innerHTML"]`, inert markup, `Node.importNode` (a
// clone/adopt step whose parse half is covered), `textContent`.
// Accepted safe-direction overreach: these are lexical patterns on JS text, so a
// string/comment containing e.g. `innerHTML =` trips the guard, as does an
// `==`/`===` comparison of an accessor or a JS label spelled `innerHTML:` -
// neither demo does any of that, and a future author who does gets a clear
// message and restructures. Honest residual limits, NOT a universal static
// proof: alias evasion (`const d = document; d.write(text)`) is out of scope, the
// scan covers inline <script> bodies only (external <script src> would also
// break the required-needle presence checks below, failing closed), and a sink
// spelled across a line-comment newline boundary that changes the token stream
// is the same alias class. The browser evidence for the behaviour stays on bead
// 5c8 and is not restated here.
//
// Permissions: the child is granted `--allow-read` alone, and that flag is genuinely
// required - the guard reads the two demo files it guards - so it is forwarded rather
// than dropped. No env, network, port, browser, child process or GC flag, so no
// `--serial` and no `--dir`.
//
// Output: the case keeps the file's own count line, which is the evidence that the
// guard actually executed its checks (27 assertions over 2 demos), and the task adds
// the runner's `PASS — speech transcript DOM contract` line, matching the gate step's
// own wording.

const files = {
  "v142/web-speech-api-contextual-biasing/voice-commands/index.html": [
    // The transcript is rendered with text nodes, never an HTML string.
    "transEl.replaceChildren(frag)",
    "hit.textContent = matched",
    "interim.textContent = text",
    // Anti-vacuity: the render path must still be present.
    "function paint(text, isFinal)",
  ],
  "v151/web-speech-api-unspoken-punctuation/punctuation-diff-viewer/index.html": [
    "renderPunct(into, snapshot.text)",
    "el.replaceChildren(frag)",
    "span.textContent = m[0]",
    "function setStatus(text)",
    // Highlighting is presentation only: the statistics still read the
    // rendered text, so the highlight spans must not change what is counted.
    "const l = tOn.textContent;",
  ],
};

// JavaScript "whitespace" between tokens may include comments; treat both as
// gap so a comment-separated spelling of a sink is the same sink.
const WS = String.raw`(?:\s|/\*[\s\S]*?\*/|//[^\n]*)*`;

const forbidden = [
  {
    name: "innerHTML/outerHTML/srcdoc write or object key (any spacing)",
    re: new RegExp(String.raw`\b(?:innerHTML|outerHTML|srcdoc)${WS}(?:[-+]?=|:)`),
  },
  {
    name: "quoted innerHTML/outerHTML/srcdoc object key (any spacing)",
    re: new RegExp(String.raw`['"](?:innerHTML|outerHTML|srcdoc)['"]${WS}:`),
  },
  {
    name: 'computed-bracket write, e.g. el["innerHTML"] = text',
    re: new RegExp(String.raw`\[\s*['"](?:innerHTML|outerHTML|srcdoc)['"]\s*\]${WS}[-+]?=`),
  },
  {
    name:
      "HTML-parsing call (createContextualFragment/parseFromString/setHTML/parseHTMLUnsafe/sanitize/insertAdjacentHTML)",
    re: new RegExp(
      String
        .raw`\b(?:createContextualFragment|parseFromString|setHTML(?:Unsafe)?|parseHTMLUnsafe|sanitize|insertAdjacentHTML)${WS}\(`,
    ),
  },
  {
    name: 'setAttribute("srcdoc", ...)',
    re: new RegExp(String.raw`\bsetAttribute${WS}\(${WS}['"]srcdoc['"]`),
  },
  {
    name: "document.write/writeln (incl. contentDocument)",
    // No leading \b: `contentDocument` has no word boundary before its `D`.
    re: new RegExp(String.raw`[dD]ocument${WS}\.${WS}write(?:ln)?${WS}\(`),
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

Deno.test("the speech transcript now speaks in text nodes, in both demos", () => {
  let assertions = 0;
  for (const [file, required] of Object.entries(files)) {
    const src = Deno.readTextFileSync(file);
    assert(src.length > 1000, `${file}: file is unexpectedly small - guard would be vacuous`);
    assert(
      src.includes("SpeechRecognition"),
      `${file}: no recognizer code - guard would be vacuous`,
    );
    // Scan the executable JavaScript only: inert markup must never trip a
    // pattern (architect design, bead chrome_platform_showcase-vbp).
    const js = Array.from(src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
      .map((m) => m[1])
      .join("\n");
    assert(js.length > 500, `${file}: no inline script extracted - guard would be vacuous`);
    for (const bad of forbidden) {
      assert(!bad.re.test(js), `${file}: transcript path composes HTML via ${bad.name}`);
      assertions++;
    }
    for (const needle of required) {
      assert(src.includes(needle), `${file}: missing expected code: ${needle}`);
      assertions++;
    }
    assertions += 3;
  }

  console.log(
    `PASS — speech transcript DOM rendering (${assertions} assertions over ${
      Object.keys(files).length
    } demos: no prohibited HTML-writing or HTML-parsing calls found, expected text-node render code present)`,
  );
});
