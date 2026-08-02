/**
 * Feature 6 — document identity (Bible §7): SHA-256 hex of the extracted
 * document text, computed client-side via Web Crypto. Same text → same
 * identity, so re-opening a document restores its annotations.
 */
export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
