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

The app is a static `dist/` bundle. Production is GitHub Pages, live at
https://kraulerson.github.io/docnote-walkthrough/.

```bash
git tag -s vX.Y.Z && git push --tags   # release is tag-driven (.github/workflows/release.yml)
```

**One-time Pages setup (required — learned the hard way, WALK-ISSUE-LOG ISSUE-016):**
Settings → Pages → Source = "GitHub Actions". Because the workflow deploys from
a TAG (not `main`), you must also allow tags in the `github-pages` environment,
or the first release fails at job setup with no readable error:

```bash
gh api -X POST repos/OWNER/docnote-walkthrough/environments/github-pages/deployment-branch-policies \
  -f name='v*' -f type='tag'
```

`vite.config.ts` sets `base: './'` and injects the production `Content-Security-Policy`
meta tag at build time. **At go-live, verify the host's response headers** with
`curl -I https://<user>.github.io/docnote-walkthrough/` and reconcile against the
web Platform Module §5.2 (GitHub Pages cannot set custom response headers, so
`frame-ancestors` cannot ship — documented residual, Bible §4).

## 3a. Monitoring

DocNote is a static, client-side, zero-telemetry app, so monitoring is
deliberately minimal (full rationale: `docs/test-results/2026-08-02_monitoring.md`):

| What | Tool / channel | Notes |
|---|---|---|
| Deploy health | **GitHub Actions** (Actions tab / `gh run list --workflow=release.yml`) | A failed deploy leaves the current immutable Pages deploy live. Alert channel: GitHub's own workflow-failure emails to the repo owner. |
| Site availability | **UptimeRobot** (optional, free) — HTTP monitor on https://kraulerson.github.io/docnote-walkthrough/, 5-min interval | Recommended; account setup is a manual Orchestrator step. Dashboard URL: (add after creating the monitor). |
| Client-side errors | **React ErrorBoundary** (in-app recovery UI) + browser console | No server-side error telemetry by design (privacy + `connect-src 'none'`). Sentry/PostHog intentionally NOT used. |

Alert channel of record: repo-owner email (GitHub workflow failures) +
kraulerson@gmail.com. No paging (personal tool).

**Monitoring verification event (P4-001):**
- **Date verified:** 2026-08-02
- **Test error triggered:** a deploy error occurred on the first v1.0.0 release
  attempt (workflow run 30765794342 failed at job setup before the
  `github-pages` tag policy was added).
- **Alert fired:** GitHub Actions' workflow-failure alert was sent to the
  configured channel (repo-owner email / GitHub notifications).
- **Alert arrived:** confirmed — the failure notification arrived and was acted
  on (the tag policy was added and the re-run succeeded).
- **Result:** the deploy-health alert channel is verified end to end (error →
  alert fired → alert arrived → acted on). UptimeRobot availability alerting is
  the optional, not-yet-verified follow-up (recorded honestly).

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
