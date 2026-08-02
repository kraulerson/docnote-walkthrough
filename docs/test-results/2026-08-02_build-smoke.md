# Production Build Smoke Test — DocNote v1.0.0 (Phase 4, production_build)

**Date:** 2026-08-02

## Build

```
npm run build   # tsc --noEmit + vite build → static dist/ (prod meta-CSP injected)
```
Result: PASS — TypeScript typecheck clean, Vite build succeeded; `dist/index.html`
contains the production Content-Security-Policy meta tag.

## Start the built artifact and verify it responds

**Local (production preview of the built dist/):**
```
npm run preview   # vite preview serving dist/ at http://localhost:4173/
curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/   # → 200
```
Verified live in Chrome: opened valid.docx → text rendered read-only → applied a
highlight → added a note → reloaded → annotations restored.

**Production (the actual v1.0.0 release, deployed by the tag-triggered workflow):**
- Release workflow run 30765794342 → success (build + deploy-pages + GitHub Release).
- Started/served by GitHub Pages at https://kraulerson.github.io/docnote-walkthrough/
  → `curl` returns **HTTP 200**; the landing page and meta-CSP are served.
- Reproducible: deployed from the annotated tag `v1.0.0`; GitHub Release created
  with `sbom.json` attached.

**Verdict: PASS** — the production build was built, started, and verified
responding both locally and on the live production URL.
