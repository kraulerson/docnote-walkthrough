# Incident Response Playbook — DocNote

<!-- Adapted from templates/generated/incident-response.tmpl for a static,
     client-side, no-server, no-account, no-user-data application. Sections that
     do not apply to this architecture are marked N/A with the reason. -->

DocNote is a static single-page app served from GitHub Pages. There is **no
server, no database, no user accounts, and no user data on any server** — each
user's documents and annotations live only in their own browser. This narrows
the realistic incident set to: (a) a broken/bad deployment, and (b) a security
vulnerability discovered in the shipped code or a dependency.

## 1. Severity classification

| Severity | Definition (this app) | Response |
|---|---|---|
| **SEV-1** | App unusable for everyone (bad deploy, blank page), or an exploitable vulnerability that runs code / exfiltrates a user's annotations | Roll back immediately (Section 3), then fix |
| **SEV-2** | A core feature broken for everyone (can't open docs / highlights lost on reload) | Roll back or hotfix within a day |
| **SEV-3** | Non-critical bug / degraded UX | Next maintenance window |
| **SEV-4** | Cosmetic | Backlog |

## 2. Containment

- **Bad deploy → roll back first, investigate second** (Section 3).
- **Suspected vulnerability in shipped code:** do not disclose publicly; follow
  `SECURITY.md`. If it allows code execution or annotation exfiltration, treat as
  SEV-1 — roll back to the last known-good tag while fixing.
- **Data breach / secrets rotation / service isolation:** **N/A** — there is no
  server, no secret material, and no user data stored off the user's device. The
  CSP (`connect-src 'none'`) and the no-network design mean the app cannot
  exfiltrate data even if a page were compromised. A malicious dependency is the
  main residual vector (mitigated by pinned deps + `npm audit`/Snyk).

## 3. Rollback procedure (GitHub Pages)

DocNote deploys are immutable per Git tag. To roll back:

```bash
# 1. Identify the last known-good release tag
git tag --list 'v*' --sort=-creatordate | head

# 2. Re-deploy that tag (the release workflow builds from the tag)
git checkout vX.Y.(Z-1)
npm ci && npm run build      # produces dist/
# then publish dist/ to the gh-pages branch / Pages environment
#   (or re-run the release workflow against the prior tag)
```

**No data-model rollback is needed** — annotations live in each user's
localStorage and are versioned by `schemaVersion` with a safe-discard loader, so
a rollback cannot corrupt them.

**Post-rollback verification:**
- [ ] The production URL loads; opening a fixture `.docx` renders text.
- [ ] Applying a highlight + note works and survives a reload.
- [ ] Browser console shows no errors; `curl -I <url>` shows the expected headers.

## 4. Secrets rotation

**N/A** — the app uses no secrets, API keys, or tokens at build or runtime. The
GitHub Actions workflows use only the default `GITHUB_TOKEN`.

## 5. Notification chain

Personal project: the Orchestrator (Karl, kraulerson@gmail.com) is the sole
responder. Vulnerability reports arrive via the `SECURITY.md` inbox.

## 6. Root-cause & follow-up

After any SEV-1/2: file a `BUGS.md` entry, add a regression test (the fix is
test-first per the Build Loop), and record the incident + remediation in
`CHANGELOG.md`.
