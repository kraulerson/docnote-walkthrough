# Solo Orchestrator — Project Intake Template

## Version 1.0

---

## Document Control

| Field | Value |
|---|---|
| **Document ID** | SOI-004-INTAKE |
| **Version** | 1.0 |
| **Classification** | Project Initialization Template |
| **Date** | 2026-08-02 |
| **Companion Documents** | SOI-002-BUILD v1.0 (Builder's Guide), SOI-003-GOV v1.0 (Enterprise Governance Framework) |

---

## Purpose

This template collects every decision, constraint, and context variable that the AI agent needs to execute the Solo Orchestrator methodology with maximum autonomy. Fill it out completely before starting Phase 0. Incomplete sections will force the agent to stop and ask — every blank field is a round-trip.

### How This Document Flows Into the Process

The Intake is the primary input to the Builder's Guide. Here's where each section goes:

| Intake Section | Consumed By | Purpose |
|---|---|---|
| **1. Project Identity** | Phase 0 initialization, Platform Module selection | Names the project, sets the track, identifies which Platform Module the agent loads |
| **2. Business Context** | Phase 0 Steps 0.1-0.2 | The agent validates and expands this into the FRD and User Journey — it doesn't re-discover it |
| **3. Constraints** | Phase 0 and Phase 1 | Timeline, budget, and user targets constrain architecture and scope |
| **4. Features & Requirements** | Phase 0 Steps 0.1, 0.4 | The agent expands logic triggers and failure states, flags gaps, produces the Manifesto |
| **5. Data & Integrations** | Phase 0 Step 0.3, Phase 1 Step 1.4 | Drives the Data Contract, data model design, and third-party integration architecture |
| **6. Technical Preferences** | Phase 1 Steps 1.2-1.6 | Hard constraints and preferences feed directly into architecture proposals; Competency Matrix determines where automated tooling is mandatory |
| **7. Revenue Model** | Phase 0 Step 0.5, Phase 1 Step 1.2 | Hosting/distribution cost ceiling constrains architecture; pricing model shapes feature decisions |
| **8. Governance Pre-Flight** | Enterprise Governance Framework pre-conditions | Maps directly to the organizational approvals required before Phase 0 can begin |
| **9. Accessibility & UX** | Phase 1 Step 1.5, Phase 3 Step 3.4 | Architectural constraints from Day 1, not Phase 3 afterthoughts |
| **10. Distribution & Operations** | Phase 4, Platform Module | Distribution channels, monitoring, update strategy — platform-dependent |
| **11. Known Risks** | Phase 1 Step 1.3 | Additional inputs for the Iron Logic Stress Test |

The more complete the Intake, the more autonomously the agent can work. Where the Intake is vague or incomplete, the Builder's Guide prompts shift from validation to discovery — the agent will ask targeted questions instead of proposing options it doesn't have enough context to evaluate.

### How to Use This Document

You can fill this out using the **intake wizard** (`bash scripts/intake-wizard.sh`) or by **editing this file directly**. The wizard offers an interactive walkthrough and tracks your progress. Either approach works, but be aware of the difference:

1. Fill out every section. Mark fields N/A where they genuinely don't apply — don't leave blanks.
2. For organizational deployments, complete the Governance Pre-Flight (Section 8) before starting. This section maps to the Enterprise Governance Framework pre-conditions.
3. Once complete, provide this document to the AI agent at the start of Phase 0 with the instruction: "This is the Project Intake. Use it as the primary constraint for all phases. Do not suggest features, architectures, or tooling that contradict it."
4. The agent will use this to generate the Product Manifesto (Phase 0) and Project Bible (Phase 1) without stopping to ask for information that should already be decided.

> **If editing manually:** Section 1 fields (project name, platform, language, track) and Section 8 (governance mode) were used during init to generate your CI pipeline, release pipeline, platform module, and phase gate rules. If you change these fields here, you must also run the reconfigure script to update the generated files:
>
> ```bash
> bash scripts/reconfigure-project.sh --field <field> --old <old_value> --new <new_value>
> ```
>
> Supported fields: `name`, `platform`, `language`. The intake wizard handles this automatically — manual editing does not.
>
> For `track` or `deployment` changes use `scripts/upgrade-project.sh` instead (it enforces the governance pre-conditions; reconfigure-project does not).

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Project name** | docnote-walkthrough |
| **Project codename** (if different from public name) | DocNote |
| **One-sentence description** | A web app that views Word documents read-only with text highlighting and notes attached to highlights |
| **Project track** | Light |
| **Platform type** | web |
| **Platform Module** | SOI-PM-WEB |

> **Mobile (SOI-PM-MOBILE v1.0)** — The mobile Platform Module covers React Native (Expo), Flutter, Swift (iOS), and Kotlin (Android) with architecture patterns, offline-first guidance, code signing, app store submission, and testing.
| **Target platforms** | Web (last 2 versions of Chrome, Firefox, Safari, Edge; desktop browsers) |
| **Is this a personal project or organizational deployment?** | Personal |
| **Repository URL** (if already created) | https://github.com/kraulerson/docnote-walkthrough |
| **Git host** | github |
| **Repository visibility** | public |

---

## 2. Business Context

### 2.1 The Problem

_What specific problem does this solve? Be concrete — not "improve efficiency" but "the finance team spends 6 hours/week manually reconciling invoices from 3 systems into a single spreadsheet."_

```
People reviewing Word (.docx) documents — drafts, class readings, contracts —
want to highlight passages and attach short notes WITHOUT modifying the file
and without needing Microsoft Word installed. Today they either open the file
in an editor and risk accidental changes, or keep notes in a separate file and
lose the connection between each note and the passage it refers to. There is
no lightweight, local, read-only way to mark up a .docx and have the markup
still be there the next time the same document is opened.
```

### 2.2 Who Has This Problem

| Field | Value |
|---|---|
| **Primary user persona** | Student / knowledge worker reviewing .docx documents. Basic computer skills (can use a browser and a file picker). Goal: read a document, mark important passages, and attach short thoughts to them, without changing the file. |
| **Secondary personas** (if any) | N/A |
| **How do they solve this problem today?** | Open the file in Word/LibreOffice and use highlight + comments (which edits the file and requires the software), or keep notes in a separate text file. |
| **What's wrong with the current solution?** | Editing tools risk accidental modification of the document; they require installed office software; separate note files lose the link between a note and its exact passage. |

### 2.3 Success Criteria

_How will you know this project succeeded? Define measurable outcomes, not feelings._

| Metric | Target | How Measured |
|---|---|---|
| Time to open and read a typical .docx (≤2 MB) | Text visible in <3 seconds | Automated test with fixture document + manual timing |
| Annotation persistence | Highlights and notes reappear after full browser restart for the same document, 100% of tested cases | Automated persistence tests + manual UAT |
| Note-to-passage navigation | Clicking a note scrolls to and indicates its highlight in 1 click, 100% of tested cases | Automated tests + manual UAT |
| Document integrity | The original .docx file is never modified by the app (app has no write path to the file) | Code review + test that file bytes are untouched |

### 2.4 What This Is NOT

_List 3-5 things that sound related but are explicitly out of scope. This prevents the agent from scope-creeping into adjacent problems._

1. Not a document editor — the document text is never modified.
2. Not a cloud or collaboration tool — no accounts, no server, no sharing.
3. Not a general document viewer — .docx only (no PDF, .doc, .odt, etc.).
4. Not a document manager/library — one document open at a time via file picker.
5. Not an export/reporting tool — annotations live in the app only (MVP).

---

## 3. Constraints

### 3.1 Timeline

| Field | Value |
|---|---|
| **Target MVP date** | 2026-08-16 (2 weeks from start) |
| **Hard deadline?** | No — personal project; if missed, keep going. |
| **Orchestrator availability** | Concentrated sessions, roughly 10-15 hours/week while the project is active. |
| **Blocked time or interleaved?** | Blocked — dedicated working sessions. |

### 3.2 Budget

| Field | Value |
|---|---|
| **Monthly infrastructure ceiling** | $0/month — free tiers only (static hosting at most). |
| **One-time budget** (if any) | $0 — no domain, no paid tools. |
| **AI subscription** | Already have — Claude Max (consumer tier). |
| **Who approves spending?** | Self |

### 3.3 Users

| Field | Value |
|---|---|
| **Users at launch** | 1 (the developer) |
| **Users at 6 months** | <10 (friends/classmates at most) |
| **Users at 12 months** | <10 |
| **Internal only or external?** | Internal (personal use) |
| **Geographic distribution** | Single user, local machine. No data sovereignty concerns — data never leaves the browser. |

---

## 4. Features & Requirements

### 4.1 Must-Have Features (MVP)

_For each feature, define the business logic trigger and the failure state. If you can't articulate "If [condition], the system must [action]" — the feature isn't defined well enough to build._

| # | Feature | Business Logic Trigger | Failure State |
|---|---|---|---|
| 1 | Open & render .docx read-only | If the user picks a .docx file via the file picker, the system must parse it client-side and output the document text as a read-only rendered view. | If the file is not a valid .docx (wrong type, corrupt, or empty), show a specific error ("This file could not be opened as a .docx") and return to the picker state. If the file exceeds 10 MB, reject with a size-limit message. The app never crashes on bad input. |
| 2 | Apply highlight (≥3 colors) | If the user selects text in the rendered document and picks one of at least 3 highlight colors, the system must record the highlight and output the selected range visibly highlighted in that color. | If the selection is empty or collapses to nothing, the highlight action is unavailable (no-op with disabled controls). If the selection cannot be anchored to document text (e.g., selection spans UI chrome), show "Select text inside the document to highlight" and apply nothing. |
| 3 | Remove highlight | If the user activates an existing highlight and chooses Remove, the system must delete that highlight (and its attached note, after confirmation if a note exists) and output the text restored to normal appearance. | If the highlight no longer exists in storage (stale state), refresh the annotation layer and show "That highlight was already removed." Removal is idempotent — no crash on double-remove. |
| 4 | Attach / edit / delete a note on a highlight | If the user activates a highlight and enters note text (1-1000 chars), the system must save the note attached to that highlight and output it in the side panel. Editing replaces the text; deleting removes the note but keeps the highlight. | If note text is empty on save, keep the editor open with "Note cannot be empty" (user may cancel instead). If text exceeds 1000 chars, block save with a character-count message. If the target highlight was removed meanwhile, show "The highlight for this note no longer exists" and discard gracefully. |
| 5 | Notes side panel with click-to-jump | If a document has notes, the system must list them in a side panel (in document order); if the user clicks a note, the system must scroll the document to its highlight and output a brief visual indication (not color-only) of the target highlight. | If the note's highlight cannot be located in the rendered document (anchor lost), keep the note listed, mark it visibly as "unlocated," and do not scroll. Empty state: panel shows "No notes yet." |
| 6 | Local persistence per document | If the user re-opens the same document (same content) in the same browser, the system must restore all highlights and notes from localStorage and output them exactly as they were. | If localStorage is unavailable (private mode/blocked), the app works for the session and shows a one-time warning "Annotations will not be saved." If stored data is corrupt or its version is unknown, discard it safely with a message "Saved annotations could not be loaded" — never crash. If storage quota is exceeded on save, warn the user that the latest change was not saved. |

### 4.2 Should-Have Features (Post-MVP v1.1)

_Features that enhance the MVP but are not required for first usable release._

1. Export annotations (notes + highlighted passages) to a text/Markdown file
2. Search within the document text
3. Filter/sort the notes panel (by color, by position)
4. Keyboard shortcuts for highlight colors
5. N/A

### 4.3 Will-Not-Have Features (Explicit Exclusions)

_Things that sound related but the agent must NOT build or suggest._

1. Editing document text (any write operation on the document)
2. Accounts, login, server-side anything, or cloud sync
3. Support for formats other than .docx (no PDF, .doc, .odt, .rtf)
4. Real-time collaboration or sharing of annotations
5. Mobile apps / native apps — desktop web browser only

---

## 5. Data & Integrations

### 5.1 Data Inputs

_What data does the user provide or the system ingest?_

| Input | Data Type | Validation Rules | Sensitivity | Required? |
|---|---|---|---|---|
| .docx document file | Binary file (ZIP + WordprocessingML) | Must be a readable .docx; ≤10 MB; parsed entirely client-side; never uploaded anywhere | Internal (user's private documents; never leave the browser) | Yes |
| Highlight (range + color) | App data (JSON) | Range must anchor to existing document text; color must be one of the defined palette | Internal | Yes (core function) |
| Note text | Text | 1-1000 characters; plain text only (no HTML rendering of note content) | Internal | No (optional per highlight) |

**Sensitivity classifications:** Public, Internal, Confidential, PII, Financial, Health/Medical, Regulated

#### 5.1.1 Project-Level Data Classification (Phase 1 Gate — tier-crosscheck-6)

The **highest** classification across all rows in §5.1 is the project-level `data_classification`. It is recorded in `.claude/process-state.json::phase1_artifacts` and enforced as a Phase 1→2 hard gate by `scripts/check-phase-gate.sh`. Per docs/governance-framework.md § VII (Mandatory ZDR gate, line 299), projects classified **Internal or higher** must use a ZDR or self-hosted LLM deployment path — `phase1_artifacts.zdr_attested` (or a documented `phase1_artifacts.zdr_attestation_reason` exception) is required before Phase 1→2.

| Field | Value (one of) |
|---|---|
| **Project-level data_classification** | `internal` |
| **ZDR attested (Zero Data Retention or self-hosted LLM)** | `false` |
| **ZDR attestation reason** _(required when `zdr_attested=false` AND classification > public)_ | Personal project on a consumer AI subscription (no ZDR available). End-user documents are processed entirely client-side in the user's browser and are NEVER transmitted to any server or to the AI provider. Development and testing use synthetic fixture documents only, so no Internal-classified data is ever sent to the LLM. Risk accepted by the Orchestrator (self). |

These three fields are captured by `scripts/intake-wizard.sh` Section 5.5, and can be corrected after-the-fact with `scripts/reconfigure-project.sh --field data_classification --new <value>` / `--field zdr_attested --new true|false`.

### 5.2 Data Outputs

_What does the user receive from the system?_

| Output | Format | Latency Expectation |
|---|---|---|
| Rendered read-only document view | HTML in the browser | <3 seconds for a ≤2 MB document |
| Notes side panel | HTML list, document order | Instant (<100 ms updates) |
| Persisted annotations | JSON in browser localStorage | Saved within 1 second of a change |

### 5.3 Third-Party Integrations

_Every external API or data source the application needs to connect to._

| Service | What Data We Send/Receive | Auth Method | Fallback if Unavailable | Existing Account? |
|---|---|---|---|---|
| None — the app makes no network calls at runtime | N/A | N/A | N/A | N/A |

### 5.4 Data Persistence

| Question | Answer |
|---|---|
| **What data must persist across sessions?** | Highlights and notes, keyed to the document they belong to (so re-opening the same document restores them). |
| **What data can be ephemeral (browser/device only)?** | The document content itself — it is re-read from the user's file each session and never stored by the app. UI state (current scroll position, selected color) is ephemeral. |
| **Expected data volume at 12 months** | Small — well under the ~5 MB localStorage budget (text annotations only). |
| **Data retention requirements** | Keep until the user clears them (in-app removal or clearing browser storage). No regulatory requirements. |
| **Backup requirements** | None — browser localStorage only, accepted risk for a personal tool. |

---

## 6. Technical Preferences

### 6.1 Orchestrator Technical Profile

| Field | Value |
|---|---|
| **Languages you know well** | JavaScript/TypeScript (working knowledge, <1 year professional experience) |
| **Frameworks you've used** | React (small projects/tutorials), Express (tutorial level) |
| **Languages/frameworks you're willing to learn** | Anything TypeScript-adjacent; testing tools (Vitest/Jest, Playwright) |
| **Languages/frameworks you refuse to use** | None |
| **Database experience** | Minimal — some SQLite tutorials. (This project needs no database.) |
| **DevOps experience level** | Basic — can follow docs to deploy to a PaaS/static host; no CI experience before this project |
| **Mobile development experience** | None |

### 6.2 Competency Matrix

_For each domain, answer honestly: "Can I look at the AI's output and reliably determine if it's correct?"_

| Domain | Self-Assessment | Automated Tooling Required? |
|---|---|---|
| Product/UX Logic | Partially | Yes |
| Frontend Code (HTML/CSS/JS) | Partially | Yes |
| Backend / API Design | N/A (no backend in this project) | N/A |
| Database Design & Queries | N/A (no database in this project) | N/A |
| Security (Auth, Injection, IDOR) | No | Yes |
| DevOps / Infrastructure | No | Yes |
| Accessibility (WCAG) | No | Yes |
| Performance Optimization | Partially | Yes |
| Mobile (iOS/Android) | N/A (web only) | N/A |

_Every "Partially" or "No" means automated tooling is mandatory in Phase 3. The agent will factor this into architecture selection and testing strategy._

### 6.3 Development Environment

| Field | Value |
|---|---|
| **Primary development machine** | macOS (Darwin 25.4.0, Apple Silicon) |
| **Secondary machines** (if any) | None |
| **IDE/Editor** | VS Code |
| **Docker available?** | Yes (Colima) |
| **Node.js version** | 25.9.0 |
| **Python version** (if applicable) | N/A |
| **Claude Code installed?** | Yes |
| **AI subscription tier** | Claude Max (consumer) |

### 6.4 Architecture Preferences & Constraints

_These are preferences, not mandates. The agent will respect hard constraints but may recommend against soft preferences with justification. Fields vary by platform — fill in what applies to your project type._

**All Platforms:**

| Field | Value | Hard Constraint or Preference? |
|---|---|---|
| **Primary language** | TypeScript | Hard constraint |
| **Data storage** | Browser localStorage only (no server, no database) | Hard constraint |
| **Authentication** | None — no accounts of any kind | Hard constraint |

**Web Applications:**

| Field | Value | Hard Constraint or Preference? |
|---|---|---|
| **Frontend framework** | No preference — recommend something simple and well-documented (I know a little React) | Preference |
| **Backend framework** | None — the app must run fully client-side with no server component | Hard constraint |
| **Hosting** | GitHub Pages (free static hosting) or plain local usage | Preference |

**Desktop Applications:**

| Field | Value | Hard Constraint or Preference? |
|---|---|---|
| **UI framework** | N/A | |
| **Packaging format** | N/A | |
| **Auto-update strategy** | N/A | |
| **Offline requirement** | N/A | |

**Mobile Applications:**

| Field | Value | Hard Constraint or Preference? |
|---|---|---|
| **Framework** | N/A | |
| **Minimum OS version** | N/A | |
| **App store distribution** | N/A | |
| **Offline requirement** | N/A | |
| **Device API requirements** | N/A | |
| **Biometric authentication** | N/A | |

**Cross-Cutting:**

| Field | Value | Hard Constraint or Preference? |
|---|---|---|
| **Monorepo or separate repos?** | Single repo (this one) | Preference |
| **Web + Desktop, Web + Mobile, or single platform?** | Single platform: web | Hard constraint |

### 6.5 Existing Infrastructure to Integrate With

_Anything the application must connect to or comply with._

| System | Details | Integration Required? |
|---|---|---|
| **SSO / Identity Provider** | N/A | N/A |
| **Logging / SIEM** | N/A | N/A |
| **Monitoring** | N/A | N/A |
| **Data Warehouse** | N/A | N/A |
| **Backup Infrastructure** | N/A | N/A |
| **CI/CD Platform** | GitHub Actions (generated by init) | Yes |
| **Repository Platform** | GitHub | Yes |
| **Other** | N/A | |

---

## 7. Revenue Model (Standard+ Track — skip for internal tools)

| Field | Value |
|---|---|
| **Pricing model** | N/A — Light track personal tool, no revenue |
| **Target price point** | N/A |
| **Competitive price range** | N/A |
| **Per-user cost estimate** (hosting, API calls, storage) | N/A |
| **Break-even user count** | N/A |
| **Hosting cost ceiling at launch** | N/A |
| **Hosting cost ceiling at 1,000 users** | N/A |
| **Hosting cost ceiling at 10,000 users** | N/A |

---

## 8. Governance Pre-Flight (Organizational Deployments Only)

_Skip this section for personal projects. For organizational deployments, every field must be completed or marked "In Progress" with an expected completion date. Phase 0 cannot begin until all "Blocking" items are resolved._

**Governance Mode:** N/A — Personal project (Section 8 skipped per instructions above)

> **If POC mode:** This project operates under POC constraints — no production deployment, no real user data, no external users. Deferred pre-conditions must be resolved before production. Upgrade with: `scripts/upgrade-project.sh --to-production`

### 8.1 Pre-Conditions

N/A — personal project.

### 8.2 Approval Authorities

N/A — personal project (self-approval at all gates, recorded in APPROVAL_LOG.md).

### 8.3 Escalation Chain

N/A — personal project.

### 8.4 Compliance Screening

N/A — personal project.

### 8.5 Exit Criteria

| Outcome | Definition | Decision Maker |
|---|---|---|
| **Success** (proceed to v1.1 ideas) | MVP released: all 6 must-have features working, tests green, all framework gates passed | Self |
| **Conditional** (proceed with modifications) | MVP works but some framework gates needed documented workarounds | Self |
| **Failure** (stop) | Core rendering or persistence proves infeasible client-side within scope | Self |

---

## 9. Accessibility & UX Constraints

| Field | Value |
|---|---|
| **Accessibility requirements** | WCAG AA (per User Guide: minimum for any user-facing application) |
| **Color vision deficiency considerations** | Yes — highlight colors are user-chosen labels, but the UI must never rely on color alone for meaning: active-highlight indication, note markers, and controls need shape/text/icon cues too. |
| **Supported browsers** | Last 2 versions of Chrome, Firefox, Safari, Edge |
| **Mobile responsive required?** | No (desktop browsers only) |
| **Supported devices** | Desktop only |
| **Branding / style guide** | None — agent's discretion, keep it simple and readable |
| **Dark mode required?** | No |

---

## 10. Distribution & Operations Preferences

**All Platforms:**

| Field | Value |
|---|---|
| **Notification preferences for alerts** | N/A — no runtime infrastructure to alert on (client-side app) |
| **Uptime expectation** | Best effort |
| **Environment strategy** | Production only (static site; local dev server during development) |

**Web Applications:**

| Field | Value |
|---|---|
| **Domain name** (if already acquired) | None — default github.io URL is fine |
| **SSL certificate** | Platform-provided auto-SSL (GitHub Pages) |
| **Maintenance window preferences** | None |

**Desktop Applications:**

| Field | Value |
|---|---|
| **Distribution channels** | N/A |
| **Code signing** | N/A |
| **Code signing certificates** (if required) | N/A |
| **Auto-update mechanism** | N/A |
| **Minimum supported OS versions** | N/A |
| **Installer format preferences** | N/A |

**Mobile Applications:**

| Field | Value |
|---|---|
| **Distribution** | N/A |
| **Developer accounts** | N/A |
| **Beta testing** | N/A |

---

## 11. Known Risks & Concerns

_Anything the agent should know that doesn't fit elsewhere. Technical debt you're aware of going in, political sensitivities, dependencies on other projects, timing constraints, previous failed attempts at solving this problem, etc._

```
1. The Orchestrator is a junior developer (<1 year professional experience).
   Reviews at decision gates will be honest but shallow in security,
   accessibility, and DevOps — the Competency Matrix reflects this; prefer
   conservative, well-documented choices everywhere.
2. Rendering .docx in a browser is the riskiest technical area. Scope is
   TEXT rendering — perfect visual fidelity (images, tables, complex layout)
   is not required for MVP; readable text with paragraph structure is.
3. Anchoring highlights to text ranges so they survive re-rendering and
   re-opening is known to be tricky; the architecture phase should treat
   anchor stability as a first-class design problem.
4. Browser localStorage is capped (~5 MB) and can be disabled; the app must
   degrade gracefully (documented in Feature 6 failure state).
5. This project is also a framework walkthrough — WALK-*.md files in the repo
   log the framework experience and are committed as documentation.
```

---

## 11.5. Testing & Bug Tracking

| Field | Value |
|---|---|
| **Testing interval** | Every 2 features (default) |
| **Bug tracking tool** | BUGS.md |
| **Human tester count** | 1 (the developer) |
| **Beta tester coordination** (if >1 tester) | N/A |
| **Bug severity SLAs** (Full UAT level only) | N/A (Light track defaults: SEV-1 24h, SEV-2 7d, SEV-3 best effort) |

> **How this is used:** The agent pauses construction every N features to run a UAT testing session. Agent testers run automated, exploratory, and cross-platform tests in parallel while you test manually. Bugs are compiled, triaged, and fixed before construction resumes. See Steps 2.7-2.9 in the Builder's Guide.

---

## 12. Tooling Configuration

> This section is auto-populated by `init.sh` based on the tool installation matrix. It records what was installed, what needs manual setup, and what is deferred to later phases. Claude reads this to understand the available tooling environment.
>
> If this section is empty, run `init.sh` or manually populate `.claude/tool-preferences.json`.

<!-- AUTO-GENERATED BY INIT.SH — do not edit above this line -->

---

## 13. Agent Initialization Prompt

_Once this template is complete, provide it to the AI agent at the start of Phase 0 along with the Builder's Guide. Copy and customize the bracketed sections._

_The Builder's Guide contains dual-path prompts for Phase 0 and Phase 1 — one for Intake-first (validation and expansion) and one for conversational discovery (without Intake). By providing this Intake, you are activating the Intake-first path. The agent will validate, expand, and challenge your inputs rather than discovering them from scratch._

```
You are the AI execution layer for a Solo Orchestrator project. I am the
Orchestrator. I define intent, constraints, and validation. You provide
architecture, code, and documentation within the constraints I set.

ATTACHED:
1. Project Intake Template (this document) — your primary constraint
2. Solo Orchestrator Builder's Guide v1.0 — your process reference
3. Platform Module: WEB — your platform-specific
   reference for architecture, tooling, testing, and distribution

DOCUMENT RELATIONSHIP:
- The Intake is the DATA SOURCE. It contains my decisions, constraints,
  requirements, technical profile, and (if organizational) governance
  pre-conditions.
- The Builder's Guide is the PROCESS. It defines the phases, steps,
  quality gates, and remediation procedures you follow.
- The Platform Module is the PLATFORM IMPLEMENTATION GUIDE. When the
  Builder's Guide shows a ⟁ PLATFORM MODULE callout, reference the
  attached Platform Module for platform-specific instructions.
- Where the Builder's Guide shows "With Intake" prompts, use those.
  They direct you to validate and expand my Intake data rather than
  re-discovering it.

RULES:
- The Project Intake is the governing constraint. Do not suggest features,
  architectures, or tooling that contradict it.
- The Builder's Guide defines the phase-by-phase process. Follow it.
- The Platform Module defines platform-specific implementation. Follow it
  at every ⟁ callout point.
- If the Intake specifies a hard constraint, respect it absolutely.
- If the Intake specifies a preference, you may recommend against it with
  justification, but defer to my decision.
- If the Intake leaves a field as "no preference," make a recommendation
  based on the constraints and explain your reasoning.
- If the Intake leaves a field blank or incomplete, flag it immediately
  and ask for the specific missing information before proceeding past
  the step that requires it.
- For any domain where my Competency Matrix (Section 6.2) says "Partially"
  or "No," default to the most conservative, well-documented option and
  ensure automated validation tooling covers that domain.
- Do not add features not in the MVP Cutline (Section 4.1).
- Do not suggest dependencies without justification.
- Every feature must have tests before implementation.
- Flag any conflict between the Intake constraints and technical feasibility
  immediately — do not silently work around it.

ACCESSIBILITY (from Section 9):
WCAG AA. Color vision deficiency: never rely on color alone for meaning.
Highlight colors are user-chosen labels, but active-highlight indication,
note markers, and all controls must use shape, position, text labels,
patterns, or icons in addition to color.

PROJECT TRACK: Light
PLATFORM: Web
TARGET PLATFORMS: Web — last 2 versions of Chrome, Firefox, Safari, Edge (desktop)

BEGIN: Execute Phase 0, Step 0.1 using the "With Intake — Validation
Prompt" path from the Builder's Guide. Use Sections 2 and 4 of the
Intake as the primary data source. Generate the Functional Requirements
Document by expanding my business logic triggers and failure states.
Where I've been vague, make it specific and flag for my review. Where
I've been contradictory, identify the contradiction and ask me to resolve
it. Where I've omitted an implicit dependency (e.g., features that
require authentication but I didn't list authentication), flag it as a
recommended addition.
```

---

## Checklist Before Starting

- [x] Every field is filled in or explicitly marked N/A
- [x] Must-Have features all have business logic triggers (If X, then Y)
- [x] Must-Have features all have failure states defined
- [x] Will-Not-Have list has at least 3 items
- [x] Data sensitivity classifications are assigned to all inputs
- [x] Competency Matrix is completed honestly
- [x] Budget constraints are realistic (not aspirational)
- [x] Timeline includes Orchestrator availability, not just calendar dates
- [x] For organizational deployments: all Section 8 "Blocking" items are Complete (N/A — personal)
- [x] Success/failure exit criteria are defined and a decision-maker is named
- [x] This document has been saved as `PROJECT_INTAKE.md` in the project repository

---

## Document Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-04-02 | Initial release. |
| 1.0 (filled) | 2026-08-02 | Intake completed for DocNote (docnote-walkthrough) by the Orchestrator with AI assistance. |

---

## Tooling Configuration

> Auto-generated by init.sh. Full machine-readable config: `.claude/tool-preferences.json`

**Resolved for:** Darwin / web / typescript / light track

### Installed
| Tool | Category | Version |
|---|---|---|
| Git | version_control | 2.50.1 |
| jq | json_processor | jq-1.7.1-apple |
| Node.js | runtime | 25.9.0 |
| Docker | containerization | 29.3.1 |
| Colima | containerization | 0.10.1 |
| GPG | commit_signing | 2.5.20 |
| Semgrep | SAST Scanner | 1.157.0 |
| gitleaks | Secret Detection | 8.30.1 |
| Snyk CLI | Dependency Scanner | 1.1304.1 |
| Claude Code | ai_agent | 2.1.220 (Claude Code) |
| Development Guardrails for Claude Code | dev_framework | 0396a1a |
| Superpowers | claude_plugin | installed |
| Context7 MCP | mcp_server | configured |
| Qdrant MCP | mcp_server | configured |
