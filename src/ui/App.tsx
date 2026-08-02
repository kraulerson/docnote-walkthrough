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

  const onDocumentMouseUp = useCallback(() => {
    const container = documentContainer.current;
    if (!container) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setToolbar({ visible: false });
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setToolbar({ visible: false });
      return;
    }
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
              <DocumentView
                document={view.document}
                highlights={highlights}
                containerRef={setDocumentContainer}
              />
            </>
          )}
        </section>
        <aside className="notes-panel" aria-label="Notes">
          <h2>Notes</h2>
          <p>No notes yet.</p>
        </aside>
      </main>
    </div>
  );
}
