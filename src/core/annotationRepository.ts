/**
 * Feature 6 — the ONLY module permitted to touch localStorage (Bible §10
 * rule 5). Reads validate the schema and fail SAFE (return null → discard) on
 * anything unexpected; writes never throw — they report a typed failure so the
 * UI can warn and keep working (Bible §5, Manifesto failure states).
 */
import { log } from './log';
import type { AnnotationStore, Highlight, HighlightColor, TextAnchor } from './types';
import { HIGHLIGHT_COLORS, STORAGE_KEY_PREFIX } from './types';

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
  if (!isValidStore(parsed, docHash)) {
    log('warn', 'storage.corrupt', { reason: 'schema' });
    return null;
  }
  return parsed;
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/** Strict shape + version validation. Anything off → invalid → safe discard. */
function isValidStore(value: unknown, expectedHash: string): value is AnnotationStore {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1) {
    return false;
  }
  if (v.docHash !== expectedHash) {
    return false;
  }
  if (!Array.isArray(v.highlights)) {
    return false;
  }
  return v.highlights.every(isValidHighlight);
}

function isValidHighlight(value: unknown): value is Highlight {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const h = value as Record<string, unknown>;
  if (typeof h.id !== 'string') {
    return false;
  }
  if (!HIGHLIGHT_COLORS.includes(h.color as HighlightColor)) {
    return false;
  }
  if (!isValidAnchor(h.anchor)) {
    return false;
  }
  if (h.note !== undefined && typeof (h.note as Record<string, unknown>)?.text !== 'string') {
    return false;
  }
  return true;
}

function isValidAnchor(value: unknown): value is TextAnchor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const a = value as Record<string, unknown>;
  return (
    typeof a.paragraphIndex === 'number' &&
    typeof a.startOffset === 'number' &&
    typeof a.endOffset === 'number' &&
    typeof a.exactText === 'string'
  );
}
