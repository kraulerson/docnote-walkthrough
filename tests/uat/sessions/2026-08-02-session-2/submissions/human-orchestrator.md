# UAT Session 2 — Human Tester Submission

**Tester:** Karl (Orchestrator, sole human tester)
**Date:** 2026-08-02
**Scope:** Feature 3 (remove-highlight), Feature 4 (notes-crud)
**Method:** Live browser pass in Chrome against the production preview build,
screenshots at each step.

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Highlight → click it → action menu appears | **PASS** | Clicking the yellow "launch shipped" highlight opened a menu with "Add note", "Remove highlight", "Close". |
| 2 | Add a note to a highlight | **PASS** | "Add note" opened the editor (0/1000 counter, "Note cannot be empty.", disabled Save). Typing enabled Save; counter updated to 48/1000; Save added the note to the panel. |
| 3 | Note text is rendered as text, never HTML (security) | **PASS** | Saved a note containing `<img src=x onerror=alert(1)> review the citation`. The panel shows it as literal text — no image element, no alert dialog, no console error/CSP violation. |
| 4 | Note panel shows color without relying on color alone | **PASS** | The note card shows a colored swatch plus the text label "Yellow". |
| 5 | Empty / over-limit save blocked | **PASS (live + tests)** | Live: Save disabled at 0 chars with "Note cannot be empty."; over-1000 blocking covered by NoteEditor component test. |
| 6 | Edit a note replaces its text | **PASS (by proxy)** | Covered by notesFlow test "edit an existing note, replacing its text" (green). |
| 7 | Delete a note keeps the highlight | **PASS (by proxy)** | Covered by notesFlow test "delete a note but keep the highlight" (green). |
| 8 | Remove a highlight | **PASS (by proxy)** | Covered by removeFlow tests (green); menu Remove action verified present live. |

## Defects found by the human pass
None. All observed behavior matched the spec; the security-critical case
(note XSS payload rendered inert) passed live.

## Note
Edit/delete/remove paths were verified through their green flow tests rather
than re-driven in the browser; the add-note path (incl. the XSS payload and
validation states) was exercised live.
