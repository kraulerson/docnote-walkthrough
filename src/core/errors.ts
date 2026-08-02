export type DocNoteErrorCode =
  | 'file-too-large'
  | 'invalid-docx'
  | 'empty-document'
  | 'document-too-long'
  | 'storage-unavailable'
  | 'storage-full';

/** User-facing messages, exactly as specified in the Product Manifesto. */
export const ERROR_MESSAGES: Record<DocNoteErrorCode, string> = {
  'file-too-large': 'File exceeds the 10 MB limit.',
  'invalid-docx': 'This file could not be opened as a .docx.',
  'empty-document': 'This document contains no readable text.',
  'document-too-long': 'This document is too large to display.',
  'storage-unavailable': 'Annotations will not be saved in this browser session.',
  'storage-full': 'This change could not be saved (storage full).',
};

export class DocNoteError extends Error {
  readonly code: DocNoteErrorCode;

  constructor(code: DocNoteErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'DocNoteError';
    this.code = code;
  }
}
