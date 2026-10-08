// Focused guard for the speech demos' transcript rendering. A transcript is
// recognizer output, so it is text: it must reach the DOM as text nodes rather
// than being composed into an HTML string and parsed as markup.
//
// This is a structural guard (the demos have no DOM here). The behavioural
// proof - a hostile transcript driven into these real pages in a browser, with
// a pre-fix control - is recorded on bead chrome_platform_showcase-5c8.

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
  } demos: no HTML-string composition, text nodes and replaceChildren in the render paths)`,
);
