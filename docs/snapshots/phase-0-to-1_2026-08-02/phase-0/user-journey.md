# User Journey Map — DocNote (docnote-walkthrough)

<!--
  Phase 0 Step 0.2 output. This document captures the full user journey analysis
  before it is summarized into the Product Manifesto Section 3.

  Save as: docs/phase-0/user-journey.md

  Agent persona for this step: Skeptical Product Manager.
  Challenge every success path. What if the user is tired? Distracted? Adversarial?
-->

**Date:** 2026-08-02
**Status:** Complete (expanded from PROJECT_INTAKE.md §2.2, §4.1 — Skeptical PM pass applied)

---

## Primary Persona

| Field | Value |
|-------|-------|
| **Name** | Sam |
| **Role** | Student / knowledge worker who reviews .docx documents (readings, drafts, contracts) |
| **Goal** | Mark important passages and attach short thoughts, without changing the file and without Word installed |
| **Context** | Desktop browser, at a desk, often re-opening the same document across several days |
| **Technical Skill** | Low-Medium — comfortable with a browser and a file picker, not with "developer" concepts |

---

## Journey: Annotate a document across two sessions

### Entry Point
Sam opens the DocNote page (local dev URL or GitHub Pages) with a .docx on disk they need to read. Skeptical-PM note: Sam arrives mid-task and possibly tired — the first screen must make the ONE next action obvious (pick a file), with no configuration and no jargon.

### Success Path

| Step | User Action | System Response | Success Criteria |
|------|------------|-----------------|-----------------|
| 1 | Opens DocNote | Landing state shows a single clear "Open a .docx" action and a one-line explanation ("Read-only — your file is never modified or uploaded") | Sam knows what to do within 5 seconds; the privacy promise is visible without scrolling |
| 2 | Picks `essay-draft.docx` (1.2 MB) via the picker | Progress indication, then the document text renders read-only in <3 s; document title shown | Text is readable, scrollable; nothing suggests editing (no caret, no toolbar of editing tools) |
| 3 | Selects a sentence with the mouse | A small highlight toolbar appears near the selection with ≥3 color swatches, each with a text label (not color-only) | Toolbar appears only for valid in-document selections |
| 4 | Clicks "Yellow" | The sentence is highlighted yellow instantly; the toolbar closes | Highlight visible; no text moved or changed |
| 5 | Clicks the new highlight, chooses "Add note", types "check this citation", saves | Note editor with live character count; on save the note appears in the side panel in document order, linked to the highlight | Note visible in panel; editor closed; no data lost |
| 6 | Repeats 3-5 a few times, then closes the browser entirely | Annotations were saved to localStorage on every change (within 1 s) — closing needs no "save" step | No save button exists; nothing to remember to do |
| 7 | Next day: opens DocNote, picks the SAME file again | Document renders; all highlights and notes reappear exactly as left | 100% of annotations restored; panel ordering unchanged |
| 8 | Clicks a note in the panel | Document scrolls to the highlight; target gets an outline + brief emphasis (non-color-only indication) | The correct passage is on screen after one click |
| 9 | Edits one note, deletes another, removes one highlight (confirming its note deletion) | Panel and document update immediately; removal confirmations only when a note would be lost | State consistent between panel and document at all times |

### Failure Recovery

| Failure Point | What Goes Wrong | Recovery Path | User Sees |
|--------------|----------------|---------------|-----------|
| Step 2 | Sam picks a .pdf renamed to .docx, a corrupt file, or a 40 MB file | App rejects the file, stays on/returns to the picker state, ready for another attempt | "This file could not be opened as a .docx" / "File exceeds the 10 MB limit" — specific, no stack traces |
| Step 2 | Document has no extractable text (e.g., images only) | Render succeeds but shows an explicit empty-content message | "This document contains no readable text" |
| Step 3 | Sam selects across the panel/UI or double-clicks whitespace | No toolbar appears (or an explanatory hint after repeated attempts) | "Select text inside the document to highlight" |
| Step 4 | Selection intersects an existing highlight | Highlight not applied | "Highlights cannot overlap" |
| Step 5 | Sam saves an empty note / pastes 3,000 chars | Save blocked; editor stays open; cancel always available | "Note cannot be empty" / character counter at 1000 limit |
| Step 6 | Private-browsing mode: localStorage unavailable | App works for the session; warns once | "Annotations will not be saved in this browser session" |
| Step 7 | Sam picks a DIFFERENT (edited) version of the document | Content hash differs → treated as a new document; old annotations not shown (and not corrupted) | Fresh document view. (Skeptical-PM flag: Sam may not understand where their notes went — see Open Question OQ-1) |
| Step 7 | Stored annotations corrupt / from an unknown app version | Data discarded safely; document still renders | "Saved annotations could not be loaded" |
| Step 8 | A note's anchor can't be located after re-render | Note remains listed, marked "unlocated"; no scroll on click | Visible "unlocated" badge (icon + text, not color-only) |
| Any | localStorage quota exceeded on save | Change kept in memory for the session; user warned | "This change could not be saved (storage full)" |

### Feedback Loops
Every action has an immediate visible result in the document or panel (highlight appears/disappears, note appears/updates, target outlined on jump). Errors are specific, human-readable banners near the point of action. Saving is implicit and continuous; the UI never asks Sam to save. Destructive actions that would lose a note require explicit confirmation.

### Exit Points
Closing the tab/browser at ANY moment loses at most the in-flight keystroke: all committed annotation changes are already persisted (or the user was already warned persistence is off). Re-entry is Step 7 — pick the same file, everything restores. There is no logout, no session, no cleanup.

---

## Secondary Personas (if applicable)

Single persona product — no secondary journeys.

---

## Review Checklist

- [x] Primary persona is specific (not "users")
- [x] Success path covers the complete flow (entry to exit)
- [x] At least 3 failure points are identified with recovery paths
- [x] Feedback loops are defined (user knows their action worked)
- [x] Exit points preserve user state
- [x] Journey was reviewed with Skeptical PM mindset

**Feature-gap flags from the Skeptical PM pass (for Manifesto Open Questions):**
- **OQ-1:** When a re-opened document's content has changed, annotations silently "disappear" (new identity). Should the UI say something like "This looks like a new version of a document you annotated"? Proposed MVP answer: out of scope beyond the fresh-view behavior; revisit post-MVP.
- **OQ-2:** Should there be a way to see/clear stored annotation sets for documents no longer at hand (storage housekeeping)? Proposed MVP answer: no UI; localStorage clearing is the escape hatch.
