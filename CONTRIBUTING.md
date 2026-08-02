# Contributing — DocNote (docnote-walkthrough)

This project follows the Solo Orchestrator Framework. The complete coding
standards live in `PROJECT_BIBLE.md` §10 — that section is authoritative.

## Quick reference

- **TypeScript strict.** No `any` without a `// justified:` comment.
- **Layout:** `src/core/` is framework-free logic (no React imports); `src/ui/`
  is React components; tests are co-located (`foo.test.ts` beside `foo.ts`).
- **TDD:** tests are written and verified failing before implementation.
  Build Loop steps are tracked with `scripts/process-checklist.sh`.
- **Never-do rules (review-blocking):** see Bible §10 — notably: the only
  sanctioned HTML sink is `sanitizeToFragment()` (DOMPurify); note text is
  `textContent` only; no network APIs; no `localStorage` outside
  `annotationRepository.ts`; never log document/note content.
- **Commits:** Conventional Commits (`feat:`/`fix:`/`docs:`/`test:`/`chore:`).
  `feat:` commits require a completed Build Loop (enforced by hooks).
- **Checks:** `npm run lint`, `npm test`, `npm run build` must all pass
  locally; CI runs them plus Semgrep, dependency audit, and license checks.
