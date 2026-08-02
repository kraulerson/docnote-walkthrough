/**
 * Feature 6 — document identity hash (Bible §7). Written before implementation.
 */
import { describe, expect, it } from 'vitest';
import { hashText } from './hash';

describe('hashText (document identity)', () => {
  it('should be deterministic — same text yields the same hash', async () => {
    const a = await hashText('The quarterly review shipped early.');
    const b = await hashText('The quarterly review shipped early.');
    expect(a).toBe(b);
  });

  it('should differ for different text', async () => {
    const a = await hashText('version one');
    const b = await hashText('version two');
    expect(a).not.toBe(b);
  });

  it('should return a lowercase hex SHA-256 (64 chars)', async () => {
    const h = await hashText('anything');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should handle unicode text', async () => {
    const h = await hashText('café — π ≈ 3.14159 🎉 שלום');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
