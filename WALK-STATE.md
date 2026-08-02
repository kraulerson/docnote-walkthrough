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
- [ ] UAT Session 3 (F5+F6) — IN PROGRESS (required now)
- [ ] Phase 2 completion checkpoint + Phase 2→3 gate (no open SEV-1/2; bug gate)
- [ ] Phase 3: 5 validation scanners + 6 reviewer evals + a11y/robustness
      (address deferred SEV-3 BUG-9..14, 24 in hardening/accessibility) + archive
- [ ] Phase 4: release v1.0.0 (tag), handoff, monitoring
- [ ] WALK-REPORT.md + final push

## Next step
Run UAT Session 3 for Features 5 & 6 (exploratory agent on persistence/restore
+ tampered-storage; automated suite; triage). Then Phase 2 completion checklist
and Phase 2→3 gate. Remaining OPEN bugs are all deferred SEV-3 (BUG-9,10,11,12,
13,14,24) for Phase 3 hardening/accessibility — no open SEV-1/2.

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
