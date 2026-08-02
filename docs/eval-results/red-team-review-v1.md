# Red Team / Offensive Security Review — DocNote (v1)

**Assessment type:** White-box, static + targeted dynamic (unit-level PoC).
**Target:** DocNote — fully client-side React/TS read-only `.docx` viewer. No server, no auth, no network egress. Persistence via `localStorage`.
**Reviewer persona:** Senior Red Team Engineer / Offensive Security.
**Date:** 2026-08-02.
**Scope note:** Threat model is a *personal, client-side* document viewer whose #1 threat (TM-002) is a hostile `.docx` reaching the DOM, and a secondary threat (TM-003) of tampered `localStorage`. Findings are rated against that context, not a banking-platform standard. Three prior UAT sessions fixed 31 bugs; this review deliberately hunts for something the prior sweeps missed rather than re-reporting closed items.

---

## Executive Summary

DocNote is, on the whole, a well-hardened client-side application: the HTML sink is centralized through a strict DOMPurify config, the untrusted-input boundaries are clearly marked, the `localStorage` restore path rebuilds fresh typed objects instead of trusting the parsed graph, and the shipped build carries a real Content-Security-Policy with `connect-src 'none'` that neutralizes data exfiltration. The XSS attack surface that the prior UAT sessions worked hard to close is, as far as I can determine by code analysis and probe testing, **genuinely closed** — I could not construct a working stored-, reflected-, DOM-, or mutation-XSS chain.

However, I found **one new, exploitable High-severity finding that re-opens a condition the team previously closed as SEV-1**: the decompression-bomb guard (`src/core/zipGuard.ts`, the BUG-1 fix) can be bypassed by a crafted `.docx` whose ZIP central directory *lies* about its uncompressed size. The guard trusts an attacker-controlled metadata field that mammoth's underlying unzipper (JSZip) explicitly does **not** enforce during decompression. I proved the bypass with a probe test (now deleted). The remaining findings are Low/Informational (clickjacking residual from the meta-only CSP, shared-origin `localStorage` on GitHub Pages, and Trusted Types not enforced) and are consistent with what the team already documented as residual risk.

The single most dangerous finding is the **zip-bomb guard bypass (RT-01)** — a small hostile file can still detonate multi-gigabyte in-memory inflation and freeze/crash the victim's tab, exactly the SEV-1 denial-of-service the guard was built to prevent. Because it defeats a control the project itself classified as SEV-1 and TM-002 is the primary threat, I recommend treating it as a ship blocker under the project's own severity policy.

**Findings by severity:** Critical 0 · High 1 · Medium 0 · Low 2 · Informational 2.
**Verdict:** **Deploy with Conditions** — fix RT-01 before (or immediately after) exposure; the rest are acceptable residuals for the stated use case.

> **Plain-English TL;DR:** The app is solidly built and I could not make it run malicious code or steal data. But the shield that was supposed to stop a "tiny file that explodes into gigabytes and freezes your browser" can be tricked: the file just has to lie about its own size, and the app believes the lie. Fix that one thing and the app is in good shape.

---

## Phase 1 — Attack Surface Map

### Technology stack
- **Runtime:** Browser SPA. React 19.2.8 + React-DOM, TypeScript 6.0.3, built with Vite 8.2.0. No backend, no API, no database.
- **Key libraries (prod):** `dompurify@3.4.12` (HTML sanitizer), `mammoth@1.12.0` (`.docx` → HTML) → transitively `jszip@3.10.1` → `pako@1.0.11` (the actual DEFLATE inflater).
- **Hosting indicator:** GitHub Pages (`vite base: './'`, meta-CSP-only, `frame-ancestors` documented as unshippable via `<meta>`).
- **Persistence:** `localStorage`, single writer module, keys `docnote.v1.annotations.<sha256>`.

### Trust boundaries & data flow
1. **Hostile `.docx` → DOM (TM-002, primary).** `File` → `ArrayBuffer` → `parseDocx()` → `zipGuard.uncompressedSizeExceeds()` (bomb pre-check) → `mammoth.convertToHtml()` (untrusted HTML) → `sanitize.sanitizeToFragment()` (DOMPurify) → `DocumentView` `replaceChildren(fragment.cloneNode(true))`. **This is the main entry point and the only place external bytes reach the DOM.**
2. **Tampered `localStorage` → restore (TM-003, secondary).** `loadAnnotations()` → `JSON.parse` → `reconstructStore()` rebuilds fresh typed objects → highlights re-applied by `applyHighlightMarks()`; note/excerpt text rendered by React in `NotesPanel`.
3. **User selection → highlight.** DOM `Range` → `anchorFromRange()` → offsets stored. Not externally reachable.

### Entry points accepting external input
- `<input type="file" accept=".docx">` (`App.tsx:362`) — the only external-data intake.
- `localStorage` contents (attacker model: same-origin script, physical access, or a sibling GitHub Pages project on the same user subdomain).
- URL / query string: **none consumed** (no router, no `location.search`/`hash` reads).

### Auth / secrets / API
- **None.** No authentication, no sessions, no tokens, no server calls, no cryptographic secrets. `crypto.subtle.digest` (SHA-256) is used only for content-addressing (`hash.ts`), and `crypto.randomUUID` for local, non-security ids (`id.ts`). No secrets in source, config, build output, or git-tracked files (verified: no `.env`/`.pem`/`.key` tracked; secret-pattern grep clean; `.gitignore` covers `node_modules/`, `dist/`, `.env*`).

### Build-output hygiene (verified against `dist/`)
- **No source maps** shipped (`find dist -name '*.map'` → none; no `sourceMappingURL`).
- CSP correctly injected into `dist/index.html` at build time.
- No inline scripts/styles in the shipped HTML (all external, `crossorigin`), so the CSP does not need `unsafe-inline`.

### Dependency audit
- `npm audit` → **0 vulnerabilities** (261 deps). Lockfile committed, exact versions pinned.
- The exploitable weakness below is **not a CVE** — it is a design/trust flaw in how the app's own guard interacts with JSZip. SCA tooling will not flag it.

---

## Phase 2 — Findings

### RT-01 (HIGH) — Decompression-bomb guard bypassed by a lying ZIP central directory

- **Vulnerability:** `zipGuard.uncompressedSizeExceeds()` decides whether a `.docx` is a decompression bomb by summing the **advertised** uncompressed sizes from the ZIP *central directory* (32-bit field at record offset +24). That field is fully attacker-controlled and is **not** used by mammoth/JSZip to bound decompression. A crafted `.docx` can advertise a tiny uncompressed size (so the guard passes) while its DEFLATE stream actually inflates to gigabytes.
- **Location:**
  - `src/core/zipGuard.ts:37` — `total += view.getUint32(offset + 24, true);` (trusts advertised uncompressed size).
  - `src/core/parseDocx.ts:46-62` — guard runs, then `mammoth.convertToHtml(input)` inflates.
  - Confirming behavior in the dependency: `node_modules/jszip/lib/zipEntry.js:62-96` — `readLocalPart` does `reader.skip(22)` (skips the local header entirely) with the source comment *"we already know everything from the central dir! **If the central dir data are false, we are doomed.**"*, then `reader.readData(this.compressedSize)` and inflates. `node_modules/jszip/lib/compressedObject.js:30-37` — the `data_length !== uncompressedSize` check fires **only after** the full inflation completes (memory already allocated). `node_modules/jszip/lib/flate.js` — pako `Inflate` is created with `{raw:true, level}` and **no output cap**.
- **Severity:** High. (The project previously classified this exact denial-of-service condition — BUG-1 — as **SEV-1 / Critical**. I rate the raw impact High for a client-side, victim-opens-the-file DoS with no data theft or code execution, but under the project's own non-deferrable SEV-1 policy for TM-002 it should be treated as a ship blocker.)
- **Exploitability:** **Moderate.** Requires hand-crafting a ZIP with a falsified central-directory `uncompressed size` field (trivial to script) and delivering the file to a victim who opens it. No special privileges. The 10 MB compressed-file cap (`MAX_DOCUMENT_BYTES`) is not a mitigation: DEFLATE's ~1032:1 max ratio means a ≤10 MB compressed payload can still inflate to ~10 GB.
- **Impact:** Denial of service. `mammoth` reads `word/document.xml` via `zip.file(...).async('uint8array')`, forcing JSZip/pako to inflate the full stream into memory before the app's `MAX_EXTRACTED_CHARS` cap (which only applies to *post-conversion* text) can help. Result: tab freeze, OOM crash, or whole-browser instability on low-RAM devices. No exfiltration (CSP `connect-src 'none'`), no code execution. Saved annotations are not lost.
- **Proof of Concept (verified):** I wrote a throwaway `vitest` probe (`src/core/__redteam_probe.test.ts`, run with `npx vitest run`, then deleted) that:
  1. Builds a valid single-entry deflate ZIP containing a 4 MB payload.
  2. **Honest case:** central-dir uncompressed size = 4 MB → `uncompressedSizeExceeds(buf, 1MB)` returns **`true`** (guard works).
  3. **Attack case:** patch only the central-dir uncompressed-size field to `10` → `uncompressedSizeExceeds(buf, 1MB)` returns **`false`** (guard bypassed) even though the real content is 4 MB.
  4. Feeding the same bytes to `JSZip.loadAsync(...).file('word/document.xml').async('uint8array')` returns/attempts the full 4 MB — JSZip never caps output at the advertised size; the size mismatch is detected only *after* inflation.

  All four assertions passed. Scaled from the 4 MB probe payload to a real bomb (≤10 MB compressed → multi-GB inflated), step 4 is the denial of service. Attacker script sketch:
  ```js
  // build a real docx, then falsify ONLY the central-dir uncompressed size:
  // locate the central-dir record for word/document.xml and overwrite the
  // 4-byte little-endian field at (record + 24) with a small value (e.g. 0x0A).
  // Deliver the .docx; when the victim opens it, mammoth/pako inflate the true
  // (gigabyte-scale) stream because JSZip skips the local header and reads the
  // central-dir compressedSize, then inflates with no output limit.
  ```
- **Remediation (ranked):**

  **Option A — Bounded streaming inflation as the guard (recommended, robust).** Stop trusting advertised sizes. Actually inflate each entry's real compressed bytes with a hard output budget and abort the moment the budget is exceeded, *before* handing the buffer to mammoth. Use the browser-native `DecompressionStream` (no new dependency):
  ```ts
  // zipGuard.ts — replace the advertised-size sum with a real, capped inflate.
  // Iterate central-directory records to find each entry's compressed data
  // (local-header offset + compressedSize), then stream-inflate with a cap.
  async function inflatedSizeWithinBudget(
    compressed: Uint8Array,
    budget: number,
  ): Promise<boolean> {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    void writer.write(compressed);
    void writer.close();
    const reader = ds.readable.getReader();
    let total = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return true;
      total += value.byteLength;
      if (total > budget) {
        await reader.cancel();      // stop inflating immediately
        return false;               // bomb detected on REAL output, not metadata
      }
    }
  }
  ```
  Sum the per-entry real inflated bytes against `MAX_UNCOMPRESSED_BYTES` and reject if any entry (or the total) blows the budget. This makes the guard immune to lying headers because it measures actual output and aborts early (bounded memory, ~one chunk at a time).

  **Option B — Conservative compressed-ratio cap (quick, coarse).** Reject before mammoth if the *compressed* size of any entry could plausibly exceed the budget at DEFLATE's max ratio:
  ```ts
  const MAX_DEFLATE_RATIO = 1032;
  // per entry, from the central directory:
  if (compressedSize * MAX_DEFLATE_RATIO > MAX_UNCOMPRESSED_BYTES) return true; // reject
  ```
  Effort: quick. Downside: over-conservative (a legitimately-large-but-benign doc could be rejected); does not measure true output.

  **Option C — Defense in depth (do regardless).** Run mammoth conversion inside a Web Worker with a watchdog timeout and terminate the worker if parsing exceeds a wall-clock/memory bound, so even an unforeseen bypass degrades to a contained failure instead of freezing the main thread.

  **Recommended:** Option A as the primary fix, plus Option C for resilience.

---

### RT-02 (LOW) — Clickjacking possible: `frame-ancestors` cannot be set via `<meta>`

- **Vulnerability:** The shipped CSP is delivered only via `<meta http-equiv>` (GitHub Pages cannot set response headers). `frame-ancestors` and `X-Frame-Options` are header-only directives, so the app can be embedded in a hostile `<iframe>`.
- **Location:** `vite.config.ts:9-11` (CSP string, no `frame-ancestors`); `dist/index.html` (meta CSP). Already documented by the team as residual risk (Bible §4, platform module §4.4).
- **Severity/Exploitability:** Low / Difficult-to-meaningfully-abuse. DocNote has no authenticated or state-changing server action; the only "sensitive" clickjack targets are local actions like removing a highlight or note. No cross-user or data-theft impact.
- **Impact:** A framing attacker could trick a user into clicking local UI (e.g., delete a note). Annoyance-grade.
- **Remediation:** If the host ever supports headers (custom domain behind a CDN, or moving off GitHub Pages), send `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`. As a meta-compatible stopgap, add a small frame-buster in `main.tsx` (`if (self !== top) { document.documentElement.style.display='none'; top.location = self.location; }`) — noting it is weaker than a header. Accept as residual otherwise.

---

### RT-03 (LOW / Informational) — Shared-origin `localStorage` on GitHub Pages

- **Vulnerability:** On `*.github.io`, every project under the same user account shares one origin. `localStorage` is per-origin, so a *sibling* project on the same `user.github.io` can read and write DocNote's `docnote.v1.annotations.*` keys.
- **Location:** Storage model (`annotationRepository.ts`), hosting model (GitHub Pages).
- **Severity/Exploitability:** Low / requires the "attacker" to control another repo on the *same* GitHub user account — i.e., not a cross-user or external attacker; effectively the account owner's own other pages. Not a realistic third-party attack path.
- **Impact:** A same-origin sibling page could read stored note text and document excerpts (`anchor.exactText`) — minor information disclosure — or write spoofed annotations. Critically, **this does not yield XSS**: the restore path (`reconstructStore`) validates and rebuilds fresh typed objects, `color` is allow-listed, and note/excerpt text is rendered as React children / escaped attributes (`NotesPanel.tsx:48-57`) — never as HTML. I verified there is no injection sink on the restore path.
- **Remediation:** Prefer hosting on a dedicated origin/custom domain for true isolation. If staying on shared GitHub Pages and the excerpts are considered sensitive, namespacing keys does not add a security boundary (same origin) — only a separate origin does. Acceptable residual for a personal tool.

---

### RT-04 (INFORMATIONAL) — Trusted Types not enforced

- **Observation:** The CSP does not include `require-trusted-types-for 'script'`. The app already funnels all HTML through DOMPurify and uses no raw `innerHTML`/`dangerouslySetInnerHTML` (verified — see Positive Findings), so this is purely a belt-and-suspenders hardening opportunity that would make any *future* accidental sink fail closed.
- **Remediation (optional, meta-compatible):** add `require-trusted-types-for 'script'; trusted-types dompurify default` to the CSP and route DOMPurify through a named Trusted Types policy. Low effort, no functional change given current code.

---

### Areas actively examined and found SECURE (no finding)

- **XSS via hostile `.docx` (primary threat):** `sanitize.ts` uses DOMPurify 3.4.12 with `RETURN_DOM_FRAGMENT`, forbidding `style/form/input/button/iframe/object/embed/svg/math/img/video/audio/source/picture/track/link/base` and stripping `href/target/style/class/srcset/src`. Insertion is `replaceChildren(fragment.cloneNode(true))` — a DOM-node path, **not** an `innerHTML` round-trip, so mutation-XSS on re-insertion is not reachable. `svg`/`math` (classic mXSS namespaces) are forbidden. I could not construct a payload that survives to an executable context.
- **DOM-based XSS / selector injection in `jumpToHighlight`:** `App.tsx:284,294` build a `querySelector` from a highlight id but wrap it in `CSS.escape(id)`. Even a fully attacker-controlled id (from tampered storage) cannot break out of the attribute selector, and the id is only ever written back via `element.dataset.hlId` (safe) and used as a React key (safe). Closed.
- **Stored XSS via tampered `localStorage`:** `reconstructStore/reconstructHighlight/reconstructAnchor/reconstructNote` validate into brand-new typed objects; unknown fields dropped, `color` allow-listed, offsets integer/range-checked, note length-checked. `applyHighlightMarks` verifies `text.slice(start,end) === exactText` and `rangeFromAnchor` rejects out-of-range offsets, so tampered anchors become "unlocated", not OOB/DoM corruption. Text is React-escaped everywhere it renders. Closed.
- **Prototype pollution:** The restore path never merges or spreads the parsed graph into existing objects; it reads specific keys and constructs fresh literals. `JSON.parse` alone does not pollute `Object.prototype`. No `__proto__`/`constructor` merge sink found.
- **Injection (SQL/NoSQL/command/template/SSRF):** Not applicable — no server, no DB, no shell, no `eval`/`new Function`, no outbound requests. `grep` for dangerous sinks across `src/` (non-test) returned nothing.
- **Secrets:** None in source, config, build, or git-tracked files.
- **Information leakage:** `errors.ts` returns fixed user-facing strings; `log.ts` and `ErrorBoundary.tsx` emit metadata/`error.name` only (no content, no stack traces to the user).

---

## Phase 3 — Attack Chains

**Chain 1 — External attacker (deliver a hostile file).** Attacker crafts a `.docx` with a falsified central-directory uncompressed-size field and social-engineers the victim into opening it (email attachment, "please review this doc"). On open, RT-01 fires: the bomb bypasses the guard and pako inflates gigabytes into the tab → freeze/OOM DoS. **Confidence: High.** This is the only chain that reaches a real impact against the app as it exists today. It stops at denial of service — `connect-src 'none'` and the closed XSS surface prevent it from escalating to data theft or code execution.

**Chain 2 — Authenticated / privileged-user chain.** Not applicable — no accounts, roles, or server-side objects. There is no horizontal/vertical escalation to attempt. **Confidence: N/A.**

**Chain 3 — Supply-chain blast radius.** If `mammoth`, `jszip`, `pako`, or `dompurify` were compromised at the package level, the blast radius is significant because they run in the page with DOM access. But `connect-src 'none'` + `default-src 'self'` (no `unsafe-inline`/`unsafe-eval`) means an injected payload cannot exfiltrate over the network or run inline script it injects into the DOM — it would be reduced to same-origin DOM tampering. Lockfile is committed with pinned exact versions and `npm audit` is clean. **Confidence that a *current* dependency yields a working chain: Low.** The CSP meaningfully caps the damage of a hypothetical compromised dependency.

---

## Remediation Priority List

1. **Fix RT-01 (zip-bomb guard bypass).** Effort: **moderate.** Replace advertised-size trust with bounded streaming inflation (Option A) using `DecompressionStream('deflate-raw')` with an early-abort output budget; add a Web Worker + watchdog for mammoth (Option C). This is the only fix that changes the app's real risk posture. Treat as SEV-1 per the project's own policy.
2. **Add a mammoth-in-a-Worker watchdog (RT-01 defense in depth).** Effort: moderate. Contains any future parser blow-up to a killable worker instead of the main thread.
3. **(Optional) Enforce Trusted Types (RT-04).** Effort: quick. `require-trusted-types-for 'script'` + a named DOMPurify policy; makes future accidental sinks fail closed.
4. **(Optional) Clickjacking (RT-02).** Effort: quick if headers become available (`frame-ancestors 'none'` + `X-Frame-Options: DENY`); otherwise accept as documented residual.
5. **(Optional) Origin isolation (RT-03).** Effort: moderate (custom domain) — only if document excerpts are deemed sensitive.

---

## Positive Findings (preserve these during remediation)

- **Single, centralized, strict HTML sink** (`sanitize.ts`) with a fragment-based (non-`innerHTML`) insertion path — an exemplary anti-XSS/anti-mXSS design.
- **Validate-don't-trust restore** (`annotationRepository.ts`): reconstructs fresh typed objects, drops unknown fields, allow-lists `color`, range-checks offsets and note length — defeats stored-XSS, prototype pollution, and OOB via tampered storage.
- **`CSS.escape` on every dynamic selector** in `jumpToHighlight` — selector injection closed.
- **Strong shipped CSP** (`default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`) with **no `unsafe-inline`/`unsafe-eval`** and no inline scripts/styles to require them — this is the control that caps the supply-chain blast radius.
- **No source maps** in the production build; **no secrets** anywhere; **metadata-only logging** with no content and no stack traces to users.
- **Layered input caps** (10 MB file, 50 MB uncompressed intent, 5 M chars, 5 K selection, 1 K note) and a monotonic open-token race guard.

---

## Automated Tooling Gaps (what scanners will miss)

- **RT-01 will not be caught by SAST, DAST, or SCA.** `npm audit` reports 0 vulns because this is not a CVE — it is a *trust-model* flaw in how the app's own guard interacts with JSZip's decompression semantics. The project's Semgrep rule (`.semgrep/soif-dom-sinks.yml`) targets DOM sinks, not ZIP-metadata trust. Only a human reasoning about "the guard reads a field the decompressor ignores" (or a targeted decompression-ratio test) finds it.
- **RT-03 (shared-origin `localStorage`)** is an architecture/deployment property invisible to code scanners — it depends on where the app is hosted, not on any code pattern.
- **The *absence* of a finding is itself a tooling gap the developer should trust:** the XSS surface is closed by a fragment-based DOMPurify pattern that some naive scanners flag as a false positive (any DOMPurify use) or miss entirely; the real security here is in the insertion *method*, which requires human review to validate.

---

## Overall Security Rating

**DEPLOY WITH CONDITIONS.**

- **Condition (blocker under project policy):** Remediate **RT-01** — the zip-bomb guard bypass — which re-opens the SEV-1 denial-of-service the guard was built to prevent. Implement bounded streaming inflation (Option A) and, ideally, a Worker watchdog (Option C). Re-test with a falsified-central-directory `.docx`.
- **Acceptable residuals for the stated personal-viewer use case:** RT-02 (clickjacking, meta-CSP limitation), RT-03 (shared-origin storage on GitHub Pages), RT-04 (Trusted Types not enforced).

Absent RT-01, this application would rate a clean **Deploy** for its threat model. The core defenses — sanitization, storage validation, CSP, no network egress — are correctly built and should be preserved as-is.
