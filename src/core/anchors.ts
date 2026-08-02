/**
 * Feature 2 core: anchor math. An anchor is (paragraphIndex, startOffset,
 * endOffset, exactText) where offsets are UTF-16 code units into the block's
 * textContent (Bible §5). Anchor indices count non-empty block elements in
 * document order — the same predicate parseDocx uses for paragraphCount.
 */
import type { Highlight, TextAnchor } from './types';
import { MAX_SELECTION_CHARS } from './types';

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote';

export function getBlockElements(container: Element | DocumentFragment): Element[] {
  // BUG-2: leaf blocks only — never both an ancestor block (e.g. <td>, <li>,
  // <blockquote>) and a block nested inside it, which would double-count text.
  return Array.from(container.querySelectorAll(BLOCK_SELECTOR)).filter(
    (el) => (el.textContent ?? '').trim().length > 0 && el.querySelector(BLOCK_SELECTOR) === null,
  );
}

/** Code-unit offset of a (node, offset) boundary within its block. */
function offsetAtBoundary(block: Element, node: Node, offset: number): number | null {
  if (!block.contains(node)) {
    return null;
  }
  const probe = document.createRange();
  probe.selectNodeContents(block);
  try {
    probe.setEnd(node, offset);
  } catch {
    return null;
  }
  return probe.toString().length;
}

/**
 * Compute an anchor from a live Range. Returns null when the range is
 * collapsed, escapes the document container, spans more than one block,
 * or exceeds the selection-length cap — callers decide the user feedback.
 */
export function anchorFromRange(
  container: Element | DocumentFragment,
  range: Range,
): TextAnchor | null {
  if (range.collapsed) {
    return null;
  }
  const blocks = getBlockElements(container);
  const startBlock = blocks.find((b) => b.contains(range.startContainer));
  let endBlock = blocks.find((b) => b.contains(range.endContainer));
  let effectiveRange = range;
  // BUG-5: Chromium triple-click ends the selection at the START of the block
  // AFTER the paragraph. If the end boundary is at offset 0 of a later block
  // (contributing no text), clamp it back to the end of the start block.
  if (startBlock && endBlock !== startBlock && range.endOffset === 0) {
    const clamped = document.createRange();
    clamped.setStart(range.startContainer, range.startOffset);
    clamped.setEnd(startBlock, startBlock.childNodes.length);
    endBlock = startBlock;
    effectiveRange = clamped;
  }
  if (!startBlock || startBlock !== endBlock) {
    return null;
  }
  const startOffset = offsetAtBoundary(
    startBlock,
    effectiveRange.startContainer,
    effectiveRange.startOffset,
  );
  const endOffset = offsetAtBoundary(
    startBlock,
    effectiveRange.endContainer,
    effectiveRange.endOffset,
  );
  if (startOffset === null || endOffset === null || endOffset <= startOffset) {
    return null;
  }
  const exactText = (startBlock.textContent ?? '').slice(startOffset, endOffset);
  if (exactText.trim().length === 0 || exactText.length > MAX_SELECTION_CHARS) {
    return null;
  }
  return {
    paragraphIndex: blocks.indexOf(startBlock),
    startOffset,
    endOffset,
    exactText,
  };
}

function resolveTextPosition(
  block: Element,
  target: number,
): { node: Text; offset: number } | null {
  let total = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const length = node.data.length;
    if (target <= total + length) {
      return { node, offset: target - total };
    }
    total += length;
  }
  return null;
}

/** Rebuild a live Range from stored offsets. Null when offsets don't fit. */
export function rangeFromAnchor(block: Element, startOffset: number, endOffset: number): Range | null {
  const text = block.textContent ?? '';
  // BUG-8: reject zero-width (equal offsets) — a highlight must cover >0 chars,
  // otherwise applyHighlightMarks would report success while painting nothing.
  if (startOffset < 0 || endOffset > text.length || endOffset <= startOffset) {
    return null;
  }
  const start = resolveTextPosition(block, startOffset);
  const end = resolveTextPosition(block, endOffset);
  if (!start || !end) {
    return null;
  }
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

/** No-overlap rule (Manifesto Q1). Touching ranges (end == start) are allowed. */
export function anchorsIntersect(a: TextAnchor, b: TextAnchor): boolean {
  return (
    a.paragraphIndex === b.paragraphIndex &&
    a.startOffset < b.endOffset &&
    b.startOffset < a.endOffset
  );
}

function wrapRangeInMarks(block: Element, range: Range, highlight: Highlight): void {
  let startNode = range.startContainer as Text;
  let endNode = range.endContainer as Text;
  const sameNode = startNode === endNode;
  if (range.endOffset < endNode.data.length) {
    endNode.splitText(range.endOffset);
  }
  if (range.startOffset > 0) {
    const middle = startNode.splitText(range.startOffset);
    if (sameNode) {
      endNode = middle;
    }
    startNode = middle;
  }
  const segments: Text[] = [];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let inRange = false;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node === startNode) {
      inRange = true;
    }
    if (inRange && node.data.length > 0) {
      segments.push(node);
    }
    if (node === endNode) {
      break;
    }
  }
  for (const segment of segments) {
    const mark = document.createElement('mark');
    mark.className = `hl hl-${highlight.color}`;
    mark.dataset.hlId = highlight.id;
    segment.parentNode?.insertBefore(mark, segment);
    mark.appendChild(segment);
  }
}

/**
 * Paint a highlight into the live document DOM. Returns false (applying
 * nothing) when the anchor no longer resolves or its exactText no longer
 * matches — the caller surfaces "unlocated" state (Feature 5).
 */
export function applyHighlightMarks(container: Element, highlight: Highlight): boolean {
  const blocks = getBlockElements(container);
  const block = blocks[highlight.anchor.paragraphIndex];
  if (!block) {
    return false;
  }
  const text = block.textContent ?? '';
  const { startOffset, endOffset, exactText } = highlight.anchor;
  if (text.slice(startOffset, endOffset) !== exactText) {
    return false;
  }
  const range = rangeFromAnchor(block, startOffset, endOffset);
  if (!range) {
    return false;
  }
  wrapRangeInMarks(block, range, highlight);
  return true;
}
