/**
 * Feature 5 — NotesPanel: document ordering, click-to-jump, unlocated state.
 * Written before implementation.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Highlight } from '../core/types';
import { NotesPanel } from './NotesPanel';

function hl(id: string, paragraphIndex: number, startOffset: number, noteText?: string): Highlight {
  return {
    id,
    color: 'yellow',
    anchor: { paragraphIndex, startOffset, endOffset: startOffset + 3, exactText: 'abc' },
    ...(noteText === undefined ? {} : { note: { text: noteText, createdAt: 'x', updatedAt: 'x' } }),
    createdAt: 'x',
    updatedAt: 'x',
  };
}

describe('NotesPanel — Feature 5', () => {
  it('should show the empty state when no highlight has a note', () => {
    render(<NotesPanel highlights={[hl('a', 0, 0)]} onJump={() => {}} unlocatedIds={new Set()} />);
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it('should list notes in document order regardless of insertion order', () => {
    // Provided out of document order: paragraph 3 before paragraph 1.
    const highlights = [hl('late', 3, 5, 'third note'), hl('early', 1, 2, 'first note')];
    render(<NotesPanel highlights={highlights} onJump={() => {}} unlocatedIds={new Set()} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByText(/first note/i)).toBeInTheDocument();
    expect(within(items[1]!).getByText(/third note/i)).toBeInTheDocument();
  });

  it('should call onJump with the highlight id when a located note is clicked', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(<NotesPanel highlights={[hl('h1', 0, 0, 'jump me')]} onJump={onJump} unlocatedIds={new Set()} />);
    await user.click(screen.getByRole('button', { name: /jump me/i }));
    expect(onJump).toHaveBeenCalledWith('h1');
  });

  it('should mark an unlocated note with a text badge and not offer a jump button', () => {
    const onJump = vi.fn();
    render(
      <NotesPanel
        highlights={[hl('lost', 2, 4, 'orphan note')]}
        onJump={onJump}
        unlocatedIds={new Set(['lost'])}
      />,
    );
    expect(screen.getByText(/unlocated/i)).toBeInTheDocument();
    // No clickable jump for an unlocated note.
    expect(screen.queryByRole('button', { name: /orphan note/i })).not.toBeInTheDocument();
    expect(screen.getByText(/orphan note/i)).toBeInTheDocument();
  });
});
