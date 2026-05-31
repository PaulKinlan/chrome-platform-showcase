# Chrome Platform Showcase Demo Opportunity Report

Generated from the local feature folders. This is a planning artifact: it does not change demos
directly.

## Coverage

- Features reviewed: 722
- Existing concept pages inventoried: 2509
- Additional demo/tool ideas: 2166

## Highest-Leverage Themes

- Convert reference/table pages into live labs: probes, configurators, validators, stress tests, and
  before/after comparisons.
- Add server-backed routes for HTTP/header/cache/network features so browser behavior is observable.
- Make failure states first-class: unsupported browser, flag off, permission denied, policy blocked,
  cross-origin blocked, malformed input, and recovery.
- Prefer copyable production recipes: after each interaction, generate the minimal
  code/config/header that developers should ship.
- Build domain stories, not isolated API toys: checkout, meeting room, offline app, PWA install,
  dashboard, editor, reader, IdP, local-device setup, and enterprise migration flows.

## Area Counts

- Network, loading, cache, and performance: 162
- CSS layout and rendering: 108
- JavaScript, DOM, and HTML platform: 96
- Identity, payments, privacy, and ads: 81
- Graphics, GPU, XR, and canvas: 64
- Media, capture, and realtime: 61
- General web platform: 57
- PWA, install, files, and windows: 36
- Built-in AI: 23
- Storage, databases, and offline data: 20
- Internationalization and text semantics: 10
- Deprecation and migration: 4

## Priority Counts

- Medium: 412
- High: 310

## Suggested First Action Queue

- `v151/web-speech-api-unspoken-punctuation/` (Built-in AI): Local-first workflow: build a concrete
  app flow around Web Speech API: Unspoken Punctuation such as redaction, triage, summarization,
  translation, or form assistance with offline/privacy status shown.
- `v151/permissions-policy-focus-without-user-activation/` (General web platform): Capability probe
  and fallback explorer for Permissions Policy: focus-without-user-activation, using feature
  detection, fallback path.
- `v151/incognitostaticstoragequota/` (Identity, payments, privacy, and ads): Flow simulator: model
  user gesture, permission, iframe/origin, and policy state transitions for
  IncognitoStaticStorageQuota, with every allowed/blocked branch visible.
- `v151/webaudio-configurable-render-quantum/` (Media, capture, and realtime): Device/session probe:
  read navigator.mediaDevices, track settings/capabilities, request permissions, and show live
  track/session state transitions for WebAudio: Configurable render quantum.
- `v151/cpu-performance-api/` (Network, loading, cache, and performance): Real echo route: add a
  Deno endpoint that returns request headers/status/timing so CPU Performance API can be observed
  instead of described.
- `v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/` (Network,
  loading, cache, and performance): Real echo route: add a Deno endpoint that returns request
  headers/status/timing so Permission Policy Merger: direct-sockets-private with local-network and
  loopback-network can be observed instead of described.
- `v151/renewed-html-insertion-streaming-methods/` (Network, loading, cache, and performance): Real
  echo route: add a Deno endpoint that returns request headers/status/timing so Renewed HTML
  insertion&streaming methods can be observed instead of described.
- `v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields/` (Network, loading,
  cache, and performance): Real echo route: add a Deno endpoint that returns request
  headers/status/timing so Resource Timing: Service Worker Router timing fields can be observed
  instead of described.
- `v151/chrome-will-remove-support-for-macos-12/` (PWA, install, files, and windows):
  Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show exactly
  why Chrome Will Remove Support for macOS 12 is or is not active.
- `v150/on-device-web-speech-api/` (Built-in AI): Local-first workflow: build a concrete app flow
  around On-device Web Speech API such as redaction, triage, summarization, translation, or form
  assistance with offline/privacy status shown.
- `v150/web-speech-api-on-device-recognition-quality/` (Built-in AI): Local-first workflow: build a
  concrete app flow around Web Speech API: On-Device Recognition Quality such as redaction, triage,
  summarization, translation, or form assistance with offline/privacy status shown.
- `v150/web-speech-api-unspoken-punctuation/` (Built-in AI): Local-first workflow: build a concrete
  app flow around Web Speech API: Unspoken Punctuation such as redaction, triage, summarization,
  translation, or form assistance with offline/privacy status shown.
- `v150/deprecate-and-remove-related-website-sets-rws/` (Identity, payments, privacy, and ads): Flow
  simulator: model user gesture, permission, iframe/origin, and policy state transitions for
  Deprecate and Remove: Related Website Sets (RWS), with every allowed/blocked branch visible.
- `v150/deprecate-and-remove-document-requeststorageaccessfor/` (Identity, payments, privacy, and
  ads): Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions
  for Deprecate and Remove: document.requestStorageAccessFor, with every allowed/blocked branch
  visible.
- `v150/deprecate-and-remove-attribution-reporting-api/` (Identity, payments, privacy, and ads):
  Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
  Deprecate and remove: Attribution Reporting API, with every allowed/blocked branch visible.
- `v150/capability-elements-usermedia-mvp/` (Media, capture, and realtime): Device/session probe:
  read navigator.mediaDevices, track settings/capabilities, request permissions, and show live
  track/session state transitions for Capability Elements: <usermedia> MVP.
- `v150/css-url-request-modifiers/` (Network, loading, cache, and performance): Real echo route: add
  a Deno endpoint that returns request headers/status/timing so CSS URL request modifiers can be
  observed instead of described.
- `v150/out-of-order-streaming/` (Network, loading, cache, and performance): Real echo route: add a
  Deno endpoint that returns request headers/status/timing so Out-of-order streaming can be observed
  instead of described.
- `v150/remove-legacynointerfaceobject-from-fontfaceset-idl/` (Network, loading, cache, and
  performance): Real echo route: add a Deno endpoint that returns request headers/status/timing so
  Remove [LegacyNoInterfaceObject] from FontFaceSet IDL can be observed instead of described.
- `v150/opaque-origin-for-data-urls/` (Storage, databases, and offline data): Quota/data lifecycle
  dashboard: write/read/delete test records and show quota, persistence, eviction, and private-mode
  differences for Opaque origin for data: URL Dedicated and Shared Workers.
- `v149/remove-explicit-border-color-ua-stylesheet-rule-for-tables/` (CSS layout and rendering):
  Authoring studio: sliders/toggles that generate production CSS for Remove explicit border color UA
  stylesheet rule for tables, with live before/after rendering and copyable rules.
- `v149/allow-payment-handlers-to-report-back-internal-errors/` (Identity, payments, privacy, and
  ads): Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions
  for Allow payment handlers to report back internal errors, with every allowed/blocked branch
  visible.
- `v149/payment-request-allow-payment-handlers-to-report-back-internal-errors/` (Identity, payments,
  privacy, and ads): Flow simulator: model user gesture, permission, iframe/origin, and policy state
  transitions for Allow payment handlers to report back internal errors, with every allowed/blocked
  branch visible.
- `v149/permissions-policy-focus-without-user-activation/` (JavaScript, DOM, and HTML platform):
  Interactive API console: let developers mutate inputs and inspect return values, events,
  exceptions, and DOM changes for Permissions Policy: focus-without-user-activation.
- `v149/capability-elements-usermedia-mvp/` (Media, capture, and realtime): Device/session probe:
  read navigator.mediaDevices, track settings/capabilities, request permissions, and show live
  track/session state transitions for Capability Elements <usermedia>.
- `v149/css-url-request-modifiers/` (Network, loading, cache, and performance): Real echo route: add
  a Deno endpoint that returns request headers/status/timing so CSS URL request modifiers can be
  observed instead of described.
- `v149/disconnect-websockets-on-bfcache-entry/` (Network, loading, cache, and performance): Real
  echo route: add a Deno endpoint that returns request headers/status/timing so Disconnect
  WebSockets on BFCache entry can be observed instead of described.
- `v149/indexeddb-sqlite-backend/` (Network, loading, cache, and performance): Real echo route: add
  a Deno endpoint that returns request headers/status/timing so IndexedDB: SQLite backend can be
  observed instead of described.
- `v149/inline-script-cache/` (Network, loading, cache, and performance): Real echo route: add a
  Deno endpoint that returns request headers/status/timing so Inline script cache can be observed
  instead of described.
- `v149/request-isreloadnavigation-attribute/` (Network, loading, cache, and performance): Real echo
  route: add a Deno endpoint that returns request headers/status/timing so
  Request.isReloadNavigation can be observed instead of described.
- `v149/selective-clipboard-format-read/` (Network, loading, cache, and performance): Real echo
  route: add a Deno endpoint that returns request headers/status/timing so Selective Clipboard
  Format Read can be observed instead of described.
- `v149/service-worker-router-timing-fields/` (Network, loading, cache, and performance): Real echo
  route: add a Deno endpoint that returns request headers/status/timing so Service Worker Router
  Timing Fields can be observed instead of described.
- `v148/language-detector-api/` (Built-in AI): Local-first workflow: build a concrete app flow
  around Language Detector API such as redaction, triage, summarization, translation, or form
  assistance with offline/privacy status shown.
- `v148/prompt-api/` (Built-in AI): Local-first workflow: build a concrete app flow around Prompt
  API such as redaction, triage, summarization, translation, or form assistance with offline/privacy
  status shown.
- `v148/prompt-api-sampling-parameters/` (Built-in AI): Local-first workflow: build a concrete app
  flow around Prompt API Sampling Parameters such as redaction, triage, summarization, translation,
  or form assistance with offline/privacy status shown.
- `v148/summarizer-api-performance-preference/` (Built-in AI): Local-first workflow: build a
  concrete app flow around Summarizer API performance preference such as redaction, triage,
  summarization, translation, or form assistance with offline/privacy status shown.
- `v148/translator-api/` (Built-in AI): Local-first workflow: build a concrete app flow around
  Translator API such as redaction, triage, summarization, translation, or form assistance with
  offline/privacy status shown.
- `v148/remove-explicit-border-color-ua-stylesheet-rule-for-tables/` (CSS layout and rendering):
  Authoring studio: sliders/toggles that generate production CSS for Remove explicit border-color UA
  stylesheet rule for tables, with live before/after rendering and copyable rules.
- `v148/agentic-federated-login/` (Identity, payments, privacy, and ads): Flow simulator: model user
  gesture, permission, iframe/origin, and policy state transitions for Agentic Federated Login, with
  every allowed/blocked branch visible.
- `v148/get-secure-payment-confirmation-capabilities/` (Identity, payments, privacy, and ads): Flow
  simulator: model user gesture, permission, iframe/origin, and policy state transitions for Get
  Secure Payment Confirmation capabilities, with every allowed/blocked branch visible.

## Per-Feature Suggestions

### v130

#### allow more pseudo-elements and pseudo-classes after ::part()

- Path: `v130/allow-more-pseudo-elements-and-pseudo-classes-after-part/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: CSS selectors that use the ::part() pseudo-element are allowed to have other CSS
  pseudo-elements (except ::part()) and many types of other CSS pseudo-classes after them.
  (Combinators are still not allowed after :part(), and pseudo-classes that depend on tree structure
  are not allowed.) Previously Chrome only allowed a limited set of pseudo-classes and ps
- Existing concepts: foundation for part-like pseudos, Pseudos after ::part(), Part State Machine,
  Theme swap (skinning marketplace)
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for allow more pseudo-elements
    and pseudo-classes after ::part(), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where allow more pseudo-elements and pseudo-classes after
    ::part() helps or fails.

#### Attribution Reporting API Feature (Attribution Scopes)

- Path: `v130/attribution-reporting-api-feature-attribution-scopes/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: We are landing the following changes to the Attribution Reporting API focused
  on: * providing more control over the attribution filtering
- Existing concepts: Attribution Scopes simulator, cross-campaign confusion — and how scopes fix it,
  Registration header builder, Scope Budget Visualizer
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Attribution Reporting API Feature (Attribution Scopes), with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Attribution Reporting API Feature (Debug Key Privacy Improvement)

- Path: `v130/attribution-reporting-api-feature-debug-key-privacy-improvement/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: We are landing the following changes to the Attribution Reporting API focused
  on: * Improving privacy for debug keys This change helps to mitigate a potential privacy gap with
  debug keys. Currently the API allows a source debug key or a trigger debug key to be specified if
  third party cookies are available and can be set by API callers. If either a so
- Existing concepts: Debug Key Privacy simulator, debug key leakage matrix, Migration checklist,
  Report Diff Viewer
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Attribution Reporting API Feature (Debug Key Privacy Improvement), with every allowed/blocked
    branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Coalesced/predicted events in untrusted PointerEvents will retain original targets

- Path: `v130/coalesced-predicted-events-in-untrusted-pointerevents-will-retain-original-targe/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: For untrusted (i.e. JS constructed) PointerEvents, the events returned by
  PointerEvent.getCoalescedEvents() and PointerEvent.getPredictedEvents() will maintain their
  original targets and offsetX/Y coordinates, instead of behaving like trusted events where these
  fields are affected by the parent (container) event.
- Existing concepts: Event Replay Inspector, Synthetic PointerEvent targets, predicted events
  forecast, Replay harness
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Coalesced/predicted events in untrusted PointerEvents will
    retain original targets.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Coalesced/predicted events in untrusted
    PointerEvents will retain original targets behaves inside custom elements, shadow DOM, SPA
    routing, hydration, and accessibility trees.

#### Compression dictionary transport with Shared Brotli and Shared Zstandard

- Path: `v130/compression-dictionary-transport-with-shared-brotli-and-shared-zstandard/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature adds support for using designated previous responses, as an external
  dictionary for content encoding compressing responses with Brotli or Zstandard.
- Existing concepts: Shared CDT simulator, Handshake protocol walkthrough, Use-as-Dictionary header
  builder, library version evolution
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Compression
    dictionary transport with Shared Brotli and Shared Zstandard can be observed instead of
    described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Compression dictionary transport with Shared Brotli and Shared
    Zstandard.

#### Concurrent Smooth scrollIntoViews

- Path: `v130/concurrent-smooth-scrollintoviews/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature allows scrollIntoView with behavior: "smooth" to run concurrently on
  scroll containers which are neither descendants nor ancestors of one another.
- Existing concepts: Ancestor rule probe, Concurrent smooth scroll, Scroll Timeline, TOC sidebar
  sync
- Suggested additions:
  - Capability probe and fallback explorer for Concurrent Smooth scrollIntoViews, using
    CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### CSS Container Queries flat tree lookup

- Path: `v130/css-container-queries-flat-tree-lookup/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Look up query containers in the flat tree ancestor order instead of
  shadow-including order. The specification for container queries changed to look up flat tree
  ancestors. This change is only relevant for shadow DOM where an element will now be able to see
  non-named containers inside shadow trees into which the element or one of its ancestors are
  slotted,
- Existing concepts: Flat-tree container lookup, CQ Flat-Tree Inspector, shadow tree vs flat tree
  ancestry, Slotted-component responsiveness
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS Container Queries flat tree lookup.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS Container Queries flat tree lookup behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS Nesting: Stable Bare Declarations (CSSNestingDeclarations)

- Path: `v130/css-nesting-stable-bare-declarations-cssnestingdeclarations/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Keeps bare declarations following a nested rule in their place, by wrapping those
  declarations in CSSNestingDeclarations rules during parsing.
- Existing concepts: CSSOM mutate bare-declaration blocks, DevTools equivalence inspector, Bare
  declarations after nested rules, Specificity Explorer
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Nesting: Stable Bare
    Declarations (CSSNestingDeclarations), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Nesting: Stable Bare Declarations
    (CSSNestingDeclarations) helps or fails.

#### CSS Nesting: The Nested Declarations Rule

- Path: `v130/css-nesting-the-nested-declarations-rule/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Keeps bare declarations following a nested rule in their place, by wrapping those
  declarations in CSSNestedDeclarations rules during parsing.
- Existing concepts: Cascade debugger, Live Nesting Editor, CSSNestedDeclarations rule inspector,
  source-order showdown
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Nesting: The Nested
    Declarations Rule, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Nesting: The Nested Declarations Rule helps or
    fails.

#### Document picture-in-picture: add option to ignore window bounds cache

- Path: `v130/document-picture-in-picture-add-option-to-ignore-window-bounds-cache/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This adds a new parameter ("preferInitialWindowPlacement") to the document
  picture-in-picture API that, when set to true, hints to the user agent that it should not try to
  reuse the position or size of the previous document picture-in-picture from this site when opening
  this one.
- Existing concepts: meeting → chat context switch, preferInitialWindowPlacement decision tree,
  DocPiP bounds cache, PiP Placement Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Document
    picture-in-picture: add option to ignore window bounds cache can be observed instead of
    described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Document picture-in-picture: add option to ignore window bounds cache.

#### Full and unprefixed box-decoration-break support

- Path: `v130/full-and-unprefixed-box-decoration-break-support/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Support box-decoration-break:clone both for inline fragmentation (line layout)
  and block fragmentation (pagination for printing, multicol).
- Existing concepts: Border-radius on inline spans, box-decoration-break: clone vs slice, Inline
  fragment gallery, paginated print preview
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Full and unprefixed
    box-decoration-break support, with live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Full and unprefixed box-decoration-break support
    helps or fails.

#### Improved error reporting in IndexedDB for large value read failures

- Path: `v130/improved-error-reporting-in-indexeddb-for-large-value-read-failures/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Change to reporting for certain error cases that were previously reported through
  a DOMException with the message "Failed to read large IndexedDB value".
- Existing concepts: Blob Size Ladder, Error classifier & recovery planner, IndexedDB large-value
  error inspector, recovery strategy
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Improved error reporting in IndexedDB for large value
    read failures.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Improved error reporting
    in IndexedDB for large value read failures in a realistic user workflow.

#### Language Detector API

- Path: `v130/language-detector-api/`
- Area: Built-in AI
- Priority: High
- Current framing: A JavaScript API for detecting the language of text, with confidence levels.
- Existing concepts: Confidence budget, detect → translate pipeline, Language Detector,
  Multi-Language Sampler
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Language Detector API such as redaction,
    triage, summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### meter element fallback styles

- Path: `v130/meter-element-fallback-styles/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: With this change <meter> elements with `appearance: none` will have a reasonable
  fallback style that matches Safari and Firefox instead of just disappearing from the page. As well
  developers will be able to custom style the <meter> elements.
- Existing concepts: branded meter themes, Dashboard Meters, Forced-colors audit, <meter> with
  author styles
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for meter element fallback
    styles, with live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where meter element fallback styles helps or fails.

#### Protected Audience Bidding & Auction Services

- Path: `v130/protected-audience-bidding-auction-services/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The Protected Audience API (formerly known as FLEDGE) is a Privacy Sandbox
  proposal to serve remarketing and custom audience use cases, designed so third parties cannot
  track user browsing behavior across sites. This feature, Protected Audience Bidding & Auction
  Services, outlines a way to allow Protected Audience computation to take place on cloud servers i
- Existing concepts: Auction tracer, Bid Simulator, device vs server auction latency, B&A auction
  simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Protected Audience Bidding & Auction Services, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### relaunch Intl Locale Info feature in newly added functions

- Path: `v130/relaunch-intl-locale-info-feature-in-newly-added-functions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Intl Locale Info API is a new Stage ECMAScript TC39 proposal to enhance the
  Intl.Locale object by exposing Locale information, such as week data (first day in a week, weekend
  start day, weekend end day, minimun day in the first week), and text direction hour cycle used in
  the locale. https://github.com/tc39/proposal-intl-locale-info We launch Intl Locale
- Existing concepts: Intl.Locale info methods, locale-aware calendar grid, Locale matrix, Week
  Format Playground
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so relaunch Intl
    Locale Info feature in newly added functions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for relaunch Intl Locale Info feature in newly added functions.

#### Remove expectedImprovement in DelegatedInkTrailPresenter

- Path: `v130/remove-expectedimprovement-in-delegatedinktrailpresenter/`
- Area: Deprecation and migration
- Priority: High
- Current framing: The attribute tells web developers how much improvement the DelegatedInkTrails
  API will provide to their current ink latency. However, this attribute is not worth increases to
  fingerprinting entropy.
- Existing concepts: delegated vs undelegated trails, Ink Latency Probe, Ink-trail clinic,
  expectedImprovement: gone, here's the replacement
- Suggested additions:
  - Deprecation scanner: paste code/config and detect usage of Remove expectedImprovement in
    DelegatedInkTrailPresenter, with severity, timeline, and affected browser versions.
  - Replacement playground: run the old pattern beside the recommended API or server behavior and
    show the user-visible difference.
  - Fleet readiness dashboard: checklist for enterprise/app teams, including telemetry, rollout
    gates, and rollback plans.

#### Storage Access Headers

- Path: `v130/storage-access-headers/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Offers an alternate way for authenticated embeds to opt in for unpartitioned
  cookies. These headers indicate whether unpartitioned cookies are (or can be) included in a given
  network request, and allow servers to activate 'storage-access' permissions they have already been
  granted. Giving an alternative way to activate the 'storage-access' permission allows
- Existing concepts: Header Round-trip Simulator, no-iframe flow, Server-side policy matrix, Storage
  Access Headers simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Storage Access Headers, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Support non-special scheme URLs

- Path: `v130/support-non-special-scheme-urls/`
- Area: General web platform
- Priority: Medium
- Current framing: Support non-special scheme URLs correctly.
- Existing concepts: custom protocol router, Non-special scheme URL parser, Parser diff (non-special
  URL fuzzer), Scheme Explorer
- Suggested additions:
  - Capability probe and fallback explorer for Support non-special scheme URLs, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Transferable RTCDataChannel to dedicated workers

- Path: `v130/transferable-rtcdatachannel-to-dedicated-workers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The RTCDataChannel interface is part of the WebRTC standard, and represents a
  network channel which can be used for bidirectional peer-to-peer transfers of arbitrary data.
- Existing concepts: Main-thread benchmark, Transfer RTCDataChannel to a worker, main thread vs
  worker fan-out, Worker Protocol Decoder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Transferable
    RTCDataChannel to dedicated workers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Transferable RTCDataChannel to dedicated workers.

#### Update the syntax of `text-wrap` to match the new spec

- Path: `v130/update-the-syntax-of-text-wrap-to-match-the-new-spec/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Updates the CSS syntax for the CSS white-space and text-wrap properties to match
  the spec and other browsers.
- Existing concepts: balance vs pretty, Recipe gallery — six places text-wrap shines, shorthand
  decomposition, text-wrap: shorthand + longhands
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Update the syntax of
    `text-wrap` to match the new spec, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Update the syntax of `text-wrap` to match the new
    spec helps or fails.

#### Web Serial: connected attribute and RFCOMM connection events

- Path: `v130/web-serial-connected-attribute-and-rfcomm-connection-events/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature adds a boolean SerialPort.connected attribute. The attribute is true
  if the serial port is logically connected. For wired serial ports, a port is logically connected
  if the port is physically attached to the system. For wireless serial ports, a port is logically
  connected if the device hosting the port has any open connections to the host. Pr
- Existing concepts: reconnect policy decision tree, RFCOMM Device Explorer, SerialPort.connected
  probe, Connection state-machine debugger
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Web Serial: connected attribute and RFCOMM connection
    events.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### WebAssembly JS String Builtins

- Path: `v130/webassembly-js-string-builtins/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature exposes common JS string operations for easy import into WebAssembly
  and optimizations thereof. This allows creating and manipulating JS strings from WebAssembly
  without native support within WebAssembly while still allowing for a similar performance as native
  string references. The mechanism works by exposing suitably strict versions of JS str
- Existing concepts: Import binding playground, string builtins performance benchmark, String Ops
  Bench, Wasm JS String Builtins benchmark
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebAssembly
    JS String Builtins can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebAssembly JS String Builtins.

#### WebAuthn signal API

- Path: `v130/webauthn-signal-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Allow WebAuthn relying parties to report information about existing credentials
  back to credential storage providers, so that incorrect or revoked credentials can be updated or
  removed from provider and system UI.
  https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Signal-API-explainer
- Existing concepts: Credential Audit, Lifecycle orchestrator, signalUnknownCredential — stale
  passkey cleanup, WebAuthn Signal API simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    WebAuthn signal API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### WebGPU: Dual source blending

- Path: `v130/webgpu-dual-source-blending/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
- Existing concepts: Alpha Masking, Blend equation studio, WebGPU dual-source blending, subpixel
  text shader
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Dual source blending, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRTC encoded transform - Modify Metadata functions

- Path: `v130/webrtc-encoded-transform-modify-metadata-functions/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Allow WebRTC Encoded Transform API to manipulate audio and video frame metadata.
- Existing concepts: Frame Metadata Editor, Jitter lab, Encoded frame metadata editor,
  timestamp-shifted forwarding
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for WebRTC encoded transform - Modify
    Metadata functions.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

### v131

#### Attribution-Reporting API: Remove aggregation key identifier size limit for trigger registrations

- Path: `v131/attribution-reporting-api-remove-aggregation-key-identifier-size-limit-for-trigg/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Currently the aggregation key identifier length limit
  (https://wicg.github.io/attribution-reporting-api/#max-length-per-aggregation-key-identifier) is
  checked in both source and trigger registrations. As this limit is not for privacy and it's not
  persisted in the storage, we are removing this limit in trigger registrations. This is consistent
  with other f
- Existing concepts: Remove aggregation key identifier size limit, Source vs Trigger response
  headers — what changed, build a trigger payload with arbitrary-length keys, Source vs trigger: the
  cap is asymmetric
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Attribution-Reporting API: Remove aggregation key identifier size limit for trigger
    registrations, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Capture all screens

- Path: `v131/capture-all-screens/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Capture all the screens currently connected to the device using
  getAllScreensMedia().
- Existing concepts: getAllScreensMedia(), multi-monitor mosaic dashboard, policy + capability
  probe, One MediaStreamTrack per screen
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Capture all screens.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CSS Anchor Positioning: allow anchor-size() in inset and margin Properties

- Path: `v131/css-anchor-positioning-allow-anchor-size-in-inset-and-margin-properties/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allow anchor-size() values for inset and margin properties. Originally,
  anchor-size() was only allowed in sizing properties. The specification was changed to allow
  anchor-size() in insets and margins as well.
- Existing concepts: anchor-size() in inset and margin, anchor-size() for proportional connectors,
  responsive tooltip offset scaled to the anchor, safe-area margin sized to the anchor
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Anchor Positioning: allow
    anchor-size() in inset and margin Properties, with live before/after rendering and copyable
    rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Anchor Positioning: allow anchor-size() in inset
    and margin Properties helps or fails.

#### CSS Anchor Positioning: anchor-scope

- Path: `v131/css-anchor-positioning-anchor-scope/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The anchor-scope property allows limiting the visibility of anchor names to a
  given subtree.
- Existing concepts: anchor-scope keywords: all vs none vs name, anchor-scope confines anchor names,
  list-collision: per-row badge anchors, Component encapsulation with anchor-scope
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Anchor Positioning:
    anchor-scope, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Anchor Positioning: anchor-scope helps or fails.

#### CSS font-variant-emoji

- Path: `v131/css-font-variant-emoji/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Font-variant-emoji CSS property provides users an easy way to control between
  colored (emoji-style) and monochromatic (text-style) emoji glyphs presentations. This can be also
  done by adding an emoji Variation Selector, specifically U+FE0E for text and U+FE0F for emojis,
  after each emoji codepoint. Using font-variant-emoji CSS property allows web developers
- Existing concepts: chat bubble: force colour-emoji presentation, Dual-presentation characters
  under four values, font-variant-emoji, symbol-font and UI-glyph use cases
- Suggested additions:
  - Locale/script matrix: compare CSS font-variant-emoji across languages, scripts, writing modes,
    emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Deprecate getters of Intl Locale Info

- Path: `v131/deprecate-getters-of-intl-locale-info/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Intl Locale Info API is a Stage 3 ECMAScript TC39 proposal to enhance the
  Intl.Locale object by exposing Locale information, such as week data (first day in a week, weekend
  start day, weekend end day, minimun day in the first week), and text direction hour cycle used in
  the locale. https://github.com/tc39/proposal-intl-locale-info We ship our implementat
- Existing concepts: Codemod the deprecated getters, Intl.Locale getters become methods, lint your
  codebase: find every deprecated getter, Intl.Locale method explorer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate
    getters of Intl Locale Info can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate getters of Intl Locale Info.

#### Deprecation of CSS Anchor Positioning property `inset-area`

- Path: `v131/deprecation-of-css-anchor-positioning-property-inset-area/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The CSSWG resolved to rename the `inset-area` property to `position-area`. See
  the CSSWG discussion here:
  https://github.com/w3c/csswg-drafts/issues/10209#issuecomment-2221005001. The new property name,
  `position-area`, as a synonym for `inset-area` shipped via
  https://chromestatus.com/feature/6567965055778816. This entry is for deprecation and removal of th
- Existing concepts: codemod: inset-area → position-area, inset-area renamed to position-area,
  inset-area vs position-area, side by side, migration window: both names work for now
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecation
    of CSS Anchor Positioning property `inset-area` can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecation of CSS Anchor Positioning property `inset-area`.

#### Dialog Toggle Events

- Path: `v131/dialog-toggle-events/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: It is useful for web authors do determine when their <dialog> elements open and
  close. popover already has `ToggleEvent` which is dispatched when a popover opens or closes, but
  <dialog> does not. The current way to detect when a <dialog> opens is to register a mutation
  observer to check for open, however, this is quite a lot of work where an event would be e
- Existing concepts: animation hook: beforetoggle + @starting-style, cancel a close with a
  dirty-form guard, <dialog> fires ToggleEvent, Tracking a nested dialog stack
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Dialog Toggle Events.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Dialog Toggle Events behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Direct Sockets API

- Path: `v131/direct-sockets-api/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Allows Isolated Web Apps to establish direct transmission control protocol (TCP)
  and user datagram protocol (UDP) communications with network devices and systems as well as listen
  to and accept incoming connections.
- Existing concepts: Direct Sockets API, TCPSocket: connect, write, read, TCPServerSocket: listen on
  a local port, UDPSocket — datagrams from JavaScript
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Direct
    Sockets API can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Direct Sockets API.

#### Document picture-in-picture: copy document mode

- Path: `v131/document-picture-in-picture-copy-document-mode/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This makes the document picture-in-picture Document's mode (quirks mode vs
  no-quirks-mode) match the mode of the opener Document. Currently, the empty document is quirks
  mode by default, so this allows websites that rely on non-quirks mode to still function properly
  within a document picture-in-picture window.
- Existing concepts: style inheritance: host theme follows the PiP, Document PiP - copy document
  mode, Music player with copied styles, quirks vs no-quirks PiP mode probe
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Document picture-in-picture: copy document mode.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Exempt Speculation-Rules Header from CSP restrictions

- Path: `v131/exempt-speculation-rules-header-from-csp-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This is somewhat of a bug-fix, but it's a web-exposed bug fix which deserves full
  web platform security review, so we're using the Intent to Ship process. When we initially shipped
  the Speculation-Rules header, we reused much of the architecture from the
  <script type=speculationrules> implementation, and thus it was blocked by CSP policies that
  blocked <scr
- Existing concepts: The CDN-injected speculation rules use case, CSP × Speculation-Rules header
  tester, builder: format your Speculation-Rules header, Speculation-Rules header exempt from CSP
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Exempt
    Speculation-Rules Header from CSP restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Exempt Speculation-Rules Header from CSP restrictions.

#### Explicit resource management (async)

- Path: `v131/explicit-resource-management-async/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature addresses a common pattern in software development regarding the
  lifetime and management of various resources (memory, I/O, etc.). This pattern generally includes
  the allocation of a resource and the ability to explicitly release critical resources.
- Existing concepts: cancellation: AsyncDisposable wrapping an AbortController, await using - async
  resource disposal, Database transactions with await using, stream reader: release the lock on
  scope exit
- Suggested additions:
  - Capability probe and fallback explorer for Explicit resource management (async), using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Explicit resource management (sync)

- Path: `v131/explicit-resource-management-sync/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature addresses a common pattern in software development regarding the
  lifetime and management of various resources (memory, I/O, etc.). This pattern generally includes
  the allocation of a resource and the ability to explicitly release critical resources.
- Existing concepts: DisposableStack for batched cleanup, file handle lifecycle: try/finally vs
  using, build your own disposable: a stopwatch with Symbol.dispose, using - synchronous resource
  disposal
- Suggested additions:
  - Capability probe and fallback explorer for Explicit resource management (sync), using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### FedCM as a trust signal for the Storage Access API

- Path: `v131/fedcm-as-a-trust-signal-for-the-storage-access-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Reconciles the FedCM and Storage Access APIs by making a prior FedCM grant a
  valid reason to automatically approve a storage access request.
- Existing concepts: SSO iframe widget: SAA verdict simulator, capability probe, FedCM sign-in as a
  Storage Access trust signal, FedCM → SAA flow, step by step
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM as a trust signal for the Storage Access API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### :has-slotted pseudo selector

- Path: `v131/has-slotted-pseudo-selector/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The :has-slotted pseudo class represents a slot element with slotted content,
  such as a text node or element. This can be used to style elements based on whether or not they
  are using slot fallback content.
- Existing concepts: empty-state vs filled-state in one component, ::slotted matched by
  :has-slotted, per-named-slot layout switch, Optional icon slot — the icon-button case
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for :has-slotted pseudo selector,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where :has-slotted pseudo selector helps or fails.

#### Improvements to styling structure of <details> and <summary> elements

- Path: `v131/improvements-to-styling-structure-of-details-and-summary-elements/`
- Area: Internationalization and text semantics
- Priority: High
- Current framing: Support more CSS styling for the structure of <details> and <summary> elements to
  allow these elements to be used in more cases where disclosure widgets or accordion widgets are
  built on the web. In particular, this change removes restrictions that prevented setting the
  display property on these elements, and adds a ::details-content pseudo-element to style
- Existing concepts: animate <details> open and close, Style <details> with ::details-content,
  Exclusive accordion with animated ::details-content, grid and flex layout inside <details>
- Suggested additions:
  - Locale/script matrix: compare Improvements to styling structure of <details> and <summary>
    elements across languages, scripts, writing modes, emoji/math/text variants, and browser
    fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Nested pseudo elements styling

- Path: `v131/nested-pseudo-elements-styling/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allows to style pseudo elements that are nested inside other pseudo elements. So
  far, support is defined for: ::before::marker ::after::marker With ::column::scroll-marker being
  supported in the future.
- Existing concepts: Editorial drop-cap on a generated pull-quote, ::before::marker — styling the
  list marker inside a generated bullet, Pseudo-elements can nest, nested pseudo-element playground
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Nested pseudo elements
    styling, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Nested pseudo elements styling helps or fails.

#### noopener-allow-popups COOP value

- Path: `v131/noopener-allow-popups-coop-value/`
- Area: General web platform
- Priority: High
- Current framing: Some origins can contain different applications with different levels of security
  requirements. In those cases, it can be beneficial to prevent scripts running in one application
  from being able to open and script pages of another same-origin application. In such cases, it can
  be beneficial for a document to ensure its opener cannot script it, even if the
- Existing concepts: full COOP matrix: what each value gives you, Cross-Origin-Opener-Policy:
  noopener-allow-popups, OAuth popup flow under each COOP value, window.open with the new COOP value
- Suggested additions:
  - Capability probe and fallback explorer for noopener-allow-popups COOP value, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### @page margin boxes

- Path: `v131/page-margin-boxes/`
- Area: General web platform
- Priority: Medium
- Current framing: Add support for page margin boxes, when printing a web document, or exporting it
  as PDF.
- Existing concepts: running headers from string-set + string(), @page margin boxes, page numbers,
  headers, footers — all 16 corner boxes, Letterhead / running-header print template
- Suggested additions:
  - Capability probe and fallback explorer for @page margin boxes, using feature detection, fallback
    path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Playback Statistics API for WebAudio

- Path: `v131/playback-statistics-api-for-webaudio/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature adds an AudioContext.playbackStats attribute which returns an
  AudioPlaybackStats object. This object provides audio playback statistics such as average latency,
  minimum/maximum latency, underrun duration, and underrun count. This API allows web applications
  to monitor audio playback quality and detect glitches.
- Existing concepts: worklet under increasing load: induce underruns, Detect audio glitches in real
  time, rolling latency chart, WebAudio playback statistics
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Playback Statistics API for
    WebAudio.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Private Aggregation API: increase contribution limit to 100 for Protected Audience callers

- Path: `v131/private-aggregation-api-increase-contribution-limit-to-100-for-protected-audienc/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Enables Protected Audience script runners to make up to 100 contributions per
  Private Aggregation report, compared to the current limit of 20.
- Existing concepts: build a Protected Audience worklet that emits 100 contributions, contribution
  budget visualiser: 20 → 100, Private Aggregation - 100 contributions per call, Per-creative reach
  measurement
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Private Aggregation API: increase contribution limit to 100 for Protected Audience callers, with
    every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### @property support <string> syntax

- Path: `v131/property-support-string-syntax/`
- Area: General web platform
- Priority: Medium
- Current framing: Support for "<string>" syntax component name for registered custom properties.
- Existing concepts: typed string property for generated content, i18n string tokens in a registered
  <string>, @property <string> syntax, Themeable label slot via --component-label
- Suggested additions:
  - Capability probe and fallback explorer for @property support <string> syntax, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Remove non-standard GPUAdapter requestAdapterInfo() method

- Path: `v131/remove-non-standard-gpuadapter-requestadapterinfo-method/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The WebGPU WG decided it was impractical for requestAdapterInfo() to trigger a
  permission prompt so they’ve removed that option and replaced it with the GPUAdapter info
  attribute so that web developers can get the same GPUAdapterInfo value synchronously this time.
  See the previous Intent to Ship: WebGPU: GPUAdapter info attribute at https://groups.google.com
- Existing concepts: old async method vs new sync attribute, library audit: who still calls the
  removed API, Migration shim for legacy code, GPUAdapter.requestAdapterInfo() removed
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Remove
    non-standard GPUAdapter requestAdapterInfo() method can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Remove non-standard GPUAdapter requestAdapterInfo() method.

#### ServiceWorkerAutoPreload browser mode

- Path: `v131/serviceworkerautopreload-browser-mode/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: **ServiceWorkerAutoPreload** is a mode where the browser issues the network
  request in parallel with the service worker bootstrap. If the fetch handler returns the response
  with `respondWith()`, the browser consumes the network request result inside the fetch handler. If
  the fetch handler result is fallback, it passes the network response directly to the bro
- Existing concepts: fetch handler races cache + network, opt-in lifecycle, ServiceWorker
  auto-preload (browser mode), Side-by-side: with vs without auto-preload
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    ServiceWorkerAutoPreload browser mode can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for ServiceWorkerAutoPreload browser mode.

#### ServiceWorkerStaticRouterTimingInfo

- Path: `v131/serviceworkerstaticroutertiminginfo/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Adds timing information for ServiceWorker Static routing API, exposed in
  navigation timing API and resource timing API for developer use. Service Worker provides timing
  information to mark certain points in time. We add two Static routing API-relevant timing
  information: RouterEvaluationStart, time to start matching a request with registered router rules,
- Existing concepts: dashboard: per-source-type latency stats, ServiceWorkerStaticRouterTimingInfo,
  Compare source latencies across a real request mix, all router timing fields, mapped
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    ServiceWorkerStaticRouterTimingInfo can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for ServiceWorkerStaticRouterTimingInfo.

#### Summarizer API

- Path: `v131/summarizer-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Summarizer API is a JavaScript API for producing summaries of input text, backed
  by an AI language model. Browsers and operating systems are increasingly expected to gain access
  to a language model. By exposing this built-in model, we avoid every website needing to download
  their own multi-gigabyte language model, or send input text to third-party APIs. The
- Existing concepts: availability probe + model download, Four summary formats, one input, shared
  context and per-call context, Built-in Summarizer API
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Summarizer API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Support currentcolor in Relative Color Syntax

- Path: `v131/support-currentcolor-in-relative-color-syntax/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Allow relative colors in CSS (using the 'from' keyword) to use 'currentcolor' as
  a base. This will make it easy for web developers to set complementary colors, based on an
  element's text color, for that element's borders, shadows, backgrounds, etc.
- Existing concepts: dark-mode reskin from one variable, currentcolor in Relative Color Syntax,
  hover / active / disabled states from one color, Whole-component theming from one color
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Support currentcolor in Relative Color Syntax.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Support currentcolor in Relative Color Syntax
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Support external SVG resources for 'clip-path', 'fill', 'stroke' and 'marker-*' properties

- Path: `v131/support-external-svg-resources-for-clip-path-fill-stroke-and-marker-properties/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Allow external references for clip paths, markers, and paint servers (for the
  'fill' and 'stroke' properties). For example, clip-path: url("resources.svg#myPath").
- Existing concepts: shared clip-path library across pages, External SVG resources for clip-path,
  fill, stroke, marker, Shared icon library via external clip-path and marker, arrow markers + paint
  servers from a shared file
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Support external SVG resources for 'clip-path',
    'fill', 'stroke' and 'marker-*' properties, chart frame time/memory/quality, and compare
    graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### text-size-adjust improvements

- Path: `v131/text-size-adjust-improvements/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: text-size-adjust adjusts font sizes on mobile devices. Values other than auto
  disable automatic text size adjustments. Percentage values increase the computed size of text.
  This makes text-size-adjust more consistent, so it works like a direct multiplier of the font size
  (and line height). The major changes are: * text-size-adjust works with or without
- Existing concepts: locked elements: ASCII diagrams, tables, code, Reading body vs locked
  monospace, live percentage adjust slider, text-size-adjust on desktop
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for text-size-adjust
    improvements, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where text-size-adjust improvements helps or fails.

#### Translator API

- Path: `v131/translator-api/`
- Area: Built-in AI
- Priority: High
- Current framing: A JavaScript API to provide language translation capabilities to web pages.
  Browsers are increasingly offering language translation to their users. Such translation
  capabilities can also be useful to web developers. This is especially the case when browser's
  built-in translation abilities cannot help. An enterprise policy
  (GenAILocalFoundationalModelSettings
- Existing concepts: auto-detect + translate (3-stage pipeline), language pair availability matrix,
  Streaming translation for live chat, Translator API
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Translator API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Web Authentication API: PublicKeyCredential’s getClientCapabilities() method

- Path: `v131/web-authentication-api-publickeycredential-s-getclientcapabilities-method/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: getClientCapabilities() method allows to determine which WebAuthn features are
  supported by the user's client. The method returns a list of supported capabilities, allowing
  developers to tailor authentication experiences and workflows based on the client's specific
  functionality.
- Existing concepts: capability explorer, PublicKeyCredential.getClientCapabilities(), Use
  getClientCapabilities to gate conditional UI, decision tree: which sign-in surface should you
  show?
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Web Authentication API: PublicKeyCredential’s getClientCapabilities() method, with every
    allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### WebGPU: Clip Distances

- Path: `v131/webgpu-clip-distances/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Adds the optional GPU feature "clip-distances" that allows setting user-defined
  clip distances in vertex shader outputs. This technique is particularly useful for the
  applications that need to clip all vertices in a scene that are beyond a user-defined plane, such
  as many CAD applications.
- Existing concepts: WebGPU clip-distances, CAD-style section-plane cutaway, feature + adapter
  limits probe, WGSL shader: emit clip_distances
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Clip Distances, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: GPUCanvasContext getConfiguration()

- Path: `v131/webgpu-gpucanvascontext-getconfiguration/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
  Once GPUCanvasContext configure() has been called with a configuration dictionary, the
  GPUCanvasContext getConfiguration() method lets developers check the canvas context configuration.
  It includes GPU device, format, usage, viewFormats, colorSpace, toneMapping, and alphaMode m
- Existing concepts: GPUCanvasContext.getConfiguration(), library handshake: host + overlay agreeing
  on format, configure() → getConfiguration() round-trip, Hand off a canvas configured by Three.js
  to a custom overlay
- Suggested additions:
  - Capability profiler: query CSS.supports(), navigator.gpu, adapter feature/limit query, choose
    the best rendering path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: GPUCanvasContext getConfiguration(), chart
    frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebHID on Dedicated Workers

- Path: `v131/webhid-on-dedicated-workers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: WebHID is enabled inside dedicated worker contexts. This allows developers to
  perform heavy I/O and processing of data from a HID device on a separate thread to reduce the
  performance impact on the main thread.
- Existing concepts: Main thread vs worker: input latency under load, two device pipelines, two
  workers, no main-thread jitter, worker probe: navigator.hid in a dedicated worker, WebHID inside
  Dedicated Workers
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebHID on
    Dedicated Workers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebHID on Dedicated Workers.

#### [WebRTC] RTCRtpEncodingParameters.scaleResolutionDownTo

- Path: `v131/webrtc-rtcrtpencodingparameters-scaleresolutiondownto/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: An API that configures WebRTC encoders to scale input frames if they are greater
  than the specified maxWidth and maxHeight. This API is similar to scaleResolutionDownBy except
  that resolution constraints are expressed in absolute terms (e.g. 640x360) as opposed to relative
  terms (e.g. scale down by 2), avoiding race conditions related to changing input frame
- Existing concepts: Aspect-ratio aware downscaling for adaptive bitrates, scaleResolutionDownBy vs
  scaleResolutionDownTo, RTCRtpEncodingParameters.scaleResolutionDownTo, simulcast tower: three
  target sizes
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for [WebRTC] RTCRtpEncodingParameters.scaleResolutionDownTo.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### WebXr hand input module - Level 1

- Path: `v131/webxr-hand-input-module-level-1/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Exposes hand joint data on XrInputSources for use during a WebXr session. This
  allows developers to have more fine grained interactions during WebXr sessions.
- Existing concepts: five canonical gestures: pinch, fist, point, peace, open palm, all 26 joints,
  names + radii, Per-joint radius drives pinch detection, WebXR Hand Input - Level 1
- Suggested additions:
  - Capability profiler: query navigator.xr, session feature support, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebXr hand input module - Level 1, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### X25519Kyber768 key encapsulation for TLS

- Path: `v131/x25519kyber768-key-encapsulation-for-tls/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 124 enabled by default on all desktop platforms a new post-quantum secure
  TLS key encapsulation mechanism
  [X25519Kyber768](https://developer.chrome.com/blog/chrome-124-beta#x25519kyber768_key_encapsulation_for_tls),
  based on a NIST standard (ML-KEM). This protects network traffic from Chrome with servers that
  also support ML-KEM from decryption by a f
- Existing concepts: handshake bytes: classical vs hybrid, X25519Kyber768 - post-quantum hybrid TLS
  key exchange, The harvest-now-decrypt-later timeline, server readiness matrix
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    X25519Kyber768 key encapsulation for TLS can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for X25519Kyber768 key encapsulation for TLS.

### v132

#### Attribution Reporting API Feature (Aggregatable Named Budgets)

- Path: `v132/attribution-reporting-api-feature-aggregatable-named-budgets/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: We are landing the following change to the Attribution Reporting API focused
  on: * making it easier to predefine contribution budget allocation for aggregate reports
- Existing concepts: Allocation strategies on the same traffic, Named Budgets simulator, From bucket
  pick to encrypted report, Trigger registration: which bucket does it draw from?
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Attribution Reporting API Feature (Aggregatable Named Budgets), with every allowed/blocked
    branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Attribution Reporting API Feature (Change To ar_debug Cookie Requirement)

- Path: `v132/attribution-reporting-api-feature-change-to-ar-debug-cookie-requirement/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: We are landing the following change to the Attribution Reporting API focused
  on: * making it easier to receive API cookie-based debug reports
- Existing concepts: ar_debug cookie change — before and after, Which debug reports actually fire?,
  Ad-tech migration checklist, Decoding a verbose debug report
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Attribution Reporting API Feature (Change To ar_debug Cookie Requirement), with every
    allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Blob URL Partitioning: Fetching/Navigation

- Path: `v132/blob-url-partitioning-fetching-navigation/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: As a continuation of Storage Partitioning, Chromium will implement partitioning
  of Blob URL access by Storage Key (top-level site, frame origin, and the has-cross-site-ancestor
  boolean), with the exception of top-level navigations which will remain partitioned only by frame
  origin. This behavior is similar to what’s currently implemented by both Firefox and
- Existing concepts: Blob URL partitioning — storage key simulator, Top-level navigation vs
  subresource fetch, Storage Key triplet explorer, The top-level nav carve-out
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Blob URL
    Partitioning: Fetching/Navigation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Blob URL Partitioning: Fetching/Navigation.

#### CSS Anchor Positioning: allow anchor-size() in inset and margin Properties

- Path: `v132/css-anchor-positioning-allow-anchor-size-in-inset-and-margin-properties/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allow anchor-size() values for inset and margin properties. Originally,
  anchor-size() was only allowed in sizing properties. The specification was changed to allow
  anchor-size() in insets and margins as well.
- Existing concepts: Which axis does anchor-size() read?, anchor-size() inside inset and margin,
  Pinning a badge to a fraction of the anchor's width, Margins that scale with the anchor
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Anchor Positioning: allow
    anchor-size() in inset and margin Properties, with live before/after rendering and copyable
    rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Anchor Positioning: allow anchor-size() in inset
    and margin Properties helps or fails.

#### CSS caret-animation property

- Path: `v132/css-caret-animation-property/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chromium supports animation of the caret-color property, but when animated the
  default blinking behavior of the caret interferes with the animation. For instance, see the
  example at https://drafts.csswg.org/css-ui/#caret-animation where an animation from blue to red
  and back is rendered as a blinking cursor that is randomly blue or red. The CSS caret-animati
- Existing concepts: Why prefers-reduced-motion matters for the caret, Caret preset gallery,
  Building your own blink rhythm, caret-animation: manual vs auto
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CSS
    caret-animation property can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CSS caret-animation property.

#### CSS Inertness

- Path: `v132/css-inertness/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The interactivity property specifies whether an element and its flat tree
  descendants (including text runs) are inert or not.
- Existing concepts: Carousel pages: only the visible slide is in the tab order, Why interactivity:
  inert exists when the inert attribute is already a thing, interactivity: inert as a CSS property,
  Walk the tab order through inert content
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS Inertness.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS Inertness behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Device Posture API

- Path: `v132/device-posture-api/`
- Area: General web platform
- Priority: Medium
- Current framing: This API helps developers to detect the current posture of a foldable device. The
  device posture is the physical position in which a device holds which may be derived from sensors
  in addition to the angle. From enhancing the usability of a website by avoiding the area of a
  fold, to enabling innovative use cases for the web, knowing the posture of a devic
- Existing concepts: Four CSS strategies that degrade well, Map + list reflow on the @media
  (device-posture) breakpoint, Device Posture — live probe, Live posture & change-event log
- Suggested additions:
  - Capability probe and fallback explorer for Device Posture API, using feature detection, fallback
    path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Dialog Toggle Events

- Path: `v132/dialog-toggle-events/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: It is useful for web authors do determine when their <dialog> elements open and
  close. popover already has `ToggleEvent` which is dispatched when a popover opens or closes, but
  <dialog> does not. The current way to detect when a <dialog> opens is to register a mutation
  observer to check for open, however, this is quite a lot of work where an event would be e
- Existing concepts: Animate <dialog> entrances with no JS choreography, Cancel a close from
  beforetoggle, Visualise the <dialog> state machine, Dialog ToggleEvent — live listener
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Dialog Toggle Events.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Dialog Toggle Events behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Document-Isolation-Policy

- Path: `v132/document-isolation-policy/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Document-Isolation-Policy allows a document to enable crossOriginIsolation for
  itself, without having to deploy COOP or COEP, and regardless of the crossOriginIsolation status
  of the page. The policy is backed by process isolation. Additionally, the document non-CORS
  cross-origin subresources will either be loaded without credentials or will need to have a C
- Existing concepts: Probe cross-origin isolation gated APIs live, Document-Isolation-Policy — SAB
  unlock simulator, COOP + COEP vs. DIP — pick the right one, Why DIP exists: the COOP problem with
  popups
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Document-Isolation-Policy, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Element Capture

- Path: `v132/element-capture/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: API for capturing a subtree of the DOM.
- Existing concepts: Video call: only the slide is captured, Element Capture — restrict to a DOM
  subtree, What happens when the target element changes?, Pick a DOM subtree, send only that to the
  capture stream
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Element Capture.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Explicit Compile Hints with Magic Comments

- Path: `v132/explicit-compile-hints-with-magic-comments/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Allow attaching information about which functions should be eager parsed &
  compiled in JavaScript files.
- Existing concepts: How each bundler should emit the magic comment, Compile Hints — eager vs lazy,
  First-click latency — the interaction case, Lazy vs eager parsing, side-by-side
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Explicit Compile Hints with Magic Comments.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Explicit Compile Hints with Magic Comments behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Expose coarsened cross-origin renderTime in elment timing/LCP (regardless of TAO)

- Path: `v132/expose-coarsened-cross-origin-rendertime-in-elment-timing-lcp-regardless-of-tao/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: All element-timing and LCP performance entries would have a non-zero renderTime,
  even if they are cross-origin without Timing-Allow-Origin. All presentation timestamps
  (renderTime, paint timing start time, event timing end time) will be coarsened to a 4ms multiple
  to mitigate the risk of reading cross-origin image information.
- Existing concepts: Coarsened renderTime in element-timing / LCP, Real LCP entries on this page,
  4 ms quantization, visualised, TAO-allowed vs coarsened — side-by-side
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Expose
    coarsened cross-origin renderTime in elment timing/LCP (regardless of TAO) can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Expose coarsened cross-origin renderTime in elment timing/LCP
    (regardless of TAO).

#### FedCM authorization features (fka bundle 6: Continuation API, Parameters API, Fields API, Multiple configURLs, Custom account labels)

- Path: `v132/fedcm-authorization-features-fka-bundle-6-continuation-api-parameters-api-fields/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: This bundles a few features that we would like to launch at the same time. We are
  bundling them together because they can be used by IdPs to implement authorization flows such as
  letting a user grant access to a user’s calendar to an RP. See also
  https://github.com/w3c-fedid/FedCM/issues/477.
- Existing concepts: Custom account labels & filtering, FedCM Auth Bundle — live call builder,
  Continuation API: the popup hand-off, One IDP, multiple configURLs, Authorization scope & fields
  preview
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM authorization features (fka bundle 6: Continuation API, Parameters API, Fields API,
    Multiple configURLs, Custom account labels), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### FedCM Mode API (f.k.a. button mode) and Use Other Account API

- Path: `v132/fedcm-mode-api-f-k-a-button-mode-and-use-other-account-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: We intend to ship two new extensions for FedCM to address two issue that were
  collectively identified as CR blockers by the FedID WG: “A not-yet logged in IDP has no route to
  success” and “Allow signing in to additional account(s)”.
- Existing concepts: Browser dialog wireframes: passive vs active, FedCM Mode + Use Other Account,
  Trace a sign-in flow through every mode state, Use Other Account: adding a second identity at the
  same IdP
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM Mode API (f.k.a. button mode) and Use Other Account API, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Fenced frames - Send "Referer" header in beacons

- Path: `v132/fenced-frames-send-referer-header-in-beacons/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Reporting beacons (for FenceEvent-built destination enum events, FenceEvent-built
  automatic beacon events, and macro-substituted destination URL events) will have their "Referer"
  header set to the initiating frame's origin. This is a strictly additive change, as the "Referer"
  header is currently unpopulated for all fenced frame event-level reports.
- Existing concepts: What ad-tech can actually attribute now, Beacon types: where does Referer now
  appear?, Fenced frame Referer — before / after, Referer-Policy meets fenced beacons
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Fenced frames - Send "Referer" header in beacons, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Fetch: Request.bytes() and Response.bytes()

- Path: `v132/fetch-request-bytes-and-response-bytes/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Add a bytes() method to the Request and Response interfaces, which returns a
  promise that resolves with a Uint8Array. While Request and Response have an arrayBuffer() method,
  we can't read directly from a buffer. We have to create a view such as a Uint8Array to read it.
  The bytes() method improves the ergonomics of getting the body of Request and Response.
- Existing concepts: Which Body method should I use?, Request.bytes() and Response.bytes(),
  Request.bytes() — the upload side, Fetch some bytes and inspect them, ergonomically
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Fetch:
    Request.bytes() and Response.bytes() can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Fetch: Request.bytes() and Response.bytes().

#### File System Access

- Path: `v132/file-system-access/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: This API enables developers to build powerful apps that interact with other
  (non-Web) apps on the user’s device via the device’s file system. After a user grants a web app
  access, this API allows the app to read or save changes directly to files and folders selected by
  the user. Beyond reading and writing files, this API provides the ability to open a direct
- Existing concepts: Walk a directory, recursively, with totals, File System Access — live editor,
  Permission lifecycle for a handle, Streaming write — chunked, with progress
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for File System Access.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses File System Access in a
    realistic user workflow.

#### Fix Selection isCollapsed in Shadow DOM

- Path: `v132/fix-selection-iscollapsed-in-shadow-dom/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Selection isCollapsed should return true if and only if the anchor and focus are
  the same. This should be true whether the selection starts/ends inside a light or a shadow tree.
  Currently, the Chrome implementation returns true if selection's anchor node is in a shadow tree,
  even if the selection itself is not collapsed. We fix this by removing the err
- Existing concepts: Live readout of selection.isCollapsed, The four cross-tree selection cases, The
  bug in practice: an inline toolbar that never appeared, Selection.isCollapsed across shadow
  boundary
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Fix Selection isCollapsed in Shadow DOM.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Fix Selection isCollapsed in Shadow DOM behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Freezing on Energy Saver

- Path: `v132/freezing-on-energy-saver/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: When Energy Saver is active, Chrome will freeze a "browsing context group" that
  has been hidden and silent for >5 minutes if any subgroup of same-origin frames within it exceeds
  a CPU usage threshold, unless it:
- Existing concepts: Which APIs stop when the tab is frozen?, Freezing on Energy Saver — rule
  simulator, Will Chrome freeze this tab?, What actually stops when Chrome freezes a tab?
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Freezing on Energy Saver, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Ignore Strict-Transport-Security for localhost

- Path: `v132/ignore-strict-transport-security-for-localhost/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Strict-Transport-Security response headers can cause problems for localhost web
  servers because STS applies host-wide, across all ports. This causes compatibility problems for
  web developers testing locally as well as end-users who use software packages that commonly spin
  up localhost webservers for ephemeral reasons (e.g. communication of an auth token from
- Existing concepts: Visiting localhost:8080 over HTTP, The localhost dev-server papercut, replayed,
  HSTS on localhost — before / after, Which hosts is "localhost" for STS purposes?
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Ignore
    Strict-Transport-Security for localhost can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Ignore Strict-Transport-Security for localhost.

#### Keyboard-focusable scroll containers

- Path: `v132/keyboard-focusable-scroll-containers/`
- Area: General web platform
- Priority: Medium
- Current framing: Improves accessibility by making scroll containers focusable using sequential
  focus navigation. Today, the tab key doesn't focus scrollers unless tabIndex is explicitly set to
  0 or more.
- Existing concepts: Keyboard-focusable scroll containers, Six scroll containers — which ones get
  tab focus?, What a screen reader user actually hears, Tab into and out of every scroller
- Suggested additions:
  - Capability probe and fallback explorer for Keyboard-focusable scroll containers, using
    CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### navigator.storage no longer an EventTarget

- Path: `v132/navigator-storage-no-longer-an-eventtarget/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: navigator.storage is no longer an EventTarget navigator.storage was made an
  EventTarget for the Storage Pressure Event, which never made it past the prototype phase:
  https://chromestatus.com/feature/5666274359115776 This dead code is being removed and as a result,
  navigator.storage will no longer extend EventTarget.
- Existing concepts: Spot the broken event listeners, The replacement: polling estimate() on a
  schedule, What's on navigator.storage now?, navigator.storage: probe + replacement
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    navigator.storage no longer an EventTarget can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for navigator.storage no longer an EventTarget.

#### Partitioning :visited links history

- Path: `v132/partitioning-visited-links-history/`
- Area: General web platform
- Priority: Medium
- Current framing: To eliminate user browsing history leaks, anchor elements are styled as :visited
  only if they have been clicked from this top-level site and frame origin before. On the
  browser-side, this means that the VisitedLinks hashtable is now partitioned via "triple-keying",
  or by storing the following for each visited link: <link URL, top-level site, frame origin>. B
- Existing concepts: What history-sniff attacks does partitioning kill?, Live :visited rendering on
  real links, Triple-key partition explorer, Partitioned :visited — triple-key explorer
- Suggested additions:
  - Capability probe and fallback explorer for Partitioning :visited links history, using
    CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Popover invoker and anchor positioning improvements

- Path: `v132/popover-invoker-and-anchor-positioning-improvements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This chromestatus represents the following related set of changes, which were
  resolved in https://github.com/whatwg/html/pull/9144#issuecomment-2195095228 and landed in
  https://github.com/whatwg/html/pull/10728:
- Existing concepts: Submenu popovers anchored to their parent item, Three invoker types
  side-by-side, Many invokers, no anchor-names — menu per row, Popover invokers as implicit anchors
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Popover
    invoker and anchor positioning improvements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Popover invoker and anchor positioning improvements.

#### Private Aggregation API: ignoring site exceptions for debug mode

- Path: `v132/private-aggregation-api-ignoring-site-exceptions-for-debug-mode/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Currently, the availability of Private Aggregation’s debug mode is tied to a
  caller's eligibility to set a third-party cookie (see
  https://chromestatus.com/feature/5148973702840320). However, an edge case was missed in this
  logic: if the caller can only set a third-party cookie due to a top-level site exception (i.e. the
  user has generally disabled third-par
- Existing concepts: Debug Mode Comparison, Will debug mode be available?, Private Aggregation debug
  mode — rule simulator, The worklet flow: contributions in, debug payload out
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Private Aggregation API: ignoring site exceptions for debug mode, with every allowed/blocked
    branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Private State Token API Permissions Policy Default Allowlist Wildcard

- Path: `v132/private-state-token-api-permissions-policy-default-allowlist-wildcard/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Access to the Private State Token API is gated by Permissions Policy features. We
  proposed to update the default allowlist for both `private-state-token-issuance` and
  `private-state-token-redemption` features from self to * (wildcard).
- Existing concepts: Why the default flipped: the fraud-detection embed rollout, Who can issue /
  redeem now?, PST default allowlist: self → *, Token Flow Simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Private State Token API Permissions Policy Default Allowlist Wildcard, with every
    allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Protected Audience Auction Nonce Hardening

- Path: `v132/protected-audience-auction-nonce-hardening/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Additional bids are a feature of the Protected Audience auction that provide
  buyers with a way to include server-constructed contextual bids in the auction, which allows
  negative targeting of those bids. We've identified a potential privacy risk with the current
  implementation, as well as a potential solution that addresses that risk. Additional bids come fr
- Existing concepts: Buyer-worklet view: how nonces gate “additional bids”, Nonce Validator,
  runAdAuction() nonce replay simulator, The replay attack PA nonce hardening kills
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Protected Audience Auction Nonce Hardening, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### PushMessageData::bytes()

- Path: `v132/pushmessagedata-bytes/`
- Area: General web platform
- Priority: Medium
- Current framing: The PushMessageData interface mimics the Body interface, which was amended
  earlier this year with a new bytes() method, following the principle that APIs should generally
  vend byte buffers as Uint8Arrays.
- Existing concepts: Binary Protocol Demo, PushMessageData: all four reads compared,
  PushMessageData.bytes() — equivalence demo, Service worker integration — subscribe, dispatch,
  decode
- Suggested additions:
  - Capability probe and fallback explorer for PushMessageData::bytes(), using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Remove Prefixed HTMLVideoElement Fullscreen APIs

- Path: `v132/remove-prefixed-htmlvideoelement-fullscreen-apis/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: The prefixed HTMLVideoElement-specific fullscreen APIs have been deprecated since
  approximately M38. They were replaced by the Element.requestFullscreen() API, which first shipped
  un-prefixed in M71, in 2018. As of 2024, most browsers have had support for the un-prefixed APIs
  for a few years now. This feature tracks removing the following APIs from HTMLVi
- Existing concepts: Fourteen years from prefix to removal, Codemod helper: scan your JS for the
  removed APIs, Fullscreen Event Log, Fullscreen Migration Checker, video FS — removal probe +
  replacement
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Remove Prefixed HTMLVideoElement
    Fullscreen APIs.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Resource timing: revert responseStart change and introduce firstResponseHeadersStart

- Path: `v132/resource-timing-revert-responsestart-change-and-introduce-firstresponseheadersst/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Resource timing: - responseStart returns the first response, either early hints
  (interim) or final - Expose the final response headers (2xx/4xx/5xx) time as
  finalResponseHeadersStart.
- Existing concepts: Early hints: 103 first, 200 later, firstResponseHeadersStart — live observer,
  Where does firstResponseHeadersStart land?, Resource Timing Waterfall
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Resource
    timing: revert responseStart change and introduce firstResponseHeadersStart can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Resource timing: revert responseStart change and introduce
    firstResponseHeadersStart.

#### Saved queries in sharedStorage.selectURL

- Path: `v132/saved-queries-in-sharedstorage-selecturl/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: sharedStorage.selectURL() now allows queries to be saved and reused on a per-page
  basis, where the two per-page-load budgets are charged the first time a saved query is run but not
  for subsequent runs of the saved query during the same page-load. This is accomplished with a
  savedQuery parameter in the options for selectURL() that will name the query.
- Existing concepts: Budget economics for saved vs unsaved queries, Budget rescue: 6 ad slots, 4
  page-loads, one budget, Entropy Budget Tracker, Saved Queries — per-page-load budget simulator,
  Worklet Simulator
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Saved queries in sharedStorage.selectURL.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Saved queries in
    sharedStorage.selectURL in a realistic user workflow.

#### ::scroll-button() pseudo elements

- Path: `v132/scroll-button-pseudo-elements/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allow the creation of interactive scroll buttons as pseudo-elements, e.g.
- Existing concepts: Carousel Navigation, Gallery + vertical — all four directions in CSS, Four
  orientation modes side-by-side, ::scroll-button() pseudo-elements
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for ::scroll-button() pseudo
    elements, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where ::scroll-button() pseudo elements helps or fails.

#### Sideways writing modes

- Path: `v132/sideways-writing-modes/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Support of `sideways-rl` and `sideways-lr` keywords for `writing-mode` CSS
  property is added. They are vertical writing modes, and all letters are sideways.
- Existing concepts: Use cases that needed sideways: bookshelf spines and chart labels,
  writing-mode: sideways-lr / sideways-rl, Vertical Timeline, Five writing modes side-by-side
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Sideways writing modes, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Sideways writing modes helps or fails.

#### Support creating ClipboardItem with Promise<DOMString>

- Path: `v132/support-creating-clipboarditem-with-promise-domstring/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: The ClipboardItem, which is the input to the async clipboard write method, now
  accepts string values in addition to Blobs in its constructor. ClipboardItemData can be a Blob, a
  string, or a Promise that resolves to either a Blob or a string.
- Existing concepts: Async Clipboard Playground, ClipboardItem <Promise<DOMString>>, Build a
  multi-format ClipboardItem and write it, Fetch-then-copy: the motivating use case, Rich Copy
  Formatter
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Support creating ClipboardItem with
    Promise<DOMString>.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Support creating
    ClipboardItem with Promise<DOMString> in a realistic user workflow.

#### Throw exception for popovers/dialogs in non-active documents

- Path: `v132/throw-exception-for-popovers-dialogs-in-non-active-documents/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This is a corner case change that hopefully does not impact developers.
  Previously calling `showPopover()` or `showModal()` on a popover or dialog that resides within an
  inactive document would silently fail. I.e. no exception would be thrown, but since the document
  is inactive, no popover or dialog would be shown. As of the https://github.com/whatwg/html/pu
- Existing concepts: Error matrix — the seven inactive scenarios, Iframe Document Tester, Iframe
  Popover Test, showModal / showPopover on inactive documents, Five real lifecycle traps
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Throw
    exception for popovers/dialogs in non-active documents can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Throw exception for popovers/dialogs in non-active documents.

#### User Navigation Capturing on Desktop

- Path: `v132/user-navigation-capturing-on-desktop/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Web links now direct users to installed web apps. This aligns with users'
  installed app expectations. Chrome makes it easier to move between the browser and installed web
  apps. Clicking a link that could be handled by an installed web app with the launch_handler field
  specified, the link will open in that installed web app, following the launch handling beha
- Existing concepts: Capture Links Configurator, Where does the link open?, Link playground — what
  the desktop browser does on each click target, Nav capture — manifest builder, PWA Link Capture
  Demo
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why User Navigation Capturing on Desktop is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### WebAuthn signal API

- Path: `v132/webauthn-signal-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Allow WebAuthn relying parties to report information about existing credentials
  back to credential storage providers, so that incorrect or revoked credentials can be updated or
  removed from provider and system UI.
  https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Signal-API-explainer
- Existing concepts: Credential lifecycle: keep the authenticator in sync with your DB, Passkey
  Cleanup Flow, Passkey Sync Dashboard, Five RP recipes for Signal API, WebAuthn Signal API — live
  caller
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    WebAuthn signal API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### WebGPU: 32-bit float textures blending

- Path: `v132/webgpu-32-bit-float-textures-blending/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. The
  “float32-blendable” GPU feature makes GPU textures with formats "r32float", "rg32float", and
  "rgba32float" blendable.
- Existing concepts: WebGPU float32-blendable — live probe, WebGPU texture format capabilities, HDR
  bloom: many bright spots blended into one rgba32float target, HDR Gradient Painter, HDR Color
  Range Visualizer
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: 32-bit float textures blending, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: Expose GPUAdapterInfo from GPUDevice

- Path: `v132/webgpu-expose-gpuadapterinfo-from-gpudevice/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. The
  GPUDevice adapterInfo attribute exposes the same GPUAdapterInfo as the GPUAdapter object..
- Existing concepts: Live GPUAdapterInfo probe, GPUDevice.adapterInfo — live read, GPU Device Info
  Dashboard, Device Info Explorer, Lost-device telemetry: adapter info that survives the crash
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Expose GPUAdapterInfo from GPUDevice, chart
    frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: Texture view usage

- Path: `v132/webgpu-texture-view-usage/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Adds an optional field to WebGPU texture view creation to request a subset of the
  usage flags from the source texture. By default, texture view usage inherits from the source
  texture but there are view formats which can be incompatible with the full set of inherited
  usages. Adding a usage field to texture view creation allows the user request a subset of
- Existing concepts: Storage vs sample: one texture, two views, two passes, Texture View Usage
  Matrix, Pick the right usage flags for a view, Texture view usage — live builder, View Usage
  Validator
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Texture view usage, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

### v133

#### Animation.overallProgress

- Path: `v133/animation-overallprogress/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Adds an "overallProgress" property to the JavaScript class Animation[1].
- Existing concepts: Iteration meter, Orchestration dashboard, overallProgress, Scroll vs Time: one
  number, two timelines
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Animation.overallProgress.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Animation.overallProgress behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Atomics.pause

- Path: `v133/atomics-pause/`
- Area: General web platform
- Priority: Medium
- Current framing: Adds the Atomics.pause method to hint the CPU that the current code is executing
  a spinlock.
- Existing concepts: Atomics.pause, Exponential backoff, SPSC queue throughput, Real spinlock in a
  Worker
- Suggested additions:
  - Capability probe and fallback explorer for Atomics.pause, using feature detection, fallback
    path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Audio Output Devices API: setPreferredSinkId()

- Path: `v133/audio-output-devices-api-setpreferredsinkid/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Adds setPreferredSinkId() to MediaDevices, which enables a top-level frame to
  override the default audio output device for all audio renderers in the top-level frame and its
  child frames, including cross-origin child frames. Audio renderers include HTML <media> elements
  and web audio contexts.
- Existing concepts: Cross-origin iframe routing — without postMessage, Device picker with
  capability probe, setPreferredSinkId, WebAudio + media element routing
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Audio Output Devices API:
    setPreferredSinkId().
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CSP hash reporting for scripts

- Path: `v133/csp-hash-reporting-for-scripts/`
- Area: General web platform
- Priority: High
- Current framing: Complex web application often need to keep tabs of the subresources that they
  download, for security purposes.
- Existing concepts: CSP Hash Reporting, Hash harvester & allowlist builder, Report payload — before
  & after, Live violation harvester
- Suggested additions:
  - Capability probe and fallback explorer for CSP hash reporting for scripts, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### CSS advanced attr() function

- Path: `v133/css-advanced-attr-function/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Implement the augmentation to attr() specified in CSS Level 5, which allows types
  besides <string> and usage in all CSS properties (besides pseudo-element 'content').
- Existing concepts: Typed attr(), A chart with no JS recolour, Palette wall, Type explorer
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS advanced attr() function,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS advanced attr() function helps or fails.

#### CSS :open pseudo-class

- Path: `v133/css-open-pseudo-class/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The :open pseudo-class matches <dialog> and <details> when they are in their open
  state, and matches <select> and <input> when they are in modes which have a picker and the picker
  is showing.
- Existing concepts: :has(:open) — ancestor reacts to descendant state, :open, Form picker
  indicators, Transition coordination via :open
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS :open pseudo-class.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS :open pseudo-class behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS Scroll State Container Queries

- Path: `v133/css-scroll-state-container-queries/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Use container queries to style descendants of containers based on their scroll
  state.
- Existing concepts: Scroll-state Container Queries, Scrolled progress — scrolled query, Snapped
  gallery — snapped query, Sticky shrink header — the explainer's marquee example
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Scroll State Container
    Queries, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Scroll State Container Queries helps or fails.

#### CSS sibling-index() and sibling-count()

- Path: `v133/css-sibling-index-and-sibling-count/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: sibling-index() and sibling-count() can be used as integers in CSS property
  values to style elements based on their position among its siblings, or the total number of
  siblings respectively. These functions can be used directly as integer values, but more
  interestingly inside calc() expressions. Example: li { margin-left: calc(10px * sibling-index());
- Existing concepts: Color Spectrum Generator, sibling-index() & sibling-count(), Staggered reveal &
  zebra rows, Staircase list & rotated pie
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS sibling-index() and
    sibling-count(), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS sibling-index() and sibling-count() helps or
    fails.

#### CSS text-box, text-box-trim, and text-box-edge

- Path: `v133/css-text-box-text-box-trim-and-text-box-edge/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: To achieve optical balance of text content, the text-box-trim and text-box-edge
  properties, along with the text-box shorthand property, make finer control of vertical alignment
  of text possible.
- Existing concepts: Where the half-leading shows up, Edge keyword matrix, Icon baseline aligner,
  text-box-trim
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS text-box, text-box-trim,
    and text-box-edge, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS text-box, text-box-trim, and text-box-edge helps
    or fails.

#### Dialog light dismiss

- Path: `v133/dialog-light-dismiss/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: One of the nice features of the Popover API is its light dismiss behavior. This
  chromestatus is about bringing that same capability to `<dialog>`. A new `closedby` attribute
  controls behavior: `<dialog closedby=none>` - no user-triggered closing of dialogs at all.
  `<dialog closedby=closerequest>` - user pressing ESC (or other close trigger) closes the di
- Existing concepts: closedby matrix — modal vs non-modal vs popover, Escape, backdrop, and the
  cancel event, Dialog Light Dismiss, Popover vs Dialog — converged dismiss
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Dialog light dismiss.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Dialog light dismiss behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Digital Credentials API (issuance support)

- Path: `v133/digital-credentials-api-issuance-support/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: This Web Platform feature enables issuing websites (e.g., a university,
  government agency, or bank) to securely initiate the provisioning (issuance) process of digital
  credentials directly into a user's mobile wallet application. On Android, this capability
  leverages the Android IdentityCredential CredMan system (Credential Manager). On Desktop, it
  leverages
- Existing concepts: DC Issuance, Issuance flow builder — mDL onboarding, Protocol profiles, Wallet
  Protocol Simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Digital Credentials API (issuance support), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Digital Credentials API (presentation support)

- Path: `v133/digital-credentials-api-presentation-support/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Websites can and do get credentials from mobile wallet apps through a variety of
  mechanisms today (custom URL handlers, QR code scanning, etc.). This Web Platform feature would
  allow sites to request identity information from wallets via Android's IdentityCredential CredMan
  system. It is extensible to support multiple credential formats (eg. ISO mDoc and W3
- Existing concepts: Age gate flow — selective disclosure, DC Presentation, Format & protocol
  comparator, Selective disclosure designer
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Digital Credentials API (presentation support), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### DOM State-Preserving Move

- Path: `v133/dom-state-preserving-move/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This features adds a DOM primitive (moveBefore) that allows moving elements
  around a DOM tree, without resetting the element's state. This function would be available on
  ParentNodes, like Element, Document, DocumentFragment.
- Existing concepts: Audio keepalive across reparent, Element.moveBefore(), Focus and selection,
  Iframe reparent without reload
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for DOM State-Preserving Move.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how DOM State-Preserving Move behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Error.isError

- Path: `v133/error-iserror/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Adds the Error.isError(obj) static method. It returns true for JS native errors
  and DOMExceptions, and false otherwise.
- Existing concepts: Cross-realm errors — where instanceof breaks, Error.isError, Promise rejection
  router, Error Type Matrix
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Error.isError.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Error.isError behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Expose attributionsrc attribute on <area>

- Path: `v133/expose-attributionsrc-attribute-on-area/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: For Attribution Reporting, the attributionsrc attribute was already
  unintentionally processed on <area> elements due to code shared with <a>, which intentionally
  supported that attribute. For completeness, we expose the attribute on <area> with identical
  syntax and semantics to <a> and without changing the previous processing: When an <area> tag with
  an attr
- Existing concepts: <area attributionsrc>, area vs anchor parity probe, Click Attribution Debugger,
  Three-region banner with per-area attribution
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Expose attributionsrc attribute on <area>, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Expose coarsened cross-origin renderTime in elment timing/LCP (regardless of TAO)

- Path: `v133/expose-coarsened-cross-origin-rendertime-in-elment-timing-lcp-regardless-of-tao/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: All element-timing and LCP performance entries would have a non-zero renderTime,
  even if they are cross-origin without Timing-Allow-Origin. All presentation timestamps
  (renderTime, paint timing start time, event timing end time) will be coarsened to a 4ms multiple
  to mitigate the risk of reading cross-origin image information.
- Existing concepts: Coarsened renderTime, Coarsening resolver, LCP Attribution Builder, RUM
  dashboard for a third-party hero image
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Expose
    coarsened cross-origin renderTime in elment timing/LCP (regardless of TAO) can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Expose coarsened cross-origin renderTime in elment timing/LCP
    (regardless of TAO).

#### FileSystemObserver interface

- Path: `v133/filesystemobserver-interface/`
- Area: Storage, databases, and offline data
- Priority: High
- Current framing: The FileSystemObserver interface notifies websites of changes to the file system.
  Sites observe changes to files and directories, to which the user has previously granted
  permission, in the user's local device (as specified in WICG/file-system-access) or in the Bucket
  File System (as specified in whatwg/fs), and are notified of basic change info, such as the
- Existing concepts: FileSystemObserver, OPFS live editor — the inotify use case, Recursive
  directory watcher, Sync conflict detector
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for FileSystemObserver interface.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses FileSystemObserver
    interface in a realistic user workflow.

#### Fix mouse focus for slotted elements in Shadow DOM

- Path: `v133/fix-mouse-focus-for-slotted-elements-in-shadow-dom/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Currently, mouse-triggered event will traverse up to the parent or shadow host to
  find fallback element to receive mouse focus. This doesn't make sense for slotted content, where
  we expect the fallback element to receive focus to be the assigned slot, instead of its parent.
  This is fixed by changing that step to traverse the Flat Tree.
- Existing concepts: A real design-system input — clicking the label vs the field, Focus Matrix,
  Focus traversal trace, Slotted Mouse Focus
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Fix mouse focus for slotted elements in Shadow DOM.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Fix mouse focus for slotted elements in Shadow DOM
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Fix text selection on Shadow DOM with delegatesFocus

- Path: `v133/fix-text-selection-on-shadow-dom-with-delegatesfocus/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A shadow host with delegatesFocus set to true will delegate its focus to its
  first focusable child. On a mouse click event, the child will receive focus and the event will be
  marked as handled. No further event dispatching is done. This is a problem because the steps to
  handle text selection afterward are not ran and the selection does not recognize the foc
- Existing concepts: Drag-select inside a delegated-focus editor, delegatesFocus selection,
  Multi-component Selection, Selection state inside a delegatesFocus boundary
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Fix text selection on Shadow DOM with delegatesFocus.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Fix text selection on Shadow DOM with
    delegatesFocus behaves inside custom elements, shadow DOM, SPA routing, hydration, and
    accessibility trees.

#### Fluent Scrollbars.

- Path: `v133/fluent-scrollbars/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: This feature modernizes the Chromium scrollbars (both overlay and non-overlay) on
  Windows and Linux to fit the Windows 11 Fluent design language.
- Existing concepts: Fluent across light / dark / high contrast, scrollbar-color & scrollbar-width
  on Fluent scrollbars, Fluent Scrollbars, Scrollbar Anatomy
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Fluent Scrollbars is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Freezing on Energy Saver

- Path: `v133/freezing-on-energy-saver/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: When Energy Saver is active, Chrome will freeze a "browsing context group" that
  has been hidden and silent for >5 minutes if any subgroup of same-origin frames within it exceeds
  a CPU usage threshold, unless it:
- Existing concepts: CPU Threshold Explainer, Freeze on Energy Saver, Page lifecycle state machine,
  Save-on-freeze pattern
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Freezing on Energy Saver, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### IndexedDB getAllRecords() and direction option for getAll()/getAllKeys()

- Path: `v133/indexeddb-getallrecords-and-direction-option-for-getall-getallkeys/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: This feature adds the getAllRecords() API to IndexedDB's IDBObjectStore and
  IDBIndex. It also adds a direction parameter to getAll() and getAllKeys(). This functionality
  enables certain read patterns to be significantly faster when compared to the existing alternative
  of iteration with cursors. One key workload from a Microsoft property showed a 350ms imp
- Existing concepts: getAllRecords, Cursor vs getAllRecords — the 350ms Microsoft benchmark,
  Paginated Reader, Range query builder
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for IndexedDB getAllRecords() and direction option for
    getAll()/getAllKeys().
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses IndexedDB getAllRecords()
    and direction option for getAll()/getAllKeys() in a realistic user workflow.

#### Interest Invokers (the `interestfor` attribute)

- Path: `v133/interest-invokers-the-interestfor-attribute/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature adds an `interestfor` attribute to <button> and <a> elements. This
  attribute adds "interest" behaviors to the element, such that when the user "shows interest" in
  the element, actions are triggered on the target element, such as showing a popover. The user
  agent will handle detecting when the user "shows interest" in the element, via methods suc
- Existing concepts: Avatar hovercard — the Twitter / GitHub use case, interestfor, Keyboard, touch,
  and pointer triggers, Menu bar cascade
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Interest Invokers (the `interestfor` attribute).
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Interest Invokers (the `interestfor` attribute)
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Multiple import maps

- Path: `v133/multiple-import-maps/`
- Area: General web platform
- Priority: Medium
- Current framing: Import maps currently have to load before any ES module and there can only be a
  single import map per document. That makes them fragile and potentially slow to use in real-life
  scenarios: Any module that loads before them breaks the entire app, and in apps with many modules
  the become a large blocking resource, as the entire map for all possible modules need
- Existing concepts: Import Map Conflict Resolver, Incremental loading timeline, Microfrontend
  compose — two teams, two maps, Multiple Import Maps
- Suggested additions:
  - Capability probe and fallback explorer for Multiple import maps, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Partitioning Storage, Service Workers, and Communication APIs

- Path: `v133/partitioning-storage-service-workers-and-communication-apis/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Note: this has launched in Chrome 115
- Existing concepts: Partitioning probe — what's keyed by top-level site now?, Partition Key
  Explorer, SharedWorker and BroadcastChannel partitioning, Storage Partitioning
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Partitioning
    Storage, Service Workers, and Communication APIs can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Partitioning Storage, Service Workers, and Communication APIs.

#### popover=hint

- Path: `v133/popover-hint/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The Popover API (https://chromestatus.com/feature/5463833265045504) specifies the
  behavior for two values of the `popover` attribute: `auto` and `manual`. This feature describes a
  third value, `popover=hint`. Hints, which are most often associated with "tooltip" type behaviors,
  have slightly different behaviors. Primarily, the difference is that `hint`s are
- Existing concepts: Hover Pattern Guide, Hints coexist with menu popovers, popover=hint, Stack
  explorer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so popover=hint
    can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for popover=hint.

#### Popover invoker and anchor positioning improvements

- Path: `v133/popover-invoker-and-anchor-positioning-improvements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This chromestatus represents the following related set of changes, which were
  resolved in https://github.com/whatwg/html/pull/9144#issuecomment-2195095228 and landed in
  https://github.com/whatwg/html/pull/10728:
- Existing concepts: Toolbar menu — positioning without anchor names, Overflow Escape Demo, Popover
  invoker anchor, position-area grid
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Popover
    invoker and anchor positioning improvements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Popover invoker and anchor positioning improvements.

#### Popover nested inside invoker shouldn't re-invoke it

- Path: `v133/popover-nested-inside-invoker-shouldn-t-re-invoke-it/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: In this case:
- Existing concepts: Action Menu Inside Popover, Nested invoker click counter, Live toggle event
  log, Nested popover invoker
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Popover nested inside invoker shouldn't re-invoke it.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Popover nested inside invoker shouldn't re-invoke
    it behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Reference Target for Cross-root ARIA

- Path: `v133/reference-target-for-cross-root-aria/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Reference Target is a feature to enable using IDREF attributes such as `for` and
  `aria-labelledby` to refer to elements inside a component's shadow DOM, while maintaining
  encapsulation of the internal details of the shadow DOM. The main goal of this feature is to
  enable ARIA to work across shadow root boundaries.
- Existing concepts: ARIA Live Bridge, A combobox with external label and error, Listbox + fieldset
  across shadow roots, Reference Target
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Reference Target for Cross-root ARIA.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Reference Target for Cross-root ARIA behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Remove Chrome Welcome page triggering via initial prefs first run tabs

- Path: `v133/remove-chrome-welcome-page-triggering-via-initial-prefs-first-run-tabs/`
- Area: Deprecation and migration
- Priority: High
- Current framing: Including "chrome://welcome" in the "first_run_tabs" property of the
  "initial_preferences" file will now have no effect. This is removed because that page is redundant
  with the First Run Experience that triggers on desktop platforms.
- Existing concepts: What replaces chrome://welcome for enterprises, Enterprise Policy Validator,
  initial_preferences JSON builder, Welcome page removal
- Suggested additions:
  - Deprecation scanner: paste code/config and detect usage of Remove Chrome Welcome page triggering
    via initial prefs first run tabs, with severity, timeline, and affected browser versions.
  - Replacement playground: run the old pattern beside the recommended API or server behavior and
    show the user-visible difference.
  - Fleet readiness dashboard: checklist for enterprise/app teams, including telemetry, rollout
    gates, and rollback plans.

#### Remove <link rel=prefetch> five-minute rule

- Path: `v133/remove-link-rel-prefetch-five-minute-rule/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Previously, when a resource was prefetched using <link rel=prefetch>, we ignored
  its cache semantics (namely max-age and no-cache) for the first use within 5 minutes, to avoid
  refetching. Now, we remove this special case and use normal HTTP cache semantics.
- Existing concepts: Prefetched resources now obey Cache-Control, Migration Checklist, Prefetch
  5-min rule removal, Spec matrix & reuse predictor
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Remove
    <link rel=prefetch> five-minute rule can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Remove <link rel=prefetch> five-minute rule.

#### Resource timing: revert responseStart change and introduce firstResponseHeadersStart

- Path: `v133/resource-timing-revert-responsestart-change-and-introduce-firstresponseheadersst/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Resource timing: - responseStart returns the first response, either early hints
  (interim) or final - Expose the final response headers (2xx/4xx/5xx) time as
  finalResponseHeadersStart.
- Existing concepts: Early hints vs final response — on the same timeline,
  firstResponseHeadersStart, RUM Migration Guide, Timeline decoder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Resource
    timing: revert responseStart change and introduce firstResponseHeadersStart can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Resource timing: revert responseStart change and introduce
    firstResponseHeadersStart.

#### Secure Rust Font Stack

- Path: `v133/secure-rust-font-stack/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The Rust font stack for Chrome integrates the Fontations font libraries into
  Chromium as a safe replacement for FreeType (https://github.com/googlefonts/fontations/). This
  project is a collaboration between Chrome and Google Fonts.
- Existing concepts: Font Security Explainer, Glyph render probe — what Fontations now handles, Rust
  Font Stack, Variable font axes
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Secure Rust
    Font Stack can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Secure Rust Font Stack.

#### Storage Access Headers

- Path: `v133/storage-access-headers/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Offers an alternate way for authenticated embeds to opt in for unpartitioned
  cookies. These headers indicate whether unpartitioned cookies are (or can be) included in a given
  network request, and allow servers to activate 'storage-access' permissions they have already been
  granted. Giving an alternative way to activate the 'storage-access' permission allows
- Existing concepts: Header flow — the latency the API was designed to remove, Policy designer,
  Round-trip Comparison, Storage Access Headers
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Storage Access Headers, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Support creating ClipboardItem with Promise<DOMString>

- Path: `v133/support-creating-clipboarditem-with-promise-domstring/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: The ClipboardItem, which is the input to the async clipboard write method, now
  accepts string values in addition to Blobs in its constructor. ClipboardItemData can be a Blob, a
  string, or a Promise that resolves to either a Blob or a string.
- Existing concepts: Async screenshot copy — long render, user-gesture-bound copy, ClipboardItem
  with Promise, Deferred Content Lab, Multi-format clipboard builder
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Support creating ClipboardItem with
    Promise<DOMString>.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Support creating
    ClipboardItem with Promise<DOMString> in a realistic user workflow.

#### Web Authentication API: PublicKeyCredential’s getClientCapabilities() method

- Path: `v133/web-authentication-api-publickeycredential-s-getclientcapabilities-method/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: getClientCapabilities() method allows to determine which WebAuthn features are
  supported by the user's client. The method returns a list of supported capabilities, allowing
  developers to tailor authentication experiences and workflows based on the client's specific
  functionality.
- Existing concepts: Auth Flow Builder, WebAuthn getClientCapabilities, Conditional UI feature gate,
  WebAuthn capability matrix — tailor the sign-in UI to the device
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Web Authentication API: PublicKeyCredential’s getClientCapabilities() method, with every
    allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### WebAssembly Memory64

- Path: `v133/webassembly-memory64/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The memory64 proposal adds support for linear WebAssembly memories with size
  larger than 2^32 bits. It provides no new instructions, but instead extends the existing
  instructions to allow 64-bit indexes for memories and tables.
- Existing concepts: Address Space Explorer, i64 pointer toolbox, The 4 GB ceiling, broken, Wasm
  Memory64
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for WebAssembly Memory64, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: 1-component vertex formats (and unorm8x4-bgra)

- Path: `v133/webgpu-1-component-vertex-formats-and-unorm8x4-bgra/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Adds additional vertex formats not present in the initial release of WebGPU due
  to lack of support or old macOS versions (which are no longer supported by any browser). The
  1-component vertex formats lets applications request only the necessary data when previously they
  had to request at least 2x more for 8 and 16-bit data types. The unorm8x4-bgra format mak
- Existing concepts: Single-channel buffers — smaller, faster, BGRA-correct, Format calculator,
  Stride Optimizer, WebGPU 1-comp + BGRA vertex formats
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: 1-component vertex formats (and
    unorm8x4-bgra), chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### X25519 algorithm of the Web Cryptography API

- Path: `v133/x25519-algorithm-of-the-web-cryptography-api/`
- Area: General web platform
- Priority: Medium
- Current framing: The "X25519" algorithm provides tools to perform key agreement using the X25519
  function specified in [RFC7748]. The "X25519" algorithm identifier can be used in the SubtleCrypto
  interface to access the implemented operations: generateKey, importKey, exportKey, deriveKey and
  deriveBits.
- Existing concepts: Two-party ECDH handshake — using only WebCrypto, End-to-End Encrypted Message,
  JWK / SPKI round-trip, X25519 key agreement
- Suggested additions:
  - Capability probe and fallback explorer for X25519 algorithm of the Web Cryptography API, using
    feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

### v134

#### Allow reading interest groups in Shared Storage Worklet

- Path: `v134/allow-reading-interest-groups-in-shared-storage-worklet/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: An interestGroups() method is added to the shared storage worklet, to return the
  Protected Audience interest groups associated with the shared storage origin's owner, with some
  additional metadata.
- Existing concepts: Audience Segment Builder, Cross-campaign Deduplication, Interest Groups in
  Shared Storage Worklet, Reach measurement with a lookback window
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Allow reading interest groups in Shared Storage Worklet, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Attribution Reporting Feature: Remove Aggregatable report limit when trigger context ID is non-null

- Path: `v134/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: We are landing the following change to the Attribution Reporting API focused
  on: * Removing aggregatable report limit when trigger context ID is non-null
- Existing concepts: Aggregatable Report Limit Lifted, Per-conversion stream vs. capped batch,
  Trigger Context ID Builder, Trigger Volume Simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Attribution Reporting Feature: Remove Aggregatable report limit when trigger context ID is
    non-null, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Bounce Tracking Mitigations on HTTP Cache

- Path: `v134/bounce-tracking-mitigations-on-http-cache/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Bounce tracking mitigations for the HTTP cache is an extension to existing
  anti-bounce-tracking behavior. It removes the requirement that a suspected tracking site must have
  performed storage access in order to activate bounce tracking mitigations.
- Existing concepts: Bounce Tracking on HTTP Cache, The cache-only bounce tracker, Redirect Chain
  Visualizer, Tracker Survival Matrix
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Bounce Tracking Mitigations on HTTP Cache, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Camera Effects Status: Background Blur

- Path: `v134/camera-effects-status-background-blur/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Exposes read-only camera effect state on VideoFrameMetadata. This allows web
  developers to monitor changes in platform video effects like background blur. The pattern can be
  extended to support additional platform effects, such as lighting adjustments and auto face
  framing.
- Existing concepts: Background Blur Status, Double-blur warning, Effect Dashboard, Video Quality
  Advisor
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Camera Effects Status: Background
    Blur.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CSS Highlight Inheritance

- Path: `v134/css-highlight-inheritance/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: With CSS Highlight Inheritance, the CSS Highlight pseudo classes, such as
  ::selection and ::highlight, inherit their properties through the pseudo highlight chain, rather
  than the element chain. The result is a more intuitive model for inheritance of properties in
  highlights. Specifically, "When any supported property is not given a value by the cascade ...
- Existing concepts: Cascade Debugger, Custom Highlight API, Highlight Inheritance, Overlapping
  highlights
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS Highlight Inheritance.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS Highlight Inheritance behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS shape() function

- Path: `v134/css-shape-function/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: shape() allows responsive free-form shapes in clip-path.
- Existing concepts: Interpolated morphs, Path Builder, Responsive Clip Gallery, shape()
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS shape() function, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS shape() function helps or fails.

#### Customizable <select> Element

- Path: `v134/customizable-select-element/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Customizable <select> allows developers to take complete control of the rendering
  of <select> elements by adding the appearance:base-select CSS property.
- Existing concepts: Customizable Select, Multi-Style Gallery, Rich option content, Picker Anatomy
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Customizable <select>
    Element, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Customizable <select> Element helps or fails.

#### Dialog light dismiss

- Path: `v134/dialog-light-dismiss/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: One of the nice features of the Popover API is its light dismiss behavior. This
  chromestatus is about bringing that same capability to `<dialog>`. A new `closedby` attribute
  controls behavior: `<dialog closedby=none>` - no user-triggered closing of dialogs at all.
  `<dialog closedby=closerequest>` - user pressing ESC (or other close trigger) closes the di
- Existing concepts: closedby Matrix, CloseWatcher & Android Back, Dialog Light Dismiss, Popover
  parity test
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Dialog light dismiss.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Dialog light dismiss behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Digital Credentials API (presentation support)

- Path: `v134/digital-credentials-api-presentation-support/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Websites can and do get credentials from mobile wallet apps through a variety of
  mechanisms today (custom URL handlers, QR code scanning, etc.). This Web Platform feature would
  allow sites to request identity information from wallets via Android's IdentityCredential CredMan
  system. It is extensible to support multiple credential formats (eg. ISO mDoc and W3
- Existing concepts: Age-over-18 — selective disclosure, Credential Format Explorer, Digital
  Credentials — Presentation, Request Builder
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Digital Credentials API (presentation support), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Document-Policy: expect-no-linked-resources

- Path: `v134/document-policy-expect-no-linked-resources/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The expect-no-linked-resources configuration point in Document Policy allows a
  document to hint to the user agent to better optimize its loading sequence, such as not using the
  default speculative parsing behavior. User Agents have implemented speculative parsing of HTML to
  speculatively fetch resources that are present in the HTML markup, to speed up pag
- Existing concepts: expect-no-linked-resources, Header Impact Explorer, Policy Bundle Builder,
  Single-page app shell — measured savings
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    Document-Policy: expect-no-linked-resources can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Document-Policy: expect-no-linked-resources.

#### Document Subtitle (Fix PWA app titles)

- Path: `v134/document-subtitle-fix-pwa-app-titles/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Installed web apps can change the text on the title bar based on the page's
  content. The current behavior is that the installed web application will put the app's name from
  the manifest and append the page’s inner text from the `<title>` HTML tag in the head of the page.
  This often can create awkward titles for some web apps. This feature allows to specif
- Existing concepts: Alt-tab disambiguation for installed apps, Document Subtitle, State Stream,
  Title Bar Preview
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Document Subtitle (Fix PWA app titles) is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Error.isError

- Path: `v134/error-iserror/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Adds the Error.isError(obj) static method. It returns true for JS native errors
  and DOMExceptions, and false otherwise.
- Existing concepts: Cross-realm error check, Error Boundary Builder, Error.isError, Test Suite
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Error.isError.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Error.isError behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Explicit resource management (async)

- Path: `v134/explicit-resource-management-async/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature addresses a common pattern in software development regarding the
  lifetime and management of various resources (memory, I/O, etc.). This pattern generally includes
  the allocation of a resource and the ability to explicitly release critical resources.
- Existing concepts: Async Resource Monitor, AsyncDisposableStack, await using, Async transaction
  commit / rollback
- Suggested additions:
  - Capability probe and fallback explorer for Explicit resource management (async), using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Explicit resource management (sync)

- Path: `v134/explicit-resource-management-sync/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature addresses a common pattern in software development regarding the
  lifetime and management of various resources (memory, I/O, etc.). This pattern generally includes
  the allocation of a resource and the ability to explicitly release critical resources.
- Existing concepts: DisposableStack — many resources, one cleanup, SuppressedError, Resource Leak
  Detector, using
- Suggested additions:
  - Capability probe and fallback explorer for Explicit resource management (sync), using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Expose CSSFontFeaturesValueRule

- Path: `v134/expose-cssfontfeaturesvaluerule/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: We were accidentally missing the [Exposed=Window] on the CSSFontFeaturesValueRule
  interface, so window.CSSFontFeaturesValueRule is incorrectly undefined even though the API was
  otherwise exposed.
- Existing concepts: Font Feature Catalog, CSSFontFeaturesValueRule, Font Glyph Lab, Style-inspector
  tree from CSSOM
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Expose CSSFontFeaturesValueRule is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Extend the console.timeStamp API to support measurements and and presentation options

- Path: `v134/extend-the-console-timestamp-api-to-support-measurements-and-and-presentation-op/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature extends the console.timeStamp() API, in a backwards-compatible
  manner, to provide a high-performance method for instrumenting applications and surfacing timing
  data to the Performance panel in DevTools. Timing entries added with the API can have a custom
  timestamp, duration and presentation options (track / swimlane and color).
- Existing concepts: console.timeStamp+, Framework trace — own track, colored spans, Options
  Builder, Profiling Harness
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Extend the
    console.timeStamp API to support measurements and and presentation options can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Extend the console.timeStamp API to support measurements and and
    presentation options.

#### Link rel=facilitated-payment to support push payments

- Path: `v134/link-rel-facilitated-payment-to-support-push-payments/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Adds support for <link rel="facilitated-payment" href="..."> as a hint that the
  browser should notify registered payment clients about a pending push payment.
- Existing concepts: Payment Link Builder, rel="facilitated-payment", Scheme Comparison, UPI / PIX
  checkout
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Link rel=facilitated-payment to support push payments, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### LLM-powered on-device detection of abusive notifications on Android

- Path: `v134/llm-powered-on-device-detection-of-abusive-notifications-on-android/`
- Area: Built-in AI
- Priority: High
- Current framing: This launch aims to hide the contents of notifications that are suspected to be
  abusive. The user will then have the options to dismiss, show the notification, or unsubscribe
  from the origin. This detection is to be done by an on-device model.
- Existing concepts: Abusive Notification Filter, Notification Signal Map, Red-Team Bench, Live scam
  classifier with reveal flow
- Suggested additions:
  - Local-first workflow: build a concrete app flow around LLM-powered on-device detection of
    abusive notifications on Android such as redaction, triage, summarization, translation, or form
    assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### NavigateEvent sourceElement

- Path: `v134/navigateevent-sourceelement/`
- Area: General web platform
- Priority: Medium
- Current framing: When a navigation is initiated by an Element (i.e., a link click or a form
  submission), the sourceElement property on the NavigateEvent will be the initiating element.
- Existing concepts: Analytics Tracker, Form Router, NavigateEvent.sourceElement, Per-link loading
  indicator
- Suggested additions:
  - Capability probe and fallback explorer for NavigateEvent sourceElement, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### OffscreenCanvas getContextAttributes

- Path: `v134/offscreencanvas-getcontextattributes/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Add the getContextAttributes interface from CanvasRenderingContext2D to
  OffscreenCanvasRenderingContext2D.
- Existing concepts: Attribute Lab, Image Pipeline, OffscreenCanvas.getContextAttributes, Worker
  context settings — request vs. actual
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for OffscreenCanvas getContextAttributes, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Private Aggregation API: per-context contribution limits for Shared Storage callers

- Path: `v134/private-aggregation-api-per-context-contribution-limits-for-shared-storage-calle/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Enables Shared Storage callers to customize the number of contributions per
  Private Aggregation report.
- Existing concepts: Budget tuning — request more, request less, Multi-Caller Planner, Noise Padding
  Visualizer, Per-Context Contribution Limits
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Private Aggregation API: per-context contribution limits for Shared Storage callers, with every
    allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Protected Audience (B&A): Support multiple sellers in navigator.getInterestGroupAdAuctionData

- Path: `v134/protected-audience-b-a-support-multiple-sellers-in-navigator-getinterestgroupada/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Add support for navigator.getInterestGroupAdAuctionData to return the encrypted
  B&A request payload for multiple sellers in a single call. This allows multiple sellers sharing a
  single piece of on-page JavaScript to more efficiently run an auction.
- Existing concepts: Auction Flow Diagram, Multi-Seller B&A, Payload Inspector, Round-trip savings
  on a header-bidding page, Seller Batch Builder
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Protected Audience (B&A): Support multiple sellers in navigator.getInterestGroupAdAuctionData,
    with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Remove nonstandard getUserMedia audio constraints

- Path: `v134/remove-nonstandard-getusermedia-audio-constraints/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Blink supports a number of nonstandard goog-prefixed constraints for getUserMedia
  from some time before constraints were properly standardized.
- Existing concepts: Audio Settings Tester, Constraint Audit, Non-standard gUM Audio Constraints
  Removed, Migration codemod
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Remove nonstandard getUserMedia
    audio constraints.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Select parser relaxation

- Path: `v134/select-parser-relaxation/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This change makes the HTML parser allow additional tags in <select> besides
  <option>, <optgroup>, and <hr>.
- Existing concepts: Custom Option Builder, DOM Tree X-Ray, What the parser drops — before / after,
  Select Parser Relaxation
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Select parser relaxation.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Select parser relaxation behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Support ImageSmoothingQuality in PaintCanvas

- Path: `v134/support-imagesmoothingquality-in-paintcanvas/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Add support for the imageSmoothingQuality attribute on Paint Canvas. It allows a
  web developer to choose the quality/performance tradeoff when scaling images. There are 3 options
  in total for imageSmoothingQuality: low, medium and high. Chrome platform status entry for its
  launch on Canvas 2D: https://chromestatus.com/feature/4717415682277376
- Existing concepts: Diff Magnifier, ImageSmoothingQuality in PaintCanvas, Thumbnail Processor,
  Houdini upscale comparator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Support
    ImageSmoothingQuality in PaintCanvas can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Support ImageSmoothingQuality in PaintCanvas.

#### Support Web Locks API in Shared Storage

- Path: `v134/support-web-locks-api-in-shared-storage/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Today, concurrent execution of shared storage worklets in scenarios like
  cross-site reach measurement can result in duplicate reporting, due to the potential race
  conditions within the "get() and set()" logic. To address this issue, we propose integrating the
  Web Locks API into Shared Storage. Specifically, - Introduce navigator.locks.request to the work
- Existing concepts: Deduplicated reach measurement, Lock Contention Simulator, Race Replayer,
  Shared Storage + Web Locks
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Support Web Locks API in Shared Storage, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### User Navigation Capturing on Desktop

- Path: `v134/user-navigation-capturing-on-desktop/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Web links now direct users to installed web apps. This aligns with users'
  installed app expectations. Chrome makes it easier to move between the browser and installed web
  apps. Clicking a link that could be handled by an installed web app with the launch_handler field
  specified, the link will open in that installed web app, following the launch handling beha
- Existing concepts: launch_handler modes — focus-existing vs. new-window, Link Capture Tester,
  Manifest Simulator, Nav Capture on Desktop
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why User Navigation Capturing on Desktop is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### WebGPU Subgroups

- Path: `v134/webgpu-subgroups/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Adds subgroup functionality to WebGPU. Subgroup operations perform SIMT
  operations to provide efficient communication and data sharing among groups of invocations. These
  operations can be used to accelerate applications by reducing memory overheads incurred by
  inter-invocation communication.
- Existing concepts: Reduction: subgroups vs workgroup memory, Subgroup Ops Explorer, WebGPU
  Subgroups, WGSL Playground
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU Subgroups, chart frame time/memory/quality,
    and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

### v135

#### Add MediaStreamTrack support to the Web Speech API

- Path: `v135/add-mediastreamtrack-support-to-the-web-speech-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Add MediaStreamTrack support to the Web Speech API. The Web Speech API is a web
  standard API that allows developers to incorporate speech recognition and synthesis into their web
  pages. Currently, the Web Speech API uses the user's default microphone as the audio input.
  MediaStreamTrack support allows websites to use the Web Speech API to caption other so
- Existing concepts: Per-participant captions in one tab, Live transcription bench, Recognize from a
  MediaStreamTrack
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Add MediaStreamTrack support to the Web
    Speech API such as redaction, triage, summarization, translation, or form assistance with
    offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Align error type thrown for 'payment' WebAuthn credential creation: SecurityError => NotAllowedError

- Path: `v135/align-error-type-thrown-for-payment-webauthn-credential-creation-securityerror-n/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Correct the error type thrown during WebAuthn credential creation for 'payment'
  credentials. Due to a historic specification mismatch, creating a 'payment' credential in a
  cross-origin iframe without a user activation would throw a SecurityError instead of a
  NotAllowedError, which is what is thrown for non-payment credentials. This is a breaking change, a
- Existing concepts: Error name probe, SecurityError → NotAllowedError, Migration checklist for
  payment credential errors
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Align error type thrown for 'payment' WebAuthn credential creation: SecurityError =>
    NotAllowedError, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### ::column pseudo element for Carousel

- Path: `v135/column-pseudo-element-for-carousel/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A ::column pseudo element, which allows applying a limited set of styles to the
  generated fragments. Specifically, this would be limited to styles which do not affect the layout,
  and thus can be applied post-layout.
- Existing concepts: ::column live stage, Column outline studio, Snap-scrolling without per-slide
  wrappers
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for ::column pseudo element for
    Carousel, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where ::column pseudo element for Carousel helps or fails.

#### Create service worker client and inherit service worker controller for srcdoc iframe

- Path: `v135/create-service-worker-client-and-inherit-service-worker-controller-for-srcdoc-if/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Srcdoc context documents are currently not service worker clients and not covered
  by their parent’s service worker. That results in some discrepancies (e.g. Resource Timing reports
  the URLs that these document load, but service worker doesn’t intercept them). This aims to fix
  the discrepancies by creating service worker clients for srcdoc iframes and make t
- Existing concepts: srcdoc iframe is a real Service Worker client, srcdoc client tree probe, srcdoc
  iframes become SW clients
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Create
    service worker client and inherit service worker controller for srcdoc iframe can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Create service worker client and inherit service worker controller for
    srcdoc iframe.

#### CSS anchor positioning remembered scroll offset

- Path: `v135/css-anchor-positioning-remembered-scroll-offset/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Add support for the concept of "remembered scroll offset" - see
  https://drafts.csswg.org/css-anchor-position-1/#scroll When a positioned element has a default
  anchor, and is tethered to this anchor at one edge, and against the original containing block at
  the other edge, the scroll offset will be taken into account when it comes to sizing the element.
  Thi
- Existing concepts: Scroll. Watch the popover stay put., Scroll recovery lab, Side-by-side: with
  vs. without remembered offset
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CSS anchor
    positioning remembered scroll offset can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CSS anchor positioning remembered scroll offset.

#### CSS find-in-page highlight pseudos

- Path: `v135/css-find-in-page-highlight-pseudos/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature exposes **find-in-page** search result styling to authors as a
  highlight pseudo-element, like selection and spelling errors. This allows authors to change the
  foreground and background colors or add text decorations, which can be especially useful if the
  browser defaults have insufficient contrast with the page colors or are otherwise unsuitable
- Existing concepts: Find-in-page that respects your palette, Style your find-in-page, Search pseudo
  theme designer
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS find-in-page highlight pseudos.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS find-in-page highlight pseudos behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS Inertness

- Path: `v135/css-inertness/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The interactivity property specifies whether an element and its flat tree
  descendants (including text runs) are inert or not.
- Existing concepts: Focus Trap Builder, interactivity: inert, Inertness tree walker, Modal opens,
  page below freezes
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS Inertness.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS Inertness behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS Logical Overflow

- Path: `v135/css-logical-overflow/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The overflow-inline and overflow-block CSS properties allow setting overflow in
  inline and block direction relative to the writing-mode. In a horizontal writing-mode
  overflow-inline maps to overflow-x, while in a vertical writing-mode it maps to overflow-y.
- Existing concepts: overflow-inline / overflow-block, One carousel, three writing modes,
  Writing-mode overflow lab
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Logical Overflow, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Logical Overflow helps or fails.

#### CSS shape() function

- Path: `v135/css-shape-function/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: shape() allows responsive free-form shapes in clip-path.
- Existing concepts: Shape animation morph, clip-path: shape(), SVG path → shape() converter, Text
  wrap flow
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS shape() function, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS shape() function helps or fails.

#### Deprecate Mutation Events

- Path: `v135/deprecate-mutation-events/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Mutation Events, including `DOMSubtreeModified`, `DOMNodeInserted`,
  `DOMNodeRemoved`, `DOMNodeRemovedFromDocument`, `DOMNodeInsertedIntoDocument`, and
  `DOMCharacterDataModified`, are quite bad for page performance, and also significantly increase
  the complexity of adding new features to the Web. These APIs were deprecated from the spec
  (https://w3c.github.io
- Existing concepts: Mutation-event linter for your code, Mutation Events vs MutationObserver,
  MutationObserver recipe book
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate
    Mutation Events can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate Mutation Events.

#### Device Bound Session Credentials

- Path: `v135/device-bound-session-credentials/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: To enhance user security and combat session cookie theft, Chrome is introducing
  [Device Bound Session Credentials (DBSC)](https://developer.chrome.com/docs/web-platform/device-bound-session-credentials).
  This feature allows websites to bind a user's session to their specific device, which makes it
  significantly more difficult for stolen session cookies to be
- Existing concepts: DBSC live simulator, Cookie replay attack visualised, Session handshake
  walkthrough
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Device Bound Session Credentials, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Element Reflection

- Path: `v135/element-reflection/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature allows for ARIA relationship attributes to be reflected in IDL as
  element references rather than DOMStrings.
- Existing concepts: aria-*Elements live, Cross-tree reference graph, ARIA across shadow boundaries
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Element Reflection.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Element Reflection behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Enabling Web Applications to understand bimodal performance timings

- Path: `v135/enabling-web-applications-to-understand-bimodal-performance-timings/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Web applications may suffer from bimodal distribution in page load performance
  due to factors outside of the application’s control. For example, when a user agent first launches
  in a "cold start" scenario, it must perform many expensive initialization tasks that compete for
  system resources. Browser extensions can also affect performance, since some extensio
- Existing concepts: p50 vs p95 from one PerformanceObserver, Tell the user: this is a cold start,
  Bimodal histogram explorer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Enabling Web
    Applications to understand bimodal performance timings can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Enabling Web Applications to understand bimodal performance timings.

#### Fenced frames - Automatic beacon cross-origin data support

- Path: `v135/fenced-frames-automatic-beacon-cross-origin-data-support/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Fenced frames or URN iframes, if loaded through an API like Protected Audience or
  Shared Storage, can send out reporting beacons automatically if some event occurs (currently only
  top-level navigation beacons are supported). We previously tweaked this feature to allow
  cross-origin documents loaded in the root fenced frame's tree to send automatic beacons if
- Existing concepts: Automatic beacon builder, Fenced-frame auto-beacons, cross-origin, Cross-origin
  reporting payload, after the click
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Fenced frames - Automatic beacon cross-origin data support, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### fetchLater API

- Path: `v135/fetchlater-api/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: fetchLater() is a JavaScript API to request a deferred fetch. Once called in a
  document, a deferred request is queued by the browser in the PENDING state, and will be invoked by
  the earliest of the following conditions:
- Existing concepts: Analytics that survives an unload, Budget and priority lab, Queue a deferred
  request, Session Heartbeat
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so fetchLater
    API can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for fetchLater API.

#### Float16Array

- Path: `v135/float16array/`
- Area: General web platform
- Priority: Medium
- Current framing: Adds the Float16Array typed array. Number values are rounded to IEEE fp16 when
  writing into Float16Array instances.
- Existing concepts: Float16Array round-trip, Half-precision budget, Image tensor downsample — fp32
  vs fp16, Precision Visualizer
- Suggested additions:
  - Capability probe and fallback explorer for Float16Array, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Incoming Call Notifications

- Path: `v135/incoming-call-notifications/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Extend the Notifications API to allow installed PWA's to send incoming call
  notifications - i.e., notifications with call-styled buttons and a ringtone. This extension will
  help VoIP web apps to create more engaging experiences by making it easier for users to easily
  recognize a calling notification and answer it. Besides that, this feature will help bridge
- Existing concepts: Ring the user, gracefully, Call notification builder, Ringtone behaviour —
  silent, default, or custom
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Incoming Call Notifications is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Interest Invokers (the `interestfor` attribute)

- Path: `v135/interest-invokers-the-interestfor-attribute/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature adds an `interestfor` attribute to <button> and <a> elements. This
  attribute adds "interest" behaviors to the element, such that when the user "shows interest" in
  the element, actions are triggered on the target element, such as showing a popover. The user
  agent will handle detecting when the user "shows interest" in the element, via methods suc
- Existing concepts: Wikipedia-style glossary tooltips, Hover, focus, long-press → invoke, Keyboard
  and hover trace
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Interest Invokers (the `interestfor` attribute).
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Interest Invokers (the `interestfor` attribute)
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Invoker Commands; the command and commandfor attributes

- Path: `v135/invoker-commands-the-command-and-commandfor-attributes/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Adding command and commandfor attributes to <button> elements would allow authors
  to assign behaviour to buttons in a more accessible and declarative way, while reducing bugs and
  simplifying the amount of JavaScript pages are required to ship for interactivity. Buttons with
  commandfor and command attributes will - when clicked, touched, or enacted via keypre
- Existing concepts: Custom command protocol, Event delegation bench, command + commandfor, no JS,
  Custom buttons open native pickers
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Invoker Commands; the command and commandfor attributes.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Invoker Commands; the command and commandfor
    attributes behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility
    trees.

#### Language support for CanvasTextDrawingStyles

- Path: `v135/language-support-for-canvastextdrawingstyles/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The <canvas> DOM element, like all DOM elements, accepts a `lang` attribute that
  is used to define language specific treatment for font selection (when fonts have locale specific
  glyphs). Browsers respect this attribute. However, when an OffscreenCanvas is created there is no
  way to set locale information, possibly resulting in a state where an offscreen can
- Existing concepts: OffscreenCanvas locale, Same characters, three locales, Multilingual canvas
  test
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Language support for CanvasTextDrawingStyles, chart
    frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Link rel=facilitated-payment to support push payments

- Path: `v135/link-rel-facilitated-payment-to-support-push-payments/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Adds support for <link rel="facilitated-payment" href="..."> as a hint that the
  browser should notify registered payment clients about a pending push payment.
- Existing concepts: UPI / Pix-style push payment, end to end, Hint a push payment with one tag, UPI
  handshake walkthrough
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Link rel=facilitated-payment to support push payments, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### NavigateEvent sourceElement

- Path: `v135/navigateevent-sourceelement/`
- Area: General web platform
- Priority: Medium
- Current framing: When a navigation is initiated by an Element (i.e., a link click or a form
  submission), the sourceElement property on the NavigateEvent will be the initiating element.
- Existing concepts: Which element kicked off this navigation?, Which element navigated me?,
  Navigation source detective
- Suggested additions:
  - Capability probe and fallback explorer for NavigateEvent sourceElement, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Nested pseudo elements styling

- Path: `v135/nested-pseudo-elements-styling/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allows to style pseudo elements that are nested inside other pseudo elements. So
  far, support is defined for: ::before::marker ::after::marker With ::column::scroll-marker being
  supported in the future.
- Existing concepts: Double-nested pseudo stage, ::before::marker for declarative bullets, Style a
  ::before's ::first-letter
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Nested pseudo elements
    styling, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Nested pseudo elements styling helps or fails.

#### No-Vary-Search support for the HTTP disk cache

- Path: `v135/no-vary-search-support-for-the-http-disk-cache/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Enables the HTTP disk cache to use the No-Vary-Search response header to share a
  cache entry between URLs that differ only in the query parameters.
- Existing concepts: One cache entry, many query strings, No-Vary-Search cache key simulator,
  No-Vary-Search pattern builder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    No-Vary-Search support for the HTTP disk cache can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for No-Vary-Search support for the HTTP disk cache.

#### NotRestoredReasons API reason name change

- Path: `v135/notrestoredreasons-api-reason-name-change/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: NotRestoredReasons API has been launched as part of PerformanceNavigationTiming
  API.
- Existing concepts: BFCache reason names — the rename table, reason → reasons (or vice versa),
  Reason name migration tool
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    NotRestoredReasons API reason name change can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for NotRestoredReasons API reason name change.

#### Observable API

- Path: `v135/observable-api/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Observables are a popular reactive-programming paradigm to handle an asynchronous
  stream of push-based events. They can be thought of as Promises but for multiple events, and aim
  to do what Promises did for callbacks/nesting. That is, they allow ergonomic event handling by
  providing an Observable object that represents the asynchronous flow of events.
- Existing concepts: Search-as-you-type with takeUntil, IntersectionObserver as Observable,
  EventTarget.when(...).map().filter(), Operator playground
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Observable API.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Origin-keyed process isolation

- Path: `v135/origin-keyed-process-isolation/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 142 introduces a shift in the process isolation policy from locking
  processes to a site like `https://example.com` to locking them to a specific origin, such as,
  `https://foo.example.com`. To further enhance security, Chrome is moving to a more granular
  process isolation model called **Origin Isolation**. Previously, Chrome used **Site Isolation**, w
- Existing concepts: COOP / COEP recipe builder, Is this page origin-keyed?, Per-origin processes
  shrink the Spectre blast radius
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Origin-keyed
    process isolation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Origin-keyed process isolation.

#### RegExp.escape

- Path: `v135/regexp-escape/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: RegExp.escape is a static method that takes a string and returns an escaped
  version that may be used as a pattern inside a regular expression. For example, copied from the
  proposal explainer: ``` const str = prompt("Please enter a string"); const escaped =
  RegExp.escape(str); const re = new RegExp(escaped, 'g'); // handles reg exp special tokens wit
- Existing concepts: Code injection fuzzer, Dynamic Highlighter, RegExp.escape live, Safe glob
  builder
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for RegExp.escape.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how RegExp.escape behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Remove clamping of setInterval(...) to >= 1ms

- Path: `v135/remove-clamping-of-setinterval-to-1ms/`
- Area: Deprecation and migration
- Priority: High
- Current framing: Currently setInterval with a value less than 1 is clamped to 1. This intent
  removes that restriction.
- Existing concepts: setInterval(fn, 0), setInterval precision bench, Sub-millisecond setInterval,
  measured
- Suggested additions:
  - Deprecation scanner: paste code/config and detect usage of Remove clamping of setInterval(...)
    to >= 1ms, with severity, timeline, and affected browser versions.
  - Replacement playground: run the old pattern beside the recommended API or server behavior and
    show the user-visible difference.
  - Fleet readiness dashboard: checklist for enterprise/app teams, including telemetry, rollout
    gates, and rollback plans.

#### Remove deprecated navigator.xr.supportsSession method

- Path: `v135/remove-deprecated-navigator-xr-supportssession-method/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: navigator.xr.supportsSession was replaced in the WebXR spec by the
  navigator.xr.isSessionSupported method in September of 2019 after receiving feedback on the API
  shape from the TAG. It has been marked as deprecated in Chromium since then, producing a console
  warning redirecting developers to the updated API. Usage of the call is very low, as shown here:
- Existing concepts: One-shot rewrite to the modern API, XR supportsSession codemod explorer, Use
  isSessionSupported
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Remove
    deprecated navigator.xr.supportsSession method can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Remove deprecated navigator.xr.supportsSession method.

#### Remove WebGPU limit maxInterStageShaderComponents

- Path: `v135/remove-webgpu-limit-maxinterstageshadercomponents/`
- Area: Graphics, GPU, XR, and canvas
- Priority: High
- Current framing: The maxInterStageShaderComponents limit is being removed due to a combination of
  factors: - Redundancy with maxInterStageShaderVariables: This limit already serves a similar
  purpose, controlling the amount of data passed between shader stages. - Minor Discrepancies: While
  there are slight differences in how the two limits are calculated, these differences ar
- Existing concepts: Limit budget explorer, Live limits probe of your WebGPU device, What's left of
  GPUSupportedLimits
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for Remove WebGPU limit maxInterStageShaderComponents,
    chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### safe-area-max-inset-* variables

- Path: `v135/safe-area-max-inset-variables/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: In https://chromestatus.com/feature/5174306712322048 we've added dynamic safe
  area insets which can change as the user interacts with the device. This proposal amends the
  general safe area feature to add max-area-safe-inset-* variants of the variables which do not
  change and represent the maximum possible safe area inset. The use case this solves is to av
- Existing concepts: Inset snapshot stage, Static "max" safe-area variables, Why the bottom bar used
  to jitter on scroll
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    safe-area-max-inset-* variables can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for safe-area-max-inset-* variables.

#### ::scroll-button() pseudo elements

- Path: `v135/scroll-button-pseudo-elements/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allow the creation of interactive scroll buttons as pseudo-elements, e.g.
- Existing concepts: Gallery Navigator, Keyboard, focus, and announced direction, ::scroll-button()
  in the wild, ::scroll-button style foundry
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for ::scroll-button() pseudo
    elements, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where ::scroll-button() pseudo elements helps or fails.

#### ::scroll-marker and ::scroll-marker-group for Carousel

- Path: `v135/scroll-marker-and-scroll-marker-group-for-carousel/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: ::scroll-marker and ::scroll-marker-group for scrolling containers: Pseudo
  elements that allow to create a set of focusable markers for all of the associated items within
  the scrolling container.
- Existing concepts: Scroll marker style foundry, Numbered pagination from a CSS counter, Marker
  dots for a carousel
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for ::scroll-marker and
    ::scroll-marker-group for Carousel, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where ::scroll-marker and ::scroll-marker-group for
    Carousel helps or fails.

#### Secure Payment Confirmation: Browser Bound Keys

- Path: `v135/secure-payment-confirmation-browser-bound-keys/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Adds an additional cryptographic signature over Secure Payment Confirmation
  assertions and credential creation. The corresponding private key is not synced across devices.
  This helps web developers meet requirements for device binding for payment transactions.
- Existing concepts: Two signatures, one click, Key lifecycle explorer, The "non-syncing" key in SCA
  / PSD2 regulation
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Secure Payment Confirmation: Browser Bound Keys, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Service Worker client URL ignore history.pushState changes

- Path: `v135/service-worker-client-url-ignore-history-pushstate-changes/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Modify the service worker Client.url property to ignore document URL changes via
  history.pushState() and other similar history APIs. The Client.url property is intended to be the
  creation URL of the HTML document which ignores such changes.
- Existing concepts: Route mismatch detective, Why your SPA route used to confuse
  clients.openWindow, Client.url ignores pushState
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Service
    Worker client URL ignore history.pushState changes can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Service Worker client URL ignore history.pushState changes.

#### Signature-based Integrity

- Path: `v135/signature-based-integrity/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature provides web developers with a mechanism to verify the provenance of
  resources they depend upon, creating a technical foundation for trust in a site's dependencies. In
  short: servers can sign responses with a Ed25519 key pair, and web developers can require the user
  agent to verify the signature using a specific public key. This offers a helpful
- Existing concepts: Detect a swapped CDN bundle, Integrity pipeline, Sign a script. Verify in the
  browser.
- Suggested additions:
  - Capability probe and fallback explorer for Signature-based Integrity, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Speculation rules: target_hint field

- Path: `v135/speculation-rules-target-hint-field/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This extends speculation rules syntax to allow developers to specify the
  target_hint field.
- Existing concepts: Pre-rendering for links that open in a new tab, Speculation rules with
  target_hint, target_hint router
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: target_hint field can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: target_hint field.

#### Support rel / relList attributes for SVGAElement

- Path: `v135/support-rel-rellist-attributes-for-svgaelement/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The SVGAElement interface in SVG 2.0 allows manipulation of <a> elements similar
  to HTML anchor elements. Supporting the rel and relList attributes enhances security and privacy
  for developers. This alignment with HTML anchor elements ensures consistency and ease of use
  across web technologies.
- Existing concepts: SVG anchors finally match HTML anchors, SVG anchors get rel/relList, SVG anchor
  rel playground
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Support rel / relList attributes for SVGAElement, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Timestamps for RTC Encoded Frames

- Path: `v135/timestamps-for-rtc-encoded-frames/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature consists in exposing to the Web some timestamps that are present in
  WebRTC encoded frames transmitted via RTCPeerConnection. The timestamps in question are: -Capture
  timestamp: the timestamp when a frame was originally captured -Receive timestamp: the timestamp
  when a frame was received
- Existing concepts: RTCEncodedFrame.timestamp, Jitter budget — the use case for capture/receive
  timestamps, Sync-scope detective
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Timestamps for RTC Encoded Frames.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Update HTTP request headers, body, and referrer policy on CORS redirect

- Path: `v135/update-http-request-headers-body-and-referrer-policy-on-cors-redirect/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Update the HTTP request on CORS redirect by removing the request-body-headers and
  body if the method has changed, and updating the referrer policy. These request updates align with
  the Fetch spec and match the behavior implemented by Firefox and Safari to improve compatibility.
- Existing concepts: Request rewrite on CORS redirect, What happens to your headers on a 303
  redirect, Redirect chain inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Update HTTP
    request headers, body, and referrer policy on CORS redirect can be observed instead of
    described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Update HTTP request headers, body, and referrer policy on CORS
    redirect.

### v136

#### Add support for video frame orientation metadata to WebCodecs

- Path: `v136/add-support-for-video-frame-orientation-metadata-to-webcodecs/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Introduces "rotation: int" and "flip: bool" values to various video related
  interfaces in WebCodecs so that developers can work with frame sources that have orientation
  (E.g., Android cameras, certain media). The VideoFrame interface grows the ability to create
  VideoFrames with arbitrary rotation and flip as well as accessors for this information on the V
- Existing concepts: Encoder round-trip, Orientation Mixer, VideoFrame orientation
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Add support for video frame
    orientation metadata to WebCodecs.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Audio Output Devices API: setPreferredSinkId()

- Path: `v136/audio-output-devices-api-setpreferredsinkid/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Adds setPreferredSinkId() to MediaDevices, which enables a top-level frame to
  override the default audio output device for all audio renderers in the top-level frame and its
  child frames, including cross-origin child frames. Audio renderers include HTML <media> elements
  and web audio contexts.
- Existing concepts: Iframe inherits sink, setPreferredSinkId, Multi-track Sink Switcher
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Audio Output Devices API:
    setPreferredSinkId().
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### AudioContext Interrupted State

- Path: `v136/audiocontext-interrupted-state/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: The current Web Audio API lacks a mechanism for the User Agent (UA) to interrupt
  playback for scenarios such as exclusive audio access (VoIP) or when a laptop lid is closed. To
  address this, we propose adding an "interrupted" state to AudioContextState. This new state would
  allow the UA to pause playback in these scenarios and enable web applications to resp
- Existing concepts: AudioContext interrupted, State Machine Visualiser, VoIP-style pause & resume
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for AudioContext Interrupted State.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Captured Surface Control

- Path: `v136/captured-surface-control/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: A Web API that allows Web applications to: 1. Forward wheel events to a captured
  tab. 2. Read and change the zoom level of a captured tab.
- Existing concepts: Remote Cursor, Captured Surface Control, Wheel passthrough, Zoom Coach
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Captured Surface Control.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CapturedSurfaceResolution

- Path: `v136/capturedsurfaceresolution/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Expose pixel ratio of the captured surface while screensharing.
- Existing concepts: Bandwidth saver, Resolution Budget Calculator, CapturedSurfaceResolution
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for CapturedSurfaceResolution.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Corner shaping (corner-shape, superellipse, squircle)

- Path: `v136/corner-shaping-corner-shape-superellipse-squircle/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Enable styling corners, on top of the existing border-radius, by expressing the
  shape/curvature of the corner as a superellipse.
- Existing concepts: Animated Morpher, Icon Grid & Chat Bubbles, Shape Explorer, Squircle
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Corner shaping (corner-shape,
    superellipse, squircle), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Corner shaping (corner-shape, superellipse,
    squircle) helps or fails.

#### CSS dynamic-range-limit property

- Path: `v136/css-dynamic-range-limit-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Enables a page to limit the maximum brightness of HDR content.
- Existing concepts: dynamic-range-limit, HDR Gallery focus mode, Limit Mixer
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS dynamic-range-limit
    property, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS dynamic-range-limit property helps or fails.

#### Deprecate special font size rules for H1 within some elements

- Path: `v136/deprecate-special-font-size-rules-for-h1-within-some-elements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The HTML spec contains a list of special rules for <h1> tags nested within
  <article>, <aside>, <nav>, or <section> tags:
  https://html.spec.whatwg.org/multipage/rendering.html#sections-and-headings These special rules
  are deprecated, because they cause accessibility issues. Namely, they visually reduce the font
  size for nested <h1>s so that they "look"
- Existing concepts: Accessibility tree mismatch, H1 special UA rules, Sectioning Audit
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate
    special font size rules for H1 within some elements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate special font size rules for H1 within some elements.

#### Dispatching click events to captured pointer

- Path: `v136/dispatching-click-events-to-captured-pointer/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: If a pointer is captured while the `pointerup` event is being dispatched, the
  `click` event will be dispatched to the captured target instead of the nearest common ancestor of
  `pointerdown` and `pointerup` events as per the UI Event spec.
- Existing concepts: Captured pointer click, Drawing Canvas, Slider thumb drag
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Dispatching click events to captured pointer.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Enabling Web Applications to understand bimodal performance timings

- Path: `v136/enabling-web-applications-to-understand-bimodal-performance-timings/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Web applications may suffer from bimodal distribution in page load performance
  due to factors outside of the application’s control. For example, when a user agent first launches
  in a "cold start" scenario, it must perform many expensive initialization tasks that compete for
  system resources. Browser extensions can also affect performance, since some extensio
- Existing concepts: Bimodal Timing, Cold-vs-warm histogram, LCP Debugger
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Enabling Web
    Applications to understand bimodal performance timings can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Enabling Web Applications to understand bimodal performance timings.

#### Explicit Compile Hints with Magic Comments

- Path: `v136/explicit-compile-hints-with-magic-comments/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Allow attaching information about which functions should be eager parsed &
  compiled in JavaScript files.
- Existing concepts: Compile Hints, Critical bundle annotator, Hint Inspector
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Explicit Compile Hints with Magic Comments.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Explicit Compile Hints with Magic Comments behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### FedCM: Alternative Fields in Account Selection

- Path: `v136/fedcm-alternative-fields-in-account-selection/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Adds support for phone numbers and usernames, in addition to or instead of a
  user's full name and email address as identifiers for disambiguating accounts in the account
  selector. Also, makes these new fields available for websites to affect the disclosure text.
- Existing concepts: Account Card Builder, FedCM alt fields, Phone-only IdP
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM: Alternative Fields in Account Selection, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### FedCM multi IDP in single get() call and remove add accounts in passive mode

- Path: `v136/fedcm-multi-idp-in-single-get-call-and-remove-add-accounts-in-passive-mode/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Allows FedCM to show multiple identity providers in the same dialog. This
  provides developers with a convenient way to present all supported identity providers to users. We
  are planning to first tackle the simple case of having all providers in the same get() call.
- Existing concepts: IdP List Composer, FedCM Multi-IdP, Passive-mode "add account" removal
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM multi IDP in single get() call and remove add accounts in passive mode, with every
    allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Fluent Scrollbars.

- Path: `v136/fluent-scrollbars/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: This feature modernizes the Chromium scrollbars (both overlay and non-overlay) on
  Windows and Linux to fit the Windows 11 Fluent design language.
- Existing concepts: Author overrides, Density Explorer, Fluent scrollbars
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Fluent Scrollbars is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### H265 (HEVC) codec support in WebRTC

- Path: `v136/h265-hevc-codec-support-in-webrtc/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This newer codec has increased compression efficiency (higher quality per
  bitrate) relative to older generation codecs like VP8 and H264 and very strong hardware support
  going back over a decade. This translates into increased battery life and reduced risk of
  performance issues, and, depending on the performance of the underlying hardware encoder, will
  often
- Existing concepts: Codec negotiation, HEVC in WebRTC, Profile Picker
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so H265 (HEVC)
    codec support in WebRTC can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for H265 (HEVC) codec support in WebRTC.

#### H26x Codec support updates for MediaRecorder

- Path: `v136/h26x-codec-support-updates-for-mediarecorder/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chromium's MediaRecorder API now supports HEVC encoding, introducing the hvc1.*
  codec string, and adds new codecs (hev1.* and avc3.*) supporting variable resolution video in MP4.
  Support for HEVC platform encoding was added in WebCodecs in Chromium M130. As a follow-up,
  support has been added to the MediaRecorder API in Chromium. The API now supports both
- Existing concepts: Codec String Builder, MediaRecorder HEVC, Variable resolution recording
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for H26x Codec support updates for
    MediaRecorder.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Incorporating navigation initiator into the HTTP cache partition key

- Path: `v136/incorporating-navigation-initiator-into-the-http-cache-partition-key/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome’s HTTP cache keying scheme will be updated to include an
  “is-cross-site-main-frame-navigation” boolean to mitigate cross-site leak attacks involving
  top-level navigation. Specifically, this will prevent cross-site attacks in which an attacker can
  initiate a top-level navigation to a given page and then navigate to a resource known to be loaded
  by the
- Existing concepts: Cross-site leak sim, Cache partition key, Partition Key Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Incorporating
    navigation initiator into the HTTP cache partition key can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Incorporating navigation initiator into the HTTP cache partition key.

#### Language support for CanvasTextDrawingStyles

- Path: `v136/language-support-for-canvastextdrawingstyles/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The <canvas> DOM element, like all DOM elements, accepts a `lang` attribute that
  is used to define language specific treatment for font selection (when fonts have locale specific
  glyphs). Browsers respect this attribute. However, when an OffscreenCanvas is created there is no
  way to set locale information, possibly resulting in a state where an offscreen can
- Existing concepts: Canvas lang, Han Comparator, OffscreenCanvas in worker
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Language support for CanvasTextDrawingStyles, chart
    frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Partitioning :visited links history

- Path: `v136/partitioning-visited-links-history/`
- Area: General web platform
- Priority: Medium
- Current framing: To eliminate user browsing history leaks, anchor elements are styled as :visited
  only if they have been clicked from this top-level site and frame origin before. On the
  browser-side, this means that the VisitedLinks hashtable is now partitioned via "triple-keying",
  or by storing the following for each visited link: <link URL, top-level site, frame origin>. B
- Existing concepts: Same-origin self-link exception, Visited Attack Replay, Visited Partitioning
- Suggested additions:
  - Capability probe and fallback explorer for Partitioning :visited links history, using
    CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Permissions Policy reports for iframes

- Path: `v136/permissions-policy-reports-for-iframes/`
- Area: General web platform
- Priority: High
- Current framing: Introduces a new violation type called "Potential Permissions Policy violation",
  which will only look at Permissions Policy (including report-only policy) and the allow attribute
  set in iframes to detect the conflict between Permissions Policy enforced vs permissions
  propagated to iframes.
- Existing concepts: PP iframe reports, Policy Fuzzer, Report listener
- Suggested additions:
  - Capability probe and fallback explorer for Permissions Policy reports for iframes, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Protected audience: text conversion helpers

- Path: `v136/protected-audience-text-conversion-helpers/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Protected Audience bidding and scoring scripts that interface with WebAssembly
  need to efficiently convert string-typed data to (and from) byte arrays (e.g. to pass strings into
  and out of WebAssembly via the “memory” ArrayBuffer). This provides two standalone functions,
  protectedAudience.encodeUtf8, and protectedAudience.decodeUtf8 to perform these tasks ab
- Existing concepts: Encoder Playground, PA text helpers, WASM bid round-trip
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Protected audience: text conversion helpers, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### RegExp.escape

- Path: `v136/regexp-escape/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: RegExp.escape is a static method that takes a string and returns an escaped
  version that may be used as a pattern inside a regular expression. For example, copied from the
  proposal explainer: ``` const str = prompt("Please enter a string"); const escaped =
  RegExp.escape(str); const re = new RegExp(escaped, 'g'); // handles reg exp special tokens wit
- Existing concepts: Multi-term Highlighter, Path & Glob Builder, RegExp.escape, Template Tag
  Helpers
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for RegExp.escape.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how RegExp.escape behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Remove HTMLFencedFrameElement.canLoadOpaqueURL().

- Path: `v136/remove-htmlfencedframeelement-canloadopaqueurl/`
- Area: JavaScript, DOM, and HTML platform
- Priority: High
- Current framing: canLoadOpaqueURL() was replaced with navigator.canLoadAdAuctionFencedFrame() in
  2023, and calling it has resulted in a deprecation console warning ever since pointing developers
  to the new API. It does not make sense to have the function attached to `HTMLFencedFrameElement`
  and instead should be attached to the `navigator` object (which contains other fenced
- Existing concepts: canLoadOpaqueURL removed, Legacy Codebase Scanner, Migration probe
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Remove HTMLFencedFrameElement.canLoadOpaqueURL().
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Remove HTMLFencedFrameElement.canLoadOpaqueURL()
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Rename `string` attr() type to `raw-string`

- Path: `v136/rename-string-attr-type-to-raw-string/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: In https://github.com/w3c/csswg-drafts/issues/11645#issuecomment-2701601350 it
  was resolved to replace `string` attr() type with `raw-string`, see:
  https://drafts.csswg.org/css-values-5/#attr-notation. Change attr() syntax, so that
  `attr(data-foo string)` will now become `attr(data-foo raw-string)`.
- Existing concepts: attr() raw-string, raw-string Tester, Syntax migration
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Rename
    `string` attr() type to `raw-string` can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Rename `string` attr() type to `raw-string`.

#### 'request-close' Invoker Command

- Path: `v136/request-close-invoker-command/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Dialog elements can be closed through a variety of mechanisms, sometimes
  developers want to have the ability to prevent closure. To achieve this dialogs fire a cancel
  event. Originally this was only fired via a close request (e.g. ESC key press), recently a
  `requestClose()` JS function was added which also fires the cancel event. The 'request-close'
  comma
- Existing concepts: Cancel Event Tracer, request-close, Unsaved-changes confirmation
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for 'request-close' Invoker Command.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how 'request-close' Invoker Command behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Speculation rules: tag field

- Path: `v136/speculation-rules-tag-field/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This enables developers to add tag field to speculation rules. This optional
  field can be used to track the source of speculation rules, e.g. to treat them differently at an
  intermediary server. Any tags associated with a speculation will be sent with the
  Sec-Speculation-Tags header.
- Existing concepts: Speculation rules tag, Server-side routing, Tag Header Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: tag field can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: tag field.

#### Structured Headings, the headingoffset & headingreset attributes, and the :heading pseudo class

- Path: `v136/structured-headings-the-headingoffset-headingreset-attributes-and-the-heading-ps/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A system for creating structured headings within a document.
- Existing concepts: Article Outliner, Structured Headings, UGC embed
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Structured Headings, the
    headingoffset & headingreset attributes, and the :heading pseudo class, with live before/after
    rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Structured Headings, the headingoffset &
    headingreset attributes, and the :heading pseudo class helps or fails.

#### Type-agnostic var() fallback

- Path: `v136/type-agnostic-var-fallback/`
- Area: General web platform
- Priority: Medium
- Current framing: The fallback part of a var() function does not validate against the type of the
  custom property being referenced.
- Existing concepts: Fallback Type Matrix, Registered property rescue, Type-agnostic var()
- Suggested additions:
  - Capability probe and fallback explorer for Type-agnostic var() fallback, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Unprefixed print-color-adjust

- Path: `v136/unprefixed-print-color-adjust/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The print-color-adjust allows adjusting colors in printed web pages. This is the
  same as Chromium's already-supported -webkit-print-color-adjust, but with a standardized name.
- Existing concepts: Dark-mode print, print-color-adjust, Print Preview Lab
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Unprefixed
    print-color-adjust, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Unprefixed print-color-adjust helps or fails.

#### Update ProgressEvent to use double type for 'loaded' and 'total'

- Path: `v136/update-progressevent-to-use-double-type-for-loaded-and-total/`
- Area: General web platform
- Priority: Medium
- Current framing: The ProgressEvent has attributes `loaded` and `total` indicating the progress,
  and their type is `unsigned long long` now. With this feature, the type for these two attributes
  is changed to `double` instead, which gives the developer more control over the value. For
  example, the developers can now create a ProgressEvent with the `total` of 1 and the `load
- Existing concepts: AI streaming progress, Overflow Stress Test, ProgressEvent double
- Suggested additions:
  - Capability probe and fallback explorer for Update ProgressEvent to use double type for 'loaded'
    and 'total', using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Use DOMPointInit for getCharNumAtPosition, isPointInFill, isPointInStroke

- Path: `v136/use-dompointinit-for-getcharnumatposition-ispointinfill-ispointinstroke/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: This change brings Chromium code in line with the latest W3C spec for
  SVGGeometryElement and SVGPathElement in terms of usage of DOMPointInit over SVGPoint for
  getCharNumAtPosition, isPointInFill, isPointInStroke.
- Existing concepts: Hit-test overlay, Method Explorer, SVG DOMPointInit
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Use DOMPointInit for getCharNumAtPosition,
    isPointInFill, isPointInStroke, chart frame time/memory/quality, and compare graceful fallback
    implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Web Authentication Conditional Create (Automatic Passkey Upgrades)

- Path: `v136/web-authentication-conditional-create-automatic-passkey-upgrades/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: WebAuthn Conditional Create allows websites to automatically create passkeys for
  existing users that have a matching password saved in their password manager.
- Existing concepts: Auto Passkey upgrade, Password fill triggers upgrade, Upgrade Decision Tree
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Web Authentication Conditional Create (Automatic Passkey Upgrades), with every allowed/blocked
    branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Web Authentication Immediate UI mode

- Path: `v136/web-authentication-immediate-ui-mode/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: A new mode for navigator.credentials.get() that causes browser sign-in UI to be
  displayed to the user if there is a passkey or password for the site that is immediately known to
  the browser, or else rejects the promise with NotAllowedError if there is no such credential
  available. This allows the site to avoid showing a sign-in page if the browser can offer
- Existing concepts: Error Decision Flow, WebAuthn immediate UI, Mediation Matrix, No-passkey
  fallback
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Web Authentication Immediate UI mode, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### WebGPU: copyBufferToBuffer overload

- Path: `v136/webgpu-copybuffertobuffer-overload/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. The
  GPUCommandEncoder copyBufferToBuffer() method now includes a simpler way to copy entire buffers
  using a new overload with optional offsets and size parameters.
- Existing concepts: Copy Graph, copyBufferToBuffer overload, Migration diff
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: copyBufferToBuffer overload, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU 'core-features-and-limits'

- Path: `v136/webgpu-core-features-and-limits/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The 'core-features-and-limits' feature signifies a WebGPU adapter and device
  support the core features and limits of the spec.
- Existing concepts: Compat mode comparison, core-features-and-limits, Feature Matrix, Limit Shopper
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU 'core-features-and-limits', chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: GPUAdapterInfo isFallbackAdapter attribute

- Path: `v136/webgpu-gpuadapterinfo-isfallbackadapter-attribute/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. The
  GPUAdapterInfo isFallbackAdapter boolean attribute indicates if an adapter has significant
  performance limitations in return for wider compatibility, more predictable behavior, and/or
  improved privacy. Note that a fallback adapter may not be present on all systems.
- Existing concepts: Adapter Strategy, Library-side detect, isFallbackAdapter
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    WebGPU: GPUAdapterInfo isFallbackAdapter attribute, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### WebGPU: GPUTextureView for externalTexture binding

- Path: `v136/webgpu-gputextureview-for-externaltexture-binding/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. A
  GPUTextureView is now allowed to be used for an externalTexture binding when creating a
  GPUBindGroup.
- Existing concepts: Binding Compatibility Table, external texture view, Intermediate buffer
  pipeline
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: GPUTextureView for externalTexture binding,
    chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

### v137

#### Align error type thrown for 'payment' WebAuthn credential creation: SecurityError => NotAllowedError

- Path: `v137/align-error-type-thrown-for-payment-webauthn-credential-creation-securityerror-n/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Correct the error type thrown during WebAuthn credential creation for 'payment'
  credentials. Due to a historic specification mismatch, creating a 'payment' credential in a
  cross-origin iframe without a user activation would throw a SecurityError instead of a
  NotAllowedError, which is what is thrown for non-payment credentials. This is a breaking change, a
- Existing concepts: WebAuthn error decoder, Payment WebAuthn: error rename, SPC Error Probe
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Align error type thrown for 'payment' WebAuthn credential creation: SecurityError =>
    NotAllowedError, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Allow <use> to reference an external document's root element by omitting the fragment.

- Path: `v137/allow-use-to-reference-an-external-document-s-root-element-by-omitting-the-fragm/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: In this feature, we are streamlining the SVG <use> element by loosening
  referencing requirements. Currently, authors need to explicitly reference fragments within the SVG
  document. If no fragment id is given <use> will not be able to resolve the target and nothing will
  be rendered/referred.
- Existing concepts: Icon Swap, Sprite router, <use> root reference
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Allow <use> to reference an external document's root element
    by omitting the fragment.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Blob URL Partitioning: Fetching/Navigation

- Path: `v137/blob-url-partitioning-fetching-navigation/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: As a continuation of Storage Partitioning, Chromium will implement partitioning
  of Blob URL access by Storage Key (top-level site, frame origin, and the has-cross-site-ancestor
  boolean), with the exception of top-level navigations which will remain partitioned only by frame
  origin. This behavior is similar to what’s currently implemented by both Firefox and
- Existing concepts: Blob URL Partitioning, Cross-site Blob Navigation, Partition inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Blob URL
    Partitioning: Fetching/Navigation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Blob URL Partitioning: Fetching/Navigation.

#### Call stacks in crash reports from unresponsive web pages

- Path: `v137/call-stacks-in-crash-reports-from-unresponsive-web-pages/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature captures the JS call stack when a web page becomes unresponsive due
  to JavaScript code running an infinite loop or other very long computation. This helps developers
  to identify the cause of the unresponsiveness and fix it more easily. The JS call stack is
  included in the crash reporting API when the reason is unresponsive.
- Existing concepts: Crash Stack in Unresponsive-Page Reports, Endpoint Inbox, Report viewer
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Call stacks in crash reports from unresponsive web pages.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Canvas Floating Point Color Types

- Path: `v137/canvas-floating-point-color-types/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Introduce the the ability to use floating point pixel formats (as opposed to
  8-bit fixed point) with CanvasRenderingContext2D, OffscreenCanvasRenderingContext2D, and
  ImageData.
- Existing concepts: Canvas Floating Point Color, Exposure Stops, Tonemap studio
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Canvas Floating Point Color Types, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### CSS if() function

- Path: `v137/css-if-function/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: The CSS if() function provides a concise way to express conditional values. It
  accepts a series of condition-value pairs, delimited by semicolons. The function evaluates each
  condition sequentially and returns the value associated with the first true condition. If none of
  the conditions evaluate to true, the function returns an empty token stream. This allow
- Existing concepts: Component Variants, if(), if() resolver, Responsive Tokens with if(media())
- Suggested additions:
  - Device/session probe: read CSS.supports(), request permissions, and show live track/session
    state transitions for CSS if() function.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CSS reading-flow, reading-order properties

- Path: `v137/css-reading-flow-reading-order-properties/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The reading-flow CSS property controls the order in which elements in a flex,
  grid or block layout are exposed to accessibility tools and focused via TAB keyboard focus
  navigation.
- Existing concepts: Flex Layout Fix, reading-flow, Tab walker
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS reading-flow,
    reading-order properties, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS reading-flow, reading-order properties helps or
    fails.

#### Document-Isolation-Policy

- Path: `v137/document-isolation-policy/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Document-Isolation-Policy allows a document to enable crossOriginIsolation for
  itself, without having to deploy COOP or COEP, and regardless of the crossOriginIsolation status
  of the page. The policy is backed by process isolation. Additionally, the document non-CORS
  cross-origin subresources will either be loaded without credentials or will need to have a C
- Existing concepts: Document-Isolation-Policy, Policy builder, DIP vs COOP+COEP
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Document-Isolation-Policy, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Ed25519 in Web Cryptography

- Path: `v137/ed25519-in-web-cryptography/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature adds support for Curve25519 algorithms in the Web Cryptography API,
  namely the signature algorithm Ed25519
- Existing concepts: Ed25519, JWT EdDSA, Keystore roundtrip, Signature verifier & benchmark
- Suggested additions:
  - Capability probe and fallback explorer for Ed25519 in Web Cryptography, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### IP Address Logging & Reporting

- Path: `v137/ip-address-logging-reporting/`
- Area: General web platform
- Priority: High
- Current framing: Chrome Enterprise is enhancing security monitoring and incident response
  capabilities by collecting and reporting local and remote IP addresses & sending those IP
  addresses to the Security Investigation Logs (SIT). In addition, Chrome Enterprise will allow
  admins to optionally send the IP addresses to 1P & 3P SIEM providers via the Chrome Enterprise
  Reportin
- Existing concepts: Incident Timeline, IP Address Logging in Reports, Policy planner
- Suggested additions:
  - Capability probe and fallback explorer for IP Address Logging & Reporting, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### JavaScript Promise Integration

- Path: `v137/javascript-promise-integration/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: JavaScript Promise Integration (JSPI) is an API that allows WebAssembly
  applications to integrate with JavaScript Promises.
- Existing concepts: C-loop unblocker, JSPI — WebAssembly suspends on JS Promises, Stack-switching
  trace, Wasm fetch()
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for JavaScript Promise Integration, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Pause media playback on not-rendered iframes

- Path: `v137/pause-media-playback-on-not-rendered-iframes/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Adds a "media-playback-while-not-rendered" permission policy to allow embedder
  websites to pause media playback of embedded iframes which aren't rendered - i.e. have their
  "display" property set to "none". This should allow developers to build more user-friendly
  experiences and to also improve the performance by letting the browser handle the playback of con
- Existing concepts: Iframe Pause, Lifecycle tracer, Permission Allow
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Pause media
    playback on not-rendered iframes can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Pause media playback on not-rendered iframes.

#### Prompt API

- Path: `v137/prompt-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Prompt API gives web developers direct access to a browser-provided on-device AI
  language model. The API design offers fine-grained control, aligned with cloud API shapes, for
  progressively enhancing sites with model interactions tailored to individualized use cases. This
  complements task-based language model APIs, for example, Summarizer API, as well as a v
- Existing concepts: Multi-turn chat & quota, Prompt API, Streaming meter, Structured Output
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Prompt API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Rewriter API

- Path: `v137/rewriter-api/`
- Area: Built-in AI
- Priority: High
- Current framing: The Rewriter API transforms and rephrases input text in requested ways, backed by
  an on-device AI language model. Developers may use this API to remove redundancies within a text
  in order to fit into a word limit, rephrase messages to suit the intended audience or to be more
  constructive if a message is found to use toxic language, rephrasing a post or artic
- Existing concepts: Kindness Pass, Rewriter API, Rewrite lab, Streaming rewriter
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Rewriter API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Selection API getComposedRanges and direction

- Path: `v137/selection-api-getcomposedranges-and-direction/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature ships two new API methods for the Selection API: *
  Selection.direction which returns the selection's direction as either "none", "forward" or
  "backward" * Selection.getComposedRanges() which returns a list of 0 or 1 “composed” StaticRange
- Existing concepts: Composed Ranges, Direction-aware Toolbar, Shadow selection explorer
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Selection API getComposedRanges and direction.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Selection API getComposedRanges and direction
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Support offset-path: shape()

- Path: `v137/support-offset-path-shape/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Support offset-path: shape(), to allow using responsive shapes to set the
  animation path.
- Existing concepts: offset-path: shape(), Shape Editor, Shape runner
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Support offset-path: shape(),
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Support offset-path: shape() helps or fails.

#### Support transform attribute on SVGSVGElement

- Path: `v137/support-transform-attribute-on-svgsvgelement/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: This feature enables the application of transformation properties—such as
  scaling, rotation, translation, and skewing—directly to the <svg> root element via its transform
  attribute. This enhancement allows developers to manipulate the entire SVG coordinate system or
  its contents as a whole, providing greater flexibility in creating dynamic, responsive, and i
- Existing concepts: Icon Variants, Root <svg> transform, Viewport router
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Support transform attribute on SVGSVGElement, chart
    frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### System accent color for accent-color property.

- Path: `v137/system-accent-color-for-accent-color-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: This feature empowers web developers to enhance the visual appeal of their
  websites by leveraging the operating system's accent color for form elements. By utilizing the
  "accent-color" CSS property, developers can ensure that form elements such as checkboxes, radio
  buttons, and progress bars automatically adopt the accent color defined by the user's operatin
- Existing concepts: System Accent, Contrast audit, Themed UI
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for System accent color for
    accent-color property, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where System accent color for accent-color property helps
    or fails.

#### view-transition-name: match-element

- Path: `v137/view-transition-name-match-element/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: 'match-element' generates a unique id based on the element's identity and renames
  the same for this element. This is used in Single Page App cases where the element is being moved
  around and the desire is to animate it with a view transition Note this is split off from
  https://chromestatus.com/feature/6575974796492800 which contains additional discussions
- Existing concepts: MPA & cross-document decision tree, view-transition-name: match-element,
  Pairing lab, SPA List
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    view-transition-name: match-element can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for view-transition-name: match-element.

#### WebAssembly Branch Hints

- Path: `v137/webassembly-branch-hints/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Improves the performance of compiled WebAssembly code by informing the engine
  that a particular branch instruction is very likely to take a specific path.
- Existing concepts: Branch bench, WebAssembly Branch Hints, Hex Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebAssembly
    Branch Hints can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebAssembly Branch Hints.

#### WebGPU: copyBufferToBuffer overload

- Path: `v137/webgpu-copybuffertobuffer-overload/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. The
  GPUCommandEncoder copyBufferToBuffer() method now includes a simpler way to copy entire buffers
  using a new overload with optional offsets and size parameters.
- Existing concepts: Copy graph, WebGPU copyBufferToBuffer — terse overload, Per-frame Copies
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: copyBufferToBuffer overload, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: GPUTextureView for externalTexture binding

- Path: `v137/webgpu-gputextureview-for-externaltexture-binding/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. A
  GPUTextureView is now allowed to be used for an externalTexture binding when creating a
  GPUBindGroup.
- Existing concepts: Binding lab, Effect Chain, WebGPU: GPUTextureView for externalTexture
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: GPUTextureView for externalTexture binding,
    chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Writer API

- Path: `v137/writer-api/`
- Area: Built-in AI
- Priority: High
- Current framing: The Writer API can be used for writing new material given a writing task prompt,
  backed by an on-device AI language model. Developers will be able to use this API to generate
  textual explanations of structured data, composing a post about a product based on reviews or
  product description, expanding on pro and con lists into full views and more. An enterprise
- Existing concepts: Data to Prose, Recipe book, Streaming + per-call context, Writer API
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Writer API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

### v138

#### Add prefetchCache and prerenderCache to Clear-Site-Data header

- Path: `v138/add-prefetchcache-and-prerendercache-to-clear-site-data-header/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Two new values for the Clear-Site-Data header to help developers target clearing
  the prerender and prefetch cache: "prefetchCache" and "prerenderCache".
- Existing concepts: Cart mutation invalidation, Clear-Site-Data builder, Token explorer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Add
    prefetchCache and prerenderCache to Clear-Site-Data header can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Add prefetchCache and prerenderCache to Clear-Site-Data header.

#### Add support for video frame orientation metadata to WebCodecs

- Path: `v138/add-support-for-video-frame-orientation-metadata-to-webcodecs/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Introduces "rotation: int" and "flip: bool" values to various video related
  interfaces in WebCodecs so that developers can work with frame sources that have orientation
  (E.g., Android cameras, certain media). The VideoFrame interface grows the ability to create
  VideoFrames with arbitrary rotation and flip as well as accessors for this information on the V
- Existing concepts: Encode → decode round-trip, Rotation matrix test, VideoFrame { rotation, flip }
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Add support for video frame
    orientation metadata to WebCodecs.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Cache sharing for extremely-pervasive resources

- Path: `v138/cache-sharing-for-extremely-pervasive-resources/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: For a small number (hundreds) of hand-curated static third-party script,
  stylesheet and compression-dictionary resources that are used on a large portion of the web,
  Chrome will use a single-keyed HTTP cache to store those resources.
- Existing concepts: Allowlist explorer, Eligibility checker, Shared HTTP cache for pervasive
  resources
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Cache sharing
    for extremely-pervasive resources can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Cache sharing for extremely-pervasive resources.

#### Crash Reporting API: is_top_level & visibility_state

- Path: `v138/crash-reporting-api-is-top-level-visibility-state/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature adds `is_top_level` and `visibility_state` string fields to the
  crash reporting API body that gets sent to the default reporting endpoint for crash reports. See
  https://wicg.github.io/crash-reporting/#crash-report. For `is_top_level`: see
  https://github.com/WICG/crash-reporting/issues/20 &
  https://github.com/WICG/crash-reporting/pull/23. The
- Existing concepts: Crash report context: isTopLevel & visibilityState, Triage dashboard,
  Visibility timeline replay, Visibility State Timeline
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Crash
    Reporting API: is_top_level & visibility_state can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Crash Reporting API: is_top_level & visibility_state.

#### CSS Anchored Fallback Container Queries

- Path: `v138/css-anchored-fallback-container-queries/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Introduce @container anchored(fallback) to style descendants of anchor positioned
  elements based on which of position-try-fallbacks is applied.
- Existing concepts: Fallback Container Query, Menu chevron flip, Tooltip edge cases
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Anchored Fallback
    Container Queries, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Anchored Fallback Container Queries helps or
    fails.

#### CSS counter() and counters() in alt text of 'content' property

- Path: `v138/css-counter-and-counters-in-alt-text-of-content-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: counter() and counters() in alt text of 'content' property is useful to provide
  more meaningful information to e.g. pseudo-elements to improve their accessibility.
- Existing concepts: counter() / counters() in content alt text, Nested outline with counters(),
  Scroll-marker carousel
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS counter() and counters()
    in alt text of 'content' property, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS counter() and counters() in alt text of
    'content' property helps or fails.

#### CSS env variable for OS-level font scale

- Path: `v138/css-env-variable-for-os-level-font-scale/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Exposes a user's preferred font scale to CSS. Currently, it is not practical for
  a page to detect if the user has changed their preferred font size via the Operating System's
  preferences. This CSS environment variable will reflect the scale chosen by the user.
- Existing concepts: env(preferred-text-scale), Proportional chrome, Typography scale test bench
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS env variable for OS-level
    font scale, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS env variable for OS-level font scale helps or
    fails.

#### CSS scroll-target-group property

- Path: `v138/css-scroll-target-group-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The scroll-target-group property specifies whether the element is a scroll marker
  group container. 'none': The element does not establish a scroll marker group container. 'auto':
  The element establishes a scroll marker group container forming a scroll marker group containing
  all of the scroll marker elements for which this is the nearest ancestor scroll
- Existing concepts: Anchor pagination, Dynamic table of contents, scroll-target-group
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS scroll-target-group
    property, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS scroll-target-group property helps or fails.

#### CSS sibling-index() and sibling-count()

- Path: `v138/css-sibling-index-and-sibling-count/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: sibling-index() and sibling-count() can be used as integers in CSS property
  values to style elements based on their position among its siblings, or the total number of
  siblings respectively. These functions can be used directly as integer values, but more
  interestingly inside calc() expressions. Example: li { margin-left: calc(10px * sibling-index());
- Existing concepts: CSS-only data viz, sibling-index() / sibling-count(), Stagger orchestra
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS sibling-index() and
    sibling-count(), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS sibling-index() and sibling-count() helps or
    fails.

#### CSS Sign-Related Functions: abs(), sign()

- Path: `v138/css-sign-related-functions-abs-sign/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The sign-related functions ​abs() and sign() ​compute various functions related to
  the sign of their argument. The abs(A) function contains one calculation A, and returns the
  absolute value of A, as the same type as the input: if A’s numeric value is positive or 0⁺, just A
  again; otherwise -1 * A. The sign(A) function contains one calculation A, and re
- Existing concepts: abs() / sign(), Delta badge, Scroll direction indicator, Symmetry Animator
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Sign-Related Functions:
    abs(), sign(), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Sign-Related Functions: abs(), sign() helps or
    fails.

#### CSS 'stretch' sizing keyword

- Path: `v138/css-stretch-sizing-keyword/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A keyword for CSS sizing properties (e.g. 'width', 'height') that allows elements
  to grow to exactly fill their containing block's available space. It is similar to '100%', except
  the resulting size is applied to the element's margin box instead of the box indicated by
  'box-sizing'. Using this keyword allows the element to keep its margins while still being
- Existing concepts: Sizing keyword comparison lab, stretch keyword, Form fields that respect
  margins
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS 'stretch' sizing keyword,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS 'stretch' sizing keyword helps or fails.

#### CSS typed arithmetic

- Path: `v138/css-typed-arithmetic/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Typed arithmetic allows to write expressions in CSS such a calc(10em / 1px) or
  calc(20% / 0.5em * 1px) which is useful for e.g. typography, as it allows to convert typed value
  into an untyped one and reuse it for number accepting properties or futher multiply the unitless
  value by some other type to e.g. cast from pixels to degrees.
- Existing concepts: Typed animation tuner, Typed arithmetic in calc(), Unit converter playground
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS typed arithmetic, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS typed arithmetic helps or fails.

#### Deprecate asynchronous range removal for Media Source Extensions

- Path: `v138/deprecate-asynchronous-range-removal-for-media-source-extensions/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: The Media Source standard long ago changed to disallow ambiguously defined
  behavior involving asynchronous range removals: * SourceBuffer.abort() no longer aborts
  SourceBuffer.remove() operations * Setting MediaSource.duration can no longer truncate currently
  buffered media
- Existing concepts: Migration codemod, MediaSource async-during-remove deprecation, Sequence trace,
  Sync Removal Demo
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Deprecate asynchronous range
    removal for Media Source Extensions.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Escape "<" and ">" in attributes on serialization

- Path: `v138/escape-and-in-attributes-on-serialization/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Escape "<" and ">" in values of attributes on serialization. This mitigates the
  risk of mutation XSS attacks, which occur when value of an attribute is interpreted as a start tag
  token after being serialized and re-parsed.
- Existing concepts: Attribute serialization escapes < and &, The mXSS round-trip, Serialization
  Diff
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Escape "<" and ">" in attributes on serialization.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### HTML-in-canvas

- Path: `v138/html-in-canvas/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: HTML-in-canvas enables customizing the rendering of html using canvas with three
  new primitives: an attribute to opt-in canvas elements (layoutsubtree), methods to draw child
  elements (2d: drawElementImage, webgl: texElementImage2D, webgpu: copyElementImageToTexture), and
  a paint event which fires to handle updates.
- Existing concepts: drawElement() — HTML in a canvas, paintsubtree event loop, Screenshot export,
  WebGL texture feed
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for HTML-in-canvas, chart frame time/memory/quality, and
    compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Ignore Letter Spacing in Cursive Scripts

- Path: `v138/ignore-letter-spacing-in-cursive-scripts/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature adds logic to ignore the letter-spacing setting for cursive scripts
  as specified by the web author, in line with the spec, to ensure that letter spacing does not
  disrupt word structure and aims to produce better user experience for users relying on cursive
  scripts.
- Existing concepts: Letter-spacing ignored in cursive scripts, Mixed-script paragraph, Script
  coverage grid
- Suggested additions:
  - Capability probe and fallback explorer for Ignore Letter Spacing in Cursive Scripts, using
    feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Integrity Policy for scripts

- Path: `v138/integrity-policy-for-scripts/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Subresource-Integrity (SRI) enables developers to make sure the assets they
  intend to load are indeed the assets they are loading. But there's no current way for developers
  to be sure that all of their scripts are validated using SRI. The Integrity-Policy header gives
  developers the ability to assert that every resource of a given type needs to be integri
- Existing concepts: Header Builder, Integrity-Policy header simulator, Violation reporter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Integrity
    Policy for scripts can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Integrity Policy for scripts.

#### Interpolation progress functional notation: CSS progress() function

- Path: `v138/interpolation-progress-functional-notation-css-progress-function/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The progress() functional notation returns a <number> value representing the
  position of one calculation (the progress value) between two other calculations (the progress
  start value and progress end value). progress() is a math function.
- Existing concepts: progress(value from start to end), Scrollytelling header, Temperature gauge
  gradient
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Interpolation progress
    functional notation: CSS progress() function, with live before/after rendering and copyable
    rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Interpolation progress functional notation: CSS
    progress() function helps or fails.

#### Language Detector API

- Path: `v138/language-detector-api/`
- Area: Built-in AI
- Priority: High
- Current framing: A JavaScript API for detecting the language of text, with confidence levels.
- Existing concepts: Confidence ranking, Detect-then-translate pipeline, LanguageDetector
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Language Detector API such as redaction,
    triage, summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Local network access restrictions

- Path: `v138/local-network-access-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 142 restricted the ability to make requests to the user's local network,
  gated behind a permission prompt. A local network request is any request from a public website to
  a local IP address or loopback, or from a local website (for example, intranet) to loopback.
- Existing concepts: Local Network Access decision tree, Permission flow simulator, Preflight
  Inspector, Router-attack walkthrough
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions.

#### Pass 'Sec-Purpose: prefetch' header with <link rel=prefetch>

- Path: `v138/pass-sec-purpose-prefetch-header-with-link-rel-prefetch/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome currently passes both 'Purpose: prefetch' and 'Sec-Purpose: prefetch'
  headers as part of prefetch through speculation rules. However, only 'Purpose: prefetch' is passed
  with <link rel=prefetch>.
- Existing concepts: Header trace, Sec-Purpose: prefetch on <link rel=prefetch>, Server-side tuning
  by Sec-Purpose
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Pass
    'Sec-Purpose: prefetch' header with <link rel=prefetch> can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Pass 'Sec-Purpose: prefetch' header with <link rel=prefetch>.

#### Pushsubscriptionchange event upon resubscription

- Path: `v138/pushsubscriptionchange-event-upon-resubscription/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Fire the pushsubscriptionchange event in service workers when an origin for which
  a push subscription existed in the past, but which was revoked because of a permission change
  (from granted to deny/default), is re-granted notification permission.
- Existing concepts: pushsubscriptionchange on resubscription, Server-sync flow, Subscription
  Lifecycle
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    Pushsubscriptionchange event upon resubscription can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Pushsubscriptionchange event upon resubscription.

#### ScrollIntoView container option

- Path: `v138/scrollintoview-container-option/`
- Area: General web platform
- Priority: Medium
- Current framing: The ScrollIntoViewOptions container option allows developers to perform a
  scrollIntoView only scrolling the nearest ancestor scroll container. For example, the following
  snippet only scrolls the scroll container of target to bring target into view, but will not scroll
  all of the scroll containers to the viewport: target.scrollIntoView({container: 'nearest
- Existing concepts: scrollIntoView({ container: "nearest" }), Nested scrollers, Sticky-header-aware
  scroll
- Suggested additions:
  - Capability probe and fallback explorer for ScrollIntoView container option, using
    CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### ServiceWorker support for Speculation Rules Prefetch

- Path: `v138/serviceworker-support-for-speculation-rules-prefetch/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature enables ServiceWorker-controlled prefetches, that is a speculation
  rules prefetch to URLs controlled by a Service Worker. Previously, the prefetch is cancelled upon
  detecting a controlling Service Worker, thus subsequent navigation to the prfetch target is served
  by the non-prefetch path. This feature will enable the prefetch request to go throu
- Existing concepts: CDN-rewrite at the Service Worker, Sec-Purpose inspector, Service Worker sees
  prefetched requests
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so ServiceWorker
    support for Speculation Rules Prefetch can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for ServiceWorker support for Speculation Rules Prefetch.

#### Speculation rules: mobile "moderate" eagerness improvements

- Path: `v138/speculation-rules-mobile-moderate-eagerness-improvements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: On mobile, "moderate" eagerness speculation rules prefetches and prerenders now
  trigger when a link enters the viewport and passes other conditions that indicate that it's more
  likely to be clicked. The previous behavior, of waiting until pointerdown, was the same as
  "conservative" eagerness. This new behavior is more useful as it better reflects author i
- Existing concepts: Speculation Rules moderate (mobile-improved), Tap vs hover, Touch latency bench
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: mobile "moderate" eagerness improvements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: mobile "moderate" eagerness improvements.

#### Speculation rules: target_hint field

- Path: `v138/speculation-rules-target-hint-field/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This extends speculation rules syntax to allow developers to specify the
  target_hint field.
- Existing concepts: Popup prewarm, Rules builder, Speculation Rules target_hint
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: target_hint field can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: target_hint field.

#### Summarizer API

- Path: `v138/summarizer-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Summarizer API is a JavaScript API for producing summaries of input text, backed
  by an AI language model. Browsers and operating systems are increasingly expected to gain access
  to a language model. By exposing this built-in model, we avoid every website needing to download
  their own multi-gigabyte language model, or send input text to third-party APIs. The
- Existing concepts: Format and length, Streaming + shared context, Summarizer
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Summarizer API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Translator API

- Path: `v138/translator-api/`
- Area: Built-in AI
- Priority: High
- Current framing: A JavaScript API to provide language translation capabilities to web pages.
  Browsers are increasingly offering language translation to their users. Such translation
  capabilities can also be useful to web developers. This is especially the case when browser's
  built-in translation abilities cannot help. An enterprise policy
  (GenAILocalFoundationalModelSettings
- Existing concepts: Language pair matrix, Streaming captions, Translator
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Translator API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Uint8Array to/from base64 and hex

- Path: `v138/uint8array-to-from-base64-and-hex/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: base64 is a common way to represent arbitrary binary data as ASCII. JavaScript
  has Uint8Arrays to work with binary data, but no built-in mechanism to encode that data as base64,
  nor to take base64'd data and produce a corresponding Uint8Arrays. This is a proposal to fix that.
  It also adds methods for converting between hex strings and Uint8Arrays.
- Existing concepts: Binary Converter, Format options lab, SRI fingerprint generator,
  Uint8Array.{from,to}{Base64,Hex}
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Uint8Array to/from base64 and hex.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Uint8Array to/from base64 and hex behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Update QuotaExceededError to a DOMException derived interface

- Path: `v138/update-quotaexceedederror-to-a-domexception-derived-interface/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Currently, when the web platform wants to tell you when you've exceeded quota, it
  will use `DOMException` with the specific `name` property set to `QuotaExceededError`. However
  this does not allow carrying additional information. This proposes removing "QuotaExceededError"
  from the list of built-in `DOMException` names, and instead creates a class name `Q
- Existing concepts: Error Catching Guide, QuotaExceededError, Storage-pressure dialog
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Update QuotaExceededError to a DOMException derived
    interface.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Update QuotaExceededError
    to a DOMException derived interface in a realistic user workflow.

#### Viewport Segments Enumeration API

- Path: `v138/viewport-segments-enumeration-api/`
- Area: General web platform
- Priority: Medium
- Current framing: The Viewport Segments API allows developers to adapt their website/webapp layout
  to target foldable devices. The viewport segments defines the position and dimensions of a
  logically separate region of the viewport. Viewport segments are created when the viewport is
  split by one or more hardware features (such as a fold or a hinge between separate displays) t
- Existing concepts: Dual-pane email layout, Fold-Aware UI, visualViewport.segments
- Suggested additions:
  - Capability probe and fallback explorer for Viewport Segments Enumeration API, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Web serial over Bluetooth on Android

- Path: `v138/web-serial-over-bluetooth-on-android/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature allows web pages and web apps to connect to serial ports over
  Bluetooth on Android devices.
- Existing concepts: Connection Diagnostics, Web Serial over Bluetooth (Android), Wireless Arduino
  REPL
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Web serial over Bluetooth on Android.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### WebGPU: Deprecate GPUAdapter isFallbackAdapter attribute

- Path: `v138/webgpu-deprecate-gpuadapter-isfallbackadapter-attribute/`
- Area: Graphics, GPU, XR, and canvas
- Priority: High
- Current framing: Deprecates the GPUAdapter isFallbackAdapter boolean attribute from WebGPU, which
  is redundant with the GPUAdapterInfo isFallbackAdapter boolean attribute.
- Existing concepts: Adapter Capabilities Diff, Adapter selection, GPUAdapter.isFallbackAdapter
  (deprecated)
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Deprecate GPUAdapter isFallbackAdapter
    attribute, chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

### v139

#### Audio Level for RTC Encoded Frames

- Path: `v139/audio-level-for-rtc-encoded-frames/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature consists in exposing to the Web the audio level of an encoded frame
  transmitted via RTCPeerConnection and exposed using WebRTC Encoded Transform.
- Existing concepts: Encoded Frame Audio Level Meter, Silence Suppressor, Active Speaker & Dominance
  Router
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Audio Level for RTC Encoded
    Frames.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Chrome removes support for macOS 11

- Path: `v139/chrome-removes-support-for-macos-11/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: Chrome 138 will be the last release to support macOS 11; Chrome 139+ will no
  longer support macOS 11, which is outside of its support window with Apple. Running on a supported
  operating system is essential to maintaining security. On Macs running macOS 11, Chrome will
  continue to work, showing a warning infobar, but will not update any
- Existing concepts: macOS Support Probe, End-of-Support Playbook Builder, Upgrade Nudge
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Chrome removes support for macOS 11 is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Continue running transitions when switching to initial transition value.

- Path: `v139/continue-running-transitions-when-switching-to-initial-transition-value/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: When the transition related properties change, they are only supposed to affect
  newly started transitions. This means that if you change the transition properties, unless you
  also change the properties which have active transition animations, those transition animations
  will continue with the previously specified duration, easing, etc.
- Existing concepts: Duration Swap Mid-Transition, Interruption Stability, Transition Property Lab
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Continue running transitions
    when switching to initial transition value, with live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Continue running transitions when switching to
    initial transition value helps or fails.

#### Corner shaping (corner-shape, superellipse, squircle)

- Path: `v139/corner-shaping-corner-shape-superellipse-squircle/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Enable styling corners, on top of the existing border-radius, by expressing the
  shape/curvature of the corner as a superellipse.
- Existing concepts: Component Kit, Notch & Scoop Gallery, Squircle Playground, Superellipse
  Comparator
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Corner shaping (corner-shape,
    superellipse, squircle), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Corner shaping (corner-shape, superellipse,
    squircle) helps or fails.

#### Crash Reporting API: Specify crash-reporting to receive only crash reports

- Path: `v139/crash-reporting-api-specify-crash-reporting-to-receive-only-crash-reports/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature ensures developers receive only crash reports by specifying the
  endpoint named `crash-reporting`. By default, crash reports are delivered to the `default`
  endpoint which receives many other kinds of reports besides crash reports. Developers can supply a
  separate URL to the well-known endpoint named `crash-reporting`, to dire
- Existing concepts: Reporting-Endpoints Header Builder, Reporting-Endpoints Builder, Triage
  Dashboard
- Suggested additions:
  - Capability probe and fallback explorer for Crash Reporting API: Specify crash-reporting to
    receive only crash reports, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### CSS Custom Functions

- Path: `v139/css-custom-functions/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Custom Functions are similar to custom properties, but instead of returning a
  single, fixed value, they return values based on other custom properties, parameters, and
  conditionals.
- Existing concepts: Easing Library, Function Cookbook, Functional Design Tokens, Typed Parameters
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Custom Functions, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Custom Functions helps or fails.

#### CSS Gap Decorations

- Path: `v139/css-gap-decorations/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Draw lines inside the gaps of grid, flexbox, and multi-column layouts — without
  borders, pseudo-elements, or extra markup. column-rule now works in all layout types, and a new
  row-rule property handles horizontal gaps.
- Existing concepts: Flex Dividers, Gap-Ruled Grid, Gap Decorations Spec Playground, Rule Builder
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Gap Decorations, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Gap Decorations helps or fails.

#### Extended lifetime shared workers

- Path: `v139/extended-lifetime-shared-workers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Pass extendedLifetime: true to the SharedWorker constructor and the worker
  continues running after all client pages close — enabling true background processing without a
  Service Worker.
- Existing concepts: Background Channel, Cross-Tab State Bus, Persistent Counter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Extended
    lifetime shared workers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Extended lifetime shared workers.

#### Faster background freezing on Android

- Path: `v139/faster-background-freezing-on-android/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Shortens the time to freezing background pages (and associated workers) from 5
  minutes to 1 minute on Android. See the original intent to ship for background:
  https://groups.google.com/a/chromium.org/g/blink-dev/c/NKtuFxLsKgo/m/XmQganj9EAAJ. Android 15 has
  introduced a 1 minute background network restriction on apps, and faster background
- Existing concepts: Freeze Budget Explainer, Freeze Timeline, Lifecycle Recorder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Faster
    background freezing on Android can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Faster background freezing on Android.

#### Fetch retry (for keepalive fetches)

- Path: `v139/fetch-retry-for-keepalive-fetches/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Allow web developers to indicate that a fetch() request should be retried, to
  have a greater guarantee on it being reliably sent, even if network is flaky. This is especially
  important for keepalive fetches, where the request might outlive the document, which can no longer
  watch for its failure and do manual retry.
- Existing concepts: Beacon Survival Simulator, Retry Options, Retry Policy Builder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Fetch retry
    (for keepalive fetches) can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Fetch retry (for keepalive fetches).

#### Fire error event instead of throwing for CSP blocked worker

- Path: `v139/fire-error-event-instead-of-throwing-for-csp-blocked-worker/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: When blocked by CSP, Chromium currently throws SecurityError from constructor of
  Worker and SharedWorker. Spec requires CSP to be checked as part of fetch and fires error event
  asynchronously instead of throwing exception when script runs "new Worker(url)" or "new
  SharedWorker(url)". This aims to make Chromium spec conformant, which is no
- Existing concepts: Before vs After, try/catch vs onerror, CSP Worker Error Handler
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Fire error
    event instead of throwing for CSP blocked worker can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Fire error event instead of throwing for CSP blocked worker.

#### Full frame rate render blocking attribute

- Path: `v139/full-frame-rate-render-blocking-attribute/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: We propose to add a new render blocking token full-frame-rate to the blocking
  attributes. When the renderer is blocked with the full-frame-rate token, the renderer will work at
  a lower frame rate so as to reserve more resources for loading. An example use case of the
  proposed API will be: The web page contains an element <link rel="expe
- Existing concepts: Blocking Attribute Matrix, FPS Visualizer, Render Blocking Flag
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Full frame
    rate render blocking attribute can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Full frame rate render blocking attribute.

#### On-device Web Speech API

- Path: `v139/on-device-web-speech-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Chrome 150 brings on-device speech recognition to the Web Speech API on Windows,
  Mac, and Linux — audio is transcribed entirely locally, never leaving the device, using the same
  familiar SpeechRecognition interface.
- Existing concepts: Availability & Language Matrix, Feature Detection & Setup, Privacy Architecture
  Comparison
- Suggested additions:
  - Local-first workflow: build a concrete app flow around On-device Web Speech API such as
    redaction, triage, summarization, translation, or form assistance with offline/privacy status
    shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Prompt API

- Path: `v139/prompt-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Direct access to Gemini Nano running on-device in Chrome. Text, image, and audio
  inputs; structured JSON output; no server round-trip, no API key, no network dependency for
  inference.
- Existing concepts: Multimodal Prompt Explorer, Prompt Playground, Streaming vs Batch, Structured
  Output Studio
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Prompt API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Proofreader API

- Path: `v139/proofreader-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A JavaScript API for proofreading input text with suggested corrections, backed
  by an AI language model.
- Existing concepts: Correction Review, Inline Corrections, Proofreader Probe, Proofreader vs
  Rewriter vs Summariser
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Proofreader API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Proofreader API behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Randomizing TCP Port Allocation on Windows

- Path: `v139/randomizing-tcp-port-allocation-on-windows/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: This launch enables TCP port randomization on versions of Windows (2020 H1 or
  later) where we do not expect to see issues with re-use of prior ports occurring too fast (causing
  rejection due to timeouts on port re-use). The rapid port re-use issue arises from the Birthday
  problem, where the probability of randomly re-picking a port alread
- Existing concepts: Birthday Collision Calculator, Birthday Collision Simulator, Port Allocation
  Simulator
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Randomizing TCP Port Allocation on Windows is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Re-Sizing TCP Connection Pool

- Path: `v139/re-sizing-tcp-connection-pool/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This experiment evaluates the impact of changing the per-profile TCP socket pool
  size from 256 (the current default), down to 255, and up to 257, 512, and 1024 (possibly at 1-2
  numbers between those based on findings). We will study the performance impact of these changes in
  stages, starting with 255 and 257. If no ill effects are seen, 5
- Existing concepts: Pool Exhaustion Simulator, Connection Pool Simulator, Sidechannel Leak
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Re-Sizing TCP
    Connection Pool can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Re-Sizing TCP Connection Pool.

#### Remove auto-detection of ISO-2022-JP charset in HTML

- Path: `v139/remove-auto-detection-of-iso-2022-jp-charset-in-html/`
- Area: JavaScript, DOM, and HTML platform
- Priority: High
- Current framing: There are known[1] security issues around charset auto-detection for ISO-2022-JP.
  Given that the usage is very low, and Safari does not support auto-detection of ISO-2022-JP, we
  will remove support for it to eliminate the security issues.
- Existing concepts: Encoding Detection, Explicit Charset Guide, XSS Sidechannel
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Remove auto-detection of ISO-2022-JP charset in HTML.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Remove auto-detection of ISO-2022-JP charset in
    HTML behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility
    trees.

#### Remove SwiftShader fallback

- Path: `v139/remove-swiftshader-fallback/`
- Area: Graphics, GPU, XR, and canvas
- Priority: High
- Current framing: Allowing automatic fallback to WebGL backed by the software renderer SwiftShader
  is deprecated and WebGL context creation will fail instead of falling back to SwiftShader. This
  was done for two primary reasons:
- Existing concepts: Canvas 2D Fallback, WebGL Fallback Probe, WebGL Failure Handler
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Remove SwiftShader fallback, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### 'request-close' Invoker Command

- Path: `v139/request-close-invoker-command/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Dialog elements can be closed through a variety of mechanisms, sometimes
  developers want to have the ability to prevent closure. To achieve this dialogs fire a cancel
  event. Originally this was only fired via a close request (e.g. ESC key press), recently a
  `requestClose()` JS function was added which also fires the cancel event. The '
- Existing concepts: Declarative Confirm Flow, Dialog Cancel Button, Form Guard, Nested Dialogs
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for 'request-close' Invoker Command.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how 'request-close' Invoker Command behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Scroll Anchoring Priority Candidate Fix

- Path: `v139/scroll-anchoring-priority-candidate-fix/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Currently, scroll anchoring algorithm selects priority candidates when they are
  available as anchor targets. The priority candidates are currently a focused editable element and
  find-in-page highlights. This can cause suboptimal user experience if there is a large focused
  contenteditable element that has content changed offscreen (the
- Existing concepts: Anchor Fix, Contenteditable Drift, Find-in-Page Stability
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Scroll Anchoring Priority
    Candidate Fix, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Scroll Anchoring Priority Candidate Fix helps or
    fails.

#### Secure Payment Confirmation: UX Refresh

- Path: `v139/secure-payment-confirmation-ux-refresh/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 145 updates the Secure Payment Confirmation (SPC) browser UI — the dialog
  shown during WebAuthn-backed payment authentication — with a refreshed visual design and clearer
  transaction summary.
- Existing concepts: Before vs After Gallery, SPC UX Demo, UX Changes
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Secure Payment Confirmation: UX Refresh, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### securePaymentConfirmationAvailability API

- Path: `v139/securepaymentconfirmationavailability-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: This is a Javascript API to provide an easier way to check if the Secure Payment
  Confirmation[1] feature is available. Currently, the only way to determine SPC’s availability is
  to create a PaymentRequest with the required parameters[2], which is clunky and difficult in the
  case where a developer wants to check for SPC before starting to
- Existing concepts: Availability Probe, Checkout Router, Checkout Router with Availability Probe
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    securePaymentConfirmationAvailability API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Short-circuiting var() and attr()

- Path: `v139/short-circuiting-var-and-attr/`
- Area: General web platform
- Priority: Medium
- Current framing: When the fallback is not taken, var()/attr() functions evaluate without looking
  for cycles in that fallback.
- Existing concepts: var() Cycle Detector, Cycle in Fallback, Deep Fallback Theme, Short Circuit
- Suggested additions:
  - Capability probe and fallback explorer for Short-circuiting var() and attr(), using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### SoftNavigation Performance Entry

- Path: `v139/softnavigation-performance-entry/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: A new PerformanceEntry type for Single-Page Application route changes. Each
  client-side navigation produces a SoftNavigationEntry with its own navigationId — unlocking
  per-navigation Core Web Vitals for SPAs.
- Existing concepts: Core Web Vitals Dashboard, Multi-Page Comparison, Observer Playground, SPA
  Navigation Observer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    SoftNavigation Performance Entry can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for SoftNavigation Performance Entry.

#### Spec-compliant JSON MIME type detection

- Path: `v139/spec-compliant-json-mime-type-detection/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chromium now recognizes all valid JSON MIME types as defined by the WHATWG
  mimesniff specification. This includes any MIME type whose subtype ends with “+json”, in addition
  to the traditional application/json and text/json. This change ensures that web APIs and features
  relying on JSON detection behave consistently with the web platform s
- Existing concepts: JSON Module Import, MIME Classifier, +json MIME Explorer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    Spec-compliant JSON MIME type detection can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Spec-compliant JSON MIME type detection.

#### Support font-feature-settings descriptor in @font-face rule

- Path: `v139/support-font-feature-settings-descriptor-in-font-face-rule/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: As CSS allows fine control over font features using 'font-feature-settings' at
  the element level, Chromium-based browsers currently lack support for these properties within
  '@font-face' declarations.
- Existing concepts: Design System, Font Alias Variants, FontFace Descriptor, Numerals & Figures Lab
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Support font-feature-settings
    descriptor in @font-face rule, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Support font-feature-settings descriptor in
    @font-face rule helps or fails.

#### Web app scope extensions

- Path: `v139/web-app-scope-extensions/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Adds a "scope_extensions" web app manifest field that enables web apps to extend
  their scope to other origins.
- Existing concepts: Multi-Origin App Map, Origin Association, Scope Extensions Builder
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Web app scope extensions is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Web Authentication Immediate UI mode

- Path: `v139/web-authentication-immediate-ui-mode/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: A new mediation: "immediate" option for navigator.credentials.get() — shows the
  browser sign-in UI only if a passkey or password is already known for the site, and rejects
  instantly with NotAllowedError if there is none.
- Existing concepts: Credential Availability Gate, Immediate vs Conditional UI, Three Mediation
  Modes
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Web Authentication Immediate UI mode, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Web Install API

- Path: `v139/web-install-api/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Allows a website to install a web app. The API provides 3 signatures, with 0, 1,
  and 2 parameters, respectively. When invoked, the website installs either itself, or another site
  from a different origin, as a web app (depending on the provided parameters). All 3 signatures
  will be experimented with in parallel.
- Existing concepts: Cross-Origin Storefront, Install Call, The Three Signatures
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Web Install API is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### WebGPU: 3D texture support for BC and ASTC compressed formats

- Path: `v139/webgpu-3d-texture-support-for-bc-and-astc-compressed-formats/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser. The
  “texture-compression-bc-sliced-3d” and “texture-compression-astc-sliced-3d” WebGPU features add
  respectively 3D texture support for BC and ASTC compressed formats.
- Existing concepts: 3D Compressed Format Probe, Volume Texture Budget Designer, Volume Budget
  Calculator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebGPU: 3D
    texture support for BC and ASTC compressed formats can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebGPU: 3D texture support for BC and ASTC compressed formats.

#### WebGPU compatibility mode

- Path: `v139/webgpu-compatibility-mode/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 146 adds WebGPU compatibility mode — a subset of WebGPU that can run on
  OpenGL ES 3.1 and OpenGL 4.4, in addition to the primary backends (Vulkan, Metal, D3D12). This
  extends WebGPU to hardware and platforms where Vulkan is not available.
- Existing concepts: Adapter & Feature Explorer, Compatibility Demo, Compatibility Limits
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU compatibility mode, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU 'core-features-and-limits'

- Path: `v139/webgpu-core-features-and-limits/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The 'core-features-and-limits' feature signifies a WebGPU adapter and device
  support the core features and limits of the spec.
- Existing concepts: Compat Gate, Core Features List, Core Limits Comparator
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU 'core-features-and-limits', chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebXR Depth Sensing Performance Improvements

- Path: `v139/webxr-depth-sensing-performance-improvements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Exposes several new mechanisms to customize the behavior of the depth sensing
  feature within a WebXR session, with the goal of improving the performance of the generation or
  consumption of the depth buffer. The key mechanisms exposed are: the ability to request the raw or
  smooth depth buffer, the ability to request that the runtime sto
- Existing concepts: Depth Sensing Latency, Raw vs Smooth, Use-Case Router for depthUsage /
  depthDataFormat
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebXR Depth
    Sensing Performance Improvements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebXR Depth Sensing Performance Improvements.

### v140

#### Clipboardchange event

- Path: `v140/clipboardchange-event/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: The "clipboardchange" event fires whenever the system clipboard contents are
  changed either by a web app or any other system application. This allows web-apps like remote
  desktop clients to keep their clipboards synchronized with the system clipboard. It provides an
  efficient alternative to polling the clipboard(using Javascript) for changes.
- Existing concepts: Clipboard Watcher, Format Watcher, Paste Prompt, Poll vs Event, Remote Desktop
  Sync
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Clipboardchange event.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Clipboardchange event in
    a realistic user workflow.

#### Controlled Frame API (available only to IWAs)

- Path: `v140/controlled-frame-api-available-only-to-iwas/`
- Area: General web platform
- Priority: Medium
- Current framing: Adds a Controlled Frame API available only to Isolated Web Apps (IWAs).
- Existing concepts: Capability Probe, Event Router, IWA-only Controlled Frame probe, Kiosk Builder,
  Nav Policy Tester
- Suggested additions:
  - Capability probe and fallback explorer for Controlled Frame API (available only to IWAs), using
    feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Crash Reporting key-value API

- Path: `v140/crash-reporting-key-value-api/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: A new key-value API, tentatively `window.crashReport`, backed by a per-Document
  map holding data that gets appended to crash reports.
- Existing concepts: Breadcrumb Trail, Crash Key-Value Reporter, Flag Attribution, Memory Watermark,
  Release Tagging
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Crash Reporting key-value API is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### CSS caret-animation property

- Path: `v140/css-caret-animation-property/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chromium supports animation of the caret-color property, but when animated the
  default blinking behavior of the caret interferes with the animation. For instance, see the
  example at https://drafts.csswg.org/css-ui/#caret-animation where an animation from blue to red
  and back is rendered as a blinking cursor that is randomly blue or red. The CSS caret-animati
- Existing concepts: Caret Animation, Focus Pulse, Keyframes Orchestrator, Motion-Sensitivity
  Override, Transition vs Keyframes
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CSS
    caret-animation property can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CSS caret-animation property.

#### CSS counter() and counters() in alt text of 'content' property

- Path: `v140/css-counter-and-counters-in-alt-text-of-content-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: counter() and counters() in alt text of 'content' property is useful to provide
  more meaningful information to e.g. pseudo-elements to improve their accessibility.
- Existing concepts: counter() in alt, Figure Numbering, List-Style Words, Nested TOC, Scroll Marker
  Labels
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS counter() and counters()
    in alt text of 'content' property, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS counter() and counters() in alt text of
    'content' property helps or fails.

#### CSS scroll-target-group property

- Path: `v140/css-scroll-target-group-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The scroll-target-group property specifies whether the element is a scroll marker
  group container. 'none': The element does not establish a scroll marker group container. 'auto':
  The element establishes a scroll marker group container forming a scroll marker group containing
  all of the scroll marker elements for which this is the nearest ancestor scroll
- Existing concepts: Anchor Carousel, Group vs No Group, Scroll Target Group, Segmented Control, TOC
  Active
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS scroll-target-group
    property, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS scroll-target-group property helps or fails.

#### CSS typed arithmetic

- Path: `v140/css-typed-arithmetic/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Typed arithmetic allows to write expressions in CSS such a calc(10em / 1px) or
  calc(20% / 0.5em * 1px) which is useful for e.g. typography, as it allows to convert typed value
  into an untyped one and reuse it for number accepting properties or futher multiply the unitless
  value by some other type to e.g. cast from pixels to degrees.
- Existing concepts: Angle to Percent, Cross-Type Grid, em-to-unitless, Fluid Type, Typed Arithmetic
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS typed arithmetic, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS typed arithmetic helps or fails.

#### Deprecate special font size rules for H1 within some elements

- Path: `v140/deprecate-special-font-size-rules-for-h1-within-some-elements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The HTML spec contains a list of special rules for <h1> tags nested within
  <article>, <aside>, <nav>, or <section> tags:
  https://html.spec.whatwg.org/multipage/rendering.html#sections-and-headings These special rules
  are deprecated, because they cause accessibility issues. Namely, they visually reduce the font
  size for nested <h1>s so that they "look"
- Existing concepts: A11y Audit, Breakage Finder, H1 Font-size Rule, Heading Hierarchy, Author
  Recipe
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate
    special font size rules for H1 within some elements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate special font size rules for H1 within some elements.

#### Element-scoped view transitions

- Path: `v140/element-scoped-view-transitions/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Exposes element.startViewTransition() on arbitrary HTML elements. The element
  establishes a scope for the transition, which means that the transition pseudo-elements are
  affected by ancestor clips and transforms, and multiple transitions on separate elements can run
  concurrently.
- Existing concepts: Clipped Card, Concurrent Components, Element-scoped VT, List Reorder, Parallel
  Widgets
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Element-scoped view transitions.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Element-scoped view transitions behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Get Installed Related Apps API

- Path: `v140/get-installed-related-apps-api/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: The Get Installed Related Apps API (navigator.getInstalledRelatedApps) provides
  sites access to if their corresponding related applications are installed. Sites are only allowed
  to use this API if the native application has an established association with the web origin.
- Existing concepts: Cross-Platform Router, Desktop PWA promo gate, Install Banner Logic, Manifest
  Builder, Get Installed Related Apps
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Get Installed Related Apps API is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### highlightsFromPoint API

- Path: `v140/highlightsfrompoint-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The highlightsFromPoint API enables developers to interact with custom highlights
  by detecting which highlights exist at a specific point within a document. This interactivity is
  valuable for complex web features where multiple highlights may overlap or exist within shadow
  DOM. By providing precise point-based highlight detection, the API empowers developers
- Existing concepts: Comment Anchor, highlightsFromPoint, Overlap Tooltip, Shadow Piercer, Stacked
  Annotations
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for highlightsFromPoint API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how highlightsFromPoint API behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Http cookie prefix

- Path: `v140/http-cookie-prefix/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: There are cases where it's important to distinguish on the server side between
  cookies that were set by the server and ones that were set by the client. One such case is cookies
  that are normally always set by the server, unless some unexpected code (an XSS exploit, a
  malicious extension, a commit from a confused developer, etc.) happens to set them on th
- Existing concepts: Attack Walkthrough, __Http- Cookie Prefix Simulator, Header Inspector, Prefix
  Comparator, XSS Attempt
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Http cookie
    prefix can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Http cookie prefix.

#### Incoming Call Notifications

- Path: `v140/incoming-call-notifications/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Extend the Notifications API to allow installed PWA's to send incoming call
  notifications - i.e., notifications with call-styled buttons and a ringtone. This extension will
  help VoIP web apps to create more engaging experiences by making it easier for users to easily
  recognize a calling notification and answer it. Besides that, this feature will help bridge
- Existing concepts: Action Router, Incoming Call Notification, Missed Call Flow, Scenario
  Comparator, VoIP Ringer
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Incoming Call Notifications is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Mirroring of RTL MathML operators

- Path: `v140/mirroring-of-rtl-mathml-operators/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Support for character-level and glyph-level mirroring when rendering MathML
  operators in right-to-left mode. When using RTL mode some operators can be mirrored by changing
  them to another code point (e.g. a right parentheses becomes a left parentheses). This is
  character-level mirroring, with equivalences defined by Unicode's `Bidi_Mirrored` property.
- Existing concepts: Arabic Equations, Equation Toggle, Operator Glossary, RTL MathML mirroring
- Suggested additions:
  - Locale/script matrix: compare Mirroring of RTL MathML operators across languages, scripts,
    writing modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Nested view transitions groups

- Path: `v140/nested-view-transitions-groups/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Allow view-transitions to generate a nested pseudo-element tree rather than a
  flat one. This allows the view transition to appear more in line with its original elements and
  visual intent, as it enables clipping, nested 3D transforms, and proper application of effects
  like opacity, masking and filters.
- Existing concepts: Clipped Card Flip, contain vs normal, Nested view-transition groups, Route
  Shell, Three Deep
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Nested view transitions
    groups, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Nested view transitions groups helps or fails.

#### Permissions policy for Device Attributes API

- Path: `v140/permissions-policy-for-device-attributes-api/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: The new Permissions Policy enables restricting access to the Device Attributes
  API, which is available only for policy-installed kiosk web apps and policy-installed Isolated Web
  Apps, both only on managed ChromeOS devices.
- Existing concepts: Attribute Readout, device-attributes Permissions-Policy simulator, Header
  Explorer, iframe Inheritance, IWA Kiosk Config
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Permissions policy for Device Attributes API is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Propagate Viewport overscroll-behavior from Root

- Path: `v140/propagate-viewport-overscroll-behavior-from-root/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Propagate overscroll-behavior from the root instead of the body.
- Existing concepts: Propagation Chain, Pull-to-refresh gate, Standalone PWA, Viewport overscroll
  propagation
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Propagate Viewport
    overscroll-behavior from Root, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Propagate Viewport overscroll-behavior from Root
    helps or fails.

#### ReadableStreamBYOBReader Min Option

- Path: `v140/readablestreambyobreader-min-option/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This feature introduces a min option to the existing
  ReadableStreamBYOBReader.read(view) API. The API already accepts a ArrayBufferView into which data
  is read, but currently does not guarantee how many elements will be written before the read
  resolves.
- Existing concepts: BYOB Reader — min option, Decoder Buffer, min vs default, Protocol Decoder
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for ReadableStreamBYOBReader Min Option.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### ScrollIntoView container option

- Path: `v140/scrollintoview-container-option/`
- Area: General web platform
- Priority: Medium
- Current framing: The ScrollIntoViewOptions container option allows developers to perform a
  scrollIntoView only scrolling the nearest ancestor scroll container. For example, the following
  snippet only scrolls the scroll container of target to bring target into view, but will not scroll
  all of the scroll containers to the viewport: target.scrollIntoView({container: 'nearest
- Existing concepts: all vs nearest, scrollIntoView container option, Nested Carousel, Scoped Search
- Suggested additions:
  - Capability probe and fallback explorer for ScrollIntoView container option, using
    CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### ServiceWorkerAutoPreload browser mode

- Path: `v140/serviceworkerautopreload-browser-mode/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: **ServiceWorkerAutoPreload** is a mode where the browser issues the network
  request in parallel with the service worker bootstrap. If the fetch handler returns the response
  with `respondWith()`, the browser consumes the network request result inside the fetch handler. If
  the fetch handler result is fallback, it passes the network response directly to the bro
- Existing concepts: Cold-boot Race, Mode Picker, ServiceWorker AutoPreload timeline, Timing
  Comparator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    ServiceWorkerAutoPreload browser mode can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for ServiceWorkerAutoPreload browser mode.

#### ServiceWorkerStaticRouterTimingInfo

- Path: `v140/serviceworkerstaticroutertiminginfo/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Adds timing information for ServiceWorker Static routing API, exposed in
  navigation timing API and resource timing API for developer use. Service Worker provides timing
  information to mark certain points in time. We add two Static routing API-relevant timing
  information: RouterEvaluationStart, time to start matching a request with registered router rules,
- Existing concepts: Route Debugger, Route Matrix, ServiceWorker Static Router Timing, Timing
  Decoder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    ServiceWorkerStaticRouterTimingInfo can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for ServiceWorkerStaticRouterTimingInfo.

#### SharedWorker on Android

- Path: `v140/sharedworker-on-android/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: For a long time, SharedWorker has been disabled on Android due to concerns about
  its unpredictable process lifecycle. We believed that SharedWorker instances might terminate
  unexpectedly, without noticing to users or web developers, which we considered unacceptable.
  However, a recent discussion on GitHub (https://github.com/whatwg/html/issues/11205) sugge
- Existing concepts: Connection Counter, Cross-tab WebSocket, Multi-tab Bus, SharedWorker probe +
  counter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so SharedWorker
    on Android can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for SharedWorker on Android.

#### SharedWorker script inherit controller for blob script URL

- Path: `v140/sharedworker-script-inherit-controller-for-blob-script-url/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: According to
  [Worker client case](https://w3c.github.io/ServiceWorker/#control-and-use-worker-client) (github),
  workers should inherit controllers for the blob URL. However, existing code allows only dedicated
  workers to inherit the controller, and shared workers do not inherit the controller. This is the
  fix to make Chromium behavior adjust to the specifica
- Existing concepts: Blob Controller, Blob SharedWorker controller probe, Cache Flow, SW Fetch
  Interception
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so SharedWorker
    script inherit controller for blob script URL can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for SharedWorker script inherit controller for blob script URL.

#### Support font-variation-settings descriptor in @font-face rule

- Path: `v140/support-font-variation-settings-descriptor-in-font-face-rule/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: As CSS allows developers to adjust a font’s weight, width, slant, and other axes
  using the `font-variation-settings` property on individual elements, Chromium-based browsers lack
  support for this property within `@font-face` declarations.
- Existing concepts: Family Variants, Font as shipped, @font-face font-variation-settings, Preset
  Builder
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Support
    font-variation-settings descriptor in @font-face rule, with live before/after rendering and
    copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Support font-variation-settings descriptor in
    @font-face rule helps or fails.

#### ToggleEvent source attribute

- Path: `v140/toggleevent-source-attribute/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The source attribute of ToggleEvents contains the element which triggered the
  ToggleEvent to be fired, if applicable. For example, if a button element with the popovertarget or
  commandfor attribute set up to open a popover is clicked by the user, then the ToggleEvent fired
  on the popover will have its source attribute set to the invoking button.
- Existing concepts: Analytics Router, Details Tree, Invoker Trace, ToggleEvent.source
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for ToggleEvent source attribute.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how ToggleEvent source attribute behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Uint8Array to/from base64 and hex

- Path: `v140/uint8array-to-from-base64-and-hex/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: base64 is a common way to represent arbitrary binary data as ASCII. JavaScript
  has Uint8Arrays to work with binary data, but no built-in mechanism to encode that data as base64,
  nor to take base64'd data and produce a corresponding Uint8Arrays. This is a proposal to fix that.
  It also adds methods for converting between hex strings and Uint8Arrays.
- Existing concepts: Alphabet Explorer, Credential Roundtrip, Hex Inspector, Streaming Decoder,
  Uint8Array Base64 / Hex Tool
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Uint8Array to/from base64 and hex.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Uint8Array to/from base64 and hex behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### View Transition finished promise timing change

- Path: `v140/view-transition-finished-promise-timing-change/`
- Area: JavaScript, DOM, and HTML platform
- Priority: High
- Current framing: The current finished promise timing happens within the rendering lifecycle steps.
  This means that code that runs as a result of promise resolution happens after the visual frame
  that removes the view transition has been produced. This can cause a flicker at the end of the
  animation if script moves some styles around in an attempt to preserve visually similar
- Existing concepts: Cleanup Race, No-flicker Cleanup, Timing Diagram, ViewTransition.finished
  timing
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for View Transition finished promise timing change.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how View Transition finished promise timing change
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### View transition pseudos inherit animation-delay.

- Path: `v140/view-transition-pseudos-inherit-animation-delay/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: View Transitions project adds a tree of pseudo elements that have various
  animations applied to them. For ease of development and customization some niceties are provided,
  such as inheriting animation-duration. This feature adds another nicety: inherit animation-delay.
- Existing concepts: Cascading Delay, Inheritance Tree, Staggered List, VT pseudos inherit
  animation-delay
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for View transition pseudos
    inherit animation-delay, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where View transition pseudos inherit animation-delay
    helps or fails.

#### View Transitions: Inherit more animation properties

- Path: `v140/view-transitions-inherit-more-animation-properties/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Similar to https://chromestatus.com/feature/5424291457531904, which inherited
  animation-delay, this feature adds more animation properties to inherit through the view
  transition pseudo tree based on resolution in
  https://github.com/w3c/csswg-drafts/issues/11546#issuecomment-3005503138: *
  animation-timing-function * animation-iteration-count * animation-di
- Existing concepts: Property Matrix, Timing-fn Cascade, Timing Function Cascade, VT pseudos inherit
  more animation props
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so View
    Transitions: Inherit more animation properties can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for View Transitions: Inherit more animation properties.

### v141

#### ARIA Notify API

- Path: `v141/aria-notify-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: ariaNotify provides a JavaScript API that enables content authors to directly
  tell a screen reader what to read.
- Existing concepts: ARIA Notify, Keyboard Confirmations, Queue vs Interrupt
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for ARIA Notify API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how ARIA Notify API behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Custom property enumeration in getComputedStyle()

- Path: `v141/custom-property-enumeration-in-getcomputedstyle/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: When iterating over window.getComputedStyle(element) in Chromium, there is a bug
  where it forgets to include any custom properties set on the element. (length() on the returned
  object forgets to account for the number of custom properties set.) We would like to fix this bug;
  it brings us closer to web standards, and to Firefox and Safari, which have never ha
- Existing concepts: Custom Property Enumeration, Design Token Extractor, Inheritance Inspector
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Custom property enumeration in getComputedStyle() is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Digital Credentials API (presentation support)

- Path: `v141/digital-credentials-api-presentation-support/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Websites can and do get credentials from mobile wallet apps through a variety of
  mechanisms today (custom URL handlers, QR code scanning, etc.). This Web Platform feature would
  allow sites to request identity information from wallets via Android's IdentityCredential CredMan
  system. It is extensible to support multiple credential formats (eg. ISO mDoc and W3
- Existing concepts: Age Verification, Presentation, Selective Disclosure
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Digital Credentials API (presentation support), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### echoCancellationMode for getUserMedia()

- Path: `v141/echocancellationmode-for-getusermedia/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Extends echoCancellation behavior of MediaTrackConstraints dictionary - former
  true/false - by values "all" and "remote-only". Allows the clients to modify echo cancellation
  behavior applied to audio tracks received from microphones, controlling how much of the user
  system playout (all, or only audio received from PeerConnections) is removed from the microp
- Existing concepts: Accessibility & Privacy, Echo Cancellation Mode, Music Lesson
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for echoCancellationMode for
    getUserMedia().
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Enhanced Canvas TextMetrics

- Path: `v141/enhanced-canvas-textmetrics/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Expand the TextMetrics Canvas API to support selection rectangles, bounding box
  queries, and glyph cluster-based operations.
- Existing concepts: Grapheme Clusters, Rich TextMetrics, Selection Rects
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Enhanced Canvas TextMetrics, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Extend CSP script-src (aka script-src-v2)

- Path: `v141/extend-csp-script-src-aka-script-src-v2/`
- Area: General web platform
- Priority: High
- Current framing: Introduces a new keywords to the script-src Content Security Policy (CSP)
  directive. This adds two new hash based allowlisting mechanisms: script sources based on hashes of
  URLs and contents of eval() and eval() like functions. We loosely refer to this as script-src-v2,
  although it is backwards compatible with the existing script-src, and uses the same direc
- Existing concepts: CSP script-src v2, Eval Hashes, URL Hashes
- Suggested additions:
  - Capability probe and fallback explorer for Extend CSP script-src (aka script-src-v2), using
    feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### FedCM: Alternative Fields in Account Selection

- Path: `v141/fedcm-alternative-fields-in-account-selection/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Adds support for phone numbers and usernames, in addition to or instead of a
  user's full name and email address as identifiers for disambiguating accounts in the account
  selector. Also, makes these new fields available for websites to affect the disclosure text.
- Existing concepts: Alternative Fields, Disclosure Text, Phone Identifier
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM: Alternative Fields in Account Selection, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### IndexedDB getAllRecords() and direction option for getAll()/getAllKeys()

- Path: `v141/indexeddb-getallrecords-and-direction-option-for-getall-getallkeys/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: This feature adds the getAllRecords() API to IndexedDB's IDBObjectStore and
  IDBIndex. It also adds a direction parameter to getAll() and getAllKeys(). This functionality
  enables certain read patterns to be significantly faster when compared to the existing alternative
  of iteration with cursors. One key workload from a Microsoft property showed a 350ms imp
- Existing concepts: getAllRecords, Keys then Values, Reverse Pagination
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for IndexedDB getAllRecords() and direction option for
    getAll()/getAllKeys().
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses IndexedDB getAllRecords()
    and direction option for getAll()/getAllKeys() in a realistic user workflow.

#### Local network access restrictions

- Path: `v141/local-network-access-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 142 restricted the ability to make requests to the user's local network,
  gated behind a permission prompt. A local network request is any request from a public website to
  a local IP address or loopback, or from a local website (for example, intranet) to loopback.
- Existing concepts: IoT Discovery, LNA Prompt, Router CSRF Attempt
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions.

#### Navigation API: deferred commit (precommit handlers)

- Path: `v141/navigation-api-deferred-commit-precommit-handlers/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Normally, when navigateEvent.intercept() is called, the intercepted navigation
  commits (and therefore the URL updates) as soon as the NavigateEvent finishes dispatch.
- Existing concepts: Async Data Prep, Lazy Route Redirect, precommit Handler
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Navigation API: deferred commit (precommit handlers).
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Navigation API: deferred commit (precommit
    handlers) behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility
    trees.

#### No-Vary-Search support for the HTTP disk cache

- Path: `v141/no-vary-search-support-for-the-http-disk-cache/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Enables the HTTP disk cache to use the No-Vary-Search response header to share a
  cache entry between URLs that differ only in the query parameters.
- Existing concepts: key-order & except, NVS in disk cache, UTM Collapse
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    No-Vary-Search support for the HTTP disk cache can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for No-Vary-Search support for the HTTP disk cache.

#### Permissions policy for Device Attributes API

- Path: `v141/permissions-policy-for-device-attributes-api/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: The new Permissions Policy enables restricting access to the Device Attributes
  API, which is available only for policy-installed kiosk web apps and policy-installed Isolated Web
  Apps, both only on managed ChromeOS devices.
- Existing concepts: Device Attributes Policy, Enterprise Rollout, iframe Isolation
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Permissions policy for Device Attributes API is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Proofreader API

- Path: `v141/proofreader-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A JavaScript API for proofreading input text with suggested corrections, backed
  by an AI language model.
- Existing concepts: Chat Realtime, Compose Overlay, Proofread
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Proofreader API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Proofreader API behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Signature-based Integrity

- Path: `v141/signature-based-integrity/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature provides web developers with a mechanism to verify the provenance of
  resources they depend upon, creating a technical foundation for trust in a site's dependencies. In
  short: servers can sign responses with a Ed25519 key pair, and web developers can require the user
  agent to verify the signature using a specific public key. This offers a helpful
- Existing concepts: Key Rotation, Signature Integrity, SRI: hash vs signature
- Suggested additions:
  - Capability probe and fallback explorer for Signature-based Integrity, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Speculation rules: desktop "eager" eagerness improvements

- Path: `v141/speculation-rules-desktop-eager-eagerness-improvements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: On desktop, "eager" eagerness speculation rules prefetches and prerenders now
  trigger when users hover on a link for a shorter time than the "moderate" mouse hover time. The
  previous behavior, of starting prefetch/prerenders as soon as possible, was the same as
  "immediate" eagerness. This new behavior is more useful as it better reflects the author's inte
- Existing concepts: Desktop Eager Tuning, Quicklink Replacement, Viewport Eager
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: desktop "eager" eagerness improvements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: desktop "eager" eagerness improvements.

#### Stop sending Purpose: prefetch header from prefetches and prerenders

- Path: `v141/stop-sending-purpose-prefetch-header-from-prefetches-and-prerenders/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Now that prefetches and prerenders are utilizing the Sec-Purpose header for
  prefetches and prerenders, we will move to remove the legacy `Purpose: prefetch` header that is
  still currently passed. This will be behind a feature flag/ kill switch to prevent compatibility
  issues.
- Existing concepts: Analytics Double-Count, Purpose Header, Sec-Purpose Migration
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Stop sending
    Purpose: prefetch header from prefetches and prerenders can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Stop sending Purpose: prefetch header from prefetches and prerenders.

#### Strict Same Origin Policy for Storage Access API

- Path: `v141/strict-same-origin-policy-for-storage-access-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: In Chrome 141, Storage Access API semantics now strictly follow the Same Origin
  policy, to enhance security. Using `document.requestStorageAccess()` in a frame only attaches
  cookies to requests to the iframe's origin (not site) by default. The
  [CookiesAllowedForUrls](https://chromeenterprise.google/policies/#CookiesAllowedForUrls) policy or
  Storage Access
- Existing concepts: Migration with Storage Access Headers, Origin vs Site, SAA Strict SOP
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Strict Same Origin Policy for Storage Access API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Support restrictOwnAudio

- Path: `v141/support-restrictownaudio/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: restrictOwnAudio is a captured display surfaces constrainable property. This
  constrainable property changes the behavior of system audio in a captured display surface. The
  restrictOwnAudio constraint will only have an effect if the captured display surface inherently
  includes system audio; otherwise, it will have no impact.
- Existing concepts: Embedded Video Loop, Music App Screencast, restrictOwnAudio
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Support restrictOwnAudio.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Support width and height as presentation attributes on nested <svg> elements

- Path: `v141/support-width-and-height-as-presentation-attributes-on-nested-svg-elements/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: This feature supports applying width and height as presentation attributes on
  nested <svg> elements through both SVG markup and CSS. This dual approach provides even greater
  flexibility for developers, allowing them to manage and style SVG elements more efficiently within
  complex designs.
- Existing concepts: Chart Composition, Nested SVG W/H, Responsive Icons
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Support width and height as presentation attributes
    on nested <svg> elements, chart frame time/memory/quality, and compare graceful fallback
    implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### :target-before and :target-after pseudo-classes

- Path: `v141/target-before-and-target-after-pseudo-classes/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: These pseudo-classes match scroll markers that are, respectively, before or after
  the active marker (the one matching :target-current) within the same scroll marker group, as
  determined by flat tree order: * :target-before matches all scroll markers that precede the active
  marker in the flat tree order within the group. * :target-after matches all scro
- Existing concepts: Reading Progress, Scroll Marker Progress, Target Neighbors
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for :target-before and
    :target-after pseudo-classes, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where :target-before and :target-after pseudo-classes
    helps or fails.

#### Update hidden=until-found and details ancestor revealing algorithm

- Path: `v141/update-hidden-until-found-and-details-ancestor-revealing-algorithm/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The spec recently had some small changes to the revealing algorithms for
  hidden=until-found and details elements in order to prevent the browser from getting stuck in an
  infinite loop: https://github.com/whatwg/html/pull/11457
- Existing concepts: Anchor Navigation, Find-in-Page Reveal, Reveal Hidden
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Update
    hidden=until-found and details ancestor revealing algorithm can be observed instead of
    described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Update hidden=until-found and details ancestor revealing algorithm.

#### Web Smart Card API

- Path: `v141/web-smart-card-api/`
- Area: General web platform
- Priority: Medium
- Current framing: Enables smart card (PC/SC) applications to move to the Web platform. It gives
  them access to the PC/SC implementation (and card reader drivers) available in the host OS.
- Existing concepts: Badge Kiosk, Remote Desktop Relay, Smart Card Connect
- Suggested additions:
  - Capability probe and fallback explorer for Web Smart Card API, using feature detection, fallback
    path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### WebAssembly Custom Descriptors

- Path: `v141/webassembly-custom-descriptors/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Allows WebAssembly to store data associated with source-level types more
  efficiently in new "custom descriptor" objects. These custom descriptors can be configured with
  prototypes for the WebAssembly objects of that source-level type. This allows methods to be
  installed on a WebAssembly object's prototype chain and called directly from JS using normal
  method
- Existing concepts: JS Prototype Bridge, Object Size, Custom Descriptors
- Suggested additions:
  - Capability profiler: query manifest parser, beforeinstallprompt/appinstalled flow, choose the
    best rendering path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebAssembly Custom Descriptors, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRTC Encoded Transform (V2)

- Path: `v141/webrtc-encoded-transform-v2/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: This API allows processing of encoded media flowing through an RTCPeerConnection.
  Chromium shipped an early version of this API in 2020. Since then, the spec has changed and other
  browsers have shipped the updated version of the spec (Safari in 2022 and Firefox in 2023). This
  launch refers to the latest spec version and is part of Interop 2025.
- Existing concepts: E2E Encryption, Encoded Transform V2, Metadata Mux
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for WebRTC Encoded Transform (V2).
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### [WebRTC getStats] Align implementations on when RTP stats should be created

- Path: `v141/webrtc-getstats-align-implementations-on-when-rtp-stats-should-be-created/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: RTP stats objects, of type "outbound-rtp" or "inbound-rtp" in this case,
  represents a WebRTC stream. The identifier of this stream is the SSRC (a number). We should
  collect stats for streams that "exist", but implementations and spec has disagreed on when the
  stream should exist: if the SSRC information is conveyed via SDP, does the stream still exist
  before
- Existing concepts: RTP Stats Timing, Stats Lifecycle, Zero-Byte Row
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for [WebRTC getStats] Align implementations on when RTP stats
    should be created.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### windowAudio for getDisplayMedia()

- Path: `v141/windowaudio-for-getdisplaymedia/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Extends DisplayMediaStreamOptions for getDisplayMedia() with a windowAudio
  option. This new option allows web applications to hint to the user agent whether the user should
  be offered the ability to share audio when a window is selected. windowAudio can be set to
  exclude, system, or window based on application preference.
- Existing concepts: Exclude on Window, Include Window Audio, Window Audio
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for windowAudio for
    getDisplayMedia().
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

### v142

#### activeViewTransition property on document

- Path: `v142/activeviewtransition-property-on-document/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: View Transitions API allows developers to start visual transitions between
  different states. The primary SPA entry point to this is `startViewTransition()` which returns a
  transition object. This object contains several promises and functionality to track the transition
  progress, as well as allow manipulations such as skipping the transition or modifying its
- Existing concepts: Active VT, Concurrent Navigation Guard, External Skip & Observe
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for activeViewTransition property on document.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how activeViewTransition property on document behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Compression Dictionary TTL

- Path: `v142/compression-dictionary-ttl/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Adds support for an explicit time-to-live for dictionaries used in Compression
  Dictionary Transport. This is a backward-compatible extension to the "Use-As-Dictionary" HTTP
  response header that adds a "ttl" parameter. The ttl is the number of seconds after the dictionary
  was last fetched that it is usable as a compression dictionary and overrides the defa
- Existing concepts: Bundle Delta Savings, Dictionary TTL, Cache Variant Explosion
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Compression
    Dictionary TTL can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Compression Dictionary TTL.

#### Device Bound Session Credentials

- Path: `v142/device-bound-session-credentials/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: To enhance user security and combat session cookie theft, Chrome is introducing
  [Device Bound Session Credentials (DBSC)](https://developer.chrome.com/docs/web-platform/device-bound-session-credentials).
  This feature allows websites to bind a user's session to their specific device, which makes it
  significantly more difficult for stolen session cookies to be
- Existing concepts: DBSC Walkthrough, Key Attestation Trust, Protocol Handshake, Refresh Loop
  Simulator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Device Bound Session Credentials, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### FedCM—Support showing third-party iframe origins in the UI

- Path: `v142/fedcm-support-showing-third-party-iframe-origins-in-the-ui/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Currently, FedCM always shows the toplevel site in its UI. This works well when
  the iframe is conceptually first-party (e.g. foo.com may have an iframe foostatic.com, which is
  not meaningful to the user). But if the iframe is actually third-party, it would be better to make
  it possible to show the iframe origin in the UI so that the user better underst
- Existing concepts: Embed Allow Matrix, Third-party iframe origin in the FedCM UI, Phishing Defence
  Comparator
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM—Support showing third-party iframe origins in the UI, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Interest Invokers (the `interestfor` attribute)

- Path: `v142/interest-invokers-the-interestfor-attribute/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature adds an `interestfor` attribute to <button> and <a> elements. This
  attribute adds "interest" behaviors to the element, such that when the user "shows interest" in
  the element, actions are triggered on the target element, such as showing a popover. The user
  agent will handle detecting when the user "shows interest" in the element, via methods suc
- Existing concepts: Delay Tuner, Input Mode Matrix, interestfor, Wikipedia-Style Link Previews
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Interest Invokers (the `interestfor` attribute).
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Interest Invokers (the `interestfor` attribute)
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Interoperable pointerrawupdate events exposed only in secure contexts

- Path: `v142/interoperable-pointerrawupdate-events-exposed-only-in-secure-contexts/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The PointerEvents spec restricted pointerrawupdate to secure contexts in 2020,
  hiding both the event firing and the global event listeners from insecure contexts. Through this
  feature, Chrome will match the updated spec and become interoperable with other major browsers.
- Existing concepts: Precision Tracker, Secure-context only, Signature Pad
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Interoperable pointerrawupdate events exposed only in secure
    contexts.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Interoperable pointerrawupdate events exposed only
    in secure contexts behaves inside custom elements, shadow DOM, SPA routing, hydration, and
    accessibility trees.

#### Local network access restrictions

- Path: `v142/local-network-access-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 142 restricted the ability to make requests to the user's local network,
  gated behind a permission prompt. A local network request is any request from a public website to
  a local IP address or loopback, or from a local website (for example, intranet) to loopback.
- Existing concepts: LNA prompt, Preflight Header Inspector, Smart-Home Device Scan
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions.

#### Local network access restrictions for WebSockets

- Path: `v142/local-network-access-restrictions-for-websockets/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Local Network Access(LNA) restrictions are being expanded to include WebSockets.
  WebSockets connections to local address will now start triggering permission prompts.
- Existing concepts: Vite-Style Dev Server HMR, IoT Fleet Browser, WebSocket LNA
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions for WebSockets can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions for WebSockets.

#### Media session: add reason to enterpictureinpicture action details

- Path: `v142/media-session-add-reason-to-enterpictureinpicture-action-details/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Adds `enterPictureInPictureReason` to the `MediaSessionActionDetails` sent to the
  `enterpictureinpicture` action in the Media Session API. This allows developers to distinguish
  between `enterpictureinpicture` actions triggered explicitly by the user (e.g. from a button in
  the user agent) and `enterpictureinpicture` actions triggered automatically by the user
- Existing concepts: Auto-PiP Policy, PiP reason, Window Occlusion Timeline
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Media session: add reason to
    enterpictureinpicture action details.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Mobile and desktop parity for select element rendering modes

- Path: `v142/mobile-and-desktop-parity-for-select-element-rendering-modes/`
- Area: General web platform
- Priority: Medium
- Current framing: By using the size and multiple attributes, the select element can be rendered as
  an in-page listbox or a button with a popup. However, these modes are not consistently available
  across mobile and desktop chrome. Currently, in-page listbox rendering is not available on mobile,
  and button with popup is not available on desktop when the multiple attribute is pr
- Existing concepts: Listbox Mode & Stylable Tree, Responsive Toolbar, Select parity
- Suggested additions:
  - Capability probe and fallback explorer for Mobile and desktop parity for select element
    rendering modes, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Multicast support for Direct Sockets API

- Path: `v142/multicast-support-for-direct-sockets-api/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature allows
  [Isolated Web Apps](https://chromeos.dev/en/web/isolated-web-apps) (IWAs) to subscribe to
  multicast groups and receive User Datagram Protocol (UDP) packets from there. IWAs can now also
  specify additional parameters when sending UDP packets to multicast addresses.
- Existing concepts: Multicast receiver, Service Discovery (mDNS-style), Sync Display Wall
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Multicast
    support for Direct Sockets API can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Multicast support for Direct Sockets API.

#### Non-Tree-Scoped container-name Matching

- Path: `v142/non-tree-scoped-container-name-matching/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Ignore tree-scope when matching container-name for @container queries.
- Existing concepts: Container name cross-shadow, Component Library Across Shadow Trees, Scope
  Conflict Resolver
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Non-Tree-Scoped
    container-name Matching, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Non-Tree-Scoped container-name Matching helps or
    fails.

#### Origin-keyed process isolation

- Path: `v142/origin-keyed-process-isolation/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 142 introduces a shift in the process isolation policy from locking
  processes to a site like `https://example.com` to locking them to a specific origin, such as,
  `https://foo.example.com`. To further enhance security, Chrome is moving to a more granular
  process isolation model called **Origin Isolation**. Previously, Chrome used **Site Isolation**, w
- Existing concepts: Origin Isolation, Process Tree Visualizer, Spectre Side-Channel Mitigation
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Origin-keyed
    process isolation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Origin-keyed process isolation.

#### Range syntax for style container queries and if()

- Path: `v142/range-syntax-for-style-container-queries-and-if/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: This feature enhances CSS style queries and the if() function by adding support
  for range syntax. This extends style queries beyond exact value matching (e.g., style(--theme:
  dark)). Developers can now use comparison operators (>, <, etc.) to compare custom properties,
  literal values (like 10px or 25%), and values from substitution functions like attr() a
- Existing concepts: Density Stepper, if() Thermostat, Range container queries
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Range syntax for style
    container queries and if(), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Range syntax for style container queries and if()
    helps or fails.

#### Sticky user activation across same-origin renderer-initiated navigations

- Path: `v142/sticky-user-activation-across-same-origin-renderer-initiated-navigations/`
- Area: General web platform
- Priority: Medium
- Current framing: This feature preserves the sticky user activation state after a page navigates to
  another same-origin page. The lack of user activation in the post-navigation page prevents some
  use cases like showing virtual keyboards on auto-focus, and this has been a blocker for the
  developers who want to build Multi-page Applications (MPAs) over Single-page Applications
- Existing concepts: Multi-Step MPA Wizard, Post-Navigation Popups, AudioContext, Payment, Sticky
  user activation
- Suggested additions:
  - Capability probe and fallback explorer for Sticky user activation across same-origin
    renderer-initiated navigations, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Stricter *+json MIME token validation for JSON modules

- Path: `v142/stricter-json-mime-token-validation-for-json-modules/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Reject JSON module script responses whose MIME type’s type or subtype contains
  non‑HTTP token code points (e.g. spaces) when matched via *+json; aligns with MIME Sniffing spec
  and other engines. This change is part of the Interop2025 modules focus area.
- Existing concepts: Charset, Parameters, and Edge Cases, Strict JSON MIME, Server Config Doctor
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Stricter
    *+json MIME token validation for JSON modules can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Stricter *+json MIME token validation for JSON modules.

#### Support `download` attribute in SVG <a> element

- Path: `v142/support-download-attribute-in-svg-a-element/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: This feature introduces support for the download attribute on the SVGAElement
  interface in Chromium, aligning with the SVG 2 specification. The download attribute enables
  authors to specify that the target of an SVG hyperlink should be downloaded rather than navigated
  to, mirroring the behavior already supported in HTMLAnchorElement. This enhancement promote
- Existing concepts: Click-A-Bar Chart Export, Diagram Pack Exporter, SVG <a> download
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Support `download` attribute in SVG <a> element,
    chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### :target-before and :target-after pseudo-classes

- Path: `v142/target-before-and-target-after-pseudo-classes/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: These pseudo-classes match scroll markers that are, respectively, before or after
  the active marker (the one matching :target-current) within the same scroll marker group, as
  determined by flat tree order: * :target-before matches all scroll markers that precede the active
  marker in the flat tree order within the group. * :target-after matches all scro
- Existing concepts: Onboarding Stepper, Reading Progress Bar, :target-before and :target-after
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for :target-before and
    :target-after pseudo-classes, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where :target-before and :target-after pseudo-classes
    helps or fails.

#### ::view-transition position absolute

- Path: `v142/view-transition-position-absolute/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: View Transition feature uses a pseudo sub-tree of the element, with
  ::view-transition being the root of that transition. Previously ::view-transition element was
  specified to have a position: fixed. CSSWG made a decision to make this instead position:
  absolute. In effect, this should not be noticeable since this element's containing block remains
  the snap
- Existing concepts: ::view-transition position absolute, Positioned Container Suite, Tabbed Modal
  Inside a Positioned Ancestor
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for ::view-transition position
    absolute, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where ::view-transition position absolute helps or fails.

#### Web Speech API contextual biasing

- Path: `v142/web-speech-api-contextual-biasing/`
- Area: Built-in AI
- Priority: High
- Current framing: This feature enables websites to support contextual biasing for speech
  recognition by adding a recognition phrase list to the Web Speech API.
- Existing concepts: Context phrases, Domain Dictation Lab, Voice Commands as Bias Grammar
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Web Speech API contextual biasing such as
    redaction, triage, summarization, translation, or form assistance with offline/privacy status
    shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### WebGPU: 'primitive_index' feature

- Path: `v142/webgpu-primitive-index-feature/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: This feature adds a new optional capability to WebGPU that exposes a new WGSL
  shader builtin, 'primitive_index'. This builtin provides a per-primitive index to fragment shaders
  on supported hardware, similar to the existing vertex_index and instance_index builtins. The
  primitive index is useful for advanced graphical techniques, such as virtualized geometry.
- Existing concepts: Primitive Heatmap Debugger, WebGPU primitive_index, Triangle Picking
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: 'primitive_index' feature, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: Texture component swizzle

- Path: `v142/webgpu-texture-component-swizzle/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
- Existing concepts: Single-Channel as RGB, Normal Map Channel Swap, Texture component swizzle
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Texture component swizzle, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: Texture formats tier1 and tier2

- Path: `v142/webgpu-texture-formats-tier1-and-tier2/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Extend GPU texture format support with capabilities like render attachment,
  blending, multisampling, resolve and storage_binding.
- Existing concepts: WebGPU format tiers, HDR Gradient with float16 vs 8-bit, Render-target Matrix
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query,
    navigator.storage.estimate(), IndexedDB/Cookie Store probe, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Texture formats tier1 and tier2, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

### v143

#### Allow more characters in javascript DOM APIs

- Path: `v143/allow-more-characters-in-javascript-dom-apis/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The HTML parser has always (or for a long time) allowed elements and attributes
  to have a wide variety of valid characters and names, but the javascript DOM APIs to create the
  same elements and attributes are more strict and don't match the parser. This change relaxes the
  validation of the javascript DOM APIs to match the HTML parser. More context here
- Existing concepts: Attribute name permissivity, Character Permissivity, Parser vs JS, SVG / MathML
  round-trip
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Allow more characters in javascript DOM APIs.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Allow more characters in javascript DOM APIs
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### at-rule: CSS Feature Detection

- Path: `v143/at-rule-css-feature-detection/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: This feature adds an `at-rule()` function to CSS `@supports` which enables
  authors to feature-detect support for CSS at-rules.
- Existing concepts: at-rule support matrix, @supports for at-rules, Progressive CSS
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for at-rule: CSS Feature
    Detection, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where at-rule: CSS Feature Detection helps or fails.

#### CSS Anchored Fallback Container Queries

- Path: `v143/css-anchored-fallback-container-queries/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Introduce @container anchored(fallback) to style descendants of anchor positioned
  elements based on which of position-try-fallbacks is applied.
- Existing concepts: Arrow flip, Fallback Container Query, Menu edge fitter
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Anchored Fallback
    Container Queries, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Anchored Fallback Container Queries helps or
    fails.

#### DataTransfer property for insertFromPaste, insertFromDrop and insertReplacementText input events

- Path: `v143/datatransfer-property-for-insertfrompaste-insertfromdrop-and-insertreplacementte/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Populate the dataTransfer property on input events with inputType of
  insertFromPaste, insertFromDrop, and insertReplacementText to provide access to clipboard and
  drag-drop data during editing operations in contenteditable elements.
- Existing concepts: Drop attributor, InputEvent.dataTransfer, Paste sanitizer, Replacement text
  inspector
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for DataTransfer property for insertFromPaste,
    insertFromDrop and insertReplacementText input events.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses DataTransfer property for
    insertFromPaste, insertFromDrop and insertReplacementText input events in a realistic user
    workflow.

#### Deprecate and remove XSLT

- Path: `v143/deprecate-and-remove-xslt/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: [XSLT v1.0](https://www.w3.org/TR/xslt-10/), which all browsers adhere to, was
  standardized in 1999. In the meantime, XSLT has evolved to v2.0 and v3.0, adding features, and
  growing apart from the old version frozen into browsers. This lack of advancement, coupled with
  the rise of JavaScript libraries and frameworks that offer more flexible and powerful DOM
- Existing concepts: RSS without XSLT, OPML importer, XSLT polyfill explorer, XSLT Removal
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate and
    remove XSLT can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate and remove XSLT.

#### Deprecate getters of Intl Locale Info

- Path: `v143/deprecate-getters-of-intl-locale-info/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Intl Locale Info API is a Stage 3 ECMAScript TC39 proposal to enhance the
  Intl.Locale object by exposing Locale information, such as week data (first day in a week, weekend
  start day, weekend end day, minimun day in the first week), and text direction hour cycle used in
  the locale. https://github.com/tc39/proposal-intl-locale-info We ship our implementat
- Existing concepts: Calendar grid, Getter vs getter matrix, Intl Locale Getters, Codemod helper
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate
    getters of Intl Locale Info can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate getters of Intl Locale Info.

#### Digital Credentials API (issuance support)

- Path: `v143/digital-credentials-api-issuance-support/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: This Web Platform feature enables issuing websites (e.g., a university,
  government agency, or bank) to securely initiate the provisioning (issuance) process of digital
  credentials directly into a user's mobile wallet application. On Android, this capability
  leverages the Android IdentityCredential CredMan system (Credential Manager). On Desktop, it
  leverages
- Existing concepts: Credential Issuance, mDL vs VC flows, Presentation flow, Protocol explorer
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Digital Credentials API (issuance support), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### EditContext: TextFormat underlineStyle and underlineThickness

- Path: `v143/editcontext-textformat-underlinestyle-and-underlinethickness/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chromium shipped https://developer.mozilla.org/en-US/docs/Web/API/EditContext
  with a bug where the https://developer.mozilla.org/en-US/docs/Web/API/TextFormat object supplied
  by the https://developer.mozilla.org/en-US/docs/Web/API/EditContext/textformatupdate_event
  provides incorrect values for the underlineStyle and underlineThickness properties. In Chromiu
- Existing concepts: EditContext Underline, IME style painter, Underline gallery
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so EditContext:
    TextFormat underlineStyle and underlineThickness can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for EditContext: TextFormat underlineStyle and underlineThickness.

#### FedCM-Migration of nonce to params field & Renaming of IdentityCredentialError code attribute to error

- Path: `v143/fedcm-migration-of-nonce-to-params-field-renaming-of-identitycredentialerror-cod/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Migration of nonce to params Field: The nonce parameter in
  navigator.credentials.get() is moving from a top-level field to the params object for better API
  design, extensibility, and maintainability. This structured approach simplifies parsing for
  Identity Providers, supports future-proofing without versioning, and aligns with modern API
  patterns. For Relyin
- Existing concepts: Codemod helper, Error name explorer, params Rename
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM-Migration of nonce to params field & Renaming of IdentityCredentialError code attribute to
    error, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### FedCM Privacy Enforcement for Client Metadata

- Path: `v143/fedcm-privacy-enforcement-for-client-metadata/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: To address cross-site identity correlation risks in the FedCM API, Identity
  Providers (IdPs) that utilize client_metadata within their FedCM configuration are required to
  implement the direct endpoints format in the .well-known/web-identity file. This mandate ensures
  that both accounts_endpoint and login_url are explicitly defined whenever a client_metadata_
- Existing concepts: Config validator, Metadata Fetch, Privacy leak explorer
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM Privacy Enforcement for Client Metadata, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### FedCM—Support Structured JSON Responses from IdPs

- Path: `v143/fedcm-support-structured-json-responses-from-idps/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Allows Identity Providers (IdPs) to return structured JSON objects instead of
  plain strings to Relying Parties (RPs) via the id_assertion_endpoint. This change simplifies
  integration for developers by eliminating the need to manually serialize and parse JSON strings.
  It enables more dynamic and flexible authentication flows, allowing RPs to interpret comp
- Existing concepts: JSON Account List, Localised fields explorer, String vs JSON
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    FedCM—Support Structured JSON Responses from IdPs, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### FileAPI: Blob.bytes()

- Path: `v143/fileapi-blob-bytes/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: The bytes() method of the Blob interface returns a Promise that resolves with a
  Uint8Array containing the contents of the blob as an array of bytes.
- Existing concepts: Blob.bytes(), Drag-drop hex viewer, File hash tool, Streaming vs bytes
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for FileAPI: Blob.bytes().
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses FileAPI: Blob.bytes() in
    a realistic user workflow.

#### Gamepad ongamepadconnected and ongamepaddisconnected event handler attributes

- Path: `v143/gamepad-ongamepadconnected-and-ongamepaddisconnected-event-handler-attributes/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Add ongamepadconnected and ongamepaddisconnected event handlers to the
  WindowEventHandlers interface mixin. This would enable support for window.ongamepad[dis]connected
  or document.body.ongamepad[dis]connected event handler attributes.
- Existing concepts: Handler Attributes, Multi-controller router, Onerror-style handoff
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Gamepad ongamepadconnected and ongamepaddisconnected event
    handler attributes.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### ICU version 77 (supporting Unicode 16)

- Path: `v143/icu-version-77-supporting-unicode-16/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The Unicode support library, International Components for Unicode (ICU), is
  upgraded from version 74.2 to version 77.1, adding support for Unicode 16 and updating locale
  data. Two changes could pose some risk for web applications that assume a specific format from the
  [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Internationalization)
- Existing concepts: Emoji segmenter, Format drift, Unicode 16
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so ICU version
    77 (supporting Unicode 16) can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for ICU version 77 (supporting Unicode 16).

#### Implement CSS property font-language-override

- Path: `v143/implement-css-property-font-language-override/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: This feature introduces support for the font-language-override CSS property in
  Chromium. The property allows developers to override the system language used for OpenType glyph
  substitution by specifying a four-character language tag directly in CSS.
- Existing concepts: Glyph variant explorer, Language Override, Multilingual paragraph
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Implement CSS property
    font-language-override, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Implement CSS property font-language-override helps
    or fails.

#### Restricting spelling and grammar highlights

- Path: `v143/restricting-spelling-and-grammar-highlights/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: This experiment would change when spelling and grammar hints are applied to text
  fields to reduce the of websites ability to extract information about the user’s dictionary,
  specifically: * Hints would not be applied to a text field that has not had user interaction (an
  autofocus is insufficient, there must be a click or key press of some kind relative to t
- Existing concepts: Dictionary leak probe, Spellcheck Restriction, Subtree policy tester
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Restricting spelling and
    grammar highlights, with live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Restricting spelling and grammar highlights helps or
    fails.

#### Speculation rules: mobile "eager" eagerness improvements

- Path: `v143/speculation-rules-mobile-eager-eagerness-improvements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: On mobile, "eager" eagerness speculation rules prefetches and prerenders now
  trigger when HTML anchor elements are in the viewport for a short time.
- Existing concepts: Eagerness comparator, Mobile Eager Tuning, Viewport dwell
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: mobile "eager" eagerness improvements can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: mobile "eager" eagerness improvements.

#### TCP Socket Pool Limit Randomization

- Path: `v143/tcp-socket-pool-limit-randomization/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: By exploiting limits in the connection pool size on Chrome, knowledge can be
  gained about cross-site state which would otherwise be inaccessible. Specifically, it’s possible
  (with some statistical certainty) to evaluate the login state, visited history, or even something
  more specific like whether gmail has pending messages in the inbox.
- Existing concepts: Connection timing tester, Pool Limit Randomization, XS-leak replay
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for TCP Socket Pool Limit Randomization.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how TCP Socket Pool Limit Randomization behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Upsert

- Path: `v143/upsert/`
- Area: General web platform
- Priority: Medium
- Current framing: ECMAScript proposal for Map.prototype.getOrInsert,
  Map.prototype.getOrInsertComputed, WeakMap.prototype.getOrInsert, and
  WeakMap.prototype.getOrInsertComputed.
- Existing concepts: Memoize cache, Counter & group-by patterns, Map.getOrInsert(Computed)
- Suggested additions:
  - Capability probe and fallback explorer for Upsert, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Web App Manifest: specify update eligibility, icon urls are Cache-Control: immutable

- Path: `v143/web-app-manifest-specify-update-eligibility-icon-urls-are-cache-control-immutabl/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Specify an update eligibility algorithm in the manifest spec. This makes the
  update process more deterministic and predictable, giving the dev more control over whether (and
  when) updates should apply to existing installations, and allowing removal of the 'update check
  throttle' that user agents currently need to implement to avoid wasting network resources.
- Existing concepts: Icon immutability, Manifest diff, Manifest Update Hints
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Web App
    Manifest: specify update eligibility, icon urls are Cache-Control: immutable can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Web App Manifest: specify update eligibility, icon urls are
    Cache-Control: immutable.

#### Web Install API

- Path: `v143/web-install-api/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Allows a website to install a web app. The API provides 3 signatures, with 0, 1,
  and 2 parameters, respectively. When invoked, the website installs either itself, or another site
  from a different origin, as a web app (depending on the provided parameters). All 3 signatures
  will be experimented with in parallel.
- Existing concepts: Cross-origin storefront, Install Call, Install Prompt Explorer
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Web Install API is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Web Smart Card API

- Path: `v143/web-smart-card-api/`
- Area: General web platform
- Priority: Medium
- Current framing: Enables smart card (PC/SC) applications to move to the Web platform. It gives
  them access to the PC/SC implementation (and card reader drivers) available in the host OS.
- Existing concepts: APDU builder, Remote desktop relay, Smart Card Connect
- Suggested additions:
  - Capability probe and fallback explorer for Web Smart Card API, using feature detection, fallback
    path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### WebGPU: Texture component swizzle

- Path: `v143/webgpu-texture-component-swizzle/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
- Existing concepts: Channel router, Normal map fix-up, Swizzle
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Texture component swizzle, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: Uniform buffer standard layout

- Path: `v143/webgpu-uniform-buffer-standard-layout/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
- Existing concepts: GLSL port friction, Layout byte grid, UBO Layout
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Uniform buffer standard layout, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRTC RTP header extension behavior change

- Path: `v143/webrtc-rtp-header-extension-behavior-change/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Users of https://chromestatus.com/feature/5680189201711104 found that the API as
  specified was not ergonomic for subsequent offer/answer. The WG has adopted a revised behavior,
  merged to spec in https://github.com/w3c/webrtc-extensions/pull/238, that ensures that subsequent
  offer/answer does not permute the header extensions negotiated unless the user wants
- Existing concepts: L4S disable flow, RTP Header Extension, SDP diff tool
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebRTC RTP
    header extension behavior change can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebRTC RTP header extension behavior change.

#### WebTransport Application Protocol Negotiation

- Path: `v143/webtransport-application-protocol-negotiation/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: WebTransport Application Protocol Negotiation allows negotiation of the protocol
  used by the web application within the WebTransport handshake. A web application can specify a
  list of application protocols offered when constructing a WebTransport object, which are then
  conveyed to the server via HTTP headers; if the server picks one of those protocols, it
- Existing concepts: Protocol negotiator sim, Sub-protocol router, WebTransport ALPN
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebTransport
    Application Protocol Negotiation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebTransport Application Protocol Negotiation.

### v144

#### Capability Elements <usermedia> MVP

- Path: `v144/capability-elements-usermedia-mvp/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Usermedia Capability Element, is a declarative, user-activated control for
  accessing the starting and interacting with media streams.
- Existing concepts: Microphone Meter, Permission UX Compare, Usermedia Element
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Capability Elements <usermedia>
    MVP.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Clipboardchange event

- Path: `v144/clipboardchange-event/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: The "clipboardchange" event fires whenever the system clipboard contents are
  changed either by a web app or any other system application. This allows web-apps like remote
  desktop clients to keep their clipboards synchronized with the system clipboard. It provides an
  efficient alternative to polling the clipboard(using Javascript) for changes.
- Existing concepts: Clipboard Watcher, Format Inspector, State Mirror
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Clipboardchange event.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Clipboardchange event in
    a realistic user workflow.

#### CSS anchor positioning with transforms

- Path: `v144/css-anchor-positioning-with-transforms/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: When an anchor-positioned element is tethered against an anchor that has a
  transform (or is contained by something with a transform), resolve anchor() and anchor-size()
  functions against the bounding box of the transformed anchor.
- Existing concepts: Orbit Tracker, Scale Nest, Transformed Anchor
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS anchor positioning with
    transforms, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS anchor positioning with transforms helps or
    fails.

#### CSS caret-shape property

- Path: `v144/css-caret-shape-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The shape of the caret in native applications is most commonly a vertical bar, an
  underscore or a rectangular block. In addition, the shape often varies depending on the input
  mode, such as insert or replace. The CSS caret-shape property allows sites to choose one of these
  shapes for the caret inside editable elements, or leave the choice up to the browser.
- Existing concepts: Caret Shape Picker, Insert vs Overwrite, Per-input Shapes
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS caret-shape property,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS caret-shape property helps or fails.

#### CSS find-in-page highlight pseudos

- Path: `v144/css-find-in-page-highlight-pseudos/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: This feature exposes **find-in-page** search result styling to authors as a
  highlight pseudo-element, like selection and spelling errors. This allows authors to change the
  foreground and background colors or add text decorations, which can be especially useful if the
  browser defaults have insufficient contrast with the page colors or are otherwise unsuitable
- Existing concepts: Contrast Auditor, Current vs Rest, Highlight Styling
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS find-in-page highlight pseudos.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS find-in-page highlight pseudos behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Deprecate and remove: Attribution Reporting API

- Path: `v144/deprecate-and-remove-attribution-reporting-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The Attribution Reporting API is a privacy-preserving web API designed to measure
  ad conversions without third-party cookies or user tracking across sites.
- Existing concepts: Attribution Removal, First-party Recipe, Migration Probe
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and remove: Attribution Reporting API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and Remove: document.requestStorageAccessFor

- Path: `v144/deprecate-and-remove-document-requeststorageaccessfor/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The requestStorageAccessFor (rSAFor) API is an extension to the Storage Access
  API that allows a top-level site to request access to unpartitioned ("first-party") cookies on
  behalf of embedded sites. Browsers will have discretion to grant or deny access, with mechanisms
  like Related Website Sets (RWS) membership as a potential signal. This allows for use of
- Existing concepts: Embedded Flow Rebuilder, rSAFor Note, requestStorageAccess vs
  requestStorageAccessFor
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and Remove: document.requestStorageAccessFor, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and remove: Private Aggregation API

- Path: `v144/deprecate-and-remove-private-aggregation-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The Private Aggregation API is a generic mechanism for measuring aggregate,
  cross-site data in a privacy preserving manner. It was originally designed for a future without
  third-party cookies.
- Existing concepts: Noise & Budget Simulator, Private Aggregation Note, Reporting Alternatives
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and remove: Private Aggregation API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and Remove Protected Audience

- Path: `v144/deprecate-and-remove-protected-audience/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The Protected Audience API provides a method of interest-group advertising
  without third-party cookies or user tracking across sites.
- Existing concepts: Auction Replay, joinAdInterestGroup / runAdAuction Probe, Removal Note
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and Remove Protected Audience, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and Remove: Related Website Sets (RWS)

- Path: `v144/deprecate-and-remove-related-website-sets-rws/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Related Website Sets (RWS), formerly known as First Party Sets, provides a
  framework for developers to declare relationships among sites, to enable limited cross-site cookie
  access for specific, user-facing purposes. This is facilitated through the use of the Storage
  Access API (SAA) and requestStorageAccessFor (rSAFor). RWS was designed for use in a browser
- Existing concepts: RWS Deprecation Note, RWS Probe, SSO Migration Architect
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and Remove: Related Website Sets (RWS), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and Remove: Shared Storage API

- Path: `v144/deprecate-and-remove-shared-storage-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The Shared Storage API is a privacy-preserving web API to enable storage that is
  not partitioned by first-party site.
- Existing concepts: Cross-tab Coordination, Shared Storage Note, Worklet Probe
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and Remove: Shared Storage API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate savedTabGroups as individual value in SyncTypesListDisabled

- Path: `v144/deprecate-savedtabgroups-as-individual-value-in-synctypeslistdisabled/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: To align desktop and ChromeOS behavior with mobile and to simplify sync
  management, the individual `savedTabGroups` datatype is now deprecated and is no longer an
  individually customizable value within the
  [SyncTypesListDisabled](https://chromeenterprise.google/policies/#SyncTypesListDisabled) policy.
  Previously, the [SyncTypesListDisabled](https://chromeent
- Existing concepts: Policy Migration Diff, Policy Note, Policy String Builder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Deprecate
    savedTabGroups as individual value in SyncTypesListDisabled can be observed instead of
    described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Deprecate savedTabGroups as individual value in SyncTypesListDisabled.

#### Don't use aria-details for anchor positioning

- Path: `v144/don-t-use-aria-details-for-anchor-positioning/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: See the discussion in this issue for more context:
- Existing concepts: ARIA vs Anchor, Refactor Recipes, Screen-reader Trace
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Don't use aria-details for anchor positioning.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Don't use aria-details for anchor positioning
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Enhanced Canvas TextMetrics

- Path: `v144/enhanced-canvas-textmetrics/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Expand the TextMetrics Canvas API to support selection rectangles, bounding box
  queries, and glyph cluster-based operations.
- Existing concepts: Hit-test Canvas Text, Rich TextMetrics, Selection Drag
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Enhanced Canvas TextMetrics, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Externally loaded entities in XML parsing

- Path: `v144/externally-loaded-entities-in-xml-parsing/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome synchronously fetches external XML entities/DTDs and incorporates them
  into parsing under specific circumstances. I propose to remove this functionality.
- Existing concepts: XXE Payload Replay, XXE Probe, XXE Side-by-Side
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Externally
    loaded entities in XML parsing can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Externally loaded entities in XML parsing.

#### IndexedDB: SQLite backend (in-memory contexts)

- Path: `v144/indexeddb-sqlite-backend-in-memory-contexts/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Chromium's IndexedDB implementation is rewritten on top of SQLite, to replace the
  previous implementation that uses a hybrid of LevelDB and flat files. There is no change to the
  Web API.
- Existing concepts: Round-Trip Cycle, Incognito IDB Stress Test, Transaction Stress
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for IndexedDB: SQLite backend (in-memory contexts).
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses IndexedDB: SQLite backend
    (in-memory contexts) in a realistic user workflow.

#### Interoperable Pointer and Mouse boundary events after DOM changes

- Path: `v144/interoperable-pointer-and-mouse-boundary-events-after-dom-changes/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: After an event target gets removed from the DOM, the logical target of the
  pointer as implied by the Pointer and Mouse boundary events (i.e. over, out, enter and leave
  events) should be the nearest ancestor still attached to the DOM. PEWG has recently reached
  consensus on this behavior, see https://github.com/web-platform-tests/interop/issues/380. Chro
- Existing concepts: Boundary Event Trace, DOM Update Replay, Swap vs Remove
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Interoperable
    Pointer and Mouse boundary events after DOM changes can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Interoperable Pointer and Mouse boundary events after DOM changes.

#### Local network access restrictions for WebTransport

- Path: `v144/local-network-access-restrictions-for-webtransport/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Restricts the ability to make requests to the user's local network using
  WebTransport, gated behind a permission prompt. A local network request is any request from a
  public website to a local IP address or loopback, or from a local website (e.g. intranet) to
  loopback. Gating the ability for websites to perform these requests behind a permission reduces t
- Existing concepts: Address Classifier, LNA Permission Flow, WebTransport LNA Classifier
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions for WebTransport can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions for WebTransport.

#### Mirroring of RTL MathML operators

- Path: `v144/mirroring-of-rtl-mathml-operators/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Support for character-level and glyph-level mirroring when rendering MathML
  operators in right-to-left mode. When using RTL mode some operators can be mirrored by changing
  them to another code point (e.g. a right parentheses becomes a left parentheses). This is
  character-level mirroring, with equivalences defined by Unicode's `Bidi_Mirrored` property.
- Existing concepts: Operator Tester, RTL Math Mirror, Textbook Gallery
- Suggested additions:
  - Locale/script matrix: compare Mirroring of RTL MathML operators across languages, scripts,
    writing modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Multicast support for Direct Sockets API

- Path: `v144/multicast-support-for-direct-sockets-api/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature allows
  [Isolated Web Apps](https://chromeos.dev/en/web/isolated-web-apps) (IWAs) to subscribe to
  multicast groups and receive User Datagram Protocol (UDP) packets from there. IWAs can now also
  specify additional parameters when sending UDP packets to multicast addresses.
- Existing concepts: IoT Discovery (mDNS), Multicast Receiver, TTL & Loop Explorer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Multicast
    support for Direct Sockets API can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Multicast support for Direct Sockets API.

#### Non-Tree-Scoped container-name Matching

- Path: `v144/non-tree-scoped-container-name-matching/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Ignore tree-scope when matching container-name for @container queries.
- Existing concepts: Container Scope, Design System Container, Shadow Bridge
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Non-Tree-Scoped
    container-name Matching, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Non-Tree-Scoped container-name Matching helps or
    fails.

#### Performance + Event Timing: InteractionCount

- Path: `v144/performance-event-timing-interactioncount/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The Event Timing API is part of the Performance Timeline and is used to measure
  the performance of user interactions. Certain Events will have an interactionId value assigned to
  them, and this is useful for grouping related interactions based on common physical user inputs or
  gestures.
- Existing concepts: Density Heatmap, INP Budget Tracker, Interaction Counter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Performance +
    Event Timing: InteractionCount can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Performance + Event Timing: InteractionCount.

#### Pointer Lock on Android

- Path: `v144/pointer-lock-on-android/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Provides access to raw mouse movement by locking the target of mouse events to a
  single element and hiding the mouse cursor.
- Existing concepts: FPS Camera, Orbit Controls, Pointer Lock on Android
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Pointer Lock on Android.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Pointer Lock on Android behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Predictable reported storage quota

- Path: `v144/predictable-reported-storage-quota/`
- Area: Storage, databases, and offline data
- Priority: High
- Current framing: Report a predictable storage quota from StorageManager's estimate API for sites
  that do not have unlimited storage permissions.
- Existing concepts: Budget Planner, Quota Stability Probe, Quota Stabilizer
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Predictable reported storage quota.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Predictable reported
    storage quota in a realistic user workflow.

#### Respect overscroll-behavior for keyboard scrolls

- Path: `v144/respect-overscroll-behavior-for-keyboard-scrolls/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: When you set `overscroll-behavior` to a value other than `auto`, the browser
  should not perform scroll chaining. We respect this for mouse or touch scrolling, however keyboard
  scrolls were ignoring it. This change makes keyboard scrolling respect overscroll-behavior as
  well.
- Existing concepts: Input Modes Lab, Keyboard Overscroll, Modal Keyboard Trap
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Respect overscroll-behavior for keyboard scrolls.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Respect overscroll-behavior for keyboard scrolls
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Respect overscroll-behavior on non-scrollable scroll containers

- Path: `v144/respect-overscroll-behavior-on-non-scrollable-scroll-containers/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The overscroll-behavior applies to all scroll container elements, regardless of
  whether those elements currently have overflowing content or are user scrollable. Developers can
  use overscroll-behavior to prevent scroll propagation on an `overflow: hidden` backdrop or an
  `overflow: auto` element without needing to consider whether it will currently be overflo
- Existing concepts: Backdrop Shield, Non-scrollable Overscroll, Popup Overlay
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Respect overscroll-behavior
    on non-scrollable scroll containers, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Respect overscroll-behavior on non-scrollable scroll
    containers helps or fails.

#### RTCDegradationPreference enum value "maintain-framerate-and-resolution"

- Path: `v144/rtcdegradationpreference-enum-value-maintain-framerate-and-resolution/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: "maintain-framerate-and-resolution" disables WebRTC's internal video adaptation.
  This enables the application to implement its own adaptation logic and prevents interference from
  the internal adaptation. From
  https://www.w3.org/TR/mst-content-hint/#dom-rtcdegradationpreference-maintain-framerate-and-resolution:
  Maintain framerate and resolution regardl
- Existing concepts: Call Quality Compare, Custom Adaptor, Send Mode Simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    RTCDegradationPreference enum value "maintain-framerate-and-resolution" can be observed instead
    of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for RTCDegradationPreference enum value
    "maintain-framerate-and-resolution".

#### @scroll-state scrolled support

- Path: `v144/scroll-state-scrolled-support/`
- Area: General web platform
- Priority: Medium
- Current framing: Allows authors to style descendants of containers based on the most recent
  scrolling direction.
- Existing concepts: Direction-aware Nav, Scrolled State Style, State Matrix
- Suggested additions:
  - Capability probe and fallback explorer for @scroll-state scrolled support, using CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Scroll Triggered Animations

- Path: `v144/scroll-triggered-animations/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: This feature adds scroll-position-based control of animations, e.g. playing,
  pausing, and resetting an animation.
- Existing concepts: Once vs Repeat, Range Gallery, Scroll Trigger
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Scroll Triggered Animations,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Scroll Triggered Animations helps or fails.

#### side-relative syntax for background-position-x/y longhands

- Path: `v144/side-relative-syntax-for-background-position-x-y-longhands/`
- Area: General web platform
- Priority: Medium
- Current framing: Defines the background image's position relative to one of its edges.
- Existing concepts: Longhand Builder, Parallax Recipe, Side-relative Syntax
- Suggested additions:
  - Capability probe and fallback explorer for side-relative syntax for background-position-x/y
    longhands, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Speculation Rules: prerender-until-script Action

- Path: `v144/speculation-rules-prerender-until-script-action/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This extends speculation rules to introduce a new action called
  prerender_until_script.
- Existing concepts: Checkout Warmup, Search-as-you-type Prerender, Prerender-until-script Simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    Rules: prerender-until-script Action can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation Rules: prerender-until-script Action.

#### Support ping, hreflang, type and referrerPolicy for SVGAElement

- Path: `v144/support-ping-hreflang-type-and-referrerpolicy-for-svgaelement/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Adds support for ping, hreflang, type, and referrerPolicy attributes on
  SVGAElement, aligning its behavior with HTMLAnchorElement for consistent link handling across HTML
  and SVG.
- Existing concepts: Ping Beacon Test, SVG Anchor Attributes, SVG <a> vs HTML <a>
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Support ping, hreflang, type and referrerPolicy for
    SVGAElement, chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### SVG2 CSS Cascading

- Path: `v144/svg2-css-cascading/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Align the Blink implementation with the SVG2 specification for matching CSS rules
  in <use> element trees.
- Existing concepts: Animated SVG via CSS, SVG Cascade Comparator, Use Tree Theming
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for SVG2 CSS Cascading, chart frame time/memory/quality,
    and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Temporal in ECMA262

- Path: `v144/temporal-in-ecma262/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Temporal API https://github.com/tc39/proposal-temporal in ECMA262 is a new API
  that provides standard objects and functions for working with dates and times. Date has been a
  long-standing pain point in ECMAScript. This proposes Temporal, a global Object that acts as a
  top-level namespace (like Math), that brings a modern date/time API to the ECMAScript lang
- Existing concepts: Calendar Explorer, Duration Arithmetic, Temporal Walkthrough
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Temporal in
    ECMA262 can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Temporal in ECMA262.

#### The <geolocation> element

- Path: `v144/the-geolocation-element/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Introduces the <geolocation> element, a declarative, user-activated control for
  accessing the user's location. It streamlines the user and developer journey by not only handling
  the permission flow but also directly providing location data to the site, often eliminating the
  need for a separate JavaScript API call.
- Existing concepts: Checkout Fill, Geolocation Element, Share-on-tap
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for The <geolocation> element.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### User-Agent Client Hints "ch-ua-high-entropy-values" permissions policy

- Path: `v144/user-agent-client-hints-ch-ua-high-entropy-values-permissions-policy/`
- Area: General web platform
- Priority: High
- Current framing: Adds support for a 'ch-ua-high-entropy-values' permissions policy that enables a
  top-level site to restrict which documents are able to collect high-entropy client hints via the
  navigator.userAgentData.getHighEntropyValues() JS API.
- Existing concepts: High-entropy Policy Simulator, High-entropy Hints Probe, Policy Builder
- Suggested additions:
  - Capability probe and fallback explorer for User-Agent Client Hints "ch-ua-high-entropy-values"
    permissions policy, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### ViewTransitions waitUntil() method

- Path: `v144/viewtransitions-waituntil-method/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The ViewTransition automatically constructs a pseudo-element tree to display and
  animate participating elements in the transition. Per spec, this subtree is constructed when the
  view transition starts animating and is destroyed when the animations associated with all view
  transition pseudo-elements are in the finished state (or more precisely in a non-runnin
- Existing concepts: Cancel or Finish, Extension Recipes, waitUntil Sandbox
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for ViewTransitions waitUntil()
    method, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where ViewTransitions waitUntil() method helps or fails.

#### Web App Manifest: specify update eligibility, icon urls are Cache-Control: immutable

- Path: `v144/web-app-manifest-specify-update-eligibility-icon-urls-are-cache-control-immutabl/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Specify an update eligibility algorithm in the manifest spec. This makes the
  update process more deterministic and predictable, giving the dev more control over whether (and
  when) updates should apply to existing installations, and allowing removal of the 'update check
  throttle' that user agents currently need to implement to avoid wasting network resources.
- Existing concepts: Cache-Control Decision, Eligibility Simulator, Manifest Update Rules Simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Web App
    Manifest: specify update eligibility, icon urls are Cache-Control: immutable can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Web App Manifest: specify update eligibility, icon urls are
    Cache-Control: immutable.

#### WebGPU: `subgroup_id` feature

- Path: `v144/webgpu-subgroup-id-feature/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
- Existing concepts: Device Probe, Parallel Reduction, Subgroup Ballot Visualizer, subgroup_id
  Visualiser
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: `subgroup_id` feature, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU: Uniform buffer standard layout

- Path: `v144/webgpu-uniform-buffer-standard-layout/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Functionality added to the WebGPU spec after its first shipment in a browser.
- Existing concepts: Uniform Layout Comparator, Struct Calculator, WGSL Struct Layout Calculator,
  vec3 Padding Trap
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: Uniform buffer standard layout, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRequest.SecurityInfo in Controlled Frame

- Path: `v144/webrequest-securityinfo-in-controlled-frame/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: This feature introduces a WebRequest.SecurityInfo API for
  [ControlledFrame](https://developer.chrome.com/docs/iwa/controlled-frame). It allows a web app to
  intercept an HTTPS, WSS, or WebTransport request to a server, retrieve the server's certificate
  fingerprint (as verified by the browser), and then use that fingerprint to manually verify the
  certificate o
- Existing concepts: Certificate Inspector, Certificate Pinning Demo, Pinning Workbench, TLS
  Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    WebRequest.SecurityInfo in Controlled Frame can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebRequest.SecurityInfo in Controlled Frame.

#### XRVisibilityMaskChange

- Path: `v144/xrvisibilitymaskchange/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Adds an XRVisibilityMaskChange event that will provide a list of vertices and a
  list of indices to represent the mesh of the visible portion of the user's viewport. This data can
  then be used to confidently limit the amount of the viewport drawn to in order to improve
  performance. To better support this event, XRView's are also given unique identifiers to al
- Existing concepts: Foveated Render Probe, Mask Inspector, Mask Mesh Inspector, Visibility Mask
  Simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    XRVisibilityMaskChange can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for XRVisibilityMaskChange.

### v145

#### presentationTime and paintTime in performance entries

- Path: `v145/add-presentationtime-painttime-to-performance-entries/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 145 exposes paintTime and presentationTime on element timing, LCP, long
  animation frame, and paint timing entries. These fields tell you exactly when pixels were
  committed to the screen — going beyond render start time to capture the compositor handoff.
- Existing concepts: Compositor latency inspector, Paint Timing Demo, Timing Comparison
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    presentationTime and paintTime in performance entries can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for presentationTime and paintTime in performance entries.

#### Chrome removes support for obsolete virtual cameras on macOS

- Path: `v145/chrome-removes-support-for-obsolete-virtual-cameras-on-macos/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Chrome 145 stops enumerating and allowing access to legacy virtual cameras on
  macOS that use the deprecated CoreMediaIO DAL (Device Abstraction Layer) plug-in architecture,
  which Apple removed in macOS 12 Monterey.
- Existing concepts: Device inventory diff, Migration Guide, Virtual Camera Demo
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Chrome removes support for
    obsolete virtual cameras on macOS.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Clipboardchange event

- Path: `v145/clipboardchange-event-sticky-activation-permission-check/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: Chrome 145 ships the clipboardchange event — a window event that fires when the
  system clipboard contents change. The event requires sticky activation (a recent user gesture on
  the page) and the clipboard-read permission to deliver clipboard data in the handler. The event
  signals a change occurred; reading the value is a separate guarded step.
- Existing concepts: Activation & Permissions, Clipboard differ, Clipboard Monitor
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Clipboardchange event is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Column wrapping for multicol

- Path: `v145/column-wrapping-for-multicol/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 adds the column-wrap and column-height CSS properties from the CSS
  Multi-column Layout Level 2 spec. column-wrap controls whether columns overflow their container or
  wrap to a new row (like flex rows), and column-height sets an explicit height cap per column —
  enabling true 2D column layout without JavaScript.
- Existing concepts: Balance playground, Column Wrap Demo, Height-Constrained Columns
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Column wrapping for multicol.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Column wrapping for multicol behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Container Timing

- Path: `v145/container-timing/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Mark any DOM section with a containertiming attribute and a PerformanceObserver
  delivers a timing entry the moment that section finishes its initial paint — LCP-style measurement
  for arbitrary content blocks.
- Existing concepts: Container timing budget monitor, Content Section Timer, Timing Dashboard
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Container
    Timing can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Container Timing.

#### Cookie Store API maxAge attribute

- Path: `v145/cookie-store-api-maxage-attribute/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Chrome 145 adds the maxAge option to the Cookie Store API's cookieStore.set()
  method. Previously, developers had to compute an absolute expires timestamp to set a cookie
  lifetime with the async Cookie Store API. maxAge accepts a relative duration in seconds — matching
  the semantics of the Max-Age attribute in the classic document.cookie string format.
- Existing concepts: maxAge Demo, Session rotator, expires vs maxAge Comparison
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Cookie Store API maxAge attribute.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Cookie Store API maxAge
    attribute in a realistic user workflow.

#### Crash Reporting key-value API

- Path: `v145/crash-reporting-key-value-api/`
- Area: General web platform
- Priority: Medium
- Current framing: Chrome 145 adds a key-value annotation API to the browser's crash reporter,
  letting web applications attach structured metadata that appears alongside crash reports — user
  ID, session ID, feature flags, and more.
- Existing concepts: API Reference, Crash Report Demo, Crash triage console
- Suggested additions:
  - Capability probe and fallback explorer for Crash Reporting key-value API, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### CSS letter-spacing and word-spacing: percentage values

- Path: `v145/css-letter-spacing-and-word-spacing-percentage-values/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 145 adds support for percentage values in the letter-spacing and
  word-spacing CSS properties. Percentages are calculated relative to the advance width of the space
  character (U+0020). This makes typographic spacing responsive to the current font size — a single
  percentage rule scales consistently across headings, body text, and small print.
- Existing concepts: Font Size Scaling, Headline tuner, Percentage Spacing Demo, Type Specimen
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS letter-spacing and
    word-spacing: percentage values, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS letter-spacing and word-spacing: percentage
    values helps or fails.

#### CSS Name-Only Container Queries

- Path: `v145/css-name-only-container-queries/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Query a container by its container-name alone — no container-type required. Style
  rules can now target a specific container's identity without opting it into size containment.
- Existing concepts: Component Roster, Identity Inspector, Style Without Size, Theme Matrix
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Name-Only Container
    Queries, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Name-Only Container Queries helps or fails.

#### Customizable Select Listbox

- Path: `v145/customizable-select-listbox/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 145 extends the customizable <select> element to its listbox rendering
  mode. When a <select> uses size or multiple, it renders as an in-flow listbox rather than a popup
  button. With appearance: base-select, Chrome 145 now allows full CSS control over this in-flow
  presentation — custom borders, option backgrounds, hover states, and more.
- Existing concepts: Basic Listbox Demo, Color Picker Select, Option template lab, Popup vs. Listbox
  Comparison
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Customizable Select Listbox,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Customizable Select Listbox helps or fails.

#### Device Bound Session Credentials

- Path: `v145/device-bound-session-credentials/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 145 ships Device Bound Session Credentials (DBSC) — a protocol that
  cryptographically binds HTTP session cookies to the device, making stolen session cookies unusable
  on other machines.
- Existing concepts: Cookie lifecycle simulator, DBSC Demo, Session Binding
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Device Bound Session Credentials, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Enable monochrome emoji rendering in forced colors mode

- Path: `v145/enable-monochrome-emoji-rendering-in-forced-colors-mode/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 145 renders emoji in monochrome (text color) when Windows High Contrast or
  CSS forced-colors mode is active, ensuring emoji integrate with the user's chosen high-contrast
  palette instead of appearing as bright color islands.
- Existing concepts: Emoji Demo, Forced Colors Context, Glyph substitution explorer
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Enable monochrome emoji rendering in forced colors mode is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Enabling Web Applications to understand bimodal performance timings

- Path: `v145/enabling-web-applications-to-understand-bimodal-performance-timings/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 145 adds APIs that let web applications detect when their performance data
  follows a bimodal distribution — identifying fast cached responses versus slow network fetches —
  rather than averaging across both populations.
- Existing concepts: Bimodal Demo, Distribution detector, Timing Analysis
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Enabling Web
    Applications to understand bimodal performance timings can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Enabling Web Applications to understand bimodal performance timings.

#### onanimationcancel on GlobalEventHandlers

- Path: `v145/expose-onanimationcancel-event-to-globaleventhandlers/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 145 exposes onanimationcancel as an event handler property on
  GlobalEventHandlers (Window, Document, and all Element subclasses). Previously, the
  animationcancel event could only be listened to via addEventListener — setting
  element.onanimationcancel = fn was silently ignored. Chrome 145 aligns with the spec and other
  browsers.
- Existing concepts: Animationcancel Demo, Cancel-aware toast, Cancel Triggers, Loading Spinner
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why onanimationcancel on GlobalEventHandlers is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Expose rtpTimestamp from WebRTC video frames via VideoFrame.metadata()

- Path: `v145/expose-rtptimestamp-from-webrtc-video-frames-via-videoframe-metadata/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 145 adds rtpTimestamp to the metadata returned by VideoFrame.metadata()
  for WebRTC-sourced video frames, enabling web apps to correlate decoded frames with the original
  RTP packet timestamps.
- Existing concepts: RTP jitter tracker, rtpTimestamp Demo, VideoFrame Metadata
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Expose rtpTimestamp from WebRTC
    video frames via VideoFrame.metadata().
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Focus's focusVisible option

- Path: `v145/focus-focusvisible-option/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 adds a focusVisible boolean to the FocusOptions dictionary passed to
  element.focus(). When true, the browser always paints a focus ring and matches :focus-visible,
  regardless of input modality. When false, focus is applied silently — no ring shown. This gives
  JavaScript code explicit control over the focus ring that CSS alone cannot provide.
- Existing concepts: Focus Ring Control, Keyboard vs. Mouse Pattern, Menu focus trace
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Focus's focusVisible option.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Focus's focusVisible option behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Focus's focusVisible option

- Path: `v145/focus-s-focusvisible-option/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 adds a focusVisible option to element.focus(), giving JavaScript
  control over whether the browser shows a visible focus indicator (the focus ring) when
  programmatically focusing an element.
- Existing concepts: Dialog focus restorer, Focus Option Reference, focusVisible Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Focus's focusVisible option.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Focus's focusVisible option behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### IndexedDB: SQLite backend (in-memory contexts)

- Path: `v145/indexeddb-sqlite-backend-in-memory-contexts/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Chrome 145 ships a SQLite-backed implementation of IndexedDB for in-memory
  contexts — private browsing, opaque origins, and storage partitions — replacing the legacy LevelDB
  backend for these cases.
- Existing concepts: IDB Demo, Memory Context Guide, IndexedDB SQLite perf comparator
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for IndexedDB: SQLite backend (in-memory contexts).
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses IndexedDB: SQLite backend
    (in-memory contexts) in a realistic user workflow.

#### InputEvent types for deletion commands

- Path: `v145/inputevent-types-for-deletion-commands-on-non-collapsed-selections/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 completes the InputEvent.inputType values for deletion operations on
  non-collapsed text selections. When the user has text selected and presses Backspace,
  Ctrl+Backspace, or similar deletion keys, the correct word-granularity or sentence-granularity
  inputType is now reported — previously these all fell back to the generic deleteContentBackward.
- Existing concepts: Deletion Type Guide, InputType Monitor, Undo coalescer
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for InputEvent types for deletion commands.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how InputEvent types for deletion commands behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Introducing the Origin API

- Path: `v145/introducing-the-origin-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 exposes a first-class Origin object with isSameOrigin() and
  isSameSite() methods — replacing error-prone string comparisons with explicit, spec-aligned origin
  semantics.
- Existing concepts: Cross-Origin Safety Checker, Origin equivalence tester, Origin Object Explorer
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Introducing the Origin API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Introducing the Origin API behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### JPEG XL decoding support (image/jxl) in blink

- Path: `v145/jpeg-xl-decoding-support-image-jxl-in-blink/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 145 introduces a Rust-based JPEG XL decoder, bringing support for the
  image/jxl MIME type to Blink — currently behind the enable-jxl-image-format flag, with default-on
  planned for late 2026.
- Existing concepts: Conditional JXL loader, Format Showcase, Format Support Detector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so JPEG XL
    decoding support (image/jxl) in blink can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for JPEG XL decoding support (image/jxl) in blink.

#### Local network access restrictions

- Path: `v145/local-network-access-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Requests from public sites to local IP addresses (and from local sites to
  loopback) now require a permission prompt. Mitigates cross-site request forgery attacks against
  intranet routers, IoT devices, and dev servers running on the user's machine.
- Existing concepts: Request Classifier, Split permission probe, targetAddressSpace fetch option
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions.

#### Local Network Access split permissions

- Path: `v145/local-network-access-split-permissions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 145 introduces split permission prompts for Local Network Access (LNA),
  separating requests to private network ranges into distinct permission grants rather than a single
  all-or-nothing prompt.
- Existing concepts: LNA Permission Demo, LNA permission matrix, Permission Model
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local Network
    Access split permissions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local Network Access split permissions.

#### Navigation API: transition.destination

- Path: `v145/navigation-api-expose-destination-in-navigation-transition/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 adds destination to NavigationTransition. During an in-progress
  navigation, navigation.transition.destination exposes the NavigationDestination for the in-flight
  navigation — the same destination object available during the navigate event, now accessible from
  anywhere while the transition is live.
- Existing concepts: Route guard with unsaved-changes check, SPA Transition Demo, Transition
  Introspection
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Navigation API: transition.destination.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Navigation API: transition.destination behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Overscroll effect on non-root scrollers

- Path: `v145/overscroll-effect-on-non-root-scrollers/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 extends the elastic overscroll effect to nested (non-root) scroll
  containers. Before this, only the root scroller (the page itself) showed a rubber-band bounce when
  scrolled past its boundaries; nested scrollable elements clipped silently. Now overscrolling a
  <div> or any scroll container shows the same tactile affordance, matching platform conventions and
  reducing the need for custom JavaScript rubber-band implementations.
- Existing concepts: Overscroll effect toggler, Nested Scroller Demo, Overscroll Behavior Comparison
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Overscroll effect on non-root scrollers.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Overscroll effect on non-root scrollers behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Reduced User-Agent strings by default

- Path: `v145/reduced-user-agent-strings-by-default/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 145 completes the rollout of reduced User-Agent strings — the User-Agent
  HTTP header and navigator.userAgent now return a frozen, minimal string by default, with detailed
  signals available only via the User-Agent Client Hints API.
- Existing concepts: UA fingerprint entropy budget, UA-CH Migration, UA Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Reduced
    User-Agent strings by default can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Reduced User-Agent strings by default.

#### Refine border-radius shadow edge computation for high border-radius

- Path: `v145/refine-border-radius-shadow-edge-computation-for-high-border-radius/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 fixes the computation of box-shadow spread and blur edges for elements
  with very high border-radius values (including fully-circular elements), making the shadow shape
  match the spec and match Firefox/Safari.
- Existing concepts: Computation Reference, Radius stress test, Shadow Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Refine border-radius shadow edge computation for high
    border-radius.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Refine border-radius shadow edge computation for
    high border-radius behaves inside custom elements, shadow DOM, SPA routing, hydration, and
    accessibility trees.

#### Remove BMP Extension for Embedding JPEG-or-PNG-in-BMP

- Path: `v145/remove-bmp-extension-for-embedding-jpeg-or-png-in-bmp/`
- Area: Deprecation and migration
- Priority: High
- Current framing: Chrome 145 removes support for the non-standard BMP extension that allowed JPEG
  or PNG data to be embedded inside a BMP file container — an obscure format variant that poses a
  security risk and is not part of any web standard.
- Existing concepts: BMP Demo, Format Guide, BMP embed sniffer probe
- Suggested additions:
  - Deprecation scanner: paste code/config and detect usage of Remove BMP Extension for Embedding
    JPEG-or-PNG-in-BMP, with severity, timeline, and affected browser versions.
  - Replacement playground: run the old pattern beside the recommended API or server behavior and
    show the user-visible difference.
  - Fleet readiness dashboard: checklist for enterprise/app teams, including telemetry, rollout
    gates, and rollback plans.

#### Secure Payment Confirmation: Browser Bound Keys

- Path: `v145/secure-payment-confirmation-browser-bound-keys/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 145 adds browser-bound key support to Secure Payment Confirmation — a
  device-local cryptographic key managed by the browser, binding SPC credentials to a specific
  browser installation for additional fraud prevention.
- Existing concepts: Browser Bound Demo, Key Management, Key rotation walkthrough
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Secure Payment Confirmation: Browser Bound Keys, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Secure Payment Confirmation: UX Refresh

- Path: `v145/secure-payment-confirmation-ux-refresh/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 145 updates the Secure Payment Confirmation (SPC) browser UI — the dialog
  shown during WebAuthn-backed payment authentication — with a refreshed visual design and clearer
  transaction summary.
- Existing concepts: SPC dialog comparison, SPC UX Demo, UX Changes
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Secure Payment Confirmation: UX Refresh, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Show true window position on Android

- Path: `v145/show-true-window-position-on-android/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: window.screenX, screenY, outerWidth, and outerHeight now report the real position
  and size of the browser window on Android. Used to always be (0,0) regardless of where the window
  actually was — wrong for tablets in freeform windowing mode.
- Existing concepts: Before / after Android, Popup placement math, Window Coordinates
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Show true window position on Android is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### TCP Socket Pool Limit Randomization

- Path: `v145/tcp-socket-pool-limit-randomization/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 randomizes the per-origin TCP socket pool limit (previously a fixed
  value of 6) within a small range each browsing session, preventing fingerprinting that exploited
  the predictable concurrent connection count to identify browsers.
- Existing concepts: Connection fingerprint lab, Security Context, TCP Pool Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for TCP Socket Pool Limit Randomization.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how TCP Socket Pool Limit Randomization behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### text-justify CSS property

- Path: `v145/text-justify-css-property/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 145 adds support for the text-justify CSS property, which controls how
  text is spread when text-align: justify is in effect. Authors can choose between distributing
  extra space only between words (inter-word), between individual characters (inter-character), or
  letting the browser decide (auto). This is essential for East Asian typography where
  inter-character justification is standard.
- Existing concepts: CJK and Latin Justification, Justification Modes, Script lab
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for text-justify CSS property,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where text-justify CSS property helps or fails.

#### Trusted Types spec alignment

- Path: `v145/trusted-types-spec-alignment/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 145 aligns the Trusted Types implementation with the latest W3C
  specification, fixing edge cases in policy enforcement, sink coverage, and error reporting that
  diverged from the spec.
- Existing concepts: Policy conflict tester, Policy Reference, Trusted Types Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Trusted Types spec alignment.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Trusted Types spec alignment behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Upsert

- Path: `v145/upsert/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Chrome 145 adds an "upsert" operation to the IndexedDB object store — a combined
  insert-or-update that atomically writes a record, creating it if absent or updating it if present,
  without a separate read-modify-write cycle.
- Existing concepts: API Patterns, Upsert concurrency stress, Upsert Demo
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Upsert.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Upsert in a realistic
    user workflow.

#### Use of CssPixels in LayoutShift API

- Path: `v145/use-of-csspixels-in-layoutshift-api/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 145 changes the Cumulative Layout Shift (CLS) API to report layout shift
  values in CSS pixels rather than physical pixels, making CLS scores consistent regardless of
  display density or device pixel ratio.
- Existing concepts: CLS Demo, Pixel Units, Zoom resilience checker
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Use of CssPixels in
    LayoutShift API, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Use of CssPixels in LayoutShift API helps or fails.

#### WebAudio: Configurable render quantum

- Path: `v145/webaudio-configurable-render-quantum/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Chrome 151 adds a renderSizeHint option to AudioContext and OfflineAudioContext.
  Rather than being locked to the default 128-frame render quantum, apps can request a specific
  block size, use "hardware" to let the browser pick the optimal quantum for the output device, or
  stay at "default" (128 frames). Matching the quantum to the software buffer size removes a source
  of latency and audio glitches.
- Existing concepts: Latency Benchmark, Render quantum sweep, Render Size Explorer
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for WebAudio: Configurable render
    quantum.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### WebGPU: subgroup_uniformity feature

- Path: `v145/webgpu-subgroup-uniformity-feature/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 145 adds the subgroup_uniformity WGSL feature, relaxing the strict
  uniformity analysis for subgroup operations — allowing WGSL shaders to use subgroup built-ins in
  contexts where strict uniform analysis would incorrectly reject them.
- Existing concepts: Divergence stress, Subgroup Demo, WGSL Reference
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: subgroup_uniformity feature, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRequest.SecurityInfo in Controlled Frame

- Path: `v145/webrequest-securityinfo-in-controlled-frame/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 145 exposes WebRequest.SecurityInfo inside Controlled Frame (the successor
  to the deprecated Chrome Apps WebView), giving isolated web content inspectors access to TLS
  certificate details for requests made within the frame.
- Existing concepts: Controlled-frame cert inspector, Controlled Frame Context, Security Info Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    WebRequest.SecurityInfo in Controlled Frame can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebRequest.SecurityInfo in Controlled Frame.

### v146

#### Cache sharing for extremely pervasive resources

- Path: `v146/cache-sharing-for-extremely-pervasive-resources/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 146 re-enables cross-site cache sharing for a small set of extremely
  pervasive resources — CDN-hosted libraries so widely deployed that sharing their cached copies is
  unlikely to be used for cross-site tracking.
- Existing concepts: Cache Demo, Cache key explorer, Pervasive Resources
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Cache sharing
    for extremely pervasive resources can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Cache sharing for extremely pervasive resources.

#### CPU Performance API

- Path: `v146/cpu-performance-api/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: A way for web apps to ask "how powerful is this device?" — a coarse hint that
  lets them pick between a heavyweight and a lightweight code path without trying to fingerprint the
  CPU. Designed to pair with the Compute Pressure API for dynamic adaptation.
- Existing concepts: Device Tier Readout, Game quality preset, Tier policy router, Video Conference
  Tier Adapter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CPU
    Performance API can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CPU Performance API.

#### Data URL MIME Type Parameter Preservation

- Path: `v146/data-url-mime-type-parameter-preservation/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 146 preserves MIME type parameters in Data URLs. A URL like
  data:text/html;charset=utf-8;base64,… previously had its charset=utf-8 parameter stripped before
  the resource was served. Chrome 146 keeps the full MIME type — matching the spec and aligning with
  Firefox and Safari.
- Existing concepts: Charset Demo, MIME Type Explorer, Roundtrip tester
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Data URL MIME
    Type Parameter Preservation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Data URL MIME Type Parameter Preservation.

#### Focusgroup

- Path: `v146/focusgroup/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The focusgroup HTML attribute turns any container into a single tab-stop with
  arrow-key navigation for its children — replacing the hand-written roving-tabindex pattern used in
  every toolbar, tablist, menubar, and grid in production today.
- Existing concepts: Grid navigation, Nested focusgroup lab, Before / After: Roving Tabindex,
  Toolbar Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Focusgroup.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Focusgroup behaves inside custom elements, shadow
    DOM, SPA routing, hydration, and accessibility trees.

#### Iterator Sequencing

- Path: `v146/iterator-sequencing/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 146 ships Iterator.concat(), a TC39 stage-3 proposal that creates a new
  iterator by sequencing multiple existing iterables one after another. Unlike
  Array.prototype.flat() or spread syntax, it is lazy — elements from each source are only pulled
  when consumed, with no intermediate array allocation.
- Existing concepts: Iterator.concat() Demo, Lazy pipeline builder, Practical Patterns, Pull trace
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Iterator Sequencing.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### LCP match specced behavior for emitting candidates

- Path: `v146/lcp-match-specced-behavior-for-emitting-candidates/`
- Area: General web platform
- Priority: Medium
- Current framing: Chrome 146 aligns the Largest Contentful Paint API's candidate-emitting logic
  with the specification. Previously Chrome emitted LCP candidates in situations the spec says
  should be skipped — for example, elements with zero intrinsic size or elements not visible in the
  viewport. The fix makes LCP scores more consistent with other browser implementations.
- Existing concepts: Candidate Rules, Candidate timeline trace, LCP Demo
- Suggested additions:
  - Capability probe and fallback explorer for LCP match specced behavior for emitting candidates,
    using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Local network access restrictions

- Path: `v146/local-network-access-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Requests from public sites to local IP addresses (and from local sites to
  loopback) now require a permission prompt. Mitigates cross-site request forgery attacks against
  intranet routers, IoT devices, and dev servers running on the user's machine.
- Existing concepts: CSRF Attack Simulator, Permission prompt walkthrough, Preflight inspector,
  Request Classifier
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local network
    access restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local network access restrictions.

#### meta name="text-scale"

- Path: `v146/meta-name-text-scale/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 146 adds support for the <meta name="text-scale"> element. It lets a page
  declare whether it supports user-controlled text scaling — a separate mechanism from full-page
  zoom. When the browser or OS applies an accessibility text-size preference, pages that opt in
  receive text-only scaling without breaking layout.
- Existing concepts: Reading Settings, Text scale comparator, Text Scale Demo, Text Scale vs
  Full-Page Zoom
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for meta name="text-scale", with
    live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where meta name="text-scale" helps or fails.

#### named-feature() function for CSS @supports

- Path: `v146/named-feature-function-for-css-supports/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 150 adds @supports named-feature("…") — a new condition type for detecting
  features that can't be probed with existing @supports mechanisms, such as subtle behaviour
  differences that have no testable property or selector.
- Existing concepts: Feature Flag Dashboard, Feature Query Explorer, Named feature catalog,
  Progressive Enhancement
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for named-feature() function for
    CSS @supports, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where named-feature() function for CSS @supports helps or
    fails.

#### Navigation API: post-commit handler from precommit

- Path: `v146/navigation-api-add-post-commit-handler-from-precommit/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 146 lets you register a post-commit handler from within a precommit
  (navigate event) intercept. A precommit handler runs before the URL changes; the post-commit
  handler registered inside it runs after the commit. This gives fine-grained control over tasks
  that must split across the navigation boundary.
- Existing concepts: Intercept and restore, Post-Commit Demo, Precommit vs Post-Commit, SPA Router
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Navigation API: post-commit handler from precommit.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Navigation API: post-commit handler from precommit
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Playback Statistics API for WebAudio

- Path: `v146/playback-statistics-api-for-webaudio/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 146 adds the AudioRenderCapacity API to AudioContext. It reports real-time
  statistics about the audio render thread — average CPU load, peak load, and the fraction of audio
  renders that underran (causing audible glitches). This lets apps detect audio dropouts and adapt
  workload dynamically.
- Existing concepts: Glitch counter, Latency Stats, Mixer Stats, Render Capacity Monitor
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Playback Statistics API for
    WebAudio.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Populate targetURL during file handling

- Path: `v146/populate-targeturl-during-file-handling/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 146 ensures that LaunchParams.targetURL is populated when a Progressive
  Web App is launched via the File Handling API — for example, when a user opens a file with the PWA
  from the OS file picker or double-clicks a registered file type. Previously targetURL was null in
  this scenario.
- Existing concepts: File Handling Flow, Target URL router, TargetURL Demo
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Populate targetURL during file handling is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Preserving dropEffect from dragover to drop

- Path: `v146/preserving-dropeffect-values-from-dragover-to-drop-events/`
- Area: General web platform
- Priority: Medium
- Current framing: Chrome 146 fixes dataTransfer.dropEffect propagation: the value set in the
  dragover handler is now correctly preserved when the drop event fires. Previously, the drop event
  always received dropEffect = 'none', making it impossible to read in the drop handler what
  operation the user had negotiated during dragover.
- Existing concepts: DropEffect Demo, Dropeffect handoff trace, Kanban Board, Modifier Key Effects
- Suggested additions:
  - Capability probe and fallback explorer for Preserving dropEffect from dragover to drop, using
    feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Sanitizer API

- Path: `v146/sanitizer-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 146 ships the Sanitizer API — a safe-by-default, browser-native way to
  inject untrusted HTML into the DOM without executing scripts or attaching event handlers.
  Element.setHTML() parses and sanitizes in one step, removing <script> tags, onerror attributes,
  and any markup that could lead to XSS. A configurable Sanitizer object lets you further restrict
  the allowed element and attribute set.
- Existing concepts: Comment Editor, Custom Sanitizer Config, Policy comparator, XSS Sanitizer Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Sanitizer API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Sanitizer API behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Scoped Custom Element Registry

- Path: `v146/scoped-custom-element-registry/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 146 ships Scoped Custom Element Registries — a way to create isolated
  CustomElementRegistry instances and associate them with shadow roots. This allows the same custom
  element tag name (e.g. <my-button>) to be defined differently in two independent registries,
  eliminating naming conflicts when composing web apps from third-party component libraries.
- Existing concepts: Nested shadow isolation, Registry Isolation, Shadow DOM Scoping, Version
  Coexistence
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Scoped Custom Element Registry.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Scoped Custom Element Registry behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Scroll Triggered Animations

- Path: `v146/scroll-triggered-animations/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 146 adds scroll-position-based triggering of CSS animations via the
  animation-trigger property and view-timeline. When an element enters a defined scroll range, its
  animation plays; when it exits, the animation pauses or resets. No JavaScript IntersectionObserver
  required for the most common "animate on scroll into view" pattern.
- Existing concepts: Basic Trigger Demo, Scroll Position Demo, Staggered Gallery, Trigger state
  machine
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Scroll Triggered Animations.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Scroll Triggered Animations behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Selective permissions intervention

- Path: `v146/selective-permissions-intervention/`
- Area: General web platform
- Priority: High
- Current framing: Chrome 146 introduces a permissions intervention that blocks permission prompts
  from sites that repeatedly show prompts after the user has denied them. Sites that persist in
  requesting the same permission after denial are silenced — their permission requests are
  auto-denied without showing a prompt.
- Existing concepts: Affected APIs, Intervention Demo, Intervention policy graph
- Suggested additions:
  - Capability probe and fallback explorer for Selective permissions intervention, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Speculation rules: form_submission field

- Path: `v146/speculation-rules-form-submission-field/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Speculation rules gain a form_submission field that lets sites prerender a
  destination as if it were the result of a form GET — for example, a search results page reached
  via a /search?q=… submission. The prerender is activated when the user submits the matching form.
- Existing concepts: Live Search Prerender, Prerender trigger tracer, Speculation Rule Builder
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Speculation
    rules: form_submission field can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Speculation rules: form_submission field.

#### Stop re-queueing LaunchParams on reload

- Path: `v146/stop-re-queueing-launchparams-on-reload/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 146 fixes a bug where reloading a PWA page after a file handling launch
  would retrigger the launchQueue consumer with the original LaunchParams — including file handles —
  from the initial launch. After this fix, a reload is treated as a fresh page load with no queued
  launch parameters.
- Existing concepts: Before/After Comparison, Reload Behavior Demo, Reload counter trace
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Stop
    re-queueing LaunchParams on reload can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Stop re-queueing LaunchParams on reload.

#### Hanging and each-line for text-indent

- Path: `v146/support-hanging-and-each-line-for-text-indent/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 146 adds two optional keywords to the text-indent property from CSS Text
  Level 4. hanging reverses the indent so all lines except the first are indented (a hanging
  indent). each-line applies the indent after every forced line break — not just at the start of the
  block. Both can be combined with a length or percentage value.
- Existing concepts: Bibliography Formatter, Combined keywords lab, Each-Line Demo, Hanging Indent
  Demo
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Hanging and each-line for
    text-indent, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Hanging and each-line for text-indent helps or
    fails.

#### text-indent: hanging and each-line keywords

- Path: `v146/support-the-hanging-and-each-line-for-the-text-indent-property/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Chrome 146 adds support for the optional hanging and each-line keywords for the
  text-indent CSS property. These keywords extend first-line indentation to hanging punctuation and
  to every paragraph line that follows a hard line break.
- Existing concepts: Each-Line Keyword Demo, Hanging Keyword Demo, Live Indent Editor, Print
  typography presets
- Suggested additions:
  - Locale/script matrix: compare text-indent: hanging and each-line keywords across languages,
    scripts, writing modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### trigger-scope

- Path: `v146/trigger-scope/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 146 adds the trigger-scope CSS property, which lets authors limit the
  names of animation triggers declared by trigger-instantiating properties. When set, only triggers
  within the scoped subtree are visible to animation-trigger lookups, preventing name collisions
  between components.
- Existing concepts: Component Scope Inspector, Dual scroller explorer, Scope Isolation Demo,
  Trigger Scope Demo
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for trigger-scope, with live
    before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where trigger-scope helps or fails.

#### Unframed mode (f.k.a. borderless)

- Path: `v146/unframed-mode-f-k-a-borderless/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Isolated Web Apps can opt into "unframed" display mode, painting all the way to
  the OS window edges — no title bar, no system controls, complete custom chrome. For ambitious
  desktop-PWA-style experiences that want pixel-perfect control over the whole surface.
- Existing concepts: Draggable region tester, Drawing Canvas App, Virtual Desktop Client, Window
  Mockup
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Unframed mode (f.k.a. borderless) is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### WebGPU compatibility mode

- Path: `v146/webgpu-compatibility-mode/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 146 adds WebGPU compatibility mode — a subset of WebGPU that can run on
  OpenGL ES 3.1 and OpenGL 4.4, in addition to the primary backends (Vulkan, Metal, D3D12). This
  extends WebGPU to hardware and platforms where Vulkan is not available.
- Existing concepts: Compatibility Demo, Compatibility Limits, Feature fallback matrix, Feature
  Matrix
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU compatibility mode, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU texture and sampler lets

- Path: `v146/webgpu-texture-and-sampler-lets/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 146 adds support for declaring textures and samplers as local let
  variables in WGSL shaders. Previously these could only be declared as module-scope vars bound to
  specific binding groups. The new syntax enables more flexible shader code patterns.
- Existing concepts: Binding tagger playground, Sampler Gallery, Texture Lets Demo, WGSL Syntax
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU texture and sampler lets, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebGPU transient attachments

- Path: `v146/webgpu-transient-attachments/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 146 adds support for WebGPU transient attachments — render pass
  attachments that only exist for the duration of the render pass and don't need to be read back or
  stored after it completes. On tile-based GPU architectures (most mobile GPUs), this eliminates the
  memory bandwidth cost of writing these textures to main memory.
- Existing concepts: Bandwidth budget meter, Memory Benefit, Render Pass Inspector, Transient Demo
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU transient attachments, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebMCP

- Path: `v146/webmcp/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A browser-native implementation of the Model Context Protocol — sites register
  structured tools that AI agents can discover and invoke directly, without scraping HTML or relying
  on hidden APIs.
- Existing concepts: Agent Handshake Simulator, Tool call replay, Tool Registry Explorer, MCP Tool
  Tester
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for WebMCP.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how WebMCP behaves inside custom elements, shadow DOM,
    SPA routing, hydration, and accessibility trees.

### v147

#### Autofill event

- Path: `v147/autofill-event/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A new autofill event fires on input elements when the browser autofills them.
  Replaces the legacy heuristics — listening for input with no InputEvent.data, polling :autofill —
  with a single explicit signal.
- Existing concepts: Autofill Log, Autofill vs Input Event, Refill flow
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Autofill event.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Autofill event behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### Clip Text overflow on user interaction

- Path: `v147/clip-text-overflow-on-user-interaction/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: When a user clicks or navigates into a text element styled with text-overflow:
  ellipsis, Chrome now automatically switches to clip — revealing the full content for editing or
  selection without any JavaScript.
- Existing concepts: Data Table, Live Edit, Overflow Text Editor, Truncated List
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Clip Text overflow on user interaction.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Clip Text overflow on user interaction behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS border-shape

- Path: `v147/css-border-shape/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Define non-rectangular borders using the same shape functions as clip-path —
  except now the border, box-shadow, outline, and background all follow the new geometry.
- Existing concepts: Badge Forge, Progress Steps, Shape Palette, Tooltip Architect
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS border-shape.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS border-shape behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### contrast-color()

- Path: `v147/css-contrast-color/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A CSS color function that automatically returns black or white — whichever has
  higher contrast against a given background — so dynamic color themes never produce unreadable
  text.
- Existing concepts: Hue Explorer, Palette Grid, Tag Cloud, Theme Generator
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for contrast-color(), with live
    before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where contrast-color() helps or fails.

#### CSS update: decoupling of Width and Style properties

- Path: `v147/css-update-decoupling-of-width-and-style-properties/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: In Chrome 147, the computed values of border-width, outline-width, and
  column-rule-width now reflect the author-specified value directly, independent of the
  corresponding *-style property — aligning Chrome with Firefox and WebKit.
- Existing concepts: Computed Value Inspector, Transition Continuity, Width/Style Invariant Test
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS update: decoupling of
    Width and Style properties, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS update: decoupling of Width and Style properties
    helps or fails.

#### CSSPseudoElement interface

- Path: `v147/csspseudoelement-interface/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Element.pseudo('::before') returns a live CSSPseudoElement object, letting
  JavaScript inspect and measure pseudo-elements like real DOM nodes — geometry queries, computed
  styles, and event attribution included.
- Existing concepts: Pseudo-element Geometry Queries, Pseudo-element Inspector, PseudoTarget Events,
  Style Mutation Probe
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    CSSPseudoElement interface, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### CSSPseudoElement support for ::backdrop, ::scroll-marker and ::view-transitions

- Path: `v147/csspseudoelement-support-for-backdrop-scroll-marker-and-view-transitions/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The CSSPseudoElement DOM interface — until now defined only for ::after,
  ::before, and ::marker — extends to ::backdrop, ::scroll-marker, and the view-transition pseudos.
  Authors can now attach event listeners and read computed style on these elements from JS.
- Existing concepts: Backdrop Click, Transition listener, View Transition Pseudo-elements
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSSPseudoElement support for ::backdrop, ::scroll-marker and
    ::view-transitions.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSSPseudoElement support for ::backdrop,
    ::scroll-marker and ::view-transitions behaves inside custom elements, shadow DOM, SPA routing,
    hydration, and accessibility trees.

#### Device Bound Session Credentials

- Path: `v147/device-bound-session-credentials/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: A protocol that lets a site bind a user's session to a hardware-backed keypair on
  the device. Stolen session cookies are no longer enough to impersonate the user — the attacker
  would need the device's private key, which never leaves it.
- Existing concepts: Cookie replay simulator, Protocol Walkthrough, DBSC Session Binding Flow
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Device Bound Session Credentials, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Document Policy in Dedicated Workers

- Path: `v147/document-policy-in-dedicated-workers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Document Policy — the HTTP-header-based mechanism for opting into platform
  constraints — now applies to Dedicated Workers. Performance and security controls can be enforced
  consistently across the document and its workers instead of stopping at the main thread.
- Existing concepts: Policy Headers, Worker Feature Probe, Worker violation probe
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Document
    Policy in Dedicated Workers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Document Policy in Dedicated Workers.

#### Element-scoped view transitions

- Path: `v147/element-scoped-view-transitions/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Call element.startViewTransition() on any HTML element to scope a transition to
  its subtree — multiple transitions run concurrently and the rest of the page stays fully
  interactive.
- Existing concepts: FAQ Accordion, Concurrent Shuffle, Live Feed, Panel Switcher
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Element-scoped view transitions.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Element-scoped view transitions behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Gamepad Event-Driven Input API

- Path: `v147/gamepad-event-driven-input-api/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: A new rawgamepadinputchange event that fires whenever a gamepad sends new input.
  Replaces the polling-by-rAF dance with a push-based input pipeline — lower latency, less wasted
  JS, and proper sub-frame ordering.
- Existing concepts: Button timeline, Gamepad Button Visualizer, Latency Comparator
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Gamepad Event-Driven Input API.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Get Secure Payment Confirmation Capabilities

- Path: `v147/get-secure-payment-confirmation-capabilities/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The new static method PaymentRequest.getSecurePaymentConfirmationCapabilities()
  returns a snapshot of whether the browser can perform Secure Payment Confirmation — letting
  checkout pages discover support before showing the one-touch biometric payment button.
- Existing concepts: Capability Check, Progressive Payment UI, SPC Checkout Flow
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Get Secure Payment Confirmation Capabilities, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### js-profiling in dedicated workers

- Path: `v147/js-profiling-in-dedicated-workers/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The JS Self-Profiling API — sample-based, low-overhead CPU attribution — now
  works inside Dedicated Workers. Sites can finally measure where their worker time is going, gated
  by Document Policy as on the main thread.
- Existing concepts: Profile Comparator, Trace upload, Worker Profile
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    js-profiling in dedicated workers, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### JSON and style support for link rel=modulepreload

- Path: `v147/json-and-style-support-for-link-rel-modulepreload/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 lets you declare JSON and CSS modules as
  <link rel="modulepreload" as="json"> / as="style", so those modules are fetched and parsed before
  the JavaScript that imports them even runs.
- Existing concepts: CSS Module Preloader, JSON Preload Race, Modulepreload Network Waterfall
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so JSON and
    style support for link rel=modulepreload can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for JSON and style support for link rel=modulepreload.

#### loading="lazy" for Video & Audio

- Path: `v147/lazy-loading-for-video-and-audio-elements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The loading="lazy" attribute now works on <video> and <audio> — deferred loading
  until the element nears the viewport, with zero JavaScript required.
- Existing concepts: Media Lazy Load Savings Estimator, Performance Compare, Scroll Detector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    loading="lazy" for Video & Audio can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for loading="lazy" for Video & Audio.

#### Local Network Access Restrictions

- Path: `v147/local-network-access-restrictions/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 tightens Private Network Access (PNA) enforcement. Fetches from public
  websites to private IP ranges (localhost, 192.168.x.x, 10.x.x.x) now require a successful CORS
  preflight carrying Access-Control-Request-Private-Network: true — or they are blocked.
- Existing concepts: Network Boundary Tester, LNA Policy Builder, Preflight Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local Network
    Access Restrictions can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local Network Access Restrictions.

#### Local Network Access restrictions for WebSockets

- Path: `v147/local-network-access-restrictions-for-websockets/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 extends Local Network Access (LNA) protections to WebSocket
  connections. Public websites can no longer open WebSocket connections to local network or loopback
  hosts without the server sending a preflight response granting access.
- Existing concepts: Preflight Flow, WebSocket LNA Upgrade Flow, WebSockets Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local Network
    Access restrictions for WebSockets can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local Network Access restrictions for WebSockets.

#### Local Network Access restrictions for WebTransport

- Path: `v147/local-network-access-restrictions-for-webtransport/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 extends Local Network Access (LNA) protections to WebTransport
  connections. Public websites attempting to open WebTransport sessions to private or loopback
  network addresses must now receive an explicit opt-in from the server before the connection is
  established.
- Existing concepts: WebTransport LNA Threat Model, Preflight Flow, WebTransport Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Local Network
    Access restrictions for WebTransport can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Local Network Access restrictions for WebTransport.

#### LNA restrictions on service worker WindowClient.navigate()

- Path: `v147/local-network-access-restrictions-on-service-worker-windowclient-navigate/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 applies Local Network Access (LNA) restrictions to
  WindowClient.navigate() calls from service workers. A service worker registered by a public page
  can no longer programmatically navigate that page's window to a local network URL.
- Existing concepts: LNA Context, Navigate Demo, SW Navigate LNA Scope Map
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so LNA
    restrictions on service worker WindowClient.navigate() can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for LNA restrictions on service worker WindowClient.navigate().

#### Long Animation Frames style duration

- Path: `v147/long-animation-frames-style-duration/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 147 extends Long Animation Frame (LoAF) entries with styleDuration,
  forcedStyleDuration, layoutDuration, and forcedLayoutDuration — letting you pinpoint whether a
  slow frame was caused by expensive CSS recalculation, layout, or both.
- Existing concepts: LoAF Style Duration Monitor, rAF Budget Monitor, Style vs Layout Analyzer
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Long Animation Frames style
    duration, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Long Animation Frames style duration helps or fails.

#### Math.sumPrecise

- Path: `v147/math-sumprecise/`
- Area: General web platform
- Priority: Medium
- Current framing: A new static method that sums all values in an iterable using a compensated
  algorithm — eliminating the floating-point drift that accumulates with naive + addition.
- Existing concepts: Financial Ledger, Float Drift Lab, Kahan Summation Visualizer, Sum REPL
- Suggested additions:
  - Capability probe and fallback explorer for Math.sumPrecise, using feature detection, fallback
    path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Pointer event suppression on drag start

- Path: `v147/pointer-event-suppression-on-drag-start/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: When an HTML drag starts, Chrome 147 now sends pointercancel, pointerout, and
  pointerleave to the drag source — fulfilling the Pointer Events spec that previously fired these
  only during scroll and zoom gestures.
- Existing concepts: Before / After Comparison, Event Sequence Explorer, Event Stream Visualiser
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Pointer event suppression on drag start.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Pointer event suppression on drag start behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Prerendering cross-origin iframes

- Path: `v147/prerendering-cross-origin-iframes/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Prerendered pages can now keep their cross-origin iframes alive during prerender,
  but only if the iframe's origin opts in via a Supports-Loading-Mode: prerender-cross-origin-frames
  response header. Previously, prerender would skip cross-origin frames entirely, leaving holes in
  the prerendered view.
- Existing concepts: Prerendering Cross-Origin iframe Opt-in Flow, Opt-in Header Check, Shell
  architecture simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Prerendering
    cross-origin iframes can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Prerendering cross-origin iframes.

#### Pseudo target on events

- Path: `v147/pseudo-target-on-events/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: UIEvent, AnimationEvent, and TransitionEvent now expose a .pseudoTarget property
  — when the event originates from a CSS pseudo-element (::before, ::after, ::marker, …) it returns
  the CSSPseudoElement instead of null.
- Existing concepts: Animation Origin Tracker, Pseudo-element Event Tree Explorer, Pseudo-element
  Click Lab, Tooltip Reveal
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Pseudo target on events, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Pseudo target on events helps or fails.

#### PWA origin migration

- Path: `v147/pwa-origin-migration/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: A new manifest field lets developers migrate an installed Progressive Web App
  from one same-site origin to another — preserving user trust, permissions, and the installed app
  identity — without forcing users to uninstall and reinstall.
- Existing concepts: Manifest Config Explorer, PWA Origin Migration Checklist, Migration Timeline
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why PWA origin migration is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Remove inline XSLT for production of SVG

- Path: `v147/remove-inline-xslt-for-production-of-svg/`
- Area: Graphics, GPU, XR, and canvas
- Priority: High
- Current framing: Chrome 147 removes support for using inline XSLT stylesheets to transform XML
  into SVG that is then rendered directly in the page. XSLT-produced SVG content is no longer
  rendered — the XSL processing instruction in XML documents served with text/xml or application/xml
  no longer produces rendered SVG output.
- Existing concepts: Migration Guide, SVG from DOMParser, XSLT SVG Demo
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Remove inline XSLT for production of SVG, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Request.isReloadNavigation attribute

- Path: `v147/request-isreloadnavigation-attribute/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: A boolean on FetchEvent.request that is true when the navigation was a
  user-triggered reload — the Refresh button, location.reload(), or history.go(0) — rather than a
  regular link click or address-bar navigation.
- Existing concepts: Cache Strategy Picker, Reload Detector, Reload vs Navigate
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    Request.isReloadNavigation attribute can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Request.isReloadNavigation attribute.

#### SoftNavigation Performance Entry

- Path: `v147/softnavigation-performance-entry/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: A new PerformanceEntry type for Single-Page Application route changes. Each
  client-side navigation produces a SoftNavigationEntry with its own navigationId — unlocking
  per-navigation Core Web Vitals for SPAs.
- Existing concepts: Core Web Vitals Dashboard, Route Latency Heatmap, SPA Navigation Observer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    SoftNavigation Performance Entry can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for SoftNavigation Performance Entry.

#### Support path attribute on SVG <textPath> element

- Path: `v147/support-path-attribute-on-svg-textpath-element/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The <textPath> element gains a path attribute so you can define the curve inline
  — no more hunting for a matching id on a hidden <path> in <defs>.
- Existing concepts: Animated Text Path, Inline Path Text, Path Text Builder
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Support path attribute on SVG <textPath> element,
    chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Timeline Named Range "scroll"

- Path: `v147/timeline-named-range-scroll/`
- Area: General web platform
- Priority: Medium
- Current framing: A new scroll named range for view timelines covers the entire scroll extent of
  the container — not just the portion where the subject element is visible.
- Existing concepts: Chapter Navigator, Full-Range Fade, Progress Tracker, Section Dots
- Suggested additions:
  - Capability probe and fallback explorer for Timeline Named Range "scroll", using CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Update Device Memory API limits

- Path: `v147/update-device-memory-api-limits/`
- Area: General web platform
- Priority: Medium
- Current framing: Chrome 147 refreshes the set of possible values returned by
  navigator.deviceMemory to reflect modern device capabilities — replacing the old range (0.25–8 GB)
  with a new range up to 32 GB on desktop, reducing fingerprinting at the low end and enabling
  better high-end segmentation.
- Existing concepts: Adaptive Loading Demo, Memory Inspector, Quality Tier Picker
- Suggested additions:
  - Capability probe and fallback explorer for Update Device Memory API limits, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Web Printing API

- Path: `v147/web-printing-api/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Query local printers, interrogate their capabilities, and submit
  precisely-configured print jobs — programmatically, from JavaScript, using Internet Printing
  Protocol semantics. Shipping in Chrome 147 for Isolated Web Apps.
- Existing concepts: Print Job Builder, Printer Discovery, Receipt Formatter
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Web Printing API.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Web Printing API behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### WebNN

- Path: `v147/webnn/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: A low-level web API that exposes the platform's native machine-learning
  acceleration — CPU vector instructions, NPUs, GPUs — to web apps. Frameworks like ONNX Runtime Web
  and TensorFlow.js can target WebNN to run inference at native speed without shipping their own
  runtime.
- Existing concepts: Adapter Probe, Linear Regression Demo, Tensor arithmetic
- Suggested additions:
  - Capability profiler: query navigator.ml, adapter/backend query, choose the best rendering path,
    and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebNN, chart frame time/memory/quality, and compare
    graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRequest.SecurityInfo in Controlled Frame

- Path: `v147/webrequest-securityinfo-in-controlled-frame/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 adds SecurityInfo data to the webRequest API inside ControlledFrame —
  the IWA equivalent of <webview>. An Isolated Web App can now intercept an HTTPS request, retrieve
  the server's verified TLS certificate fingerprint, and use it to authenticate a parallel raw
  TCP/UDP connection to the same host.
- Existing concepts: API Explorer, Certificate Flow, TLS Grade Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    WebRequest.SecurityInfo in Controlled Frame can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebRequest.SecurityInfo in Controlled Frame.

#### WebXR Layers

- Path: `v147/webxr-layers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 ships WebXR Layers, a rendering API that lets the device compositor
  handle layer compositing rather than JavaScript. Layers improve quality and performance: they
  render at display resolution with dedicated depth, avoid double-compositing artefacts, and allow
  different types of geometry — quads, cylinders, equirectangular projections — as first-class
  objects.
- Existing concepts: Compositor Model, Layer Type Explorer, UI Overlay Simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so WebXR Layers
    can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for WebXR Layers.

#### WebXR plane detection

- Path: `v147/webxr-plane-detection/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 147 ships the WebXR Plane Detection API — a feature that lets AR
  experiences detect real-world flat surfaces (floors, tables, walls) during a WebXR session, and
  retrieve their 3D pose and polygon shape in the AR scene.
- Existing concepts: Plane Detection Demo, Plane Types, Surface Anchor Manager
- Suggested additions:
  - Capability profiler: query CSS.supports(), navigator.xr, session feature support, choose the
    best rendering path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebXR plane detection, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebXR Plane Detection API

- Path: `v147/webxr-plane-detection-api/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 147 ships the WebXR Plane Detection API, letting AR web apps retrieve the
  set of real-world planes — floors, walls, tables — detected by the device. Unlike depth-based
  detection, plane detection surfaces semantic geometry that remains coherent even when objects
  occlude part of a surface.
- Existing concepts: Capability Inspector, Plane Polygon Inspector, Plane Visualizer
- Suggested additions:
  - Capability profiler: query navigator.xr, session feature support, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebXR Plane Detection API, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### X25519Kyber768 key encapsulation for TLS

- Path: `v147/x25519kyber768-key-encapsulation-for-tls/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: A post-quantum hybrid key-exchange mechanism for TLS, layering NIST's ML-KEM on
  top of classical X25519. When you and the server both support it, your session is forward-secret
  against a future quantum adversary that records today's traffic.
- Existing concepts: Handshake bytes, Post-Quantum Timeline, TLS Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    X25519Kyber768 key encapsulation for TLS can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for X25519Kyber768 key encapsulation for TLS.

#### XML parsing in Rust for non-XSLT scenarios

- Path: `v147/xml-parsing-in-rust-for-non-xslt-scenarios/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 147 replaces the C++ XML parser used in non-XSLT contexts (DOM parsing,
  XMLHttpRequest, Fetch XML responses) with a new Rust-based parser. Rust's memory safety guarantees
  eliminate an entire class of memory corruption bugs that previously required patching in C++.
- Existing concepts: Rust Parser Demo, Safety Comparison, XML Security Fuzzer
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so XML parsing
    in Rust for non-XSLT scenarios can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for XML parsing in Rust for non-XSLT scenarios.

### v148

#### Agentic Federated Login

- Path: `v148/agentic-federated-login/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: A set of FedCM extensions to help agentic browsers safely log users in to
  websites using their federated accounts — without relying on the brittle DOM-actuation pattern
  that current agents fall back to.
- Existing concepts: Login Element Gallery, Login Flow Walkthrough, Session State Inspector
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Agentic Federated Login, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### @supports at-rule()

- Path: `v148/at-rule-css-feature-detection/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Detect CSS at-rule support directly in stylesheets. @supports
  at-rule(@starting-style), @supports at-rule(@layer), @supports at-rule(@property) — feature-gate
  styles that depend on newer at-rules without JavaScript.
- Existing concepts: At-Rule Capability Matrix, Feature Detector, Progressive Enhancement
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for @supports at-rule().
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how @supports at-rule() behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Clip Text overflow on user interaction

- Path: `v148/clip-text-overflow-on-user-interaction/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: When a user clicks or navigates into a text element styled with text-overflow:
  ellipsis, Chrome now automatically switches to clip — revealing the full content for editing or
  selection without any JavaScript.
- Existing concepts: Editable Cell Grid, Live Edit, Truncated List
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Clip Text overflow on user interaction.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Clip Text overflow on user interaction behaves
    inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Connection Allowlists

- Path: `v148/connection-allowlists/`
- Area: General web platform
- Priority: Medium
- Current framing: A site-controlled allowlist of outbound endpoints. Once configured, requests
  initiated from the document (or any worker it spawns) can only reach the endpoints the site has
  authorised — even if a script tries to send data elsewhere.
- Existing concepts: Allowlist Violation Demo, Endpoint Tester, Policy Inspector
- Suggested additions:
  - Capability probe and fallback explorer for Connection Allowlists, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Container Timing

- Path: `v148/container-timing/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Mark any DOM section with a containertiming attribute and a PerformanceObserver
  delivers a timing entry the moment that section finishes its initial paint — LCP-style measurement
  for arbitrary content blocks.
- Existing concepts: Content Section Timer, LCP vs Container Timing, Timing Dashboard
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Container
    Timing can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Container Timing.

#### Content type in Resource Timing

- Path: `v148/content-type-in-resource-timing/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The PerformanceResourceTiming interface gains a contentType property — a
  normalised MIME type string reflecting the server's Content-Type header. Filter, group, and
  analyse what your page actually loaded.
- Existing concepts: Live Resource Inspector, MIME Type Audit, Resource Breakdown Chart
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Content type
    in Resource Timing can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Content type in Resource Timing.

#### Correctly set "dropEffect" for "dragEnter", "dragLeave" and "dragOver" events

- Path: `v148/correctly-set-dropeffect-for-dragenter-dragleave-and-dragover-events/`
- Area: General web platform
- Priority: Medium
- Current framing: Chrome 148 fixes dataTransfer.dropEffect on drag events: dragenter and dragover
  now report the effective operation based on effectAllowed, and dragleave always reports "none" —
  as the spec requires.
- Existing concepts: DropEffect Live Viewer, DropEffect Matrix, Effective Drop Detection
- Suggested additions:
  - Capability probe and fallback explorer for Correctly set "dropEffect" for "dragEnter",
    "dragLeave" and "dragOver" events, using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### CSS Name-Only Container Queries

- Path: `v148/css-name-only-container-queries/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Query a container by its container-name alone — no container-type required. Style
  rules can now target a specific container's identity without opting it into size containment.
- Existing concepts: Component Roster, Identity Inspector, Style Without Size
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Name-Only Container
    Queries, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Name-Only Container Queries helps or fails.

#### Declarative CSS module scripts

- Path: `v148/declarative-css-module-scripts/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Define inline CSS style modules with <style type="module" specifier="foo"> and
  apply them to declarative shadow roots via shadowrootadoptedstylesheets="foo" — sharing
  stylesheets across shadow DOMs without JavaScript or FOUC-prone <link> elements.
- Existing concepts: Component Library, Shadow DOM Theming, Style Module Share
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Declarative CSS module scripts.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Declarative CSS module scripts behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Deprecate and remove non-allowlisted Event interfaces

- Path: `v148/deprecate-and-remove-non-allowlisted-event-interfaces-from-document-createevent/`
- Area: JavaScript, DOM, and HTML platform
- Priority: High
- Current framing: Chrome's document.createEvent("Foo") factory historically accepted dozens of
  legacy interface names. Many of those produced events that didn't behave like real DOM events.
  This change drops everything that isn't on the modern allowlist — older callers fall back to the
  standard Event constructor instead.
- Existing concepts: createEvent Factory Roll Call, Migration Guide: createEvent, Modern
  Constructors
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Deprecate and remove non-allowlisted Event interfaces.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Deprecate and remove non-allowlisted Event
    interfaces behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility
    trees.

#### Extended lifetime shared workers

- Path: `v148/extended-lifetime-shared-workers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Pass extendedLifetime: true to the SharedWorker constructor and the worker
  continues running after all client pages close — enabling true background processing without a
  Service Worker.
- Existing concepts: Background Channel, Offline Queue, Persistent Counter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Extended
    lifetime shared workers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Extended lifetime shared workers.

#### Get Secure Payment Confirmation capabilities

- Path: `v148/get-secure-payment-confirmation-capabilities/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 148 adds PaymentRequest.getSecurePaymentConfirmationCapabilities() — a
  static method that lets merchants and banks query whether Secure Payment Confirmation (SPC) is
  available on the device before attempting to show the payment sheet.
- Existing concepts: Capabilities Demo, Payment Flow Gate, SPC Overview
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Get Secure Payment Confirmation capabilities, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### HTML-in-canvas

- Path: `v148/html-in-canvas/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Draw live DOM elements directly into 2D canvas or WebGL/WebGPU textures — with
  accessibility, find-in-page, dark mode, and browser extensions intact. The DOM stays the DOM; the
  canvas gets the pixels.
- Existing concepts: Canvas Renderer, DOM-to-Canvas Bridge, layoutsubtree Explorer, Thumbnail
  Generator
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for HTML-in-canvas, chart frame time/memory/quality, and
    compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### IDNA ContextJ rules

- Path: `v148/idna-contextj-rules/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Chrome 148 enforces IDNA2008 ContextJ joining rules for internationalized domain
  names (IDN). Characters that require a specific joining context — such as Zero Width Joiner (ZWJ)
  and Zero Width Non-Joiner (ZWNJ) — are now validated to ensure they appear only in the Unicode
  contexts where they are permitted.
- Existing concepts: ContextJ Demo, Domain Validator, Rule Reference
- Suggested additions:
  - Locale/script matrix: compare IDNA ContextJ rules across languages, scripts, writing modes,
    emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Language Detector API

- Path: `v148/language-detector-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Detect the language of any text entirely on-device using Chrome's built-in ML
  model. No API key, no network round-trip, no privacy exposure — the inference runs locally in the
  browser.
- Existing concepts: Content Router, Language Sniffer, Live Language Badge, Multilingual Sorter
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Language Detector API such as redaction,
    triage, summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### loading="lazy" for Video & Audio

- Path: `v148/lazy-loading-for-video-and-audio-elements/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: The loading="lazy" attribute now works on <video> and <audio> — deferred loading
  until the element nears the viewport, with zero JavaScript required.
- Existing concepts: Lazy Gallery, Performance Compare, Scroll Detector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    loading="lazy" for Video & Audio can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for loading="lazy" for Video & Audio.

#### Long Animation Frames style duration

- Path: `v148/long-animation-frames-style-duration/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Adds styleDuration and forcedStyleDuration to the Long Animation Frame API so
  performance-conscious developers can finally tell their style time apart from their layout time.
- Existing concepts: Animation Profiler, Forced Style Flush, Style Cost Meter
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Long
    Animation Frames style duration can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Long Animation Frames style duration.

#### Manifest Localization

- Path: `v148/manifest-localization/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: PWA manifests can now carry per-locale name, description, and icon translations
  using name_localized and sibling members. The browser picks the right values for the user's
  language automatically — no server-side manifest swapping required.
- Existing concepts: Locale Manifest Inspector, Manifest Builder, Multilingual PWA Simulator
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Manifest Localization is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### OpaqueRange

- Path: `v148/opaquerange/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A live span of text inside a <textarea> or text-based <input> exposed as a
  Range-like object. Lets you read geometry (getBoundingClientRect, getClientRects) and apply CSS
  Custom Highlights to text inside native form controls — without rebuilding the control as a
  contenteditable div.
- Existing concepts: OpaqueRange Geometry Playground, Highlight Textarea, Spell-check Overlay
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for OpaqueRange, with live
    before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where OpaqueRange helps or fails.

#### Open Font Format avar2 text shaping and glyph rendering

- Path: `v148/open-font-format-avar2-text-shaping-and-glyph-rendering/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Version 2 of the OpenType avar table lets font designers link variation axes
  together — one slider controls many, unlocking richer variable-font design spaces in Chrome 148.
- Existing concepts: avar2 Type Specimen, Axis Explorer, Linked Axes
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Open Font Format avar2 text
    shaping and glyph rendering, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Open Font Format avar2 text shaping and glyph
    rendering helps or fails.

#### Declarative Partial Updates

- Path: `v148/out-of-order-streaming/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Two new ways to insert HTML: out-of-order streaming with <template for>
  placeholders, and a revamped suite of JavaScript insertion methods — setHTML(), appendHTML(),
  streamHTMLUnsafe() — with Streams API integration.
- Existing concepts: HTML Insertion REPL, Streaming Feed, Template Slots Demo
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Declarative Partial Updates.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Parse processing instructions in HTML

- Path: `v148/parse-processing-instructions-in-html/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Processing instructions (`<?target data>`) are an existing DOM construct, exposed
  in XML, that allows node objects that are not elements but can have some semantic meaning for the
  processing of a document. Chrome 148 starts parsing them inside HTML so they can be used to denote
  streaming ranges, custom highlights, and other annotations without inventing new elements.
- Existing concepts: Annotation Stream, PI Tree Inspector, Range Marker Highlighter
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Parse processing instructions in HTML.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Pointer event suppression on drag start

- Path: `v148/pointer-event-suppression-on-drag-start/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 148 aligns with the HTML spec: when a drag operation starts, the browser
  sends a pointercancel event to the drag source to signal that the pointer event stream has ended.
  This ensures that pointer event listeners don't continue to fire unexpectedly during a drag.
- Existing concepts: Drag Events Demo, Event Sequence Viewer, State Machine Visualiser
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Pointer event suppression on drag start.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Predictable reported storage quota

- Path: `v148/predictable-reported-storage-quota/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: StorageManager's estimate() now returns a predictable quota for sites that don't
  hold unlimited-storage permission. This closes a side channel that let pages detect whether the
  user was in incognito by reading the dramatically smaller available space.
- Existing concepts: Incognito Fingerprint Sandbox, Quota Inspector, Quota Planner
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Predictable reported storage quota, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Prompt API

- Path: `v148/prompt-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Direct access to Gemini Nano running on-device in Chrome. Text, image, and audio
  inputs; structured JSON output; no server round-trip, no API key, no network dependency for
  inference.
- Existing concepts: Conversation History, Prompt Playground, Structured Output Studio
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Prompt API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Prompt API Sampling Parameters

- Path: `v148/prompt-api-sampling-parameters/`
- Area: Built-in AI
- Priority: High
- Current framing: Adds temperature and topK sampling controls to the Prompt API. Developers can now
  tune the creativity vs. consistency knob on each LanguageModel instance, plus read the static
  defaults the model ships with.
- Existing concepts: Creative Writing Studio, Determinism Test, Sampling Playground
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Prompt API Sampling Parameters such as
    redaction, triage, summarization, translation, or form assistance with offline/privacy status
    shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### PWA origin migration

- Path: `v148/pwa-origin-migration/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: A new manifest field lets developers migrate an installed Progressive Web App
  from one same-site origin to another — preserving user trust, permissions, and the installed app
  identity — without forcing users to uninstall and reinstall.
- Existing concepts: Manifest Config Explorer, Migration Timeline, Origin Validator
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why PWA origin migration is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Remove explicit border-color UA stylesheet rule for tables

- Path: `v148/remove-explicit-border-color-ua-stylesheet-rule-for-tables/`
- Area: CSS layout and rendering
- Priority: High
- Current framing: Chrome's user-agent stylesheet was pinning the border-color of <table>, <tr>,
  <td>, and friends to a hard-coded grey. That rule overrode the inherited color, breaking sites
  that wanted the table border to follow text colour. With the rule removed, table borders now
  inherit from currentColor like every other element.
- Existing concepts: currentColor Table, Dark Mode Borders, Themed Data Grid
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Remove explicit border-color
    UA stylesheet rule for tables, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Remove explicit border-color UA stylesheet rule for
    tables helps or fails.

#### Renewed HTML insertion & streaming methods

- Path: `v148/renewed-html-insertion-streaming-methods/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: A coherent set of methods for dynamically inserting HTML into a document,
  replacing the fragmented mix of insertAdjacentHTML, setHTML, setHTMLUnsafe, innerHTML and
  createContextualFragment. Positional methods (before / after / append / prepend / replaceWith)
  take HTML directly, and streaming variants return a WritableStream.
- Existing concepts: Method Cookbook, Position Insertion Explorer, Streaming vs Sync
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Renewed HTML insertion & streaming methods.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### SharedWorker on Android

- Path: `v148/sharedworker-on-android/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 148 re-enables SharedWorker on Android. A single worker process can now
  back multiple tabs of the same origin on mobile, closing a long-standing gap with desktop Chrome,
  Firefox, and iOS Safari.
- Existing concepts: Collaborative Notes, Shared Clock, Cross-Tab Counter
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for SharedWorker on Android, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where SharedWorker on Android helps or fails.

#### Summarizer API performance preference

- Path: `v148/summarizer-api-performance-preference/`
- Area: Built-in AI
- Priority: High
- Current framing: Adds a performance option to Summarizer.create(). Sites can ask for a fast
  lightweight model when they need responsiveness, or a high-quality larger model when output
  quality matters more.
- Existing concepts: Article Summarizer, Comment Stream, Fast vs Quality
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Summarizer API performance preference
    such as redaction, triage, summarization, translation, or form assistance with offline/privacy
    status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### text-decoration-skip-ink: all

- Path: `v148/text-decoration-skip-ink-all/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Extend ink-skipping underlines to every glyph — including CJK characters that
  auto deliberately left un-skipped. Opt in to consistent descender clearance across all writing
  systems.
- Existing concepts: Multilingual Comparison, Script Sampler, Underline Workshop
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for text-decoration-skip-ink:
    all, with live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where text-decoration-skip-ink: all helps or fails.

#### The revert-rule keyword

- Path: `v148/the-revert-rule-keyword/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Roll back individual CSS declarations to whatever the cascade provided before the
  current rule — without touching any other property. A surgical undo for the cascade.
- Existing concepts: Cascade Unwinder, Component Reset Demo, Conditional Polish
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for The revert-rule keyword, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where The revert-rule keyword helps or fails.

#### Translator API

- Path: `v148/translator-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Translate text between languages entirely on-device using Chrome's built-in ML
  model. One Translator.create() call, one translate(text) call — no API key, no network, no privacy
  exposure.
- Existing concepts: Batch Translator, Live Translator, Translate Chain
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Translator API such as redaction, triage,
    summarization, translation, or form assistance with offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### User-action pseudo-class top-layer boundary

- Path: `v148/user-action-pseudo-class-top-layer-boundary/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: User-action pseudo-classes (:hover, :active, :focus-within) no longer propagate
  across the top-layer boundary. When a dialog or popover opens, hover and focus state on the
  element behind it stays where it is until you close the layer — matching what Firefox and Safari
  already do.
- Existing concepts: Focus-Within Boundary, Layer Boundary, Nested Dialogs Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for User-action pseudo-class top-layer boundary.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how User-action pseudo-class top-layer boundary
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Web app HTML install element

- Path: `v148/web-app-html-install-element/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: A declarative <install>-style element that lets a site prompt the user to install
  a web app — without JavaScript and without the bespoke beforeinstallprompt dance. Supports
  cross-origin install via two attributes for marketplaces and aggregator sites.
- Existing concepts: Cross-Origin Installer, Install Button Cookbook, Marketplace Listing
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Web app HTML install element is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Web Authentication Immediate UI mode

- Path: `v148/web-authentication-immediate-ui-mode/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: A new mediation: "immediate" option for navigator.credentials.get() — shows the
  browser sign-in UI only if a passkey or password is already known for the site, and rejects
  instantly with NotAllowedError if there is none.
- Existing concepts: Credential Availability Gate, Immediate vs Conditional UI, Silent Auth Flow
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Web Authentication Immediate UI mode, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Web Serial API on Android

- Path: `v148/web-serial-api-on-android/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 148 brings the Web Serial API to Android, enabling mobile web apps to
  communicate with USB and Bluetooth serial devices using the same navigator.serial interface
  already available on desktop.
- Existing concepts: Port Explorer, Sensor Data Logger, Serial Terminal
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Web Serial API on Android.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### WebGPU: linear_indexing feature

- Path: `v148/webgpu-linear-indexing-feature/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The WGSL language extension linear_indexing adds two new compute-shader built-in
  values — global_invocation_index and workgroup_index — that convert 3-D dispatch coordinates to a
  flat index automatically, eliminating a common class of repetitive, error-prone boilerplate.
- Existing concepts: Compute Benchmark, Index Visualizer, Shader Code Comparison
- Suggested additions:
  - Capability profiler: query navigator.gpu, adapter feature/limit query, choose the best rendering
    path, and explain why the browser selected it.
  - Visual benchmark: run a small workload for WebGPU: linear_indexing feature, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebRTC Datachannel: Always negotiate data channels

- Path: `v148/webrtc-datachannel-always-negotiate-data-channels/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: The new alwaysNegotiateDataChannels option for RTCPeerConnection tells the
  browser to include data channel negotiation in every SDP offer and answer — eliminating a class of
  race conditions where one peer creates a channel before the other is ready to receive it.
- Existing concepts: Connection Timeline Simulator, File Transfer Demo, Negotiation Modes Comparison
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for WebRTC Datachannel: Always negotiate data channels.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

### v149

#### Allow payment handlers to report back internal errors

- Path: `v149/allow-payment-handlers-to-report-back-internal-errors/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Payment handlers accessed via the Payment Request API can now return distinct
  errors: AbortError for user cancellation and OperationError for internal payment app failures.
  Merchants can finally distinguish "user said no" from "something broke" and route the user
  accordingly.
- Existing concepts: Checkout Flow Simulator, Error Signal Tester, Smart Retry Flow
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Allow payment handlers to report back internal errors, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Android IME media insertion

- Path: `v149/android-ime-media-insertion/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Android IMEs can now insert images, GIFs, and stickers directly into web pages —
  the same affordance native Android apps have had via InputConnection.commitContent(). Web editors
  that opt in receive the media as a InputEvent with a dataTransfer attached.
- Existing concepts: BeforeInput Monitor, Comment Composer, Sticker Drop
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Android IME media insertion.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Capability Elements <usermedia>

- Path: `v149/capability-elements-usermedia-mvp/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Chrome 149 ships the <usermedia> HTML element — a declarative, browser-controlled
  button for requesting camera and microphone access. It replaces ad-hoc JavaScript permission flows
  with a semantic, secure, and user-friendly in-page element.
- Existing concepts: Constraints Builder, Element vs. JS API, Stream Controller
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Capability Elements <usermedia>.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Clip text-overflow on user interaction

- Path: `v149/clip-text-overflow-on-user-interaction/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 149 changes how text-overflow: ellipsis behaves when a user interacts with
  the text. During editing or keyboard caret navigation, the ellipsis temporarily switches to clip
  so users can see and interact with the full text content — not a truncated version.
- Existing concepts: Editing Scenarios, Interaction Demo, Search Results Demo
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Clip text-overflow on user
    interaction, with live before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Clip text-overflow on user interaction helps or
    fails.

#### Comma-separated Container Queries

- Path: `v149/comma-separated-container-queries/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: An @container rule can now hold several queries separated by commas. The block
  applies if any one of them matches — the same shape that's worked for @media and @supports
  forever, finally extended to container queries.
- Existing concepts: Breakpoint Matrix, Fallback Query, Multi-condition Explorer
- Suggested additions:
  - Device/session probe: read CSS.supports(), navigator.mediaDevices, track settings/capabilities,
    request permissions, and show live track/session state transitions for Comma-separated Container
    Queries.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CSS Gap Decorations

- Path: `v149/css-gap-decorations/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Draw lines inside the gaps of grid, flexbox, and multi-column layouts — without
  borders, pseudo-elements, or extra markup. column-rule now works in all layout types, and a new
  row-rule property handles horizontal gaps.
- Existing concepts: Data Table Rules, Flex Dividers, Gap-Ruled Grid, Rule Builder
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS Gap Decorations, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS Gap Decorations helps or fails.

#### CSS path-length

- Path: `v149/css-path-length/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: The path-length CSS property maps to the SVG pathLength attribute, letting you
  control stroke-dash normalisation via the CSS cascade — enabling pure-CSS animated SVG paths with
  clean math.
- Existing concepts: Draw on Path, Progress Rings, Signature Draw, Stroke Animator
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for CSS path-length, chart frame time/memory/quality, and
    compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### CSS shape() function

- Path: `v149/css-shape-function/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Draw arbitrary shapes directly in CSS using SVG-like path commands — for
  clip-path and shape-outside — with no SVG markup or JavaScript required.
- Existing concepts: Shape Animation Morph, Clip Gallery, Shape Sculptor, Text Wrap Flow
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for CSS shape() function, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### CSS URL request modifiers

- Path: `v149/css-url-request-modifiers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 149 lets CSS url() values carry inline fetch parameters — cross-origin(),
  integrity(), and referrer-policy() — bringing CSS resource loading to parity with HTML's
  crossorigin, integrity, and referrerpolicy attributes.
- Existing concepts: HTML / CSS Loading Parity, Integrity Snippet Builder, Request Security
  Reference
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CSS URL
    request modifiers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CSS URL request modifiers.

#### Deferred Clipboard Data Reads

- Path: `v149/deferred-clipboard-data-reads/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 149 adds ClipboardItem.delayed() — a way to register a data-generation
  callback that only runs if the user actually pastes. Expensive rendering (canvas snapshots,
  serialization) is deferred until the data is needed.
- Existing concepts: Clipboard Spy, Deferred Copy Demo, Format Picker
- Suggested additions:
  - Device/session probe: read navigator.clipboard, Permissions API, request permissions, and show
    live track/session state transitions for Deferred Clipboard Data Reads.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Disable SVG filters on plugins and cross-origin/restricted iframes

- Path: `v149/disable-svg-filters-on-plugins-and-cross-origin-restricted-iframes/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 149 stops parent-page SVG filters from visually affecting cross-origin
  iframes and embedded plugins — closing a clickjacking vector where dynamic filter effects could
  disguise the appearance of trusted third-party content.
- Existing concepts: Attack Scenario, Filter Effects Lab, Iframe Sandbox Demo
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Disable SVG filters on plugins and
    cross-origin/restricted iframes, chart frame time/memory/quality, and compare graceful fallback
    implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Disconnect WebSockets on BFCache entry

- Path: `v149/disconnect-websockets-on-bfcache-entry/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Pages with open WebSocket connections can now enter the back/forward cache.
  Chrome 149 closes the connection on pagehide — instead of blocking caching — so real-time apps
  like Notion, Figma, and Slack get instant back-navigation.
- Existing concepts: BFCache Eligibility Checker, Connection Lifecycle Observer, Reconnect on
  Restore
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Disconnect
    WebSockets on BFCache entry can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Disconnect WebSockets on BFCache entry.

#### flex-wrap: balance

- Path: `v149/flex-wrap-balance/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A new value for flex-wrap that distributes children across lines so each line
  carries a similar load. The same idea as text-wrap: balance, applied to flex containers — no more
  long-then-short ragged ends.
- Existing concepts: Balanced Tags, Container Resizer, Line Load Visualizer
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for flex-wrap: balance, with live
    before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where flex-wrap: balance helps or fails.

#### Gamepad Event-Driven Input API

- Path: `v149/gamepad-event-driven-input-api/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: A new rawgamepadinputchange event that fires whenever a gamepad sends new input.
  Replaces the polling-by-rAF dance with a push-based input pipeline — lower latency, less wasted
  JS, and proper sub-frame ordering.
- Existing concepts: Axes Explorer, Button Timeline, Input Frequency Meter, Latency Comparator
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Gamepad Event-Driven Input API.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### image-rendering: crisp-edges

- Path: `v149/image-rendering-crisp-edges/`
- Area: General web platform
- Priority: Medium
- Current framing: Scale images without blur: crisp-edges preserves hard contrast boundaries and
  sharp edges when upscaling — the standard value Chrome was missing while pixelated was available.
- Existing concepts: Pixel Art Gallery, Scaling Compare, Sprite Animator
- Suggested additions:
  - Capability probe and fallback explorer for image-rendering: crisp-edges, using feature
    detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### IndexedDB: SQLite backend

- Path: `v149/indexeddb-sqlite-backend/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chromium's IndexedDB internals get a new engine. The old LevelDB + flat-file
  hybrid is replaced with SQLite for newly created data stores, with no change to the web API.
  Existing sites get better reliability and a small performance improvement for free.
- Existing concepts: Bulk Write Stress Test, Migration Readiness Checker, Transaction Durability
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so IndexedDB:
    SQLite backend can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for IndexedDB: SQLite backend.

#### Inline script cache

- Path: `v149/inline-script-cache/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome's V8 bytecode cache, which already exists for <script src>, now also
  covers inline <script> blocks. Cache entries are keyed by SHA-256 of the script body plus the
  document's network isolation key, so repeat visits don't recompile the same inline snippet.
- Existing concepts: Cache Impact Analyzer, Cache Key Probe, Cold vs Warm
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Inline script
    cache can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Inline script cache.

#### Intl.Locale.prototype.variants

- Path: `v149/intl-locale-prototype-variants/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Access the subtag variants of a BCP 47 locale tag as an array — and pass variants
  directly into the Intl.Locale constructor's options bag.
- Existing concepts: Locale Inspector, Variant Builder, Variant Tag Explorer
- Suggested additions:
  - Locale/script matrix: compare Intl.Locale.prototype.variants across languages, scripts, writing
    modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### OpaqueRange

- Path: `v149/opaque-range/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 149 adds element.createValueRange(start, end) to <input> and <textarea>
  elements — a live range object that exposes geometry (bounding rects) for a span of the control's
  value text, without leaking the internal DOM.
- Existing concepts: Geometry Inspector, Inline Annotation, Word Tooltip
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for OpaqueRange.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how OpaqueRange behaves inside custom elements, shadow
    DOM, SPA routing, hydration, and accessibility trees.

#### OpaqueRange

- Path: `v149/opaquerange/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 149 introduces OpaqueRange — a live span of text within a form control's
  value (such as a <textarea> or text <input>). It enables range-like operations —
  getBoundingClientRect(), getClientRects(), CSS Custom Highlight API integration — without exposing
  the control's value to third-party scripts.
- Existing concepts: Autocomplete Overlay, OpaqueRange Demo, Range Operations
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for OpaqueRange, with live
    before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where OpaqueRange helps or fails.

#### Overscroll Gestures

- Path: `v149/overscroll-gestures/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A set of CSS primitives that let arbitrary elements anchor to the overscroll
  regions of a scroller — and be revealed with the same swipe-past-the-end gesture users already
  know from native apps. Pull-to-refresh, swipe-to-delete, drawer reveal, all in CSS.
- Existing concepts: Pull to Reveal, Swipe Drawer, Swipe to Delete
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Overscroll Gestures, with
    live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Overscroll Gestures helps or fails.

#### Allow payment handlers to report back internal errors

- Path: `v149/payment-request-allow-payment-handlers-to-report-back-internal-errors/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 149 lets payment handler service workers report specific internal errors
  back to the merchant page via the Payment Request API. Previously a handler could only succeed or
  generically abort; now it can surface a structured error message that the merchant can inspect and
  display.
- Existing concepts: Error Reporting Demo, Error Taxonomy, Handler Integration
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Allow payment handlers to report back internal errors, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Permissions Policy: focus-without-user-activation

- Path: `v149/permissions-policy-focus-without-user-activation/`
- Area: JavaScript, DOM, and HTML platform
- Priority: High
- Current framing: Embedders can now restrict iframes from stealing keyboard focus without explicit
  user interaction. Setting allow="focus-without-user-activation 'none'" silently blocks
  element.focus(), the autofocus attribute, and dialog.showModal() in the embedded frame until the
  user first interacts with it.
- Existing concepts: Autofocus Lockdown, Focus Hijack Guard, Policy Test Lab
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Permissions Policy: focus-without-user-activation.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Permissions Policy: focus-without-user-activation
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Platform-provided behaviors

- Path: `v149/platform-provided-behaviors/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: ElementInternals gains a list of "behaviors" you can opt your custom element
  into. The first one — HTMLSubmitButtonBehavior — wires up form-submission semantics, so a custom
  element can act like a submit button without extending HTMLButtonElement or reimplementing the
  activation logic.
- Existing concepts: Custom Toggle Button, Fancy Submit, Validation Relay
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Platform-provided behaviors.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Platform-provided behaviors behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Popover=hint behavior changes

- Path: `v149/popover-hint-behavior-changes/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A simplified stacking model for the popover="hint" attribute and how it interacts
  with popover="auto". Opening a hint no longer dismisses unrelated auto popovers, and hint popovers
  only close when their own ancestor chain closes.
- Existing concepts: Nested Tooltip Menu, Stack Sandbox, Tooltip Playground
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Popover=hint behavior changes.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Popover=hint behavior changes behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Programmatic scroll promise

- Path: `v149/programmatic-scroll-promise/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: element.scrollTo(), scrollBy(), and scrollIntoView() now return a Promise that
  resolves when the scroll animation completes — or rejects if it's interrupted.
- Existing concepts: Animation Sequencer, Guided Tour, Scroll Monitor
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Programmatic scroll promise.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Programmatic scroll promise behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Remove explicit border color UA stylesheet rule for tables

- Path: `v149/remove-explicit-border-color-ua-stylesheet-rule-for-tables/`
- Area: CSS layout and rendering
- Priority: High
- Current framing: Chrome 149 removes an erroneous border-color: gray rule from the browser's
  built-in (UA) stylesheet for <table> elements. This rule was non-spec and caused table borders to
  stay gray even when the author set color — fixing a long-standing inconsistency with the CSS
  specification.
- Existing concepts: Border Color Demo, Color Cascade Explorer, Migration Guide
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Remove explicit border color
    UA stylesheet rule for tables, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Remove explicit border color UA stylesheet rule for
    tables helps or fails.

#### Request.isReloadNavigation

- Path: `v149/request-isreloadnavigation-attribute/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 149 adds the read-only boolean isReloadNavigation attribute to the Fetch
  API's Request interface. It indicates whether the current navigation request was initiated by a
  user-triggered reload (F5, Ctrl+R, or the browser's reload button) as opposed to a normal
  navigation.
- Existing concepts: Cache-Bypass Dashboard, Reload Detection Demo, Service Worker Integration
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so
    Request.isReloadNavigation can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Request.isReloadNavigation.

#### Respect autocorrect=off for Windows touch keyboard in TSF

- Path: `v149/respect-autocorrect-off-for-windows-touch-keyboard-in-tsf/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 149 fixes a bug where autocorrect="off" on an <input> or <textarea> was
  ignored by the Windows touch keyboard when communicating via the Text Services Framework (TSF).
  The keyboard now honours the attribute and disables its autocorrection suggestions for fields that
  opt out.
- Existing concepts: Attribute Reference, Input Attribute Tester, TSF Demo
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Respect autocorrect=off for Windows touch keyboard in TSF is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Selective Clipboard Format Read

- Path: `v149/selective-clipboard-format-read/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 149 makes navigator.clipboard.read() lazy: instead of fetching all
  clipboard formats from the OS immediately, it returns ClipboardItem objects with only the MIME
  type list. Actual data is read only when getType() is called — reducing CPU work, power
  consumption, and startup latency for clipboard-reading operations.
- Existing concepts: Eager vs. Lazy Comparison, Format Priority Chain, Lazy Read Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Selective
    Clipboard Format Read can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Selective Clipboard Format Read.

#### Service Worker Router Timing Fields

- Path: `v149/service-worker-router-timing-fields/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 149 adds workerMatchedRouterSourceList and workerFinalRouterSourceList to
  PerformanceResourceTiming, exposing which Static Routing rule matched a request and which source
  ultimately served it.
- Existing concepts: Performance Dashboard, Route Source Visualizer, Router Timing Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Service
    Worker Router Timing Fields can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Service Worker Router Timing Fields.

#### Support path() and shape() in shape-outside

- Path: `v149/support-path-and-shape-in-shape-outside/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 149 extends shape-outside to accept the path() and shape() CSS functions —
  the same functions used for clip paths and polygon shapes — making arbitrary text wrapping paths
  expressible in pure CSS without inline SVG.
- Existing concepts: Magazine Layout, path() Wrapping Demo, shape() Function Demo
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Support path() and shape() in shape-outside, chart
    frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### path-length CSS property

- Path: `v149/support-path-length-as-a-css-property/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 149 makes path-length a presentational CSS property for SVG paths.
  Previously, overriding the SVG pathLength attribute required touching the SVG markup. Setting
  path-length in CSS enables stylesheet-based control of stroke-dash animations, percentages in
  stroke-dasharray, and path-relative measurements.
- Existing concepts: Path Length Override, Signature Animator, Stroke Animation Demo
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for path-length CSS property, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Support rect() and xywh() in shape-outside

- Path: `v149/support-rect-and-xywh-in-shape-outside/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 149 brings rect() and xywh() to the shape-outside property. These
  rectangle-based basic shape functions were already supported in clip-path — now they work in
  shape-outside too, completing cross-property parity and aligning with Firefox and Safari.
- Existing concepts: rect() vs clip-path — Parity Demo, Shape Parity, Text Wrap Explorer
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Support rect() and xywh() in
    shape-outside, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Support rect() and xywh() in shape-outside helps or
    fails.

#### System Accent Color Scoped to Web Apps

- Path: `v149/system-accent-color-scoped-to-web-apps/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 149 scopes the AccentColor CSS system color to installed web apps. When a
  PWA runs in standalone mode, form controls themed with accent-color: AccentColor pick up the app's
  theme_color from the manifest — not the OS accent color.
- Existing concepts: Accent Form Showcase, PWA Theme Match, Theme Color Picker
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why System Accent Color Scoped to Web Apps is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### User action pseudo class top layer boundary

- Path: `v149/user-action-pseudo-class-top-layer-boundary/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: :hover, :active, and :focus-within now stop propagating upward when they
  encounter a top-layer element — so hovering over a popover no longer triggers :hover on the
  popover's unrelated parent.
- Existing concepts: Focus-Within Dialog Boundary, Hover Boundary Demo, Interaction Scope Demo
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why User action pseudo class top layer boundary is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Web app scope system accent color

- Path: `v149/web-app-scope-system-accent-color/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 149 restricts the CSS AccentColor and AccentColorText system color
  keywords — and accent-color: auto — so they only resolve to the user's actual system accent color
  when inside an installed PWA or a trusted profile context. On regular web pages they resolve to a
  fixed fallback, preventing fingerprinting.
- Existing concepts: Accent Color Demo, Fingerprinting Context, Scope Detection
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Web app scope system accent color is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### WebAssembly Custom Descriptors

- Path: `v149/webassembly-custom-descriptors/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: WasmGC structs can now carry a custom descriptor — a companion type whose first
  field becomes the struct's JavaScript prototype. Call wasmObj.myMethod() directly, with no
  hand-written wrapper class, and share type metadata across all instances instead of storing it
  per-object.
- Existing concepts: Method Dispatch Bench, Prototype Bridge, Type-Safe Objects
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for WebAssembly Custom Descriptors, chart frame
    time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### WebMCP

- Path: `v149/webmcp/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A browser-native implementation of the Model Context Protocol — sites register
  structured tools that AI agents can discover and invoke directly, without scraping HTML or relying
  on hidden APIs.
- Existing concepts: Agent Handshake Simulator, Tool Consent Panel, Tool Registry Explorer
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for WebMCP.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how WebMCP behaves inside custom elements, shadow DOM,
    SPA routing, hydration, and accessibility trees.

### v150

#### AccentColor and AccentColorText system colors

- Path: `v150/accentcolor-and-accentcolortext-system-colors/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 150 ships the AccentColor and AccentColorText CSS system color keywords to
  stable — in installed web app contexts. A web app can now paint any element in the user's OS
  accent color using color: AccentColor or background: AccentColor, and pair it with the
  automatically-computed readable foreground using color: AccentColorText.
- Existing concepts: PWA Settings Panel, System Palette Explorer, Web App Theme Preview
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why AccentColor and AccentColorText system colors is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Allow optional rounding parameter for polygon()

- Path: `v150/allow-optional-rounding-parameter-for-polygon/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: Chrome 150 adds an optional round <length> keyword to the polygon() CSS shape
  function, giving polygons rounded corners in a single declaration — no SVG, no bezier control
  points.
- Existing concepts: Animated Clip Path, Clip-Path Gallery, Shape Explorer
- Suggested additions:
  - Capability profiler: query CSS.supports(), choose the best rendering path, and explain why the
    browser selected it.
  - Visual benchmark: run a small workload for Allow optional rounding parameter for polygon(),
    chart frame time/memory/quality, and compare graceful fallback implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Animatable zoom

- Path: `v150/animatable-zoom/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The CSS zoom property can now be transitioned and animated — transition: zoom
  0.3s ease smoothly scales an element and its layout, unlike transform: scale() which leaves the
  element's box untouched.
- Existing concepts: Keyframe Zoom, Product Focus, Zoom Gallery, Zoom vs Scale
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Animatable zoom, with live
    before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Animatable zoom helps or fails.

#### Capability Elements: <usermedia> MVP

- Path: `v150/capability-elements-usermedia-mvp/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Chrome 150 introduces the <usermedia> HTML element — a declarative,
  user-activated control for accessing camera and microphone streams. It addresses the problem of
  permission prompts being triggered without a recognisable user gesture, by letting the browser
  manage the permission request flow as part of a native element interaction.
- Existing concepts: Attribute Explorer, Permission Flow, Usermedia Demo
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for Capability Elements: <usermedia>
    MVP.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Case-sensitive anchor name matching in quirks mode

- Path: `v150/case-sensitive-anchor-name-matching-in-quirks-mode/`
- Area: General web platform
- Priority: Medium
- Current framing: Chrome 150 makes anchor name matching for fragment navigation case-sensitive in
  quirks mode, matching the behaviour already used in standards mode. Previously, navigating to #Foo
  would match <a name="foo"> in quirks mode — this inconsistency is now fixed.
- Existing concepts: Anchor Matching Demo, Fragment Tester, Quirks vs Standards Mode
- Suggested additions:
  - Capability probe and fallback explorer for Case-sensitive anchor name matching in quirks mode,
    using CSS.supports().
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Clone into all descendant selectedcontent elements

- Path: `v150/clone-into-all-descendant-selectedcontent-elements/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: A handful of refinements to <selectedcontent> — the slot inside a customisable
  <select> that reflects the chosen option. Multiple selectedcontent elements all stay in sync, and
  updates are deferred safely during DOM mutations.
- Existing concepts: Multi-Mirror Builder, Multiple Mirrors, Mutation Timing
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Clone into all descendant selectedcontent elements.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Clone into all descendant selectedcontent elements
    behaves inside custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Comma-separated Container Queries

- Path: `v150/comma-separated-container-queries/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A @container rule now accepts a comma-separated list of queries — like or — so
  one rule fires if any query matches. Write fallback responsive conditions without duplicating rule
  blocks or nesting extra @container wrappers.
- Existing concepts: Fallback Layout, Multi-container Grid, OR Breakpoints, Sidebar Adapter
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Comma-separated Container
    Queries, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Comma-separated Container Queries helps or fails.

#### CSS background-clip: border-area

- Path: `v150/css-background-clip-border-area/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 150 adds border-area as a new value for the background-clip property. It
  clips an element's background to the area occupied by its border strokes — making gradient and
  image borders a one-liner instead of a multi-layer hack.
- Existing concepts: Animated Border Card, Clip Value Comparison, Gradient Border Gallery
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS background-clip:
    border-area, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS background-clip: border-area helps or fails.

#### CSS fit-content() for sizing properties

- Path: `v150/css-fit-content-function-for-sizing-properties/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 150 implements fit-content(<length-percentage>) as a value for width,
  height, min-width, max-width, and related sizing properties — not just for grid track sizing. The
  element sizes to its content but never exceeds the clamped maximum you specify.
- Existing concepts: Grid Track Comparison, Tooltip Builder, Width & Height Demo
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS fit-content() for sizing
    properties, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS fit-content() for sizing properties helps or
    fails.

#### CSS fit-width text

- Path: `v150/css-fit-width-text/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The text-fit property scales a text element's font size so the text exactly fills
  its container's inline axis — text-fit: scale-down only shrinks, text-fit: balance also expands.
  No JavaScript, no vw hacks, no clamp() approximations.
- Existing concepts: Caption Fitter, Headline Scaler, Logo Lockup, Pull Quote Scaler
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS fit-width text.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS fit-width text behaves inside custom elements,
    shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS image(<color>) function

- Path: `v150/css-image-color-function/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The image() function can now accept a bare color value — image(red),
  image(oklch(70% 0.15 230)) — generating a solid-color image anywhere an <image> is expected:
  background-image, list-style-image, border-image, content, and more.
- Existing concepts: Color Swatch Lists, content & border-image Fills, Gradient Fallback Playground,
  Theme Builder
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS image(<color>) function,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS image(<color>) function helps or fails.

#### CSS light-dark() with image values

- Path: `v150/css-light-dark-with-image-values/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: The light-dark() function now accepts image values — url(), image-set(), none —
  so background-image, border-image, list-style-image, and content can automatically switch assets
  between light and dark modes without any media queries or JavaScript.
- Existing concepts: Adaptive Backgrounds, Conditional Decorations, Theme-Aware Icons
- Suggested additions:
  - Device/session probe: read CSS.supports(), navigator.mediaDevices, track settings/capabilities,
    request permissions, and show live track/session state transitions for CSS light-dark() with
    image values.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### CSS text-fit property

- Path: `v150/css-text-fit-property/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 150 adds the text-fit CSS property. It controls how text is scaled to fit
  within its containing block. Combined with a min-font-size / max-font-size range, text-fit:
  contain automatically shrinks or grows text to fill the available space — eliminating the need for
  JavaScript font-size fitting hacks.
- Existing concepts: Card Grid, Fit Value Comparison, Text Fit Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for CSS text-fit property.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how CSS text-fit property behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### CSS URL request modifiers

- Path: `v150/css-url-request-modifiers/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 150 extends the CSS url() function to accept optional request modifiers:
  cross-origin(), integrity(), and referrer-policy(). These control the fetch behaviour of
  CSS-referenced resources — such as background-image or @font-face src — directly from CSS, without
  JavaScript.
- Existing concepts: Cross-Origin & Integrity Demo, Modifier Builder, Referrer Policy Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CSS URL
    request modifiers can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CSS URL request modifiers.

#### CSS4 text-decoration-skip-spaces

- Path: `v150/css4-text-decoration-skip-spaces/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A new CSS property that controls whether text-decoration lines (underline,
  overline, line-through) draw under whitespace characters or hop over them. Lets authors get tight,
  typographically-correct decorations without resorting to splitting text at spaces.
- Existing concepts: Decoration Toggle, Prose Links, Wrapped Inline
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for CSS4
    text-decoration-skip-spaces, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where CSS4 text-decoration-skip-spaces helps or fails.

#### Deprecate and remove: Attribution Reporting API

- Path: `v150/deprecate-and-remove-attribution-reporting-api/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The Attribution Reporting API — Chrome's privacy-preserving alternative to
  cross-site cookies for ad conversion measurement — is being deprecated. The reversal on
  third-party cookie deprecation makes the API's stack of trade-offs no longer warranted.
- Existing concepts: Header Probe, Removal Timeline, Surface Inventory
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and remove: Attribution Reporting API, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and Remove: document.requestStorageAccessFor

- Path: `v150/deprecate-and-remove-document-requeststorageaccessfor/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: The requestStorageAccessFor entry point — Chrome's mechanism for top-level sites
  to request unpartitioned cookie access on behalf of embedded sites — is being deprecated alongside
  Related Website Sets. In the absence of broad third-party cookie deprecation, this API no longer
  has a job to do.
- Existing concepts: API Surface Probe, Call Status, Migration Lab
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and Remove: document.requestStorageAccessFor, with every allowed/blocked branch
    visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Deprecate and Remove: Related Website Sets (RWS)

- Path: `v150/deprecate-and-remove-related-website-sets-rws/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Related Website Sets — the mechanism for declaring related-site relationships
  across origins, enabling limited cross-site cookie access via the Storage Access API — is being
  deprecated. With Chrome reversing its third-party cookie deprecation plan, RWS is no longer
  required and is being wound down.
- Existing concepts: RWS Detection Probe, RWS Validator & Migration Guide, Storage Access Migration
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    Deprecate and Remove: Related Website Sets (RWS), with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Disable SVG filters on plugins and cross-origin or restricted iframes

- Path: `v150/disable-svg-filters-on-plugins-and-cross-origin-or-restricted-iframes/`
- Area: Graphics, GPU, XR, and canvas
- Priority: Medium
- Current framing: SVG filters can no longer be applied to embedded plugins (PDFs) or to
  cross-origin / sandboxed iframes. When the renderer would paint such a frame with an SVG filter,
  it walks up the effect tree, finds the highest ancestor without filters, and applies that effect
  instead — leaving the embedded content unfiltered.
- Existing concepts: Clickjacking Replay, Filter Comparison, Sandbox Filter Test
- Suggested additions:
  - Capability profiler: query feature detection, fallback path, choose the best rendering path, and
    explain why the browser selected it.
  - Visual benchmark: run a small workload for Disable SVG filters on plugins and cross-origin or
    restricted iframes, chart frame time/memory/quality, and compare graceful fallback
    implementations.
  - Debug inspector: expose shader/layout/buffer/geometry state live, with invalid inputs that teach
    the failure mode.

#### Email Verification Protocol

- Path: `v150/email-verification-protocol/`
- Area: General web platform
- Priority: Medium
- Current framing: EVP replaces the email-with-OTP-code dance with a cryptographic proof of
  ownership. The user's mail provider signs a token vouching that the user controls the address; the
  site verifies the signature without ever sending a verification email.
- Existing concepts: Token Decoder, Token Inspector, Verification Flow
- Suggested additions:
  - Capability probe and fallback explorer for Email Verification Protocol, using feature detection,
    fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### autocorrect global HTML attribute

- Path: `v150/expose-the-autocorrect-global-html-attribute/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Chrome 150 exposes the autocorrect HTML attribute as a global attribute, enabling
  web authors to control whether OS-level autocorrection should be applied to user input in editable
  elements — <input>, <textarea>, and contenteditable — using a simple boolean attribute.
- Existing concepts: Autocorrect Demo, Element Types Comparison, Form Field Matrix
- Suggested additions:
  - Locale/script matrix: compare autocorrect global HTML attribute across languages, scripts,
    writing modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Expose unprintable areas via CSS

- Path: `v150/expose-unprintable-areas-via-css/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The new env(safe-printable-inset) CSS environment variable reports the
  unprintable margin imposed by the physical printer — the strip at each edge the printer's
  paper-handling mechanism cannot reach. Use it in @page rules to guarantee content stays inside the
  safe area without guessing.
- Existing concepts: Print Margin Inspector, Print Preview, Safe Print Layout
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Expose unprintable areas via
    CSS, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Expose unprintable areas via CSS helps or fails.

#### flex-wrap:balance

- Path: `v150/flex-wrap-balance/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: A new flex-wrap value that distributes flex items evenly across rows — like
  text-wrap: balance for flex containers. Instead of greedily filling each row, the browser
  recalculates the optimal row count to produce roughly equal-width rows with no orphaned items.
- Existing concepts: Balanced Tags, Headline Equalizer, Navigation Menu, Skill Badges
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for flex-wrap:balance, with live
    before/after rendering and copyable rules.
  - Compatibility lab: run feature detection, fallback path, show fallback CSS, and let the visitor
    switch between supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where flex-wrap:balance helps or fails.

#### Focusgroup

- Path: `v150/focusgroup/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The focusgroup HTML attribute turns any container into a single tab-stop with
  arrow-key navigation for its children — replacing the hand-written roving-tabindex pattern used in
  every toolbar, tablist, menubar, and grid in production today.
- Existing concepts: Grid Navigation, Radio Group, Before / After: Roving Tabindex, Toolbar Demo
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Focusgroup.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Focusgroup behaves inside custom elements, shadow
    DOM, SPA routing, hydration, and accessibility trees.

#### IndexedDB: SQLite backend

- Path: `v150/indexeddb-sqlite-backend/`
- Area: Storage, databases, and offline data
- Priority: Medium
- Current framing: Chrome 150 migrates its IndexedDB implementation from a LevelDB + flat-file
  hybrid to SQLite. The web API is unchanged — every indexedDB.open(), objectStore.put(), and
  IDBCursor call works exactly as before — but the storage layer is now more reliable, especially
  under concurrent writes and after unexpected crashes.
- Existing concepts: Concurrent Writers, Offline Data Vault, Write Integrity Test
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for IndexedDB: SQLite backend.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses IndexedDB: SQLite backend
    in a realistic user workflow.

#### Media element pseudo-classes

- Path: `v150/media-element-pseudo-classes/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: CSS pseudo-classes that match <audio> and <video> elements based on their
  playback state — :playing, :paused, :seeking, :buffering, :stalled, :muted, and :volume-locked —
  so you can style media controls purely in CSS without JavaScript event listeners.
- Existing concepts: Buffering States, Media Mood Board, Playlist UI, State Inspector
- Suggested additions:
  - Device/session probe: read CSS.supports(), navigator.mediaDevices, track settings/capabilities,
    request permissions, and show live track/session state transitions for Media element
    pseudo-classes.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### MediaStreamTrackProcessor frame counters

- Path: `v150/mediastreamtrackprocessor-frame-counters/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: MediaStreamTrackProcessor gains totalFrames and discardedFrames attributes. Video
  processing pipelines can now read their own health stats — how many frames the processor has
  received and how many it dropped before the consumer could pull them.
- Existing concepts: Diagnostic Overlay, Pipeline Health Monitor, Pipeline Meter
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for MediaStreamTrackProcessor frame
    counters.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### named-feature() function for CSS @supports

- Path: `v150/named-feature-function-for-css-supports/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 150 adds @supports named-feature("…") — a new condition type for detecting
  features that can't be probed with existing @supports mechanisms, such as subtle behaviour
  differences that have no testable property or selector.
- Existing concepts: Compound Condition, Feature Query Explorer, Progressive Enhancement
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for named-feature() function for
    CSS @supports, with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where named-feature() function for CSS @supports helps or
    fails.

#### On-device Web Speech API

- Path: `v150/on-device-web-speech-api/`
- Area: Built-in AI
- Priority: High
- Current framing: Chrome 150 brings on-device speech recognition to the Web Speech API on Windows,
  Mac, and Linux — audio is transcribed entirely locally, never leaving the device, using the same
  familiar SpeechRecognition interface.
- Existing concepts: Feature Detection & Setup, Offline Transcript, Privacy Architecture Comparison
- Suggested additions:
  - Local-first workflow: build a concrete app flow around On-device Web Speech API such as
    redaction, triage, summarization, translation, or form assistance with offline/privacy status
    shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Opaque origin for data: URL Dedicated and Shared Workers

- Path: `v150/opaque-origin-for-data-urls/`
- Area: Storage, databases, and offline data
- Priority: High
- Current framing: Chrome 150 aligns with the HTML specification: workers created from data: URLs
  now receive a unique opaque origin instead of inheriting their creator's origin. This closes a
  security gap that allowed data: URL workers to access origin-sensitive storage and channels as if
  they were same-origin with the page.
- Existing concepts: data: URL Worker Test, Migration Patterns, Origin Isolation Demo
- Suggested additions:
  - Quota/data lifecycle dashboard: write/read/delete test records and show quota, persistence,
    eviction, and private-mode differences for Opaque origin for data: URL Dedicated and Shared
    Workers.
  - Failure recovery drill: trigger large values, blocked upgrades, stale schema, denied
    permissions, and partial writes, then demonstrate recommended recovery.
  - Offline product pattern: build a small notes/cart/cache demo that uses Opaque origin for data:
    URL Dedicated and Shared Workers in a realistic user workflow.

#### Out-of-order streaming

- Path: `v150/out-of-order-streaming/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 150 enables out-of-order delivery for streamed HTTP responses — chunks
  from a ReadableStream body can be dispatched to consumers as soon as they arrive, even if earlier
  chunks in the sequence haven't been received yet. This removes a head-of-line blocking constraint
  within a single response stream.
- Existing concepts: Chunk Ordering, Chunk Timing Chart, Streaming Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Out-of-order
    streaming can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Out-of-order streaming.

#### overscroll-behavior: chain

- Path: `v150/overscroll-behavior-chain/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: Chrome 150 adds a new chain value to the overscroll-behavior property. Unlike
  auto (which chains and shows overscroll effects) or contain (which blocks chaining entirely),
  chain propagates the scroll to ancestor containers when the boundary is reached — without
  triggering the local overscroll glow or rubber-band animation.
- Existing concepts: Bottom Sheet, Reader Layout, Scroll Chaining Explorer, Side Menu Pattern
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for overscroll-behavior: chain,
    with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where overscroll-behavior: chain helps or fails.

#### Parse processing instructions in HTML

- Path: `v150/parse-processing-instructions-in-html/`
- Area: Media, capture, and realtime
- Priority: Medium
- Current framing: Chrome 150 teaches the HTML parser to preserve processing instructions — the
  <?target data?> syntax already supported in XML — as ProcessingInstruction DOM nodes. Previously
  the HTML parser silently discarded them; now they survive into the live DOM and power the
  declarative out-of-order streaming mechanism.
- Existing concepts: Live PI Editor, Processing Instruction DOM Explorer, Streaming Use Case
- Suggested additions:
  - Device/session probe: read feature detection, fallback path, request permissions, and show live
    track/session state transitions for Parse processing instructions in HTML.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### Popover=hint behavior changes

- Path: `v150/popover-hint-behavior-changes/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 150 ships a revised and simplified stacking model for popover=hint. The
  new rules govern how hint popovers interact with auto popovers in the top-layer stack — making
  tooltip-style UIs composable with drawer and menu patterns without unexpected dismissals.
- Existing concepts: Hint vs Auto Reference, Top-layer Stacking Demo, Tooltip over Menu
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Popover=hint behavior changes.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Popover=hint behavior changes behaves inside
    custom elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Programmatic scroll promises

- Path: `v150/programmatic-scroll-promises/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 150 makes element.scrollTo(), element.scrollBy(), and
  element.scrollIntoView() return Promise<void> when called with behavior: 'smooth'. The promise
  resolves when the scroll animation completes, enabling await-based scroll sequences and
  eliminating the need for scroll event listeners or arbitrary timeouts.
- Existing concepts: Lazy Reveal, Parallel Scroll Race, Scroll Promise Demo, Scroll Sequence
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Programmatic scroll promises.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Programmatic scroll promises behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### PWA origin migration

- Path: `v150/pwa-origin-migration/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: Chrome 150 lets installed PWAs migrate to a new origin or scope without losing
  their install entry. A scope_extensions declaration in the web manifest declares the old origin as
  an associated scope, allowing Chrome to migrate the install automatically when the user visits the
  new origin.
- Existing concepts: Manifest Builder, Manifest Configuration, Migration Demo
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why PWA origin migration is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### Relative Alpha Colors (CSS Color 5 alpha() function)

- Path: `v150/relative-alpha-colors-css-color-5-alpha-function/`
- Area: CSS layout and rendering
- Priority: Medium
- Current framing: The alpha() function derives a translucent version of any color by adjusting only
  its alpha channel — alpha(red, 50%) — without rewriting color components. Compose transparent
  tints of design tokens in a single expression.
- Existing concepts: Dark Mode Palette, Overlay Builder, State Feedback Colors, Token Transparency
- Suggested additions:
  - Authoring studio: sliders/toggles that generate production CSS for Relative Alpha Colors (CSS
    Color 5 alpha() function), with live before/after rendering and copyable rules.
  - Compatibility lab: run CSS.supports(), show fallback CSS, and let the visitor switch between
    supported and fallback renderings.
  - Edge-case gallery: stress long text, RTL/vertical writing, zoom, forced-colors, nested
    components, and mobile widths to show where Relative Alpha Colors (CSS Color 5 alpha() function)
    helps or fails.

#### Remove [LegacyNoInterfaceObject] from FontFaceSet IDL

- Path: `v150/remove-legacynointerfaceobject-from-fontfaceset-idl/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: FontFaceSet becomes a real global. Chromium's IDL accidentally carried
  [LegacyNoInterfaceObject], hiding the interface object on window and dropping constructor from its
  prototype. Removing the annotation matches the CSS Font Loading spec and what Safari and Firefox
  have shipped all along.
- Existing concepts: FontFaceSet Probe, Prototype Inspector, Worker Exposure
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Remove
    [LegacyNoInterfaceObject] from FontFaceSet IDL can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Remove [LegacyNoInterfaceObject] from FontFaceSet IDL.

#### Responsively-sized <iframe>

- Path: `v150/responsively-sized-iframe/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: Chrome 150 lets sites opt into iframes that automatically resize in the parent
  document to match the embedded document's layout overflow. No JavaScript message-passing required
  — the browser propagates the content size across the frame boundary.
- Existing concepts: Live Resize Demo, Opt-in Mechanism, postMessage Comparison
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Responsively-sized <iframe>.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Responsively-sized <iframe> behaves inside custom
    elements, shadow DOM, SPA routing, hydration, and accessibility trees.

#### Update text selection on mouseup before dispatching click event

- Path: `v150/update-text-selection-on-mouseup-before-dispatching-click-event/`
- Area: JavaScript, DOM, and HTML platform
- Priority: Medium
- Current framing: The default action of mouseup in a text input — collapsing or committing the
  drag-selection — now runs before the matching click event fires. Click handlers that read
  selectionStart / selectionEnd now see the post-click state.
- Existing concepts: Event Sequence Visualizer, Selection Readout, Workaround Killer
- Suggested additions:
  - Interactive API console: let developers mutate inputs and inspect return values, events,
    exceptions, and DOM changes for Update text selection on mouseup before dispatching click event.
  - Migration diff tool: compare old vs new code paths, show compatibility, and generate a minimal
    replacement snippet.
  - Framework integration sample: demonstrate how Update text selection on mouseup before
    dispatching click event behaves inside custom elements, shadow DOM, SPA routing, hydration, and
    accessibility trees.

#### Web Speech API: On-Device Recognition Quality

- Path: `v150/web-speech-api-on-device-recognition-quality/`
- Area: Built-in AI
- Priority: High
- Current framing: Chrome 150 adds a quality property to the Web Speech API, giving developers a way
  to signal the accuracy and capability tier required for on-device speech recognition. Instead of
  getting whatever model the browser picks, apps can specify 'command', 'dictation', or
  'conversation' to match the on-device model to the task at hand.
- Existing concepts: Command vs. Dictation, Quality Level Explorer, Use-Case Sampler
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Web Speech API: On-Device Recognition
    Quality such as redaction, triage, summarization, translation, or form assistance with
    offline/privacy status shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### Web Speech API: Unspoken Punctuation

- Path: `v150/web-speech-api-unspoken-punctuation/`
- Area: Built-in AI
- Priority: High
- Current framing: A new boolean unspokenPunctuation attribute on SpeechRecognition. When enabled,
  the engine infers commas, periods, and question marks from pauses, intonation, and grammar —
  without the speaker having to say "comma" or "period".
- Existing concepts: Code Mode, Dictation Comparison, Email Composer
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Web Speech API: Unspoken Punctuation such
    as redaction, triage, summarization, translation, or form assistance with offline/privacy status
    shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

### v151

#### Chrome Will Remove Support for macOS 12

- Path: `v151/chrome-will-remove-support-for-macos-12/`
- Area: PWA, install, files, and windows
- Priority: High
- Current framing: Chrome 151 drops support for macOS 12 (Monterey), requiring macOS 13 (Ventura) or
  later. Users on macOS 12 will be prompted to update their operating system.
- Existing concepts: Deprecation Demo, Fleet Readiness Dashboard, Migration Guide, macOS Support
  Checker
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why Chrome Will Remove Support for macOS 12 is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.

#### CPU Performance API

- Path: `v151/cpu-performance-api/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: A way for web apps to ask "how powerful is this device?" — a coarse hint that
  lets them pick between a heavyweight and a lightweight code path without trying to fingerprint the
  CPU. Designed to pair with the Compute Pressure API for dynamic adaptation.
- Existing concepts: Adaptive Animation, Adaptive Image Decoding, Device Tier Readout, Quality Tier
  Selector, Tier Distribution Simulator
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so CPU
    Performance API can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for CPU Performance API.

#### CSS ruby-overhang property

- Path: `v151/css-ruby-overhang-property/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: A new property that controls whether ruby annotation text can overhang into
  adjacent whitespace or CJK punctuation. Default auto matches established typographic practice — no
  awkward layout gaps, no decorations bleeding into adjacent glyphs.
- Existing concepts: Furigana Density Stress, Prose Comparator, Reading Passage, Ruby Overhang
  Toggle, Vertical Writing & Punctuation Overhang
- Suggested additions:
  - Locale/script matrix: compare CSS ruby-overhang property across languages, scripts, writing
    modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### Expose the 'autocorrect' global html attribute

- Path: `v151/expose-the-autocorrect-global-html-attribute/`
- Area: Internationalization and text semantics
- Priority: Medium
- Current framing: Chrome 151 ships the autocorrect HTML global attribute, giving web developers
  explicit control over whether text input elements apply OS-level autocorrection. Set
  autocorrect="off" on a code editor, search box, or username field to stop the browser from
  silently rewriting what the user typed.
- Existing concepts: Autocorrect Playground, Cross-Browser Matrix, Form Audit Tool, Form Precision
  Demo, Autocorrect Inheritance Explorer
- Suggested additions:
  - Locale/script matrix: compare Expose the 'autocorrect' global html attribute across languages,
    scripts, writing modes, emoji/math/text variants, and browser fallback behavior.
  - Content authoring tool: type or paste real content and watch segmentation, formatting,
    mirroring, autocorrect, or locale metadata update live.
  - Accessibility/i18n audit: flag ambiguous text, missing locale hints, wrong directionality, and
    fallback rendering risks.

#### IncognitoStaticStorageQuota

- Path: `v151/incognitostaticstoragequota/`
- Area: Identity, payments, privacy, and ads
- Priority: High
- Current framing: Chrome 151 fixes a privacy leak in the StorageManager.estimate() API: Incognito
  mode could previously be detected because it returned a quota derived from available RAM rather
  than the disk-based bucketed value. The fix makes Incognito and normal mode return identical quota
  estimates, eliminating the fingerprint vector.
- Existing concepts: Bucketed Formula Explorer, Detection Attack Lab, Privacy Leak Explainer, Quota
  Comparator, Quota Estimate Demo
- Suggested additions:
  - Flow simulator: model user gesture, permission, iframe/origin, and policy state transitions for
    IncognitoStaticStorageQuota, with every allowed/blocked branch visible.
  - Privacy/threat lab: show what data is exposed, what is intentionally hidden, and how abuse is
    mitigated in realistic publisher, merchant, relying-party, or IdP scenarios.
  - Integration validator: paste config, headers, JSON, or registration payloads and validate them
    against expected browser behavior plus fallback UX copy.

#### Permission Policy Merger: direct-sockets-private with local-network and loopback-network

- Path: `v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 151 merges the direct-sockets-private Permissions Policy directive with
  the local-network and loopback-network directives, consolidating the policy surface for private
  network socket access.
- Existing concepts: Policy Header Builder, Iframe Policy Inspector, Migration Guide, Policy Demo
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Permission
    Policy Merger: direct-sockets-private with local-network and loopback-network can be observed
    instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Permission Policy Merger: direct-sockets-private with local-network and
    loopback-network.

#### Permissions Policy: focus-without-user-activation

- Path: `v151/permissions-policy-focus-without-user-activation/`
- Area: General web platform
- Priority: High
- Current framing: Chrome 151 introduces the focus-without-user-activation Permissions Policy
  directive, giving top-level pages control over whether embedded iframes can programmatically steal
  focus without a prior user gesture.
- Existing concepts: Focus-Steal Attack Replay, Focus Demo, Header Codegen, Policy Reference, Typing
  Interrupt
- Suggested additions:
  - Capability probe and fallback explorer for Permissions Policy: focus-without-user-activation,
    using feature detection, fallback path.
  - Copyable production recipe that turns the platform feature into a realistic app workflow.
  - Failure-mode lab that demonstrates unsupported browsers, bad input, permissions/policies, and
    recovery.

#### Renewed HTML insertion&streaming methods

- Path: `v151/renewed-html-insertion-streaming-methods/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 151 ships a coherent set of new DOM methods for dynamically inserting
  markup: positional helpers that replace the awkward insertAdjacentHTML, and streaming variants
  that return a WritableStream so HTML can be piped in chunk-by-chunk as it arrives from the
  network.
- Existing concepts: Positional Insertion Methods, Sanitizer Comparison, Streaming AI Content,
  Streaming HTML Writer, Throughput Bench
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Renewed HTML
    insertion&streaming methods can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Renewed HTML insertion&streaming methods.

#### Resource Timing: Service Worker Router timing fields

- Path: `v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields/`
- Area: Network, loading, cache, and performance
- Priority: High
- Current framing: Chrome 151 adds workerMatchedRouterSource and workerFinalRouterSource to
  PerformanceResourceTiming. These fields expose which Service Worker Static Router rule was
  matched, and which source ultimately served the response — giving developers precise insight into
  the routing path of every intercepted resource.
- Existing concepts: Race Strategy Visualizer, Router Source Values Explorer, Router Timing
  Dashboard, RUM Aggregator, Timing Field Inspector
- Suggested additions:
  - Real echo route: add a Deno endpoint that returns request headers/status/timing so Resource
    Timing: Service Worker Router timing fields can be observed instead of described.
  - Waterfall debugger: simulate cold/warm cache, redirect, cross-origin, and failure cases, then
    annotate the exact browser decision points.
  - Production checklist tool: paste a URL/header/config and get pass/fail guidance plus the minimum
    server change needed for Resource Timing: Service Worker Router timing fields.

#### Web Speech API: Unspoken Punctuation

- Path: `v151/web-speech-api-unspoken-punctuation/`
- Area: Built-in AI
- Priority: High
- Current framing: Chrome 151 adds the unspokenPunctuation property to the Web Speech API's
  SpeechRecognition interface. When enabled, the speech engine automatically infers and inserts
  punctuation — commas, periods, question marks — based on natural pauses and sentence structure,
  without requiring the user to say "period" or "comma" aloud.
- Existing concepts: Accessibility Impact, Dictation Demo, Punctuation Diff Viewer, Punctuation
  Transcription, Voice Command Mode
- Suggested additions:
  - Local-first workflow: build a concrete app flow around Web Speech API: Unspoken Punctuation such
    as redaction, triage, summarization, translation, or form assistance with offline/privacy status
    shown.
  - Quality control panel: compare latency, context length, prompt shape, sampling, privacy, and
    fallback-to-server behavior.
  - Safety harness: include unsupported/model-unavailable states, prompt injection examples,
    structured-output validation, and user confirmation gates.

#### WebAudio: Configurable render quantum

- Path: `v151/webaudio-configurable-render-quantum/`
- Area: Media, capture, and realtime
- Priority: High
- Current framing: Chrome 151 adds a renderSizeHint option to AudioContext and OfflineAudioContext.
  Rather than being locked to the default 128-frame render quantum, apps can request a specific
  block size, use "hardware" to let the browser pick the optimal quantum for the output device, or
  stay at "default" (128 frames). Matching the quantum to the software buffer size removes a source
  of latency and audio glitches.
- Existing concepts: AudioWorklet Quantum Size, Glitch Stress Test, Latency Benchmark, Render Size
  Explorer, Use Case Picker
- Suggested additions:
  - Device/session probe: read navigator.mediaDevices, track settings/capabilities, request
    permissions, and show live track/session state transitions for WebAudio: Configurable render
    quantum.
  - Realtime quality lab: simulate packet loss, latency, CPU pressure, backgrounding, device
    switching, and recovery behavior.
  - Production UX pattern: build the meeting/player/device-picker flow developers should copy,
    including permission denial and unsupported-device fallbacks.

#### window-drag

- Path: `v151/window-drag/`
- Area: PWA, install, files, and windows
- Priority: Medium
- Current framing: A CSS property that designates regions of an installed PWA's UI as draggable
  titlebar surface. Click-and-drag in a window-drag: drag region moves the OS window; no-drag opts a
  specific child back out so buttons keep working.
- Existing concepts: Inheritance Debugger, Legacy -webkit-app-region Comparator, Multi-Zone
  Inspector, No-drag Event Probe, Titlebar Mock
- Suggested additions:
  - Install/readiness wizard: validate manifest, scope, launch, file/window metadata, and show
    exactly why window-drag is or is not active.
  - OS integration storyboard: compare browser tab, installed app, standalone window, file launch,
    and migration states.
  - Policy and rollback tool: generate manifest snippets, migration redirects, analytics continuity
    checks, and fallback UI.
