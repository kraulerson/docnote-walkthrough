# Go-Live Checklist — docnote-walkthrough (web)

Rendered at scaffold time from `docs/platform-modules/web.md` (its Go-Live
section is MANDATORY). Verified in production at
https://kraulerson.github.io/docnote-walkthrough/ — full evidence in
`2026-08-02_go-live-verification.md`.

| Field | Value |
|---|---|
| **Date** | 2026-08-02 |
| **Verified by** | Karl (Orchestrator) |

- [x] SSL certificate valid — served over HTTPS with GitHub Pages' managed cert; HSTS present.
- [x] Security headers set: — meta-CSP present (`default-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`) + HSTS. RESOLVED residual: GitHub Pages cannot set response-header CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy, and `frame-ancestors` is header-only — documented and accepted (BUG-33 / TM-006). Add these at the deploy layer if moved to a header-capable host.
- [x] CORS: only allowed origins, no wildcard on authenticated endpoints — N/A: no server, no API, no authenticated endpoints (client-only app).
- [x] Cookies: `HttpOnly`, `Secure`, `SameSite` flags — N/A: the app sets no cookies (localStorage only).
- [x] Rate limiting on auth endpoints — N/A: no auth, no endpoints (no server).
- [x] Lighthouse scores meet targets on production URL — Accessibility 100, Performance 98, Best-Practices 96 on the live URL (report: `2026-08-02_lighthouse-production_pass.html`); targets (≥90) met.
