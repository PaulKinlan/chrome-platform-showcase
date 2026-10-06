# Interactive Demo Verification Report

- **Last Updated:** 2026-10-06T20:51:34.721Z
- **Catalogue Coverage:** 7 / 3944 concepts indexed (0.2%)
- **Overall Status:** 1 passed, 0 not demonstrated, 0 unverified (recovered artifacts), 6 failed
- **Latest Run:** 7 tested (1 passed, 0 not demonstrated, 6 failed)

Only **PASS** means the demo was driven and observably responded. **NO-CONTROLS**, **NOT-DRIVEABLE**, **NO-EFFECT** and **NOT-ASSERTED** mean this run is not evidence that the demo works — they are neither failures nor passes. **UNVERIFIED** rows were recovered from screenshot artifacts and were never driven.

**NO-VISUAL-DELTA** is a caveat on a row, not a status: the before/after screenshots hash the same, so the pair is not proof of the interaction. It can mean the paint had not landed, or that the interaction legitimately returned the page to its starting state (for example a click that toggles a state and a second that toggles it back). The two are indistinguishable from the images, so neither is claimed.

## Indexed Demos

| Demo URL | Controls Found / Tested | Mutations | Status | Screenshot Proof |
| :--- | :---: | :---: | :---: | :--- |
| `/v137/blob-url-partitioning-fetching-navigation/partition-inspector/` | 3 / 3 | 4 | **FAIL** | [Initial](v137--blob-url-partitioning-fetching-navigation--partition-inspector/01-initial.png) · NO-VISUAL-DELTA (pair byte-identical) |
| `/v139/corner-shaping-corner-shape-superellipse-squircle/superellipse-comparator/` | 2 / 2 | 0 | **FAIL** | [Initial](v139--corner-shaping-corner-shape-superellipse-squircle--superellipse-comparator/01-initial.png) · [Interactive](v139--corner-shaping-corner-shape-superellipse-squircle--superellipse-comparator/02-interactive.png) |
| `/v139/css-custom-functions/functional-design-tokens/` | 4 / 3 | 0 | **FAIL** | [Initial](v139--css-custom-functions--functional-design-tokens/01-initial.png) · [Interactive](v139--css-custom-functions--functional-design-tokens/02-interactive.png) |
| `/v139/fire-error-event-instead-of-throwing-for-csp-blocked-worker/catch-vs-onerror/` | 3 / 3 | 0 | **FAIL** | [Initial](v139--fire-error-event-instead-of-throwing-for-csp-blocked-worker--catch-vs-onerror/01-initial.png) · [Interactive](v139--fire-error-event-instead-of-throwing-for-csp-blocked-worker--catch-vs-onerror/02-interactive.png) |
| `/v139/softnavigation-performance-entry/observer-playground/` | 5 / 4 | 0 | **FAIL** | [Initial](v139--softnavigation-performance-entry--observer-playground/01-initial.png) · NO-VISUAL-DELTA (pair byte-identical) |
| `/v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/` | 2 / 2 | 0 | **FAIL** | [Initial](v139--webxr-depth-sensing-performance-improvements--raw-vs-smooth-router/01-initial.png) · [Interactive](v139--webxr-depth-sensing-performance-improvements--raw-vs-smooth-router/02-interactive.png) |
| `/v143/upsert/upsert-counter-pattern/` | 4 / 3 | 21 | **PASS** | [Initial](v143--upsert--upsert-counter-pattern/01-initial.png) · [Interactive](v143--upsert--upsert-counter-pattern/02-interactive.png) |

## Failures

### `/v137/blob-url-partitioning-fetching-navigation/partition-inspector/`
- **Console Error:** `SyntaxError: Unexpected token '&'`
### `/v139/corner-shaping-corner-shape-superellipse-squircle/superellipse-comparator/`
- **Console Error:** `SyntaxError: Unexpected token ')'`
### `/v139/css-custom-functions/functional-design-tokens/`
- **Console Error:** `SyntaxError: Unexpected token ')'`
### `/v139/fire-error-event-instead-of-throwing-for-csp-blocked-worker/catch-vs-onerror/`
- **Console Error:** `SyntaxError: Unexpected token ')'`
### `/v139/softnavigation-performance-entry/observer-playground/`
- **Console Error:** `SyntaxError: Unexpected token ')'`
### `/v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/`
- **Console Error:** `SyntaxError: Unexpected token ')'`
