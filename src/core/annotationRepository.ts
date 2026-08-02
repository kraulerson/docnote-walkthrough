/**
 * Feature 6 — the ONLY module permitted to touch localStorage (Bible §10
 * rule 5). Reads validate the schema and fail SAFE (return null → discard) on
 * anything unexpected; writes never throw — they report a typed failure so the
 * UI can warn and keep working (Bible §5, Manifesto failure states).
 */
import { log } from './log';
import type { AnnotationStore, Highlight, HighlightColor, Note, TextAnchor } from './types';
import { HIGHLIGHT_COLORS, MAX_NOTE_CHARS, STORAGE_KEY_PREFIX } from './types';

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

function keyFor(docHash: string): string {
  return STORAGE_KEY_PREFIX + docHash;
}

export function saveAnnotations(store: AnnotationStore): SaveResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(store);
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  try {
    localStorage.setItem(keyFor(store.docHash), serialized);
    return { ok: true };
  } catch (error) {
    const reason = isQuotaError(error) ? 'quota' : 'unavailable';
    log('warn', 'storage.save_failed', { reason });
    return { ok: false, reason };
  }
}

export function loadAnnotations(docHash: string): AnnotationStore | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(keyFor(docHash));
  } catch {
    return null; // storage unavailable → behave as if nothing stored
  }
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log('warn', 'storage.corrupt', { reason: 'invalid_json' });
    return null;
  }
  // BUG-28/29 (Bible §4 vuln #3 / TM-003): validate INTO fresh typed structures
  // instead of trusting the parsed graph. Unknown fields are dropped; a highlight
  // with an invalid anchor is dropped; a note that violates the 1-1000 rule is
  // dropped (its highlight is kept). A store that isn't shaped like a v1 store at
  // all is discarded entirely.
  const rebuilt = reconstructStore(parsed, docHash);
  if (rebuilt === null) {
    log('warn', 'storage.corrupt', { reason: 'schema' });
  }
  return rebuilt;
}

function reconstructStore(value: unknown, expectedHash: string): AnnotationStore | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || v.docHash !== expectedHash || !Array.isArray(v.highlights)) {
    return null;
  }
  const highlights: Highlight[] = [];
  for (const raw of v.highlights) {
    const rebuilt = reconstructHighlight(raw);
    if (rebuilt !== null) {
      highlights.push(rebuilt);
    }
  }
  return {
    schemaVersion: 1,
    docHash: expectedHash,
    highlights,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date(0).toISOString(),
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : new Date(0).toISOString(),
  };
}

function reconstructHighlight(value: unknown): Highlight | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const h = value as Record<string, unknown>;
  if (typeof h.id !== 'string' || !HIGHLIGHT_COLORS.includes(h.color as HighlightColor)) {
    return null;
  }
  const anchor = reconstructAnchor(h.anchor);
  if (anchor === null) {
    return null;
  }
  const highlight: Highlight = {
    id: h.id,
    color: h.color as HighlightColor,
    anchor,
    createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date(0).toISOString(),
    updatedAt: typeof h.updatedAt === 'string' ? h.updatedAt : new Date(0).toISOString(),
  };
  const note = reconstructNote(h.note);
  if (note !== null) {
    highlight.note = note;
  }
  return highlight;
}

function reconstructAnchor(value: unknown): TextAnchor | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const a = value as Record<string, unknown>;
  const { paragraphIndex, startOffset, endOffset, exactText } = a;
  if (
    !Number.isInteger(paragraphIndex) ||
    !Number.isInteger(startOffset) ||
    !Number.isInteger(endOffset) ||
    typeof exactText !== 'string' ||
    (paragraphIndex as number) < 0 ||
    (startOffset as number) < 0 ||
    (endOffset as number) <= (startOffset as number)
  ) {
    return null;
  }
  return {
    paragraphIndex: paragraphIndex as number,
    startOffset: startOffset as number,
    endOffset: endOffset as number,
    exactText,
  };
}

/** Returns null when there is no note or the note violates the data model. */
function reconstructNote(value: unknown): Note | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'object') {
    return null;
  }
  const n = value as Record<string, unknown>;
  if (typeof n.text !== 'string') {
    return null;
  }
  const trimmedLength = n.text.trim().length;
  if (trimmedLength === 0 || n.text.length > MAX_NOTE_CHARS) {
    return null; // drop an out-of-spec note; the highlight is kept
  }
  return {
    text: n.text,
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(0).toISOString(),
    updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date(0).toISOString(),
  };
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

