# Security Audit Findings — Feature: notes-panel-jump

**Feature:** notes-panel-jump (Feature 5 — notes side panel, document ordering, click-to-jump, unlocated state)
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 38 files (src/) |

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | Selector Injection | jumpToHighlight builds a CSS selector `mark[data-hl-id="..."]`. The id comes from `crypto.randomUUID()` (app-generated), and is additionally passed through `CSS.escape()` before interpolation — so even a hypothetical hostile id cannot break out of the attribute selector. | Low | src/ui/App.tsx (jumpToHighlight) | Verified (defensive CSS.escape) | Fixed |
| 2 | Sink Discipline | The emphasis is applied via `classList.add('hl-jump-target')` on existing marks — no HTML string sink. Note text in NotesPanel is still a React text child in both the jump-button and unlocated-span branches (auto-escaped). Confirmed no innerHTML anywhere. | Low | src/ui/NotesPanel.tsx, src/ui/App.tsx | Verified | Fixed |
| 3 | Accessibility (not color-only) | Jump emphasis = outline + animation (not color alone); the unlocated state = a text badge "⚠ unlocated" (icon + word), not a color. Consistent with Bible §14. A `forced-colors` media block keeps marks/target distinguishable in high-contrast mode (partial BUG-13 groundwork). | Info | src/styles.css | Verified | Fixed |
| 4 | State Integrity | Notes render in document order via a stable sort on (paragraphIndex, startOffset); unlocated ids come from DocumentView's re-anchor result and are reset on document open. No user-controlled ordering/DoS surface. | Low | src/ui/NotesPanel.tsx, src/ui/DocumentView.tsx | Verified | Fixed |
| 5 | Logging | note.jump logs nothing sensitive (empty detail). No note text or excerpt logged. | Low | src/ui/App.tsx | Verified | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant? | Mitigation Verified? | Notes |
|-----------|-----------|---------------------|-------|
| TM-002 | Yes | Yes | No new HTML sink; ids CSS-escaped |
| TM-003 | Yes (precursor) | Yes | Note text remains text-only in the new panel branches |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 5 |
| Accepted (with rationale) | 0 |
| Open | 0 |

**All findings resolved:** Yes
