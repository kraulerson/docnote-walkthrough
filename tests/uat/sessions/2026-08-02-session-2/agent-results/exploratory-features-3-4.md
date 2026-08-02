# UAT Session 2 — Exploratory Testing (Malicious User / QA persona)

**Scope:** Feature 3 (remove-highlight) + Feature 4 (notes-crud) only.
**Date:** 2026-08-02
**Method:** Full code read of `src/ui/{App,HighlightMenu,NoteEditor,NotesPanel,DocumentView}.tsx` + `src/core/{anchors,types,sanitize}.ts`; sink grep across `src/`; 7 dynamic probes executed via a throwaway vitest file (created, run, deleted — baseline re-verified green afterward).
**Baseline:** `npx vitest run` → 13 files, 79 tests, all passing (before and after probing).
**Persistence (Feature 6) is not built; nothing below is a missing-persistence report.**
**BUG-1..19 excluded per instructions; all findings below are new.**

---

## FINDING 1 — SEV-2 — Note editor keeps stale text when switched between highlights; saves one highlight's draft onto another highlight's note

**Where:** `src/ui/App.tsx` lines 245-253 (`<NoteEditor>` rendered without a `key`); root cause interacts with `src/ui/NoteEditor.tsx:16` (`useState(initialText)` reads the prop only on mount).

**Root cause:** `{noteEditorFor !== null && <NoteEditor initialText={...} />}` — when `noteEditorFor` changes from highlight X to highlight Y (both non-null), React reconciles the same component instance, so the `useState(initialText)` draft from X survives. The editor is never remounted and `initialText` for Y is ignored.

**Steps (probe-verified):**
1. Open valid.docx. Create highlight A (yellow, "launch shipped") and highlight B (blue, "Closing").
2. Add note `alpha note` to A. Save.
3. Click A → "Edit note" — editor shows `alpha note` (correct).
4. Without closing the editor, click highlight B in the document → menu opens → "Add note".
5. **Expected:** fresh empty editor for B (B has no note). **Actual:** editor still shows `alpha note` (A's text). Probe output: `editor value after switching to blue Add note: "alpha note"`.
6. Click Save. **Expected:** nothing savable / empty-blocked. **Actual:** B receives note `alpha note` — panel now lists `alpha note` twice. Probe output: `panel notes after save: 2 ['alpha note','alpha note']`.

Any partially-typed draft for X is likewise silently transplanted onto Y. This is literally the Bible §12 SEV-2 example: "note edit saves to wrong note."

**Fix hint (not applied):** `<NoteEditor key={noteEditorFor} ...>`.

---

## FINDING 2 — SEV-2 — "Remove highlight" destroys an attached note with NO confirmation (explicit spec requirement)

**Where:** `src/ui/HighlightMenu.tsx:48` (Remove button calls `onRemove(highlight.id)` directly); `src/ui/App.tsx:153-159` (`removeHighlight` filters immediately).

**Spec:** Manifesto MVP Cutline item 3: "Remove highlight **(with note-loss confirmation)**"; Bible §9 HighlightMenu Success state: "Remove highlight **(confirm if note exists)**".

**Steps (probe-verified):**
1. Highlight text, attach note `precious note`.
2. Click highlight → "Remove highlight".
3. **Expected:** confirmation (dialog/confirm) warning the note will be lost. **Actual:** highlight and note vanish in one click. Probe output: `window.confirm called: 0`, no `dialog`/`alertdialog` role in the DOM; panel immediately shows "No notes yet." `grep -rn "confirm" src/` → zero hits in application code.

Up to 1000 chars of user-authored content destroyed by one misclick with no undo. User-initiated, so classed SEV-2 (spec'd feature behavior missing) rather than SEV-1, but it is real data loss once persistence lands.

---

## FINDING 3 — SEV-3 — Delete note from the menu while its editor is open: editor survives and Save silently resurrects the deleted note

**Where:** `src/ui/App.tsx:188-201` (`deleteNote` clears `activeHighlightId` but never touches `noteEditorFor`).

**Steps (probe-verified):**
1. Highlight + note `to be deleted`. Click highlight → "Edit note" → editor opens with the text.
2. With the editor open, click the same highlight again → menu → "Delete note". Panel shows "No notes yet."
3. **Expected:** the open editor for the now-deleted note closes (or at minimum reflects deletion). **Actual:** editor remains open, still showing `to be deleted` (probe: `editor still open after delete: true`).
4. Click Save. **Actual:** the note reappears in the panel (probe: `note resurrected after Save: true`), with a fresh `createdAt` (original creation time silently lost — `App.tsx:178`).

The user performed an explicit destructive action and the app un-does it from stale UI. Contrast: `removeHighlight` DOES close the editor (`App.tsx:157`) — the two destruction paths are inconsistent.

---

## FINDING 4 — SEV-3 — Counter/limit validate the UNTRIMMED text while Save stores the TRIMMED text (inconsistent 1000-char boundary)

**Where:** `src/ui/NoteEditor.tsx:17-19` (`trimmedLength` used for empty, raw `text.length` used for `overLimit` and the counter) vs `NoteEditor.tsx:43` (`onSave(text.trim())`).

**Probe-verified behavior:**
- 1000 valid chars + one trailing newline (e.g., user hits Enter after typing — textarea, so Enter inserts `\n`): counter `1001 / 1000`, "Note is too long.", Save disabled — even though the value that would actually be saved is exactly 1000 chars (valid). Probe: `Save disabled for 1000-char+newline note: true`.
- `"  x  "`: counter reads `5 / 1000` but Save stores `"x"` (1 char). The counter never matches the persisted value when padding exists.
- Boundary checks that are correct: exactly 1 char saves; exactly 1000 saves; 1001 non-whitespace blocked; whitespace-only blocked ("Note cannot be empty."); paste and type behave identically (no `maxLength` attribute, single `onChange` path).

Bible §12 files "counter off-by-one display" as SEV-3. The trailing-newline lockout is the user-visible harm: a legitimately-sized note is rejected.

---

## FINDING 5 — SEV-3 — Esc closes neither the HighlightMenu nor the NoteEditor; no focus trap (a11y baseline violation in the two NEW popovers)

**Where:** `src/ui/HighlightMenu.tsx` (no key handling at all), `src/ui/NoteEditor.tsx` (no key handling), vs Bible §9 accessibility baseline: "popovers trap focus and close on Esc" and §14 "Esc closes".

**Probe-verified:** with the menu open, `Escape` → menu still open. With the editor focused, `Escape` → editor still open. Neither component traps focus. (Family resemblance to deferred BUG-13/14, but those are Session 1 findings about SelectionToolbar/highlight marks; these are the two components Features 3-4 introduced.) Suggest same disposition: defer to Phase 3 accessibility — but it must be recorded now.

---

## FINDING 6 — SEV-4 — HighlightMenu and SelectionToolbar can be open simultaneously; menu is a sticky bar, not a popover at the highlight

**Where:** `src/ui/App.tsx:88-118` — the mouseup branch for a valid selection sets toolbar state but never clears `activeHighlightId` (it is only cleared in the collapsed-click branch, line 100).

**Probe-verified:** click a highlight (menu opens) → drag-select other text → toolbar appears while the menu is still open (probe: `menu open: true | toolbar open simultaneously: true`). Two "popovers" with unrelated actions visible at once. Also `.highlight-menu` is `position: sticky; top: 0` in-flow at the top of the document area (`src/styles.css:194`), so opening it shifts the whole document down by its height and it renders far from the clicked highlight — Bible §9 calls it a popover.

**Repaint correctness (explicitly hunted, mostly CLEAN):** applying the new highlight while the menu was open triggers the full `DocumentView` repaint (`replaceChildren` — `DocumentView.tsx:35`); the open menu survives (it is state-driven, not DOM-anchored), its Remove action still removes the right highlight afterward, and the other mark stays intact (probe outputs all true). No crash, no stale-DOM action. The dual-popover display is the only defect here.

---

## FINDING 7 — SEV-4 — Assorted minor deviations (recorded, no dispute if Won't-Fixed)

1. **Impure state updater:** `App.tsx:171` calls `setError(...)` inside the `setHighlights` updater function. Updaters must be pure; under StrictMode (enabled in `src/main.tsx`) it is double-invoked. Benign today (same-value set) but a latent footgun; move the existence check outside the updater. Related: this "highlight no longer exists" guard is currently unreachable through the UI because `removeHighlight` always closes the editor first — dead defensive path, fine to keep.
2. **Pristine editor shows an error:** a just-opened empty NoteEditor immediately displays "Note cannot be empty." — Bible §9 Empty state specifies only counter 0/1000 + disabled Save; the message is the Error state.
3. **Note display formatting:** `.note-text`/`.note-jump` (`src/styles.css:316`) set no `white-space: pre-wrap` and no `overflow-wrap` — multi-line notes render with newlines collapsed, and a long unbroken string (e.g., a pasted URL/token up to 1000 chars) can overflow the 30% panel horizontally.
4. **Stale-highlight notice unimplemented:** Bible §9 HighlightMenu Error state ("That highlight was already removed") does not exist — the menu just unmounts (`HighlightMenu.tsx:24`). Unreachable in the current single-actor feature set; will matter when persistence/unlocated states (Features 5/6) add removal paths.

---

## Stored-XSS hunt — CLEAN (no exploitable path found)

Traced `note.text` end-to-end: textarea `value` (controlled, `NoteEditor.tsx:31`) → `saveNote` → `highlights` state (`App.tsx:166-186`) → `NotesPanel` `{h.note?.text}` as a JSX text child in both the `<span>` and the future `onJump` `<button>` branch (`NotesPanel.tsx:29,32`) → React text node (escaped). Never concatenated into HTML, never an attribute, never reaches `DocumentView` (marks carry only `className` from the typed color union and `dataset.hlId` = UUID — `anchors.ts:164-166`).

- Sink grep over `src/` (excluding tests): zero hits for `innerHTML | outerHTML | dangerouslySetInnerHTML | insertAdjacentHTML | document.write | srcdoc | setAttribute | title=`.
- Probe payloads rendered inert as literal text in BOTH NotesPanel branches: `<img src=x onerror=…>`, `<script>…</script>`, `javascript:` URL, `"><svg onload=…>`, RTL-override + ZWJ-emoji + newline + 900-char string. No element injection (`querySelector('img,script,svg,iframe')` null), no handler execution (window globals unset).
- Logging honors Bible §8: `note.saved` logs `{chars}` only — never note content (`App.tsx:185`).

---

## Other attacks tried, no defect found

- **Remove idempotency:** `removeHighlight` filters by id — double-remove is a no-op (also covered by existing `removeFlow.test.tsx`).
- **Remove-while-editor-open (same highlight):** editor closes correctly (`App.tsx:157`); no orphan, no resurrection from THAT path.
- **Remove highlight with note → panel orphan check:** note card disappears with the highlight; no orphan entry (probe 2).
- **Delete note vs remove highlight semantics:** delete-note keeps the mark; remove-highlight drops the note — matches spec (existing notesFlow test + probes).
- **Edit → Cancel:** editor unmounts; original note untouched; reopening shows the original (state is only committed in `saveNote`).
- **saveNote on missing highlight:** guarded — returns previous state + error banner; no resurrection-by-save of a REMOVED highlight (unreachable via UI anyway, see Finding 7.1).
- **Repaint side effects:** full `replaceChildren` repaint on every note change preserves menu/editor (React state outside the container), and scroll container content is swapped in a single synchronous call.
- **Open-new-document races:** success path clears `highlights`/`activeHighlightId`/`noteEditorFor` before `ready`; stale note UI cannot leak onto a new document; failure path unmounts the editor (view leaves `ready`).
- **1 / 1000 / 1001 char boundaries, whitespace-only, paste-vs-type:** correct except as in Finding 4.

## Verdict

Two SEV-2s (wrong-note save via missing `key`; spec-required remove confirmation absent), three SEV-3s, assorted SEV-4 polish. No security-exploitable path found in note text handling — the text-only rendering contract holds everywhere it was probed.
