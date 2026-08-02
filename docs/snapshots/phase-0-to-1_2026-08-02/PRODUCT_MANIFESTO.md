# Product Manifesto — DocNote (docnote-walkthrough)

<!--
  This document is the foundational artifact produced during Phase 0.
  It defines what the product does, who it serves, and what is in/out of scope.
  It is the north star for all subsequent phases.

  Completion gates entry to Phase 1. All 8 numbered sections must be filled out.
  Appendices are track-conditional — see inline notes.

  Do not alter headings or remove sections. Add content within the placeholders.
-->

**Status:** Approved
**Approved By:** Karl (Orchestrator, self-review — personal project)
**Approval Date:** 2026-08-02
**Phase Gate:** Phase 0 → Phase 1

---

## 1. Product Intent

<!-- Source: Phase 0 Step 0.4. See builders-guide.md for the full prompt and review checklist. -->

DocNote is a client-side web application that lets a single reader open a Word (.docx) document read-only in a desktop browser, highlight passages in at least three colors, and attach short text notes to those highlights — with all annotations persisting locally (browser localStorage) so they reappear when the same document is opened again. It exists because people reviewing .docx files today must either edit the file in office software (risking accidental changes and requiring a Word installation) or keep disconnected notes in a separate file. DocNote's promises: the document is never modified, nothing ever leaves the browser, and your markup is still there tomorrow. Architecture that contradicts this statement is rejected. Features not serving this intent are not built.

---

## 2. Functional Requirements

<!-- Source: Phase 0 Step 0.1. See builders-guide.md for the full prompt and review checklist. -->

Full detail (expanded triggers, failure states, rationale): `docs/phase-0/frd.md`.

### Must-Have (MVP)

- **Open & render .docx read-only:** If the user picks a .docx via the file picker, the system must parse it entirely client-side and output the document text as a scrollable read-only view (text-focused rendering; paragraph structure preserved). Failure state: invalid/corrupt/oversized (>10 MB) files are rejected with a specific error banner and the app returns to the picker state; the app never crashes on malformed input.
- **Apply highlight (≥3 colors):** If the user selects text inside the rendered document and picks one of at least 3 palette colors, the system must record a highlight anchored to that range and output it visibly in that color immediately. Failure state: empty/unanchorable selections disable or explain the action; selections intersecting an existing highlight are rejected with "Highlights cannot overlap" (MVP simplification, approved — see Q1).
- **Remove highlight:** If the user activates an existing highlight and chooses Remove, the system must delete it and output the text restored to normal, confirming first when an attached note would also be deleted. Failure state: removal is idempotent; stale highlights refresh the annotation layer with a notice.
- **Attach / edit / delete a note on a highlight:** If the user activates a highlight and enters note text (1-1000 chars), the system must save it attached to that highlight and output it in the side panel; edit replaces, delete removes the note but keeps the highlight. Failure state: empty or over-length notes block save with specific messages; notes whose highlight vanished are discarded gracefully with a message.
- **Notes side panel with click-to-jump:** If the document has notes, the system must list them in document order and, on click, scroll to the note's highlight with a non-color-only indication. Failure state: unanchorable notes remain listed and are visibly marked "unlocated."
- **Local persistence per document:** If the user re-opens a document with matching content (content-hash identity), the system must restore all highlights and notes from localStorage exactly as they were. Failure state: unavailable storage → session-only mode with a one-time warning; corrupt/unknown-version data → discarded safely with a message; quota exceeded → the unsaved change is reported.

### Should-Have (v1.1)

- Export annotations (notes + highlighted passages) to a Markdown file.
- In-document text search with match navigation.
- Notes panel filter (by color) and sort (by position or edit time).
- Keyboard shortcuts (number keys for colors, Esc to dismiss editors).

### Will-Not-Have

- **Editing document text:** read-only is the product's integrity guarantee.
- **Accounts / login / server / cloud sync:** local-only is a hard constraint; no server component exists.
- **Formats other than .docx:** no PDF, .doc, .odt, .rtf — deliberate scope control.
- **Real-time collaboration or annotation sharing:** single-user personal tool.
- **Mobile / native apps:** desktop web browsers only.

---

## 3. User Journeys

<!-- Source: Phase 0 Step 0.2. See builders-guide.md for the full prompt and review checklist. -->

Full journey map with Skeptical-PM failure analysis: `docs/phase-0/user-journey.md`.

### Persona

- **Who:** "Sam" — student / knowledge worker reviewing .docx documents (readings, drafts, contracts)
- **Skill Level:** Low-Medium — comfortable with a browser and file picker; not technical
- **Goal:** Mark important passages and attach short thoughts without changing the file or needing Word
- **Emotional State on Arrival:** Mid-task, possibly tired; wants zero setup and an obvious first action

### Success Path

1. **Open:** User sees a single clear "Open a .docx" action with the promise "Read-only — your file is never modified or uploaded." User picks a file. System renders the text read-only in <3 s with the document title shown.
2. **Highlight:** User sees the rendered text, selects a sentence. System shows a small toolbar with ≥3 labeled color swatches. User clicks a color. System highlights the range instantly.
3. **Note:** User clicks the highlight and adds a note (live character count, 1-1000 chars). System saves it and shows it in the side panel in document order.
4. **Return (next session):** User re-opens DocNote and picks the same file. System restores every highlight and note exactly as left — no save step ever existed.
5. **Navigate & manage:** User clicks a note in the panel; system scrolls to its highlight with an outline + brief emphasis (non-color-only). User edits/deletes notes and removes highlights (with confirmation when a note would be lost); panel and document stay consistent.

### Failure Recovery

- **Step 1:** Not a real .docx / corrupt / >10 MB → specific error banner, picker state preserved. No extractable text → "This document contains no readable text."
- **Step 2:** Selection outside the document → "Select text inside the document to highlight." Selection intersecting an existing highlight → "Highlights cannot overlap."
- **Step 3:** Empty note → save blocked, editor stays open, cancel available. Over 1000 chars → blocked with counter. Highlight removed meanwhile → graceful discard with message.
- **Step 4:** Private mode / storage blocked → one-time "Annotations will not be saved" warning, session-only. Changed document content → treated as a new document (annotations for the old version are not shown and not corrupted). Corrupt stored data → "Saved annotations could not be loaded," document still renders.
- **Step 5:** Lost anchor → note listed with a visible "unlocated" badge (icon + text), click does not scroll. Storage quota exceeded → "This change could not be saved (storage full)."

### Exit Points

Closing the tab or browser at any moment loses at most the in-flight keystroke: every committed change is already persisted (or the user was warned persistence is off). Re-entry is simply re-opening the same file — all state restores. No logout, no cleanup, no resume prompt needed.

---

## 4. Data Contracts

<!-- Source: Phase 0 Step 0.3. See builders-guide.md for the full prompt and review checklist. -->

Full contract: `docs/phase-0/data-contract.md`.

### Inputs

- **Document file:** Type: .docx (ZIP + WordprocessingML). Validation: must parse as .docx; ≤10 MB; processed entirely client-side, never transmitted. Sensitivity: Internal.
- **Highlight:** Type: anchored text range + palette color id. Validation: range must anchor to document text; color must be in palette; no intersection with existing highlights. Sensitivity: Internal.
- **Note text:** Type: plain text (UTF-8). Validation: 1-1000 chars; always stored/rendered as plain text, never interpreted as HTML. Sensitivity: Internal.
- **Document identity (derived):** Type: content hash of extracted text. Validation: deterministic, computed client-side; serves as the annotation storage key. Sensitivity: Internal.

### Transformations

- **T1:** .docx file → client-side parse (extract text + paragraph structure) → in-memory document model. Parse failure → error banner, picker state, no partial render.
- **T2:** Document model → read-only render → scrollable view.
- **T3:** Document model → content hash → document identity key.
- **T4:** Annotation actions → serialize versioned JSON → localStorage record keyed by identity. Quota/unavailable → in-memory only + warning.
- **T5:** localStorage record → validate schema version + re-anchor ranges → restored annotations. Corrupt → safe discard + message; unanchorable → "unlocated," never silently dropped.

### Outputs

- **Rendered document view:** Format: read-only HTML. Latency: <3 s for a ≤2 MB document.
- **Notes side panel:** Format: HTML list in document order. Latency: <100 ms updates.
- **Annotation set:** Format: versioned JSON in localStorage. Latency: saved within 1 s of a change.

### Third-Party Data

None — the application makes no network calls at runtime and integrates with no external services. (The .docx parsing library is a build-time dependency, not a runtime service.)

### State

- **Document content:** Ephemeral — memory only, never stored by the app (integrity guarantee).
- **Highlights + notes:** Persist — localStorage, versioned JSON, retained until the user deletes them.
- **Document identity key:** Persists as the localStorage key.
- **UI state (scroll, active color, open editors):** Ephemeral.

---

## 5. MVP Cutline

<!--
  This is a hard line. Features listed above this line ship first.
  Everything below this line goes to the Post-MVP Backlog.
  This cutline governs Phase 2 — features not above this line are not built.
  Do not move items above the line without Orchestrator approval and a recorded decision.
-->

**Above the line (MVP — ships first):**
- Open & render .docx read-only (file picker, client-side parse, ≤10 MB)
- Apply highlight in ≥3 colors to selected document text
- Remove highlight (with note-loss confirmation)
- Attach / edit / delete a note (1-1000 chars) on a highlight
- Notes side panel in document order with click-to-jump (non-color-only indication)
- Local persistence per document (content-hash identity, versioned localStorage, graceful degradation)

---

**CUTLINE — nothing below this line is built in Phase 2 without Orchestrator approval**

---

**Below the line (Post-MVP — see Section 6):**
- Export annotations to Markdown
- In-document text search
- Notes panel filter/sort
- Keyboard shortcuts for colors/editors

---

## 6. Post-MVP Backlog

<!--
  Items here are candidates, not commitments.
  Prioritized by user feedback after launch, not by this document.
  Do not assign sprints or dates to items in this section.
-->

- **Export annotations to Markdown** — justified if the user actually wants annotations outside the app (e.g., pasting into an essay).
- **In-document text search** — justified if browser find-in-page proves insufficient on real documents.
- **Notes panel filter/sort** — justified when a single document accumulates enough notes that document-order scanning is slow.
- **Keyboard shortcuts** — justified by observed repeated-highlighting sessions where mouse round-trips annoy.
- **"New version of an annotated document" detection** — justified if the changed-content fresh-view behavior (Q2) confuses in practice.
- **Storage housekeeping UI** — justified if orphaned annotation sets accumulate meaningfully (Q3).

---

## 7. Will-Not-Have List

<!-- Source: Phase 0 Step 0.1. See builders-guide.md for the full prompt and review checklist. -->

- **Editing document text:** the read-only guarantee is the product's core trust promise; any write path to the document is rejected.
- **Accounts, login, server components, cloud sync:** hard constraint — the app is fully client-side; nothing leaves the browser.
- **Formats other than .docx (PDF, .doc, .odt, .rtf):** deliberate simplification; other formats have different parsing problems and would dilute the MVP.
- **Real-time collaboration / annotation sharing:** single-user personal tool; collaboration implies servers, identity, and sync — all excluded.
- **Mobile / native apps:** desktop web browsers only (last 2 versions of Chrome, Firefox, Safari, Edge).

---

## 8. Open Questions

<!-- Source: Phase 0 Steps 0.1–0.3. See builders-guide.md for the full prompt and review checklist. -->

**Q1: Should overlapping highlights be allowed in MVP?**
- Context: Step 0.1 expansion introduced a "no overlapping highlights" simplification not present in the Intake; it materially reduces anchoring/rendering complexity.
- Options: (a) Reject intersecting selections with a clear message (simplest); (b) allow arbitrary overlap (complex rendering and note-attachment semantics).
- Decision needed by: Phase 0 gate
- Status: Resolved — (a) accepted by Orchestrator 2026-08-02. Overlap moves to Post-MVP consideration only if real usage demands it.

**Q2: What happens when a previously annotated document is re-opened with changed content?**
- Context: Content-hash identity (Step 0.3) means edited documents present as new documents; annotations for the old content silently don't appear.
- Options: (a) Fresh view, no message (MVP); (b) detect near-matches and offer migration (complex, error-prone).
- Decision needed by: Phase 0 gate
- Status: Resolved — (a) accepted by Orchestrator 2026-08-02. (b) recorded in Post-MVP Backlog.

**Q3: Does MVP need a storage-housekeeping UI (view/clear annotation sets for absent documents)?**
- Context: localStorage accumulates annotation sets keyed by hash; sets for discarded documents are invisible orphans.
- Options: (a) No UI in MVP — browser storage clearing is the escape hatch; (b) a simple "stored annotations" manager.
- Decision needed by: Phase 0 gate
- Status: Resolved — (a) accepted by Orchestrator 2026-08-02. (b) recorded in Post-MVP Backlog.

---

## Appendix A: Revenue Model & Unit Economics

<!-- Standard+ Track only. Skip for internal tools. Source: Step 0.5. See builders-guide.md for the full prompt and review checklist. -->

SKIPPED — internal tool, no revenue model required (Light track, personal project; Intake §7 is N/A).

---

## Appendix B: Orchestrator Competency Matrix

<!-- Source: Step 0.6. See builders-guide.md for the full prompt and review checklist. -->

Self-assessment of your ability to validate AI-generated output in each domain. Honest assessment here determines where human review is the control vs. where an automated tool is needed.

| Domain | Can I Validate? | If No: Automated Tool |
|---|---|---|
| Product / UX Logic | Partially | Manual review against this Manifesto + UAT sessions |
| Frontend / UI | Partially | ESLint + typecheck in CI; component tests |
| Backend / API | N/A (no backend) | — |
| Database | N/A (no database) | — |
| Security | No | Semgrep (pre-commit + CI), gitleaks, Snyk, ZAP DAST (Phase 3) |
| Build & Packaging | No | GitHub Actions CI pipeline (generated by init) on every push |
| Accessibility | No | Automated a11y tooling in Phase 3 (e.g., axe-core / Lighthouse a11y) |
| Performance | Partially | Lighthouse (installed by init) |
| Platform-Specific | Partially (web basics) | Cross-browser checks in UAT sessions |

No "No" domain lacks an automated tool — Security, Build, and Accessibility are all covered by installed/CI tooling per the table. Known gap: none accepted.

---

## Appendix C: Trademark & Legal Pre-Check

<!-- Standard+ Track only. Source: Step 0.7. See builders-guide.md for the full prompt and review checklist. -->

SKIPPED — internal tool, no trademark check required (Light track, personal project).

---

## Appendix D: Market Signal & Go/No-Go Evidence

<!--
  Source: Steps 1.1 / 1.1.5 (builders-guide.md). Required on Standard and
  Full tracks BEFORE committing to architecture; Light track fills the
  SKIPPED line instead. "At least one positive signal" means documented
  evidence someone else can re-fetch — not a gut feeling. The Phase 1→2
  gate checks this appendix exists and is non-placeholder on Standard+
  (WARN-first; check-phase-gate.sh # BL-102-MARKET-SIGNAL).
-->

SKIPPED — Light track / internal tool (Step 1.1.5 not required)
