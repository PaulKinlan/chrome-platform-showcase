(() => {
  const labs = document.querySelectorAll("[data-live-lab]");
  for (const lab of labs) {
    const form = lab.querySelector("[data-live-form]");
    const frame = lab.querySelector("[data-live-frame]");
    const urlOutput = lab.querySelector("[data-live-url]");
    const log = lab.querySelector("[data-live-log]");
    const support = lab.querySelector("[data-support-note]");
    let controller = null;

    function buildUrl() {
      const url = new URL(lab.dataset.liveBase, window.location.origin);
      if (form) {
        const data = new FormData(form);
        for (const [key, value] of data.entries()) {
          if (String(value)) url.searchParams.set(key, String(value));
        }
      }
      url.searchParams.set("run", String(Date.now()));
      return url;
    }

    function summarizeChunk(text) {
      return text
        .replace(/\s+/g, " ")
        .replace(/</g, "<")
        .trim()
        .slice(0, 180);
    }

    async function inspectStream(url) {
      if (!log) return;
      if (controller) controller.abort();
      controller = new AbortController();
      const started = performance.now();
      log.textContent = "Fetching streamed HTML for byte-level evidence...\n";
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
          headers: { accept: "text/html" },
        });
        log.textContent += `status ${response.status}, content-type ${
          response.headers.get("content-type") || "unknown"
        }\n`;
        if (!response.body) {
          log.textContent += "ReadableStream body is not exposed in this browser.\n";
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let index = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          index += 1;
          const elapsed = Math.round(performance.now() - started);
          const text = decoder.decode(value, { stream: true });
          log.textContent += `[${elapsed}ms] chunk ${index}: ${summarizeChunk(text)}\n`;
        }
        log.textContent += "stream closed\n";
      } catch (error) {
        if (error.name !== "AbortError") {
          log.textContent += `stream inspection failed: ${error.message || error}\n`;
        }
      }
    }

    function load() {
      const url = buildUrl();
      if (urlOutput) {
        urlOutput.textContent = url.pathname + url.search;
        urlOutput.href = url.href;
      }
      if (frame) frame.src = url.href;
      inspectStream(url);
    }

    if (support) {
      const hasPiFactory = typeof document.createProcessingInstruction === "function";
      const hasTemplate = "HTMLTemplateElement" in window;
      support.textContent = hasPiFactory && hasTemplate
        ? "This page can create processing instructions and templates. The iframe below performs the real parser-level feature detection after the streamed route closes."
        : "This browser is missing baseline processing-instruction or template primitives. The streamed route should keep its fallback visible and show an unsupported warning.";
    }

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      load();
    });

    lab.querySelector("[data-open-live]")?.addEventListener("click", () => {
      window.open(buildUrl(), "_blank", "noopener");
    });

    load();
  }
})();
