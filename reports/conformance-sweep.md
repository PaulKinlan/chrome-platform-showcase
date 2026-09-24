# Conformance sweep

Generated: 2026-09-24T08:53:20.101Z
Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36
Method: pass 1 on /conformance/run-all/ then pass 2 re-running every failure on the suite's own conformance page

## Totals

- Assertions run: **4961**
- Pass: **4316** · Fail: **291** · Blocked: **3** · Future milestone (`future`, not a failure): **351**
- Executed pass rate: **94%**
- After re-checking every failure on its own suite page: **282 real fail** · **3 real blocked** · **9 instrument false positive**
- Features with at least one real fail/blocked assertion: **106**

## Features with real failing or blocked assertions

| feature | causes | assertions |
|---|---|---|
| `v130/attribution-reporting-api-feature-attribution-scopes` | behavioural-assertion-failed×1 | fail:attribution-reporting-supported |
| `v130/webgpu-dual-source-blending` | behavioural-assertion-failed×3 | fail:adapter-advertises-dual-source-blending<br>fail:request-device-with-feature<br>fail:blend-src-wgsl-and-src1-pipeline |
| `v131/attribution-reporting-api-remove-aggregation-key-identifier-size-limit-for-trigg` | behavioural-assertion-failed×1 | fail:attribution-reporting-supported |
| `v131/exempt-speculation-rules-header-from-csp-restrictions` | behavioural-assertion-failed×2 | fail:header-driven-rules-fetched-despite-script-src-none<br>fail:header-accepts-multiple-rule-document-urls |
| `v131/remove-non-standard-gpuadapter-requestadapterinfo-method` | api-surface-absent-in-this-chrome×4 | fail:adapter-info-attribute<br>fail:requestadapterinfo-removed<br>fail:adapter-info-string-fields<br>fail:adapter-info-subgroup-fields |
| `v131/webgpu-clip-distances` | behavioural-assertion-failed×4 | fail:adapter-advertises-clip-distances<br>fail:request-device-clip-distances<br>fail:clip-distances-wgsl-compiles<br>fail:clip-distances-pipeline-accepted |
| `v131/webgpu-gpucanvascontext-getconfiguration` | behavioural-assertion-failed×2 | fail:getconfiguration-after-configure<br>fail:getconfiguration-full-dictionary |
| `v132/attribution-reporting-api-feature-aggregatable-named-budgets` | behavioural-assertion-failed×1 | fail:attribution-reporting-policy-enumerable |
| `v132/webgpu-32-bit-float-textures-blending` | api-surface-absent-in-this-chrome×2 | fail:float32-blendable-feature-name<br>fail:gpu-blend-state-shape |
| `v132/webgpu-expose-gpuadapterinfo-from-gpudevice` | behavioural-assertion-failed×1 | fail:device-adapter-info-roundtrip |
| `v132/webgpu-texture-view-usage` | behavioural-assertion-failed×2 | fail:createview-accepts-usage-subset<br>fail:createview-default-still-works |
| `v134/webgpu-subgroups` | behavioural-assertion-failed×1 | fail:adapter-advertises-subgroups |
| `v136/corner-shaping-corner-shape-superellipse-squircle` | behavioural-assertion-failed×1 | fail:corner-shape-roundtrip |
| `v136/h265-hevc-codec-support-in-webrtc` | behavioural-assertion-failed×3 | fail:h265-listed-in-sender-codecs<br>fail:h265-listed-in-receiver-codecs<br>fail:media-source-supports-h265 |
| `v136/h26x-codec-support-updates-for-mediarecorder` | behavioural-assertion-failed×2 | fail:is-type-supported-hvc1<br>fail:is-type-supported-hev1 |
| `v136/webgpu-copybuffertobuffer-overload` | behavioural-assertion-failed×2 | fail:copy-buffer-to-buffer-overload<br>fail:copy-buffer-to-buffer-existing-form |
| `v136/webgpu-core-features-and-limits` | api-surface-absent-in-this-chrome×3 | fail:device-features-exposes-core<br>fail:adapter-features-exposes-core<br>fail:device-limits-includes-max-texture-2d |
| `v136/webgpu-gpuadapterinfo-isfallbackadapter-attribute` | behavioural-assertion-failed×1, api-surface-absent-in-this-chrome×1 | fail:adapter-info-property<br>fail:is-fallback-adapter-attribute |
| `v136/webgpu-gputextureview-for-externaltexture-binding` | api-surface-absent-in-this-chrome×1, behavioural-assertion-failed×2 | fail:import-external-texture-is-function<br>fail:create-bind-group-layout-with-external-texture<br>fail:create-bind-group-accepts-texture-view-for-external |
| `v138/interpolation-progress-functional-notation-css-progress-function` | behavioural-assertion-failed×1 | fail:progress-extrapolates-beyond-end |
| `v139/corner-shaping-corner-shape-superellipse-squircle` | behavioural-assertion-failed×1 | fail:corner-shape-animatable-via-cssom |
| `v139/css-gap-decorations` | behavioural-assertion-failed×1 | fail:row-rule-color-cssom-roundtrip |
| `v139/remove-swiftshader-fallback` | behavioural-assertion-failed×1, api-surface-absent-in-this-chrome×1 | fail:webgl-context-creation-hardware-or-null<br>fail:webgl2-context-creation-hardware-or-null |
| `v139/secure-payment-confirmation-ux-refresh` | api-surface-absent-in-this-chrome×1 | fail:spc-non-https-payee-origin-rejected |
| `v139/webgpu-3d-texture-support-for-bc-and-astc-compressed-formats` | api-surface-absent-in-this-chrome×1, behavioural-assertion-failed×4 | fail:adapter-features-set<br>fail:bc-sliced-3d-roundtrips-when-advertised<br>fail:astc-sliced-3d-roundtrips-when-advertised<br>fail:bc-3d-texture-creatable-when-enabled<br>fail:astc-3d-texture-creatable-when-enabled |
| `v139/webgpu-core-features-and-limits` | api-surface-absent-in-this-chrome×4 | fail:adapter-features-exposes-core<br>fail:device-features-exposes-core<br>fail:device-limits-include-max-texture-2d<br>fail:adapter-limits-include-bind-groups |
| `v140/serviceworkerautopreload-browser-mode` | api-surface-absent-in-this-chrome×1 | fail:install-event-exposes-addroutes |
| `v142/webgpu-primitive-index-feature` | api-surface-absent-in-this-chrome×3 | fail:gpu-adapter-exposes-features<br>fail:primitive-index-feature-name-introspectable<br>fail:wgsl-source-string-tolerated |
| `v142/webgpu-texture-component-swizzle` | api-surface-absent-in-this-chrome×2, behavioural-assertion-failed×1 | fail:swizzle-feature-string-introspectable<br>fail:device-create-texture-still-supported<br>fail:create-view-accepts-options |
| `v142/webgpu-texture-formats-tier1-and-tier2` | api-surface-absent-in-this-chrome×3, behavioural-assertion-failed×1 | fail:adapter-features-set<br>fail:texture-formats-tier1-introspectable<br>fail:texture-formats-tier2-introspectable<br>fail:create-texture-base-formats-still-supported |
| `v143/menu-elements` | behavioural-assertion-failed×5, api-surface-absent-in-this-chrome×2 | fail:menuitem-has-its-own-interface<br>fail:menulist-and-menubar-have-their-own-interfaces<br>fail:menulist-is-hidden-until-invoked<br>fail:menuitem-reflects-command-and-commandfor<br>fail:unknown-commands-reflect-as-the-empty-string<br>fail:custom-commands-need-two-dashes<br>fail:invoking-a-menuitem-opens-its-menulist |
| `v144/webgpu-subgroup-id-feature` | behavioural-assertion-failed×1 | fail:wgsl-language-extension-subgroup_id |
| `v144/webgpu-uniform-buffer-standard-layout` | behavioural-assertion-failed×1 | fail:uniform_buffer_standard_layout-extension |
| `v145/webgpu-subgroup-uniformity-feature` | api-surface-absent-in-this-chrome×1, behavioural-assertion-failed×1 | fail:adapter-subgroups-feature-detectable<br>fail:requestdevice-with-subgroups-when-advertised |
| `v147/csspseudoelement-support-for-backdrop-scroll-marker-and-view-transitions` | api-surface-absent-in-this-chrome×1 | fail:csspseudoelement-addEventListener |
| `v147/gamepad-event-driven-input-api` | api-surface-absent-in-this-chrome×7 | fail:rawgamepadinputchange-window-handler<br>fail:gamepadbuttondown-window-handler<br>fail:gamepadbuttonup-window-handler<br>fail:gamepadbuttonchange-window-handler<br>fail:gamepadaxismove-window-handler<br>fail:gamepadbuttonevent-interface<br>fail:gamepadaxisevent-interface |
| `v147/js-profiling-in-dedicated-workers` | api-surface-absent-in-this-chrome×1 | fail:profiler-supported-in-dedicated-worker |
| `v147/long-animation-frames-style-duration` | api-surface-absent-in-this-chrome×4 | fail:ot-styleduration-on-loaf-entry<br>fail:ot-layoutduration-on-loaf-entry<br>fail:ot-forcedstyleduration-on-script-timing<br>fail:ot-forcedlayoutduration-on-script-timing |
| `v147/softnavigation-performance-entry` | api-surface-absent-in-this-chrome×2 | fail:soft-navigation-largest-icp-attribute<br>fail:interaction-contentful-paint-fields |
| `v149/allow-payment-handlers-to-report-back-internal-errors` | api-surface-absent-in-this-chrome×1 | fail:payment-request-event-respond-with |
| `v149/capability-elements-usermedia-mvp` | behavioural-assertion-failed×1 | fail:permission-element-not-htmlunknown |
| `v149/comma-separated-container-queries` | behavioural-assertion-failed×1 | fail:comma-list-parses-via-supports |
| `v149/css-path-length` | css-property-absent-in-this-chrome×3, behavioural-assertion-failed×1 | fail:path-length-property-supported<br>fail:path-length-fractional<br>fail:path-length-none-supported<br>fail:path-length-applies-to-svg-path |
| `v149/css-scroll-state-container-queries` | behavioural-assertion-failed×3 | fail:stuck-top-state-query-supported<br>fail:snapped-state-query-supported<br>fail:scrollable-state-query-supported |
| `v149/css-text-box` | css-property-absent-in-this-chrome×1 | fail:text-box-edge-ex-descent-supported |
| `v149/css-url-request-modifiers` | behavioural-assertion-failed×1 | fail:url-rejects-bogus-modifier |
| `v149/gamepad-event-driven-input-api` | api-surface-absent-in-this-chrome×1 | fail:onrawgamepadinputchange-on-window |
| `v149/image-rendering-crisp-edges` | css-property-absent-in-this-chrome×1 | fail:image-rendering-smooth-supported |
| `v149/intl-locale-prototype-variants` | behavioural-assertion-failed×2 | fail:variants-returns-array<br>fail:variants-empty-when-none |
| `v149/opaque-range` | api-surface-absent-in-this-chrome×2 | fail:input-element-supports-opaque-range<br>fail:textarea-element-supports-opaque-range |
| `v149/platform-provided-behaviors` | api-surface-absent-in-this-chrome×2 | fail:html-submit-button-behavior-exists<br>fail:html-submit-button-behavior-callable |
| `v149/respect-autocorrect-off-for-windows-touch-keyboard-in-tsf` | api-surface-absent-in-this-chrome×2, behavioural-assertion-failed×2 | fail:autocorrect-idl-on-input<br>fail:autocorrect-idl-on-textarea<br>fail:autocorrect-off-round-trips<br>fail:autocorrect-default-on |
| `v149/support-path-length-as-a-css-property` | css-property-absent-in-this-chrome×2, behavioural-assertion-failed×1 | fail:path-length-supports-number<br>fail:path-length-supports-none<br>fail:path-length-overrides-presentation-attribute |
| `v149/support-rect-and-xywh-in-shape-outside` | behavioural-assertion-failed×1 | fail:shape-outside-rect-round-trips |
| `v149/webmcp` | api-surface-absent-in-this-chrome×3 | fail:navigator-webmcp-exists<br>fail:webmcp-register-tool<br>fail:webmcp-tool-event-target |
| `v150/additional-windowing-controls` | api-surface-absent-in-this-chrome×4, behavioural-assertion-failed×3, needs-user-mediation×2 | fail:window-maximize-exposed<br>fail:window-minimize-exposed<br>fail:window-restore-exposed<br>fail:window-setresizable-exposed<br>fail:display-state-reports-an-active-value<br>fail:resizable-reports-an-active-value<br>blocked:state-methods-resolve-and-change-window-state<br>blocked:setresizable-flips-resizable-state<br>blocked:display-state-change-fires-on-window-state-flip |
| `v150/algorithm-updates-in-webcrypto` | api-surface-absent-in-this-chrome×7 | fail:subtlecrypto-encapsulatekey-method<br>fail:subtlecrypto-encapsulatebits-method<br>fail:subtlecrypto-decapsulatekey-method<br>fail:subtlecrypto-decapsulatebits-method<br>fail:subtlecrypto-getpublickey-method<br>fail:subtlecrypto-supports-static<br>fail:supports-returns-boolean-for-registered-name |
| `v150/animatable-zoom` | behavioural-assertion-failed×1 | fail:zoom-inherits-into-length-resolution |
| `v150/case-sensitive-anchor-name-matching-in-quirks-mode` | behavioural-assertion-failed×2 | fail:fragment-navigation-exact-name-in-quirks-iframe<br>fail:fragment-navigation-missing-case-stays-unmatched |
| `v150/css-background-clip-border-area` | behavioural-assertion-failed×1 | fail:border-area-respects-border-width |
| `v150/css-fit-content-function-for-sizing-properties` | css-property-absent-in-this-chrome×4, behavioural-assertion-failed×1 | fail:fit-content-function-on-width<br>fail:fit-content-function-percentage<br>fail:fit-content-on-min-width<br>fail:fit-content-on-flex-basis<br>fail:fit-content-clamps-correctly |
| `v150/css-image-color-function` | css-property-absent-in-this-chrome×1 | fail:image-url-color-fallback |
| `v150/css-url-request-modifiers` | behavioural-assertion-failed×1 | fail:url-bogus-modifier-rejected |
| `v150/css4-text-decoration-skip-spaces` | css-property-absent-in-this-chrome×5, behavioural-assertion-failed×1 | fail:skip-spaces-property<br>fail:skip-spaces-none<br>fail:skip-spaces-start<br>fail:skip-spaces-end<br>fail:skip-spaces-start-end<br>fail:skip-spaces-roundtrips |
| `v150/deprecate-and-remove-attribution-reporting-api` | api-surface-absent-in-this-chrome×1 | fail:attributionreporting-attribute-removed |
| `v150/deprecate-and-remove-document-requeststorageaccessfor` | api-surface-absent-in-this-chrome×1 | fail:requeststorageaccessfor-removed |
| `v150/email-verification-protocol` | api-surface-absent-in-this-chrome×1 | fail:native-evp-event-detectable |
| `v150/expose-the-autocorrect-global-html-attribute` | api-surface-absent-in-this-chrome×3, behavioural-assertion-failed×1 | fail:autocorrect-on-input<br>fail:autocorrect-on-textarea<br>fail:autocorrect-on-htmlelement-global<br>fail:autocorrect-attribute-on-roundtrip |
| `v150/media-element-pseudo-classes` | behavioural-assertion-failed×7 | fail:playing-pseudo-class-selector<br>fail:paused-pseudo-class-matches-default-media<br>fail:muted-pseudo-class-matches-muted-media<br>fail:seeking-pseudo-class-selector<br>fail:buffering-and-stalled-selectors<br>fail:volume-locked-pseudo-class-selector<br>fail:stylesheet-with-media-pseudo-classes |
| `v150/parse-processing-instructions-in-html` | behavioural-assertion-failed×1 | fail:target-is-ascii-lowercased |
| `v150/responsively-sized-iframe` | api-surface-absent-in-this-chrome×2, behavioural-assertion-failed×2 | fail:iframe-allowresponsive-sizing-attribute-exists<br>fail:iframe-allowresponsive-sizing-type<br>fail:iframe-allowresponsive-sizing-default-false<br>fail:iframe-allowresponsive-sizing-reflection |
| `v150/softnavigation-performance-entry` | api-surface-absent-in-this-chrome×1 | fail:performance-soft-navigation-timing-interface-exists |
| `v150/speculative-load-measurement` | api-surface-absent-in-this-chrome×4 | fail:getspeculations-instance-method<br>fail:returns-speculationdata-shape<br>fail:destination-null-not-undefined<br>fail:preload-used-field-shape |
| `v150/sub-apps` | api-surface-absent-in-this-chrome×6 | fail:window-subapps-binding<br>fail:subapps-add-method<br>fail:subapps-remove-method<br>fail:subapps-list-method<br>fail:list-resolves-record<br>fail:add-rejects-non-rooted-path |
| `v150/support-path-length-as-a-css-property` | css-property-absent-in-this-chrome×2, behavioural-assertion-failed×1 | fail:path-length-property-supported<br>fail:path-length-accepts-zero<br>fail:path-length-computed-roundtrip |
| `v150/webgpu-immediates` | api-surface-absent-in-this-chrome×3 | fail:gpu-render-pass-encoder-set-immediate-data-exists<br>fail:gpu-compute-pass-encoder-set-immediate-data-exists<br>fail:gpu-render-bundle-encoder-set-immediate-data-exists |
| `v150/webrtc-diagnostic-logging-api` | api-surface-absent-in-this-chrome×6 | fail:navigator-rtc-binding<br>fail:rtc-start-method<br>fail:rtc-finish-method<br>fail:rtc-cancel-method<br>fail:metadata-entry-limit-rejects<br>fail:metadata-length-limit-rejects |
| `v151/algorithm-updates-in-webcrypto` | api-surface-absent-in-this-chrome×6 | fail:subtlecrypto-encapsulatekey-method<br>fail:subtlecrypto-encapsulatebits-method<br>fail:subtlecrypto-decapsulatekey-method<br>fail:subtlecrypto-decapsulatebits-method<br>fail:subtlecrypto-getpublickey-method<br>fail:subtlecrypto-supports-is-static-on-interface-object |
| `v151/declarative-performance-observer` | behavioural-assertion-failed×1 | fail:session-end-entry-type-proposed |
| `v151/expose-the-autocorrect-global-html-attribute` | api-surface-absent-in-this-chrome×4, behavioural-assertion-failed×3 | fail:autocorrect-idl-on-htmlelement<br>fail:autocorrect-is-boolean<br>fail:autocorrect-defaults-to-on<br>fail:autocorrect-off-reflects-content-attribute<br>fail:autocorrect-setter-writes-content-attribute<br>fail:autocorrect-on-textarea<br>fail:autocorrect-on-contenteditable-div |
| `v151/no-auto-rewind-for-animationtrigger-play-methods` | behavioural-assertion-failed×1 | fail:animation-trigger-property-supported |
| `v151/permissions-policy-focus-without-user-activation` | api-surface-absent-in-this-chrome×1 | fail:permissions-policy-known-feature |
| `v151/protocol-filtering-in-digital-credential-api` | api-surface-absent-in-this-chrome×1 | fail:filtering-rejects-unregistered |
| `v151/renewed-html-insertion-streaming-methods` | api-surface-absent-in-this-chrome×3 | fail:stream-html-returns-writable-stream<br>fail:positional-appendHTML<br>fail:childnode-replaceWithHTML |
| `v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields` | api-surface-absent-in-this-chrome×2 | fail:workerMatchedRouterSource-on-prototype<br>fail:workerFinalRouterSource-on-prototype |
| `v151/webaudio-configurable-render-quantum` | api-surface-absent-in-this-chrome×2, behavioural-assertion-failed×3 | fail:renderquantumsize-on-prototype<br>fail:default-quantum-is-128<br>fail:renderSizeHint-accepts-default-keyword<br>fail:renderSizeHint-accepts-hardware-keyword<br>fail:offlinecontext-honours-rendersizehint |
| `v151/webrtc-data-channel-sctp-negotiation-acceleration-protocol` | api-surface-absent-in-this-chrome×1 | fail:offer-carries-sctp-init |
| `v151/window-drag` | css-property-absent-in-this-chrome×2, behavioural-assertion-failed×1 | fail:window-drag-drag-supported<br>fail:window-drag-no-drag-supported<br>fail:window-drag-roundtrips-via-cssom |
| `v152/capability-elements-camera-and-microphone` | api-surface-absent-in-this-chrome×6 | fail:camera-interface<br>fail:camera-constraints<br>fail:camera-track-error<br>fail:microphone-interface<br>fail:microphone-constraints<br>fail:microphone-events |
| `v152/css-image-animation` | css-property-absent-in-this-chrome×4, behavioural-assertion-failed×2 | fail:image-animation-normal<br>fail:image-animation-paused<br>fail:image-animation-stopped<br>fail:image-animation-running<br>fail:animated-image-selector<br>fail:computed-value |
| `v152/csspseudoelement-support-for-backdrop-scroll-marker-and-view-transitions` | api-surface-absent-in-this-chrome×1 | fail:csspseudoelement-addEventListener |
| `v152/declarative-shadow-dom-shadowrootadoptedstylesheets` | behavioural-assertion-failed×2 | fail:parse-time-adoption<br>fail:specifier-order |
| `v152/deprecate-and-remove-attribution-reporting-api` | api-surface-absent-in-this-chrome×1 | fail:attributionreporting-attribute-removed |
| `v152/deprecate-and-remove-document-requeststorageaccessfor` | api-surface-absent-in-this-chrome×1 | fail:requeststorageaccessfor-removed |
| `v152/expose-the-autocorrect-global-html-attribute` | api-surface-absent-in-this-chrome×4, behavioural-assertion-failed×3 | fail:autocorrect-idl-on-htmlelement<br>fail:autocorrect-is-boolean<br>fail:autocorrect-defaults-to-on<br>fail:autocorrect-off-reflects-content-attribute<br>fail:autocorrect-setter-writes-content-attribute<br>fail:autocorrect-on-textarea<br>fail:autocorrect-on-contenteditable-div |
| `v152/gamepad-button-type-attribute` | api-surface-absent-in-this-chrome×1 | fail:gamepadbutton-has-type |
| `v152/media-element-pseudo-classes` | behavioural-assertion-failed×7 | fail:playing-pseudo-class-selector<br>fail:paused-pseudo-class-matches-default-media<br>fail:muted-pseudo-class-matches-muted-media<br>fail:seeking-pseudo-class-selector<br>fail:buffering-and-stalled-selectors<br>fail:volume-locked-pseudo-class-selector<br>fail:stylesheet-with-media-pseudo-classes |
| `v152/mediacapabilities-decodinginfo-encryptionscheme` | behavioural-assertion-failed×1 | fail:unrecognized-scheme-refused |
| `v152/renewed-html-insertion-streaming-methods` | api-surface-absent-in-this-chrome×3 | fail:stream-html-returns-writable-stream<br>fail:positional-appendHTML<br>fail:childnode-replaceWithHTML |
| `v152/responsively-sized-iframe` | api-surface-absent-in-this-chrome×2, behavioural-assertion-failed×2 | fail:iframe-allowresponsive-sizing-attribute-exists<br>fail:iframe-allowresponsive-sizing-type<br>fail:iframe-allowresponsive-sizing-default-false<br>fail:iframe-allowresponsive-sizing-reflection |
| `v152/user-agent-image-replacement-api` | api-surface-absent-in-this-chrome×2 | fail:replacedbyuseragent-exists<br>fail:both-event-handlers-exist |
| `v152/webaudio-configurable-render-quantum` | api-surface-absent-in-this-chrome×1, behavioural-assertion-failed×2 | fail:audiocontext-rendersize-exists<br>fail:audiocontext-rendersize-throws-invalid<br>fail:offlineaudiocontext-rendersize |
| `v152/webgpu-buffer-view-feature` | api-surface-absent-in-this-chrome×1, behavioural-assertion-failed×2 | fail:gpu-adapter-requestable<br>fail:buffer-view-wgsl-feature<br>fail:buffer-view-reinterpret-types |
| `v152/webgpu-subgroup-size-control` | behavioural-assertion-failed×3 | fail:subgroup-ops-wgsl-compilable<br>fail:subgroup-size-builtin<br>fail:pipeline-subgroup-size-control-hint |
| `v152/window-drag` | css-property-absent-in-this-chrome×1 | fail:display-mode-standalone-for-drag |
| `v152/window-shape-api` | api-surface-absent-in-this-chrome×4 | fail:window-shape-exists<br>fail:window-shape-settable<br>fail:window-shape-clearable<br>fail:window-shape-minimum-size |

## Instrument false positives (pass on their own suite page)

- `v134/attribution-reporting-feature-remove-aggregatable-report-limit-when-trigger-cont`: server-route-non-empty-context-uncaps, server-route-empty-context-remains-capped, server-route-omitted-context-remains-capped, server-route-invalid-key-piece-rejected, server-route-header-unsafe-context-rejected
- `v145/focus-s-focusvisible-option`: focus-visible-true-roundtrip
- `v147/js-profiling-in-dedicated-workers`: profiler-constructs-and-stops-on-main-thread, profiler-policy-header-present, profiler-rejects-negative-sample-interval

