// Dedicated worker for the context-parity-matrix concept: creates 2D contexts on
// OffscreenCanvas inside a worker (and on a transferred placeholder canvas) and
// reports getContextAttributes().toneMapping back to the page.
function probe(canvas, mode) {
  try {
    const ctx = canvas.getContext("2d", { colorType: "float16", toneMapping: { mode } });
    if (!ctx) return { error: "getContext returned null" };
    const a = ctx.getContextAttributes();
    // draw something so a transferred placeholder visibly updates
    ctx.fillStyle = mode === "extended" ? "color(srgb-linear 3 3 3)" : "color(srgb 1 1 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return {
      got: a && a.toneMapping ? a.toneMapping.mode : undefined,
      colorType: a ? a.colorType : undefined,
    };
  } catch (e) {
    return { error: `${e.name}: ${e.message}` };
  }
}
self.onmessage = (e) => {
  const { id, mode, canvas } = e.data;
  if (typeof OffscreenCanvas !== "function") {
    self.postMessage({ id, error: "OffscreenCanvas unavailable in worker" });
    return;
  }
  const target = canvas || new OffscreenCanvas(8, 8);
  self.postMessage({ id, ...probe(target, mode) });
};
