# Security Review — DocNote (docnote-walkthrough) — v1

**Reviewer role:** SVP, IT Security (AppSec / infrastructure / compliance / risk)
**Assessment type:** Read-only, full-codebase security review (no code executed, no builds run, no files modified)
**Scope of application:** DocNote — a fully client-side React/TypeScript read-only `.docx` viewer with text highlights and highlight-attached notes. No server, no accounts, no network at runtime; persistence is browser `localStorage`. Intended deployment: static host (GitHub Pages).
**Date:** 2026-08-02
**Method:** Every finding below is grounded in a real `file:line`. I read all of `src/`, the build/CI/release configuration, the threat model (`PROJECT_BIBLE.md` §4) and its validation (`docs/test-results/2026-08-02_threat-model-validation.md`), and the shipped `dist/index.html`.

---

## 1. Security Executive Summary

DocNote is a small, disciplined, defense-in-depth client-side application whose security posture is materially stronger than typical for a hobby/personal project — a direct result of the 31-bug UAT remediation program that already closed a SEV-1 decompression bomb and stored-XSS classes. The two highest-risk surfaces (untrusted `.docx` content and tamperable `localStorage`) are both routed through single, well-designed choke points: all converter output passes through one DOMPurify sanitizer that returns an inert `DocumentFragment` (`src/core/sanitize.ts`), and all persisted data is reconstructed into fresh typed objects on load rather than being trusted (`src/core/annotationRepository.ts`). Cross-site scripting — the dominant threat for this design — is credibly mitigated at multiple layers (sanitizer + `textContent`-only note rendering + a project-owned Semgrep DOM-sink gate in pre-commit and CI + a `connect-src 'none'` CSP as exfil backstop). Dependency hygiene is genuinely good: four exactly-pinned runtime dependencies, a committed lockfile, blocking `npm audit`, lockfile-signature verification, an SBOM, and SHA-pinned GitHub Actions. The project is honest about its residual risks (unencrypted data at rest, main-thread parsing, meta-CSP's inability to set `frame-ancestors`), which is itself a strong governance signal. I found **one new, previously-unenumerated residual gap** — the decompression-bomb guard trusts the ZIP central directory's *advertised* uncompressed sizes and can be evaded by a ZIP that under-reports them — plus a handful of informational items. **For its stated personal/local, single-user scope, this application is acceptable.** It is **not** acceptable, and was never designed, for regulated-data (PHI/PCI/cardholder) or multi-user enterprise use.

---

## 2. Threat Model Summary — Top 5 Threats

The project ships its own STRIDE threat model (`PROJECT_BIBLE.md` §4, TM-001..TM-009) and a validation table (`docs/test-results/2026-08-02_threat-model-validation.md`). I independently confirmed the mitigations in code. The top 5 threats this project introduces or must mitigate:

| # | Threat | Actor | Status in this codebase |
|---|---|---|---|
| T1 | **Malicious `.docx` → active HTML → XSS in the app origin** (`<img onerror>`, `javascript:` href, embedded `<script>/<style>`). | Author of a crafted document emailed to the victim. | **Mitigated (strong).** Single DOMPurify choke point (`sanitize.ts:45`), inert `DocumentFragment` inserted without re-serialization (`DocumentView.tsx:35`), no `innerHTML`-class sinks in `src/` (verified by grep + `.semgrep/soif-dom-sinks.yml`). |
| T2 | **Decompression bomb → tab freeze / OOM (DoS).** | Crafted-document author. | **Mitigated with a new residual (see F-1).** Pre-inflation ZIP central-directory guard (`zipGuard.ts`) + 10 MB compressed cap + 5,000,000-char extracted cap (`parseDocx.ts`). The guard trusts *advertised* sizes and can be evaded. |
| T3 | **Tampered `localStorage` → stored XSS or crash on restore.** | Co-user of the browser profile, or a malicious browser extension. | **Mitigated (strong).** Load reconstructs into fresh typed structures (`annotationRepository.ts:63-159`); note text rendered via React text child only (`NotesPanel.tsx:53-57`); no `eval`/merge of parsed graph → no prototype pollution. |
| T4 | **Confidential data disclosure from unencrypted local store.** | Anyone with access to the unlocked machine / browser profile. | **Accepted residual (TM-005), honestly disclosed** in `SECURITY.md` and `USER_GUIDE`. Bounded by the 5,000-char excerpt cap. No encryption at rest (would require a passphrase → conflicts with the no-accounts constraint). |
| T5 | **Supply-chain compromise → malicious code runs in-origin, reads store.** | Compromised npm dependency / compromised host. | **Mitigated (strong for scope).** Exact pins, committed lockfile, blocking `npm audit --omit=dev`, `npm audit signatures`, SBOM, SHA-pinned actions; `connect-src 'none'` CSP blocks runtime exfil even if code executed. |

---

## 3. Phase 2 — Category-by-Category Assessment

### 3.1 Attack Surface Analysis
- **Finding.** The complete runtime attack surface is two untrusted inputs: (a) the `.docx` file the user chooses to open — read as an `ArrayBuffer` (`App.tsx:63`) and fed to `parseDocx` (`parseDocx.ts:31`); and (b) the contents of `localStorage` keys `docnote.v1.annotations.<docHash>`, read on document open (`App.tsx:77` → `annotationRepository.ts:34`). There are **no** other entry points: no network APIs anywhere in app code (grep for `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` → none in `src/`), no CLI arguments, no webhooks, no server, no third-party runtime integrations. Network exposure at runtime is zero; the only network activity is at build/CI time (npm, GitHub Actions). The `accept=".docx"` on the file input (`App.tsx:362`) is a UX hint, **not** a security control — the real validation is the parse pipeline. The repository exposes only `load(docHash)`/`save(store)` and **never enumerates keys** (verified: no `localStorage.key`/`.length` in production `src/`), so there is no cross-document read path.
- **Threat model.** Crafted-document author (T1/T2); co-user/extension editing `localStorage` (T3).
- **Severity.** Informational (surface is minimal and appropriate).
- **Exploitability.** N/A — this is a scoping finding.
- **Remediation.** None required; the minimum surface required for the feature set is exactly what is present.

### 3.2 Authentication and Authorization
- **Finding.** There is no authentication or authorization, by design (`PROJECT_BIBLE.md` §7: "N/A — hard constraint: no accounts, no server"). The only "identity" is *document identity*: a SHA-256 hex of extracted text (`hash.ts`). There are no sessions, tokens, cookies, default credentials, or bypasses to find. The single-user, local-only model makes this appropriate.
- **Threat model.** Not applicable — no principal to spoof (TM-001 residual: two documents with identical extracted text share annotations; by design, disclosed).
- **Severity.** N/A / Informational.
- **Exploitability.** N/A.
- **Remediation.** None. Absence of auth is correct for a local single-user tool. (This becomes a *hard stop* only if the tool is repurposed for multi-user or regulated data — see §7.)

### 3.3 Input Validation and Injection
- **Finding.** Input validation is layered and thorough. Documents: size cap (`parseDocx.ts:38`), decompression-bomb guard (`parseDocx.ts:46`), extracted-char cap (`parseDocx.ts:86`), empty-document rejection (`parseDocx.ts:82`), and full sanitization of converter output (`parseDocx.ts:73`). Selections: length cap and surrogate-pair-safe anchoring (`anchors.ts:96-104`). Notes: 1..1000-char trimmed validation (`NoteEditor.tsx:21-27`) enforced again on load (`annotationRepository.ts:150-152`). Stored data: full type/shape/version reconstruction (`annotationRepository.ts:63-159`). **XSS:** neutralized via DOMPurify (`sanitize.ts`) and React text-child rendering of note/excerpt text (`NotesPanel.tsx:48-57`). **Selector injection:** the one place stored `id` reaches a DOM query uses `CSS.escape` (`App.tsx:284,294`) — correct. **No SQL/command/path/SSRF vectors exist** (no DB, no shell, no filesystem writes, no network). No `eval`/`new Function` (grep → none).
- **Threat model.** T1 (document-borne XSS), T3 (store-borne XSS/crash).
- **Severity.** Informational (well-controlled).
- **Exploitability.** Low — every documented sink is closed; a regression would require adding a new raw HTML sink, which the Semgrep gate is designed to catch.
- **Remediation.** Maintain the invariant. Keep the Semgrep DOM-sink rule (`.semgrep/soif-dom-sinks.yml`) and the "only sanctioned sink" rule (Bible §10) in force on every change.

### 3.4 Data Protection
- **Finding.** Data at rest is **unencrypted** in `localStorage` (`annotationRepository.ts:25`): highlight excerpts (`exactText`) and note text are stored in cleartext, readable by anyone with the browser profile. This is an explicitly accepted residual (TM-005) — encryption-at-rest was rejected for MVP because it would require a passphrase, violating the no-accounts hard constraint — and it is honestly disclosed in `SECURITY.md:35-41` and the user guide. Data in transit: N/A (never transmitted; `connect-src 'none'`). Cryptography: SHA-256 via Web Crypto (`hash.ts:8`) is used only for content *identity*, not secrecy — an appropriate, correct use. No secrets/keys exist to manage. Data classification: everything stored is "Internal" (Bible §5). Retention/purging: in-app highlight/note removal deletes data; there is no bulk-purge UI (out of scope). `id` generation degrades safely on non-secure origins (`id.ts`) and is explicitly *not* used as a security identifier.
- **Threat model.** T4 — physical/local access to an unlocked machine reads stored excerpts and candid notes.
- **Severity.** Medium **in an absolute sense**, but **Low/Accepted for the stated personal-local scope**.
- **Exploitability.** Requires local access to the victim's browser profile (no remote path; `connect-src 'none'` blocks exfil).
- **Remediation.** None required for the stated scope. If the tool ever handles sensitive/regulated data, encryption at rest with a user-supplied passphrase (WebCrypto AES-GCM + PBKDF2/Argon2 KDF) becomes mandatory — a scope change, not a bug fix.

### 3.5 Secrets and Credential Hygiene
- **Finding.** No hardcoded secrets, API keys, tokens, or passwords exist — consistent with a no-network, no-account app. `.gitignore` (`.gitignore`) blocks `.env*`, `*.pem/*.key/*.p12/*.jks/*.pfx`, `credentials.json`, `service-account.json`, `.npmrc`, and terraform tfvars, and CI runs **gitleaks** over full history (`ci.yml:36-46`) as a mechanical backstop. There is nothing to leak at runtime.
- **Threat model.** Accidental secret commit (mitigated by gitignore + gitleaks).
- **Severity.** Informational.
- **Exploitability.** N/A.
- **Remediation.** None.

### 3.6 Dependency and Supply Chain Security
- **Finding.** Four exactly-pinned runtime deps — `dompurify 3.4.12`, `mammoth 1.12.0`, `react 19.2.8`, `react-dom 19.2.8` (`package.json:15-20`) — all current, no `^`/`~` ranges. `package-lock.json` is committed. CI enforces: blocking `npm audit --omit=dev --audit-level=high` on shipped deps (`ci.yml:48-54`), a loud non-blocking dev-toolchain audit (`ci.yml:56-58`), a copyleft-license check (`ci.yml:60-62`), and `npm audit signatures` for lockfile/registry-signature integrity (`ci.yml:64-65`). GitHub Actions are pinned by commit SHA (`ci.yml:15,19`; `release.yml:23,25,106`). An SBOM is generated at release via CycloneDX (`release.yml:35-36`) and one is committed (`sbom.json`). **Honest caveat, already disclosed:** Snyk is ATTEST-SKIPPED because the CLI is unauthenticated in the walkthrough environment (threat-model-validation TM-009); `npm audit` is the active, clean control. The SAST scanner image floats `semgrep/semgrep:latest` deliberately (`ci.yml:162-163`) — a conscious trade (fresh rules vs. reproducibility), logged via `--version`.
- **Threat model.** T5 — malicious dependency patch pulled during an update.
- **Severity.** Low (strong controls for a project this size).
- **Exploitability.** Low; updates are deliberate (never auto), and `connect-src 'none'` blocks runtime exfil even after a hypothetical compromise.
- **Remediation.** Re-enable an authenticated Snyk (or `osv-scanner`) run in a real deployment to cover advisories `npm audit` misses. Consider pinning the Semgrep image by digest if reproducibility of the security gate is later required.

### 3.7 Error Handling and Information Leakage
- **Finding.** User-facing errors are fixed, generic messages (`errors.ts:10-17`) — no stack traces, file paths, versions, or internal detail reach the UI. Unexpected (non-`DocNoteError`) errors log only `error.name`, never content or stack (`App.tsx:101-105`). The `ErrorBoundary` shows a recovery banner and logs only `error.name` (`ErrorBoundary.tsx:24-27,29-45`). Parse failures are caught and mapped to a specific banner (`parseDocx.ts:65-71`). No debug/verbose production mode leaks data. No source maps are shipped in `dist/` (only `index-*.js`/`.css`).
- **Threat model.** Information disclosure via error output.
- **Severity.** Informational (well-handled).
- **Exploitability.** N/A.
- **Remediation.** None.

### 3.8 Logging and Audit Trail
- **Finding.** Structured console logging (`log.ts`) emits `{ts, level, sessionId, event, detail}` with a per-page-load random `sessionId` correlation id. The privacy rule is enforced in practice: `detail` carries only metadata (byte counts, char counts, paragraph counts, timings, error names) — never document content, note text, or excerpts (verified across `parseDocx.ts:91-97`, `App.tsx:212,222,252,272,297`, `annotationRepository.ts:29,48,58`). There is **no audit trail** (no attribution of actions), which is correct and accepted for a single-user local tool (TM-004). Logs are console-only, not persisted or transmitted, so log-tampering and log-exfil are N/A. **Note:** a co-user with DevTools open can see operational metadata (counts/timing) but no content.
- **Threat model.** Sensitive data in logs (mitigated); absence of audit trail (accepted by design).
- **Severity.** Informational for scope. (In a regulated/multi-user context, the *absence* of an audit trail would be a High compliance gap — see §5/§7.)
- **Exploitability.** N/A.
- **Remediation.** None for scope.

### 3.9 Compliance Framework Compatibility
Assessed honestly against the architecture. See the table in §5. In short: because there is no server, no account, no audit trail, no key management, and unencrypted local storage, this application is **not a candidate for a cardholder-data environment (PCI), a PHI-handling service (HIPAA), a SOC 2 control-evidence system, a SOX-relevant financial system, or a FedRAMP-authorized boundary.** None of these were design goals; the tool is a personal reader. It should not be introduced into any of those environments to view regulated documents, because doing so would persist unencrypted excerpts of regulated content with no access control beyond the OS/browser profile and no audit trail.

### 3.10 OWASP Top 10 Coverage
Full table in §6. Headline: **A03 Injection/XSS — the dominant risk for this design — is well mitigated.** A02 (unencrypted at rest) and A09 (no audit trail) are the two categories that are *by-design accepted* for the personal scope and would fail in a regulated context.

### 3.11 Client-Side Security
- **Finding.** Sensitive data **is** stored in `localStorage` **unencrypted** (`annotationRepository.ts:25`) — the accepted TM-005 residual. There are **no** exposed API keys/tokens/secrets in client code or source maps (none exist; no maps shipped). The CSP is genuinely restrictive: production `dist/index.html` carries `default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'` (verified in `dist/index.html`, injected by `vite.config.ts:9-24`). No inline styles or `style=` attributes in production `src/` (verified), so `default-src 'self'` (no `'unsafe-inline'`) is not undermined; app CSS/JS load as same-origin bundles. No third-party scripts are loaded, so SRI is not applicable (a compromise of the static host itself is out of CSP's reach — noted). All input validation lives client-side **and that is architecturally correct here** because there is no server tier to duplicate it into — the trust boundary is the browser origin, not a client/server split.
- **Threat model.** T3 (store tampering), T4 (local disclosure), clickjacking (see below).
- **Severity.** Medium residual (unencrypted store + meta-CSP limits), Low/Accepted for scope.
- **Exploitability.** Local for the store; remote clickjacking is bounded by content being inert.
- **Remediation.** Serve `frame-ancestors 'none'` via a real response header (see F-2). For sensitive use, encrypt the store (see §3.4).

### 3.12 Session and Authentication Security
- **Finding.** N/A across the board — no sessions, tokens, login, password reset, MFA, lockout, or rate limiting exist because there is no authentication (Bible §7). There is therefore no session fixation, no token storage/transmission risk, and no brute-force surface. For a local single-user tool this is the correct design, not a gap.
- **Severity.** N/A.
- **Remediation.** None (unless repurposed — see §7).

---

## 4. NEW Findings (beyond the already-documented residuals)

The project already fixed 31 UAT bugs (incl. the SEV-1 zip bomb and stored-XSS defenses) and honestly records residuals for TM-005 (unencrypted at rest), TM-007 (main-thread parse), and platform CSP limits. The following are the **new** items I surfaced.

### F-1 — Decompression-bomb guard trusts *advertised* ZIP sizes (evadable)
- **Finding.** `uncompressedSizeExceeds` (`zipGuard.ts:24-47`) sums the **advertised** uncompressed size of each entry, read from the ZIP central directory at `offset + 24` (`zipGuard.ts:37`), and rejects when the sum exceeds 50 MB (`MAX_UNCOMPRESSED_BYTES`, `types.ts:51`). This is a *heuristic pre-filter*: it trusts numbers the attacker controls. A ZIP whose central directory **under-reports** the uncompressed size (e.g., advertises a few KB per entry) passes the guard, after which `mammoth`/JSZip inflates the **actual** DEFLATE stream regardless of the advertised figure. The 10 MB compressed cap (`parseDocx.ts:38`) bounds the input, but DEFLATE's ~1032:1 worst-case ratio means up to multiple GB can still materialize on the **main thread** (TM-007's accepted worker-deferral compounds this). The published validation only measured an *honest* bomb ("115 KB→33.6 MB rejected in <1 s", threat-model-validation TM-007), so this evasion path is not currently enumerated.
  - Sub-note: the read is a 32-bit field (`getUint32`). A genuine ZIP64 entry >4 GB stores the `0xFFFFFFFF` sentinel there, which the guard sums as ~4.29 GB and rejects (safe-by-accident); the guard never parses the ZIP64 extra field, so it is purely a size heuristic, not a ZIP64-aware parser.
- **Threat model.** Crafted-document author hands the victim a mismatched-central-directory `.docx`; the victim opens it and their own tab freezes/OOMs. **This is self-inflicted DoS** (the victim chose the file), recoverable by closing the tab; no origin compromise, no data loss (store writes are unaffected).
- **Severity.** **Low** (Medium exploitability × Low impact, given the local single-user scope and the 10 MB compressed bound).
- **Exploitability.** Moderate — requires crafting a ZIP with a deliberately inconsistent central directory; well within a competent attacker's ability, but the payoff is only a recoverable local freeze.
- **Remediation.** Move parsing to a Web Worker (already a recorded TM-007 deferral) so a bomb cannot freeze the UI thread, and/or enforce a hard *inflated-output* byte budget during/after decompression (cap total bytes JSZip is allowed to produce) rather than trusting advertised sizes. At minimum, update the threat-model-validation to record this evasion path so the control's true guarantee is not overstated.

### F-2 — `frame-ancestors` cannot be delivered via meta-CSP (clickjacking residual)
- **Finding.** The CSP is delivered via `<meta http-equiv>` because GitHub Pages cannot set response headers (`vite.config.ts:6-8`; disclosed in Bible §4 platform note). `frame-ancestors` and `X-Frame-Options` are **header-only** directives — a `<meta>` CSP silently cannot set them — so the deployed app has no framing protection and could be embedded in a hostile iframe.
- **Threat model.** Clickjacking / UI-redress of an embedded DocNote. Impact is limited because rendered document content is inert (no forms/links/scripts survive sanitization), so there is little sensitive action to redress; the main lever would be tricking a user into a highlight/note action.
- **Severity.** Low (Informational-to-Low; honestly disclosed as a residual, but worth an explicit auditor callout).
- **Exploitability.** Low.
- **Remediation.** If a host that supports response headers is used (Cloudflare Pages, Netlify `_headers`, S3+CloudFront, nginx), serve `Content-Security-Policy: frame-ancestors 'none'` (and ideally the whole CSP) as a real header. Otherwise accept and keep documenting the residual.

### F-3 — Stored `id` has no format/uniqueness validation on load (non-security)
- **Finding.** `reconstructHighlight` accepts any `string` for `id` (`annotationRepository.ts:92`) with no length/format/uniqueness check. A tampered store could carry duplicate or oversized ids.
- **Threat model.** Not an XSS vector — the id reaches the DOM only as a `data-hlId` dataset value (`anchors.ts:190`, attribute assignment, not HTML) and as a `CSS.escape`-wrapped selector (`App.tsx:284,294`). Worst case is jump ambiguity or a slightly larger store.
- **Severity.** Informational.
- **Exploitability.** N/A (cosmetic).
- **Remediation.** Optional: validate id shape (e.g., non-empty, bounded length) on load; de-duplicate ids.

### F-4 — Production console logging is verbose metadata (acceptable)
- **Finding.** `info`-level events (parse success, highlight applied, note saved) log operational metadata to the console in production (`log.ts:54`). No content is included (privacy rule verified in §3.8).
- **Severity.** Informational.
- **Remediation.** None required; optionally gate `debug`/`info` behind a build flag to keep the production console clean.

---

## 5. Security Controls Matrix

| Control | Where | Classification |
|---|---|---|
| HTML sanitization of converter output (DOMPurify, inert fragment) | `sanitize.ts:45`; used at `parseDocx.ts:73`, inserted `DocumentView.tsx:35` | **Enforced** |
| Note/excerpt rendered as text, never HTML | `NotesPanel.tsx:48-57`, `NoteEditor.tsx` (textarea value) | **Enforced** |
| Semgrep DOM-sink SAST gate (pre-commit + CI, ERROR severity) | `.semgrep/soif-dom-sinks.yml`; `ci.yml:159-171` | **Enforced** |
| No raw HTML sinks / no `eval` in app code | verified by grep across `src/` | **Enforced** |
| Decompression-bomb pre-inflation guard | `zipGuard.ts`; `parseDocx.ts:46` | **Partially Enforced** (heuristic; evadable — F-1) |
| File size cap (10 MB) | `App.tsx:56`, `parseDocx.ts:38` | **Enforced** |
| Extracted-char cap (5,000,000) + empty-doc rejection | `parseDocx.ts:82,86` | **Enforced** |
| Selection length cap + surrogate-safe anchoring | `anchors.ts:96-104` | **Enforced** |
| Stored-data schema reconstruction (fail-safe discard) | `annotationRepository.ts:63-159` | **Enforced** |
| Prototype-pollution avoidance (fresh objects, no merge) | `annotationRepository.ts:63-159` | **Enforced** |
| `docHash`/schemaVersion validation on load | `annotationRepository.ts:68` | **Enforced** |
| `localStorage` access confined to one module; no key enumeration | `annotationRepository.ts` (only writer); verified no `key()`/`length` in prod src | **Enforced** |
| Selector-injection safety (`CSS.escape`) | `App.tsx:284,294` | **Enforced** |
| Content-Security-Policy (`connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`) | `vite.config.ts:9-24`; verified in `dist/index.html` | **Enforced** (meta-CSP limits — F-2) |
| `frame-ancestors` / anti-clickjacking | not deliverable via meta on GitHub Pages | **Not Present** (residual — F-2) |
| No network APIs in app code (ESLint-enforced + CSP) | Bible §10 rule 4; verified by grep | **Enforced** |
| Graceful storage failure (quota/unavailable, never throws) | `annotationRepository.ts:17-32`, `App.tsx:341-352` | **Enforced** |
| ErrorBoundary + generic user errors (no stack/PII) | `ErrorBoundary.tsx`, `errors.ts`, `App.tsx:101-105` | **Enforced** |
| Privacy-preserving logging (metadata only) | `log.ts`; call sites verified | **Enforced** |
| Dependency pinning + committed lockfile | `package.json:15-20`, `package-lock.json` | **Enforced** |
| Blocking `npm audit` (shipped deps) | `ci.yml:48-54` | **Enforced** |
| Lockfile/registry signature check | `ci.yml:64-65` | **Enforced** |
| Secret scanning (gitleaks, full history) | `ci.yml:36-46` | **Enforced** |
| SHA-pinned GitHub Actions | `ci.yml:15,19`; `release.yml:23,25,106` | **Enforced** |
| SBOM generation | `release.yml:35-36`; `sbom.json` | **Enforced** |
| DAST (OWASP ZAP baseline, Medium+ gate) | `release.yml:50-103` | **Advisory** (runs only if `PREVIEW_URL` set) |
| Snyk dependency scan | threat-model-validation TM-009 | **Not Present this run** (attest-skipped; `npm audit` covers) |
| Encryption at rest | — | **Not Present** (accepted residual TM-005) |
| Authentication / authorization / sessions | — | **Not Present** (N/A by design) |
| Audit trail | — | **Not Present** (N/A by design, TM-004) |
| Web Worker parse isolation | — | **Not Present** (accepted residual TM-007; compounds F-1) |

---

## 6. OWASP Top 10 (2021) Assessment

| Category | Verdict | Basis |
|---|---|---|
| A01 Broken Access Control | **N/A / Pass** | No server, no multi-user; same-origin + browser profile is the boundary; repository never enumerates keys (`annotationRepository.ts`). |
| A02 Cryptographic Failures | **Partial (accepted)** | Data at rest unencrypted (`annotationRepository.ts:25`, TM-005, disclosed). SHA-256 used only for identity, appropriately. No secrets to protect. |
| A03 Injection (incl. XSS) | **Pass** | DOMPurify choke point (`sanitize.ts`), text-only note render (`NotesPanel.tsx`), no raw sinks, Semgrep gate (`.semgrep/soif-dom-sinks.yml`), `CSS.escape` on selectors. |
| A04 Insecure Design | **Pass (one residual)** | Documented STRIDE threat model, defense-in-depth, fail-safe discard. Residual: zipGuard's advertised-size trust (F-1). |
| A05 Security Misconfiguration | **Partial** | Restrictive CSP present and verified; no debug leakage; residual: `frame-ancestors` undeliverable via meta (F-2). |
| A06 Vulnerable & Outdated Components | **Pass** | Exact pins, lockfile, blocking `npm audit`, current versions; Snyk attest-skipped (noted). |
| A07 Identification & Auth Failures | **N/A** | No authentication by design (appropriate). |
| A08 Software & Data Integrity Failures | **Pass** | `npm audit signatures`, SBOM, SHA-pinned actions; stored-data tampering → safe discard, never code execution. |
| A09 Security Logging & Monitoring Failures | **N/A for scope / Partial** | Metadata-only console logging; no audit trail (accepted TM-004). Would fail in a regulated/multi-user context. |
| A10 Server-Side Request Forgery | **N/A** | No server; `connect-src 'none'`; no outbound requests. |

---

## 7. Hard Stops — conditions under which DocNote MUST NOT be used

1. **Do not use it to view or annotate regulated data** — PHI (HIPAA), cardholder data (PCI-DSS), or comparable — because highlight excerpts and notes persist **unencrypted** in `localStorage` with no access control beyond the OS/browser profile and no audit trail.
2. **Do not use it on a shared or multi-user machine for confidential documents.** Any co-user of the browser profile (or a malicious extension) can read the stored excerpts/notes (TM-005). This is explicitly warned in `SECURITY.md:35-41`.
3. **Do not embed or deploy it as an employee-/customer-facing enterprise application** expecting enterprise controls — there is (by design) no authentication, authorization, session management, audit trail, or key management, and none can be bolted on without a fundamental re-architecture.
4. **Do not deploy it where clickjacking protection is contractually required** without moving to a host that can serve `frame-ancestors` as a real response header (F-2).
5. **Do not treat the decompression-bomb guard as a hard boundary** for hostile-file intake at scale until parsing is moved off the main thread and an inflated-output budget is enforced (F-1).

---

## 8. Minimum Viable Security — before any sensitive-data use

If the stated scope ever expands toward sensitive or shared use, the following are prerequisites (each is a scope change, not a routine fix):
1. **Encryption at rest** for the annotation store — WebCrypto AES-GCM with a user-supplied passphrase (Argon2/PBKDF2 KDF). Resolves the TM-005 residual but conflicts with the current no-passphrase constraint.
2. **Parse isolation** — move `parseDocx`/mammoth into a Web Worker and enforce an inflated-output byte budget, closing F-1 and the TM-007 main-thread residual.
3. **Real security headers** — serve the full CSP plus `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy` via response headers on a header-capable host (closes F-2).
4. **Authenticated dependency scanning** — re-enable Snyk/OSV in CI (closes the TM-009 attest-skip).
5. **Audit trail + access control** — only if repurposed for multi-user/regulated use (A01/A09/HIPAA/SOC 2). This is effectively a different product.

---

## 9. Compliance Gap Analysis

| Framework | Ready? | Key gaps (mechanical, not intent) |
|---|---|---|
| **PCI-DSS** | **No** | Not a cardholder-data-environment candidate: unencrypted storage of any captured excerpts, no access control, no audit trail, no key management, no network segmentation concept. Should never touch cardholder data. |
| **HIPAA** | **No** | Fails technical safeguards for PHI: no encryption at rest, no access controls beyond OS profile, no audit controls (§164.312), no integrity/attribution of edits. Must not process PHI. |
| **SOC 2** | **No (as a control-evidence system)** | Produces no auditable evidence: no logging that persists, no change/access records, no auth. (The *development* governance — CI gates, approval log, SBOM — is strong, but the running app yields no SOC 2 control evidence.) |
| **SOX** | **No** | No separation-of-duties, no immutable audit trail, no integrity controls over stored data suitable for financial records. |
| **FedRAMP** | **No** | Out of scope by construction: no boundary controls, no continuous monitoring, no audit logging, no encryption at rest, no identity management. |

**Interpretation:** These "No"s are not defects — they reflect that DocNote is a personal, local, no-server reader, which no compliance regime targets. The gap analysis exists to prevent anyone from mistakenly deploying it into a regulated boundary.

---

## 10. Overall Security Rating

### **Conditionally Approved — for its stated personal/local, single-user, non-regulated scope only.**

**Justification.** Within the boundary the project actually claims (a client-side, no-network, single-user `.docx` reader on a personal machine), the security engineering is genuinely good and, in the areas that matter most for this design (XSS, stored-data tampering, supply chain), materially exceeds the norm. The dominant threat — document-borne and store-borne XSS — is mitigated with real, layered, mechanically-enforced controls (DOMPurify choke point, text-only rendering, Semgrep gate, `connect-src 'none'` backstop, verified in `dist/`), not security theater. The prior remediation of a SEV-1 zip bomb and the stored-XSS classes holds up under inspection. The project is also unusually honest about its residual risks, which an auditor rewards.

The single "conditional" qualifier rests on: (a) the new F-1 residual (advertised-size trust in the decompression guard, evadable to a recoverable local DoS — Low), and (b) the honest but real meta-CSP `frame-ancestors` gap (F-2 — Low). Neither undermines the core XSS/exfil posture, and both have clear remediations. **I would sign off on this for personal/local use as-is.** I would **fail** it in an audit and **withhold approval** the moment it is proposed for regulated-data, multi-user, or customer-facing enterprise deployment — see the Hard Stops (§7) — because the absence of encryption at rest, authentication, and an audit trail (all by design) makes it structurally unfit for those environments.

---

*Prepared read-only. No project files were modified; no code was executed, built, or exploited. Findings cite `file:line` from the reviewed tree at `/Users/karl/Documents/Claude Projects/test-walk/docnote-walkthrough`.*
