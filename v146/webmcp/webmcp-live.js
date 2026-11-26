// Shared WebMCP helper for the v146/webmcp concept pages.
//
// The real API lives on Document (spec: https://webmachinelearning.github.io/webmcp/):
//   document.modelContext.registerTool(tool, { signal, exposedTo }) -> Promise<undefined>
//   document.modelContext.getTools({ fromOrigins })                 -> Promise<sequence<Tool>>
//   document.modelContext.executeTool(tool, inputObject, { signal }) -> Promise<DOMString>
//   events: toolchange, toolactivated, toolcancel
//
// It is behind a flag (chrome://flags/#enable-experimental-web-platform-features, or
// --enable-features=WebMCP) and in the "WebMCP" origin trial (Chrome 149-156). When it is
// missing, the pages fall back to `createSimulatedModelContext()`, which follows the same
// spec algorithm steps (name/description validation, duplicate-name rejection, AbortSignal
// unregistration, toolchange events, stringified results, OperationError on a throwing
// execute) so that the page code is identical in both modes. Every page labels which mode
// it is in; the simulation never claims to be the browser.

export const SPEC_URL = "https://webmachinelearning.github.io/webmcp/";

const NAME_RE = /^[A-Za-z0-9_.-]{1,128}$/;

/** Returns the browser's ModelContext, or null when WebMCP is not exposed. */
export function realModelContext() {
  return "modelContext" in Document.prototype || "modelContext" in document
    ? document.modelContext ?? null
    : null;
}

/** A spec-shaped stand-in used only when document.modelContext is absent. */
export function createSimulatedModelContext() {
  const target = new EventTarget();
  const tools = new Map(); // id -> definition
  let nextId = 1;
  const fire = (type) => queueMicrotask(() => target.dispatchEvent(new Event(type)));

  class SimTool {
    #id;
    constructor(id, def) {
      this.#id = id;
      Object.defineProperties(this, {
        name: { value: def.name, enumerable: true },
        title: { value: def.title ?? "", enumerable: true },
        description: { value: def.description, enumerable: true },
        inputSchema: { value: def.inputSchema ?? null, enumerable: true },
        annotations: { value: def.annotations ?? null, enumerable: true },
        origin: { value: location.origin, enumerable: true },
      });
    }
    get _id() {
      return this.#id;
    }
  }

  const api = {
    simulated: true,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    async registerTool(tool, options = {}) {
      if (!tool || typeof tool !== "object") throw new TypeError("parameter 1 is not of type 'ModelContextTool'.");
      for (const key of ["name", "description", "execute"]) {
        if (tool[key] === undefined) {
          throw new TypeError(`Failed to read the '${key}' property from 'ModelContextTool': Required member is undefined.`);
        }
      }
      if (typeof tool.execute !== "function") throw new TypeError("The 'execute' property is not a function.");
      if (tool.inputSchema !== undefined && (tool.inputSchema === null || typeof tool.inputSchema !== "object")) {
        throw new TypeError("Failed to read the 'inputSchema' property from 'ModelContextTool': Failed to convert value to 'object'.");
      }
      const name = String(tool.name);
      if ([...tools.values()].some((t) => t.name === name)) {
        throw new DOMException(`A tool named "${name}" is already registered`, "InvalidStateError");
      }
      if (!NAME_RE.test(name)) throw new DOMException("Invalid tool name", "InvalidStateError");
      if (String(tool.description) === "") throw new DOMException("Tool description is empty", "InvalidStateError");
      const signal = options.signal;
      if (signal?.aborted) throw signal.reason;
      for (const origin of options.exposedTo ?? []) {
        let url;
        try {
          url = new URL(origin);
        } catch {
          throw new DOMException(`"${origin}" is not a valid origin`, "SecurityError");
        }
        if (url.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(url.hostname)) {
          throw new DOMException(`"${origin}" is not potentially trustworthy`, "SecurityError");
        }
      }
      const id = nextId++;
      tools.set(id, {
        name,
        title: tool.title,
        description: String(tool.description),
        inputSchema: tool.inputSchema === undefined ? null : JSON.parse(JSON.stringify(tool.inputSchema)),
        annotations: tool.annotations ?? null,
        execute: tool.execute,
      });
      signal?.addEventListener("abort", () => {
        if (tools.delete(id)) fire("toolchange");
      }, { once: true });
      fire("toolchange");
    },
    async getTools() {
      // Chrome 158 returns tools sorted by name; the spec leaves the order open. Match Chrome.
      return [...tools.entries()]
        .sort(([, a], [, b]) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map(([id, def]) => new SimTool(id, def));
    },
    async executeTool(tool, inputObject = {}, options = {}) {
      if (!(tool instanceof SimTool)) throw new TypeError("parameter 1 is not of type 'Tool'.");
      if (inputObject === null || typeof inputObject !== "object") {
        throw new TypeError("Failed to execute 'executeTool' on 'ModelContext': parameter 2 is not of type 'object'.");
      }
      const def = tools.get(tool._id);
      if (!def) throw new DOMException("The tool is no longer registered", "InvalidStateError");
      if (options.signal?.aborted) throw options.signal.reason;
      const controller = new AbortController();
      options.signal?.addEventListener("abort", () => controller.abort(options.signal.reason), { once: true });
      const input = JSON.parse(JSON.stringify(inputObject));
      const run = (async () => def.execute(input, { signal: controller.signal }))();
      const aborted = new Promise((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
      });
      let result;
      try {
        result = await Promise.race([run, aborted]);
      } catch (err) {
        if (controller.signal.aborted) throw controller.signal.reason;
        console.warn("WebMCP tool execution failed (simulated):", err);
        throw new DOMException("Tool execution failed.", "OperationError");
      }
      return JSON.stringify(result);
    },
  };
  return api;
}

/**
 * Picks the real ModelContext when present, else the simulation, records the outcome with
 * the shared telemetry collector, and fills a status element describing which mode is live.
 */
export function connectModelContext(statusEl) {
  const real = realModelContext();
  const mc = real ?? createSimulatedModelContext();
  window.showcaseTelemetry?.support?.(
    "document.modelContext",
    real ? "supported" : (window.isSecureContext ? "flag" : "unsupported"),
    { simulated: !real },
  );
  if (statusEl) {
    statusEl.dataset.mode = real ? "live" : "simulated";
    statusEl.replaceChildren();
    const strong = document.createElement("strong");
    if (real) {
      strong.textContent = "Live: document.modelContext is available.";
      statusEl.append(
        strong,
        " Tools on this page are registered with the browser, listed with getTools() and run with executeTool().",
      );
    } else {
      strong.textContent = "Simulated: document.modelContext is not available in this browser.";
      const code = (t) => Object.assign(document.createElement("code"), { textContent: t });
      statusEl.append(
        strong,
        " The page runs the same calls against an in-page stand-in that follows the spec's validation rules. To use the real API, turn on ",
        code("chrome://flags/#enable-experimental-web-platform-features"),
        " (or launch Chrome with ",
        code("--enable-features=WebMCP"),
        ") and reload, or serve the page with a WebMCP origin trial token (Chrome 149 to 156).",
      );
    }
  }
  return mc;
}

/** "InvalidStateError: Invalid tool name" for a DOMException or Error. */
export function describeError(err) {
  if (!err) return "Unknown error";
  return `${err.name || "Error"}: ${err.message || String(err)}`;
}

/**
 * Minimal JSON Schema check for the subset the demos use (type object, properties with
 * string/number/integer/boolean/array types, required). The browser does not validate
 * input against inputSchema (verified on Chrome 158), so callers must.
 */
export function validateAgainstSchema(schema, input) {
  const errors = [];
  if (!schema || schema.type !== "object") return errors;
  for (const key of schema.required ?? []) {
    if (input[key] === undefined || input[key] === "") errors.push(`missing required "${key}"`);
  }
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const v = input[key];
    if (v === undefined || !prop?.type) continue;
    const ok = prop.type === "array"
      ? Array.isArray(v)
      : prop.type === "integer"
      ? Number.isInteger(v)
      : typeof v === prop.type;
    if (!ok) errors.push(`"${key}" should be ${prop.type}, got ${Array.isArray(v) ? "array" : typeof v}`);
    if (ok && prop.enum && !prop.enum.includes(v)) errors.push(`"${key}" must be one of ${prop.enum.join(", ")}`);
  }
  return errors;
}
