import { useCallback, useState } from 'react';
import { DocNoteError, ERROR_MESSAGES } from '../core/errors';
import { log } from '../core/log';
import type { ParsedDocument } from '../core/parseDocx';
import { parseDocx } from '../core/parseDocx';
import { MAX_DOCUMENT_BYTES } from '../core/types';
import { Banner } from './Banner';
import { DocumentView } from './DocumentView';

type ViewState =
  | { kind: 'landing' }
  | { kind: 'loading'; fileName: string }
  | { kind: 'ready'; fileName: string; document: ParsedDocument };

export function App() {
  const [view, setView] = useState<ViewState>({ kind: 'landing' });
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      log('warn', 'open.rejected', { reason: 'file-too-large', bytes: file.size });
      setError(ERROR_MESSAGES['file-too-large']);
      return;
    }
    setView((previous) =>
      previous.kind === 'ready' ? previous : { kind: 'loading', fileName: file.name },
    );
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseDocx(buffer);
      setView({ kind: 'ready', fileName: file.name, document: parsed });
    } catch (caught) {
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
        <section className="document-area" aria-label="Document">
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
          {view.kind === 'ready' && <DocumentView document={view.document} />}
        </section>
        <aside className="notes-panel" aria-label="Notes">
          <h2>Notes</h2>
          <p>No notes yet.</p>
        </aside>
      </main>
    </div>
  );
}
