/**
 * Feature 2 (highlight-apply) — anchor math tests. This is the project's
 * declared riskiest area (Intake §11): offsets are UTF-16 code units of a
 * block's textContent and must survive styled runs and unicode.
 * Written before implementation (Build Loop 2.2).
 */
import { describe, expect, it } from 'vitest';
import {
  anchorFromRange,
  anchorsIntersect,
  applyHighlightMarks,
  getBlockElements,
  rangeFromAnchor,
} from './anchors';
import type { Highlight, TextAnchor } from './types';

const SAMPLE_HTML =
  '<h1>Quarterly Review</h1>' +
  '<p>The <strong>launch</strong> shipped <em>two</em> weeks early.</p>' +
  '<p>Unicode: café 🎉 end.</p>' +
  '<p>Plain closing paragraph.</p>';

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  // Confirmed false positive: SAMPLE_HTML is a hardcoded test-fixture literal
  // (defined in this file), never user- or document-controlled. Production code
  // never uses innerHTML — the only sanctioned sink is sanitizeToFragment (DOMPurify).
  // nosemgrep directive MUST be on the line immediately above the finding.
  // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
  el.innerHTML = SAMPLE_HTML;
  document.body.append(el);
  return el;
}

function rangeOver(block: Element, startOffset: number, endOffset: number): Range {
  const made = rangeFromAnchor(block, startOffset, endOffset);
  if (!made) {
    throw new Error('test setup: rangeFromAnchor returned null');
  }
  return made;
}

function highlight(anchor: TextAnchor, id = 'h1'): Highlight {
  return {
    id,
    color: 'yellow',
    anchor,
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  };
}

describe('getBlockElements', () => {
  it('should list block elements in document order', () => {
    const container = makeContainer();
    const blocks = getBlockElements(container);
    expect(blocks.map((b) => b.tagName)).toEqual(['H1', 'P', 'P', 'P']);
    container.remove();
  });

  it('should count only LEAF blocks, never an ancestor + its descendant (BUG-2)', () => {
    const container = document.createElement('div');
    // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
    container.innerHTML =
      '<table><tbody><tr><td><p>CellA</p><p>CellB</p></td></tr></tbody></table>' +
      '<ul><li><p>Item</p></li></ul>' +
      '<blockquote><p>Quoted</p></blockquote>' +
      '<p>After</p>';
    document.body.append(container);
    const blocks = getBlockElements(container);
    // Only the innermost text-bearing blocks: CellA, CellB, Item, Quoted, After = 5.
    expect(blocks.map((b) => b.textContent)).toEqual(['CellA', 'CellB', 'Item', 'Quoted', 'After']);
    // No block may contain another selected block.
    for (const a of blocks) {
      for (const b of blocks) {
        if (a !== b) {
          expect(a.contains(b)).toBe(false);
        }
      }
    }
    container.remove();
  });
});

describe('anchorFromRange', () => {
  it('should compute offsets relative to the block textContent across styled runs', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[1]!;
    // "The launch shipped two weeks early." — select "launch shipped two"
    const text = p.textContent!;
    const start = text.indexOf('launch');
    const end = text.indexOf('two') + 'two'.length;
    const range = rangeOver(p, start, end);
    const anchor = anchorFromRange(container, range);
    expect(anchor).toEqual({
      paragraphIndex: 1,
      startOffset: start,
      endOffset: end,
      exactText: 'launch shipped two',
    });
    container.remove();
  });

  it('should handle unicode text with surrogate pairs as UTF-16 code units', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[2]!;
    const text = p.textContent!;
    const start = text.indexOf('café');
    const end = text.indexOf('end.') + 'end.'.length;
    const anchor = anchorFromRange(container, rangeOver(p, start, end));
    expect(anchor?.exactText).toBe('café 🎉 end.');
    expect(anchor?.endOffset).toBe(end);
    container.remove();
  });

  it('should return null for a collapsed range', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[1]!;
    // Build the collapsed range directly — rangeFromAnchor (correctly) refuses
    // equal offsets since the BUG-8 fix, so it can't be used to make one.
    const range = document.createRange();
    range.setStart(p.firstChild!, 3);
    range.setEnd(p.firstChild!, 3);
    expect(anchorFromRange(container, range)).toBeNull();
    container.remove();
  });

  it('should return null for a range spanning two blocks', () => {
    const container = makeContainer();
    const blocks = getBlockElements(container);
    const range = document.createRange();
    range.setStart(blocks[1]!.firstChild!, 1);
    range.setEnd(blocks[2]!.firstChild!, 3);
    expect(anchorFromRange(container, range)).toBeNull();
    container.remove();
  });

  it('should return null for a range spanning two paragraphs inside one nested cell (BUG-3)', () => {
    const container = document.createElement('div');
    // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
    container.innerHTML = '<table><tbody><tr><td><p>CellA</p><p>CellB</p></td></tr></tbody></table>';
    document.body.append(container);
    const blocks = getBlockElements(container); // [CellA, CellB]
    const range = document.createRange();
    range.setStart(blocks[0]!.firstChild!, 2); // inside CellA
    range.setEnd(blocks[1]!.firstChild!, 2); // inside CellB
    expect(anchorFromRange(container, range)).toBeNull();
    container.remove();
  });

  it('should clamp a triple-click range that ends at the start of the next block (BUG-5)', () => {
    // Chromium triple-click: selection end lands at (nextBlock, offset 0).
    const container = makeContainer();
    const blocks = getBlockElements(container);
    const range = document.createRange();
    range.selectNodeContents(blocks[1]!); // "The launch shipped two weeks early."
    // Simulate Chromium extending the end into the next block's start.
    range.setEnd(blocks[2]!, 0);
    const anchor = anchorFromRange(container, range);
    expect(anchor).not.toBeNull();
    expect(anchor?.paragraphIndex).toBe(1);
    expect(anchor?.exactText).toBe('The launch shipped two weeks early.');
    container.remove();
  });

  it('should return null for a range outside the container', () => {
    const container = makeContainer();
    const outside = document.createElement('p');
    outside.textContent = 'not part of the document';
    document.body.append(outside);
    const range = document.createRange();
    range.selectNodeContents(outside);
    expect(anchorFromRange(container, range)).toBeNull();
    container.remove();
    outside.remove();
  });
});

describe('rangeFromAnchor round-trip', () => {
  it('should restore exactly the anchored text', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[1]!;
    const text = p.textContent!;
    const start = text.indexOf('shipped');
    const end = start + 'shipped two weeks'.length;
    const range = rangeOver(p, start, end);
    expect(range.toString()).toBe('shipped two weeks');
    container.remove();
  });

  it('should return null when offsets exceed the block text', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[3]!;
    expect(rangeFromAnchor(p, 0, 10_000)).toBeNull();
    container.remove();
  });

  it('should return null for equal start/end offsets — no zero-width highlight (BUG-8)', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[3]!;
    expect(rangeFromAnchor(p, 4, 4)).toBeNull();
    container.remove();
  });
});

describe('anchorsIntersect (no-overlap rule, Manifesto Q1)', () => {
  const base: TextAnchor = { paragraphIndex: 1, startOffset: 4, endOffset: 10, exactText: 'x' };

  it('should detect real overlap in the same paragraph', () => {
    expect(
      anchorsIntersect(base, { paragraphIndex: 1, startOffset: 8, endOffset: 12, exactText: 'y' }),
    ).toBe(true);
  });

  it('should allow touching ranges (end == start)', () => {
    expect(
      anchorsIntersect(base, { paragraphIndex: 1, startOffset: 10, endOffset: 14, exactText: 'y' }),
    ).toBe(false);
  });

  it('should never intersect across different paragraphs', () => {
    expect(
      anchorsIntersect(base, { paragraphIndex: 2, startOffset: 4, endOffset: 10, exactText: 'y' }),
    ).toBe(false);
  });
});

describe('applyHighlightMarks', () => {
  it('should wrap the anchored range in mark elements without changing the text', () => {
    const container = makeContainer();
    const before = container.textContent;
    const p = getBlockElements(container)[1]!;
    const text = p.textContent!;
    const start = text.indexOf('launch');
    const end = text.indexOf('two') + 3;
    const anchor = anchorFromRange(container, rangeOver(p, start, end))!;

    const applied = applyHighlightMarks(container, highlight(anchor));
    expect(applied).toBe(true);
    expect(container.textContent).toBe(before);

    const marks = Array.from(container.querySelectorAll('mark[data-hl-id="h1"]'));
    expect(marks.length).toBeGreaterThanOrEqual(1);
    expect(marks.map((m) => m.textContent).join('')).toBe('launch shipped two');
    expect(marks.every((m) => m.classList.contains('hl-yellow'))).toBe(true);
    container.remove();
  });

  it('should span styled runs (multiple marks across strong/em boundaries)', () => {
    const container = makeContainer();
    const p = getBlockElements(container)[1]!;
    const text = p.textContent!;
    const anchor = anchorFromRange(
      container,
      rangeOver(p, text.indexOf('The'), text.indexOf('early')),
    )!;
    applyHighlightMarks(container, highlight(anchor, 'h2'));
    const marks = container.querySelectorAll('mark[data-hl-id="h2"]');
    expect(marks.length).toBeGreaterThan(1);
    container.remove();
  });

  it('should refuse to apply when the stored exactText no longer matches (stale anchor)', () => {
    const container = makeContainer();
    const stale: TextAnchor = {
      paragraphIndex: 3,
      startOffset: 0,
      endOffset: 5,
      exactText: 'DIFFERENT TEXT',
    };
    expect(applyHighlightMarks(container, highlight(stale, 'h3'))).toBe(false);
    expect(container.querySelector('mark[data-hl-id="h3"]')).toBeNull();
    container.remove();
  });

  it('should refuse anchors pointing at a paragraph index that does not exist', () => {
    const container = makeContainer();
    const gone: TextAnchor = { paragraphIndex: 99, startOffset: 0, endOffset: 3, exactText: 'abc' };
    expect(applyHighlightMarks(container, highlight(gone, 'h4'))).toBe(false);
    container.remove();
  });
});
