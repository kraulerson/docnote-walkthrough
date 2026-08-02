# Bug Tracker

<!--
  This file tracks bugs found during UAT sessions and ad hoc testing.
  Status and severity patterns are read by scripts/test-gate.sh for phase gate checks.
  Do NOT change the table format — the column order and status values are parsed by scripts.
-->

| # | Severity | Status | Feature | Description | Session | Disposition | Fix Reference | Verified In |
|---|---|---|---|---|---|---|---|---|
| 1 | SEV-1 | Fixed | docx-open-render | Decompression bomb: a ~169 KB .docx whose word/document.xml expands ~697:1 (measured 3+ GB RSS, 9 s freeze) because the extracted-char cap fires only AFTER mammoth materializes ~120 MB. Falsifies TM-007 mitigation. | Session 1 | Fix Now | `de16e01` | Session 1 |
| 2 | SEV-2 | Fixed | docx-open-render | Nested block elements double/triple-counted: BLOCK_SELECTOR matches ancestor + descendant (td>p, li>ul>li), inflating paragraphCount and (future) docHash, and consuming MAX_EXTRACTED_CHARS 2-3x on tables. | Session 1 | Fix Now | `de16e01` | Session 1 |
| 3 | SEV-2 | Fixed | highlight-apply | Cross-paragraph selection accepted inside nested blocks: a drag across two <p> in one <td> returns an anchor instead of null (the "spans >1 block → null" rule fails for nested blocks). | Session 1 | Fix Now | `de16e01` | Session 1 |
| 4 | SEV-2 | Fixed | docx-open-render | Concurrent-open race: openFile has no generation token; picking file B while A parses can render the wrong document with no UI indication of which file is shown. | Session 1 | Fix Now | `de16e01` | Session 1 |
| 5 | SEV-2 | Fixed | highlight-apply | Triple-click a paragraph does not highlight in Chrome/Edge (live-confirmed): Chromium ends the selection at the start of the next block, so anchorFromRange rejects an ordinary "select whole paragraph" gesture with the wrong hint. | Session 1 | Fix Now | `de16e01` | Session 1 |
| 6 | SEV-2 | Fixed | docx-open-render | Sanitizer allows external subresource/nav content: embedded images, video/audio src, and external https <a> links survive. Prod CSP blocks image fetch (so embedded images show broken) but not top-level navigation; dev/file:// has no CSP so images beacon. | Session 1 | Fix Now | `de16e01` | Session 1 |
| 7 | SEV-3 | Fixed | docx-open-render | External https hyperlinks in a crafted .docx remain clickable and navigate away (phishing / lost session), contradicting the "safe read-only" promise. (Folded into the BUG-6 sanitizer hardening.) | Session 1 | Fix Now | `de16e01` | Session 1 |
| 8 | SEV-3 | Fixed | highlight-apply | rangeFromAnchor accepts startOffset === endOffset and applyHighlightMarks then returns true with zero marks (guard is `<` where it should reject `<=`). | Session 1 | Fix Now | `de16e01` | Session 1 |
| 9 | SEV-3 | Fixed | highlight-apply | Over-length selection (>5000 chars) shows the misleading hint "Select text inside the document to highlight" instead of a length-specific message. | Session 1 | Defer → Phase 3 hardening | `e05c494` | Phase 3 |
| 10 | SEV-3 | Fixed | highlight-apply | Highlighting across a surrogate pair / grapheme cluster (emoji, flags, ZWJ) splits it visually (Bible §4 stress-test #5). | Session 1 | Defer → Phase 3 hardening | `e05c494` | Phase 3 |
| 11 | SEV-3 | Fixed | docx-open-render | No React error boundary: an unexpected throw during render leaves a blank page instead of a banner (contradicts the journey's "specific banner, no stack traces"). | Session 1 | Defer → Phase 3 hardening | `e05c494` | Phase 3 |
| 12 | SEV-3 | Fixed | docx-open-render | crypto.randomUUID at module scope white-screens on a non-secure origin (plain-HTTP host). Not triggered on GitHub Pages/localhost (secure contexts). | Session 1 | Defer → Phase 3 hardening | `e05c494` | Phase 3 |
| 13 | SEV-3 | Fixed | highlight-apply | Windows forced-colors (high-contrast) mode collapses the three highlight colors to one system color; marks carry no non-color identity (conflicts Bible §14). | Session 1 | Defer → Phase 3 accessibility | `e05c494` | Phase 3 |
| 14 | SEV-3 | Fixed | highlight-apply | Keyboard-only text selection never surfaces the highlight toolbar (mouseup-only trigger) — core feature not keyboard-operable (WCAG AA gap). | Session 1 | Defer → Phase 3 accessibility | `e05c494` | Phase 3 |
| 15 | SEV-4 | Won't Fix | highlight-apply | Safari (theoretical, unverified): a dismiss-click may re-show the toolbar once due to WebKit's post-mouseup selection collapse. | Session 1 | Won't Fix | | |
| 16 | SEV-4 | Fixed | docx-open-render | style/class attributes pass the sanitizer (not reachable via mammoth today; prod CSP blocks inline style). Folded into the BUG-6 sanitizer hardening. | Session 1 | Fix Now | `de16e01` | Session 1 |
| 17 | SEV-4 | Won't Fix | docx-open-render | Main JS bundle ~724 KB min (mammoth) exceeds Vite's 500 KB warning threshold. Acceptable for a local single-user tool. | Session 1 | Won't Fix | | |
| 18 | SEV-4 | Won't Fix | docx-open-render | empty-document shows a banner and returns to landing; the journey wording implies "render succeeds". Behavior (specific banner) is the intended outcome. | Session 1 | Won't Fix | | |
| 19 | SEV-4 | Fixed | highlight-apply | Two same-tick swatch clicks (rapid double-click) could double-apply the same anchor, bypassing the mouseup overlap check (found during live re-verification; very hard to reach through the normal event path since the toolbar closes between renders). | Session 1 (live re-verify) | Fix Now | `de16e01` | Session 1 |
| 20 | SEV-2 | Fixed | notes-crud | NoteEditor rendered without a `key`: switching the editor from highlight X to Y (both non-null) keeps X's draft, so saving writes X's text onto Y's note ("note edit saves to wrong note", Bible §12 SEV-2 example). | Session 2 | Fix Now | `fda79ef` | Session 2 |
| 21 | SEV-2 | Fixed | remove-highlight | Remove-highlight destroys an attached note with NO confirmation, but the MVP Cutline item 3 and Bible §9 explicitly require note-loss confirmation — a spec'd feature was under-implemented. | Session 2 | Fix Now | `fda79ef` | Session 2 |
| 22 | SEV-3 | Fixed | notes-crud | Delete-note while its editor is open: the editor survives and Save resurrects the deleted note (with a fresh createdAt). deleteNote never clears noteEditorFor (removeHighlight does). | Session 2 | Fix Now | `fda79ef` | Session 2 |
| 23 | SEV-3 | Fixed | notes-crud | NoteEditor counter/limit validate untrimmed text while Save stores trimmed text: a valid 1000-char note + trailing newline is wrongly blocked; padded text's counter never matches the saved value. | Session 2 | Fix Now | `fda79ef` | Session 2 |
| 24 | SEV-3 | Fixed | notes-crud | Esc closes neither HighlightMenu nor NoteEditor and neither traps focus (Bible §9/§14). | Session 2 | Defer → Phase 3 accessibility | `e05c494` | Phase 3 |
| 25 | SEV-4 | Fixed | notes-crud | HighlightMenu and SelectionToolbar can be open at once (valid-selection mouseup branch never clears activeHighlightId); the menu is also a sticky top bar, not a popover at the highlight. | Session 2 | Fix Now (dual-open); Won't Fix MVP (popover positioning) | `fda79ef` | Session 2 |
| 26 | SEV-4 | Fixed | notes-crud | Cluster: setError called inside the setHighlights updater (impure, StrictMode double-invoked); a pristine empty editor already shows "Note cannot be empty."; note text has no pre-wrap/overflow-wrap (newlines collapse, long strings overflow). ("That highlight was already removed" menu state remains unimplemented — deferred, unreachable now.) | Session 2 | Fix Now (first three); Defer (stale-highlight notice) | `fda79ef` | Session 2 |
| 27 | SEV-3 | Fixed | local-persistence | restoredForHash ref is dead code; the save effect fires on the first post-restore render and rewrites the store with createdAt=now, so AnnotationStore.createdAt (Bible §5 = creation time) never survives a reload; save-on-open can also mis-attribute a "storage full" warning. | Session 3 | Fix Now | `8d31e92` | Session 3 |
| 28 | SEV-3 | Fixed | local-persistence | loadAnnotations returns the raw JSON.parse object graph; the Bible §4 vuln#3 / TM-003 storage-side control ("validate into fresh typed structures") is absent — tampered extra fields round-trip into state and back to storage. Not exploitable today (sinks are textContent), a defense-in-depth gap. | Session 3 | Fix Now | `8d31e92` | Session 3 |
| 29 | SEV-4 | Fixed | local-persistence | Restore validation looser than the data model: accepts empty-string notes, unbounded note length, and negative/huge/fractional anchor offsets. Not exploitable (downstream re-checks → unlocated, no crash). | Session 3 | Fix Now (fold into BUG-28 reconstruction) | `8d31e92` | Session 3 |
| 30 | SEV-3 | Fixed | docx-open-render | parseDocx computes fullText/paragraphCount with the naive selector, not the leaf-only filter getBlockElements got for BUG-2 — so docHash double-counts nested blocks (td>p, li>ul>li). Deterministic (identity stable) but inconsistent with the anchoring model. BUG-2 completeness. | Session 3 | Fix Now | `8d31e92` | Session 3 |
| 31 | SEV-4 | Fixed | notes-panel-jump | NotesPanel omits the excerpt preview required by Bible §9 (shows swatch + color label + badge + note text only). | Session 3 | Fix Now | `8d31e92` | Session 3 |
<!--
  Severity: SEV-1, SEV-2, SEV-3, SEV-4 (see PROJECT_BIBLE.md Bug Severity Classification)
  Cite bugs elsewhere as BUG-<#> (the # column, bare integer, no zero-padding — see docs/IDENTIFIERS.md)
  Status: Open, Fixed, Deferred, Won't Fix, Post-MVP, Removed
  Disposition: Fix Now, Defer, Won't Fix, Post-MVP (assigned during triage, Step 2.8)
  Session: UAT session number where the bug was found (e.g., "Session 4")
  Fix Reference: PR number or commit hash of the fix (e.g., "PR #12" or "abc1234")
  Verified In: UAT session number where the fix was verified (e.g., "Session 5")
-->

## Status Guide

| Status | Meaning |
|---|---|
| **Open** | Bug confirmed, not yet fixed |
| **Fixed** | Fix implemented and verified |
| **Deferred** | Tracked with justification — must be resolved or feature removed at Phase 2→3 gate |
| **Won't Fix** | Accepted as-is with documented rationale (SEV-3/4 only) |
| **Post-MVP** | Moved to post-MVP backlog (SEV-4 enhancements only) |
| **Removed** | Feature containing the bug was removed |

## Severity Guide

| Severity | Definition | Examples | Can Defer? |
|---|---|---|---|
| **SEV-1** | Data loss, security breach, app crash on core flow | Auth bypass, database corruption, crash on login | No — must fix immediately |
| **SEV-2** | Feature broken but workaround exists, significant UX failure | Form submits wrong data, layout broken on one platform | Yes — but must resolve or remove feature at Phase 2→3 gate |
| **SEV-3** | Minor UX issue, cosmetic, non-core edge case | Alignment off, tooltip truncated, rare edge case | Yes |
| **SEV-4** | Enhancement, suggestion, polish | "Would be nice if...", performance optimization | Automatic Post-MVP |
