import type { Highlight } from '../core/types';

interface NotesPanelProps {
  highlights: readonly Highlight[];
  /** Feature 5 wires click-to-jump here; absent in Feature 4. */
  onJump?: (id: string) => void;
}

/**
 * Notes side panel. Feature 4 lists note text (plain text via {note.text},
 * never HTML — Bible §10 rule 2). Feature 5 adds click-to-jump, document
 * ordering, and the "unlocated" state.
 */
export function NotesPanel({ highlights, onJump }: NotesPanelProps) {
  const withNotes = highlights.filter((h) => h.note !== undefined);
  return (
    <aside className="notes-panel" aria-label="Notes">
      <h2>Notes</h2>
      {withNotes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        <ul className="notes-list">
          {withNotes.map((h) => (
            <li key={h.id} className="note-card">
              <span className={`note-swatch hl-${h.color}`} aria-hidden="true" />
              <span className="note-color-label">{h.color}</span>
              {onJump ? (
                <button type="button" className="note-jump" onClick={() => onJump(h.id)}>
                  {h.note?.text}
                </button>
              ) : (
                <span className="note-text">{h.note?.text}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
