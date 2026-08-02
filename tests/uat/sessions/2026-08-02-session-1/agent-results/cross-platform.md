# Cross-Platform / Compatibility Review — UAT Session 1 (2026-08-02)

Agent: cross-platform tester (static review; no live browsers available)
Target baseline: last 2 versions of desktop Chrome, Firefox, Safari, Edge (PROJECT_BIBLE.md §14/§15)
Scope reviewed: `src/**/*.ts(x)`, `vite.config.ts`, `tsconfig.json`, `index.html`, `dist/index.html`, `dist/assets/*`, Bible §9/§15.

Method note: findings are from static code + built-bundle inspection. Items marked **[static inference — confirm live]** are deterministic in code but depend on engine selection/render behavior that must be confirmed in a real browser during this session.

---

## Findings

### F-1 · SEV-2 · All four browsers (production build only) — CSP blocks embedded document images (data: URIs)

- `dist/index.html:5` ships `default-src 'self'; connect-src 'none'; ...` with **no `img-src` directive**, so `img-src` falls back to `'self'`, which does **not** permit `data:` URIs.
- `src/core/parseDocx.ts:53` calls `mammoth.convertToHtml(input)` with no image option → mammoth's default converter emits `<img src="data:<contentType>;base64,...">`. Confirmed present in the shipped bundle (`dist/assets/index-Bh6CQ-LL.js` contains mammoth's `dataUri` converter: ``src: `data:` + e.contentType + `;base64,` + t``).
- `src/core/sanitize.ts:13` `FORBID_TAGS` does not forbid `img`, and DOMPurify's defaults explicitly allow `data:` URIs on `img` — so the images survive sanitization and reach the DOM.
- Result: any .docx containing pictures renders **broken/blank images in the deployed app** in Chrome, Firefox, Safari, and Edge alike, while `npm run dev` (no CSP — `vite.config.ts:5-8`) renders them fine. Classic prod-only regression that no dev-mode testing will catch.
- The sanitizer's own comment (`sanitize.ts:11-12`, "forbid anything ... beyond images") indicates images are intended to render.
- **Recommendation:** change the CSP constant at `vite.config.ts:10` to include `img-src 'self' data:`. Alternatively, if images are declared out of MVP scope, strip them explicitly (mammoth `convertImage` no-op) and record the decision — do not leave the silent divergence. If descoped, downgrade to SEV-3.

### F-2 · SEV-2 · Chromium (Chrome/Edge) vs Firefox divergence — triple-click paragraph selection likely rejected in Chromium **[static inference — confirm live]**

- `src/ui/App.tsx:83` takes `selection.getRangeAt(0)`; `src/core/anchors.ts:46-49` requires `range.startContainer` and `range.endContainer` to resolve to the **same block** via `contains()`, else `anchorFromRange` returns null and the user gets the "Select text inside the document to highlight." hint (`App.tsx:22,89-91`).
- Chromium's well-documented triple-click behavior places the range's end boundary at the **start of the next block** (e.g. `(nextP, 0)`) or in the parent container — so `endBlock !== startBlock` (or `endBlock` is undefined) and the anchor is rejected. Firefox's triple-click typically ends **inside the same paragraph**, so the anchor succeeds.
- Net effect: "highlight a whole paragraph via triple-click" — a core, ordinary gesture — would work in Firefox but show an error hint in Chrome/Edge. Safari's boundary placement also differs and needs live checking.
- **Recommendation:** normalize the range before the same-block check in `anchorFromRange` (`anchors.ts:38-50`): if `endBlock` is missing or differs from `startBlock` but the range text beyond the end of `startBlock` is empty, clamp the end boundary to `(startBlock, startBlock.childNodes.length)` and retry. UAT scenario: triple-click a paragraph in all four browsers and compare.

### F-3 · SEV-3 · Firefox only — multi-range selections silently truncated to the first range

- Firefox is the only target engine that produces **multi-range selections**: Ctrl/Cmd+click discontiguous selections, and drag-selection across table cells creates one range per cell. `src/ui/App.tsx:79-83` checks `rangeCount === 0` but then uses only `getRangeAt(0)`.
- In Firefox, dragging across a table row/column shows several cells visually selected, but the anchor is computed from the **first cell only** → a highlight is applied that does not match what the user sees selected. In Chromium/WebKit the same gesture yields a single cross-block range → cleanly rejected with a hint. Divergent feedback for the same gesture.
- .docx tables are rendered (`td`/`th` are in `BLOCK_SELECTOR`, `anchors.ts:10`), so this is reachable with real documents.
- **Recommendation:** in `onDocumentMouseUp` (`App.tsx:73`), if `selection.rangeCount > 1`, treat as unanchorable (show `HINT_UNANCHORABLE`) so all engines behave identically.

### F-4 · SEV-3 · All four browsers, deployment-shape dependent — `crypto.randomUUID` is secure-context-only and is called at module scope

- `src/core/log.ts:18` — `const sessionId: string = crypto.randomUUID();` runs during initial bundle evaluation; `src/ui/App.tsx:107` also calls it per highlight.
- Support in secure contexts is fine across the baseline (Chrome/Edge 92+, Firefox 95+, Safari 15.4+). But the API is **undefined on insecure origins** (plain-HTTP non-localhost) in all four browsers. Bible §11 (`PROJECT_BIBLE.md:210`) claims the relative-base bundle "also runs on any static server" — on an `http://` LAN server the module-scope call throws `TypeError` during startup → **blank page, no error UI**, in every browser.
- Theoretical for the declared GitHub Pages (HTTPS) deploy boundary; real for the "any static server" claim.
- **Recommendation:** lazy-init the session id with a `crypto.getRandomValues`-based fallback when `randomUUID` is absent, or amend Bible §11 to "any HTTPS/localhost static server." Forward note: the planned SHA-256 `docHash` (`types.ts:42`) will use `crypto.subtle`, which has the **same** secure-context restriction — decide the policy once, now.

### F-5 · SEV-3 · Edge/Chrome/Firefox on Windows (forced-colors / High Contrast mode) — highlight colors collapse to a single system color

- `src/styles.css:179-192` paints the three highlight colors as `background` only. In Windows forced-colors mode (most relevant to **Edge**, the Windows-default browser in the target set), the engine repaints `mark` with system `Mark`/`MarkText` colors: yellow/green/blue become indistinguishable and the `.swatch-dot` fills (`styles.css:166-171`) are stripped, leaving three identical swatch buttons distinguishable only by their text labels.
- Bible §14 (`PROJECT_BIBLE.md:261`) requires that no semantic indication rely on color alone; painted marks in the document have no non-color carrier.
- **Recommendation:** add an `@media (forced-colors: active)` block — either `forced-color-adjust: none` on `mark.hl` (preserves author colors) or per-color `text-decoration`/border treatments. Low effort, contained.

### F-6 · SEV-4 · Safari only — clicking an existing selection to dismiss the toolbar may re-show it (theoretical; needs live check)

- WebKit keeps an existing selection alive on mousedown **over the selected text** (drag affordance) and collapses it only after mouseup; Chromium collapses on mousedown. Since the toolbar logic reads the selection in `onMouseUp` (`src/ui/App.tsx:73-98`), a dismiss-click on the selected text in Safari can observe the old non-collapsed range and re-show the toolbar for one extra click. Self-healing (next click hides it) — flagged for manual Safari verification only.

### F-7 · SEV-3 · All four browsers uniformly (not an engine divergence) — toolbar unreachable without a mouse-up inside the document area

- `src/ui/App.tsx:143` binds selection handling to `onMouseUp` on the `<section>`. Keyboard selections (Shift+Arrow, Ctrl/Cmd+A) never show the toolbar in any browser, and drag-selections whose mouse release lands outside `.document-area` (e.g. over the notes panel) don't either. Uniform behavior, so not a compatibility bug per se, but it contradicts Bible §14 "complete keyboard operability" (`PROJECT_BIBLE.md:261`) and §9's accessibility baseline (`PROJECT_BIBLE.md:184`).
- **Recommendation:** drive toolbar visibility from a debounced `document` `selectionchange` listener (supported in all four targets) instead of/in addition to mouseup.

---

## Verified-OK (no action)

| Area | Verdict | Evidence |
|---|---|---|
| `Element.replaceChildren` | PASS — Chrome 86+/FF 78+/Safari 14+ | `src/ui/DocumentView.tsx:35,47` |
| `Blob.arrayBuffer()` | PASS — Chrome 76+/FF 69+/Safari 14.1+ | `src/ui/App.tsx:44` |
| `TreeWalker` / `NodeFilter.SHOW_TEXT` | PASS — universal | `src/core/anchors.ts:73,126` |
| `element.dataset` | PASS — universal | `src/core/anchors.ts:143` |
| `Text.splitText` | PASS — universal | `src/core/anchors.ts:115-123` |
| `Selection`/`Range` core (`getRangeAt`, `isCollapsed`, `setEnd`, `toString`) | PASS — `Range.toString()` is DOM-based (not layout-based), so offset math in `offsetAtBoundary` (`anchors.ts:19-31`) is engine-consistent; boundaries in element nodes are handled correctly by `probe.setEnd(node, offset)` | `src/core/anchors.ts` |
| `structuredClone`, `crypto.subtle`, `localStorage` | **Not present in current build** — persistence/docHash not yet implemented (types only, `src/core/types.ts:39-53`). Forward note: wrap future `localStorage` access in try/catch — Firefox with cookies blocked throws `SecurityError` on property access, and Safari private-window quota behavior differs. | bundle scan of `dist/assets/index-Bh6CQ-LL.js` |
| CSP `connect-src 'none'` | PASS — the app makes **zero** network requests. The only `fetch(` in the bundle is Vite's modulepreload polyfill, which is dead code here (single chunk; `dist/index.html` has no `<link rel="modulepreload">`; all four targets support modulepreload natively). No XHR/WebSocket/sendBeacon in bundle. The `FileReader` hit is a feature-detected local-Blob fallback inside the mammoth/JSZip chain, not network I/O. | `dist/index.html:5,8-9`; bundle scan |
| Meta-CSP delivery | PASS — `<meta http-equiv>` CSP with these directives is enforced by all four targets; header-only `frame-ancestors` correctly omitted (recorded residual risk, Bible §15 / `vite.config.ts:6-8`) | `dist/index.html:5` |
| Inline `style=""` attributes vs CSP | Theoretical only — `style-src` falls back to `'self'` (no `'unsafe-inline'`), which would suppress inline style attributes, but mammoth does not emit them by default and `FORBID_TAGS` strips `<style>` (`src/core/sanitize.ts:13`). Uniform across browsers. | — |
| Build target / emitted syntax | PASS — no `build.target` override (`vite.config.ts:26-34`), no browserslist in `package.json` → Vite 8.2.0 default `baseline-widely-available` = `chrome111 / edge111 / firefox114 / safari16.4` (`node_modules/vite/dist/node/chunks/node.js:610-616`). Bundle scan: optional chaining, nullish coalescing, private class fields present; **no** top-level await, static blocks, regex lookbehind, or decorators. Built-ins used: `Object.hasOwn` (ES2022), `findLast` (ES2023) — both inside the floor. (The `groupBy` hit is underscore's method inside mammoth, not `Object.groupBy`.) The floor itself is far below last-2-versions as of 2026-08. | `dist/assets/index-Bh6CQ-LL.js` |
| CSS: `position: sticky` toolbar in overflow container | PASS — `styles.css:127-130` inside `.document-area` (`overflow-y: auto`, `styles.css:55-59`); supported and consistent in all four targets. | `src/styles.css` |
| CSS: `:focus-visible` | PASS — Chrome 86+/FF 85+/Safari 15.4+; minor heuristic differences between engines are cosmetic only. | `src/styles.css:161` |
| CSS: `width: fit-content` (unprefixed) | PASS — FF 94+/Safari 11+/Chrome 46+. | `src/styles.css:140` |
| CSS: `mark` UA-style override | PASS — `mark.hl { color: inherit }` (`styles.css:176`) correctly neutralizes the Chromium/WebKit UA rule `mark { color: black }`; per-color backgrounds override UA yellow. | `src/styles.css:173-192` |
| `file://` opening of `dist/` | Theoretical — module script + `crossorigin` (`dist/index.html:8`) cannot run from `file://` in any browser; deploy boundary is a static HTTP(S) server, so out of scope. | — |

---

## Summary for triage

| # | Sev | Browsers | One-liner |
|---|---|---|---|
| F-1 | SEV-2 | All (prod build only) | CSP lacks `img-src data:` → embedded .docx images broken in deployed app, fine in dev |
| F-2 | SEV-2 | Chrome/Edge vs Firefox | Triple-click paragraph selection likely rejected in Chromium, works in Firefox (confirm live) |
| F-3 | SEV-3 | Firefox | Multi-range (table-cell) selections silently highlight only the first cell |
| F-4 | SEV-3 | All (HTTP deploys) | Module-scope `crypto.randomUUID` → blank page on any non-HTTPS static server |
| F-5 | SEV-3 | Edge/Windows HCM | Forced-colors mode collapses the three highlight colors to one system color |
| F-6 | SEV-4 | Safari | Dismiss-click on a selection may re-show toolbar once (theoretical) |
| F-7 | SEV-3 | All (uniform) | No keyboard path to the selection toolbar (Bible §14 conflict) |

No SEV-1 findings. Emitted JS/CSS is comfortably within the last-2-versions baseline; the compatibility risks are behavioral (Selection/Range engine differences) and configuration (CSP img-src), not syntax/support gaps.

---

*Plain-language summary: The app's code will load and run fine on all the required browsers. The problems found are: (1) pictures inside Word documents will show as broken images on the real website but look fine on the developer's machine; (2) selecting a whole paragraph with a fast triple-click will probably fail in Chrome and Edge while working in Firefox; (3) a few smaller quirks in Firefox tables, Windows high-contrast mode, and keyboard-only use. Nothing is a showstopper, but the picture bug and the triple-click bug should be fixed before release.*
