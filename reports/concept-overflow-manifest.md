# Concept-page overflow manifest

Generated: 2026-09-24T12:10:21Z

A both-classes sweep of concept pages. The feature *index* pages are covered by
`deno task responsive-check`; nothing covered the concept pages beneath them until
now — bead `chrome-platform-showcase-4va`.

## Method

- Sample: every 3rd concept page under v*/feature/concept/ (deterministic stride, not random) — 1298 of 3893 concept pages
- Classes: desktop 1280x800 DPR1 and mobile 360x740 DPR3 touch
- Browser: Chrome 152 headless (/usr/bin/google-chrome-stable) via scripts/lib/cdp.mjs
- Probe: document.documentElement.scrollWidth - innerWidth > 1; culprit = widest element whose ancestors all have overflow-x: visible (contents of scroll containers are not offenders)
- Caveat: a page can overflow while every element box fits once a scroll container is involved (v130/…/balance-vs-pretty reported a null culprit for that reason); the page-level number is authoritative, the culprit is a hint

## Coverage

- Measured: **1042 desktop** and **913 mobile** page-classes of 1298 sampled pages
- Unmeasured: 288 desktop / 412 mobile — the sweep tail hit pages that stall the renderer for minutes each (Web AI / WebGPU demos); the run was stopped rather than left for hours, so this is a ~80% sample of the stride-3 set, not a full census
- Offenders found: **8** (7 desktop, 1 mobile)

## Offenders

| page | class | overflow | culprit | status | fix commit |
|---|---|---:|---|---|---|
| `/v143/deprecate-getters-of-intl-locale-info/intl-getters/` | desktop | 4341px | TABLE.table | fixed | agent-4va-batch5 (branch head) |
| `/v143/deprecate-getters-of-intl-locale-info/intl-getters/` | mobile | 3921px | TABLE.table | fixed | agent-4va-batch5 (branch head) |
| `/v130/storage-access-headers/sah/` | desktop | 1330px | DIV.col | fixed | 67e0040a5 |
| `/v149/css-url-request-modifiers/integrity-snippet-builder/` | desktop | 449px | DIV.output-panel | fixed | agent-4va-batch5 (branch head) |
| `/v130/update-the-syntax-of-text-wrap-to-match-the-new-spec/balance-vs-pretty/` | desktop | 169px | — (inside a scroll container) | fixed | 67e0040a5 |
| `/v134/link-rel-facilitated-payment-to-support-push-payments/upi-checkout/` | desktop | 135px | DIV.summary | fixed | 67e0040a5 |
| `/v131/web-authentication-api-publickeycredential-s-getclientcapabilities-method/client-caps/` | desktop | 31px | — (inside a scroll container) | fixed | 67e0040a5 |
| `/v131/exempt-speculation-rules-header-from-csp-restrictions/csp-tester/` | desktop | 7px | DIV.panel | fixed | agent-4va-batch5 (branch head) |

## Reading this

Every offender found was fixed during the sweep, so `openOffenders` is empty. The class split
is the headline: **7 of the 8 offenders were desktop-only**, and the single mobile offender was
also the worst desktop case (4341px). A mobile-only sweep — the shape of the repo's existing
`overflow-scan` — would have seen one of these eight.

The recurring cause is worth naming because it is mechanical: a `1fr` grid track keeps an
automatic minimum, so a scroll container inside it (a `<pre>` with `overflow-x: auto`, a wide
table, a fixed canvas) stretches its column instead of scrolling. `min-width: 0` on the item
fixes it. Two offenders were different in kind and are called out in the table: a deliberately
`nowrap` sample that escaped its panel, and a 5311px table that needed the repo's scroll-wrapper
pattern.
