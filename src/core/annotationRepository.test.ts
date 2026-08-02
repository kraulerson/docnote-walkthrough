/**
 * Feature 6 — annotationRepository (the ONLY module that touches localStorage,
 * Bible §10 rule 5). Written before implementation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAnnotations, saveAnnotations } from './annotationRepository';
import type { AnnotationStore, Highlight } from './types';
import { STORAGE_KEY_PREFIX } from './types';

const DOC_HASH = 'a'.repeat(64);

function highlight(id: string): Highlight {
  return {
    id,
    color: 'yellow',
    anchor: { paragraphIndex: 0, startOffset: 0, endOffset: 3, exactText: 'abc' },
    note: { text: 'note', createdAt: 'x', updatedAt: 'x' },
    createdAt: 'x',
    updatedAt: 'x',
  };
}

function store(): AnnotationStore {
  return {
    schemaVersion: 1,
    docHash: DOC_HASH,
    highlights: [highlight('h1')],
    createdAt: 'x',
    updatedAt: 'x',
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('annotationRepository', () => {
  it('should round-trip: save then load returns an equal store', () => {
    const result = saveAnnotations(store());
    expect(result.ok).toBe(true);
    const loaded = loadAnnotations(DOC_HASH);
    expect(loaded).toEqual(store());
  });

  it('should use the docnote.v1 key prefix', () => {
    saveAnnotations(store());
    expect(localStorage.getItem(STORAGE_KEY_PREFIX + DOC_HASH)).not.toBeNull();
  });

  it('should return null when nothing is stored for the hash', () => {
    expect(loadAnnotations(DOC_HASH)).toBeNull();
  });

  it('should discard corrupt JSON safely (return null, no throw)', () => {
    localStorage.setItem(STORAGE_KEY_PREFIX + DOC_HASH, '{not valid json');
    expect(loadAnnotations(DOC_HASH)).toBeNull();
  });

  it('should discard an unknown schema version', () => {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + DOC_HASH,
      JSON.stringify({ ...store(), schemaVersion: 999 }),
    );
    expect(loadAnnotations(DOC_HASH)).toBeNull();
  });

  it('should discard a structurally invalid store (highlights not an array)', () => {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + DOC_HASH,
      JSON.stringify({ ...store(), highlights: 'nope' }),
    );
    expect(loadAnnotations(DOC_HASH)).toBeNull();
  });

  it('should report a quota failure without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('quota', 'QuotaExceededError');
      throw err;
    });
    const result = saveAnnotations(store());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('quota');
    }
  });

  it('should report unavailable storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage disabled');
    });
    const result = saveAnnotations(store());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unavailable');
    }
  });
});
