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
// names the string-to-markup operations relevant here, not just the literal
// assignment the fix removed: a transcript 'must never be parsed as markup' also
// rules out writes to `outerHTML`, `insertAdjacentHTML`, `document.write/writeln`
// (including the `contentDocument.write` spelling), `Range.createContextualFragment`,
// `DOMParser.parseFromString`, `Element.setHTML`/`setHTMLUnsafe`,
// `document.parseHTMLUnsafe`, `Sanitizer.sanitize` on a string and writes to iframe
// `srcdoc` (assignment or `setAttribute`). The bans are scoped to string-to-markup
// signatures, and each is listed in its spaced and unspaced spellings because
// `deno fmt` excludes these HTML files, so nothing normalises hand-edited spacing:
// a read of `outerHTML`, an inert `srcdoc="..."` attribute and `Node.importNode` (a
// clone/adopt step whose parse half is already in the list) stay green. Known
// overreach, accepted in the safe direction: the `outerHTML` write needles also
// trip on an `==`/`===` comparison of `outerHTML` - neither file compares it, and a
// future author who does gets a clear message and restructures. This is a lexical
// `String.includes` guard on these two files, not a proof about arbitrary
// JavaScript: alias evasion (`const d = document; d.write(text)`) is out of scope
// by design. Because this guard is source `String.includes` and a length floor, no
// browser is involved; the browser evidence for the behaviour stays on bead 5c8
// and is not restated here.
//
// Permissions: the child is granted `--allow-read` alone, and that flag is genuinely
// required - the guard reads the two demo files it guards - so it is forwarded rather
// than dropped. No env, network, port, browser, child process or GC flag, so no
// `--serial` and no `--dir`.
//
// Output: the case keeps the file's own count line, which is the evidence that the
// guard actually executed its checks (47 assertions over 2 demos), and the task adds
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
  // `write` is a prefix of `writeln`, so one needle per casing covers both, at
  // any spacing; the capital-D form covers `contentDocument.write`.
  "document.write",
  "Document.write",
  // Write-only forms, each in spaced and unspaced spelling (deno fmt excludes
  // these HTML files, so nothing normalises hand-edited spacing). A read of
  // `outerHTML` stays green; an `==`/`===` comparison of it trips the guard -
  // accepted, safe direction, noted in the header.
  ".outerHTML =",
  ".outerHTML=",
  ".outerHTML +=",
  ".outerHTML+=",
  // iframe `srcdoc`: JS property assignment forms (the leading dot keeps an
  // inert static `srcdoc="..."` attribute green) plus the
  // `setAttribute("srcdoc", ...)` route.
  ".srcdoc =",
  ".srcdoc=",
  '"srcdoc"',
  "'srcdoc'",
  // Non-literal HTML-parsing sinks, listed without a trailing paren so a space
  // before the call paren cannot slip past: each of these parses a string as
  // markup, so feeding one a transcript re-opens the quote-breakout hole from
  // bead 5c8. `.setHTML` also covers `setHTMLUnsafe` (it is a prefix), and
  // `setHTML`/`sanitize` parse-then-sanitize: the markup still becomes
  // elements, and the contract is text nodes only. `Node.importNode` is
  // deliberately NOT banned - it clones nodes and parses nothing; the parse
  // half of the parse-then-adopt chain (`parseFromString`,
  // `createContextualFragment`, `innerHTML`) is already covered.
  "createContextualFragment",
  "parseFromString",
  ".setHTML",
  "parseHTMLUnsafe",
  ".sanitize",
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
    } demos: no prohibited HTML-writing or HTML-parsing calls found, expected text-node render code present)`,
  );
});
