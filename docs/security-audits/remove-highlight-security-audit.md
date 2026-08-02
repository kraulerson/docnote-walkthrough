# Security Audit Findings — Feature: remove-highlight

**Feature:** remove-highlight (Feature 3)
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 31 files (src/) |

Pre-commit gates (gitleaks + browser-sink pack + project ruleset): clean.

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | State Integrity | Removal is a pure state filter (`removeHighlight` → `highlights.filter(id !== )`) followed by the deterministic full-repaint. Idempotent: filtering a missing id is a no-op (tested). No direct DOM mutation, so no way to desync DOM from state. | Low | src/ui/App.tsx | Verified + tested | Fixed |
| 2 | Sink Discipline | Menu detection uses `target.closest('mark[data-hl-id]')` and reads `dataset.hlId` — a value the app itself set via `crypto.randomUUID()`, never attacker-controlled. No HTML sink introduced; HighlightMenu renders text-labeled `<button>`s only. | Low | src/ui/App.tsx, src/ui/HighlightMenu.tsx | Verified | Fixed |
| 3 | Event Handling | Menu stops mouseup propagation (mirrors the toolbar) so a bubbled handler can't unmount it mid-click (caught by the flow test before commit). preventDefault is scoped to the menu strip only — no document-wide focus trap or clickjack surface. | Low | src/ui/HighlightMenu.tsx | Verified | Fixed |
| 4 | Text Integrity | Removing a highlight restores the paragraph via full repaint; the "textContent unchanged after remove" invariant is asserted by test. | Low | src/ui/DocumentView.tsx | Verified + tested | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant? | Mitigation Verified? | Notes |
|-----------|-----------|---------------------|-------|
| TM-002 | Yes | Yes | No new HTML sink; dataset id is app-generated |
| TM-003 | Not yet | N/A | No persistence until Feature 6 |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 4 |
| Accepted (with rationale) | 0 |
| Open | 0 |

**All findings resolved:** Yes
