# UAT Session 2 — DocNote (Features 3 & 4)

**Date:** 2026-08-02 | **Features:** remove-highlight, notes-crud | **Tester:** ______

## Pre-flight
- System under test: DocNote production preview build (`npm run build && npm run preview`) at http://localhost:4173/ in a last-2-versions Chromium browser with devtools available.
- Starting state each scenario assumes: "You are on the DocNote page at http://localhost:4173/ with valid.docx open and at least one highlight applied (apply one via double-click a word → pick a color if needed)."
- Test document: src/core/__fixtures__/valid.docx.

## Scenarios (mark Pass/Fail/Skip; note any Fail)

### Feature 3 — remove-highlight
1. **Open the action menu.** You are on the page with a highlight applied. Click the highlighted text. Expected: a menu appears with text-labeled buttons "Add note", "Remove highlight", "Close" — no color-only controls.
2. **Remove restores the text.** With the menu open, click "Remove highlight". Expected: the highlight disappears, the passage returns to normal appearance, and the surrounding document text is unchanged.

### Feature 4 — notes-crud
3. **Add a note.** Click a highlight → "Add note". Expected: an editor opens with a "0 / 1000" counter, a "Note cannot be empty." message, and a disabled Save. Type text → counter updates, message clears, Save enables. Click Save → the note appears in the Notes panel with a color label.
4. **Note is text, never HTML (security).** Add a note containing `<img src=x onerror=alert(1)> hi`. Expected: the panel shows the note as literal text — NO image, NO alert dialog, NO console error.
5. **Empty / over-limit blocked.** In the editor, clear the text. Expected: Save disabled + "Note cannot be empty.". Paste 1001+ chars. Expected: counter shows over 1000 in red and Save disabled.
6. **Edit replaces text.** Click a highlight that has a note → "Edit note", change the text, Save. Expected: the panel shows the new text; the old text is gone.
7. **Delete note keeps highlight.** Click a highlight with a note → "Delete note". Expected: the note leaves the panel ("No notes yet." if it was the only one) but the highlight remains in the document.
8. **Remove highlight that has a note.** Add a note, then click the highlight → "Remove highlight". Expected: both the highlight and its note are gone; no orphan note remains in the panel.

## Bugs found
(record: severity SEV-1..4, steps, expected vs actual)

## Overall notes
