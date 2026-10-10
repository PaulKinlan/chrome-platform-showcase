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
// gate step 23, the same four `assert` call sites and their messages, and the same
// first-failure abort - ONE case covers BOTH demo files, deliberately, so that a
// failure in the first file still stops the second from being checked. The denylist
// names every string-to-markup operation relevant here, not just the literal
// assignment the fix removed: a transcript 'must never be parsed as markup' also
// rules out writes to `outerHTML`, `insertAdjacentHTML`, `document.write/writeln`
// (including the `contentDocument.write` spelling), `Range.createContextualFragment`,
// `DOMParser.parseFromString`, `Element.setHTML`, `Element.setHTMLUnsafe`,
// `document.parseHTMLUnsafe`, `Sanitizer.sanitize` on a string and writes to iframe
// `srcdoc`. The bans are scoped to string-to-markup signatures: a read of
// `outerHTML`, an inert `srcdoc="..."` attribute and `Node.importNode` (a clone/adopt
// step whose parse half is already in the list) stay green. This is a lexical
// `String.includes` guard on these two files, not a proof about arbitrary JavaScript:
// alias evasion (`const d = document; d.write(text)`) is out of scope by design.
// Because this guard is source `String.includes` and a length floor, no browser is
// involved; the browser evidence for the behaviour stays on bead 5c8 and is not
// restated here.
//
// Permissions: the child is granted `--allow-read` alone, and that flag is genuinely
// required - the guard reads the two demo files it guards - so it is forwarded rather
// than dropped. No env, network, port, browser, child process or GC flag, so no
// `--serial` and no `--dir`.
//
// Output: the case keeps the file's own count line, which is the evidence that the
// guard actually executed its checks (43 assertions over 2 demos), and the task adds
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

const forbidden = [
  // Literal HTML-string composition into the document. `innerHTML` is banned
  // outright: in these two files any use of it is the bug this guard exists for.
  ".innerHTML",
  "insertAdjacentHTML",
  "document.write(",
  "document.writeln(",
  // The `contentDocument.write` spelling (an iframe's Document), which the
  // case-sensitive needles above do not subsume.
  "Document.write(",
  "Document.writeln(",
  // Write-only forms: reading `outerHTML` or an inert `srcdoc="..."` attribute
  // parses nothing, so only assignments are banned.
  ".outerHTML =",
  ".outerHTML +=",
  "srcdoc =",
  // Non-literal HTML-parsing sinks: each of these parses a string as markup,
  // so feeding one a transcript re-opens the quote-breakout hole from bead 5c8.
  // `setHTML`/`sanitize` parse-then-sanitize: the markup still becomes elements,
  // and the contract is text nodes only. `Node.importNode` is deliberately NOT
  // banned - it clones nodes and parses nothing; the parse half of the
  // parse-then-adopt chain (`parseFromString`, `createContextualFragment`,
  // `innerHTML`) is already covered.
  "createContextualFragment(",
  "parseFromString(",
  ".setHTML(",
  "setHTMLUnsafe(",
  "parseHTMLUnsafe(",
  ".sanitize(",
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
    for (const bad of forbidden) {
      assert(!src.includes(bad), `${file}: transcript path composes HTML via ${bad}`);
      assertions++;
    }
    for (const needle of required) {
      assert(src.includes(needle), `${file}: missing expected code: ${needle}`);
      assertions++;
    }
    assertions += 2;
  }

  console.log(
    `PASS — speech transcript DOM rendering (${assertions} assertions over ${
      Object.keys(files).length
    } demos: no prohibited HTML-writing calls found, expected text-node render code present)`,
  );
});
