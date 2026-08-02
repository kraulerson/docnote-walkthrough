/**
 * UAT Session 2 remediation regression tests (BUG-20..23, 25, 26).
 * Written before the fixes (Build Loop discipline for bug fixes).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { rangeFromAnchor } from '../core/anchors';
import { App } from './App';
import { NoteEditor } from './NoteEditor';

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

describe('BUG-20 — editor does not carry a draft between highlights', () => {
  it('should show a fresh empty editor when switching Add-note to a different highlight', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();

    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    await currentMark(region, 'hl-yellow');

    highlightPhrase(region, 'Closing paragraph', 'Closing');
    await user.click(await screen.findByRole('button', { name: /blue/i }));
    await currentMark(region, 'hl-blue');

    // Add a note to A. (Re-query the yellow mark: applying B repainted the doc.)
    const markAFresh = await currentMark(region, 'hl-yellow');
    await user.click(markAFresh);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'alpha note');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Now Add-note to B — editor must be EMPTY, not "alpha note".
    const markB = await currentMark(region, 'hl-blue');
    await user.click(markB);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    expect(screen.getByRole('textbox', { name: /note/i })).toHaveValue('');
  });
});

describe('BUG-21 — remove-highlight confirms when a note would be lost', () => {
  it('should ask for confirmation and keep the highlight+note on Cancel', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();
    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    let mark = await currentMark(region, 'hl-yellow');

    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'precious note');
    await user.click(screen.getByRole('button', { name: /save/i }));

    mark = await currentMark(region, 'hl-yellow');
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /remove highlight/i }));
    // A confirmation must appear mentioning the note; Cancel keeps everything.
    expect(await screen.findByText(/will also delete its note|delete its note/i)).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: /^cancel$/i }));
    expect(region.querySelector('mark.hl-yellow')).not.toBeNull();
    const panel = screen.getByRole('complementary', { name: /notes/i });
    expect(within(panel).getByText(/precious note/i)).toBeInTheDocument();
  });

  it('should remove without confirmation when the highlight has no note', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();
    highlightPhrase(region, 'Closing paragraph', 'Closing');
    await user.click(await screen.findByRole('button', { name: /green/i }));
    const mark = await currentMark(region, 'hl-green');
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /remove highlight/i }));
    await waitFor(() => expect(region.querySelector('mark')).toBeNull());
  });
});

describe('BUG-22 — deleting a note closes its open editor (no resurrection)', () => {
  it('should not resurrect a deleted note when the editor was open', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();
    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    let mark = await currentMark(region, 'hl-yellow');
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'to be deleted');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Open the editor, then delete the note from the menu.
    mark = await currentMark(region, 'hl-yellow');
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /edit note/i }));
    mark = await currentMark(region, 'hl-yellow');
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /delete note/i }));

    // The editor must be gone; nothing to Save.
    expect(screen.queryByRole('textbox', { name: /note/i })).not.toBeInTheDocument();
    const panel = screen.getByRole('complementary', { name: /notes/i });
    await waitFor(() => expect(within(panel).getByText(/no notes yet/i)).toBeInTheDocument());
  });
});

describe('BUG-23 — editor validates the value it will actually save (trimmed)', () => {
  it('should allow a 1000-char note with a trailing newline (saved value is 1000)', () => {
    render(<NoteEditor initialText={'a'.repeat(1000) + '\n'} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });

  it('should block only when the trimmed value exceeds 1000', () => {
    render(<NoteEditor initialText={'a'.repeat(1001)} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('should not show the empty-error on a pristine (untouched, empty) editor (BUG-26)', () => {
    render(<NoteEditor initialText="" onSave={() => {}} onCancel={() => {}} />);
    expect(screen.queryByText(/note cannot be empty/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});

describe('BUG-25 — opening the selection toolbar closes an open highlight menu', () => {
  it('should not show the highlight menu and the color toolbar at the same time', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();
    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    const mark = await currentMark(region, 'hl-yellow');
    await user.click(mark);
    expect(screen.getByRole('menuitem', { name: /remove highlight/i })).toBeInTheDocument();

    // Now make a new selection → toolbar opens; the menu must close.
    highlightPhrase(region, 'Closing paragraph', 'Closing');
    expect(await screen.findByRole('button', { name: /yellow/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /remove highlight/i })).not.toBeInTheDocument();
  });
});
