/**
 * BUG-1 (SEV-1) regression: reject a decompression bomb BEFORE mammoth
 * inflates it, by summing the zip central directory's uncompressed sizes.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { actualUncompressedExceeds, uncompressedSizeExceeds } from './zipGuard';

async function fixtureBuffer(name: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(__dirname, '__fixtures__', name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

// Build a minimal ZIP (one stored entry) whose central-directory record
// advertises a huge uncompressed size. We only need the guard to READ the
// central directory — it never inflates — so the compressed payload can be tiny.
function buildZipWithUncompressedSize(uncompressed: number): ArrayBuffer {
  const name = new TextEncoder().encode('word/document.xml');
  const data = new Uint8Array([0x78]); // 1 byte "stored"
  const parts: number[] = [];

  const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
  const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];

  // Local file header
  const lfhStart = 0;
  parts.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0));
  parts.push(...u32(0)); // crc
  parts.push(...u32(data.length)); // compressed size
  parts.push(...u32(uncompressed)); // uncompressed size (advertised)
  parts.push(...u16(name.length), ...u16(0));
  parts.push(...name, ...data);

  // Central directory header
  const cdStart = parts.length;
  parts.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0));
  parts.push(...u32(0)); // crc
  parts.push(...u32(data.length)); // compressed size
  parts.push(...u32(uncompressed)); // uncompressed size (advertised)
  parts.push(...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0));
  parts.push(...u32(0)); // local header offset
  parts.push(...name);

  // End of central directory
  const cdSize = parts.length - cdStart;
  parts.push(...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(1), ...u16(1));
  parts.push(...u32(cdSize), ...u32(cdStart), ...u16(0));

  void lfhStart;
  return new Uint8Array(parts).buffer;
}

describe('uncompressedSizeExceeds (BUG-1 decompression-bomb guard)', () => {
  it('should report exceeded for a zip advertising a huge uncompressed size', () => {
    const bomb = buildZipWithUncompressedSize(120_000_000);
    expect(uncompressedSizeExceeds(bomb, 40_000_000)).toBe(true);
  });

  it('should report not-exceeded for a small advertised size', () => {
    const small = buildZipWithUncompressedSize(5000);
    expect(uncompressedSizeExceeds(small, 40_000_000)).toBe(false);
  });

  it('should fail safe (not exceeded) for a buffer with no EOCD record', () => {
    // Non-zip garbage: guard cannot read sizes; mammoth will reject it as invalid.
    expect(uncompressedSizeExceeds(new Uint8Array([1, 2, 3, 4]).buffer, 10)).toBe(false);
  });
});

describe('actualUncompressedExceeds (RT-01/BUG-32 — bounded real inflation)', () => {
  it('should catch a LYING bomb whose central directory under-reports its size', async () => {
    // lying-bomb.docx advertises 500 bytes but inflates to ~33.6 MB.
    const bomb = await fixtureBuffer('lying-bomb.docx');
    // The advertised-size guard is fooled...
    expect(uncompressedSizeExceeds(bomb, 5_000_000)).toBe(false);
    // ...but the actual-inflation guard is not.
    expect(await actualUncompressedExceeds(bomb, 5_000_000)).toBe(true);
  });

  it('should pass a legitimate small document', async () => {
    const valid = await fixtureBuffer('valid.docx');
    expect(await actualUncompressedExceeds(valid, 50_000_000)).toBe(false);
  });

  it('should fail safe (false) for non-zip bytes', async () => {
    expect(await actualUncompressedExceeds(new Uint8Array([1, 2, 3, 4]).buffer, 10)).toBe(false);
  });
});
