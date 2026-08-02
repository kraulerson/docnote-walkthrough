/**
 * Feature 3 — HighlightMenu component states (Bible §9).
 * Written before implementation (Build Loop 2.2).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HighlightMenu } from './HighlightMenu';

describe('HighlightMenu', () => {
  it('should render nothing when no highlight is active (Empty)', () => {
    const { container } = render(
      <HighlightMenu highlight={null} onRemove={() => {}} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should offer a labeled Remove action when a highlight is active', () => {
    const hl = {
      id: 'h1',
      color: 'yellow' as const,
      anchor: { paragraphIndex: 0, startOffset: 0, endOffset: 3, exactText: 'abc' },
      createdAt: 'x',
      updatedAt: 'x',
    };
    render(<HighlightMenu highlight={hl} onRemove={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('menuitem', { name: /remove highlight/i })).toBeInTheDocument();
  });

  it('should call onRemove with the highlight id when Remove is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const hl = {
      id: 'h9',
      color: 'green' as const,
      anchor: { paragraphIndex: 1, startOffset: 2, endOffset: 6, exactText: 'test' },
      createdAt: 'x',
      updatedAt: 'x',
    };
    render(<HighlightMenu highlight={hl} onRemove={onRemove} onClose={() => {}} />);
    await user.click(screen.getByRole('menuitem', { name: /remove highlight/i }));
    expect(onRemove).toHaveBeenCalledWith('h9');
  });
});
