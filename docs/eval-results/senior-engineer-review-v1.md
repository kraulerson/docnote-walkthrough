# Senior Software Engineer Review — DocNote (docnote-walkthrough)

**Reviewer persona:** Senior software engineer, 20+ years, production web/mobile/backend.
**Review date:** 2026-08-02
**Track/scope:** Light-track personal MVP, client-side React/TS `.docx` viewer.
**Method:** Full read of `src/` (21 source + 21 test files), configs, CI, and governance docs (PROJECT_BIBLE.md, FEATURES.md, BUGS.md with 31 resolved bugs across 3 UAT sessions). Read-only; nothing modified; no builds run.

---

## Executive Summary

This is one of the better-engineered small personal projects I have reviewed. The security model is genuinely thought through and *enforced in code*, not just asserted in a document: converter output flows through a single DOMPurify choke point (`src/core/sanitize.ts`), note text is only ever rendered as `textContent` (`src/ui/NotesPanel.tsx:48-57`), a decompression-bomb guard rejects on advertised uncompressed size *before* inflation (`src/core/zipGuard.ts`), and a production CSP is injected at build time (`vite.config.ts:13-24`, verified in `dist/index.html`). The test suite is real and behavior-focused (121 `it()` blocks, ~2,000 lines, including hostile fixtures, a concurrent-open race test, and storage-corruption tests). The architecture — framework-free `src/core/` logic behind a React shell with a deliberate non-React `DocumentView` boundary — is the right shape and is applied consistently. The honest weaknesses are narrow: keyboard-only text selection is not actually reachable despite a "fixed" bug claiming otherwise, popover focus-trapping specified in the Bible is unimplemented, a documented sink function name (`renderSanitizedHtml`) does not exist in the code, and there is no E2E/coverage gate or root README. None of these are disqualifying for the stated scope; several are mislabeled as done.

---

## Phase 1 — Inventory (what it claims vs. what it does)

- **Claim (PRODUCT_MANIFESTO / PROJECT_BIBLE §1):** client-side `.docx` viewer, read-only, ≥3 highlight colors, notes on highlights, notes panel with click-to-jump, localStorage persistence keyed by content hash, nothing leaves the browser.
- **Reality (code):** all six MVP features are implemented and wired end to end (`src/ui/App.tsx`), each with tests. The document is never mutated (annotations live in a separate `<mark>` layer repainted from state — `src/ui/DocumentView.tsx:30-49`). No network APIs exist anywhere in app code (lint-enforced — `eslint.config.js:16-29`).
- **Dependencies:** 4 runtime (`react`, `react-dom`, `dompurify`, `mammoth`), all exact-pinned (`package.json:15-20`); lockfile committed.
- **Patterns:** clean layering `src/core/` (no React) vs `src/ui/`; single localStorage owner (`src/core/annotationRepository.ts`); typed error codes (`src/core/errors.ts`); structured logging with a per-session correlation id (`src/core/log.ts`).
- **QA:** Vitest + jsdom + Testing Library; CI runs build/lint/test + gitleaks + split npm-audit + license-check + Semgrep (`.github/workflows/ci.yml`).

---

## Phase 2 — Structured Review

### 1. Architectural Soundness

**Assessment.** The stated pattern (Bible §3) — React owns the shell; a ref-bounded non-React `DocumentView` owns the sanitized document and the `<mark>` layer; all pure logic is framework-free under `src/core/` — is implemented faithfully. `DocumentView` adopts the fragment imperatively and repaints highlights deterministically on every change (`src/ui/DocumentView.tsx:35-45`). Core modules (`anchors.ts`, `annotationRepository.ts`, `parseDocx.ts`, `hash.ts`) import no React. The parse pipeline is a clear linear flow: size cap → zip-bomb guard → mammoth → sanitize → extract/cap (`src/core/parseDocx.ts:38-99`).

**Strengths.** Separation of concerns is real and enforced by convention + review, not just aspiration. The single-sink and single-storage-owner constraints make the security-critical surface tiny and auditable. The leaf-only block model is shared between parse and anchor engines (`src/core/anchors.ts:12-18`, reused in `parseDocx.ts:78`), so `docHash` identity and anchoring can never disagree — a subtle correctness win (BUG-2/BUG-30).

**Weaknesses.** `src/ui/App.tsx` (432 lines) is a god-component: view state, selection evaluation, highlight CRUD, note CRUD, jump, persistence effect, and Esc handling all live in one file with five `useRef`s coordinating a hand-rolled persistence state machine (`App.tsx:42-50, 321-353`). It works and is commented, but it is the one place that will resist extension. Extraction into hooks (`useAnnotations`, `useSelection`, `usePersistence`) is the obvious refactor.

**Gap Analysis.** No routing/deep-linking — acceptable and by design (single-page tool). No abstraction for a second document format — also by design (Manifesto "Will-Not-Have").

**Verdict: 4/5.** Right architecture, applied consistently; the monolithic shell is the only real debt.

---

### 2. Code Quality and Consistency

**Assessment.** Consistent style throughout (Prettier + ESLint strict/security configs). Naming follows the Bible §10 convention (camelCase/PascalCase/SCREAMING_SNAKE) uniformly. TypeScript is strict with `noUncheckedIndexedAccess` and `noUnusedLocals/Parameters` (`tsconfig.json:8-12`). Comments are unusually good: nearly every non-obvious branch cites the bug it fixes (e.g. `App.tsx:196-199` BUG-19, `anchors.ts:76-83` BUG-5).

**Strengths.** No `any` in app code except one justified test-setup cast with an eslint-disable and explanation (`src/test-setup.ts:37-40`). Error handling is typed and centralized (`DocNoteError` + `ERROR_MESSAGES`, `src/core/errors.ts`) rather than string-throwing. Immutability discipline is good (functional `setState` updaters, `readonly` arrays).

**Weaknesses.** Minor: the `deleteNote` destructure-to-drop pattern uses a `void _removed` dance (`App.tsx:263-264`) to satisfy `noUnusedLocals` — harmless but slightly obscure. The `parseDocx` Node/browser input-shape branch casts through `unknown` twice (`parseDocx.ts:58-61`); it is commented, but it means the browser code path (`{arrayBuffer}`) is *not* the path exercised in the Node test runner (which has `Buffer`), a small test-fidelity gap.

**Gap Analysis.** No dead code of note; the one historical dead-ref (BUG-27 `restoredForHash`) was removed.

**Verdict: 4/5.** High-quality, self-documenting code; the god-component and one cast are the only smells.

---

### 3. Dependency Management

**Assessment.** Exact-pinned versions, lockfile committed, 4 runtime deps (`package.json:15-20`). CI splits the audit: blocking on shipped deps (`npm audit --omit=dev --audit-level=high`), loud-but-non-blocking on the dev toolchain (`ci.yml:48-58`) — a deliberate, well-reasoned choice to avoid a permanently-red lane. License check bans strong copyleft (`ci.yml:60-62`). `npm audit signatures` verifies lockfile integrity.

**Strengths.** Minimal, justified dependency count matches the threat model (TM-009). mammoth and DOMPurify are the correct, standard choices for their jobs — neither is replaceable by a stdlib solution (DOCX unzip+XML→HTML, and robust HTML sanitization respectively). No trivial-task heavy libs.

**Weaknesses.** mammoth pulls the bundle to ~724 KB minified (BUG-17, Won't Fix) — accepted for a local single-user tool but worth restating: it exceeds Vite's 500 KB warning and there is no code-splitting/lazy-load of the parser. `package.json` has no `engines` field, so the "Node LTS" assumption lives only in CI (`ci.yml:21`), not in the manifest.

**Gap Analysis.** No Dependabot/renovate config committed (`.github/` has workflows only). Fine for a personal repo; a gap for anything shared.

**Verdict: 4/5.** Lean, pinned, audited. Bundle size and missing `engines` are the only nits.

---

### 4. Testing and Quality Assurance

**Assessment.** 21 test files, 121 `it()` blocks, ~2,000 lines, co-located. Tests are behavior-focused: sanitizer attack payloads (`sanitize.test.ts` — script/onerror/javascript:/iframe/external-img beacon/inert-link), anchor unicode/surrogate/RTL math (`anchors.test.ts`), zip-bomb central-directory parsing (`zipGuard.test.ts`), storage corruption/quota/unavailable (`annotationRepository.test.ts`, `persistenceRemediation.test.ts`), concurrent-open race (`openRace.test.tsx`), and a dedicated `hardening.test.tsx` for the deferred SEV-3s. Quality gates: `tsc --noEmit` in `build`, ESLint strict+security, Prettier, Semgrep (OWASP + browser-sink pack + project `.semgrep/soif-dom-sinks.yml`).

**Strengths.** These are the tests a skeptical QA engineer writes — boundaries, races, and injection, not happy-path confirmation. The hostile-fixture assertions are explicit (`sanitize.test.ts:75-98`). The Semgrep ruleset is genuinely non-trivial and documents its own coverage seams (`.semgrep/soif-dom-sinks.yml`).

**Weaknesses.** No E2E yet (Playwright deferred to Phase 3 — Bible §12); the reload-persistence and click-to-jump journeys are only proven at the component level with jsdom (which no-ops `scrollIntoView`, `test-setup.ts:6-10`). No coverage threshold is configured in `vite.config.ts`, so "coverage" is asserted, not measured or gated. The browser mammoth input path is untested (see §2).

**Gap Analysis.** No cross-browser/cross-engine runs (jsdom only). No performance test against the 2 MB fixture the Bible promises (Phase 3).

**Verdict: 4/5.** Strong, meaningful unit/component coverage; the missing E2E and coverage gate cap it below 5.

---

### 5. Documentation Accuracy

**Assessment.** Documentation is voluminous and mostly accurate. USER_GUIDE.md and SECURITY.md correctly describe behavior, limits, and the unencrypted-at-rest caveat (TM-005). FEATURES.md maps 1:1 to shipped features.

**Strengths.** The Bible's threat model, data model, and coding standards match the code in almost all respects. Error message strings match `ERROR_MESSAGES` exactly (`USER_GUIDE.md:72-78` vs `errors.ts:10-17`).

**Weaknesses (concrete).**
- **The sanctioned sink is misnamed in the docs.** Bible §10 rule 1 and `CONTRIBUTING.md:14` both name the only allowed HTML sink `renderSanitizedHtml()` — that function **does not exist**. The real export is `sanitizeToFragment()` (`src/core/sanitize.ts:45`). A contributor searching for `renderSanitizedHtml` finds nothing. (grep confirms zero hits in `src/`.)
- **CSP "from day 1 via meta" is imprecise.** Bible §15/§4 (TM-006) describe a `<meta http-equiv>` CSP; in reality CSP is injected *only at build time* (`vite.config.ts:13-24`) and is absent from the dev `index.html`. This is a *reasonable* engineering call (HMR needs the WebSocket that `connect-src 'none'` would block, as the code comment states) and the prod artifact does carry it — but the Bible text overstates "from day 1."
- **BUG-24 / focus-trap is marked resolved but is unimplemented** (see §10).

**Gap Analysis.** No root `README.md` (TM-005 references "USER_GUIDE/README"; only USER_GUIDE exists) — a GitHub visitor lands on no orientation file.

**Verdict: 3/5.** Excellent breadth, but a doc that names a non-existent security function and a bug tracker that marks unshipped behavior "Fixed" are exactly the inaccuracies this category exists to catch.

---

### 6. Error Handling and Resilience

**Assessment.** Failure modes are handled deliberately. `openFile` catches parse failures and maps them to specific banners, falling back to landing state (`App.tsx:95-108`). Web Crypto unavailability degrades to session-only mode rather than crashing (`App.tsx:80-83`). `saveAnnotations` **never throws** — it returns a typed `SaveResult` and the UI warns once for unavailable, per-change for quota (`annotationRepository.ts:17-32`, `App.tsx:341-352`). `loadAnnotations` fails safe: corrupt JSON, wrong schema, or tampered fields are discarded by reconstructing into fresh typed structures (`annotationRepository.ts:63-159`, BUG-28/29). A React `ErrorBoundary` replaces white-screens with a recovery panel (`src/ui/ErrorBoundary.tsx`).

**Strengths.** This is production-grade defensive posture for a client app: no unhandled rejection paths on the core flow, no partial-state corruption, and recovery (reload) is offered rather than required-manual. The concurrent-open generation token (`App.tsx:50, 65-66, 74-76`) prevents a slow parse from clobbering a newer document.

**Weaknesses.** Very minor: the storage-full warning fires per-change, which under a pathological many-highlight document could spam banners — but the store size that triggers quota is far beyond MVP scale (Bible §4 bottleneck #1). Banners are transient/manual-dismiss with no auto-dismiss for info variants that the Bible §9 table implies ("auto-dismiss for info") — a spec/impl gap of no consequence.

**Verdict: 5/5.** Genuinely resilient for the scope; graceful, discoverable, recoverable.

---

### 7. Performance and Scalability

**Assessment.** Parse runs on the main thread (accepted, TM-007; worker deferred). The zip-bomb guard caps advertised uncompressed size at 50 MB before inflation (`zipGuard.ts`, `types.ts:51`); file cap 10 MB; extracted-text cap 5 M chars. Highlight repaint is a full document re-clone + re-application on every annotation change (`DocumentView.tsx:35-41`), driven by the `highlights` effect dep.

**Strengths.** The pre-inflation guard is the right fix and closes the SEV-1 (BUG-1) properly — it reads the ZIP central directory rather than trusting a post-hoc char cap. Bounded inputs everywhere (selection cap 5,000 chars, note cap 1,000).

**Weaknesses.** The full-repaint-per-change model is O(document size) per edit and per keystroke-save cycle. On a large document with many highlights, saving a note re-clones the entire fragment — documented as acceptable at MVP scale (FEATURES.md Feature 4), and correct, but it is the first thing to bite if the tool is pushed past its stated envelope. `onUnlocated` allocates a fresh `Set` on every repaint (`App.tsx:275-277`) even when unchanged — one extra render, no loop (deps are stable), negligible.

**Gap Analysis.** No virtualization for very long documents; no incremental mark diffing. Both are correctly out of scope but are the named scaling limits.

**Verdict: 4/5.** Correct, bounded, and honest about its ceiling; the repaint model is the conscious trade-off.

---

### 8. Frontend Architecture

**Assessment.** State is local `useState`/`useRef` in `App` — appropriate; there is no server state and global-store machinery would be over-engineering here. The React/non-React boundary is the standout decision: React never reconciles inside the document container, avoiding the classic "React fights the DOM" problem when injecting third-party HTML. Build is Vite with `base: './'` (`vite.config.ts:27`) so the bundle runs on GitHub Pages subpaths *and* any static host.

**Strengths.** Correct use of `key` to force remounts where identity matters (`NoteEditor key={noteEditorFor}` BUG-20, `App.tsx:404`; `HighlightMenu key={activeHighlightId}` `App.tsx:392`). `CSS.escape` on the jump selector (`App.tsx:284, 294`) — important because restored ids are only type-checked as strings. StrictMode is on and updaters are kept pure (BUG-26).

**Weaknesses.** The 432-line `App` component (see §1). The selection/highlight/note popovers render as sticky top-bars, not popovers anchored at the selection (documented Won't-Fix for MVP, BUG-25) — usable but not what §9 describes. No code-splitting: mammoth ships in the main chunk (BUG-17).

**Gap Analysis.** No route/history integration (by design). No tree-shaking concern beyond the mammoth chunk.

**Verdict: 4/5.** Thoughtful, idiomatic React with a genuinely smart DOM-boundary; the god-component and static popovers hold it at 4.

---

### 9. API Design and Integration

**Assessment.** There is no network API — by hard product constraint (Bible §7, Manifesto). The relevant "integration" surface is the internal core API: `parseDocx`, `anchorFromRange`/`rangeFromAnchor`/`applyHighlightMarks`, `hashText`, `loadAnnotations`/`saveAnnotations`. These are typed, documented (`docs/api and interfaces/`), and centralized.

**Strengths.** The persistence "API" returns a discriminated `SaveResult` union instead of throwing (`annotationRepository.ts:11`), which is exactly how a resilient client boundary should be shaped. Loading/error/empty/success UI states exist for the one asynchronous operation (parse): landing/loading/ready + specific error banners (`App.tsx:373-383`, `errors.ts`).

**Weaknesses.** Network categories (timeouts, non-2xx, retries, caching, dedup) are N/A here — correctly. There is no artificial API layer invented to satisfy a checklist, which is the right call.

**Gap Analysis.** None applicable given the no-server constraint; the internal contracts are typed and documented.

**Verdict: 4/5.** Not scored against a phantom REST layer; the internal contracts are clean and typed. (5 withheld only because the interface docs live outside the reviewed core and were not re-verified line-by-line.)

---

### 10. Accessibility and Standards Compliance

**Assessment.** Semantic HTML and labels are present throughout: `role="alert"` banner (`Banner.tsx:9`), `role="toolbar"`/`role="menu"`/`role="menuitem"` with `aria-label`s (`SelectionToolbar.tsx`, `HighlightMenu.tsx`), `role="status"` loading, named color swatches (never color-only, `SelectionToolbar.tsx:44-47`), and non-color-only indicators (⚠ unlocated badge, outline+pulse jump target — `NotesPanel.tsx:41-45`, `styles.css:347-361`). A forced-colors media block exists (`styles.css:377-384`).

**Strengths.** The "never color-only" principle is applied consistently and is testable. Esc closes all popovers (`App.tsx:305-315`, BUG-24). Contrast choices look reasonable for AA on the chosen palette. The file input is hidden-but-focusable via a label with `focus-within` outline (`styles.css:87-98`).

**Weaknesses (concrete, and this is the category with the real gaps).**
- **Keyboard-only text selection is effectively impossible.** BUG-14 is marked Fixed and `hardening.test.tsx:119-127` "proves" keyboard selection surfaces the toolbar — but the test *programmatically constructs a Range*. In a real browser, the document `<section>`/`.document-content` has no `tabIndex` and is not `contenteditable` (grep confirms none in `src/ui/`), so a keyboard-only user cannot place a caret to select text at all without OS-level caret browsing (off by default). The core "highlight" feature is therefore not genuinely keyboard-operable, contradicting Bible §14 ("complete operability").
- **Popover focus-trapping is unimplemented.** Bible §9 requires popovers to "trap focus and close on Esc." Esc works; focus-trap does not — there are zero `focus()` calls or trap logic in `src/ui/` (grep confirmed). BUG-24's description explicitly includes "neither traps focus," yet it is marked **Fixed / Verified In Phase 3**, and FEATURES.md Feature 5 simultaneously says focus-trap is "still deferred." The tracker and the spec disagree, and the code sides with "not done."

**Gap Analysis.** No automated a11y assertion (axe/Lighthouse) in CI — deferred to Phase 3 per Bible §12. Given the two gaps above, that deferral is where the real risk sits.

**Verdict: 3/5.** Strong on labels, semantics, and color-independence; but a core feature is not keyboard-reachable and a specified focus-trap is missing while marked done. This is the weakest genuine area.

---

### 11. Security Posture (Web-Specific)

**Assessment.** For a client-only app this is well above typical. CSP is injected into the production build — `default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'` (`vite.config.ts:9-11`, confirmed present in `dist/index.html`). Untrusted converter HTML passes one DOMPurify sink that also forbids subresource/nav tags and strips `href/target/style/class/src/srcset` (`sanitize.ts:16-38`, BUG-6/7/16). Note text and excerpts are rendered as `textContent` only (`NotesPanel.tsx:48-57`, `NoteEditor.tsx` textarea value). localStorage restore reconstructs into fresh typed objects, defeating prototype-pollution / field-injection (`annotationRepository.ts:63-159`, TM-003). Lint bans `eval`/`Function`/network globals (`eslint.config.js`); Semgrep polices DOM sinks.

**Strengths.** Defense-in-depth is real and layered (sink + CSP + lint + Semgrep + textContent invariant). The zip-bomb guard is a correct DoS mitigation. `crypto.randomUUID` degrades safely on non-secure origins (`id.ts`, BUG-12). No cookies, no auth, no server → whole categories of CSRF/session/CORS risk are structurally absent, not merely "handled."

**Weaknesses.** `frame-ancestors` cannot ship via `<meta>` on GitHub Pages, leaving a residual clickjacking exposure — **honestly documented** (Bible §4 platform note, §15) rather than falsely attested, which is the right behavior. `object-src 'none'` and `base-uri 'none'` are set, but there is no `script-src` narrowing beyond `default-src 'self'` (acceptable given no inline scripts in the built artifact). The doc/code sink-name mismatch (§5) slightly weakens the "single auditable sink" story for a newcomer.

**Verdict: 5/5.** Best-in-class for a personal client-only tool; residual risks are real but correctly bounded and disclosed, not hidden.

---

### 12. Deployment and DevOps Readiness

**Assessment.** Clear dev→prod path: `npm run dev` local; `npm run build` (`tsc --noEmit && vite build`) → static `dist/`; GitHub Pages as the deploy boundary (Bible §11). `base: './'` makes the artifact host-portable. CI (`.github/workflows/ci.yml`) runs build, lint, test, gitleaks (pinned CLI + checksum verify), split npm-audit, license-check, `npm audit signatures`, plus governance checks; a separate `sast` job runs Semgrep in a container. Actions are SHA-pinned. `release.yml` exists for tag-triggered releases.

**Strengths.** The CI is more rigorous than most commercial repos this size: it verifies the gitleaks download checksum (`ci.yml:43-44`), passes GitHub context via `env:` to avoid shell-injection (`ci.yml:69-75`), and fails loudly when a governance check cannot resolve its base rather than passing vacuously (`ci.yml:85-87`). SBOM present (`sbom.json`). No secrets to manage (correctly N/A).

**Weaknesses.** No committed GitHub Pages *deploy* workflow was observed (CI validates; `release.yml` handles tags) — deployment steps are documented but the actual Pages publish is not shown as an automated job in the reviewed files. No health/monitoring/observability beyond console logging — correctly N/A for a static client app, and documented as such (Bible §15), but it does mean "did the deploy actually work" is a manual check. No `engines` pin in `package.json` (§3).

**Gap Analysis.** Static-asset CDN/caching is whatever GitHub Pages provides by default — not configured (host limitation, acceptable). No preview-deploy per PR.

**Verdict: 4/5.** Deployment path is clear and the CI is strong; the missing automated Pages-publish job and absence of any post-deploy verification hold it at 4.

---

## "Would I Use This?"

- **Personal projects — Yes, confidently.** This *is* a personal project and it exceeds the bar for one. I would trust it to annotate my own non-sensitive `.docx` files today. The privacy model is sound and honestly disclosed.
- **Small team projects — Yes, with two caveats.** Fix the keyboard-selection and focus-trap accessibility gaps, and correct the `renderSanitizedHtml` doc reference before onboarding a contributor. The code is clean and well-tested enough to hand off; the god-component will slow the first non-trivial feature.
- **Enterprise projects — Not as-is, and it doesn't claim to be.** No SSO/audit/multi-user, single shared-origin localStorage quota, no E2E/coverage gate, and WCAG AA is not yet met for keyboard users. As a *component* (the sanitizer + anchor engine) it is enterprise-quality; as a product it is a personal-scale tool by design.

---

## Critical Fixes (top 5 to be taken seriously)

1. **Make text selection keyboard-operable, or stop claiming it is.** The document container needs a real focus/caret path (or an alternative highlight-creation affordance); until then, mark BUG-14 as *not* keyboard-reachable in real browsers. Test at `hardening.test.tsx:119-127` proves the wiring, not the reachability. (`src/ui/App.tsx`, `DocumentView.tsx`.)
2. **Implement popover focus-trapping or downgrade the claim.** Bible §9 requires it; BUG-24 is marked Fixed while only Esc was shipped. Either add a trap in `HighlightMenu`/`NoteEditor` or reflect reality in BUGS.md and FEATURES.md. (`src/ui/HighlightMenu.tsx`, `NoteEditor.tsx`.)
3. **Fix the documented sink name.** Bible §10 rule 1 and `CONTRIBUTING.md:14` say `renderSanitizedHtml()`; the code exports `sanitizeToFragment()`. Rename one to match the other so the single-sink invariant is greppable. (`src/core/sanitize.ts:45`.)
4. **Add a measured coverage gate and at least one real E2E.** "Coverage" is currently asserted, not enforced; the reload-persistence and click-to-jump journeys run only under jsdom (which no-ops `scrollIntoView`). A single Playwright smoke test would close the highest-value integration gap. (`vite.config.ts`, Bible §12.)
5. **Add a root `README.md`.** A shared repo with no README and a docs tree this large is a discoverability failure; point it at USER_GUIDE/SECURITY and the quickstart.

---

## Production Readiness Checklist

| Item | Status | Note |
|---|---|---|
| Builds cleanly (`tsc --noEmit && vite build`) | ✅ | `dist/` present and CSP-injected |
| Production CSP shipped | ✅ | `dist/index.html` verified |
| XSS/sanitization enforced + tested | ✅ | single DOMPurify sink, hostile-fixture tests |
| DoS (zip-bomb) mitigated pre-inflation | ✅ | `zipGuard.ts` |
| Graceful failure (parse/storage/crypto) | ✅ | typed errors, session-only fallback, ErrorBoundary |
| Dependencies pinned + audited in CI | ✅ | lockfile + split npm-audit + license-check |
| Unit/component tests meaningful | ✅ | 121 tests, boundaries/races/injection |
| Keyboard operability (WCAG AA) | ❌ | text selection not keyboard-reachable |
| Popover focus-trap | ❌ | specified, not implemented |
| E2E / cross-browser | ❌ | deferred to Phase 3 |
| Coverage gate | ❌ | not configured |
| Automated a11y (axe/Lighthouse) in CI | ❌ | deferred to Phase 3 |
| Root README | ❌ | absent |
| Doc/code consistency (sink name) | ⚠️ | `renderSanitizedHtml` does not exist |
| Automated deploy + post-deploy verify | ⚠️ | CI validates; Pages publish/verify manual |
| Monitoring/observability | N/A | static client app; console logging only (documented) |

---

## Overall Rating: 4/5 — Solid

**Justification.** Judged against what practitioners actually ship — not a theoretical ideal — this project is in the top tier of personal MVPs. The security engineering is genuine and enforced in code; the tests are the kind that catch regressions rather than confirm the happy path; the architecture is correctly layered and would survive real extension after one refactor of the shell. It falls short of 5 for concrete, verifiable reasons: a core feature (highlighting) is not truly keyboard-operable while a "fixed" bug claims it is, a spec'd focus-trap is missing, the security docs name a function that does not exist, and there is no E2E/coverage gate or README. These are the honest gaps of a Phase-2 personal tool that has (correctly) parked some accessibility and integration work for Phase 3 — but two of them are mislabeled as done, which is the kind of drift that erodes trust in an otherwise well-run project. Close the top-5 fixes and this is a 5/5 for its scope.
