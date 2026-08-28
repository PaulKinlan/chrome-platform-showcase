// Four workloads that spend their time in different parts of the browser, so a
// profile of each has a different shape. They are shared by all three demos on
// this feature so the comparisons are between the same code every time.
//
// Each returns a value that is used, because a workload the engine can prove is
// dead is a workload the engine will delete.

export const WORKLOADS = [
  {
    id: "script",
    name: "pure JavaScript",
    detail: "A numeric loop and some string building. Every sample should land on a stack.",
    expect: "script",
    run(ms) {
      const started = performance.now();
      let sink = 0;
      const parts = [];
      while (performance.now() - started < ms) {
        for (let i = 0; i < 2000; i++) sink += Math.sqrt(i * sink + 1);
        parts.push(sink.toFixed(3));
        if (parts.length > 200) parts.length = 0;
      }
      return parts.length + sink;
    },
  },
  {
    id: "gc",
    name: "allocation churn",
    detail:
      "Millions of short-lived objects. The time the collector spends reclaiming them is not your code, and today nothing in the trace says so.",
    expect: "gc",
    run(ms) {
      const started = performance.now();
      let kept = null;
      let count = 0;
      while (performance.now() - started < ms) {
        for (let i = 0; i < 4000; i++) {
          kept = { i, at: performance.now(), tag: `n${i}`, more: [i, i + 1, i + 2] };
          count += kept.more.length;
        }
      }
      return count + (kept ? 1 : 0);
    },
  },
  {
    id: "layout",
    name: "layout thrash",
    detail:
      "Write a style, read a geometry, repeat. Each read forces a synchronous layout, and that time belongs to the engine rather than to a JavaScript frame.",
    expect: "layout",
    run(ms, host) {
      const started = performance.now();
      const box = document.createElement("div");
      box.style.cssText = "position:absolute;left:-10000px;top:0;width:100px";
      for (let i = 0; i < 60; i++) {
        const child = document.createElement("div");
        child.textContent = `row ${i} with enough text to need measuring`;
        box.append(child);
      }
      (host ?? document.body).append(box);
      let total = 0;
      let width = 100;
      while (performance.now() - started < ms) {
        width = width === 100 ? 160 : 100;
        box.style.width = `${width}px`;
        // The read is what forces the layout.
        total += box.getBoundingClientRect().height;
      }
      box.remove();
      return total;
    },
  },
  {
    id: "style",
    name: "style recalculation",
    detail:
      "Toggle a class on a container with many descendants and read a computed value each time, so the selector matching cannot be deferred.",
    expect: "style",
    run(ms, host) {
      const started = performance.now();
      const box = document.createElement("div");
      box.style.cssText = "position:absolute;left:-10000px;top:0";
      const style = document.createElement("style");
      style.textContent =
        ".sp-a div div span { color: rgb(1,2,3); font-weight: 700 } .sp-b div div span { color: rgb(4,5,6); font-weight: 400 }";
      box.append(style);
      for (let i = 0; i < 40; i++) {
        const wrap = document.createElement("div");
        const inner = document.createElement("div");
        for (let j = 0; j < 6; j++) {
          const span = document.createElement("span");
          span.textContent = "x";
          inner.append(span);
        }
        wrap.append(inner);
        box.append(wrap);
      }
      (host ?? document.body).append(box);
      const target = box.querySelector("span");
      let total = 0;
      let flip = false;
      while (performance.now() - started < ms) {
        flip = !flip;
        box.className = flip ? "sp-a" : "sp-b";
        total += getComputedStyle(target).fontWeight.length;
      }
      box.remove();
      return total;
    },
  },
];

export function workloadById(id) {
  return WORKLOADS.find((workload) => workload.id === id) ?? WORKLOADS[0];
}

// A profile of one workload. Returns the raw trace plus the derived numbers the
// demos display, so every page computes them the same way.
export async function profile(workload, ms, host) {
  if (typeof globalThis.Profiler !== "function") {
    return { supported: false, reason: "no Profiler in this browser" };
  }
  let profiler;
  try {
    profiler = new Profiler({ sampleInterval: 10, maxBufferSize: 100000 });
  } catch (error) {
    return { supported: false, reason: `${error.name}: ${error.message}` };
  }
  const started = performance.now();
  const result = workload.run(ms, host);
  const elapsed = performance.now() - started;
  const trace = await profiler.stop();
  return { supported: true, trace, elapsed, result, ...summarise(trace) };
}

export function summarise(trace) {
  const samples = trace.samples ?? [];
  const stacks = trace.stacks ?? [];
  const frames = trace.frames ?? [];

  const withStack = samples.filter((sample) => sample.stackId !== undefined);
  const withoutStack = samples.length - withStack.length;
  const hasMarkerField = samples.some((sample) => "marker" in sample);
  const markers = hasMarkerField
    ? [...new Set(samples.map((sample) => sample.marker ?? "(none)"))]
    : [];

  // Self time per leaf frame: the frame at the top of each sample's stack.
  const selfCounts = new Map();
  for (const sample of withStack) {
    const stack = stacks[sample.stackId];
    if (!stack) continue;
    const frame = frames[stack.frameId];
    const name = frame ? (frame.name || "(anonymous)") : "(unknown frame)";
    selfCounts.set(name, (selfCounts.get(name) ?? 0) + 1);
  }
  const topFrames = [...selfCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count, share: count / Math.max(1, samples.length) }));

  return {
    sampleCount: samples.length,
    withStack: withStack.length,
    withoutStack,
    stackCount: stacks.length,
    frameCount: frames.length,
    resourceCount: (trace.resources ?? []).length,
    hasMarkerField,
    markers,
    topFrames,
  };
}
