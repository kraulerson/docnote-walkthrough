/**
 * Feature 3 — App-level remove-highlight flow.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { rangeFromAnchor } from '../core/anchors';
import { App } from './App';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function openValidFixture(): Promise<void> {
  const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', 'valid.docx'));
  const file = new File([new Uint8Array(buf)], 'valid.docx', { type: DOCX_MIME });
  await userEvent.setup().upload(screen.getByLabelText(/open a \.docx/i), file);
  await screen.findByText(/revenue grew 14 percent/i);
}

function selectAndHighlight(matchText: string, selectFrom: string, length: number): void {
  const region = screen.getByRole('region', { name: /document/i });
  const target = Array.from(region.querySelectorAll('p')).find((p) =>
    (p.textContent ?? '').includes(matchText),
  )!;
  const start = (target.textContent ?? '').indexOf(selectFrom);
  const range = rangeFromAnchor(target, start, start + length)!;
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent.mouseUp(region);
}

describe('App — Feature 3: remove highlight', () => {
  it('should remove a highlight and restore the text to normal, keeping textContent', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openValidFixture();
    const region = screen.getByRole('region', { name: /document/i });
    const before = region.textContent;

    selectAndHighlight('revenue grew', 'launch shipped', 14);
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    const mark = await waitFor(() => {
      const m = region.querySelector('mark.hl-yellow');
      expect(m).not.toBeNull();
      return m as HTMLElement;
    });

    // Click the highlight → menu → Remove.
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /remove highlight/i }));

    await waitFor(() => {
      expect(region.querySelector('mark')).toBeNull();
    });
    expect(region.textContent).toBe(before);
  });

  it('should be idempotent — removing then interacting again does not crash or re-add', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openValidFixture();
    const region = screen.getByRole('region', { name: /document/i });

    selectAndHighlight('Closing paragraph', 'Closing', 7);
    await user.click(await screen.findByRole('button', { name: /blue/i }));
    const mark = await waitFor(() => {
      const m = region.querySelector('mark.hl-blue');
      expect(m).not.toBeNull();
      return m as HTMLElement;
    });
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /remove highlight/i }));
    await waitFor(() => expect(region.querySelector('mark')).toBeNull());

    // No menu should be open now; clicking empty document text is a no-op.
    await user.click(region);
    expect(region.querySelector('mark')).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /remove highlight/i })).not.toBeInTheDocument();
  });
});
