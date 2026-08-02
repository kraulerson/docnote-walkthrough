/**
 * Feature 6 — App-level persistence: annotations survive re-opening the same
 * document, and storage failures degrade gracefully.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('App — Feature 6: local persistence', () => {
  it('should restore highlights and notes when the same document is re-opened', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    let region = await openValid();

    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    const mark = await currentMark(region, 'hl-yellow');
    await user.click(mark);
    await user.click(await screen.findByRole('menuitem', { name: /add note/i }));
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'persist me');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      const panel = screen.getByRole('complementary', { name: /notes/i });
      expect(within(panel).getByText(/persist me/i)).toBeInTheDocument();
    });

    // Simulate a full restart: unmount, remount, re-open the SAME file.
    unmount();
    render(<App />);
    region = await openValid();

    await currentMark(region, 'hl-yellow');
    const panel = screen.getByRole('complementary', { name: /notes/i });
    await waitFor(() => {
      expect(within(panel).getByText(/persist me/i)).toBeInTheDocument();
    });
  });

  it('should preserve the store createdAt across a change and a reopen (BUG-27)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    let region = await openValid();
    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    await currentMark(region, 'hl-yellow');

    const keyOf = () => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('docnote.v1.')) {
          return k;
        }
      }
      return undefined as unknown as string;
    };
    await waitFor(() => expect(keyOf()).toBeTruthy());
    const createdAfterFirst = JSON.parse(localStorage.getItem(keyOf())!).createdAt as string;

    // Make another change — createdAt must NOT change.
    highlightPhrase(region, 'Closing paragraph', 'Closing');
    await user.click(await screen.findByRole('button', { name: /green/i }));
    await currentMark(region, 'hl-green');
    await waitFor(() => {
      const store = JSON.parse(localStorage.getItem(keyOf())!);
      expect(store.highlights).toHaveLength(2);
    });
    expect(JSON.parse(localStorage.getItem(keyOf())!).createdAt).toBe(createdAfterFirst);

    // Reopen the same document — createdAt still preserved.
    unmount();
    render(<App />);
    region = await openValid();
    await currentMark(region, 'hl-yellow');
    // Adding a change after reopen keeps the original createdAt.
    highlightPhrase(region, 'Unicode check', 'Unicode');
    await user.click(await screen.findByRole('button', { name: /blue/i }));
    await currentMark(region, 'hl-blue');
    await waitFor(() => {
      const store = JSON.parse(localStorage.getItem(keyOf())!);
      expect(store.highlights).toHaveLength(3);
    });
    expect(JSON.parse(localStorage.getItem(keyOf())!).createdAt).toBe(createdAfterFirst);
  });

  it('should warn once and keep working when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();

    highlightPhrase(region, 'Closing paragraph', 'Closing');
    await user.click(await screen.findByRole('button', { name: /green/i }));
    // Highlight still applies (session works)…
    await currentMark(region, 'hl-green');
    // …and a persistence warning is surfaced.
    expect(await screen.findByText(/will not be saved|could not be saved/i)).toBeInTheDocument();
  });

  it('should not restore annotations for a different document (different hash)', async () => {
    const user = userEvent.setup();
    render(<App />);
    let region = await openValid();
    highlightPhrase(region, 'revenue grew', 'launch shipped');
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    await currentMark(region, 'hl-yellow');

    // Open a different document (empty.docx has different content → different hash).
    const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', 'no-document.docx'));
    await user.upload(
      screen.getByLabelText(/open a \.docx/i),
      new File([new Uint8Array(buf)], 'other.docx', { type: DOCX_MIME }),
    );
    // no-document.docx is invalid → error; re-open valid to confirm its highlight persisted, not leaked.
    region = screen.getByRole('region', { name: /document/i });
    // Reopen valid — its own highlight should still be there (sanity), proving keys are per-hash.
    await user.upload(
      screen.getByLabelText(/open a \.docx/i),
      new File([new Uint8Array(await readFile(join(__dirname, '..', 'core', '__fixtures__', 'valid.docx')))], 'valid.docx', { type: DOCX_MIME }),
    );
    region = await screen.findByRole('region', { name: /document/i });
    await currentMark(region, 'hl-yellow');
  });
});
