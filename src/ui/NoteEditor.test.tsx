/**
 * Feature 4 — NoteEditor component (Bible §9). Written before implementation.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoteEditor } from './NoteEditor';

describe('NoteEditor', () => {
  it('should start empty with a 0/1000 counter and a disabled Save (Empty)', () => {
    render(<NoteEditor initialText="" onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('textbox', { name: /note/i })).toHaveValue('');
    expect(screen.getByText(/0\s*\/\s*1000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('should enable Save and call onSave with trimmed text for valid input (Success)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NoteEditor initialText="" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'check this citation');
    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeEnabled();
    await user.click(save);
    expect(onSave).toHaveBeenCalledWith('check this citation');
  });

  it('should pre-fill existing text when editing', () => {
    render(<NoteEditor initialText="prior note" onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('textbox', { name: /note/i })).toHaveValue('prior note');
  });

  it('should block save on whitespace-only text with a specific message (Error)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<NoteEditor initialText="" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByRole('textbox', { name: /note/i }), '   ');
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(screen.getByText(/note cannot be empty/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should block save when text exceeds 1000 characters and show the over-limit count', async () => {
    const user = userEvent.setup();
    render(<NoteEditor initialText={'a'.repeat(1001)} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/1001\s*\/\s*1000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    // ensure nothing else needed for user param lint
    void user;
  });

  it('should call onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<NoteEditor initialText="x" onSave={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
