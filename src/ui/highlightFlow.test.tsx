/**
 * Feature 2 — App-level highlight flow: select text in the rendered
 * document, pick a color, see the mark. Selection is simulated via the
 * real Selection API (jsdom implements getSelection/addRange) followed by
 * mouseup on the document region — the event App listens to.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { App } from './App';
import { rangeFromAnchor } from '../core/anchors';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function openValidFixture(): Promise<void> {
  const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', 'valid.docx'));
  const file = new File([new Uint8Array(buf)], 'valid.docx', { type: DOCX_MIME });
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText(/open a \.docx/i), file);
  await screen.findByText(/revenue grew 14 percent/i);
}

function selectInParagraph(matchText: string, selectFrom: string, length: number): void {
  const region = screen.getByRole('region', { name: /document/i });
  const paragraphs = Array.from(region.querySelectorAll('p'));
  const target = paragraphs.find((p) => (p.textContent ?? '').includes(matchText));
  if (!target) {
    throw new Error(`test setup: no paragraph containing "${matchText}"`);
  }
  // Block-offset based range construction survives text nodes split by
  // earlier highlight marks (uses the same core helper the app trusts).
  const text = target.textContent ?? '';
  const start = text.indexOf(selectFrom);
  if (start < 0) {
    throw new Error(`test setup: "${selectFrom}" not found in paragraph`);
  }
  const range = rangeFromAnchor(target, start, start + length);
  if (!range) {
    throw new Error('test setup: rangeFromAnchor returned null');
  }
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.mouseUp(region);
}

describe('App — Feature 2: apply highlight', () => {
  it('should show the color toolbar after selecting document text', async () => {
    render(<App />);
    await openValidFixture();
    selectInParagraph('revenue grew', 'launch shipped', 14);
    expect(await screen.findByRole('button', { name: /yellow/i })).toBeInTheDocument();
  });

  it('should wrap the selection in a mark of the chosen color', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openValidFixture();
    selectInParagraph('revenue grew', 'launch shipped', 14);
    await user.click(await screen.findByRole('button', { name: /green/i }));

    const region = screen.getByRole('region', { name: /document/i });
    await waitFor(() => {
      const marks = Array.from(region.querySelectorAll('mark.hl-green'));
      expect(marks.map((m) => m.textContent).join('')).toBe('launch shipped');
    });
  });

  it('should refuse an overlapping highlight with a specific hint', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openValidFixture();
    selectInParagraph('revenue grew', 'launch shipped', 14);
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    const region = screen.getByRole('region', { name: /document/i });
    await waitFor(() => {
      expect(region.querySelector('mark')).not.toBeNull();
    });

    selectInParagraph('revenue grew', 'shipped two', 11);
    expect(await screen.findByText(/highlights cannot overlap/i)).toBeInTheDocument();
  });

  it('should keep the document text byte-identical after highlighting', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openValidFixture();
    const region = screen.getByRole('region', { name: /document/i });
    const before = region.textContent;
    selectInParagraph('Closing paragraph', 'Closing', 7);
    await user.click(await screen.findByRole('button', { name: /blue/i }));
    await waitFor(() => {
      expect(region.querySelector('mark.hl-blue')).not.toBeNull();
    });
    expect(region.textContent).toBe(before);
  });
});
