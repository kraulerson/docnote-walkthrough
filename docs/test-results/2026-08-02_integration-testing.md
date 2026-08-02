# Integration Testing — DocNote (Phase 3, Step 3.1)

**Date:** 2026-08-02 | **Track:** Light (integration tests + manual smoke, no formal UAT tooling).

## Automated integration/flow coverage (Vitest + Testing Library, jsdom)

The full User Journey (Manifesto §3) is automated across App-level flow suites
that render the real `<App>` and exercise cross-module behavior end to end:

| Suite | Journey covered |
|---|---|
| `src/ui/App.test.tsx` | Open/render read-only; error banners; recovery |
| `src/ui/highlightFlow.test.tsx` | Select → color → mark; overlap refusal; text integrity |
| `src/ui/removeFlow.test.tsx` | Remove highlight; idempotency; text restore |
| `src/ui/notesFlow.test.tsx` + `notesRemediation.test.tsx` | Add/edit/delete note; wrong-note guard; remove-confirm |
| `src/ui/panelJumpFlow.test.tsx` | Notes panel ordering; click-to-jump; emphasis |
| `src/ui/persistenceFlow.test.tsx` | Persist + restore across remount; createdAt; unavailable degradation |
| `src/ui/openRace.test.tsx`, `hardening.test.tsx` | Concurrent-open race; error boundary; keyboard; Esc; over-cap |

**Result:** 115 tests / 20 files, all passing (`npx vitest run`).

## Live browser smoke (real Chrome, production preview)

Across UAT Sessions 1–3, the core journey was driven in a real Chrome against
`npm run preview`: open valid.docx → render (unicode + literal-markup-as-text
confirmed) → highlight (incl. the triple-click Chromium case) → add note (XSS
payload rendered inert) → reload → re-open → annotations restored. Screenshots
recorded in the UAT session submissions.

**Verdict: PASS.** The end-to-end user journey is automated and additionally
verified live in the target browser.
