# WALK-ISSUE-LOG — Solo Orchestrator first-time-user walkthrough

Append-only log of every issue, confusion, and smooth step encountered while
building DocNote with the Solo Orchestrator framework as a junior developer.

Severity scale: Blocker / Major / Minor / Confusion. Smooth steps noted inline.

---

### ISSUE-000 — Walkthrough harness note (not a framework issue)
When: 2026-08-02 ~08:45 | Where: session start
Expected: n/a
Actual: The Claude Code harness automatically injected the framework repo's
internal `CLAUDE.md` into my context when I cloned it. Persona rules forbid
reading framework internals. I am deliberately not acting on anything from that
file; all decisions come from README / User Guide / generated files only.
Severity: (none — honesty note)
Resolution: documented-path (ignored the injected content)
Time lost: 0

---

### SMOOTH — Clone + README
When: 2026-08-02 ~08:45 | Where: README
`git clone https://github.com/kraulerson/solo-orchestrator.git` worked first
try. README is long but clearly signposted: "Read the User Guide first",
Quick Start block, prerequisites table. The prerequisites table explicitly
warns that `gh` must be installed AND authenticated before running init —
good, that's the kind of thing I'd have missed.

---

### SMOOTH — init.sh non-interactive path
When: 2026-08-02 ~08:47 | Where: README Quick Start → init.sh
`./init.sh --help` clearly documents a `--non-interactive` mode "for CI, UAT,
AI agents" and `--help-non-interactive` prints a full flag schema with examples
and defaults. `--validate-only` previewed my resolved config as JSON before I
committed to anything. Flags were accepted exactly as documented; project dir
resolved to a sibling of the clone as both README and help text promised.

### ISSUE-001 — Walkthrough environment note: all tools were preinstalled
When: 2026-08-02 ~08:48 | Where: init.sh tool plan
Expected: README says init "offers to auto-install" Git, Node, security tools —
a first-time user would experience install prompts.
Actual: This machine already had every tool (git, node, jq, docker, colima,
gpg, semgrep, gitleaks, snyk, claude code, CDF, superpowers, context7, qdrant),
so the tool-installation UX was not exercised in this walk. Init printed a
clean "Already installed" plan table.
Severity: Minor (walkthrough coverage gap, not a framework bug)
Resolution: documented-path (nothing to do)
Time lost: 0

---

### ISSUE-002 — snyk auth requires a browser; cannot complete autonomously
When: 2026-08-02 ~08:52 | Where: init.sh "Next Steps" step 1 / User Guide §2 Post-Init Authentication
Expected: "Authenticate: `claude` (OAuth) and `snyk auth`" — both one-time per machine.
Actual: `claude` was already authenticated. `snyk whoami` returns
"Authentication error (SNYK-0005)". `snyk auth` opens a browser OAuth flow,
which this autonomous session cannot complete. Docs offer no token-based
alternative instruction at this point in the flow.
Severity: Confusion (not yet blocking — snyk is first needed in Phase 3; will
escalate to Blocker if still unauthenticated when Phase 3 requires it)
Resolution: unresolved (deferred; operator may run `! snyk auth`)
Time lost: 2

---

### SMOOTH — Intake, resume.sh state machine, Phase 0
When: 2026-08-02 ~09:00-09:15 | Where: Intake + Phase 0
- resume.sh correctly moved through its states: intake prompt → (intake done)
  → printed Section 13 initialization prompt verbatim. Genuinely nice UX.
- Builder's Guide Phase 0 is prescriptive and easy to follow: each step has a
  prompt, a review checklist, a template path, and a save-as path. Templates
  (frd/user-journey/data-contract/manifesto) match what the gate later checks.
- APPROVAL_LOG.md's append-only design is explained in the file itself with
  the exact table shape to copy. The 15-line date-proximity rule is documented
  both in the Builder's Guide and the log.
- check-phase-gate.sh passed first try and auto-created a snapshot.

### ISSUE-003 — check-versions.sh prints a raw JSON array as an update command
When: 2026-08-02 ~08:58 | Where: scripts/check-versions.sh output
Expected: "Update commands (run manually):" lists copy-pasteable commands.
Actual: Colima's entry printed as a JSON array: `Colima: [ "brew install colima", "brew services start colima" ]` — a junior would not know if this is one command, two, or an error.
Severity: Minor
Resolution: documented-path (no update needed; all tools above minimums)
Time lost: 1

---

### SMOOTH — Phase 1 end-to-end
When: 2026-08-02 ~09:20-09:45 | Where: Phase 1
- Web Platform Module is genuinely useful: it warned me ahead of time about
  BL-159 (package.json needs build/lint/test scripts BEFORE first push),
  ESLint 9 flat config, and the Phase 3 DAST header-honesty harness.
- Context7 MCP integration worked for validating the mammoth.js choice.
- reconfigure-project.sh handled data_classification + zdr_attested exactly
  as the Builder's Guide documented, and the Phase 1->2 gate printed the
  attestation reason back — the ZDR exception path works as documented.
- process-checklist.sh guided each phase1_architecture step with a "Next:"
  line. Gate passed first try; snapshot auto-created.

### ISSUE-004 — reconfigure-project.sh appends audit rows to the END of APPROVAL_LOG.md
When: 2026-08-02 ~09:40 | Where: scripts/reconfigure-project.sh
Expected: "The reconfigure script appends an audit row to APPROVAL_LOG.md"
(Builder's Guide Step 1.7) — presumably under the Approval History section,
which says "Append one row per post-launch change... below".
Actual: The audit row was appended to the very last line of the file, which
visually lands inside the "## Penetration Test (if applicable)" section's
example table area, not under "## Approval History". Data is intact but a
reader scanning by section would file these rows under the wrong heading.
Severity: Minor
Resolution: documented-path (left as-is; append-only forbids me moving it)
Time lost: 2

### ISSUE-005 — --start-phase1 is discoverable only via --help, not via CLAUDE.md
When: 2026-08-02 ~09:35 | Where: process-checklist.sh / CLAUDE.md
Expected: CLAUDE.md's Process Enforcement instructions tell the agent when to
run --start-feature, --start-uat, --start-phase3, --start-phase4 — I assumed
that was the complete list, and did all of Phase 1's work before discovering
phase1_architecture exists as a gated process.
Actual: `--start-phase1` exists (with 5 steps) but nothing in CLAUDE.md or the
User Guide's phase walkthrough says "run --start-phase1 when Phase 1 begins."
I found it by running --help after finishing the work. Step completion is
phase-agnostic so nothing broke, but a user could reach the Phase 1->2 commit
with the checklist untouched and be blocked confused at commit time.
Severity: Confusion
Resolution: documented-path (ran it late; steps completed against real artifacts)
Time lost: 4

---

### ISSUE-006 — Generated CI fails on first push: phase-gate protection check cannot work in GitHub Actions
When: 2026-08-02 ~10:05 | Where: first CI run / .github/workflows/ci.yml "Governance - Phase gate check"
Expected: README: "CI pipelines are working GitHub Actions workflows that run
immediately on first push." Builder's Guide says the Phase 1->2 backstop
verifies branch protection and its remediation is `scripts/check-gate.sh
--repair` / `--preflight`.
Actual: First CI run FAILED at "Governance - Phase gate check" with
"[FAIL] Phase 1->2 backstop: protection verification failed". Locally the
same check passes ("protection verified for personal mode") and
`check-gate.sh --preflight` reports Ready. Root cause: inside GitHub Actions
the gate step has no authenticated API access (no GH_TOKEN env is set in the
generated workflow, and the default workflow token cannot read branch
protection settings anyway), so the protection backstop can NEVER pass in CI
on this configuration — the framework's own default happy path (public
personal GitHub repo created by init.sh itself).
The remediation the gate prints does not help: there is no drift to repair.
A real junior would be hard stuck: red CI, a remediation command that
reports everything is fine, and no doc section connecting the two.
Severity: Major (proceeded via the documented SOIF_PHASE_GATES=warn knob,
but only because the User Guide's Tier-1 table mentions it — a junior would
be unlikely to connect that variable to this failure)
Resolution: documented-path (set SOIF_PHASE_GATES: "warn" as env on the CI
phase-gate step only; local gates remain strict; commented in ci.yml)
Time lost: 20

### SMOOTH — Phase 2 init gates behaved exactly as documented
When: 2026-08-02 ~09:55-10:05 | Where: Phase 2 initialization
- Framework blocked my scaffold commit with the documented "Phase 2
  initialization not verified" message; `--verify-init` auto-detected 5/6
  steps and told me exactly which one to mark manually. Recovery UX is good.
- Hook verifications from the init checklist both PROVED out: gitleaks
  blocked a staged fake AWS key ([BLOCKED] + exit 1) and BL-125 blocked a
  deliberately failing staged test. Confidence-inspiring.
- npm install with --save-exact + generated .gitignore + lockfile all fine.

### ISSUE-007 — process-checklist --status shows "Progress: 9/7 steps" for Phase 2 Initialization
When: 2026-08-02 ~10:02 | Where: scripts/process-checklist.sh --status
Expected: A step count like 7/7.
Actual: "Verified: true / Progress: 9/7 steps" — the auto-verifier counts
steps (e.g. remote_repo_created, branch_protection_configured) that are not
in the 7-step template, so the numerator exceeds the denominator.
Severity: Minor (cosmetic; verification itself worked)
Resolution: documented-path
Time lost: 1
