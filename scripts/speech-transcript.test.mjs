import "../public/speech-transcript.js";

const { snapshotSpeechRecognitionResults } = globalThis;

function result(transcript, isFinal = false) {
  return Object.assign([{ transcript, confidence: 0.9 }], { isFinal });
}

function assertEquals(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

// A recognizer repeatedly replaces one interim result with a longer hypothesis.
// Rendering each event as a snapshot must not produce "hellohello this…".
const cumulativeEvents = [
  [result("hello")],
  [result("hello this")],
  [result("hello this is")],
  [result("hello this is a test", true)],
];
assertEquals(
  cumulativeEvents.map((results) => snapshotSpeechRecognitionResults(results).text),
  ["hello", "hello this", "hello this is", "hello this is a test"],
  "cumulative interim replacement",
);

// Final segments remain in the result list while the current interim segment changes.
assertEquals(
  snapshotSpeechRecognitionResults([
    result("hello ", true),
    result("this is ", true),
    result("a test"),
  ]),
  {
    entries: [
      { index: 0, transcript: "hello ", isFinal: true, confidence: 0.9 },
      { index: 1, transcript: "this is ", isFinal: true, confidence: 0.9 },
      { index: 2, transcript: "a test", isFinal: false, confidence: 0.9 },
    ],
    finalText: "hello this is ",
    interimText: "a test",
    text: "hello this is a test",
  },
  "final and interim snapshot",
);

// Missing alternatives are handled without inventing or duplicating text.
assertEquals(
  snapshotSpeechRecognitionResults([Object.assign([], { isFinal: false })]).text,
  "",
  "empty result",
);

const migratedPages = [
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/captioned-meeting/index.html",
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/live-transcription-bench/index.html",
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/multi-source-captions/index.html",
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/n-participant-captions/index.html",
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/processed-audio-transcription/index.html",
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/sr-track-language-picker/index.html",
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/sr-track/index.html",
  "v139/on-device-web-speech-api/feature-detection-and-setup/index.html",
  "v139/on-device-web-speech-api/offline-dictation-pad/index.html",
  "v142/web-speech-api-contextual-biasing/bias-phrase-lab/index.html",
  "v150/on-device-web-speech-api/offline-transcript/index.html",
  "v150/on-device-web-speech-api/voice-memo-editor/index.html",
  "v150/web-speech-api-on-device-recognition-quality/command-vs-dictation/index.html",
  "v150/web-speech-api-on-device-recognition-quality/quality-config-panel/index.html",
  "v150/web-speech-api-on-device-recognition-quality/quality-level-explorer/index.html",
  "v150/web-speech-api-on-device-recognition-quality/use-case-sampler/index.html",
  "v150/web-speech-api-unspoken-punctuation/code-mode/index.html",
  "v151/web-speech-api-unspoken-punctuation/dictation-demo/index.html",
  "v151/web-speech-api-unspoken-punctuation/punctuation-diff-viewer/index.html",
  "v151/web-speech-api-unspoken-punctuation/punctuation-transcription/index.html",
  "v151/web-speech-api-unspoken-punctuation/quality-control-panel/index.html",
];

for (const page of migratedPages) {
  const source = await Deno.readTextFile(page);
  if (!source.includes('src="/public/speech-transcript.js"')) {
    throw new Error(`${page}: tested speech transcript module is not loaded`);
  }
  if (!source.includes("snapshotSpeechRecognitionResults(")) {
    throw new Error(`${page}: result handler does not use the tested snapshot reducer`);
  }
}

const reviewedNonAggregators = {
  "v142/web-speech-api-contextual-biasing/context-phrases/index.html":
    "rebuilds the full result-list snapshot",
  "v142/web-speech-api-contextual-biasing/medical-dictation/index.html":
    "rebuilds the full result-list snapshot",
  "v142/web-speech-api-contextual-biasing/voice-commands/index.html":
    "replaces the current command preview",
  "v150/on-device-web-speech-api/confidence-visualizer/index.html":
    "single final result with alternatives",
  "v150/web-speech-api-unspoken-punctuation/dictation-comparison/index.html":
    "rebuilds the full result-list snapshot",
  "v150/web-speech-api-unspoken-punctuation/email-composer/index.html":
    "rebuilds the full result-list snapshot",
  "v150/web-speech-api-unspoken-punctuation/punctuation-analyzer/index.html":
    "rebuilds the full result-list snapshot",
  "v150/web-speech-api-unspoken-punctuation/settings-panel/index.html":
    "rebuilds the full result-list snapshot",
  "v150/web-speech-api-unspoken-punctuation/transcript-post-processor/index.html":
    "documentation snippet only",
  "v151/web-speech-api-unspoken-punctuation/local-first-workflow/index.html":
    "documentation snippet only",
  "v151/web-speech-api-unspoken-punctuation/voice-command-mode/index.html":
    "replaces the current command preview",
  "v153/speechrecognitionresult-timestamps-webspeech-api/capability-probe/index.html":
    "single-result capability probe",
  "v153/speechrecognitionresult-timestamps-webspeech-api/caption-timeline/index.html":
    "indexed final-result timeline without interim accumulation",
  "v153/speechrecognitionresult-timestamps-webspeech-api/latency-monitor/index.html":
    "replaces the current timed result",
};

async function* htmlFiles(directory) {
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) yield* htmlFiles(path);
    else if (entry.isFile && entry.name.endsWith(".html")) yield path;
  }
}

const runtimePages = [];
for await (const page of htmlFiles(".")) {
  if (!/^\.\/v\d+\//.test(page)) continue;
  const source = await Deno.readTextFile(page);
  if (
    /new\s+(?:SpeechRecognition|SR|SpeechRec|SpeechAPI|Rec)\s*\(/.test(source) &&
    /\.onresult\s*=|addEventListener\(["']result["']/.test(source)
  ) {
    runtimePages.push(page.slice(2));
  }
}

const classifiedPages = [...migratedPages, ...Object.keys(reviewedNonAggregators)].sort();
assertEquals(runtimePages.sort(), classifiedPages, "complete SpeechRecognition demo inventory");

console.log(
  `PASS — speech transcript regression tests (${runtimePages.length} runtime pages: ${migratedPages.length} snapshot-gated, ${
    Object.keys(reviewedNonAggregators).length
  } independently classified)`,
);
