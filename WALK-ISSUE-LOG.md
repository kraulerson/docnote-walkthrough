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
