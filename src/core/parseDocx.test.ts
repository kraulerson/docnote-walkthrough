/**
 * Feature 1 (docx-open-render) — core parse pipeline tests.
 * QA persona: test the boundaries, not the center. Written BEFORE the
 * implementation (Build Loop step 2.2).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocNoteError } from './errors';
import { parseDocx } from './parseDocx';
import { MAX_DOCUMENT_BYTES } from './types';

async function fixture(name: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(__dirname, '__fixtures__', name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    expect.unreachable(`expected DocNoteError '${code}' but the promise resolved`);
  } catch (error) {
    expect(error).toBeInstanceOf(DocNoteError);
    expect((error as DocNoteError).code).toBe(code);
  }
}

describe('parseDocx (Feature 1: open & render .docx read-only)', () => {
  it('should reject a buffer over the 10 MB limit without attempting a parse', async () => {
    const oversized = new ArrayBuffer(MAX_DOCUMENT_BYTES + 1);
    await expectCode(parseDocx(oversized), 'file-too-large');
  });

  it('should accept a buffer of exactly the limit boundary only on size grounds', async () => {
    // Exactly MAX bytes of garbage: must fail as invalid-docx, NOT file-too-large.
    const atLimit = new Uint8Array(MAX_DOCUMENT_BYTES);
    atLimit.fill(65);
    await expectCode(parseDocx(atLimit.buffer), 'invalid-docx');
  }, 30000);

  it('should reject garbage bytes with invalid-docx', async () => {
    const garbage = new Uint8Array([0x00, 0x01, 0xff, 0x13, 0x37, 0x99, 0x42]);
    await expectCode(parseDocx(garbage.buffer), 'invalid-docx');
  });

  it('should reject a zero-byte buffer with invalid-docx', async () => {
    await expectCode(parseDocx(new ArrayBuffer(0)), 'invalid-docx');
  });

  it('should reject a valid ZIP that is missing word/document.xml with invalid-docx', async () => {
    await expectCode(parseDocx(await fixture('no-document.docx')), 'invalid-docx');
  });

  it('should parse the valid fixture and expose its text in document order', async () => {
    const parsed = await parseDocx(await fixture('valid.docx'));
    expect(parsed.fullText).toContain('Quarterly Review');
    expect(parsed.fullText).toContain('revenue grew 14 percent');
    expect(parsed.fullText.indexOf('Quarterly Review')).toBeLessThan(
      parsed.fullText.indexOf('Closing paragraph'),
    );
  });

  it('should preserve unicode text exactly (emoji, RTL, punctuation)', async () => {
    const parsed = await parseDocx(await fixture('valid.docx'));
    expect(parsed.fullText).toContain('café — π ≈ 3.14159 🎉 שלום');
  });

  it('should map the Heading1 style to a real heading element', async () => {
    const parsed = await parseDocx(await fixture('valid.docx'));
    const heading = parsed.fragment.querySelector('h1');
    expect(heading?.textContent).toBe('Quarterly Review');
  });

  it('should count non-empty block paragraphs', async () => {
    const parsed = await parseDocx(await fixture('valid.docx'));
    expect(parsed.paragraphCount).toBe(5);
  });

  it('should keep literal markup typed in the document as text, never as elements', async () => {
    const parsed = await parseDocx(await fixture('valid.docx'));
    expect(parsed.fragment.querySelector('img')).toBeNull();
    expect(parsed.fullText).toContain('<img src=x onerror=alert(1)> should stay text');
  });

  it('should reject a structurally valid document with no readable text as empty-document', async () => {
    await expectCode(parseDocx(await fixture('empty.docx')), 'empty-document');
  });

  it('should enforce the extracted-character cap (document-too-long)', async () => {
    await expectCode(parseDocx(await fixture('valid.docx'), { maxChars: 10 }), 'document-too-long');
  });

  it('should reject a decompression bomb BEFORE inflating it (BUG-1, SEV-1)', async () => {
    // bomb.docx is ~115 KB compressed but its document.xml is ~33.6 MB. With a
    // low uncompressed cap the guard must reject on the advertised size, fast,
    // WITHOUT materializing the 33.6 MB (which takes many seconds).
    const started = performance.now();
    await expectCode(
      parseDocx(await fixture('bomb.docx'), { maxUncompressedBytes: 5_000_000 }),
      'file-too-large',
    );
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
