# Security Audit Findings — Feature: local-persistence

**Feature:** local-persistence (Feature 6 — per-document localStorage persistence)
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 43 files (src/) |

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | Tampering (TM-003) | The restore path validates strictly before trusting stored data: JSON.parse in try/catch, `schemaVersion === 1`, matching docHash, `highlights` is an array, and every highlight/anchor is shape-checked; anything off → return null (safe discard, no throw). Corrupt-JSON, unknown-version, and non-array-highlights cases are unit-tested. A planted `<script>` in a stored note is still only ever rendered as text (NotesPanel), so tampered storage cannot inject markup. | Low | src/core/annotationRepository.ts | Verified + tested | Fixed |
| 2 | Isolation (TM-006) | The repository exposes only load(docHash)/save(store); it never enumerates keys and always uses the `docnote.v1.annotations.<hash>` prefix, bounding blast radius on the shared github.io origin. It is the ONLY module that references localStorage (grep-verified), honoring Bible §10 rule 5. | Low | src/core/annotationRepository.ts | Verified | Fixed |
| 3 | DoS / Availability (TM-008) | Writes never throw: quota → `{ok:false, reason:'quota'}` → the app warns "change could not be saved (storage full)"; unavailable/disabled storage → `{ok:false, reason:'unavailable'}` → a one-time session-only warning; reads on unavailable storage return null. All three paths are tested (mocked Storage.prototype) and the unavailable path was live-verified. | Low | src/core/annotationRepository.ts, src/ui/App.tsx | Verified + tested | Fixed |
| 4 | Info Disclosure (TM-005) | Confirmed residual (already documented, accepted): stored highlights carry `exactText` excerpts + note text, unencrypted in the browser profile. Bounded by the 5,000-char selection cap; disclosed in README/USER_GUIDE; encryption-at-rest rejected for MVP (needs a passphrase → violates no-accounts). No NEW disclosure beyond the documented risk. | Low (accepted) | src/core/annotationRepository.ts | Accepted (documented residual) | Accepted |
| 5 | Identity (TM-001) | docHash = SHA-256 of extracted text via Web Crypto (hash.ts). Deterministic, client-side. Web-Crypto-unavailable (non-secure origin) is caught → session-only mode, not a crash (addresses the shape of deferred BUG-12 for the persistence path). | Low | src/core/hash.ts, src/ui/App.tsx | Verified | Fixed |
| 6 | Logging | storage.save_failed / storage.corrupt log only a reason code; note/excerpt content is never logged (Bible §10 rule 7). | Low | src/core/annotationRepository.ts | Verified | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant? | Mitigation Verified? | Notes |
|-----------|-----------|---------------------|-------|
| TM-001 | Yes | Yes | Content-hash identity implemented |
| TM-003 | Yes | Yes | Strict load validation + safe discard; text-only note rendering |
| TM-005 | Yes | Accepted | Unencrypted at rest — documented residual, bounded excerpt size |
| TM-006 | Yes | Yes | Prefixed keys, no enumeration, single access module |
| TM-008 | Yes | Yes | Quota + unavailable handled gracefully (tested + live) |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 5 |
| Accepted (with rationale) | 1 |
| Open | 0 |

**All findings resolved:** Yes
