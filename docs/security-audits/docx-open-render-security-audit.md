# Security Audit Findings — Feature: docx-open-render

**Feature:** docx-open-render (Feature 1 — open & render .docx read-only)
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 19 files (src/) |

Pre-commit gates additionally run gitleaks (clean) and the project DOM-sink ruleset (`.semgrep/soif-dom-sinks.yml`, clean).

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | Input Validation | File size is checked twice by design (defense in depth): `file.size` in the UI before reading, `buffer.byteLength` in `parseDocx` before parsing. Garbage/truncated/empty buffers land in the `invalid-docx` catch path; extracted-character cap enforced post-conversion. Verified by unit tests incl. boundary at exactly 10 MB. | Low | src/ui/App.tsx / src/core/parseDocx.ts | Verified — no gap found | Fixed |
| 2 | Threat Model (TM-007) | Decompression-bomb window: the 10 MB cap applies to the COMPRESSED file and the 5M-char cap applies AFTER conversion, so a highly-compressed hostile .docx can balloon memory during mammoth/zip inflation before either cap helps. Concrete exploit: attacker sends a 9 MB docx that inflates to ~1 GB of XML; victim's tab freezes/OOMs. Blast radius is the victim's own tab (no data loss — annotations are already persisted; no code execution). | Low (personal tool; availability-only, self-inflicted scope) | src/core/parseDocx.ts | Accepted: consistent with the threat model's accepted main-thread parse risk (TM-007). A worker + streaming-size heuristic is recorded in the Post-MVP backlog. | Accepted |
| 3 | Content Security | Embedded document images arrive from mammoth as data: URIs; DOMPurify permits `<img>`, but the production CSP (`default-src 'self'`, no `img-src`) blocks data: URIs, so embedded images will not display in the deployed app. This is a deliberate scope simplification (Manifesto: text-focused rendering), not a control gap — active content cannot ride through an unloaded image. | Info | vite.config.ts (CSP) | Accepted: matches documented scope ("images may appear as simplified blocks or placeholders"). | Accepted |
| 4 | Logging | Verified every `log()` call in the feature passes metadata only (byte counts, paragraph counts, error names, timings). No document content, file names, or text excerpts are logged (Bible §10 rule 7). | Low | src/core/parseDocx.ts, src/ui/App.tsx | Verified — rule upheld | Fixed |
| 5 | Sink Discipline | The only DOM insertion of converter output is `container.replaceChildren(sanitizedFragment)` in DocumentView; the only DOMPurify call site is `sanitizeToFragment`. No string-HTML sink (`innerHTML`/`insertAdjacentHTML`) exists anywhere in src/. Hostile-payload unit tests cover script/event-handler/javascript:/iframe/style vectors. | Low | src/ui/DocumentView.tsx, src/core/sanitize.ts | Verified — choke-point design holds | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant to This Feature? | Mitigation Verified? | Notes |
|-----------|--------------------------|---------------------|-------|
| TM-001 | No | N/A | Document identity arrives with Feature 6 |
| TM-002 | Yes | Yes | Sanitizer choke point + hostile-fixture tests + semgrep sink gate |
| TM-003 | No | N/A | No localStorage in this feature |
| TM-004 | No | N/A | — |
| TM-005 | No | N/A | Nothing persisted yet |
| TM-006 | Yes | Yes | Production meta-CSP verified present in dist/index.html; no network APIs in code (lint-enforced) |
| TM-007 | Yes | Partially — caps verified by tests; decompression window accepted (finding #2) | |
| TM-008 | No | N/A | No storage writes yet |
| TM-009 | Yes | Yes | Exact pins + committed lockfile; npm audit clean at install |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 3 |
| Accepted (with rationale) | 2 |
| Open | 0 |

**All findings resolved:** Yes
