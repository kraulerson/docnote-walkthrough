# Rollback Test — DocNote v1.0.0 (Phase 4, rollback_tested)

**Date:** 2026-08-02 | **Track:** Light (manual rollback + smoke).
**Hosting:** GitHub Pages via the tag-triggered release workflow.

## Rollback mechanism (verified by inspection)

DocNote deploys are immutable per Git tag; the release workflow
(`.github/workflows/release.yml`) builds `dist/` and deploys it to GitHub
Pages. Rolling back = re-deploying a prior known-good tag:

```bash
# Re-run the release workflow against the previous tag:
gh workflow run release.yml --ref vX.Y.(Z-1)
# or re-run the prior tag's completed run:
gh run rerun <prior-run-id>
```

GitHub Pages also keeps prior deployments; a rollback can additionally be done
from the repo's Deployments UI (github-pages environment → a prior deployment →
re-deploy).

**No data-model rollback is needed** — annotations live in each user's own
`localStorage`, versioned by `schemaVersion` with a safe-discard loader, so a
site rollback cannot corrupt or lose user data.

## This release (v1.0.0)

v1.0.0 is the **first** release, so there is no prior tag to promote to. The
rollback *mechanism* above is verified by inspection (the same workflow that
just deployed v1.0.0 successfully can be re-run against any prior tag), and it
will be exercised for real at the first subsequent release (v1.0.1+). This
scope statement is per the web Platform Module (Light track = manual promote +
smoke).

## Post-rollback smoke checklist (for future rollbacks)

- [ ] `curl -I https://kraulerson.github.io/docnote-walkthrough/` → HTTP 200
- [ ] The landing page renders "Open a .docx"
- [ ] Open a fixture .docx → text renders; apply a highlight + note; reload →
      annotations restored.
