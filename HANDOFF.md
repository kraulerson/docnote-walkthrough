# HANDOFF — DocNote (docnote-walkthrough)

<!-- Adapted from templates/generated/handoff.tmpl for a static client-side app.
     Written for a new maintainer with zero prior context. -->

You are taking over DocNote: a client-side web app that opens a Word `.docx`
read-only, lets the user highlight passages in three colors and attach notes,
and persists those annotations in the browser. No server, no accounts, no
network at runtime. Built with the Solo Orchestrator Framework.

## 1. What it is / where things are

| Thing | Location |
|---|---|
| Product definition | `PRODUCT_MANIFESTO.md` (§5 MVP Cutline = the 6 features) |
| Technical source of truth | `PROJECT_BIBLE.md` (architecture §3, threat model §4, data model §5, coding standards §10, test strategy §12) |
| Architecture decision | `docs/ADR documentation/ADR-0001-architecture-selection.md` |
| Feature reference | `FEATURES.md` (6 features) |
| Bug history | `BUGS.md` (31 bugs across 3 UAT sessions, all resolved) |
| Framework walkthrough log | `WALK-ISSUE-LOG.md`, `WALK-REPORT.md` (this project is also a dogfood of the framework) |

**Code layout:** `src/core/` is framework-free logic (parse, sanitize, anchors,
repository, hash, log, id, zipGuard, types); `src/ui/` is React components. The
ONLY module that touches `localStorage` is `annotationRepository.ts`; the ONLY
sanctioned HTML sink is `sanitize.ts` (DOMPurify). See Bible §10 never-do rules.

## 2. Run / build / test (clean machine)

```bash
git clone https://github.com/kraulerson/docnote-walkthrough.git
cd docnote-walkthrough
npm ci                 # exact deps from package-lock.json
npm run dev            # local dev server (Vite)
npm test               # 115 unit/component/flow tests (Vitest)
npm run lint           # ESLint 9 flat config (+security plugin)
npm run build          # tsc typecheck + Vite build → dist/ (injects prod meta-CSP)
npm run preview        # serve the production build at http://localhost:4173/
```

## 3. Deploy (GitHub Pages)

The app is a static `dist/` bundle. Production is GitHub Pages.

```bash
git tag -s vX.Y.Z && git push --tags   # release is tag-driven (.github/workflows/release.yml)
```

`vite.config.ts` sets `base: './'` and injects the production `Content-Security-Policy`
meta tag at build time. **At go-live, verify the host's response headers** with
`curl -I https://<user>.github.io/docnote-walkthrough/` and reconcile against the
web Platform Module §5.2 (GitHub Pages cannot set custom response headers, so
`frame-ancestors` cannot ship — documented residual, Bible §4).

## 4. Maintenance

- **Monthly:** `npm audit` (and `snyk test` once authenticated — see below);
  review Dependabot/updates deliberately (deps are exact-pinned on purpose).
- **Dependencies:** react, react-dom, mammoth (docx parsing), dompurify
  (sanitization) are the only 4 runtime deps. Update mammoth cautiously — the
  anchor model depends on its deterministic text extraction (Bible §4 rewrite
  risk).
- **CI:** `.github/workflows/ci.yml` runs build, lint, tests, Semgrep, npm audit,
  license check on every push. The phase-gate step runs with
  `SOIF_PHASE_GATES=warn` because branch-protection can't be verified inside
  Actions (WALK-ISSUE-LOG ISSUE-006).

## 5. Known limitations / accepted risks

- Annotations are stored **unencrypted** in localStorage (TM-005, `SECURITY.md`).
- Text-focused rendering: embedded document images are not shown (in scope).
- Main JS bundle ~724 KB (mammoth) — acceptable for a local tool (BUG-17).
- `snyk` was not authenticated during Phase 3 (attested skip); `npm audit` is the
  active dependency control and is clean. Authenticate with `snyk auth` to
  re-enable that scan.

## 6. Two-hour test (new maintainer)

To confirm this handoff works: on a clean machine, run §2, open
`src/core/__fixtures__/valid.docx` in `npm run preview`, apply a highlight, add a
note, reload the page, re-open the file, and confirm the annotation returns.
