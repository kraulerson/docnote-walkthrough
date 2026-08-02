/**
 * Phase 3 hardening — deferred SEV-3 fixes (BUG-9, 10, 11, 12, 14, 24).
 * Written before the fixes.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { anchorFromRange } from '../core/anchors';
import { newId } from '../core/id';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function openValid(): Promise<HTMLElement> {
  const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', 'valid.docx'));
  await userEvent
    .setup()
    .upload(screen.getByLabelText(/open a \.docx/i), new File([new Uint8Array(buf)], 'valid.docx', { type: DOCX_MIME }));
  await screen.findByText(/revenue grew 14 percent/i);
  return screen.getByRole('region', { name: /document/i });
}

function selectPhrase(region: HTMLElement, para: string, phrase: string): void {
  const target = Array.from(region.querySelectorAll('p')).find((p) =>
    (p.textContent ?? '').includes(para),
  )!;
  const start = (target.textContent ?? '').indexOf(phrase);
  const range = document.createRange();
  range.setStart(target.firstChild!, start);
  range.setEnd(target.firstChild!, start + phrase.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

describe('BUG-11 — ErrorBoundary shows a recovery message, not a blank page', () => {
  it('should render a fallback with a reload action when a child throws', () => {
    const Boom = () => {
      throw new Error('kaboom');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('BUG-12 — newId works without crypto.randomUUID', () => {
  it('should return a non-empty string even if randomUUID is unavailable', () => {
    const original = globalThis.crypto.randomUUID;
    // @ts-expect-error deliberately remove for the test
    globalThis.crypto.randomUUID = undefined;
    try {
      const id = newId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    } finally {
      globalThis.crypto.randomUUID = original;
    }
  });
});

describe('BUG-10 — anchors never split a surrogate pair (emoji)', () => {
  it('should snap boundaries outward so an emoji is not cut in half', () => {
    const container = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = 'AB🎉CD'; // 🎉 is a surrogate pair at code units 2,3
    container.append(p);
    document.body.append(container);
    // Select from mid-string ending BETWEEN the surrogate halves (offset 3).
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 3); // splits 🎉
    const anchor = anchorFromRange(container, range);
    // endOffset must snap to 4 to include the whole emoji.
    expect(anchor?.endOffset).toBe(4);
    expect(anchor?.exactText).toBe('AB🎉');
    container.remove();
  });
});

describe('BUG-9 — over-length selection shows a length-specific hint', () => {
  it('should say the selection is too long, not "select inside the document"', async () => {
    render(<App />);
    const region = await openValid();
    // Force an over-length selection by monkeypatching the range length via a
    // huge phrase is impractical; instead select all doc text and lower nothing —
    // the fixture is short, so simulate by selecting the whole longest paragraph
    // and asserting via a stubbed selection length is overkill. Use the real cap:
    // select the literal-markup paragraph and rely on MAX_SELECTION_CHARS being
    // larger than the fixture — so instead we assert the hint wiring directly by
    // selecting an unanchorable (out-of-doc) range is a different test. Here we
    // verify the too-long branch through a large synthetic paragraph.
    const big = document.createElement('p');
    big.textContent = 'x'.repeat(6000);
    // Append INTO the document container (the ref target), not the section.
    const container = region.querySelector('.document-content')!;
    container.appendChild(big);
    const range = document.createRange();
    range.setStart(big.firstChild!, 0);
    range.setEnd(big.firstChild!, 6000);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    fireEvent.mouseUp(region);
    expect(await screen.findByText(/too long to highlight/i)).toBeInTheDocument();
  });
});

describe('BUG-14 — keyboard selection surfaces the highlight toolbar', () => {
  it('should show the color toolbar after a keyboard selection + keyup', async () => {
    render(<App />);
    const region = await openValid();
    selectPhrase(region, 'revenue grew', 'launch shipped');
    fireEvent.keyUp(region, { key: 'ArrowRight', shiftKey: true });
    expect(await screen.findByRole('button', { name: /yellow/i })).toBeInTheDocument();
  });
});

describe('BUG-24 — Escape closes the highlight menu', () => {
  it('should close an open highlight menu on Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const region = await openValid();
    selectPhrase(region, 'revenue grew', 'launch shipped');
    fireEvent.mouseUp(region);
    await user.click(await screen.findByRole('button', { name: /yellow/i }));
    const mark = await waitFor(() => {
      const m = region.querySelector('mark.hl-yellow');
      expect(m).not.toBeNull();
      return m as HTMLElement;
    });
    fireEvent.mouseUp(mark);
    expect(await screen.findByRole('menuitem', { name: /remove highlight/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /remove highlight/i })).not.toBeInTheDocument();
    });
  });
});
