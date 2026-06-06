(() => {
  const detectorCache = new Map();
  const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

  function normalizeAvailability(value) {
    if (value === "readily") return "available";
    if (value === "after-download") return "downloadable";
    if (value === "no") return "unavailable";
    return value || "unknown";
  }

  function canCreateFromAvailability(value) {
    return ["available", "downloadable", "downloading", "readily", "after-download"].includes(
      value,
    );
  }

  function languageName(code) {
    if (!code || code === "und") return code === "und" ? "Unknown" : "Unknown language";
    try {
      return displayNames.of(code) || code;
    } catch {
      return code;
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function basicHeuristicResults(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return [];

    const chars = trimmed.replace(/\s/g, "");
    const total = chars.length || 1;
    const lower = trimmed.toLowerCase();
    const cjk = (trimmed.match(/[\u3400-\u9fff]/g) || []).length;
    const kana = (trimmed.match(/[\u3040-\u30ff]/g) || []).length;
    const hangul = (trimmed.match(/[\uac00-\ud7af]/g) || []).length;
    const arabic = (trimmed.match(/[\u0600-\u06ff]/g) || []).length;
    const cyrillic = (trimmed.match(/[\u0400-\u04ff]/g) || []).length;

    if ((kana + cjk) / total > 0.18) {
      const primary = kana > 0 ? "ja" : "zh";
      return [
        { detectedLanguage: primary, confidence: 0.86 },
        { detectedLanguage: primary === "ja" ? "zh" : "ja", confidence: 0.09 },
        { detectedLanguage: "ko", confidence: 0.03 },
      ];
    }
    if (hangul / total > 0.15) {
      return [{ detectedLanguage: "ko", confidence: 0.9 }];
    }
    if (arabic / total > 0.15) {
      return [
        { detectedLanguage: "ar", confidence: 0.88 },
        { detectedLanguage: "fa", confidence: 0.07 },
      ];
    }
    if (cyrillic / total > 0.15) {
      return [{ detectedLanguage: "ru", confidence: 0.82 }];
    }

    const words = lower.split(/[^\p{L}]+/u).filter(Boolean);
    const groups = [
      ["fr", [
        "bonjour",
        "merci",
        "avec",
        "vous",
        "nous",
        "pour",
        "est",
        "une",
        "pas",
        "dans",
        "sur",
      ]],
      ["de", [
        "guten",
        "morgen",
        "hallo",
        "nicht",
        "mein",
        "eine",
        "und",
        "ist",
        "das",
        "die",
        "der",
      ]],
      ["es", ["hola", "como", "cómo", "gracias", "para", "con", "que", "una", "los", "las", "del"]],
      ["pt", [
        "olá",
        "ola",
        "obrigado",
        "para",
        "com",
        "que",
        "uma",
        "não",
        "nao",
        "meu",
        "produto",
      ]],
      ["it", ["ciao", "grazie", "per", "con", "che", "una", "non"]],
      ["nl", ["hallo", "niet", "een", "het", "voor", "met"]],
    ];

    const scored = groups.map(([lang, markers]) => ({
      detectedLanguage: lang,
      confidence: markers.reduce((count, marker) => count + (words.includes(marker) ? 1 : 0), 0),
    })).filter((item) => item.confidence > 0);

    if (!scored.length) {
      const letters = (trimmed.match(/[A-Za-z]/g) || []).length;
      const confidence = letters / total > 0.35 ? 0.72 : 0.35;
      return [
        { detectedLanguage: letters ? "en" : "und", confidence },
        { detectedLanguage: "und", confidence: Math.max(0.05, 1 - confidence) },
      ];
    }

    scored.sort((a, b) => b.confidence - a.confidence);
    const totalScore = scored.reduce((sum, item) => sum + item.confidence, 0);
    const normalized = scored.map((item) => ({
      detectedLanguage: item.detectedLanguage,
      confidence: Math.max(0.05, Math.min(0.92, item.confidence / totalScore)),
    }));
    if (!normalized.some((item) => item.detectedLanguage === "en")) {
      normalized.push({ detectedLanguage: "en", confidence: 0.08 });
    }
    return normalized.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
  }

  async function getAvailability(options = {}) {
    if (!("LanguageDetector" in globalThis)) {
      return {
        supported: false,
        availability: "missing",
        normalizedAvailability: "missing",
        message: "LanguageDetector is not exposed in this browser.",
      };
    }

    try {
      const availability = await LanguageDetector.availability(options);
      return {
        supported: true,
        availability,
        normalizedAvailability: normalizeAvailability(availability),
        message: `LanguageDetector.availability() returned "${availability}".`,
      };
    } catch (error) {
      return {
        supported: true,
        availability: "error",
        normalizedAvailability: "error",
        message: `LanguageDetector.availability() failed: ${error.message}`,
        error,
      };
    }
  }

  async function getDetector(options = {}, callbacks = {}) {
    const key = JSON.stringify(options || {});
    if (detectorCache.has(key)) {
      return detectorCache.get(key);
    }

    const availability = await getAvailability(options);
    if (!availability.supported || !canCreateFromAvailability(availability.availability)) {
      const state = { detector: null, source: "fallback", ...availability };
      detectorCache.set(key, state);
      return state;
    }

    try {
      const detector = await LanguageDetector.create({
        ...options,
        monitor(monitor) {
          callbacks.onProgress?.(0);
          monitor.addEventListener("downloadprogress", (event) => {
            callbacks.onProgress?.(event.loaded || 0);
          });
        },
      });
      const state = {
        detector,
        source: "api",
        ...availability,
        expectedInputLanguages: detector.expectedInputLanguages || options.expectedInputLanguages ||
          null,
        inputQuota: Number.isFinite(detector.inputQuota) ? detector.inputQuota : null,
      };
      detectorCache.set(key, state);
      return state;
    } catch (error) {
      const state = {
        detector: null,
        source: "fallback",
        ...availability,
        message: `${availability.message} create() failed: ${error.message}`,
        error,
      };
      detectorCache.set(key, state);
      return state;
    }
  }

  async function detect(text, options = {}, callbacks = {}) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      return {
        source: "edge",
        error: "Text is empty.",
        results: [],
        inputUsage: 0,
        inputQuota: null,
        availability: await getAvailability(options),
      };
    }

    if (trimmed.length < (callbacks.minLength || 2)) {
      return {
        source: "edge",
        error: "Text is too short for reliable language detection.",
        results: basicHeuristicResults(trimmed),
        inputUsage: trimmed.length,
        inputQuota: null,
        availability: await getAvailability(options),
      };
    }

    const state = await getDetector(options, callbacks);
    if (state.detector) {
      try {
        const inputUsage = typeof state.detector.measureInputUsage === "function"
          ? await state.detector.measureInputUsage(trimmed)
          : trimmed.length;
        const results = await state.detector.detect(trimmed);
        return {
          source: "api",
          results,
          inputUsage,
          inputQuota: state.inputQuota,
          expectedInputLanguages: state.expectedInputLanguages,
          availability: state,
        };
      } catch (error) {
        return {
          source: "fallback",
          error: `detect() failed: ${error.message}`,
          results: basicHeuristicResults(trimmed),
          inputUsage: trimmed.length,
          inputQuota: state.inputQuota,
          availability: state,
        };
      }
    }

    return {
      source: "fallback",
      error: state.message,
      results: basicHeuristicResults(trimmed),
      inputUsage: trimmed.length,
      inputQuota: state.inputQuota || null,
      availability: state,
    };
  }

  function destroyDetectors() {
    for (const state of detectorCache.values()) {
      state.detector?.destroy?.();
    }
    detectorCache.clear();
  }

  globalThis.LDShowcase = {
    basicHeuristicResults,
    detect,
    destroyDetectors,
    escapeHTML,
    getAvailability,
    getDetector,
    languageName,
    normalizeAvailability,
  };
})();
