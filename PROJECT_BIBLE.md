# Project Bible — DocNote (docnote-walkthrough)

<!-- Last Updated: 2026-08-02 (Phase 2 — all MVP features built; UAT Session 3 remediation complete) -->

**Status:** Approved (Phase 1 → 2 gate)
**Approved By:** Karl (Orchestrator, self-review — personal project)
**Approval Date:** 2026-08-02

This is the single technical source of truth for DocNote. Phase 2 builds only what this document and the Product Manifesto authorize.

---

## 1. Product Manifesto (Governing Product Constraint)

The full approved manifesto lives at `PRODUCT_MANIFESTO.md` (Approved 2026-08-02). Its governing elements, restated verbatim in force:

**Product Intent.** DocNote is a client-side web application that lets a single reader open a Word (.docx) document read-only in a desktop browser, highlight passages in at least three colors, and attach short text notes to those highlights — with all annotations persisting locally (browser localStorage) so they reappear when the same document is opened again. The document is never modified, nothing ever leaves the browser, and your markup is still there tomorrow.

**MVP Cutline (above the line — the only Phase 2 work):**
1. Open & render .docx read-only (file picker, client-side parse, ≤10 MB)
2. Apply highlight in ≥3 colors to selected document text
3. Remove highlight (with note-loss confirmation)
4. Attach / edit / delete a note (1-1000 chars) on a highlight
5. Notes side panel in document order with click-to-jump (non-color-only indication)
6. Local persistence per document (content-hash identity, versioned localStorage, graceful degradation)

**Will-Not-Have (rejected on sight in Phase 2):** document editing; accounts/login/server/cloud sync; formats other than .docx; collaboration/sharing; mobile/native apps.

Resolved decisions Q1-Q3 (Manifesto §8): no overlapping highlights in MVP; changed-content documents present as new documents; no storage-housekeeping UI.

---

## 2. Revenue Model & Cost Constraints

N/A — Light track personal tool; no revenue model (Manifesto Appendix A: SKIPPED). Binding cost constraints: $0/month infrastructure; free tooling only; GitHub free tier + GitHub Pages.

---

## 3. Architecture Decision Record

Authoritative record: `docs/ADR documentation/ADR-0001-architecture-selection.md` (Accepted 2026-08-02). Summary:

- **Stack:** TypeScript (strict) + React 19 + Vite SPA; mammoth.js for .docx → semantic HTML; DOMPurify sanitization; localStorage repository module; Vitest + jsdom + @testing-library/react; ESLint 9 flat config (typescript-eslint + eslint-plugin-security) + Prettier.
- **Pattern:** React owns the app shell (toolbar, notes panel, dialogs); a non-React `DocumentView` container (ref boundary) owns the sanitized rendered document and the `<mark>` highlight layer; all core logic (parse pipeline, anchor math, repository) is framework-free TypeScript under `src/core/`.
- **Rejected:** vanilla-TS/no-framework (more hand-rolled UI state for a junior reviewer); Next.js + docx-preview (over-engineering; paged rendering breaks the anchoring model).
- **Distribution:** static `dist/` bundle; GitHub Pages as the production deploy boundary.

---

## 4. Threat Model & Risk/Mitigation Matrix

Persona applied: hostile penetration tester. Assets: **A1** document content (memory only), **A2** annotation store (text excerpts + notes in localStorage), **A3** app origin integrity (`kraulerson.github.io`). Threat actors: crafted-document author; co-user of the same browser profile/machine; malicious browser extension; compromised npm dependency; compromised host.

| ID | STRIDE | Threat (concrete attack path) | Component / Data Flow | Mitigation (concrete control) |
|---|---|---|---|---|
| TM-001 | Spoofing | No user identity exists to spoof. Residual: an attacker crafts a file whose extracted text equals a victim document's, "inheriting" its annotations. Requires knowing the exact text — at which point the attacker has the document already. | Document identity (T3) | SHA-256 over extracted text (Web Crypto); same-text-same-identity is documented by-design behavior (Manifesto Q2). |
| TM-002 | Tampering | I email you `meeting-notes.docx` crafted so the converter emits active HTML (`<img onerror=…>`, `javascript:` href, embedded style/script) — if inserted raw, my script runs in your origin. | mammoth output → DOM insertion (T1→T2) | ALL converter output passes DOMPurify with defaults hardened (no event handlers, no `javascript:` URIs, no `<script>/<style>/<iframe>`); insertion only through the single `renderSanitizedHtml` choke point; semgrep DOM-sink gate (pre-commit + CI) polices raw sinks; hostile-fixture unit test asserts the payload is stripped. |
| TM-003 | Tampering | A co-user (or extension) edits localStorage, planting `<script>` in a stored note or corrupting the JSON so restore crashes or renders attacker markup. | localStorage → restore path (T5) | Schema validation on load (shape + types + version); notes rendered exclusively via `textContent` (never HTML); invalid data → safe discard with user message (Manifesto failure state); no `eval`/dynamic code anywhere. |
| TM-004 | Repudiation | Single-user tool; no action needs to be attributable to a second party. Accepted: no audit trail. | — | N/A by design — recorded here so the category is addressed, not forgotten. |
| TM-005 | Info. Disclosure | Multi-step chain: brief physical access to your unlocked machine → open devtools → dump localStorage → read stored excerpts (`exactText` anchors) of a confidential contract plus your candid notes → photograph screen. No exploit needed. | Annotation store (A2) | Honest disclosure in USER_GUIDE/README: annotations (including document excerpts) are stored unencrypted in the browser profile; selection length capped (5,000 chars) bounding excerpt size; in-app removal deletes data; encryption-at-rest rejected for MVP (needs a passphrase → violates no-accounts constraint) — recorded residual risk. |
| TM-006 | Info. Disclosure | Chain continuing TM-002: if script DID execute despite sanitization, it exfiltrates all annotation sets (every document you've annotated) to my server. | Origin (A3) → network | Defense in depth: CSP (meta) `default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`; zero network APIs in app code (lint-enforced "never do" rule); origin-prefixed storage keys (`docnote.v1.*`) limit cross-app confusion on the shared `github.io` origin. |
| TM-007 | DoS | I hand you a 9.8 MB docx that is a zip bomb / million-paragraph document; parse freezes the tab or OOMs it. | Parse pipeline (T1) | 10 MB pre-parse file cap; **pre-inflation uncompressed-size guard rejecting >50 MB advertised uncompressed via the ZIP central directory (BUG-1 fix, `zipGuard`) — the earlier char-cap-only mitigation was proven insufficient by UAT**; extracted-text cap (5,000,000 chars); try/catch with specific error banners; main-thread parse accepted for MVP (worker deferred — recorded). |
| TM-008 | DoS | Annotation writes silently die: quota exhausted (5 MB origin quota is SHARED across every `kraulerson.github.io` project) or storage disabled (private mode). | Repository (T4) | Quota-exceeded caught → explicit "change not saved (storage full)" warning; storage-unavailable → one-time session-only warning; `docnote.v1.` key prefix; write-through verified by read-back in tests. |
| TM-009 | Elev. of Privilege | Supply-chain chain: malicious patch published to a dependency → routine update pulls it → build embeds payload → every user of the deployed app runs it in-origin → localStorage read + page control. | npm dependencies → build → A3 | Exact version pinning + committed `package-lock.json`; minimal dependency count (4 runtime deps); `npm audit --omit=dev` blocking in CI + Snyk scan (Phase 3); updates are deliberate (never auto); CSP still blocks network exfil at runtime. |

### Architecture Stress Test

**5 edge cases where this stack fails:**
1. Dense 10 MB docx → multi-second main-thread parse freeze (mitigated by cap + progress indication; accepted for MVP).
2. Image-only document → zero extractable text → must hit the explicit "no readable text" path, not a blank screen.
3. Two files with identical text but different formatting → same hash → shared annotations (by-design, may surprise; documented).
4. Safari private mode reports quota 0 → every write fails → session-only mode must engage on the first failed write, not crash.
5. Unicode: emoji/combining chars/RTL runs → offsets are defined as UTF-16 code units of the paragraph's `textContent`; anchor tests must cover these or highlights will drift.

**3 vulnerabilities inherent to this design (stack-specific):**
1. HTML injection through the docx converter's output (TM-002) — the design routes untrusted document content toward `innerHTML`-class sinks by construction; safe only through the sanitizer choke point.
2. DOM-sink regressions in the annotation layer (wrapping ranges in `<mark>` tempts `insertAdjacentHTML`) — policed by the project semgrep ruleset (`.semgrep/soif-dom-sinks.yml`) and code review.
3. `JSON.parse` of attacker-influenceable localStorage → prototype-pollution style hazards if parsed objects are merged into live objects — mitigated by validating into fresh typed structures, never `Object.assign` from parsed data into existing objects.

**2 data storage bottlenecks (with triggers):**
1. Whole-store rewrite per change: one JSON blob per document rewritten on every edit — O(size) per keystroke-save; trigger: >~1,000 highlights on one document.
2. Shared-origin 5 MB quota across all `kraulerson.github.io` apps + all annotation sets; trigger: many annotated documents × long `exactText` excerpts.

**1 limitation that could force a rewrite within 12 months:** anchors are bound to the deterministic rendering of a pinned mammoth version. A renderer swap or major-version bump can invalidate every stored anchor, forcing an anchor-migration layer. Likewise, allowing overlapping highlights later would break the flat `<mark>` model. Accepted consciously.

**Platform-specific risks (web module):** GitHub Pages cannot set custom response headers → CSP delivered via `<meta http-equiv>`; `frame-ancestors` is header-only and therefore cannot be delivered by this host — residual clickjacking exposure to be evidenced honestly at Phase 3 DAST (no false attestation in `.claude/dast-headers.json`).

---

## 5. Data Model

No database; localStorage is the persistence layer (hard constraint). All access goes through `src/core/annotationRepository.ts` — the ONLY module allowed to touch `localStorage`.

### Entities (TypeScript, authoritative)

```ts
type HighlightColor = 'yellow' | 'green' | 'blue';

interface TextAnchor {
  paragraphIndex: number;   // index into the rendered document's block elements
  startOffset: number;      // UTF-16 code-unit offset into the paragraph's textContent
  endOffset: number;        // exclusive; endOffset > startOffset
  exactText: string;        // the highlighted text at creation time (validation + unlocated detection); ≤5,000 chars
}

interface Note {
  text: string;             // 1-1000 chars, plain text; NEVER rendered as HTML
  createdAt: string;        // ISO-8601
  updatedAt: string;
}

interface Highlight {
  id: string;               // crypto.randomUUID()
  color: HighlightColor;
  anchor: TextAnchor;
  note?: Note;
  createdAt: string;
  updatedAt: string;
}

interface AnnotationStore {
  schemaVersion: 1;
  docHash: string;          // SHA-256 hex of extracted document text
  highlights: Highlight[];  // invariant: anchors are non-overlapping, sorted by (paragraphIndex, startOffset)
  createdAt: string;
  updatedAt: string;
}
```

### Storage layout

- Key: `docnote.v1.annotations.<docHash>` → JSON-serialized `AnnotationStore`.
- Prefix `docnote.v1.` is mandatory (shared `github.io` origin).
- No secondary index (housekeeping UI is out of scope — Manifesto Q3).

### Access control & isolation

Browser same-origin policy is the isolation boundary. No cross-document reads: the repository exposes only `load(docHash)`, `save(store)`, and never enumerates other keys.

### Versioning & rollback ("migrations")

- `schemaVersion` guards every read. Unknown/missing version or shape-invalid data → **fail-safe discard** with the user message defined in the Manifesto (never crash, never partially load).
- v1 → v2 migrations (if ever) will be a pure function `migrate(v1): v2` with tests; **rollback** = the discard path (annotations are re-creatable user data, accepted for a personal tool).
- Sensitivity: everything stored is Internal (Data Contract) — no encryption at rest in MVP (TM-005 residual risk, documented).

---

## 6. Data Migration Plan

N/A — greenfield product; no legacy data sources to import (Intake §5.3 lists no existing systems). Recorded per the skipped-step rule.

---

## 7. Auth & Identity Strategy

N/A — hard constraint: no accounts, no server. The only identity in the system is **document identity**: SHA-256 (Web Crypto `crypto.subtle.digest`) over the extracted document text, hex-encoded, computed client-side (Data Contract T3). No user identity, no sessions, no tokens.

---

## 8. Observability & Logging Strategy

- `src/core/log.ts`: structured console logging — `{ ts, level, sessionId, event, detail }`; levels `debug|info|warn|error`; `sessionId` = per-page-load `crypto.randomUUID()` (correlation ID).
- Logged events: parse start/success/failure (with timing), store load/save/discard, quota/storage failures, anchor re-attach failures (count of unlocated).
- NEVER logged: document content, note text, excerpt text — log metadata only (sizes, counts, error names). This is a privacy rule, not a preference.
- No telemetry, no error-reporting service, no network. Errors surface to the user via banners and to the developer via the console. (Sentry et al. rejected: violates no-network constraint and $0 budget.)

---

## 9. UI Component Specifications

Layout: single page. Header (app name + "Open a .docx" button + read-only/privacy promise line) · main split: document area (left, ~70%) + notes panel (right, ~30%) · transient banners top-center. Desktop-only (≥1024 px effective).

| Component | Owns | Empty | Loading | Error | Success |
|---|---|---|---|---|---|
| `AppShell` (React) | Layout, banner slot, global state wiring | Landing state: picker CTA centered, panel hidden | — | Renders `Banner` for any surfaced error | Header + document + panel visible |
| `FilePicker` (React) | File input (`accept=".docx"`), size pre-check | Initial CTA: "Open a .docx — Read-only. Your file is never modified or uploaded." | "Opening [name]…" indicator during read+parse | Specific banners: not-a-docx / over 10 MB / no readable text | Hands parsed model to shell; CTA moves to header ("Open another") |
| `DocumentView` (non-React container behind ref) | Sanitized rendered document + `<mark>` layer + selection detection | Not mounted before first document | Skeleton/spinner block | Parse-failure banner (from shell); view stays on previous/landing state | Read-only rendered text; highlights painted; jump-target emphasis (outline + brief animation, not color-only) |
| `SelectionToolbar` (React popover) | Color actions on a valid selection | Hidden (no/collapsed selection) | — (instant) | "Select text inside the document to highlight" / "Highlights cannot overlap" hint | Applies chosen color; toolbar closes; focus returns to document |
| `HighlightMenu` (React popover, on highlight click) | Remove highlight; add/edit note entry point | Hidden | — | Stale-highlight notice ("That highlight was already removed") | Menu with labeled actions: Add/Edit note, Remove highlight (confirm if note exists) |
| `NoteEditor` (React) | Note text entry, 1-1000 chars, live counter | Blank textarea + counter 0/1000 + Save disabled | Save is synchronous-fast; button disabled during write | "Note cannot be empty" / counter at limit blocks save / "highlight no longer exists" discard notice | Note saved; editor closes; panel updates |
| `NotesPanel` (React) | Notes list in document order | "No notes yet." | "Restoring annotations…" during store load | "Saved annotations could not be loaded" (corrupt store) | Note cards: excerpt preview, note text, color name label + swatch, jump on click; "unlocated" badge (icon + word) when anchor lost |
| `Banner` (React) | Transient + persistent messages | Hidden | — | Variants carry icon + text (never color-only); dismissible | Auto-dismiss for info (e.g., "Annotations restored") |

Accessibility baseline (all components): every interactive element has a visible text label or `aria-label`; color swatches are named ("Yellow", "Green", "Blue"); popovers trap focus and close on Esc; jump emphasis uses outline+motion not color; all flows keyboard-operable; WCAG AA contrast.

---

## 10. Coding Standards

- **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess: true`); no `any` without a `// justified:` comment.
- **Structure:** `src/core/` (framework-free: parse, anchor, repository, log — no React imports, enforced by review) · `src/ui/` (React components) · `src/main.tsx` entry.
- **Lint/format:** ESLint 9 flat config (`eslint.config.js`): `typescript-eslint` recommended + `eslint-plugin-security`; Prettier defaults. Lint must be non-vacuous (verified by planting an issue once — BL-159 note).
- **Naming:** `camelCase` functions/vars, `PascalCase` components/types, `SCREAMING_SNAKE` for true constants. Test files co-located: `foo.test.ts` beside `foo.ts`.
- **Never-do rules (each is a review-blocking defect):**
  1. Never assign document/user-influenced strings to `innerHTML`/`outerHTML`/`insertAdjacentHTML`/jQuery-`.html()` — the ONLY sanctioned sink is `renderSanitizedHtml()` in `src/core/sanitize.ts` (DOMPurify inside).
  2. Never render note text or `exactText` as HTML — `textContent` only.
  3. Never use `eval`, `new Function`, or dynamic `import()` of computed strings.
  4. Never call network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`) in application code.
  5. Never touch `localStorage` outside `annotationRepository.ts`.
  6. Never mutate the parsed document model after parse; annotations live only in the annotation layer.
  7. Never log document content, notes, or excerpts (log metadata only).
  8. Never add a dependency without an ADR note (justification requirement from the Intake rules).
- Commit messages: conventional (`feat:`/`fix:`/`docs:`/`test:`/`chore:`); tests precede implementation (TDD gate enforces ordering).

---

## 11. Build & Distribution Strategy

- **Dev:** `npm run dev` (Vite dev server, localhost).
- **Build:** `npm run build` → `tsc --noEmit`-checked, Vite-bundled static `dist/`; `base` configured for project pages (`/docnote-walkthrough/`) with a relative-friendly setup so the bundle also runs on any static server.
- **Required npm scripts before first push (BL-159):** `build`, `lint`, `test` — the generated CI runs all three unconditionally.
- **CI:** generated `.github/workflows/ci.yml` (do not modify): build, lint, tests, Semgrep SAST, `npm audit --omit=dev` (blocking) + loud dev-audit arm, license check.
- **Release pipeline:** generated `.github/workflows/release.yml` (web template), triggered by version tags; configured at Phase 4. Light-track note from init: optional unless distributing externally — this project's v1.0.0 tag will exercise it as the framework's release step directs.
- **Production deploy boundary:** GitHub Pages serving `dist/`. Host limitation (recorded): no custom response headers → CSP ships as `<meta http-equiv="Content-Security-Policy">` with all non-header-only directives explicitly set (`default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`); `frame-ancestors` cannot ship on this host (header-only) — residual risk assessed with evidence at Phase 3; whatever headers github.io actually sends are captured by `curl -I` then and only truthfully declared in `.claude/dast-headers.json`.
- **Secrets:** none exist; nothing to configure.

---

## 12. Test Strategy

**What is tested, with what, and what pass/fail means:**

| Category | Tool | Scope | Pass criteria |
|---|---|---|---|
| Unit (core) | Vitest | anchor math (incl. emoji/combining/RTL offsets), repository (versioning, corrupt-data discard, quota/unavailable paths), parse pipeline (valid fixture, hostile fixture, oversized, empty, image-only), sanitizer (TM-002 payloads stripped), hashing determinism | All green; hostile-fixture assertions explicit |
| Component | Vitest + jsdom + @testing-library/react | Every §9 component state (Empty/Loading/Error/Success) reachable and correct; a11y roles/labels present | All green |
| E2E (Phase 3) | Playwright | Full Manifesto §3 journey incl. reload-persistence, click-to-jump, remove-with-note confirm; browsers: Chromium, Firefox, WebKit | Journey passes on all three engines |
| SAST | Semgrep (pre-commit + CI) | OWASP top-ten pack + browser-sink packs + project `.semgrep/soif-dom-sinks.yml` | Zero ERROR-severity findings |
| Secrets | gitleaks (pre-commit + CI) | Every commit | Zero findings |
| Dependencies | `npm audit --omit=dev` (CI, blocking); Snyk (Phase 3) | Shipped tree | Zero known vulns in shipped tree |
| License | license-checker (CI) | All deps | No strong-copyleft in shipped tree |
| DAST (Phase 3) | OWASP ZAP baseline vs built preview | Deployed-shape app | No Medium+ alerts, judged honestly per the hardened-serve rules (only truthfully-shipped headers declared) |
| Accessibility (Phase 3) | Lighthouse a11y + keyboard pass | Built app | Lighthouse a11y ≥90; full keyboard operability |
| Performance (Phase 3) | Lighthouse | Built app; 2 MB fixture | Performance ≥90; fixture renders <3 s |

- **TDD:** tests written and verified failing before implementation for every feature (Build Loop steps; commit gate enforces).
- **Entry criteria for Phase 3:** all MVP features built; unit+component suites green in CI; no open SEV-1/2 bugs; UAT sessions complete.
- **Exit criteria for Phase 3:** every scanner above passes (or carries a signed skip attestation per gate rules); results archived in `docs/test-results/` as `[date]_[scan-type]_[pass|fail].[ext]`.

**Bug severity classification:**

| Severity | Definition | Examples (this project) |
|---|---|---|
| SEV-1 | Data loss, security breach, crash on core flow | Annotations wiped on load; sanitizer bypass executes document script; crash on open |
| SEV-2 | Feature broken, workaround exists; significant UX failure | Jump scrolls to wrong highlight; note edit saves to wrong note |
| SEV-3 | Minor UX, cosmetic, non-core edge case | Toolbar mispositioned near viewport edge; counter off-by-one display |
| SEV-4 | Enhancement, polish | "Would be nice" items |

**UAT plan (Intake §11.5):** testing interval every 2 features → sessions after features 2, 4, and 6; 1 human tester (Orchestrator); bug tracker `BUGS.md`; Light-track SLAs (SEV-1 24h, SEV-2 7d, SEV-3 best effort). Sessions follow the 9-step UAT checklist with parallel agent testers per CLAUDE.md.

---

## 13. Orchestrator Profile Summary

Junior developer (<1 year professional). Competency gaps and their mandatory compensating tooling (Manifesto Appendix B): **Security = No** → Semgrep (pre-commit + CI), gitleaks, npm audit (CI), Snyk + ZAP (Phase 3). **Build/DevOps = No** → generated CI pipeline is the verification authority; no manual pipeline edits. **Accessibility = No** → Lighthouse a11y + keyboard checks (Phase 3) + §9 baseline rules from day 1. **Partially** domains (Product/UX, Frontend, Performance) → covered by UAT sessions, component tests, and Lighthouse. Practical rule: where the Orchestrator cannot judge, the tool's verdict is the gate and conservative defaults win.

---

## 14. Accessibility Requirements

From Intake §9: WCAG AA. Never rely on color alone (color-vision deficiency explicitly considered): highlight colors are user-chosen labels, but ALL semantic indications (active highlight, jump target, unlocated badge, banner variants, swatch identity) carry text/icon/shape in addition to color. Browsers: last 2 versions Chrome/Firefox/Safari/Edge. Desktop only; no responsive/mobile requirement; no dark mode. Keyboard: complete operability (tab order, focus management in popovers, Esc closes). Verified by component tests (roles/labels), Phase 3 Lighthouse a11y ≥90, and a keyboard-only manual pass.

---

## 15. Platform-Specific Requirements (Web Module)

- **CSP (module §4.4):** meta-CSP from day 1 with non-inheriting directives explicit: `default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`. (`frame-ancestors` is header-only — cannot ship on GitHub Pages; recorded residual risk, TM chain §4.)
- **DAST honesty (module §4.2/BL-165):** `.claude/dast-headers.json` will declare ONLY headers the deploy boundary truthfully ships (evidence: `curl -I` against the live host at Phase 3/4); otherwise the raw-preview verdict stands and is handled by the gate's documented paths.
- **SAST (module §4.6):** the pre-commit/CI semgrep trio including project-owned `.semgrep/soif-dom-sinks.yml`; treat `[OK]` receipts as tripwires, not proofs.
- **Phase 2 init web additions:** `.env.example` — N/A (zero env vars; recorded); `/health` endpoint — N/A (static client-only app; recorded); CORS — N/A (no server); structured logging with correlation IDs — yes (§8).
- **Lockfile:** `package-lock.json` committed (auto-detected by verify-init).
- **ESLint ≥9 flat config** required for the CI lint step (module BL-159); config verified non-vacuous once.
- **Dependency audit split (BL-160):** blocking arm = `npm audit --omit=dev`; dev-chain advisories reviewed deliberately.
- **E2E:** Playwright per module §4.1, added at Phase 3.
- **SBOM (Phase 3):** `npx @cyclonedx/cyclonedx-npm --output-file sbom.json`.
- **SECURITY.md** (module §6): created in Phase 3 with disclosure instructions (personal-project scale).

---

## 16. Context Management Plan

Small project (<30 source files): provide the full Bible per session (this file + `PRODUCT_MANIFESTO.md` are the session context). Context Health Check every 3-4 features per CLAUDE.md: summarize built/remaining/data model/known issues and verify against this Bible; contradictions → fresh session. `<!-- Last Updated -->` marker at the top of this file is refreshed at every phase transition and after any architectural change.
