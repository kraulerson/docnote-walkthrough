# Security Audit Findings — Feature: highlight-apply

**Feature:** highlight-apply (Feature 2 — apply highlight in ≥3 colors)
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 24 files (src/) |

Pre-commit gates additionally run gitleaks and the project DOM-sink ruleset (clean).

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | Input Validation | Selection input is validated end-to-end before becoming state: collapsed/out-of-container/cross-block ranges are rejected (`anchorFromRange` returns null); the 5,000-char selection cap is enforced inside the same function; overlap is rejected against every existing highlight. Verified by unit + flow tests. | Low | src/core/anchors.ts | Verified — no gap | Fixed |
| 2 | Sink Discipline | The highlight layer builds DOM exclusively via `document.createElement('mark')` + `insertBefore`/`appendChild` on existing TEXT nodes — no HTML-string sink anywhere. `mark.className` is derived from the typed `HighlightColor` union (three literals), and `dataset.hlId` from `crypto.randomUUID()` — no user-controlled string reaches an attribute that could break out. | Low | src/core/anchors.ts (wrapRangeInMarks) | Verified | Fixed |
| 3 | State Integrity | Concrete abuse attempt: rapid double-apply on the same selection (race on stale `toolbar.anchor`). The second apply is refused by the overlap check performed against CURRENT highlights at mouseup time, and `onColorPick` reads the committed toolbar state; the deterministic full-repaint model (DocumentView re-adopts a fresh fragment clone and repaints ALL marks per change) means no incremental-DOM corruption path exists. | Low | src/ui/App.tsx, src/ui/DocumentView.tsx | Verified by overlap flow test; full-repaint design reviewed | Fixed |
| 4 | Threat Model (TM-002 adjacency) | The toolbar mousedown `preventDefault` fix (caught by tests) keeps the selection alive across the toolbar click. Reviewed for abuse: it prevents default ONLY on the toolbar strip, not document-wide; no focus-trap or clickjack surface added. | Info | src/ui/SelectionToolbar.tsx | Verified | Fixed |
| 5 | Logging | `highlight.applied` logs color + paragraph index only — no selected text, no note content (Bible §10 rule 7 upheld). `anchors.unlocated` logs a count only. | Low | src/ui/App.tsx, src/ui/DocumentView.tsx | Verified | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant to This Feature? | Mitigation Verified? | Notes |
|-----------|--------------------------|---------------------|-------|
| TM-001 | No | N/A | — |
| TM-002 | Yes | Yes | No new HTML sinks; annotation layer is createElement-only; document text invariant proven by byte-identical test |
| TM-003 | Not yet | N/A | Highlights are in-memory this feature; storage validation lands with Feature 6 |
| TM-004 | No | N/A | — |
| TM-005 | Partially | Yes | 5,000-char selection cap bounds future stored excerpt size (enforced now at anchor creation) |
| TM-006 | Yes | Yes | Still zero network APIs (lint rule); CSP unchanged |
| TM-007 | Yes | Yes | Full-repaint per action is O(document); acceptable at MVP scale (stress-test bottleneck #1 tracks the >1,000-highlight trigger) |
| TM-008 | Not yet | N/A | No storage writes yet |
| TM-009 | Yes | Yes | No new dependencies added |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 5 |
| Accepted (with rationale) | 0 |
| Open | 0 |

**All findings resolved:** Yes
