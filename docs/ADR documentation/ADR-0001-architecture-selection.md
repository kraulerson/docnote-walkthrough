# ADR-0001: DocNote MVP Architecture — Client-Only React SPA with Mammoth Rendering

**Status:** Accepted
**Date:** 2026-08-02
**Phase:** Phase 1 Architecture (Step 1.2)

## Context

DocNote is a fully client-side .docx viewer with highlighting and notes (Product Manifesto §1). Hard constraints from the Intake: TypeScript; browser localStorage as the only storage; no server component; no accounts; $0/month budget; desktop browsers (last 2 versions of Chrome/Firefox/Safari/Edge). The Orchestrator is a junior developer (knows a little React), so the Competency Matrix mandates conservative, well-documented choices with automated tooling for Security, Build, and Accessibility. The riskiest technical area is .docx parsing/rendering and stable highlight anchoring (Intake §11).

## Options Evaluated

<!-- For architecture-level decisions (Phase 1), evaluate at minimum:
  - Solo maintainability (can one person maintain this long-term?)
  - Security posture (what attack surface does this create?)
  - Budget fit (hosting, licensing, tooling costs)
  - Platform compatibility (does this work for all target platforms?)
-->

| Option | Description | Pros | Cons |
|--------|------------|------|------|
| A | **React 18 + Vite + TypeScript SPA**; mammoth.js converts .docx → semantic HTML (sanitized with DOMPurify) inside a ref-managed document container; custom annotation layer; localStorage repository module | Platform Module's explicit SPA recommendation ("React + Vite for SPAs"); Orchestrator knows some React; mammoth is mature, browser-native (ArrayBuffer input), text/semantics-focused — matches the "text rendering, not visual fidelity" scope; Vite is simple and fast; all free | React does not manage the rendered document DOM — requires a deliberate ref-boundary pattern; mammoth's HTML output requires sanitization (untrusted input) |
| B | **Vanilla TypeScript + Vite** (no UI framework); same mammoth + DOMPurify + localStorage core | Fewest dependencies; total control of DOM (annotation layer is DOM-heavy anyway); smallest bundle | No component model for panel/toolbar/dialog state — more hand-rolled UI state code to review, which the junior Orchestrator is weakest at validating; departs from Platform Module recommendation |
| C | **Next.js (SSG export)** + docx-preview (high-fidelity paged rendering) | High visual fidelity; Next.js well documented | SSR/SSG machinery is dead weight for a no-server, no-SEO local tool (over-engineering per Phase 1 remediation table); docx-preview's absolute-positioned page DOM makes text-range anchoring much harder; larger attack surface |

## Decision

**Option A.** Stack, as first-class decisions per the Core Architecture Prompt:

1. **Languages & Frameworks:** TypeScript ~5.x (strict), React 18.x, Vite 7.x, all exact-pinned in package-lock.json at Phase 2 init.
2. **Data storage:** Browser localStorage via a single repository module (`annotationRepository`), versioned JSON schema (`schemaVersion: 1`), key = `docnote.v1.annotations.<docHash>` where docHash = SHA-256 of extracted document text (Web Crypto). Justified by Data Contract T3-T5.
3. **Application architecture pattern:** SPA with a strict boundary: React owns app shell, toolbar, notes panel, dialogs; a non-React `DocumentView` container (managed via ref) owns the sanitized rendered document and the highlight `<mark>` layer. Core logic (parsing, anchoring, repository) is framework-free TypeScript modules for testability.
4. **Authentication & Identity:** None — hard constraint. Document identity only (content hash).
5. **Observability:** Structured console logging module (level, timestamp, session correlation id, event); no telemetry, no network. Day-1 decision per guide.
6. **Secrets management:** No secrets exist (no services). CI uses no repository secrets for build/test. gitleaks guards regressions.
7. **Build & packaging:** Vite build → static `dist/` bundle; GitHub Actions CI (generated ci.yml: build, lint, test, semgrep, audit, license).
8. **Scalability vs. velocity:** Velocity. Single-user local tool; the only scale dimension is document size (10 MB cap) and localStorage quota (~5 MB) — both handled by explicit limits and graceful degradation.
9. **Distribution:** Static hosting — GitHub Pages (free, no new accounts) as the "production" deploy boundary; also runnable via any static file server. Web-specific note: GitHub Pages cannot set custom response headers; CSP is delivered via `<meta http-equiv>` (all non-header-only directives); residual header risk assessed honestly at Phase 3 DAST with evidence of what the host actually ships.
10. **Auto-update:** N/A — static site; users always load the latest deploy.
11. **Frontend rendering strategy (web #11):** Client-side SPA, no SSR/SSG.
12. **Hosting platform (web #12):** GitHub Pages (static).
13. **Database & migrations (web #13):** None — localStorage schema versioning with fail-safe discard (documented in Bible §5).
14. **Auth provider (web #14):** None.
15. **CDN/caching (web #15):** GitHub Pages CDN defaults; hashed asset filenames from Vite.
16. **API versioning (web #16):** N/A — no API.

**Key libraries:** mammoth.js (docx → semantic HTML; browser ArrayBuffer input verified via Context7 docs), DOMPurify (sanitize mammoth output before insertion — docx content is untrusted input), Vitest + jsdom + @testing-library/react (unit/component tests), ESLint 9 flat config + typescript-eslint + eslint-plugin-security, Prettier. Playwright added in Phase 3 for E2E per Platform Module.

## Rejected Alternatives

- **Option B (vanilla TS):** rejected because the largest volume of code the Orchestrator must review is UI state handling, and a component model plus Testing Library makes that code smaller and more conventionally reviewable; the Platform Module explicitly recommends React + Vite for SPAs and notes AI generates it with the highest consistency.
- **Option C (Next.js + docx-preview):** rejected as over-engineering (server-grade framework for a no-server product) and because high-fidelity paged rendering directly conflicts with the anchoring model — the project's stated riskiest area. Scope is text rendering (Intake §11 risk 2).

## Consequences

- Easier: testable framework-free core (anchor math, repository, parsing pipeline); conventional React UI; free hosting; CI already generated for TypeScript.
- Harder: the React/non-React boundary must be respected (React must never reconcile inside the document container); mammoth output must ALWAYS pass through DOMPurify before insertion (coding standard "never do this" rule); GitHub Pages' inability to set response headers must be honestly evidenced at Phase 3 (meta-CSP + host-shipped headers documented with curl output; no false attestation in `.claude/dast-headers.json`).
- New constraint: anchors are (paragraphIndex, startOffset, endOffset, exactText) against deterministically rendered text; changing the renderer or its version can invalidate anchors — accepted as the documented 12-month rewrite risk (Bible §4 stress test).

**Amendment (2026-08-02, Phase 2 init):** the installed stable at implementation time was React 19.2.8 (this ADR drafted "React 18.x"). No aspect of the decision or its rationale changes; exact versions are pinned in package-lock.json.
