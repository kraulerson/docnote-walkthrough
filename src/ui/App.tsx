/**
 * App shell (Phase 2 init scaffold).
 *
 * Deliberately feature-free: opening/rendering documents, highlighting,
 * notes, and persistence are MVP Cutline items and are built one at a time
 * through the Build Loop (Bible §1, "MVP Cutline Work Requires the Build
 * Loop"). This shell only establishes the layout described in Bible §9.
 */
export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>DocNote</h1>
        <p className="app-promise">Read-only — your file is never modified or uploaded.</p>
      </header>
      <main className="app-main">
        <section className="document-area" aria-label="Document">
          <p className="landing-hint">Document viewing arrives with the first feature.</p>
        </section>
        <aside className="notes-panel" aria-label="Notes">
          <h2>Notes</h2>
          <p>No notes yet.</p>
        </aside>
      </main>
    </div>
  );
}
