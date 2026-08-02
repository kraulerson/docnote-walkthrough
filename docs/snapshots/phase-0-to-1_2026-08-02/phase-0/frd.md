# Functional Requirements Document — DocNote (docnote-walkthrough)

<!--
  Phase 0 Step 0.1 output. This document captures the full functional requirements
  before they are summarized into the Product Manifesto Section 2.

  Save as: docs/phase-0/frd.md

  This file preserves the detailed logic triggers, failure states, and rationale
  that the Manifesto summary may compress. Reviewers examine this for completeness;
  the Manifesto captures the approved result.
-->

**Date:** 2026-08-02
**Status:** Complete (expanded from PROJECT_INTAKE.md §2, §4 via the With-Intake validation prompt)

---

## Must-Have (MVP)

<!-- For each feature, specify:
  - Feature Name
  - Logic Trigger: If [condition], the system must [action] and output [result]
  - Failure State: What happens when this fails (error message, fallback, or explicit non-recovery)
  - Rationale: Why this is Must-Have rather than Should-Have
-->

| # | Feature | Logic Trigger | Failure State | Rationale |
|---|---------|--------------|---------------|-----------|
| 1 | Open & render .docx read-only | If the user picks a file via the file picker, then the app parses it entirely in the browser (no upload) → the document's text is rendered as a scrollable, read-only view with paragraph structure and headings preserved. Rendering is text-focused: images/tables may appear as simplified blocks or placeholders. | Invalid/corrupt/non-.docx file → error banner "This file could not be opened as a .docx" + return to picker state. File >10 MB → rejected with "File exceeds the 10 MB limit." Empty document → message "This document contains no readable text." The app never crashes on malformed input; parse errors are caught. | Without rendering there is no product. Read-only is the core promise (document integrity). |
| 2 | Apply highlight (≥3 colors) | If the user selects text inside the rendered document and picks one of ≥3 palette colors, then the app records a highlight anchored to that text range → the range is visibly highlighted in the chosen color immediately. | Empty/collapsed selection → highlight controls disabled (no-op). Selection not anchorable to document text (spans UI chrome or crosses out of the document) → message "Select text inside the document to highlight"; nothing applied. Overlapping an existing highlight → allowed only if ranges don't intersect; intersecting selection → message "Highlights cannot overlap" (MVP simplification). | Highlighting is feature #1 of the two product pillars. |
| 3 | Remove highlight | If the user activates an existing highlight (click) and chooses Remove, then the app deletes the highlight → the text returns to normal appearance. If the highlight has a note, a confirmation is required ("This will also delete its note"). | Stale state (highlight already gone) → refresh annotation layer + notice "That highlight was already removed." Removal is idempotent. Declining the confirmation leaves everything unchanged. | Reversibility is required for trust; a highlighter you can't undo defaces the reading copy. |
| 4 | Attach / edit / delete a note on a highlight | If the user activates a highlight and enters note text (1-1000 chars), then the app saves the note attached to that highlight → the note appears in the side panel in document order. Edit replaces text; delete removes the note but keeps the highlight. | Empty text on save → editor stays open with "Note cannot be empty" (cancel available). >1000 chars → save blocked with live character count. Target highlight removed meanwhile → "The highlight for this note no longer exists"; input discarded gracefully. | Notation is feature #2 of the two product pillars. |
| 5 | Notes side panel with click-to-jump | If the current document has notes, then the panel lists them in document order → clicking a note scrolls the document to its highlight and marks the target with a non-color-only indication (outline + brief emphasis). | Anchor lost after re-render → note stays listed, visibly marked "unlocated", click does not scroll. No notes → empty state "No notes yet." | Notes without navigation back to their passage recreate the "separate notes file" problem this product exists to solve. |
| 6 | Local persistence per document | If the user re-opens a document whose content matches a previously annotated document (content-based identity, e.g. hash), then the app restores all highlights and notes from localStorage → annotations appear exactly as before. | localStorage unavailable → session-only mode + one-time warning "Annotations will not be saved." Corrupt/unknown-version stored data → discarded safely with "Saved annotations could not be loaded." Quota exceeded on save → warning that the latest change was not saved. | Persistence between sessions is explicitly in the product definition; without it every reading session starts from zero. |

### Cross-feature validation (Step 0.1 checks)

- **Contradictions:** None found between features 1-6. Feature 3's note-deletion confirmation is consistent with Feature 4's delete semantics (deleting a note directly never asks about the highlight).
- **Implicit dependencies identified:**
  - Features 2-6 all depend on a stable **text-anchoring model** (how a highlight's range is stored so it can be re-attached on re-render/re-open). This is an architecture-level component, flagged for Phase 1.
  - Feature 6 depends on a **document identity** definition. Decision: identity = hash of the document's extracted text content, so a renamed but identical file keeps its annotations, and an edited file (changed content) intentionally does not resolve stale anchors (out of scope).
  - Feature 5 depends on Feature 4 (notes exist) and Feature 2 (highlights exist).
- **Will-Not-Have conflicts:** None. No Must-Have requires editing, a server, accounts, other formats, or collaboration.

---

## Should-Have (v1.1)

<!-- Specific enough to scope. Not "better UX" but "[specific capability]." -->

| # | Feature | Description | Deferred Because |
|---|---------|-------------|-----------------|
| 1 | Export annotations | Download notes + their highlighted passages as a Markdown file | MVP delivers value in-app; export is additive |
| 2 | In-document text search | Find text within the open document with match navigation | Browsers' find-in-page partially covers this |
| 3 | Notes panel filter/sort | Filter by highlight color; sort by position or edit time | Panel is small at MVP scale (personal use) |
| 4 | Keyboard shortcuts | Number keys for highlight colors, Esc to dismiss editors | Pointer flow must exist first |

---

## Will-Not-Have

<!-- At least 3 items. Explicit scope boundaries to prevent scope creep. -->

| # | Feature | Exclusion Rationale |
|---|---------|-------------------|
| 1 | Editing document text | Read-only is the product's integrity guarantee (Intake §2.4, success criterion 4) |
| 2 | Accounts / login / server / cloud sync | Local-only is a hard constraint (Intake §6.4); no server exists |
| 3 | Formats other than .docx (PDF, .doc, .odt, .rtf) | Scope control; .docx only (Intake §2.4) |
| 4 | Real-time collaboration or annotation sharing | Single-user personal tool (Intake §3.3) |
| 5 | Mobile / native apps | Desktop web browsers only (Intake §9) |

---

## Review Checklist

- [x] Every Must-Have feature has a logic trigger (If/Then/Output)
- [x] Every Must-Have feature has a defined failure state
- [x] Every feature is categorized (Must/Should/Will-Not)
- [x] At least 3 Will-Not-Have items are listed
- [x] No feature is ambiguous enough to be interpreted two ways

**Flagged for Orchestrator review (not added to scope):** the "no overlapping highlights" MVP simplification in Feature 2 is a new constraint introduced during expansion — confirm or reject at the Manifesto gate.
