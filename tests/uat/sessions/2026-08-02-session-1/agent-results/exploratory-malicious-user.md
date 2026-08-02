# Exploratory Test — Malicious User persona — UAT Session 1 (2026-08-02)

Scope: Features 1–2 only (open/render + highlight-apply). Persistence, notes, jump, and remove
(Features 3–6) are not built and are **not** reported as defects. Persona per CLAUDE.md Phase 2.7:
break the app, huge inputs, race conditions, injection payloads.

Method: source read of `src/core/*.ts` + `src/ui/*.tsx` against PROJECT_BIBLE.md §4 (TM-001..TM-009),
§5, §12 and `docs/phase-0/user-journey.md` Failure Recovery; hand-built hostile `.docx` fixtures;
throwaway Vitest probes run against the real modules and then deleted. **No repo file was modified.**
Baseline re-verified after cleanup: `npx vitest run` → 53/53 passing, 7/7 files.

Throwaway fixtures (scratchpad, not committed):
`…/scratchpad/hostile.docx`, `…/scratchpad/corrupt.docx`, `…/scratchpad/bomb.docx`.

---

## Summary

| ID | Sev | Title | File:function |
|---|---|---|---|
| MU-1 | **SEV-1** | Decompression bomb: the extracted-char cap fires only *after* full materialization — 169 KB file → 3.1 GB RSS | `src/core/parseDocx.ts:parseDocx` |
| MU-2 | **SEV-2** | Nested blocks double/triple-counted: `fullText`, `paragraphCount`, and anchor indices wrong for any doc with a table / nested list / blockquote | `src/core/parseDocx.ts:parseDocx`, `src/core/anchors.ts:getBlockElements` |
| MU-3 | **SEV-2** | Selection spanning two paragraphs inside one `<td>`/`<blockquote>`/nested `<li>` is accepted as a single anchor | `src/core/anchors.ts:anchorFromRange` |
| MU-4 | **SEV-2** | Concurrent-open race: the app can display a *different* document than the one picked last, with no indication | `src/ui/App.tsx:openFile` |
| MU-5 | SEV-3 | No error boundary / global handler — any throw in the paint path yields a blank page, not a banner | `src/ui/App.tsx`, `src/ui/DocumentView.tsx`, `src/main.tsx` |
| MU-6 | SEV-3 | No grapheme-cluster or surrogate-pair guard — highlighting visibly destroys emoji/flags/skin-tone sequences while all existing tests still pass | `src/core/anchors.ts` |
| MU-7 | SEV-3 | Over-cap (>5,000 char) selection shows the wrong hint | `src/core/anchors.ts:anchorFromRange` + `src/ui/App.tsx:onDocumentMouseUp` |
| MU-8 | SEV-3 | `rangeFromAnchor` accepts a collapsed anchor; `applyHighlightMarks` returns `true` having painted nothing | `src/core/anchors.ts:rangeFromAnchor` |
| MU-9 | SEV-3 | Hostile `.docx` can plant live outbound links and arbitrary element `id`s | `src/core/sanitize.ts:SANITIZE_CONFIG` |
| MU-10 | SEV-4 | Sanitizer permits `style` and `class` attributes — TM-002's "hardened defaults" claim rests on mammoth's current style map | `src/core/sanitize.ts:SANITIZE_CONFIG` |
| MU-11 | SEV-4 | `empty-document` deviates from the journey's stated recovery ("render succeeds" vs. banner + return to landing) | `src/core/parseDocx.ts:parseDocx` |
| MU-12 | SEV-4 | `crypto.randomUUID()` at module scope with no fallback → white screen on a non-secure context | `src/core/log.ts:18` |

**TM-002 verdict: no sanitizer bypass found.** `sanitizeToFragment` is confirmed the single DOM sink
(see "What I tried that did NOT break" for the full trace). MU-9/MU-10 are residue and hardening, not bypasses.

---

## MU-1 — SEV-1 — Decompression bomb: the char cap cannot prevent the OOM it claims to prevent

**Threat-model claim being tested.** TM-007 (DoS): *"I hand you a 9.8 MB docx that is a zip bomb /
million-paragraph document; parse freezes the tab or OOMs it."* Stated mitigation: *"10 MB pre-parse
file cap; extracted-text cap (5,000,000 chars → 'document too large' error)."*

**Concrete input.** A `.docx` whose `word/document.xml` is 24,000 × `<w:p><w:r><w:t>A×5000</w:t></w:r></w:p>`:

| | |
|---|---|
| compressed `.docx` | **173,257 bytes** — 1.7 % of the 10 MB cap |
| `word/document.xml` uncompressed | 120,792,168 bytes (**697 : 1**) |
| mammoth output | 120,168,000 chars of HTML |

**Steps.** Open the file with the picker (or `parseDocx(buffer)` directly).

**Expected.** Rejected as `document-too-long` cheaply, without materializing the payload — that is what
the TM-007 mitigation cell promises.

**Actual (measured).**

```
bomb .docx bytes: 173257 ( 1.7 % of the 10 MB cap )
{"level":"warn","event":"parse.rejected","detail":{"reason":"document-too-long","chars":120023999}}
parseDocx outcome: document-too-long after 8877 ms
rss MB: 3166
```

mammoth alone (measured separately): 508 ms, 792 MB RSS, 120,168,000 chars emitted. The remaining
~8.4 s and ~2.4 GB are `sanitizeToFragment` + `querySelectorAll` building a full DOM of the payload.

**Root cause — order of operations in `parseDocx`:**

1. `buffer.byteLength > maxBytes` (line 37) — checks the **compressed** size only.
2. `mammoth.convertToHtml` (line 53) — materializes the whole decompressed document.
3. `sanitizeToFragment(html)` (line 64) — parses all of it into a DOM.
4. `fullText.length > maxChars` (line 76) — **the cap fires here**, after the damage is done.

**Impact.** At 1.7 % of the permitted file size this already reaches 3.1 GB RSS on a 9-second frozen
main thread. Extrapolating the same 697:1 ratio to the full 10 MB budget gives ~7 GB — well past the
point Chrome kills a renderer. The user gets an "Aw, Snap" tab crash, **no banner, no recovery** —
precisely the outcome TM-007 records as mitigated. Bible §12 defines SEV-1 as "crash on core flow".
Note DEFLATE tops out near 1032:1, so 697:1 is not even the worst case.

**Suggested fix direction (not implemented).** Cap the *decompressed* size of `word/document.xml`
before conversion (mammoth's zipfile layer exposes entry sizes), and/or run the parse in a Worker so
a runaway document kills the worker rather than the tab. Either way the byte cap must be applied to
decompressed bytes, not just compressed ones.

---

## MU-2 — SEV-2 — Nested block elements are double/triple-counted

**Concrete input.** A `.docx` containing one table with a single cell holding two paragraphs
(`hostile.docx`, which also has 7 ordinary paragraphs).

**Expected.** `fullText` is the document's text once, in order; `paragraphCount` counts real paragraphs.

**Actual.**

```
paragraphCount: 9        (7 real paragraphs + 1 cell)
fullText: "...\nNested list follows.\nCellACellB\nCellA\nCellB"
```

The cell's text appears **three times** — once via the `<td>`, once per inner `<p>`. Block list for a
minimal case:

```
'<p>Intro</p><table>…<td><p>CellA</p><p>CellB</p></td>…</table>'
→ blocks: [ P:"Intro", TD:"CellACellB", P:"CellA", P:"CellB" ]

'<ul><li>Outer<ul><li>Inner</li></ul></li></ul>'
→ blocks: [ 0=LI:"OuterInner", 1=LI:"Inner" ]
```

**Root cause.** `BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote'` is duplicated
verbatim in `parseDocx.ts:28` and `anchors.ts:10`, and `querySelectorAll` returns ancestors **and**
descendants. mammoth emits `<td><p>…</p></td>` for every table cell and
`ul|ol > li > ul > li` for every multi-level list (its default style map, `mammoth/lib/options-reader.js:45-53`),
so this fires on ordinary business documents, not just crafted ones.

**Impact.**
- Feature 1's `fullText` is not the document's text. Bible §7 defines `docHash` as SHA-256 **of the
  extracted text** — Feature 3 will hash duplicated text.
- `MAX_EXTRACTED_CHARS` is consumed 2–3× by tables: a legitimate ~2.5 M-char table-heavy document is
  wrongly rejected as `document-too-long`.
- `paragraphCount` is wrong for any document with a table, blockquote, or nested list.
- Roughly half the block indices are unreachable as anchors (see MU-3), making stored
  `paragraphIndex` values brittle for Feature 3 restore.

**Test gap.** `parseDocx.test.ts:74` asserts `paragraphCount === 5` on a fixture with no table.
`anchors.test.ts` `SAMPLE_HTML` has no nesting. `sanitize.test.ts:60` includes a `<table>` but only
asserts `<td>cell</td>` survives.

---

## MU-3 — SEV-2 — Cross-paragraph selection accepted inside a single nested block

**Contract being violated.** `anchors.ts:33-37` — *"Returns null when the range … spans more than one
block"*; `anchors.test.ts:100` asserts this for sibling `<p>`s; the journey's Failure Recovery (Step 3)
expects the "Select text inside the document to highlight" hint.

**Concrete input.** `<p>Intro</p><table><tbody><tr><td><p>CellA</p><p>CellB</p></td></tr></tbody></table>`,
range from `CellA` text offset 2 to `CellB` text offset 3 (a plausible mouse drag down a table cell).

**Expected.** `anchorFromRange` → `null`, toolbar shows the hint.

**Actual.**

```
cross-paragraph anchor = {"paragraphIndex":1,"startOffset":2,"endOffset":8,"exactText":"llACel"}
```

The highlight is created, and `exactText` is `"llACel"` — a string the user never saw as contiguous
text (it straddles a paragraph break). Same for the nested-list case: selecting "Inner" in
`<li>Outer<ul><li>Inner</li></ul></li>` yields `paragraphIndex 0` (the **outer** `li`), leaving block
index 1 permanently unreachable.

**Root cause.** `blocks.find((b) => b.contains(range.startContainer))` (anchors.ts:46-47) returns the
**first** block in document order that contains the node — always the outer element when blocks nest —
so `startBlock === endBlock` even across a real paragraph boundary. Shares a root cause with MU-2.

---

## MU-4 — SEV-2 — Concurrent-open race renders the wrong document

**Steps.**
1. Pick a large `.docx` (slow parse).
2. Immediately pick a small one before the first finishes.

**Expected.** The last file picked is the one displayed; the earlier parse is abandoned.

**Actual (probe with `parseDocx` mocked to controllable promises; pick #2 resolved first, then pick #1):**

```
final rendered document text: "FIRST-FILE-CONTENT"
```

The second document renders, then seconds later the first parse lands and **overwrites** it.

**Root cause.** `App.tsx:openFile` (lines 32-59) has no request-generation token and no `AbortController`.
Every resolution unconditionally runs `setHighlights([])` then `setView({kind:'ready', …})`.

**Impact.** Nothing in the UI names the open file — `fileName` appears only in the transient
`Opening {fileName}…` text — so the user has no way to notice they are reading the wrong document.
Any highlights placed on the visible document are silently wiped when the stale parse lands. With
Feature 3 this means annotations attach to the wrong `docHash`. Bible §12 SEV-2: "significant UX failure".

---

## MU-5 — SEV-3 — No error boundary: a throw blanks the app instead of showing a banner

**Steps.** Force a throw in the highlight paint path (probe mocked `applyHighlightMarks` to throw a
`TypeError`), open a document, select text, pick a color.

**Expected (user-journey Failure Recovery).** A specific banner, "no stack traces", app still usable.

**Actual.**

```
click threw: simulated anchor-math failure
app-shell still mounted: false
container HTML length after throw: 0
banner/alert present: false
```

The entire React tree unmounts — blank white page. Only a page reload recovers.

**Evidence of the gap.** `grep -rn "ErrorBoundary|componentDidCatch|onerror|unhandledrejection" src/`
returns **zero** production hits (only the string `onerror` inside sanitizer test payloads).
`main.tsx` renders `<App/>` with no boundary and no global handler.

**Reachability today.** I could not find an in-scope input that throws — see the fuzz results under
"What I tried that did NOT break". This is a latent architectural gap, hence SEV-3. It escalates
sharply with Feature 3: TM-003 requires corrupt localStorage to *"never crash"*, and the restore path
feeds attacker-influenceable anchors straight into `applyHighlightMarks`.

---

## MU-6 — SEV-3 — Anchors have no grapheme-cluster or surrogate-pair guard

**Bible §4 Architecture Stress Test #5** explicitly requires this coverage: *"Unicode: emoji/combining
chars/RTL runs → … anchor tests must cover these or highlights will drift."* `anchors.test.ts:80`
covers only a selection of a **whole** emoji.

**Concrete inputs and actual results** (all via `applyHighlightMarks`, offsets in UTF-16 code units):

| Text | Cut at | Resulting DOM | Rendered as |
|---|---|---|---|
| `A👩‍💻B` (ZWJ) | 3 | `<mark>A👩</mark>‍💻B` | woman + laptop, composed glyph destroyed |
| `X🇫🇷Y` (flag) | 3 | `<mark>X🇫</mark>🇷Y` | two regional-indicator letters, no flag |
| `X👍🏽Y` (skin tone) | 3 | `<mark>X👍</mark>🏽Y` | thumb + orphan modifier swatch |
| `ab🎉cd` (mid-surrogate) | 3 | `<mark>ab\uD83C</mark>\uDF89cd` | `ab��cd` |

Every one returned `applied = true` with `textContent === original`.

**Why the suite can't see it.** `highlightFlow.test.tsx:87` asserts *"should keep the document text
byte-identical after highlighting"* by comparing `region.textContent`. Lone surrogates and split
clusters concatenate back to identical code units, so that assertion **passes while the rendering is
visibly corrupt**.

**`anchorFromRange` does not guard the boundary either:**

```
mid-surrogate anchorFromRange = {"paragraphIndex":0,"startOffset":0,"endOffset":3,"exactText":"ab\ud83c"}
ZWJ-split   anchorFromRange = {"paragraphIndex":0,"startOffset":0,"endOffset":3,"exactText":"A👩"}
```

A lone high surrogate is stored in `exactText` and (Feature 3) will be JSON-serialized to localStorage.

**Reachability.** Browsers normally snap mouse selections to grapheme clusters, so hand-reaching this
is engine-dependent — hence SEV-3, not SEV-2. The guaranteed paths are (a) any programmatic range,
and (b) Feature 3 restore of a stored or tampered anchor, which bypasses `anchorFromRange` entirely.

---

## MU-7 — SEV-3 — Over-cap selection shows the wrong message

**Steps.** Open a document with a paragraph longer than 5,000 characters; select 6,000 characters.

**Expected.** A message explaining the 5,000-character selection cap (a documented control —
Bible §5 `MAX_SELECTION_CHARS`, cited as the TM-005 excerpt-size bound).

**Actual.**

```
hint shown for a 6000-char (over-cap) selection: "Select text inside the document to highlight."
```

The text **is** inside the document. `anchorFromRange:57` collapses "too long" into the same `null`
that means "unanchorable", and `App.tsx:88-91` maps every `null` to `HINT_UNANCHORABLE`. The user has
no way to learn the cap exists or why the highlight was refused.

---

## MU-8 — SEV-3 — Collapsed anchor reports success while painting nothing

**Input.** `applyHighlightMarks(container, {paragraphIndex: 0, startOffset: 3, endOffset: 3, exactText: ''})`

**Expected.** `false` (unlocated) — `anchorFromRange:21` rejects collapsed ranges, so the same rule
should hold on the restore path.

**Actual.**

```
rangeFromAnchor(3,3) = Range {}          ← accepted
applyHighlightMarks(collapsed) = true | marks = 0
```

**Root cause.** `rangeFromAnchor:88` guards `endOffset < startOffset`, not `endOffset <= startOffset`.
`applyHighlightMarks`'s `text.slice(s,s) !== exactText` check passes when `exactText` is `''`, and
`wrapRangeInMarks` walks a zero-length segment list and returns.

**Impact.** Not reachable from Feature 2's own UI. It is reachable from Feature 3 restore of corrupt or
tampered localStorage (TM-003), where it produces phantom "successfully located" highlights and
defeats the unlocated detection Feature 5 is built on. One-word fix: `endOffset <= startOffset`.

---

## MU-9 — SEV-3 — Hostile `.docx` plants live outbound links and arbitrary element ids

**Input.** `hostile.docx` — hyperlink relationships with `javascript:`, `data:text/html;base64,…`, and
`https://evil.example/steal?q=1` targets (each with `w:tgtFrame="_blank"`), plus bookmarks named
`root` and `evil><script>`.

**Raw mammoth output (what reaches the sink):**

```html
<a href="javascript:alert(document.domain)" target="_blank">JS LINK</a>
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">DATA LINK</a>
<a href="https://evil.example/steal?q=1" target="_blank">EXTERNAL LINK</a>
<a id="root"></a><a id="evil&gt;&lt;script&gt;"></a>
```

**After `sanitizeToFragment` (actual):**

```html
<a>JS LINK</a>
<a>DATA LINK</a>
<a href="https://evil.example/steal?q=1">EXTERNAL LINK</a>
<a id="root"></a><a id="evil><script>"></a>
```

**Good news, verified:** `javascript:` and `data:text/html` hrefs are stripped; `target` is stripped
(it is **not** in DOMPurify's default attribute allowlist, so `w:tgtFrame` is neutralized).

**Residue:**
- The **`https:` link survives intact and is clickable**. The production CSP (`default-src 'self'`) does
  not restrict top-level navigation, so a click leaves the app: the document and every in-memory
  highlight are discarded with no confirmation, and the attacker learns the document was opened
  (plus anything encoded in the URL). The journey has no recovery path for this.
- Docx **bookmark names become raw `id` attributes** (mammoth `document-to-html.js:395`). `id="root"`
  survived and collides with the app's own mount point `<div id="root">`. DOMPurify's `SANITIZE_DOM`
  caught `id="documentElement"` but not `root` — it only blocks names colliding with existing
  document/form properties. Not exploitable today (`main.tsx` resolves `#root` before any document is
  loaded, and tree order favours the real element), but any future `getElementById` or anchor-jump
  code (Feature 5) inherits attacker-controlled ids and duplicate-id collisions.

---

## MU-10 — SEV-4 — Sanitizer permits `style` and `class`

TM-002's mitigation cell claims *"DOMPurify with defaults hardened"*. Measured residue:

```
IN : <p style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:9">overlay</p>
OUT: <p style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:9">overlay</p>

IN : <mark class="hl hl-yellow" data-hl-id="spoof">fake highlight</mark>
OUT: <mark class="hl hl-yellow">fake highlight</mark>
```

The first is a full-viewport UI-redress overlay. The second forges a highlight — `class="hl hl-yellow"`
matches the app's own rule at `src/styles.css:179`. (`data-hl-id` **is** correctly stripped by
`ALLOW_DATA_ATTR: false` — good, that closes highlight-identity spoofing.)

**Why SEV-4, not higher:** neither is reachable through mammoth today — its default style map emits no
`class` or `style` attributes (verified in `mammoth/lib/options-reader.js` and `document-to-html.js`) —
and the production CSP has no `'unsafe-inline'` in the `style-src` fallback, which blocks inline style
attributes in the built app. But the design premise (`sanitize.ts:1-5`) is that converter output is
untrusted, and the CSP is injected at build time only (`vite.config.ts`, `apply: 'build'`), so
`npm run dev` has no such backstop. `FORBID_ATTR: ['style', 'class', 'id']` would close all of MU-9's
id residue and MU-10 independently of mammoth's behaviour.

---

## MU-11 — SEV-4 — `empty-document` deviates from the documented recovery

`docs/phase-0/user-journey.md:54` — *"Document has no extractable text (e.g., images only) → **Render
succeeds** but shows an explicit empty-content message."*

Actual: `parseDocx:74` throws `empty-document`; `App.tsx:48-58` shows the banner and returns to the
landing state. The document view is never rendered. The message is right; the state is not.
Bible §4 stress-test #2 ("must hit the explicit 'no readable text' path, not a blank screen") is
arguably satisfied, so this is a doc-vs-code reconciliation item — pick one and align the other.

---

## MU-12 — SEV-4 — `crypto.randomUUID()` at module scope, no fallback

`src/core/log.ts:18` — `const sessionId: string = crypto.randomUUID();` runs during module evaluation.
On a non-secure context (e.g. a colleague hitting `http://<lan-ip>:5173` on the dev server)
`crypto.randomUUID` is `undefined` → `TypeError` before `main.tsx` executes → white screen, no banner,
and (per MU-5) nothing to catch it. HTTPS and `localhost` are unaffected, and every browser in the
Bible §15 matrix ("last 2 versions") supports it — so this is a deploy-shape hazard, not a
browser-support one.

---

## What I tried that did NOT break

**TM-002 / DOM-sink trace — clean.** Every path from mammoth to the DOM was walked:
`parseDocx` → `sanitizeToFragment` (the only producer of `ParsedDocument.fragment`) → `App` state →
`DocumentView`'s `container.replaceChildren(parsed.fragment.cloneNode(true))`. The only other DOM
writes in production code are `document.createElement('mark')`, `mark.className` (from a 3-value
union), `mark.dataset.hlId` (a `crypto.randomUUID()`), and `insertBefore`/`appendChild`.
`grep -rn "innerHTML|insertAdjacentHTML|dangerouslySetInnerHTML|outerHTML|document.write|createContextualFragment|eval("`
over `src/` and `index.html` returns **only two hits, both in test files** (`sanitize.test.ts:12`,
`anchors.test.ts:29` — the latter already carries a justified `nosemgrep`). `sanitizeToFragment` is
confirmed the single sink. Banner and toolbar render user-facing strings as React text nodes.

**Sanitizer payloads — all stripped:** `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`,
`<form>/<input>/<button>`, `onerror`/`onclick`/`onload`, `javascript:` (including the leading-whitespace
variant `"  javascript:alert(1)"`), `data:text/html` hrefs, `target`, and all `data-*` attributes.
Literal `<img src=x onerror=alert(1)>` typed into the document stays text.

**External-image beacon — blocked upstream.** A `<a:blip r:link="…">` pointing at
`https://evil.example/beacon.png` does **not** produce an `<img>`: mammoth reports
*"could not read external image … external file access is disabled"* as a warning and emits nothing.
No network request. The "nothing is uploaded" promise holds on this path.

**Adjacent / touching highlights — robust.** `[0,5)` + `[5,11)` on `"hello world"` paint correctly and
independently in **both** sorted and reverse-application order; text preserved exactly:
`<mark class="hl hl-yellow" data-hl-id="h1">hello</mark><mark class="hl hl-green" data-hl-id="h2"> world</mark>`.
A whole-block highlight across `<b>`/`<i>` boundaries produces two marks with the text intact.
`wrapRangeInMarks`'s `splitText` sequencing (including the `sameNode` re-binding at anchors.ts:118-124)
handles the empty-text-node cases correctly.

**Degenerate offsets — no throws, clean rejections.** `startOffset: -1`; `endOffset: 1e9`;
`NaN` start; `NaN` end; fractional `1.5`/`3.5`; and `paragraphIndex` of `-1`, `0.5`, `1e9`, `NaN` —
all returned `false` with the DOM untouched. No path in `applyHighlightMarks` threw.

**Whitespace-only selection** → `null` (correct hint path). **Collapsed live range** → `null`.
**Selection outside the container** → toolbar hidden.

**Corrupt-XML `.docx`** (mismatched close tag in `word/document.xml`, i.e. the journey's "corrupt file"
case) → clean `invalid-docx` banner, app still usable, and **no unhandled promise rejection escaped**
`parseDocx`'s try/catch (checked with a process-level `unhandledRejection` listener inside the app
test and again in a standalone Node run).

**Baseline suite** after deleting both throwaway probe files: `npx vitest run` → **53/53 passing, 7/7 files**.

---

## Suggested triage order

1. **MU-1** — SEV-1, cannot be deferred per Bible §12. Falsifies a recorded TM-007 mitigation.
2. **MU-2 / MU-3** — one shared root cause (nested-block selector). Fixing it before Feature 3 avoids
   baking a wrong `docHash` and wrong `paragraphIndex` semantics into persisted data.
3. **MU-4** — cheap fix (generation token in `openFile`), high confusion cost.
4. **MU-8 / MU-7** — one- and two-line fixes; MU-8 should land before Feature 3's restore path exists.
5. **MU-5 / MU-6** — add an error boundary and grapheme-boundary guards before Feature 3 turns them
   from latent into reachable.
6. **MU-9 / MU-10** — a single `FORBID_ATTR: ['style','class','id']` line plus a link policy decision.
7. **MU-11 / MU-12** — documentation reconciliation and a two-line fallback.
