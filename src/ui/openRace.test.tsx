/**
 * BUG-4 (SEV-2) regression: opening file B while file A is still parsing must
 * never render A's result over B's. parseDocx is mocked so we control which
 * parse resolves last (the stale one) and assert it does NOT win.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedDocument } from '../core/parseDocx';
import * as parseModule from '../core/parseDocx';
import { App } from './App';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function fakeDoc(text: string): ParsedDocument {
  const fragment = document.createDocumentFragment();
  const p = document.createElement('p');
  p.textContent = text;
  fragment.append(p);
  return { fragment, fullText: text, paragraphCount: 1, warningCount: 0 };
}

afterEach(() => vi.restoreAllMocks());

describe('App — BUG-4 concurrent-open race', () => {
  it('should render the last-picked file even if the first parse resolves later', async () => {
    let resolveA!: (d: ParsedDocument) => void;
    let resolveB!: (d: ParsedDocument) => void;
    const spy = vi
      .spyOn(parseModule, 'parseDocx')
      .mockImplementationOnce(() => new Promise((r) => (resolveA = r)))
      .mockImplementationOnce(() => new Promise((r) => (resolveB = r)));

    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByLabelText(/open a \.docx/i);

    await user.upload(input, new File([new Uint8Array([1])], 'A.docx', { type: DOCX_MIME }));
    await user.upload(input, new File([new Uint8Array([2])], 'B.docx', { type: DOCX_MIME }));

    // B (the file the user picked last) resolves first, then the stale A resolves.
    resolveB(fakeDoc('DOCUMENT B CONTENT'));
    resolveA(fakeDoc('DOCUMENT A CONTENT'));

    await waitFor(() => {
      expect(screen.getByText('DOCUMENT B CONTENT')).toBeInTheDocument();
    });
    expect(screen.queryByText('DOCUMENT A CONTENT')).not.toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
