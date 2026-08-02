import type { Highlight } from '../core/types';

interface NotesPanelProps {
  highlights: readonly Highlight[];
  /** Click-to-jump (Feature 5). */
  onJump?: (id: string) => void;
  /** Highlight ids whose anchor could not be located in the rendered doc. */
  unlocatedIds?: ReadonlySet<string>;
}

/**
 * Notes side panel (Bible §9). Lists notes in DOCUMENT ORDER; note text is
 * rendered as text only (never HTML — Bible §10 rule 2). A note whose highlight
 * cannot be located is kept, marked "unlocated" (icon + word, not color-only),
 * and is not clickable-to-jump.
 */
export function NotesPanel({ highlights, onJump, unlocatedIds }: NotesPanelProps) {
  const unlocated = unlocatedIds ?? new Set<string>();
  const withNotes = highlights
    .filter((h) => h.note !== undefined)
    .slice()
    .sort(
      (a, b) =>
        a.anchor.paragraphIndex - b.anchor.paragraphIndex ||
        a.anchor.startOffset - b.anchor.startOffset,
    );

  return (
    <aside className="notes-panel" aria-label="Notes">
      <h2>Notes</h2>
      {withNotes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        <ul className="notes-list">
          {withNotes.map((h) => {
            const isUnlocated = unlocated.has(h.id);
            return (
              <li key={h.id} className={isUnlocated ? 'note-card unlocated' : 'note-card'}>
                <span className={`note-swatch hl-${h.color}`} aria-hidden="true" />
                <span className="note-color-label">{h.color}</span>
                {isUnlocated && (
                  <span className="note-badge">
                    <span aria-hidden="true">⚠</span> unlocated
                  </span>
                )}
                {/* Excerpt preview of the highlighted passage (Bible §9). Plain
                    text via a React child — never HTML. */}
                <span className="note-excerpt" title={h.anchor.exactText}>
                  {h.anchor.exactText}
                </span>
                {onJump && !isUnlocated ? (
                  <button type="button" className="note-jump" onClick={() => onJump(h.id)}>
                    {h.note?.text}
                  </button>
                ) : (
                  <span className="note-text">{h.note?.text}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
