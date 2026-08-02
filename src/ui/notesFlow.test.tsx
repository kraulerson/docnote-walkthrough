/**
 * Feature 4 — App-level note flow: attach, edit, delete a note on a highlight.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { rangeFromAnchor } from '../core/anchors';
import { App } from './App';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function openAndHighlight(): Promise<HTMLElement> {
  const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', 'valid.docx'));
  const file = new File([new Uint8Array(buf)], 'valid.docx', { type: DOCX_MIME });
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText(/open a \.docx/i), file);
  await screen.findByText(/revenue grew 14 percent/i);
  const region = screen.getByRole('region', { name: /document/i });
  const target = Array.from(region.querySelectorAll('p')).find((p) =>
    (p.textContent ?? '').includes('revenue grew'),
  )!;
  const start = (target.textContent ?? '').indexOf('launch shipped');
  const range = rangeFromAnchor(target, start, start + 14)!;
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent.mouseUp(region);
  await user.click(await screen.findByRole('button', { name: /yellow/i }));
  return (await waitFor(() => {
    const m = region.querySelector('mark.hl-yellow');
    expect(m).not.toBeNull();
    return m as HTMLElement;
  })) as HTMLElement;
}

describe('App — Feature 4: notes attach/edit/delete', () => {
  it('should attach a note to a highlight and show it in the notes panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    const mark = await openAndHighlight();
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'check this citation');
    await user.click(screen.getByRole('button', { name: /save/i }));

    const panel = screen.getByRole('complementary', { name: /notes/i });
    expect(await within(panel).findByText(/check this citation/i)).toBeInTheDocument();
    expect(within(panel).queryByText(/no notes yet/i)).not.toBeInTheDocument();
  });

  it('should edit an existing note, replacing its text', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = screen.getByRole('region', { name: /document/i });
    const mark = await openAndHighlight();
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'first');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // The document repaints on annotation change, so re-query the (new) mark.
    const markAgain = await waitFor(() => {
      const m = region.querySelector('mark.hl-yellow');
      expect(m).not.toBeNull();
      return m as HTMLElement;
    });
    await user.click(markAgain);
    await user.click(await screen.findByRole('menuitem', { name: /edit note/i }));
    const box = screen.getByRole('textbox', { name: /note/i });
    await user.clear(box);
    await user.type(box, 'second version');
    await user.click(screen.getByRole('button', { name: /save/i }));

    const panel = screen.getByRole('complementary', { name: /notes/i });
    expect(await within(panel).findByText(/second version/i)).toBeInTheDocument();
    expect(within(panel).queryByText(/^first$/i)).not.toBeInTheDocument();
  });

  it('should delete a note but keep the highlight', async () => {
    const user = userEvent.setup();
    render(<App />);
    const mark = await openAndHighlight();
    const region = screen.getByRole('region', { name: /document/i });
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'to be deleted');
    await user.click(screen.getByRole('button', { name: /save/i }));

    const markAgain = await waitFor(() => {
      const m = region.querySelector('mark.hl-yellow');
      expect(m).not.toBeNull();
      return m as HTMLElement;
    });
    await user.click(markAgain);
    await user.click(await screen.findByRole('menuitem', { name: /delete note/i }));

    const panel = screen.getByRole('complementary', { name: /notes/i });
    await waitFor(() => {
      expect(within(panel).getByText(/no notes yet/i)).toBeInTheDocument();
    });
    // Highlight itself remains.
    expect(region.querySelector('mark.hl-yellow')).not.toBeNull();
  });
});
