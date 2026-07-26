function snapshotSpeechRecognitionResults(results) {
  const entries = [];
  let finalText = "";
  let interimText = "";

  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const transcript = result?.[0]?.transcript ?? "";
    const isFinal = Boolean(result?.isFinal);
    const confidence = result?.[0]?.confidence;
    entries.push({ index, transcript, isFinal, confidence });
    if (isFinal) finalText += transcript;
    else interimText += transcript;
  }

  return { entries, finalText, interimText, text: finalText + interimText };
}

globalThis.snapshotSpeechRecognitionResults = snapshotSpeechRecognitionResults;
