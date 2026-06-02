export function supportsMultiSelectedContentClone() {
  if (typeof HTMLSelectedContentElement === "undefined") return false;

  const select = document.createElement("select");
  select.style.appearance = "base-select";
  select.innerHTML = `
    <button>
      <span><selectedcontent></selectedcontent></span>
      <span><selectedcontent></selectedcontent></span>
      <span><selectedcontent></selectedcontent></span>
    </button>
    <option value="probe"><span>Probe label</span></option>
  `;
  document.body.appendChild(select);

  const mirrors = [...select.querySelectorAll("selectedcontent")];
  const supported = mirrors.length === 3 &&
    mirrors.every((mirror) => mirror instanceof HTMLSelectedContentElement) &&
    mirrors.every((mirror) => mirror.textContent.includes("Probe label"));

  select.remove();
  return supported;
}

export function cloneSelectedOptionIntoMirrors(select) {
  const option = select.selectedOptions[0];
  if (!option) return;

  const sourceNodes = option.childNodes.length
    ? [...option.childNodes]
    : [
      document.createTextNode(option.label || option.textContent || option.value),
    ];

  select.querySelectorAll("selectedcontent").forEach((mirror) => {
    mirror.replaceChildren(...sourceNodes.map((node) => node.cloneNode(true)));
  });
}

export function syncSelectedContentMirrors(select, nativeMultiClone) {
  if (!nativeMultiClone) cloneSelectedOptionIntoMirrors(select);
}

export function setSupportNote(note, nativeMultiClone, mirrorCount) {
  if (!note) return;

  note.textContent = nativeMultiClone
    ? `Native Chrome 150 behavior detected: all ${mirrorCount} selectedcontent descendants receive the selected option clone.`
    : `Native multi-clone behavior is not active in this browser. This page keeps ${mirrorCount} real selectedcontent descendants inside the select and fills them with a small fallback clone shim.`;
  note.dataset.mode = nativeMultiClone ? "native" : "fallback";
}

export function selectedContentTexts(select) {
  return [...select.querySelectorAll("selectedcontent")].map((mirror) =>
    mirror.textContent.trim() || "(empty)"
  );
}
