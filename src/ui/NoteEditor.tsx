import { useState } from 'react';
import { MAX_NOTE_CHARS } from '../core/types';

interface NoteEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

/**
 * Note editor (Bible §9). Plain-text only (rendered via textarea value / the
 * panel's textContent — never HTML). Save is blocked on empty/whitespace and
 * on >MAX_NOTE_CHARS, each with a specific message (Manifesto failure states).
 */
export function NoteEditor({ initialText, onSave, onCancel }: NoteEditorProps) {
  const [text, setText] = useState(initialText);
  const trimmedLength = text.trim().length;
  const overLimit = text.length > MAX_NOTE_CHARS;
  const empty = trimmedLength === 0;
  const canSave = !empty && !overLimit;

  return (
    <div className="note-editor">
      <label className="note-editor-label" htmlFor="note-editor-textarea">
        Note
      </label>
      <textarea
        id="note-editor-textarea"
        aria-label="Note"
        className="notes-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="note-editor-footer">
        <span className={overLimit ? 'note-count over' : 'note-count'}>
          {text.length} / {MAX_NOTE_CHARS}
        </span>
        {empty && <span className="note-error">Note cannot be empty.</span>}
        {overLimit && <span className="note-error">Note is too long.</span>}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={!canSave} onClick={() => onSave(text.trim())}>
          Save
        </button>
      </div>
    </div>
  );
}
