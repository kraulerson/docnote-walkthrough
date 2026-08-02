# Interface: Document Parse Pipeline (Feature 1)

## `parseDocx(buffer: ArrayBuffer, options?: ParseOptions): Promise<ParsedDocument>`
Module: `src/core/parseDocx.ts`

Converts a .docx byte buffer into a render-ready, sanitized document model,
entirely client-side.

**Returns `ParsedDocument`:**
- `fragment: DocumentFragment` — sanitized, inert DOM (insert-ready)
- `fullText: string` — block texts in document order, newline-joined
- `paragraphCount: number` — non-empty block elements
- `warningCount: number` — converter warnings (metadata only)

**Options:** `maxBytes` (default 10 MB), `maxChars` (default 5,000,000) — injectable for tests.

**Errors — always `DocNoteError` with `code`:**
| code | condition | user message |
|---|---|---|
| `file-too-large` | byteLength > maxBytes (checked before parsing) | File exceeds the 10 MB limit. |
| `invalid-docx` | conversion failed (not a docx / corrupt / missing document.xml) | This file could not be opened as a .docx. |
| `empty-document` | no non-empty block text | This document contains no readable text. |
| `document-too-long` | extracted chars > maxChars | This document is too large to display. |

## `sanitizeToFragment(html: string): DocumentFragment`
Module: `src/core/sanitize.ts`

THE only sanctioned HTML sink (Bible §10 rule 1). DOMPurify with forbidden
tags: style/form/input/button/iframe/object/embed/svg/math; no data
attributes. All converter output must pass through here.

## `DocNoteError` / `ERROR_MESSAGES`
Module: `src/core/errors.ts` — typed error codes with the Manifesto's exact
user-facing messages.
