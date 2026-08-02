import { useCallback, useRef, useState } from 'react';
import { anchorFromRange, anchorsIntersect } from '../core/anchors';
import { DocNoteError, ERROR_MESSAGES } from '../core/errors';
import { log } from '../core/log';
import type { ParsedDocument } from '../core/parseDocx';
import { parseDocx } from '../core/parseDocx';
import type { Highlight, HighlightColor, TextAnchor } from '../core/types';
import { MAX_DOCUMENT_BYTES } from '../core/types';
import { Banner } from './Banner';
import { DocumentView } from './DocumentView';
import { HighlightMenu } from './HighlightMenu';
import { NoteEditor } from './NoteEditor';
import { NotesPanel } from './NotesPanel';
import { SelectionToolbar } from './SelectionToolbar';

type ViewState =
  | { kind: 'landing' }
  | { kind: 'loading'; fileName: string }
  | { kind: 'ready'; fileName: string; document: ParsedDocument };

type ToolbarState =
  | { visible: false }
  | { visible: true; hint: string | null; anchor: TextAnchor | null };

const HINT_UNANCHORABLE = 'Select text inside the document to highlight.';
const HINT_OVERLAP = 'Highlights cannot overlap.';

export function App() {
  const [view, setView] = useState<ViewState>({ kind: 'landing' });
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<readonly Highlight[]>([]);
  const [toolbar, setToolbar] = useState<ToolbarState>({ visible: false });
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [noteEditorFor, setNoteEditorFor] = useState<string | null>(null);
  const [unlocatedIds, setUnlocatedIds] = useState<ReadonlySet<string>>(new Set());
  const documentContainer = useRef<HTMLDivElement | null>(null);
  // BUG-4: monotonic token so a slow parse of an earlier file cannot overwrite
  // the result of a later-picked file (concurrent-open race).
  const openToken = useRef(0);

  const openFile = useCallback(async (file: File) => {
    const token = ++openToken.current;
    setError(null);
    setToolbar({ visible: false });
    if (file.size > MAX_DOCUMENT_BYTES) {
      log('warn', 'open.rejected', { reason: 'file-too-large', bytes: file.size });
      setError(ERROR_MESSAGES['file-too-large']);
      return;
    }
    setView({ kind: 'loading', fileName: file.name });
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseDocx(buffer);
      if (token !== openToken.current) {
        return; // a newer open superseded this one — drop the stale result
      }
      setHighlights([]);
      setActiveHighlightId(null);
      setNoteEditorFor(null);
      setUnlocatedIds(new Set());
      setView({ kind: 'ready', fileName: file.name, document: parsed });
    } catch (caught) {
      if (token !== openToken.current) {
        return;
      }
      const message =
        caught instanceof DocNoteError ? caught.message : ERROR_MESSAGES['invalid-docx'];
      if (!(caught instanceof DocNoteError)) {
        log('error', 'open.unexpected_error', {
          errorName: caught instanceof Error ? caught.name : 'unknown',
        });
      }
      setError(message);
      setView((previous) => (previous.kind === 'loading' ? { kind: 'landing' } : previous));
    }
  }, []);

  const onPick = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Allow re-selecting the same file later.
      event.target.value = '';
      if (file) {
        void openFile(file);
      }
    },
    [openFile],
  );

  const onDocumentMouseUp = useCallback((event: React.MouseEvent) => {
    const container = documentContainer.current;
    if (!container) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setToolbar({ visible: false });
      // Feature 3: a plain click (no selection) on an existing highlight opens
      // its action menu; a click on empty text closes any open menu.
      const target = event.target as Element | null;
      const mark = target?.closest?.('mark[data-hl-id]') as HTMLElement | null;
      setActiveHighlightId(mark?.dataset.hlId ?? null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setToolbar({ visible: false });
      return;
    }
    // BUG-25: a new selection opens the color toolbar — close any open
    // highlight menu so the two popovers are never shown at once.
    setActiveHighlightId(null);
    const anchor = anchorFromRange(container, range);
    if (!anchor) {
      setToolbar({ visible: true, hint: HINT_UNANCHORABLE, anchor: null });
      return;
    }
    if (highlights.some((h) => anchorsIntersect(h.anchor, anchor))) {
      setToolbar({ visible: true, hint: HINT_OVERLAP, anchor: null });
      return;
    }
    setToolbar({ visible: true, hint: null, anchor });
  }, [highlights]);

  const onColorPick = useCallback(
    (color: HighlightColor) => {
      if (!toolbar.visible || toolbar.anchor === null) {
        return;
      }
      const now = new Date().toISOString();
      const highlight: Highlight = {
        id: crypto.randomUUID(),
        color,
        anchor: toolbar.anchor,
        createdAt: now,
        updatedAt: now,
      };
      // BUG-19: functional updater with an overlap guard so two same-tick
      // swatch clicks (rapid double-click) cannot create a duplicate/overlapping
      // highlight — the queued updater sees the accumulated state, not stale.
      setHighlights((previous) => {
        if (previous.some((h) => anchorsIntersect(h.anchor, highlight.anchor))) {
          return previous;
        }
        return [...previous, highlight].sort(
          (a, b) =>
            a.anchor.paragraphIndex - b.anchor.paragraphIndex ||
            a.anchor.startOffset - b.anchor.startOffset,
        );
      });
      window.getSelection()?.removeAllRanges();
      setToolbar({ visible: false });
      log('info', 'highlight.applied', { color, paragraph: highlight.anchor.paragraphIndex });
    },
    [toolbar],
  );

  const removeHighlight = useCallback((id: string) => {
    // Idempotent: filtering a missing id is a no-op. Also drops the note (F4).
    setHighlights((previous) => previous.filter((h) => h.id !== id));
    setActiveHighlightId(null);
    setNoteEditorFor((current) => (current === id ? null : current));
    log('info', 'highlight.removed', {});
  }, []);

  const openNoteEditor = useCallback((id: string) => {
    setNoteEditorFor(id);
    setActiveHighlightId(null); // close the menu; the editor takes over
  }, []);

  const saveNote = useCallback(
    (id: string, text: string) => {
      // BUG-26: keep the updater pure — decide the missing-highlight case here,
      // outside setHighlights (updaters are double-invoked under StrictMode).
      if (!highlights.some((h) => h.id === id)) {
        setError('The highlight for this note no longer exists.');
        setNoteEditorFor(null);
        return;
      }
      const now = new Date().toISOString();
      setHighlights((previous) =>
        previous.map((h) =>
          h.id === id
            ? {
                ...h,
                note: { text, createdAt: h.note?.createdAt ?? now, updatedAt: now },
                updatedAt: now,
              }
            : h,
        ),
      );
      setNoteEditorFor(null);
      log('info', 'note.saved', { chars: text.length });
    },
    [highlights],
  );

  const deleteNote = useCallback((id: string) => {
    setHighlights((previous) =>
      previous.map((h) => {
        if (h.id !== id) {
          return h;
        }
        const { note: _removed, ...rest } = h;
        void _removed;
        return rest;
      }),
    );
    setActiveHighlightId(null);
    // BUG-22: if the editor for this note is open, close it so a stale Save
    // cannot resurrect the just-deleted note.
    setNoteEditorFor((current) => (current === id ? null : current));
    log('info', 'note.deleted', {});
  }, []);

  const onUnlocated = useCallback((ids: string[]) => {
    setUnlocatedIds(new Set(ids));
  }, []);

  const jumpToHighlight = useCallback((id: string) => {
    const container = documentContainer.current;
    if (!container) {
      return;
    }
    const mark = container.querySelector<HTMLElement>(`mark[data-hl-id="${CSS.escape(id)}"]`);
    if (!mark) {
      return;
    }
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Non-color-only emphasis: outline + brief animation via a class.
    for (const el of container.querySelectorAll('mark.hl-jump-target')) {
      el.classList.remove('hl-jump-target');
    }
    // Every mark segment of this highlight gets the emphasis.
    for (const el of container.querySelectorAll(`mark[data-hl-id="${CSS.escape(id)}"]`)) {
      el.classList.add('hl-jump-target');
    }
    log('info', 'note.jump', {});
  }, []);

  const setDocumentContainer = useCallback((element: HTMLDivElement | null) => {
    documentContainer.current = element;
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>DocNote</h1>
        <p className="app-promise">Read-only — your file is never modified or uploaded.</p>
        <label className="file-picker">
          {view.kind === 'ready' ? 'Open another .docx' : 'Open a .docx'}
          <input type="file" accept=".docx" onChange={onPick} aria-label="Open a .docx" />
        </label>
      </header>
      {error !== null && <Banner message={error} onDismiss={() => setError(null)} />}
      <main className="app-main">
        <section className="document-area" aria-label="Document" onMouseUp={onDocumentMouseUp}>
          {view.kind === 'landing' && (
            <p className="landing-hint">
              Pick a Word document to read it here. Nothing is uploaded; the file is never
              modified.
            </p>
          )}
          {view.kind === 'loading' && (
            <p className="landing-hint" role="status">
              Opening {view.fileName}…
            </p>
          )}
          {view.kind === 'ready' && (
            <>
              <SelectionToolbar
                visible={toolbar.visible}
                hint={toolbar.visible ? toolbar.hint : null}
                onPick={onColorPick}
              />
              <HighlightMenu
                key={activeHighlightId ?? 'none'}
                highlight={highlights.find((h) => h.id === activeHighlightId) ?? null}
                onRemove={removeHighlight}
                onClose={() => setActiveHighlightId(null)}
                onAddOrEditNote={openNoteEditor}
                onDeleteNote={deleteNote}
              />
              {noteEditorFor !== null && (
                <NoteEditor
                  // BUG-20: key by target highlight so switching the editor to a
                  // different highlight remounts it with that highlight's text,
                  // never carrying the previous draft.
                  key={noteEditorFor}
                  initialText={
                    highlights.find((h) => h.id === noteEditorFor)?.note?.text ?? ''
                  }
                  onSave={(text) => saveNote(noteEditorFor, text)}
                  onCancel={() => setNoteEditorFor(null)}
                />
              )}
              <DocumentView
                document={view.document}
                highlights={highlights}
                onUnlocated={onUnlocated}
                containerRef={setDocumentContainer}
              />
            </>
          )}
        </section>
        {view.kind === 'ready' ? (
          <NotesPanel highlights={highlights} onJump={jumpToHighlight} unlocatedIds={unlocatedIds} />
        ) : (
          <aside className="notes-panel" aria-label="Notes">
            <h2>Notes</h2>
            <p>No notes yet.</p>
          </aside>
        )}
      </main>
    </div>
  );
}
