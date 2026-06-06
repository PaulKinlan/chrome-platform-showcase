(function () {
  function isActive(element) {
    return document.activeElement === element || element.contains(document.activeElement);
  }

  function selectionTextFor(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? start;
      return element.value.slice(start, end);
    }
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return "";
    return element.contains(selection.anchorNode) || element.contains(selection.focusNode)
      ? selection.toString()
      : "";
  }

  function measuredInputWidth(element, text) {
    const cs = getComputedStyle(element);
    const measurer = document.createElement("span");
    measurer.textContent = text || " ";
    measurer.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      white-space: nowrap;
      font: ${cs.font};
      letter-spacing: ${cs.letterSpacing};
      visibility: hidden;
    `;
    document.body.append(measurer);
    const width = measurer.getBoundingClientRect().width;
    measurer.remove();
    return width;
  }

  function stateFor(element) {
    const cs = getComputedStyle(element);
    const text = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element.value
      : element.textContent || "";
    const measuredWidth =
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? measuredInputWidth(element, text)
        : 0;
    const contentWidth = Math.max(element.scrollWidth, measuredWidth);
    const overflowed = contentWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight;
    const active = isActive(element);
    return {
      active,
      clippedWhileInteracting: active && overflowed && cs.textOverflow.includes("ellipsis"),
      clientWidth: Math.round(element.clientWidth),
      contentWidth: Math.round(contentWidth),
      measuredWidth: Math.round(measuredWidth),
      overflowed,
      scrollLeft: Math.round(element.scrollLeft || 0),
      scrollWidth: Math.round(element.scrollWidth),
      selectionLength: selectionTextFor(element).length,
      textLength: text.length,
      textOverflow: cs.textOverflow,
      whiteSpace: cs.whiteSpace,
    };
  }

  function describe(element, label) {
    const state = stateFor(element);
    if (
      !window.CSS || typeof CSS.supports !== "function" ||
      !CSS.supports("text-overflow: ellipsis")
    ) {
      return `${label}: fallback. This browser does not report support for text-overflow: ellipsis.`;
    }
    if (!state.overflowed) {
      return `${label}: edge state. Text fits (${state.contentWidth}px content in ${state.clientWidth}px), so no ellipsis or interaction clipping is needed.`;
    }
    if (state.active) {
      return `${label}: interacting. CSS still computes text-overflow as ${state.textOverflow}, while Chrome 148 renders the overflowing inline text as clipped so the hidden content can be reached. ${state.contentWidth}px content / ${state.clientWidth}px box; selection length ${state.selectionLength}.`;
    }
    return `${label}: resting. ${state.contentWidth}px content overflows a ${state.clientWidth}px box with text-overflow:${state.textOverflow}; focus or caret interaction should temporarily render it as clip.`;
  }

  function updatePanel(panel, element, label) {
    const state = stateFor(element);
    panel.textContent = `${describe(element, label)}\n` +
      `active=${state.active} overflowed=${state.overflowed} contentWidth=${state.contentWidth} scrollWidth=${state.scrollWidth} clientWidth=${state.clientWidth} measuredWidth=${state.measuredWidth} scrollLeft=${state.scrollLeft} white-space=${state.whiteSpace}`;
    panel.dataset.active = String(state.active);
    panel.dataset.overflowed = String(state.overflowed);
  }

  window.EllipsisInteractionProbe = {
    describe,
    stateFor,
    updatePanel,
  };
})();
