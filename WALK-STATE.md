# WALK-STATE — resume file

## Who I am
Junior-dev persona doing a first-time-user walkthrough of Solo Orchestrator
(https://github.com/kraulerson/solo-orchestrator), building **DocNote**:
a web app (TypeScript) that views .docx read-only with (1) text highlighting
(≥3 colors, add/remove) and (2) notes attached to highlights (side panel,
click-to-jump, edit/delete), persisted in localStorage. Minimal scope: local
file picker only, no accounts, no server, no doc editing.
Fixed choices: GitHub host, public repo, personal/individual project, web
platform, TypeScript, repo name `docnote-walkthrough`.

## Where things live
- Framework clone: `/Users/karl/Documents/Claude Projects/test-walk/solo-orchestrator` (NEVER edit)
- Generated project (once init runs): sibling dir, will be `docnote-walkthrough`
- Walk logs: currently at `test-walk/` root; MOVE into project repo once created

## Progress
- [x] Cloned framework over HTTPS
- [x] Read README top to bottom
- [ ] Read User Guide (docs/user-guide.md) — NEXT STEP
- [ ] Verify prerequisites (git, node 18+, jq, gh installed+authed, docker?)
- [ ] Run ./init.sh --project-dir docnote-walkthrough
- [ ] Post-init auth (claude, snyk auth)
- [ ] Intake wizard
- [ ] Phase 0..4

## Next step
Read `solo-orchestrator/docs/user-guide.md` from the top, follow the
personal-project path section by section. Then check prerequisites BEFORE
running init (README says gh must be authed first).

## Notes
- README Quick Start: `chmod +x init.sh && ./init.sh --project-dir docnote-walkthrough`
  (bare name creates project as SIBLING of the clone).
- After init: `cd ../docnote-walkthrough && bash scripts/resume.sh` prints the
  exact first message to paste into Claude Code.
- Harness injected framework CLAUDE.md; ignoring per persona rules (ISSUE-000).
