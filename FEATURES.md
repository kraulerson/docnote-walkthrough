# Feature Reference

<!--
  This document is a living index of all features built during Phase 2.
  Update at Step 2.5 of every Build Loop iteration alongside the CHANGELOG and Bible.
  Purpose: Give someone a quick orientation to what the app does without reading the Bible.
  For detailed analysis, follow the links to ADRs and interface docs.
-->

## Feature 1: docx-open-render

**Phase Built:** 2
**Status:** Complete
**Summary:** Opens a user-picked .docx (≤10 MB) entirely in the browser and renders its text read-only with paragraph structure. Rejects invalid, oversized, empty, and over-long documents with specific banners; hostile converter output is neutralized at the sanitizer choke point. This is the foundation every other feature renders on.
**Key Interfaces:** docs/api and interfaces/core-parse.md (`parseDocx`, `sanitizeToFragment`, `DocNoteError`)
**Related ADRs:** docs/ADR documentation/ADR-0001-architecture-selection.md
**Test Coverage:** Unit (parse pipeline boundaries, sanitizer attack payloads) + Component (App states Empty/Loading/Error/Success, recovery flow). E2E arrives Phase 3.
**Known Limitations:** Embedded images render as blocks/placeholders and are additionally blocked by the production CSP (in-scope simplification). Decompression-bomb residual accepted (TM-007, audit finding #2). Parse runs on the main thread.

---

## Feature 2: highlight-apply

**Phase Built:** 2
**Status:** Complete
**Summary:** Select text in the rendered document and apply one of three labeled highlight colors. Anchors are (paragraphIndex, startOffset, endOffset, exactText) with UTF-16 code-unit offsets; highlights repaint deterministically from state on every change. Overlaps and cross-paragraph selections are refused with specific hints.
**Key Interfaces:** docs/api and interfaces/core-anchors.md (`anchorFromRange`, `rangeFromAnchor`, `applyHighlightMarks`, `anchorsIntersect`)
**Related ADRs:** docs/ADR documentation/ADR-0001-architecture-selection.md (anchor model consequence)
**Test Coverage:** Unit (anchor math: styled runs, unicode surrogate pairs, stale/out-of-range anchors, overlap rule) + Component (toolbar states) + App flow (select→pick→mark, overlap refusal, text-integrity invariant).
**Known Limitations:** Highlights cannot span multiple paragraphs (anchor model, documented); toolbar position is static above the document rather than floating at the selection.

---

## Feature 3: remove-highlight

**Phase Built:** 2
**Status:** Complete
**Summary:** Clicking an existing highlight opens a text-labeled action menu (HighlightMenu) with a Remove action. Removal filters the highlight from state and the document repaints without it; text content is unchanged and removal is idempotent. The menu is the entry point Feature 4 extends with note actions.
**Key Interfaces:** src/ui/HighlightMenu.tsx (`HighlightMenu`), src/ui/App.tsx (`removeHighlight`, mark-click detection)
**Related ADRs:** docs/ADR documentation/ADR-0001-architecture-selection.md
**Test Coverage:** Component (menu states + onRemove) + App flow (remove restores text, idempotent double-interaction).
**Known Limitations:** Note-loss confirmation on remove is deferred until notes exist (Feature 4); the menu appears as a strip above the document rather than floating at the highlight.

---

## Feature 4: notes-crud

**Phase Built:** 2
**Status:** Complete
**Summary:** Attach/edit/delete a short plain-text note (1-1000 chars) on a highlight through the HighlightMenu + NoteEditor. Notes list in the NotesPanel (side panel). Text is rendered exclusively as text (React-escaped / textarea value) — never HTML — which is the invariant Feature 6 persistence relies on.
**Key Interfaces:** src/ui/NoteEditor.tsx, src/ui/NotesPanel.tsx, src/ui/App.tsx (`saveNote`, `deleteNote`, `openNoteEditor`)
**Related ADRs:** docs/ADR documentation/ADR-0001-architecture-selection.md
**Test Coverage:** Component (editor validation: empty/whitespace/over-limit/pre-fill/cancel) + App flow (attach → panel shows it, edit replaces, delete keeps highlight).
**Known Limitations:** Side panel lists notes but click-to-jump, document ordering, and the "unlocated" state arrive in Feature 5. Any annotation change repaints the whole document (marks are unaffected by note text — a minor inefficiency, acceptable at MVP scale).

---

## Feature 5: notes-panel-jump

**Phase Built:** 2
**Status:** Complete
**Summary:** The NotesPanel lists notes in document order (stable sort on paragraphIndex, startOffset); clicking a located note scrolls its highlight into view and applies a non-color-only emphasis (outline + pulse). Highlights whose anchor can't be re-located are surfaced as "⚠ unlocated" and are not clickable. Reported via DocumentView's onUnlocated.
**Key Interfaces:** src/ui/NotesPanel.tsx, src/ui/App.tsx (`jumpToHighlight`, `onUnlocated`), src/ui/DocumentView.tsx (onUnlocated)
**Related ADRs:** docs/ADR documentation/ADR-0001-architecture-selection.md
**Test Coverage:** Component (ordering, jump callback, unlocated badge/no-jump) + App flow (click-to-jump scrolls + emphasizes, two-note document ordering).
**Known Limitations:** Esc/focus-trap for popovers still deferred (BUG-24, Phase 3 a11y). Full forced-colors treatment beyond the jump target is the Phase 3 accessibility item (BUG-13).

---

<!-- Copy the section above for each new feature. Number sequentially. -->
