# DocNote — User Guide

DocNote lets you read a Word (`.docx`) document in your browser, highlight
passages in three colors, and attach short notes — all without changing the file
and without uploading anything. Your highlights and notes are saved in your
browser and come back the next time you open the same document.

## Getting started

1. Open DocNote in a desktop browser (Chrome, Firefox, Safari, or Edge —
   latest two versions).
2. Click **Open a .docx** and choose a Word document from your computer.
   - The file is read on your device only. It is never uploaded and never
     modified.
   - Limit: 10 MB per file. Only `.docx` is supported (not `.doc`, PDF, etc.).
3. The document's text appears, read-only.

## Highlighting

1. Select some text with your mouse (or keyboard: hold **Shift** and use the
   arrow keys).
2. A small toolbar appears with three colors — **Yellow**, **Green**, **Blue**
   (each is labeled, so you don't have to rely on color alone).
3. Click a color to highlight the selection.

Notes:
- Highlights can't overlap each other.
- To highlight a whole paragraph, triple-click it, then pick a color.

## Removing a highlight

1. Click an existing highlight.
2. In the menu, click **Remove highlight**.
3. If the highlight has a note, you'll be asked to confirm — removing the
   highlight also deletes its note.

## Notes

- **Add:** click a highlight → **Add note** → type up to 1000 characters →
  **Save**.
- **Edit:** click the highlight → **Edit note** → change the text → **Save**.
- **Delete:** click the highlight → **Delete note** (this keeps the highlight).
- All notes appear in the **Notes** panel on the right, listed in document order,
  each showing a short excerpt of the highlighted passage.
- Click a note in the panel to jump to its highlight in the document.
- If a note's highlight can't be found (rare), the note stays in the panel
  marked **⚠ unlocated**.

## Saving and reopening

There is no Save button — your highlights and notes are saved automatically as
you work. The next time you open the **same** document, they reappear.

- Saving uses your browser's local storage. If you're in a private/incognito
  window, or storage is disabled, DocNote still works for the session but shows
  a one-time notice that annotations won't be saved.
- "Same document" means the same text content. If you edit the document in Word
  and reopen it, DocNote treats it as a new document (the old annotations aren't
  shown — they're not lost, just tied to the previous version's content).

## Privacy

Everything stays on your device. DocNote makes no network requests with your
document or annotations. Note that annotations (including short excerpts of the
highlighted text) are stored **unencrypted** in your browser — avoid annotating
highly sensitive documents on a shared computer. See `SECURITY.md`.

## Troubleshooting

| Problem | What it means / what to do |
|---|---|
| "This file could not be opened as a .docx." | The file isn't a valid `.docx`. Re-save it from Word as `.docx` and try again. |
| "File exceeds the 10 MB limit." | The document is too large. |
| "This document contains no readable text." | The `.docx` has no extractable text (e.g., only images). |
| "Selection is too long to highlight…" | Highlight a shorter passage (limit 5,000 characters). |
| "Annotations will not be saved in this browser session." | Local storage is unavailable (private mode / disabled). |
| A note shows "⚠ unlocated" | The highlight couldn't be located in the current document. |
| Something went wrong (a full-page error) | Reload the page. Your saved annotations are safe. |

## Support

This is a personal-project tool. Questions or issues: kraulerson@gmail.com.
