import { useState } from 'react';
import type { Highlight } from '../core/types';

interface HighlightMenuProps {
  highlight: Highlight | null;
  onRemove: (id: string) => void;
  onClose: () => void;
  /** Feature 4 wires note actions here; absent in Feature 3. */
  onAddOrEditNote?: (id: string) => void;
  onDeleteNote?: (id: string) => void;
}

/**
 * Popover shown when an existing highlight is clicked (Bible §9). Text-labeled
 * actions only — never color-only. Remove asks for confirmation when a note
 * would be lost (Manifesto MVP Cutline item 3 / BUG-21).
 */
export function HighlightMenu({
  highlight,
  onRemove,
  onClose,
  onAddOrEditNote,
  onDeleteNote,
}: HighlightMenuProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  if (highlight === null) {
    return null;
  }
  const hasNote = highlight.note !== undefined;

  const requestRemove = () => {
    if (hasNote) {
      setConfirmingRemove(true);
    } else {
      onRemove(highlight.id);
    }
  };

  return (
    <div
      className="highlight-menu"
      role="menu"
      aria-label="Highlight actions"
      onMouseDown={(event) => event.preventDefault()}
      // Keep the menu's mouseup from bubbling to the document-area handler,
      // which would close (unmount) the menu before a menuitem's click fires.
      onMouseUp={(event) => event.stopPropagation()}
    >
      {confirmingRemove ? (
        <>
          <span className="highlight-menu-confirm" role="status">
            Remove this highlight? This will also delete its note.
          </span>
          <button type="button" role="menuitem" onClick={() => onRemove(highlight.id)}>
            Remove highlight and note
          </button>
          <button type="button" role="menuitem" onClick={() => setConfirmingRemove(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          {onAddOrEditNote && (
            <button type="button" role="menuitem" onClick={() => onAddOrEditNote(highlight.id)}>
              {hasNote ? 'Edit note' : 'Add note'}
            </button>
          )}
          {hasNote && onDeleteNote && (
            <button type="button" role="menuitem" onClick={() => onDeleteNote(highlight.id)}>
              Delete note
            </button>
          )}
          <button type="button" role="menuitem" onClick={requestRemove}>
            Remove highlight
          </button>
          <button type="button" role="menuitem" onClick={onClose}>
            Close
          </button>
        </>
      )}
    </div>
  );
}
