// Focused guard for the three v142 speech demos that used to compose recognizer
// transcript text into an HTML string. A transcript is text, so the highlight
// renderers must build nodes instead of returning markup.
//
// This is a STRUCTURAL guard: it checks the source of the render paths, not
// their runtime DOM behaviour. The behavioural proof - the hostile payload
// driven through each page's own render function on the fixed tree, with a
// pre-fix control that still injects - is the chrome-devtools-mcp run recorded
// on bead chrome_platform_showcase-gvb.

const files = {
  "v142/web-speech-api-contextual-biasing/context-phrases/index.html": {
    required: [
      "function highlightInto(",
      "mark.textContent = text.slice(start, end)",
      "el.replaceChildren(frag)",
      "highlightInto(tPlain, txt, phrases)",
      "highlightInto(tBiased, txt, phrases)",
    ],
    // The old pair: highlight() returned markup and both transcripts took it.
    forbidden: ["innerHTML = highlight(", "highlight(txt, phrases)"],
  },
  "v142/web-speech-api-contextual-biasing/medical-dictation/index.html": {
    required: [
      "function highlightMatchesInto(",
      "hit.textContent = text.slice(start, end)",
      "el.replaceChildren(frag)",
      "highlightMatchesInto(bias, t, list)",
      "highlightMatchesInto(raw, t, list)",
    ],
    forbidden: ["innerHTML = highlightMatches("],
  },
  "v142/web-speech-api-contextual-biasing/bias-phrase-lab/index.html": {
    required: [
      "function setTranscript(",
      "hit.className = 'bias-hit'",
      "box.replaceChildren(frag)",
      "span.textContent = ' ' + interim",
    ],
    // Only this assignment is prohibited; the file keeps its escaped
    // bias-word markup and its empty-list clears in the phrase editor.
    forbidden: ["box.innerHTML = html"],
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let assertions = 0;
for (const [file, { required, forbidden }] of Object.entries(files)) {
  const src = Deno.readTextFileSync(file);
  assert(src.length > 1000, `${file}: file is unexpectedly small - guard would be vacuous`);
  assert(
    src.includes("SpeechRecognition"),
    `${file}: no recognizer code - guard would be vacuous`,
  );
  for (const bad of forbidden) {
    assert(!src.includes(bad), `${file}: still composes transcript HTML via ${bad}`);
    assertions++;
  }
  for (const needle of required) {
    assert(src.includes(needle), `${file}: missing expected code: ${needle}`);
    assertions++;
  }
  assertions += 2;
}

console.log(
  `PASS — speech transcript highlight renderers (${assertions} assertions over ${
    Object.keys(files).length
  } demos: no prohibited transcript-HTML calls found, expected text-node highlight code present)`,
);
