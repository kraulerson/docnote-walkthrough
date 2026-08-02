# Security Audit Findings — Feature: highlight-apply-and-uat-remediation

**Feature:** highlight-apply (Feature 2) + UAT Session 1 remediation
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

> This audit covers the combined commit that lands Feature 2 together with the
> UAT Session 1 remediation. The per-feature audits it builds on remain valid:
> `docx-open-render-security-audit.md` and `highlight-apply-security-audit.md`.
> This file records the security review of the remediation changes themselves.

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 28 files (src/) |
| Semgrep (pre-commit trio) | p/owasp-top-ten + browser-sink pack + .semgrep/soif-dom-sinks.yml | Pass | Only the one confirmed-false-positive test-fixture innerHTML, suppressed with an audited `nosemgrep` (BL-185 recorded) |

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | DoS (TM-007) | BUG-1 fix: `zipGuard.uncompressedSizeExceeds` parses the ZIP central directory and rejects >50 MB advertised uncompressed BEFORE mammoth inflates. Reviewed for its own safety: bounded backward EOCD scan (≤64 KB), per-entry signature validation, fails safe (returns false) on any malformed structure so it never throws or loops. | — | src/core/zipGuard.ts | Implemented + tested (bomb fixture + unit) | Fixed |
| 2 | Info Disclosure / Tampering (TM-002/006) | BUG-6/7/16 fix: sanitizer now forbids img/video/audio/source/picture/track/link/base and strips href/target/style/class/src/srcset. Reviewed: no subresource or navigation vector survives; text content preserved; still the single choke point. Tested with beacon/link/style payloads. | — | src/core/sanitize.ts | Implemented + tested | Fixed |
| 3 | Correctness/Integrity | BUG-2/3 leaf-block selection: prevents double-counting that would corrupt the future docHash (TM-001 identity). BUG-8 zero-width guard and BUG-19 overlap-guarded updater prevent malformed/duplicate highlight state. All keep the document-text-unchanged invariant (asserted by tests). | — | src/core/anchors.ts, src/ui/App.tsx | Implemented + tested | Fixed |
| 4 | Availability/State | BUG-4 concurrent-open token: a stale parse can no longer overwrite a newer document — removes a state-confusion vector. | — | src/ui/App.tsx | Implemented + tested | Fixed |
| 5 | Logging | All new code logs metadata only (sizes, counts, error names) — no document/note/excerpt content (Bible §10 rule 7 upheld across zipGuard/parseDocx/App changes). | Low | src/core/*, src/ui/App.tsx | Verified | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant? | Mitigation Verified? | Notes |
|-----------|-----------|---------------------|-------|
| TM-002 | Yes | Yes | Sanitizer hardened; sink discipline intact |
| TM-006 | Yes | Yes | No subresource/nav vectors; still zero network APIs |
| TM-007 | Yes | Yes | Pre-inflation guard now backs the char cap (bomb rejected <1 s) |
| TM-001 | Yes (future) | Yes | Leaf-block fix protects the docHash identity for Feature 6 |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 5 |
| Accepted (with rationale) | 0 |
| Open | 0 |

**All findings resolved:** Yes
