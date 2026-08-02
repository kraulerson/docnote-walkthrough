# UAT Session 3 — Exploratory (Malicious User + QA): Features 5 & 6

**Scope:** Feature 5 (notes-panel-jump) and Feature 6 (local-persistence), plus cross-feature
interactions now that all 6 features exist.
**Persona:** hostile co-user / crafted-storage attacker + QA.
**Method:** code read + reasoning, confirmed with a throwaway Vitest probe (24 assertions, since deleted).
Baseline before and after: `npx vitest run` → **108 passed / 19 files** (green).
**Files reviewed:** `src/core/{hash,annotationRepository,anchors,parseDocx,types,errors}.ts`,
`src/ui/{App,NotesPanel,DocumentView}.tsx`, `src/test-setup.ts`.
Bugs 1–26 were treated as known and are NOT re-reported.

---

## HEADLINE SECURITY RESULT — stored-XSS-after-restore: NOT EXPLOITABLE (SAFE)

Full trace (the key security question):
1. Attacker (co-user / extension) writes into `localStorage['docnote.v1.annotations.<hashA>']` a
   *schema-valid* store whose highlight has `note.text =
   '<img src=x onerror=window.__pwned=1><script>window.__pwned=1</script>'`.
2. On open, `loadAnnotations(hashA)` → `isValidStore` → `isValidHighlight`. The note passes because
   validation is **type-only** (`typeof note.text === 'string'`). The payload is returned **verbatim**
   (confirmed: `loaded.highlights[0].note.text` equals the payload byte-for-byte). So the restore path
   does **not** sanitize note text — the entire defense sits at render time.
3. That text flows to exactly two places, both safe:
   - `NotesPanel` renders it as a React **child** of `<button>`/`<span>` → `textContent`, HTML-escaped.
     Probe confirmed: after render, `container.querySelector('img')` and `'script'` are both `null`,
     `window.__pwned` stayed `0`, and the literal string `"<img src=x"` appears as visible text.
   - `applyHighlightMarks` never touches `note.text`; it builds `<mark>` nodes around existing DOM text
     nodes (no `innerHTML`). `exactText` is likewise never rendered (see S3-04) — it's only used for
     anchor matching.
4. No `innerHTML` / `dangerouslySetInnerHTML` / `insertAdjacentHTML` exists anywhere under `src/ui`
   or `src/core` (grep clean; the only `innerHTML` hits are in test files).

**Verdict:** the documented TM-003 render-side control (note text via `textContent` only) holds.
Stored XSS after restore is blocked. See S3-02 for the *storage-side* control that is missing.

---

## NEW FINDINGS

### S3-01 — SEV-3 — `restoredForHash` is dead code; store `createdAt` is destroyed on every save; spurious save-on-open
**File/function:** `src/ui/App.tsx` — `openFile` (decl line 42, write line 78) + save `useEffect` (lines 272–296).

- The ref `restoredForHash` is **written** (`restoredForHash.current = hash;`) but **never read**
  anywhere (grep confirmed: the only `.current` occurrence is the assignment). The comment at
  lines 40–41 states the design intent — *"only save changes made AFTER a restore"* — but nothing
  enforces it. The save effect therefore fires on the **first `ready` render after a restore**,
  immediately re-serializing the just-restored store.
- **Steps:** open a document that already has stored annotations → the effect runs with the restored
  `highlights` and writes the store back with `createdAt: new Date().toISOString()` (line 276/281).
- **Expected:** `AnnotationStore.createdAt` = original creation time, preserved across reloads
  (Bible §5 defines it as creation time). Only genuine post-restore edits should write.
- **Actual:** `createdAt` is overwritten with "now" on every open and every change, so it never
  survives a reload; and there is a redundant write of unchanged data on open.
- **Severity rationale:** SEV-3 — `createdAt`/`updatedAt` are never surfaced in the UI, so no
  user-visible corruption today, but it is a data-model correctness violation and latent.
- **Secondary UX consequence:** because the effect writes on open, *opening* (not editing) a document
  whose re-serialized blob cannot fit can surface the **"This change could not be saved (storage full)"**
  banner (line 294) with the user having made no change. (Same-size overwrites usually succeed at quota,
  so this is an edge case, but the false attribution to "this change" is wrong.)

### S3-02 — SEV-3 — Restore returns the RAW parsed object; the Bible §4 vuln#3 / TM-003 storage-side control ("fresh typed structures") is not implemented
**File/function:** `src/core/annotationRepository.ts` — `loadAnnotations` (`return parsed;`, line 55) and the `isValid*` guards.

- Bible §4 (vuln #3) states the mitigation for parsing attacker-influenceable localStorage is to
  *"validate INTO fresh typed structures, never `Object.assign` from parsed data into existing objects."*
  `loadAnnotations` instead **returns the exact object graph produced by `JSON.parse`** after a boolean
  shape check. No fresh reconstruction happens.
- **Consequences confirmed by probe:**
  - Arbitrary **extra fields** on a stored highlight survive validation and are carried into React state
    and re-serialized on the next save (`{...h}` spreads in `saveNote`/`deleteNote`). Example:
    `{...validHighlight, evilField:{a:1}}` round-trips intact.
  - `__proto__` in the stored JSON does **not** pollute `Object.prototype` (confirmed) — because both
    `JSON.parse` and object-spread use define-semantics, not the `__proto__` setter.
- **Exploitable today?** No — the two render sinks are `textContent` and `exactText` is unrendered.
  This is a **defense-in-depth / documented-control gap**: the control the threat model names is absent,
  so the safety currently rests entirely on incidental render-side escaping. Any future change (rendering
  `exactText` as an excerpt per §9, adding an HTML-rendered note field, or an `Object.assign`-based merge)
  would be injectable with no guard at the storage boundary.
- **Severity rationale:** SEV-3 — a threat-model mitigation asserted in the Bible is not present, though
  no current exploit chains through it.

### S3-03 — SEV-4 — Restore validation is materially looser than the data model
**File/function:** `src/core/annotationRepository.ts` — `isValidHighlight` (lines 83–101), `isValidAnchor` (lines 103–114).

Accepted by restore but rejected/constrained everywhere else:
- **Empty-string note** (`note.text === ''`) — passes (`typeof '' === 'string'`), bypassing the
  1–1000-char rule the `NoteEditor` enforces. It then appears in the panel as an empty jump button.
- **Note text of any length** (no ≤1000 cap on restore).
- **Negative / huge / fractional anchor offsets** — only `typeof === 'number'` is checked, so
  `startOffset:-10`, `endOffset:2e9`, `startOffset:0.5` all pass. (Note: `NaN`/`Infinity` are
  **neutralized at the JSON boundary** — `JSON.stringify(NaN)==="null"` → `typeof null!=="number"` →
  the store is discarded. Confirmed.)
- **Arbitrary `id`** (any string), **missing** highlight/note `createdAt`/`updatedAt`, and the
  **non-overlapping + sorted invariant** (Bible §5) is not validated on restore.

**Why only SEV-4 (not exploitable / no crash):** the downstream code defends:
- `applyHighlightMarks` (anchors.ts) re-checks `text.slice(startOffset,endOffset) === exactText` and
  `rangeFromAnchor` rejects `startOffset<0 || endOffset>len || endOffset<=startOffset`. Probe: negative,
  huge, and "negative-start-with-matching-slice" anchors all → `false` (reported **unlocated**), **no
  throw**, **no injected markup**, **no mis-paint**.
- Overlapping restored anchors (invariant unchecked) → **no throw** (can yield cosmetically nested
  `<mark>`s, but no crash).

### S3-04 — SEV-4 — NotesPanel omits the excerpt preview required by Bible §9
**File/function:** `src/ui/NotesPanel.tsx`.

Bible §9 (`NotesPanel` row): *"Note cards: excerpt preview, note text, color name label + swatch, jump
on click; 'unlocated' badge."* The rendered card has swatch + color label + optional badge + note text
but **no excerpt preview** (the highlighted `exactText`). Minor spec deviation. (Incidental upside: not
rendering `exactText` removes an XSS surface — relevant to S3-02.)

---

## CONFIRMED SOLID (probed, no defect)

- **Corrupt / tampered store → safe discard (`loadAnnotations` → `null`, `storage.corrupt` warn log):**
  malformed JSON, `schemaVersion !== 1`, `highlights` not an array, `note === null`, non-string
  `note.text`, invalid `color`, non-string `id`, missing `anchor` — every case returned `null`.
- **Cross-document isolation (TM-006):** save under `hashA` → `loadAnnotations(hashB)` = `null`. Copying
  A's blob into B's key is rejected by the embedded-`docHash` check (`v.docHash !== expectedHash`).
  Repository touches only `keyFor(hash)` — it never enumerates keys (no `Object.keys`, no iteration).
- **`applyHighlightMarks` never throws and never mis-paints** on any tampered anchor tried; bad anchors
  surface as **unlocated** (Feature 5), which is exactly the spec'd behavior.
- **Persistence correctness:** edit-note / remove-highlight / delete-note all persist via the save
  effect (dep `[highlights, docHash, view.kind]`); `localStorage.setItem` is **synchronous**, so rapid
  changes cannot race — the last committed render wins and writes final state. Session-only mode
  (`docHash === null`, e.g. Web Crypto unavailable) correctly skips persistence.
- **Degradation (TM-008):** unavailable warns **once per document** (`storageUnavailableWarned` reset in
  `openFile`), quota warns on **each** failing change; app keeps working in both cases. Matches spec.
- **Feature 5 ordering & jump:** notes sorted by `(paragraphIndex, startOffset)` — matches DOM order;
  unlocated notes render no jump button; `CSS.escape(id)` guards the `mark[data-hl-id="…"]` selector
  against a tampered id (selector-injection safe).
- **Prototype pollution:** `__proto__` / nested payloads in stored JSON do not pollute `Object.prototype`.

---

## OBSERVATION (NOT a new bug — within BUG-2's scope; flagged for the triager)

`parseDocx` computes `fullText` (parseDocx.ts line 76) with the **naive** `querySelectorAll(BLOCK_SELECTOR)`
and does **not** apply the leaf-only filter that `getBlockElements` (anchors.ts lines 12–18) uses for the
BUG-2 fix. So `docHash` (SHA-256 over `fullText`) is computed over text that **double-counts nested blocks**
(`td>p`, `li>ul>li`). This does **not** break Feature 6 or anchoring — the hash is deterministic (stable
identity) and anchors use the leaf-only model consistently on both create and restore — but it is exactly
the *"inflating … docHash"* concern recorded in BUG-2, whose fix landed in `getBlockElements` but not in
`parseDocx`'s `fullText`/`paragraphCount` extraction. Recorded as a completeness note against BUG-2, not
re-filed as new.

---

## Process notes
- Baseline: `npx vitest run` → 108 passed (19 files) before and after.
- One throwaway file (`src/__uat_s3_throwaway.test.tsx`, 24 assertions) was created, run, and **deleted**.
  No source files were modified.
