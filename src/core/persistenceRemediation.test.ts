/**
 * UAT Session 3 remediation — repository/parse fixes (BUG-28, 29, 30).
 * Written before the fixes.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { loadAnnotations, saveAnnotations } from './annotationRepository';
import type { AnnotationStore } from './types';
import { STORAGE_KEY_PREFIX } from './types';

const DOC_HASH = 'b'.repeat(64);

function baseStore(): AnnotationStore {
  return {
    schemaVersion: 1,
    docHash: DOC_HASH,
    highlights: [
      {
        id: 'h1',
        color: 'yellow',
        anchor: { paragraphIndex: 0, startOffset: 0, endOffset: 3, exactText: 'abc' },
        note: { text: 'keep me', createdAt: 'x', updatedAt: 'y' },
        createdAt: 'x',
        updatedAt: 'y',
      },
    ],
    createdAt: 'orig',
    updatedAt: 'y',
  };
}

beforeEach(() => localStorage.clear());

describe('BUG-28/29 — loadAnnotations reconstructs fresh, validated structures', () => {
  it('should strip unexpected extra fields from a tampered highlight', () => {
    const tampered = baseStore() as unknown as Record<string, unknown>;
    (tampered.highlights as Record<string, unknown>[])[0]!.evilField = { a: 1 };
    localStorage.setItem(STORAGE_KEY_PREFIX + DOC_HASH, JSON.stringify(tampered));
    const loaded = loadAnnotations(DOC_HASH);
    expect(loaded).not.toBeNull();
    const h = loaded!.highlights[0]! as unknown as Record<string, unknown>;
    expect('evilField' in h).toBe(false);
    expect(h.id).toBe('h1');
    expect(h.color).toBe('yellow');
  });

  it('should drop a note that violates the 1-1000 char rule but keep the highlight', () => {
    const s = baseStore();
    s.highlights[0]!.note = { text: '', createdAt: 'x', updatedAt: 'y' };
    localStorage.setItem(STORAGE_KEY_PREFIX + DOC_HASH, JSON.stringify(s));
    const loaded = loadAnnotations(DOC_HASH);
    expect(loaded).not.toBeNull();
    expect(loaded!.highlights[0]!.note).toBeUndefined();
  });

  it('should drop a highlight with a non-integer or inverted anchor', () => {
    const s = baseStore() as unknown as { highlights: Record<string, unknown>[] };
    (s.highlights[0]!.anchor as Record<string, unknown>).startOffset = 0.5;
    localStorage.setItem(STORAGE_KEY_PREFIX + DOC_HASH, JSON.stringify(s));
    const loaded = loadAnnotations(DOC_HASH);
    // Reconstruction drops the invalid highlight; store still loads (empty).
    expect(loaded).not.toBeNull();
    expect(loaded!.highlights).toHaveLength(0);
  });

  it('should still round-trip a valid store unchanged (equal shape)', () => {
    saveAnnotations(baseStore());
    expect(loadAnnotations(DOC_HASH)).toEqual(baseStore());
  });
});
