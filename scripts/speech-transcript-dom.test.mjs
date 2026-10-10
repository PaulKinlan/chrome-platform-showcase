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
// failure in the first file still stops the second from being checked. Because this
// guard is source `String.includes` and a length floor, no browser is involved; the
// browser evidence for the behaviour stays on bead 5c8 and is not restated here.
//
// Permissions: the child is granted `--allow-read` alone, and that flag is genuinely
// required - the guard reads the two demo files it guards - so it is forwarded rather
// than dropped. No env, network, port, browser, child process or GC flag, so no
// `--serial` and no `--dir`.
//
// Output: the case keeps the file's own count line, which is the evidence that the
// guard actually executed its checks (19 assertions over 2 demos), and the task adds
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

const forbidden = [".innerHTML", "insertAdjacentHTML", "document.write("];

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
