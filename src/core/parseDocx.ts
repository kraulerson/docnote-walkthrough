/**
 * Feature 1 core: .docx → sanitized, render-ready document model.
 * Pipeline (Bible §4 T1-T2): validate size → mammoth convert → sanitize →
 * extract text/paragraphs → enforce content caps.
 */
import mammoth from 'mammoth';
import { DocNoteError } from './errors';
import { log } from './log';
import { sanitizeToFragment } from './sanitize';
import { MAX_DOCUMENT_BYTES, MAX_EXTRACTED_CHARS } from './types';

export interface ParsedDocument {
  /** Sanitized, inert DOM of the document body. Insert-ready. */
  fragment: DocumentFragment;
  /** Plain text of all block elements, in document order, joined by newlines. */
  fullText: string;
  /** Count of non-empty block elements. */
  paragraphCount: number;
  /** Converter warnings (metadata only — content is never logged). */
  warningCount: number;
}

export interface ParseOptions {
  maxBytes?: number;
  maxChars?: number;
}

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote';

export async function parseDocx(
  buffer: ArrayBuffer,
  options: ParseOptions = {},
): Promise<ParsedDocument> {
  const maxBytes = options.maxBytes ?? MAX_DOCUMENT_BYTES;
  const maxChars = options.maxChars ?? MAX_EXTRACTED_CHARS;

  if (buffer.byteLength > maxBytes) {
    log('warn', 'parse.rejected', { reason: 'file-too-large', bytes: buffer.byteLength });
    throw new DocNoteError('file-too-large');
  }

  const startedAt = performance.now();
  let html: string;
  let warningCount: number;
  try {
    // mammoth's browser build documents {arrayBuffer} input; its Node build
    // documents {buffer}. Feed each runtime the shape it supports so the same
    // core works in the shipped app and in the Node-resolved test runner.
    const nodeBuffer = (globalThis as { Buffer?: { from(data: ArrayBuffer): unknown } }).Buffer;
    const input = nodeBuffer
      ? ({ buffer: nodeBuffer.from(buffer) } as unknown as { arrayBuffer: ArrayBuffer })
      : { arrayBuffer: buffer };
    const result = await mammoth.convertToHtml(input);
    html = result.value;
    warningCount = result.messages.length;
  } catch (error) {
    log('warn', 'parse.failed', {
      reason: 'invalid-docx',
      errorName: error instanceof Error ? error.name : 'unknown',
    });
    throw new DocNoteError('invalid-docx');
  }

  const fragment = sanitizeToFragment(html);

  const blocks = Array.from(fragment.querySelectorAll(BLOCK_SELECTOR));
  const blockTexts = blocks
    .map((el) => el.textContent ?? '')
    .filter((text) => text.trim().length > 0);
  const fullText = blockTexts.join('\n');

  if (fullText.trim().length === 0) {
    log('info', 'parse.empty', { bytes: buffer.byteLength });
    throw new DocNoteError('empty-document');
  }
  if (fullText.length > maxChars) {
    log('warn', 'parse.rejected', { reason: 'document-too-long', chars: fullText.length });
    throw new DocNoteError('document-too-long');
  }

  log('info', 'parse.success', {
    bytes: buffer.byteLength,
    paragraphs: blockTexts.length,
    chars: fullText.length,
    warnings: warningCount,
    ms: Math.round(performance.now() - startedAt),
  });

  return { fragment, fullText, paragraphCount: blockTexts.length, warningCount };
}
