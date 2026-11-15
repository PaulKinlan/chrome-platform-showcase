// The worker the three demos share.
//
// It reports what its own PerformanceObserver can see, blocks its event loop on
// request, and keeps a hand-rolled record of how long each of its tasks took —
// which is the workaround Long Animation Frames in workers is meant to replace.

let observed = [];
let observer = null;
let selfTimed = [];
let selfTimingOn = false;
let lastTaskEnd = performance.now();

// The self-timer ticks every 16ms, not every 0ms (4ms once clamped). Chromium's
// worker implementation reports a "congested moment" that stays open while
// tasks start within 5ms of the previous one ending (kCongestionIdleGap in
// animation_frame_timing_monitor.cc). A 4ms tick chain never left a 5ms idle
// gap, so the moment around a block never closed and its entry surfaced
// whenever jitter happened to open one — usually during the NEXT run. 16ms
// leaves a real idle gap and still resolves any stall over 50ms.
const TICK_MS = 16;

function supported() {
  return [...(PerformanceObserver.supportedEntryTypes ?? [])];
}

// A task boundary is observable from inside the worker only by scheduling a
// task and noticing how late it ran. That is the whole of the workaround: it
// sees duration and nothing else.
function armSelfTiming() {
  if (selfTimingOn) return;
  selfTimingOn = true;
  const tick = () => {
    const now = performance.now();
    const gap = now - lastTaskEnd;
    if (gap > 50) {
      selfTimed.push({ at: now, blockedFor: gap });
      if (selfTimed.length > 50) selfTimed.shift();
    }
    lastTaskEnd = performance.now();
    setTimeout(tick, TICK_MS);
  };
  setTimeout(tick, TICK_MS);
}

function collect(entries) {
  for (const entry of entries) {
    observed.push({
      entryType: entry.entryType,
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
    });
  }
}

// Entries whose span overlaps [from, to] belong to that block.
function overlapping(from, to) {
  return observed.filter((entry) =>
    entry.startTime <= to && entry.startTime + entry.duration >= from
  );
}

function startObserving() {
  observed = [];
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  const wanted = ["long-animation-frame", "longtask"].filter((type) => supported().includes(type));
  if (wanted.length === 0) {
    return { observing: [], reason: "no long-task entry type is supported in this worker" };
  }
  observer = new PerformanceObserver((list) => collect(list.getEntries()));
  observer.observe({ entryTypes: wanted });
  return { observing: wanted, reason: "" };
}

function block(ms) {
  const started = performance.now();
  // A genuine busy loop: the worker's event loop cannot turn while this runs,
  // which is exactly the condition the feature is meant to make observable.
  let sink = 0;
  while (performance.now() - started < ms) {
    sink += Math.sqrt(sink + 1);
  }
  // lastTaskEnd is deliberately NOT updated here: the self-timer's whole job is
  // to notice the gap this block leaves between two of its own ticks, and
  // resetting the marker from inside the block would erase the evidence.
  return { requested: ms, actual: performance.now() - started, sink };
}

self.onmessage = (event) => {
  const { type, id, ms } = event.data ?? {};
  if (type === "capabilities") {
    const started = startObserving();
    armSelfTiming();
    self.postMessage({
      type: "capabilities",
      id,
      entryTypes: supported(),
      hasLoAF: supported().includes("long-animation-frame"),
      hasLongTask: supported().includes("longtask"),
      observing: started.observing,
      reason: started.reason,
    });
    return;
  }
  if (type === "block") {
    const blockStart = performance.now();
    const result = block(Number(ms) || 0);
    const blockEnd = blockStart + result.actual;
    const watchingLoAF = Boolean(observer) && supported().includes("long-animation-frame");
    let waited = 0;
    // Report after a delay rather than on the next task. Measured: a
    // setTimeout(0) scheduled here runs BEFORE the self-timer's own pending
    // tick, so reporting immediately produced an empty record for the block
    // that had just happened and attributed it to the following one. 30ms
    // clears the self-timer's 16ms tick with room to spare.
    //
    // The observer callback is a separate, low-priority task, so 30ms later its
    // entry may still be queued rather than delivered. takeRecords() drains the
    // observer's buffer synchronously, and entries are matched to THIS block by
    // time span, so a late delivery can no longer be reported on the next run.
    // If the entry has not even been queued yet, poll briefly before giving up.
    const report = () => {
      if (observer) collect(observer.takeRecords());
      const mine = overlapping(blockStart, blockEnd);
      if (watchingLoAF && mine.length === 0 && waited < 1500) {
        waited += 50;
        setTimeout(report, 50);
        return;
      }
      self.postMessage({
        type: "blocked",
        id,
        requested: result.requested,
        actual: result.actual,
        observed: mine,
        waitedForEntryMs: 30 + waited,
        selfTimed: [...selfTimed],
        entryTypes: supported(),
      });
      // Keep only entries that started after this block; anything older has
      // been reported or belongs to nobody.
      observed = observed.filter((entry) => entry.startTime > blockEnd);
    };
    setTimeout(report, 30);
    return;
  }
  if (type === "ping") {
    self.postMessage({ type: "pong", id, at: performance.now() });
    return;
  }
  if (type === "reset") {
    observed = [];
    selfTimed = [];
    lastTaskEnd = performance.now();
    self.postMessage({ type: "reset", id });
  }
};
