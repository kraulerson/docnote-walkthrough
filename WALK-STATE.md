# WALK-STATE — resume file

## Who I am
Junior-dev persona doing a first-time-user walkthrough of Solo Orchestrator,
building **DocNote**: a web app (TypeScript/React/Vite) that views .docx
read-only with (1) highlighting (≥3 colors, add/remove) and (2) notes on
highlights (side panel, click-to-jump, edit/delete), localStorage-persisted.
Minimal scope: local file picker, no accounts, no server, no doc editing.
Fixed: GitHub, public repo, personal, web, TypeScript, repo `docnote-walkthrough`.

## Where things live
- Framework clone: `test-walk/solo-orchestrator` (NEVER edit)
- Project (this repo): `test-walk/docnote-walkthrough`, remote
  https://github.com/kraulerson/docnote-walkthrough (public)
- Walk logs live in the project root: WALK-ISSUE-LOG.md, WALK-STATE.md,
  WALK-REPORT.md (report written at the very end).

## Progress
- [x] Clone, README, User Guide, prerequisites
- [x] init.sh (non-interactive) → project scaffolded, repo created, pushed
- [x] Intake complete; resume.sh state machine verified
- [x] Phase 0 → PRODUCT_MANIFESTO + phase-0 docs; gate 0→1 approved
- [x] Phase 1 → ADR-0001, PROJECT_BIBLE (16 §), threat model, data_classification
      + ZDR attestation; gate 1→2 approved; phase-state current_phase=2
- [x] Phase 2 init: React+Vite+TS scaffold, tooling, hooks verified, --verify-init
- [x] Feature 1 (docx-open-render): Build Loop complete, committed d3d2e15
- [x] Feature 2 (highlight-apply): built
- [x] UAT Session 1: 3 agent passes (automated/exploratory/cross-platform) +
      live Chrome pass. 19 bugs triaged in BUGS.md. SEV-1 (decompression bomb)
      + all SEV-2 + cheap SEV-3/4 FIXED test-first; SEV-3 a11y/robustness
      (BUG-9..14) DEFERRED to Phase 3. Session marked complete (9/9).
- [x] Feature 2 + remediation committed de16e01, pushed. Build loop closed.
- [x] Feature 3 (remove-highlight) — committed a55a1f1
- [x] Feature 4 (notes: attach/edit/delete) — committed 745d62b
- [x] UAT Session 2 (F3+F4): exploratory agent + live Chrome. 7 findings
      (2 SEV-2: wrong-note-save missing key, remove-confirmation missing).
      Fixed BUG-20..23,25,26 (fda79ef); BUG-24 (Esc/focus) deferred → Phase 3.
- [x] Feature 5 (notes panel ordering + click-to-jump + unlocated) — 8609772
- [x] Feature 6 (localStorage persistence, content-hash) — 6bba7d8;
      restore-across-reload LIVE-verified in Chrome. ALL 6 MVP features built.
      108 tests green, semgrep 0 findings.
- [x] UAT Session 3 (F5+F6) — complete; findings triaged into BUGS.md
- [x] Phase 2 completion checkpoint + Phase 2→3 gate (no open SEV-1/2)
- [x] Phase 3: 5 validation scanners (semgrep-full-tree PASS, license PASS,
      snyk + zap-dast attested-skip, threat-model PASS) + 6 reviewer evals
      (Red Team RT-01 caught a SEV-1 the self-review missed → fixed, BUG-32) +
      deferred a11y/robustness addressed; results archived
- [x] Phase 4: v1.0.0 released to GitHub Pages (tag-driven); handoff, rollback,
      monitoring, go-live all verified and recorded in APPROVAL_LOG
- [x] WALK-REPORT.md written + everything pushed

## Next step
**NONE — the walk is COMPLETE.** Final `check-phase-gate.sh` → GATE_EXIT=0,
"Phase gates consistent"; Phase-4 checklist 6/6. v1.0.0 live at
https://kraulerson.github.io/docnote-walkthrough/ with a GitHub Release + SBOM.
All 18 findings are in WALK-ISSUE-LOG.md; the synthesis is in WALK-REPORT.md;
all 33 DocNote bugs resolved. Local `main` == `origin/main` (c8a9eca).
If resumed, there is nothing left to build — only optional follow-ups noted in
the report (e.g. authenticate snyk, stand up UptimeRobot).

## HARD-WON LESSONS (do not repeat)
- **Commit the feature WHILE the Build Loop is active** (after steps 1-5,
  BEFORE closing it / running UAT). Closing the loop then trying to `feat:`
  commit is blocked ("no Build Loop active"). See ISSUE-010.
- **Never pipe `git commit` through `tail`** — it hides the missing
  `[main <sha>]` line. Always check `git log -1` after committing. Four commits
  were silently lost this way. See ISSUE-010.
- **`// nosemgrep` must be on the line immediately above the finding** (no
  explanation lines between). See ISSUE-011.
- Local phase-gate passes but **CI phase-gate needs SOIF_PHASE_GATES=warn**
  (branch-protection API unreadable in Actions). Already applied to ci.yml.
  See ISSUE-006.
- snyk is NOT authenticated (browser OAuth needed) — will matter in Phase 3.
  See ISSUE-002. Operator may need to run `! snyk auth`.

## Key facts
- Test cmd: `npx vitest run` (also in .claude/test-command). 65 tests currently.
- Fixtures: src/core/__fixtures__/{valid,empty,no-document,bomb}.docx
- Architecture: src/core (framework-free logic) + src/ui (React). Only
  sanitizeToFragment touches HTML sinks; only annotationRepository (F6) will
  touch localStorage.
