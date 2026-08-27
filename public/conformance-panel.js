import {
  runConformanceAssertion,
  withProbeRejectionsCaptured,
} from "/public/conformance-runner.js";

const loader = document.querySelector('script[src^="/public/conformance-panel.js"]');
const suiteUrl = loader?.dataset.suiteUrl;
const conformancePage = loader?.dataset.conformancePage;
const suiteScope = loader?.dataset.suiteScope || "feature";

function element(tag, attributes = {}, text = "") {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "class") node.className = value;
    else node.setAttribute(name, value);
  }
  if (text) node.textContent = text;
  return node;
}

function statusFor(result) {
  if (result.blocked) return "blocked";
  return result.ok ? "pass" : "fail";
}

async function renderPanel() {
  if (!suiteUrl || !conformancePage || !document.querySelector("main")) return;

  const section = element("section", {
    class: "feature-tests",
    "aria-labelledby": "feature-tests-title",
  });
  const heading = element("h2", { id: "feature-tests-title" }, "What this browser supports");
  const intro = element(
    "p",
    {},
    `These ${suiteScope}-level checks run in your browser. A pass proves only the listed contract; blocked means the check needs unavailable hardware, permission, user mediation, or another prerequisite.`,
  );
  const summary = element("p", {
    class: "feature-tests-summary",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
  }, "Loading feature checks…");
  const list = element("ol", { class: "feature-tests-list" });
  const fullLink = element("a", { href: conformancePage }, "Open the full conformance page");

  section.append(heading, intro, summary, list, fullLink);
  const footer = document.querySelector("main > footer");
  if (footer) footer.before(section);
  else document.querySelector("main").append(section);

  try {
    const response = await fetch(suiteUrl, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`suite request returned ${response.status}`);
    const suite = await response.json();
    let pass = 0;
    let fail = 0;
    let blocked = 0;

    for (const assertion of suite.assertions || []) {
      // The probe's own rejections are captured here so they do not surface as
      // page errors; `captured` is reported below rather than discarded.
      const { value: result, captured } = await withProbeRejectionsCaptured(() =>
        runConformanceAssertion(
          assertion.kind,
          assertion.test,
          assertion.expect,
        )
      );
      const status = statusFor(result);
      if (status === "pass") pass++;
      else if (status === "fail") fail++;
      else blocked++;

      const item = element("li", { class: `feature-test feature-test-${status}` });
      const titleRow = element("div", { class: "feature-test-title" });
      titleRow.append(
        element("span", { class: `feature-test-verdict feature-test-verdict-${status}` }, status),
        element("code", {}, assertion.id),
      );
      const description = element("p", {}, assertion.description);
      item.append(titleRow, description);
      if (result.detail) item.append(element("p", { class: "feature-test-detail" }, result.detail));
      if (captured.length) {
        item.append(element(
          "p",
          { class: "feature-test-detail" },
          `probe rejected: ${captured.map((reason) => reason?.name || String(reason)).join(", ")}`,
        ));
      }
      if (assertion.specSection) {
        item.append(element("a", {
          class: "feature-test-spec",
          href: assertion.specSection,
          target: "_blank",
          rel: "noopener",
        }, "Source/specification ↗"));
      }
      list.append(item);
    }

    summary.textContent = `${pass} pass · ${fail} fail · ${blocked} blocked · ${
      pass + fail + blocked
    } total`;
    summary.dataset.complete = "true";
  } catch (error) {
    summary.textContent = `Feature checks unavailable: ${error?.message || error}`;
    summary.dataset.complete = "error";
  }
}

renderPanel();
