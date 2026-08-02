# UAT Session 3 — DocNote (Features 5 & 6)

**Date:** 2026-08-02 | **Features:** notes-panel-jump, local-persistence | **Tester:** ______

## Pre-flight
- System under test: DocNote production preview (`npm run build && npm run preview`) at http://localhost:4173/ in a last-2-versions Chromium browser with devtools (Application tab for localStorage).
- Starting state each scenario assumes: "You are on the DocNote page at http://localhost:4173/ with valid.docx open."
- Test document: src/core/__fixtures__/valid.docx.

## Scenarios

### Feature 5 — notes-panel-jump
1. **Document order.** Highlight a later paragraph, note it "later"; highlight an earlier paragraph, note it "earlier". Expected: the panel lists "earlier" above "later" regardless of creation order.
2. **Click-to-jump.** Click a note in the panel. Expected: the document scrolls to its highlight and the highlight briefly gets a visible outline/pulse (an emphasis that is NOT color alone).

### Feature 6 — local-persistence
3. **Persist across reload.** Highlight text, add a note. Reload the page (Cmd-R). Re-open the same file. Expected: the highlight and note reappear exactly as left.
4. **Per-document isolation.** Annotate document A. Open a different document B. Expected: B shows no notes from A. Re-open A → its notes are back.
5. **Corrupt storage is safe.** In devtools Application → Local Storage, edit a `docnote.v1.annotations.*` value to invalid JSON. Re-open that document. Expected: the document still renders; a message like "Saved annotations could not be loaded" (or simply no annotations) — never a crash or blank page.
6. **Storage disabled.** In a private/incognito window (or with storage blocked), open a document and add a highlight. Expected: the highlight works for the session and a one-time warning says annotations will not be saved.

## Bugs found
(record: severity SEV-1..4, steps, expected vs actual)

## Overall notes
