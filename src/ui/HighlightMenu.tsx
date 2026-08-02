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
 * actions only — never color-only. Feature 3 ships Remove; Feature 4 adds the
 * note actions through onAddOrEditNote.
 */
export function HighlightMenu({
  highlight,
  onRemove,
  onClose,
  onAddOrEditNote,
  onDeleteNote,
}: HighlightMenuProps) {
  if (highlight === null) {
    return null;
  }
  const hasNote = highlight.note !== undefined;
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
      <button type="button" role="menuitem" onClick={() => onRemove(highlight.id)}>
        Remove highlight
      </button>
      <button type="button" role="menuitem" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
