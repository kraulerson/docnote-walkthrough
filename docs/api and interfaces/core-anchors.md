# Interface: Anchor Engine (Feature 2)

Module: `src/core/anchors.ts` — framework-free. Offsets are UTF-16 code units
into a block's `textContent`; blocks are non-empty `p/h1-h6/li/td/th/pre/blockquote`
in document order (same predicate as `parseDocx.paragraphCount`).

| Function | Contract |
|---|---|
| `getBlockElements(container)` | Non-empty block elements, document order. |
| `anchorFromRange(container, range)` | `TextAnchor` or null (collapsed, escapes container, spans >1 block, empty/whitespace, >5,000 chars). Callers map null to user feedback. |
| `rangeFromAnchor(block, start, end)` | Live `Range` or null when offsets don't fit the block's current text. |
| `anchorsIntersect(a, b)` | True on real overlap in the same paragraph; touching (end==start) allowed. |
| `applyHighlightMarks(container, highlight)` | Paints `<mark class="hl hl-<color>" data-hl-id>` segments over existing text nodes. False (paints nothing) when the anchor no longer resolves or exactText mismatches — callers surface "unlocated". Never alters textContent. |
