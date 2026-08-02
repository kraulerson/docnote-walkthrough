# Chaos & Edge-Case Testing — DocNote (Phase 3, Step 3.3)

**Date:** 2026-08-02

| Concern | Defense | Evidence |
|---|---|---|
| Input abuse (bad/oversized/empty/bomb .docx) | 10 MB file cap, pre-inflation ZIP uncompressed-size guard (`zipGuard`), 5M-char extracted cap, try/catch → specific banners | parseDocx.test.ts, zipGuard.test.ts (incl. real bomb fixture) |
| Hostile document content | DOMPurify choke point; note text as textContent | sanitize.test.ts; UAT agent probes |
| Unicode / surrogate pairs | anchor offsets snap outward, never split a surrogate | hardening.test.ts (BUG-10) |
| Corrupt / tampered localStorage | fresh-reconstruction loader discards invalid data safely | annotationRepository.test.ts, persistenceRemediation.test.ts |
| Storage unavailable / quota | typed save failures → warnings, session-only mode | persistenceFlow.test.ts (mocked Storage) + live |
| Concurrency (rapid opens, double-apply) | generation token; overlap-guarded functional updater | openRace.test.tsx; BUG-19 test |
| Unhandled render error | React ErrorBoundary → recovery message, not blank page | hardening.test.tsx (BUG-11) |

Full suite (115 tests) green after all chaos hardening. **Verdict: PASS.**
