# Go-Live Checklist — docnote-walkthrough (web)

Rendered at scaffold time from `docs/platform-modules/web.md` (its Go-Live
section is MANDATORY). Tick every box as you verify it in production; the
`phase4_release:go_live_verified` gate blocks while any box is unticked,
any module item is missing, or the Date below is a placeholder (BL-106).

| Field | Value |
|---|---|
| **Date** | [YYYY-MM-DD] |
| **Verified by** | [name] |

- [ ] SSL certificate valid
- [ ] Security headers set:
- [ ] CORS: only allowed origins, no wildcard on authenticated endpoints
- [ ] Cookies: `HttpOnly`, `Secure`, `SameSite` flags
- [ ] Rate limiting on auth endpoints
- [ ] Lighthouse scores meet targets on production URL
