import type { HighlightColor } from '../core/types';
import { HIGHLIGHT_COLORS } from '../core/types';

interface SelectionToolbarProps {
  visible: boolean;
  /** Non-null replaces the swatches with an explanation (Error state). */
  hint: string | null;
  onPick: (color: HighlightColor) => void;
}

const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
};

/** Color choices carry text labels — never color alone (Bible §14). */
export function SelectionToolbar({ visible, hint, onPick }: SelectionToolbarProps) {
  if (!visible) {
    return null;
  }
  return (
    <div
      className="selection-toolbar"
      role="toolbar"
      aria-label="Highlight selection"
      // A mousedown on the toolbar must not collapse the document selection
      // (the anchor would be lost before click fires), and its mouseup must
      // not re-trigger the document area's selection handling.
      onMouseDown={(event) => event.preventDefault()}
      onMouseUp={(event) => event.stopPropagation()}
    >
      {hint !== null ? (
        <p className="toolbar-hint" role="status">
          {hint}
        </p>
      ) : (
        HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`swatch swatch-${color}`}
            onClick={() => onPick(color)}
          >
            <span aria-hidden="true" className={`swatch-dot hl-${color}`} />
            {COLOR_LABELS[color]}
          </button>
        ))
      )}
    </div>
  );
}
