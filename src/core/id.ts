/**
 * BUG-12: id generation that degrades on non-secure origins. `crypto.randomUUID`
 * is secure-context-only; on a plain-HTTP host it is undefined and referencing
 * it at module scope white-screens the app. This helper falls back to a
 * non-crypto id (ids here are local, non-security identifiers).
 */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Fallback: timestamp + random. Not cryptographically strong — not needed;
  // these ids only distinguish highlights/log sessions within one browser.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
