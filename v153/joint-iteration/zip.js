// Iterator.zip / Iterator.zipKeyed, plus a shim used only where they are absent.
//
// The shim follows the proposal's steps rather than a convenient approximation,
// because the pages that use it teach the mode and closing rules: mode defaults
// to "shortest" and an unknown mode is a TypeError; padding is read only under
// "longest" and is otherwise not even validated; a padding iterable shorter than
// the source count leaves the rest undefined; and every abandoned iterator is
// closed, including when the consumer breaks out of the loop early.
//
// Nothing here pretends to be the built-in. Pages that import it report which
// of the two they are running.

export const hasNativeZip = typeof globalThis.Iterator?.zip === "function";
export const hasNativeZipKeyed = typeof globalThis.Iterator?.zipKeyed === "function";

const MODES = new Set(["shortest", "longest", "strict"]);

function readMode(options) {
  if (options !== undefined && (options === null || typeof options !== "object")) {
    throw new TypeError("options must be an object");
  }
  const mode = options?.mode ?? "shortest";
  if (!MODES.has(mode)) {
    throw new TypeError(`unsupported mode: ${String(mode)}`);
  }
  return mode;
}

// Only meaningful under "longest". Read once into a list, shortest-wins against
// the number of sources, and the tail left as undefined.
function readPadding(options, mode, count) {
  if (mode !== "longest") return null;
  const provided = options?.padding;
  const padding = new Array(count).fill(undefined);
  if (provided === undefined) return padding;
  if (provided === null || typeof provided !== "object") {
    throw new TypeError("padding must be an object");
  }
  let index = 0;
  for (const value of provided) {
    if (index >= count) break;
    padding[index] = value;
    index += 1;
  }
  return padding;
}

function closeAll(iterators) {
  for (const iterator of iterators) {
    try {
      iterator.return?.();
    } catch {
      // A close that throws must not mask the reason we were closing.
    }
  }
}

export function* zipShim(iterables, options) {
  if (iterables === null || typeof iterables !== "object") {
    throw new TypeError("iterables must be an object");
  }
  const mode = readMode(options);
  const iterators = [];
  for (const iterable of iterables) {
    iterators.push(iterable[Symbol.iterator]());
  }
  const padding = readPadding(options, mode, iterators.length);
  if (iterators.length === 0) return;

  const finished = new Array(iterators.length).fill(false);
  try {
    for (;;) {
      const tuple = new Array(iterators.length);
      let doneCount = 0;
      for (let index = 0; index < iterators.length; index++) {
        if (finished[index]) {
          doneCount += 1;
          tuple[index] = padding ? padding[index] : undefined;
          continue;
        }
        const step = iterators[index].next();
        if (step.done) {
          finished[index] = true;
          doneCount += 1;
          tuple[index] = padding ? padding[index] : undefined;
        } else {
          tuple[index] = step.value;
        }
      }

      if (mode === "shortest" && doneCount > 0) return;
      // Every source finishing on the same step is the clean end, strict included.
      if (doneCount === iterators.length) return;
      if (mode === "strict" && doneCount > 0) {
        throw new TypeError(
          "Iterator.zip: mode is 'strict' but the sources were not the same length",
        );
      }
      yield tuple;
    }
  } finally {
    // Covers every exit: exhaustion, a strict-mode throw, and a consumer that
    // breaks out of the for…of before the sources are spent.
    closeAll(iterators.filter((_, index) => !finished[index]));
  }
}

export function* zipKeyedShim(iterables, options) {
  if (iterables === null || typeof iterables !== "object") {
    throw new TypeError("iterables must be an object");
  }
  const keys = Object.keys(iterables);
  const paddingObject = options?.padding;
  const positional = keys.map((key) => iterables[key]);
  const positionalOptions = {
    mode: options?.mode,
    padding: paddingObject === undefined ? undefined : keys.map((key) => paddingObject[key]),
  };
  for (const tuple of zipShim(positional, positionalOptions)) {
    const record = {};
    keys.forEach((key, index) => {
      record[key] = tuple[index];
    });
    yield record;
  }
}

export const zip = hasNativeZip
  ? (iterables, options) => globalThis.Iterator.zip(iterables, options)
  : zipShim;

export const zipKeyed = hasNativeZipKeyed
  ? (iterables, options) => globalThis.Iterator.zipKeyed(iterables, options)
  : zipKeyedShim;
