/**
 * Data model (Bible §5) — authoritative TypeScript definitions.
 *
 * This file is type declarations only. The behavior that satisfies MVP
 * Cutline items (anchoring, persistence) is Build Loop work, implemented
 * feature-by-feature with tests first.
 */

export type HighlightColor = 'yellow' | 'green' | 'blue';

export const HIGHLIGHT_COLORS: readonly HighlightColor[] = ['yellow', 'green', 'blue'];

/** Anchor offsets are UTF-16 code-unit offsets into the paragraph's textContent. */
export interface TextAnchor {
  paragraphIndex: number;
  startOffset: number;
  /** Exclusive; must be > startOffset. */
  endOffset: number;
  /** Highlighted text at creation time; ≤5,000 chars (Bible §5). */
  exactText: string;
}

export interface Note {
  /** 1-1000 chars, plain text; NEVER rendered as HTML (Bible §10 rule 2). */
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  color: HighlightColor;
  anchor: TextAnchor;
  note?: Note;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationStore {
  schemaVersion: 1;
  /** SHA-256 hex of extracted document text (Bible §7). */
  docHash: string;
  /** Invariant: non-overlapping anchors, sorted by (paragraphIndex, startOffset). */
  highlights: Highlight[];
  createdAt: string;
  updatedAt: string;
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** BUG-1: cap on total advertised uncompressed ZIP size (decompression-bomb guard). */
export const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 5_000_000;
export const MAX_NOTE_CHARS = 1000;
export const MAX_SELECTION_CHARS = 5000;
export const STORAGE_KEY_PREFIX = 'docnote.v1.annotations.';
