/**
 * Feature 5 — App-level click-to-jump: clicking a note scrolls to its
 * highlight and marks it with a non-color-only emphasis.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { rangeFromAnchor } from '../core/anchors';
import { App } from './App';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function openValid(): Promise<HTMLElement> {
  const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', 'valid.docx'));
  await userEvent
    .setup()
    .upload(screen.getByLabelText(/open a \.docx/i), new File([new Uint8Array(buf)], 'valid.docx', { type: DOCX_MIME }));
  await screen.findByText(/revenue grew 14 percent/i);
  return screen.getByRole('region', { name: /document/i });
}

function highlightPhrase(region: HTMLElement, para: string, phrase: string): void {
  const target = Array.from(region.querySelectorAll('p')).find((p) =>
    (p.textContent ?? '').includes(para),
  )!;
  const start = (target.textContent ?? '').indexOf(phrase);
  const range = rangeFromAnchor(target, start, start + phrase.length)!;
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent.mouseUp(region);
}

async function currentMark(region: HTMLElement, cls: string): Promise<HTMLElement> {
  return (await waitFor(() => {
    const m = region.querySelector(`mark.${cls}`);
    expect(m).not.toBeNull();
    return m as HTMLElement;
  })) as HTMLElement;
}

async function addNote(region: HTMLElement, cls: string, text: string): Promise<void> {
  const user = userEvent.setup();
  const mark = await currentMark(region, cls);
  await user.click(mark);
  await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
  await user.type(screen.getByRole('textbox', { name: /note/i }), text);
  await user.click(screen.getByRole('button', { name: /save/i }));
}

describe('App — Feature 5: notes panel click-to-jump', () => {
  it('should scroll to a highlight and emphasize it (not color-only) when its note is clicked', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    render(<App />);
    const region = await openValid();

    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    await addNote(region, 'hl-yellow', 'jump target note');

    const panel = screen.getByRole('complementary', { name: /notes/i });
    await user.click(within(panel).getByRole('button', { name: /jump target note/i }));

    expect(scrollSpy).toHaveBeenCalled();
    // Non-color-only emphasis: a class marking the jump target is applied.
    await waitFor(() => {
      expect(region.querySelector('mark.hl-jump-target')).not.toBeNull();
    });
    scrollSpy.mockRestore();
  });

  it('should list notes from two highlights in document order', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();

    // Highlight a later paragraph first, then an earlier one.
    highlightPhrase(region, 'Closing paragraph', 'Closing');
    await user.click(await screen.findByRole('button', { name: /blue/i }));
    await addNote(region, 'hl-blue', 'later note');

    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    await addNote(region, 'hl-yellow', 'earlier note');

    const panel = screen.getByRole('complementary', { name: /notes/i });
    const items = within(panel).getAllByRole('listitem');
    expect(within(items[0]!).getByText(/earlier note/i)).toBeInTheDocument();
    expect(within(items[1]!).getByText(/later note/i)).toBeInTheDocument();
  });
});
