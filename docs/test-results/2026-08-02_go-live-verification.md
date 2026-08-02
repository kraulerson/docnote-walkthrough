# Go-Live Verification — DocNote v1.0.0 (Phase 4, go_live_verified)

**Date:** 2026-08-02
**Production URL:** https://kraulerson.github.io/docnote-walkthrough/
**Release:** https://github.com/kraulerson/docnote-walkthrough/releases/tag/v1.0.0 (asset: sbom.json)
**Release workflow run:** 30765794342 (success)

## §5.2 Go-Live checklist (web module) — against the PRODUCTION URL

- [x] **HTTP 200** — `curl` returns 200; site loads.
- [x] **SSL valid** — served over HTTPS (github.io managed cert); HSTS present.
- [x] **CSP present** — meta-CSP in the served HTML: `default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`.
- [x] **Lighthouse on prod URL** — Accessibility **100**, Performance **98**, Best-Practices **96** (report: 2026-08-02_lighthouse-production_pass.html). Targets (a11y ≥90, perf ≥90) met.
- [n/a] **CORS / cookies / rate-limit on /auth** — no server, no auth, no cookies (client-only app).

## Response headers actually shipped by GitHub Pages (curl -I)

```
    content-type: text/html; charset=utf-8
    strict-transport-security: max-age=31556952
```

**Honest header assessment (matches TM-006 / BUG-33 residuals):** GitHub Pages
ships `strict-transport-security` and `content-type` but does NOT set
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or a
response-header CSP — and `frame-ancestors` cannot be delivered via `<meta>`.
This is the documented clickjacking residual (BUG-33, Won't Fix on this host).
The meta-CSP still enforces `default-src/connect-src/form-action/base-uri/
object-src`. If moved to a host that sets response headers, add
`X-Frame-Options: DENY` + a response CSP with `frame-ancestors 'none'`.

## OWASP ZAP DAST

Attest-skipped in Phase 3 (Docker unavailable / no live URL at scan time). Now
that the site is live, a manual ZAP baseline against the production URL is the
documented follow-up (set repo var `PREVIEW_URL` to enable the release
workflow's DAST step on future releases).

**Verdict: GO-LIVE VERIFIED.** Site is live, HTTPS, meets Lighthouse targets;
header residuals are the known/accepted GitHub Pages limitations.
