(() => {
  const FIELD_NAMES = {
    entry: ["styleDuration", "layoutDuration"],
    script: ["forcedStyleDuration", "forcedLayoutDuration"],
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (name === "class") node.className = value;
      else if (name === "text") node.textContent = value;
      else node.setAttribute(name, String(value));
    }
    for (const child of children) {
      node.append(child);
    }
    return node;
  }

  function ms(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "unavailable";
    return `${Number(value).toFixed(1)} ms`;
  }

  function shortMs(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "0.0";
    return Number(value).toFixed(1);
  }

  function percent(value, total) {
    if (!total || !value) return 0;
    return Math.max(0, Math.min(100, value / total * 100));
  }

  function fieldSupport() {
    const supportedTypes = globalThis.PerformanceObserver?.supportedEntryTypes ?? [];
    const entryProto = globalThis.PerformanceLongAnimationFrameTiming?.prototype;
    const scriptProto = globalThis.PerformanceScriptTiming?.prototype;
    return {
      performanceObserver: "PerformanceObserver" in globalThis,
      loaf: Array.isArray(supportedTypes) && supportedTypes.includes("long-animation-frame"),
      entryInterface: typeof globalThis.PerformanceLongAnimationFrameTiming === "function",
      scriptInterface: typeof globalThis.PerformanceScriptTiming === "function",
      styleAndLayoutStart: !!entryProto && "styleAndLayoutStart" in entryProto,
      scripts: !!entryProto && "scripts" in entryProto,
      forcedStyleAndLayoutDuration: !!scriptProto && "forcedStyleAndLayoutDuration" in scriptProto,
      styleDuration: !!entryProto && "styleDuration" in entryProto,
      layoutDuration: !!entryProto && "layoutDuration" in entryProto,
      forcedStyleDuration: !!scriptProto && "forcedStyleDuration" in scriptProto,
      forcedLayoutDuration: !!scriptProto && "forcedLayoutDuration" in scriptProto,
    };
  }

  function supportClass(ok, partial = false) {
    if (ok) return "state-pass";
    if (partial) return "state-partial";
    return "state-fail";
  }

  function renderSupport(root) {
    const support = fieldSupport();
    const cards = [
      [
        "long-animation-frame",
        support.loaf,
        "PerformanceObserver.supportedEntryTypes includes the LoAF entry type.",
      ],
      [
        "PerformanceLongAnimationFrameTiming",
        support.entryInterface,
        "Baseline LoAF timing interface exists.",
      ],
      [
        "styleAndLayoutStart",
        support.styleAndLayoutStart,
        "Baseline combined style/layout timestamp is exposed.",
      ],
      ["scripts[]", support.scripts, "LoAF entries can expose script attribution records."],
      [
        "entry.styleDuration",
        support.styleDuration,
        "Origin-trial split style calculation duration on the LoAF entry.",
      ],
      [
        "entry.layoutDuration",
        support.layoutDuration,
        "Origin-trial split layout duration on the LoAF entry.",
      ],
      [
        "script.forcedStyleDuration",
        support.forcedStyleDuration,
        "Origin-trial forced style duration on each script attribution.",
      ],
      [
        "script.forcedLayoutDuration",
        support.forcedLayoutDuration,
        "Origin-trial forced layout duration on each script attribution.",
      ],
    ];
    const panel = el("section", { class: "support-panel" }, [
      el("h2", { text: "live API support" }),
      el("div", { class: "support-grid" }),
    ]);
    const grid = $(".support-grid", panel);
    for (const [name, ok, detail] of cards) {
      const state = ok ? "available" : "not exposed in this browser";
      grid.append(el("div", { class: "support-card" }, [
        el("strong", { text: name }),
        el("span", { class: supportClass(ok), text: state }),
        el("p", { text: detail }),
      ]));
    }
    root.append(panel);
  }

  function scriptEntries(entry) {
    try {
      return Array.from(entry.scripts ?? []);
    } catch {
      return [];
    }
  }

  function sumScriptField(entry, field) {
    return scriptEntries(entry).reduce((sum, script) => sum + Number(script[field] ?? 0), 0);
  }

  function combinedStyleLayoutWindow(entry) {
    const start = Number(entry.styleAndLayoutStart ?? 0);
    if (!start) return null;
    const end = Number(entry.paintTime || (entry.startTime + entry.duration));
    const value = end - start;
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function summarizeEntry(entry) {
    if (!entry) return null;
    const duration = Number(entry.duration ?? 0);
    const styleDuration = entry.styleDuration ?? null;
    const layoutDuration = entry.layoutDuration ?? null;
    const forcedStyleDuration = sumScriptField(entry, "forcedStyleDuration") || null;
    const forcedLayoutDuration = sumScriptField(entry, "forcedLayoutDuration") || null;
    const forcedStyleAndLayoutDuration = sumScriptField(entry, "forcedStyleAndLayoutDuration") ||
      null;
    const combinedWindow = combinedStyleLayoutWindow(entry);
    const splitTotal = Number(styleDuration ?? 0) +
      Number(layoutDuration ?? 0) +
      Number(forcedStyleDuration ?? 0) +
      Number(forcedLayoutDuration ?? 0);
    return {
      duration,
      startTime: Number(entry.startTime ?? 0),
      renderStart: entry.renderStart ?? null,
      styleAndLayoutStart: entry.styleAndLayoutStart ?? null,
      styleDuration,
      layoutDuration,
      forcedStyleDuration,
      forcedLayoutDuration,
      forcedStyleAndLayoutDuration,
      combinedWindow,
      scriptCount: scriptEntries(entry).length,
      splitAvailable: splitTotal > 0 || FIELD_NAMES.entry.some((field) => field in entry) ||
        scriptEntries(entry).some((script) => FIELD_NAMES.script.some((field) => field in script)),
    };
  }

  function fieldRows(summary, manualDuration) {
    if (!summary) {
      return [
        ["LoAF entry", "not captured", "No browser LoAF entry arrived for this run."],
        [
          "manual measure",
          ms(manualDuration),
          "Fallback timing from performance.mark()/measure().",
        ],
      ];
    }
    return [
      ["duration", ms(summary.duration), "Total long animation frame duration."],
      [
        "styleDuration",
        ms(summary.styleDuration),
        "Origin-trial field on PerformanceLongAnimationFrameTiming.",
      ],
      [
        "layoutDuration",
        ms(summary.layoutDuration),
        "Origin-trial field on PerformanceLongAnimationFrameTiming.",
      ],
      [
        "forcedStyleDuration",
        ms(summary.forcedStyleDuration),
        "Origin-trial field summed from entry.scripts[].",
      ],
      [
        "forcedLayoutDuration",
        ms(summary.forcedLayoutDuration),
        "Origin-trial field summed from entry.scripts[].",
      ],
      [
        "forcedStyleAndLayoutDuration",
        ms(summary.forcedStyleAndLayoutDuration),
        "Baseline combined forced style/layout script attribution.",
      ],
      [
        "styleAndLayout window",
        ms(summary.combinedWindow),
        "Fallback estimate from styleAndLayoutStart to paint/end.",
      ],
      [
        "scripts",
        String(summary.scriptCount),
        "Number of PerformanceScriptTiming records attached to this entry.",
      ],
    ];
  }

  function renderTable(rows) {
    const tbody = el("tbody");
    for (const row of rows) {
      tbody.append(el("tr", {}, row.map((cell) => el("td", { text: cell }))));
    }
    return el("div", { class: "entry-table-wrap" }, [
      el("table", { class: "entry-table" }, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", { text: "field" }),
            el("th", { text: "value" }),
            el("th", { text: "contract" }),
          ]),
        ]),
        tbody,
      ]),
    ]);
  }

  function renderBars(summary, manualDuration) {
    const duration = summary?.duration || manualDuration || 1;
    const style = Number(summary?.styleDuration ?? 0);
    const layout = Number(summary?.layoutDuration ?? 0);
    const forced = Number(summary?.forcedStyleDuration ?? 0) +
      Number(summary?.forcedLayoutDuration ?? 0);
    const combined = summary?.splitAvailable
      ? 0
      : Number(summary?.combinedWindow ?? manualDuration ?? 0);
    const other = Math.max(0, duration - style - layout - forced - combined);
    const stack = el("div", { class: "bar-stack" }, [
      el("span", { class: "bar-segment bar-style" }),
      el("span", { class: "bar-segment bar-layout" }),
      el("span", { class: "bar-segment bar-forced" }),
      el("span", { class: "bar-segment bar-other" }),
    ]);
    const segments = stack.querySelectorAll(".bar-segment");
    segments[0].style.width = `${percent(style || combined, duration)}%`;
    segments[1].style.width = `${percent(layout, duration)}%`;
    segments[2].style.width = `${percent(forced, duration)}%`;
    segments[3].style.width = `${percent(other, duration)}%`;
    return el("div", {}, [
      stack,
      el("div", { class: "legend-row" }, [
        legend(
          "dot-style",
          summary?.splitAvailable ? "styleDuration" : "combined style/layout fallback",
        ),
        legend("dot-layout", "layoutDuration"),
        legend("dot-forced", "forced script split"),
        legend("dot-other", "other frame time"),
      ]),
    ]);
  }

  function legend(cls, text) {
    return el("span", { class: "legend-item" }, [
      el("span", { class: `legend-dot ${cls}` }),
      document.createTextNode(text),
    ]);
  }

  function spin(msTarget) {
    const end = performance.now() + msTarget;
    while (performance.now() < end) {
      Math.sqrt(Math.random() * 1000);
    }
  }

  function makeHost() {
    const host = el("div", { class: "hidden-workload", "aria-hidden": "true" });
    document.body.append(host);
    return host;
  }

  function styleWork(intensity) {
    const host = makeHost();
    const sheet = el("style");
    const rules = [];
    const count = 300 + Math.round(intensity * 10);
    for (let i = 0; i < count; i++) {
      rules.push(
        `.loaf-style-${i}:not(.off) > span:nth-child(${i % 5 + 1}) { letter-spacing:${
          i % 4
        }px; transform:translateX(${i % 7}px); }`,
      );
    }
    sheet.textContent = rules.join("\n");
    host.append(sheet);
    const nodes = [];
    for (let i = 0; i < Math.min(count, 900); i++) {
      const node = el("div", { class: `loaf-style-${i % count}` });
      for (let j = 0; j < 5; j++) node.append(el("span", { text: "style" }));
      host.append(node);
      nodes.push(node);
    }
    for (let round = 0; round < 6; round++) {
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].className = `loaf-style-${(i + round * 17) % count}`;
      }
      void getComputedStyle(nodes[round % nodes.length]).letterSpacing;
    }
    spin(55 + intensity * 0.9);
    host.remove();
  }

  function layoutWork(intensity) {
    const host = makeHost();
    host.style.width = "720px";
    const count = 90 + Math.round(intensity * 3);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const node = el("div", { text: "layout" });
      node.style.display = "block";
      node.style.padding = `${i % 7}px`;
      node.style.margin = `${i % 5}px`;
      host.append(node);
      nodes.push(node);
    }
    const loops = 2 + Math.round(intensity / 20);
    for (let round = 0; round < loops; round++) {
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.width = `${220 + (i + round) % 80}px`;
        void nodes[i].getBoundingClientRect();
      }
    }
    spin(55 + intensity * 0.75);
    host.remove();
  }

  function forcedStyleWork(intensity) {
    const host = makeHost();
    const count = 120 + Math.round(intensity * 4);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const node = el("div", { text: "forced" });
      host.append(node);
      nodes.push(node);
    }
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.fontSize = `${12 + (i + round) % 8}px`;
        void getComputedStyle(nodes[i]).fontSize;
      }
    }
    spin(65 + intensity * 0.8);
    host.remove();
  }

  async function observeWorkload(label, work, intensity) {
    const entries = [];
    let observer = null;
    if (fieldSupport().loaf) {
      try {
        observer = new PerformanceObserver((list) => {
          entries.push(...list.getEntries());
        });
        observer.observe({ type: "long-animation-frame", buffered: false });
      } catch {
        observer = null;
      }
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const mark = `${label}-${Math.random().toString(16).slice(2)}`;
    performance.mark(`${mark}-start`);
    const start = performance.now();
    work(intensity);
    const manualDuration = performance.now() - start;
    performance.mark(`${mark}-end`);
    performance.measure(mark, `${mark}-start`, `${mark}-end`);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (observer) observer.disconnect();
    const selected = entries.reduce(
      (best, entry) => !best || entry.duration > best.duration ? entry : best,
      null,
    );
    return {
      label,
      entries,
      selected,
      summary: summarizeEntry(selected),
      manualDuration,
      measure: performance.getEntriesByName(mark, "measure").at(-1),
    };
  }

  function resultContent(result) {
    const summary = result.summary;
    const status = summary
      ? summary.splitAvailable
        ? "Origin-trial split fields were present on this LoAF entry."
        : "LoAF entry captured, but this browser exposed only baseline combined style/layout timing."
      : "No LoAF entry arrived; showing the explicit performance.measure() fallback for the same workload.";
    return [
      el("h3", { text: result.label }),
      el("p", { text: status }),
      renderBars(summary, result.manualDuration),
      renderTable(fieldRows(summary, result.manualDuration)),
    ];
  }

  function resultCard(result) {
    return el("article", { class: "entry-card" }, [
      ...resultContent(result),
    ]);
  }

  function setBusy(buttons, busy) {
    for (const button of buttons) {
      button.disabled = busy;
    }
  }

  function initCompatibility(root) {
    renderSupport(root);
    const surface = el("section", { class: "demo-surface" }, [
      el("h2", { text: "capture matrix" }),
      control("intensity", "workload intensity", "70"),
      el("div", { class: "button-row" }, [
        button("style recalc work", "style"),
        button("layout thrash", "layout"),
        button("combined work", "combined"),
        button("clear", "clear", true),
      ]),
      el("p", {
        class: "status-line",
        text: "Choose a workload to inspect LoAF fields and fallback timing.",
      }),
      el("div", { class: "entry-list" }),
    ]);
    root.append(surface, fallbackSample());
    const output = $(".entry-list", surface);
    const status = $(".status-line", surface);
    const buttons = surface.querySelectorAll("button");
    const intensity = $("input", surface);
    surface.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "clear") {
        output.textContent = "";
        status.textContent = "Cleared. Choose another workload.";
        return;
      }
      setBusy(buttons, true);
      status.textContent = "Running workload and waiting for LoAF delivery...";
      const level = Number(intensity.value);
      const result = action === "style"
        ? await observeWorkload("style recalc work", styleWork, level)
        : action === "layout"
        ? await observeWorkload("layout thrash", layoutWork, level)
        : await observeWorkload("combined style + layout work", (value) => {
          styleWork(value);
          layoutWork(value);
        }, level);
      output.prepend(resultCard(result));
      status.textContent = `${result.entries.length} LoAF entr${
        result.entries.length === 1 ? "y" : "ies"
      } captured; fallback measurement ${ms(result.manualDuration)}.`;
      setBusy(buttons, false);
    });
  }

  function control(id, label, value) {
    return el("div", { class: "control-row" }, [
      el("div", { class: "control-field" }, [
        el("label", { for: id, text: label }),
        el("input", { id, type: "range", min: "10", max: "100", value }),
        el("output", { for: id, text: `${value}%` }),
      ]),
    ]);
  }

  function wireOutputs(root) {
    root.querySelectorAll("input[type=range]").forEach((input) => {
      const output = root.querySelector(`output[for="${input.id}"]`);
      if (!output) return;
      input.addEventListener("input", () => {
        output.textContent = `${input.value}%`;
      });
    });
  }

  function button(text, action, secondary = false) {
    return el("button", {
      class: secondary ? "secondary-button" : "demo-button",
      type: "button",
      "data-action": action,
      text,
    });
  }

  function fallbackSample() {
    const sample = `const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const split = {
      duration: entry.duration,
      styleDuration: entry.styleDuration,
      layoutDuration: entry.layoutDuration,
      forcedStyleDuration: entry.scripts.reduce(
        (sum, script) => sum + (script.forcedStyleDuration ?? 0), 0),
      forcedLayoutDuration: entry.scripts.reduce(
        (sum, script) => sum + (script.forcedLayoutDuration ?? 0), 0),
      combinedFallback: entry.scripts.reduce(
        (sum, script) => sum + (script.forcedStyleAndLayoutDuration ?? 0), 0),
    };
  }
});
observer.observe({ type: "long-animation-frame", buffered: true });`;
    return el("section", {}, [
      el("h2", { text: "correct field mapping" }),
      el("pre", { class: "code-sample", text: sample }),
    ]);
  }

  function initMonitor(root) {
    renderSupport(root);
    const surface = el("section", { class: "demo-surface" }, [
      el("h2", { text: "entry monitor" }),
      control("monitor-intensity", "workload intensity", "75"),
      el("div", { class: "button-row" }, [
        button("trigger style work", "style"),
        button("trigger forced style read", "forced"),
        button("trigger layout work", "layout"),
        button("clear entries", "clear", true),
      ]),
      el("p", { class: "status-line", text: "Waiting for a workload." }),
      el("div", { class: "entry-list" }),
    ]);
    root.append(surface, fallbackSample());
    const output = $(".entry-list", surface);
    const status = $(".status-line", surface);
    const buttons = surface.querySelectorAll("button");
    const intensity = $("input", surface);
    surface.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "clear") {
        output.textContent = "";
        status.textContent = "Entries cleared.";
        return;
      }
      setBusy(buttons, true);
      status.textContent = "Running workload...";
      const result = action === "style"
        ? await observeWorkload("style recalculation", styleWork, Number(intensity.value))
        : action === "forced"
        ? await observeWorkload("forced style read", forcedStyleWork, Number(intensity.value))
        : await observeWorkload("layout thrash", layoutWork, Number(intensity.value));
      output.prepend(resultCard(result));
      status.textContent = `${output.children.length} result${
        output.children.length === 1 ? "" : "s"
      } shown. Latest fallback measurement: ${ms(result.manualDuration)}.`;
      setBusy(buttons, false);
    });
  }

  function initAnalyzer(root) {
    renderSupport(root);
    const surface = el("section", { class: "demo-surface" }, [
      el("h2", { text: "style workload vs layout workload" }),
      control("analyzer-intensity", "workload intensity", "80"),
      el("div", { class: "scenario-grid" }, [
        scenario(
          "style-heavy workload",
          "Changes many classes and forces selector matching.",
          "run style workload",
          "style",
        ),
        scenario(
          "layout-heavy workload",
          "Interleaves geometry writes and reads to force layout.",
          "run layout workload",
          "layout",
        ),
      ]),
      el("p", {
        class: "status-line",
        text: "Run both workloads to compare captured split fields or fallback timing.",
      }),
    ]);
    root.append(surface, fallbackSample());
    const intensity = $("input", surface);
    const status = $(".status-line", surface);
    const buttons = surface.querySelectorAll("button");
    surface.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      const card = event.target.closest(".scenario-card");
      const output = $(".scenario-output", card);
      setBusy(buttons, true);
      output.textContent = "Running...";
      const result = action === "style"
        ? await observeWorkload("style-heavy workload", styleWork, Number(intensity.value))
        : await observeWorkload("layout-heavy workload", layoutWork, Number(intensity.value));
      output.textContent = "";
      output.append(...resultContent(result));
      status.textContent =
        `${result.label}: ${result.entries.length} LoAF entries, manual fallback ${
          ms(result.manualDuration)
        }.`;
      setBusy(buttons, false);
    });
  }

  function scenario(title, description, actionText, action) {
    return el("article", { class: "scenario-card" }, [
      el("strong", { text: title }),
      el("p", { text: description }),
      button(actionText, action),
      el("div", { class: "scenario-output" }),
    ]);
  }

  function initBudget(root) {
    renderSupport(root);
    const surface = el("section", { class: "demo-surface" }, [
      el("h2", { text: "rAF budget monitor" }),
      el("div", { class: "control-row" }, [
        controlField("style-budget", "style intensity", "60"),
        controlField("layout-budget", "layout intensity", "30"),
      ]),
      el("div", { class: "button-row" }, [
        button("trigger style work", "style"),
        button("trigger layout work", "layout"),
        button("trigger both", "both"),
        button("clear log", "clear", true),
      ]),
      el("div", { class: "metric-grid" }, [
        metric("runs", "0"),
        metric("max duration", "0.0 ms"),
        metric("max style split", "0.0 ms"),
        metric("max layout split", "0.0 ms"),
        metric("fallback runs", "0"),
      ]),
      el("p", { class: "status-line", text: "Ready." }),
      el("div", { class: "entry-list" }),
    ]);
    root.append(surface, fallbackSample());
    const stats = surface.querySelectorAll(".metric-card span");
    const output = $(".entry-list", surface);
    const status = $(".status-line", surface);
    const buttons = surface.querySelectorAll("button");
    const state = { runs: 0, max: 0, maxStyle: 0, maxLayout: 0, fallback: 0 };
    surface.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "clear") {
        output.textContent = "";
        Object.assign(state, { runs: 0, max: 0, maxStyle: 0, maxLayout: 0, fallback: 0 });
        updateBudgetStats(stats, state);
        status.textContent = "Log cleared.";
        return;
      }
      setBusy(buttons, true);
      const styleLevel = Number($("#style-budget", surface).value);
      const layoutLevel = Number($("#layout-budget", surface).value);
      const result = action === "style"
        ? await observeWorkload("style rAF budget run", styleWork, styleLevel)
        : action === "layout"
        ? await observeWorkload("layout rAF budget run", layoutWork, layoutLevel)
        : await observeWorkload("combined rAF budget run", () => {
          styleWork(styleLevel);
          layoutWork(layoutLevel);
        }, 0);
      state.runs++;
      state.max = Math.max(state.max, result.summary?.duration ?? result.manualDuration);
      state.maxStyle = Math.max(state.maxStyle, Number(result.summary?.styleDuration ?? 0));
      state.maxLayout = Math.max(state.maxLayout, Number(result.summary?.layoutDuration ?? 0));
      if (!result.summary?.splitAvailable) state.fallback++;
      updateBudgetStats(stats, state);
      output.prepend(resultCard(result));
      status.textContent = `Latest run: ${result.entries.length} LoAF entries, fallback ${
        ms(result.manualDuration)
      }.`;
      setBusy(buttons, false);
    });
  }

  function controlField(id, label, value) {
    return el("div", { class: "control-field" }, [
      el("label", { for: id, text: label }),
      el("input", { id, type: "range", min: "10", max: "100", value }),
      el("output", { for: id, text: `${value}%` }),
    ]);
  }

  function metric(label, value) {
    return el("div", { class: "metric-card" }, [
      el("strong", { text: label }),
      el("span", { text: value }),
    ]);
  }

  function updateBudgetStats(nodes, state) {
    nodes[0].textContent = String(state.runs);
    nodes[1].textContent = ms(state.max);
    nodes[2].textContent = ms(state.maxStyle);
    nodes[3].textContent = ms(state.maxLayout);
    nodes[4].textContent = String(state.fallback);
  }

  function initProfiler(root) {
    renderSupport(root);
    const surface = el("section", { class: "demo-surface" }, [
      el("h2", { text: "style recalculation scenarios" }),
      el("div", { class: "button-row" }, [
        button("run all scenarios", "all"),
        button("clear chart", "clear", true),
      ]),
      el("div", { class: "scenario-grid" }, [
        scenario(
          "simple recalc",
          "One document-level custom property change plus a small wait.",
          "run simple",
          "simple",
        ),
        scenario(
          "complex recalc",
          "Many selector matches and computed-style reads.",
          "run complex",
          "complex",
        ),
        scenario(
          "cascade recalc",
          "Combined style and layout pressure in one frame.",
          "run cascade",
          "cascade",
        ),
      ]),
      el("div", { class: "chart-panel" }, [
        el("canvas", { width: "760", height: "180", "aria-label": "LoAF duration chart" }),
      ]),
      el("p", { class: "status-line", text: "Run a scenario to populate the chart." }),
      el("div", { class: "entry-list" }),
    ]);
    root.append(surface, fallbackSample());
    const chartEntries = [];
    const output = $(".entry-list", surface);
    const status = $(".status-line", surface);
    const buttons = surface.querySelectorAll("button");
    const canvas = $("canvas", surface);
    const runOne = async (action) => {
      const result = action === "simple"
        ? await observeWorkload("simple recalc", styleWork, 35)
        : action === "complex"
        ? await observeWorkload("complex recalc", forcedStyleWork, 75)
        : await observeWorkload("cascade recalc", (level) => {
          styleWork(level);
          layoutWork(level);
        }, 70);
      chartEntries.push(result);
      output.prepend(resultCard(result));
      drawChart(canvas, chartEntries);
      status.textContent = `${result.label}: ${result.entries.length} LoAF entries, fallback ${
        ms(result.manualDuration)
      }.`;
    };
    surface.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "clear") {
        chartEntries.length = 0;
        output.textContent = "";
        drawChart(canvas, chartEntries);
        status.textContent = "Chart cleared.";
        return;
      }
      setBusy(buttons, true);
      if (action === "all") {
        for (const item of ["simple", "complex", "cascade"]) await runOne(item);
      } else {
        await runOne(action);
      }
      setBusy(buttons, false);
    });
    drawChart(canvas, chartEntries);
  }

  function drawChart(canvas, entries) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const text = styles.getPropertyValue("--text-muted").trim();
    const border = styles.getPropertyValue("--border-black").trim();
    const blue = styles.getPropertyValue("--accent-blue").trim();
    const green = styles.getPropertyValue("--accent-emerald").trim();
    const stone = styles.getPropertyValue("--bg-stone").trim();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = text;
    ctx.font = "14px monospace";
    if (!entries.length) {
      ctx.fillText("No scenario results yet", 24, 90);
      return;
    }
    const max = Math.max(
      100,
      ...entries.map((entry) => entry.summary?.duration ?? entry.manualDuration),
    );
    const barWidth = Math.max(34, Math.floor((width - 60) / entries.length) - 12);
    entries.forEach((entry, index) => {
      const summary = entry.summary;
      const duration = summary?.duration ?? entry.manualDuration;
      const style = summary?.splitAvailable
        ? Number(summary.styleDuration ?? 0)
        : Number(summary?.combinedWindow ?? entry.manualDuration);
      const layout = Number(summary?.layoutDuration ?? 0);
      const totalHeight = Math.max(4, duration / max * (height - 42));
      const styleHeight = style / max * (height - 42);
      const layoutHeight = layout / max * (height - 42);
      const x = 40 + index * (barWidth + 12);
      const y = height - 24;
      ctx.fillStyle = stone;
      ctx.strokeStyle = border;
      ctx.fillRect(x, y - totalHeight, barWidth, totalHeight);
      ctx.strokeRect(x, y - totalHeight, barWidth, totalHeight);
      ctx.fillStyle = green;
      ctx.fillRect(x, y - styleHeight - layoutHeight, barWidth, layoutHeight);
      ctx.fillStyle = blue;
      ctx.fillRect(x, y - styleHeight, barWidth, styleHeight);
      ctx.fillStyle = text;
      ctx.fillText(String(index + 1), x + barWidth / 2 - 4, height - 6);
    });
  }

  const root = document.querySelector("[data-loaf-demo]");
  if (!root) return;
  root.textContent = "";
  const demo = root.dataset.loafDemo;
  if (demo === "compatibility") initCompatibility(root);
  else if (demo === "monitor") initMonitor(root);
  else if (demo === "analyzer") initAnalyzer(root);
  else if (demo === "budget") initBudget(root);
  else if (demo === "profiler") initProfiler(root);
  wireOutputs(root);
})();
