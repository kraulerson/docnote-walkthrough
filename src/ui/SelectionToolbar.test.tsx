/**
 * Feature 2 — SelectionToolbar component states (Bible §9).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectionToolbar } from './SelectionToolbar';

describe('SelectionToolbar', () => {
  it('should render nothing when hidden (Empty)', () => {
    const { container } = render(
      <SelectionToolbar visible={false} onPick={() => {}} hint={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should offer at least 3 labeled colors (Success path)', () => {
    render(<SelectionToolbar visible onPick={() => {}} hint={null} />);
    expect(screen.getByRole('button', { name: /yellow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /green/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /blue/i })).toBeInTheDocument();
  });

  it('should call onPick with the chosen color', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SelectionToolbar visible onPick={onPick} hint={null} />);
    await user.click(screen.getByRole('button', { name: /green/i }));
    expect(onPick).toHaveBeenCalledWith('green');
  });

  it('should show a hint message instead of swatches when the selection is unusable (Error)', () => {
    render(
      <SelectionToolbar visible onPick={() => {}} hint="Highlights cannot overlap." />,
    );
    expect(screen.getByText(/highlights cannot overlap/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /yellow/i })).not.toBeInTheDocument();
  });
});
