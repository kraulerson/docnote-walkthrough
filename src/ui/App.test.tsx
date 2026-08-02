/**
 * Feature 1 (docx-open-render) — UI flow tests, states per Bible §9.
 * Written before implementation (Build Loop 2.2).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function fixtureFile(name: string): Promise<File> {
  const buf = await readFile(join(__dirname, '..', 'core', '__fixtures__', name));
  return new File([new Uint8Array(buf)], name, { type: DOCX_MIME });
}

function pickerInput(): HTMLInputElement {
  return screen.getByLabelText(/open a \.docx/i);
}

describe('App — Feature 1: open & render read-only (states: Empty/Loading/Error/Success)', () => {
  it('should show the landing state with the privacy promise and picker (Empty)', () => {
    render(<App />);
    expect(screen.getByText(/read-only — your file is never modified or uploaded/i)).toBeInTheDocument();
    expect(pickerInput()).toBeInTheDocument();
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it('should show a specific error for a file that is not a real .docx (Error)', async () => {
    const user = userEvent.setup();
    render(<App />);
    const bad = new File([new Uint8Array([1, 2, 3, 4])], 'fake.docx', { type: DOCX_MIME });
    await user.upload(pickerInput(), bad);
    expect(
      await screen.findByText(/this file could not be opened as a \.docx/i),
    ).toBeInTheDocument();
  });

  it('should reject an oversized file by size alone, before parsing (Error)', async () => {
    const user = userEvent.setup();
    render(<App />);
    const big = new File([new Uint8Array([1])], 'big.docx', { type: DOCX_MIME });
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 });
    await user.upload(pickerInput(), big);
    expect(await screen.findByText(/file exceeds the 10 mb limit/i)).toBeInTheDocument();
  });

  it('should render the document text read-only on success (Success)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.upload(pickerInput(), await fixtureFile('valid.docx'));
    expect(await screen.findByText(/revenue grew 14 percent/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /quarterly review/i })).toBeInTheDocument();

    const documentRegion = screen.getByRole('region', { name: /document/i });
    expect(documentRegion.querySelector('[contenteditable]')).toBeNull();
  });

  it('should show the empty-document message for a .docx with no readable text (Error)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.upload(pickerInput(), await fixtureFile('empty.docx'));
    expect(
      await screen.findByText(/this document contains no readable text/i),
    ).toBeInTheDocument();
  });

  it('should let the user recover from an error by opening another file', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.upload(pickerInput(), await fixtureFile('empty.docx'));
    await screen.findByText(/this document contains no readable text/i);
    await user.upload(pickerInput(), await fixtureFile('valid.docx'));
    expect(await screen.findByText(/revenue grew 14 percent/i)).toBeInTheDocument();
    expect(screen.queryByText(/this document contains no readable text/i)).not.toBeInTheDocument();
  });
});
