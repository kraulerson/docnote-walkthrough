# Threat Model Validation — DocNote (Phase 3, Step 3.2)

**Date:** 2026-08-02
**Auditor persona:** Security Architect / external auditor
**Source model:** PROJECT_BIBLE.md §4 (TM-001 .. TM-009)
**Method:** for every threat vector, locate the mitigation in code, review it, and
confirm it works (test evidence or accepted-risk rationale). Per-feature audits
in `docs/security-audits/` are the working notes; this is the consolidated verdict.

| TM-ID | STRIDE | Mitigation location | Verified? | Evidence / rationale |
|---|---|---|---|---|
| **TM-001** | Spoofing | `src/core/hash.ts` (SHA-256 content identity) | **PASS** | Document identity = SHA-256 of extracted text (deterministic, client-side). "Same text → same annotations" is documented by-design (Manifesto Q2). No user identity exists to spoof. hash.test.ts covers determinism/format. |
| **TM-002** | Tampering | `src/core/sanitize.ts` (DOMPurify choke point) + `.semgrep/soif-dom-sinks.yml` | **PASS** | ALL converter output passes `sanitizeToFragment` (DOMPurify) → inert DocumentFragment; script/event-handler/javascript:/iframe/style/img/subresource/href all stripped (sanitize.test.ts). Grep confirms no `innerHTML`/`insertAdjacentHTML`/`dangerouslySetInnerHTML` in src/ (only test fixtures, suppressed with audited nosemgrep). Live-verified: a literal `<img onerror>` in a document renders as text. |
| **TM-003** | Tampering | `src/core/annotationRepository.ts` (fresh-reconstruction load) + text-only note render | **PASS** | Restore validates INTO fresh typed structures (BUG-28 fix): corrupt JSON / bad schema / non-array / invalid anchor / out-of-spec note all discarded safely (annotationRepository.test.ts + persistenceRemediation.test.ts). Note text rendered exclusively via React text child (NotesPanel) — a stored `<script>` payload renders inert (Session-3 agent probe confirmed `window.__pwned` stayed 0). |
| **TM-004** | Repudiation | — | **N/A (accepted)** | Single-user local tool; no action needs attribution to a second party. No audit trail by design — recorded so the category is addressed, not forgotten. |
| **TM-005** | Info. Disclosure | README/USER_GUIDE disclosure + 5,000-char excerpt cap | **PASS (residual accepted)** | Annotations (incl. `exactText` excerpts + note text) are stored UNENCRYPTED in the browser profile. Bounded by the 5,000-char selection cap (`MAX_SELECTION_CHARS`, enforced in anchors.ts). Disclosed to the user in USER_GUIDE.md + SECURITY.md. Encryption-at-rest rejected for MVP (needs a passphrase → violates the no-accounts hard constraint). Documented residual risk, accepted by the Orchestrator. |
| **TM-006** | Info. Disclosure | meta-CSP (`connect-src 'none'`) + zero network APIs (lint-enforced) + prefixed keys | **PASS** | Production build injects `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'">` (verified in dist/index.html). ESLint bans fetch/XHR/WebSocket/sendBeacon in app code. Repository uses only `docnote.v1.*` prefixed keys and never enumerates keys (Session-3 agent verified cross-document isolation). |
| **TM-007** | DoS | `src/core/zipGuard.ts` pre-inflation guard + `src/core/parseDocx.ts` caps | **PASS** | Decompression-bomb guard rejects >50 MB advertised uncompressed via the ZIP central directory BEFORE mammoth inflates (BUG-1 fix; measured: a 115 KB→33.6 MB bomb rejected in <1 s). Plus 10 MB file cap and 5,000,000-char extracted cap. parseDocx.test.ts covers all. Residual (main-thread parse) accepted for MVP. |
| **TM-008** | DoS | `src/core/annotationRepository.ts` (typed save failures) + App warnings | **PASS** | Writes never throw: quota → `{ok:false,reason:'quota'}` → "change could not be saved (storage full)"; unavailable → one-time session-only warning; reads on unavailable storage return null. Unit-tested (mocked Storage.prototype) + live-verified. |
| **TM-009** | Elev. of Privilege | Exact version pins + committed lockfile + CI audit | **PASS (with attested caveat)** | All deps exact-pinned; `package-lock.json` committed; `npm audit --omit=dev` = 0 vulnerabilities (CI-blocking). Minimal runtime dep count (react, react-dom, mammoth, dompurify). Snyk dependency scan is ATTEST-SKIPPED this run (CLI not authenticated in the walkthrough environment — see the Phase 3 summary attestation); npm audit is the active dependency control and is clean. |

## Summary

| Status | Count |
|---|---|
| PASS | 7 |
| N/A (accepted, documented) | 1 (TM-004) |
| PASS with residual/attested caveat | TM-005 (residual accepted), TM-009 (snyk attest-skipped; npm audit clean) |
| Unmitigated / open | 0 |

**Every threat vector has a verified mitigation or a documented, accepted risk. No threat vector is left unmitigated. Cleared for the Phase 3 → 4 gate.**
