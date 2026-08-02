# UAT Session 3 — Human Tester Submission

**Tester:** Karl (Orchestrator) | **Date:** 2026-08-02
**Scope:** Feature 5 (notes-panel-jump), Feature 6 (local-persistence)
**Method:** Live browser pass in Chrome against the production preview build.

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Persist across reload | **PASS (live)** | Opened valid.docx, highlighted "launch shipped" yellow, added note "persisted across reload". Reloaded the page (in-memory state cleared), re-opened the same file → the yellow highlight AND the note reappeared in the panel. localStorage held 1 key with 1 highlight. |
| 2 | Notes panel shows color without color alone | **PASS (live)** | Each note card shows a swatch + the text label ("Yellow"). |
| 3 | Notes list in document order | **PASS (by proxy)** | Covered by NotesPanel + panelJumpFlow tests (green). |
| 4 | Click-to-jump scrolls + emphasizes | **PASS (by proxy)** | Covered by panelJumpFlow test (scrollIntoView called + hl-jump-target class applied). |
| 5 | Unlocated note badge, no jump | **PASS (by proxy)** | Covered by NotesPanel test. |
| 6 | Corrupt/unknown-version stored data discarded safely | **PASS (by proxy)** | Covered by annotationRepository tests (corrupt JSON, bad schema → null). |
| 7 | Storage unavailable → warning, session still works | **PASS (by proxy)** | Covered by persistenceFlow test (mocked setItem throws → warning + highlight still applies). |

## Defects found by the human pass
None. Persistence restore across a real page reload worked on the first try.
