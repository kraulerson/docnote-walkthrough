# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/) with extended categories
for handoff clarity. Categories are ordered by impact severity.

<!--
  Category definitions:
  - Security: Vulnerability fixes, dependency patches for CVEs, auth changes
  - Data Model: Schema migrations, data format changes, rollback notes
  - Added: New features, new endpoints, new commands
  - Changed: Modifications to existing behavior
  - Fixed: Bug fixes (reference BUGS.md entry if applicable)
  - Removed: Removed features, deprecated endpoints
  - Infrastructure: CI/CD changes, dependency updates, configuration changes, tooling
  - Documentation: Significant doc updates (new ADRs, updated threat model, revised user guide)
-->

## [Unreleased]

### Security
- Decompression-bomb guard (BUG-1, SEV-1): reject a .docx whose ZIP central
  directory advertises >50 MB uncompressed BEFORE mammoth inflates it
  (`zipGuard.uncompressedSizeExceeds`); measured bomb (115 KB → 33.6 MB) now
  rejected in <1 s instead of a multi-second/GB-scale freeze. Corrects the
  TM-007 mitigation.
- Sanitizer hardened (BUG-6/7/16): forbid img/video/audio/source/picture/
  track/link/base and strip href/target/style/class/src/srcset, so a crafted
  document cannot beacon out or carry a clickable phishing link — no longer
  relying on the meta CSP alone (TM-002/TM-006 defense in depth).
- Sanitizer choke point for all converter output: DOMPurify to inert
  DocumentFragment (`sanitizeToFragment`), hostile-payload tests for
  script/event-handler/javascript:/iframe/style vectors (TM-002).
- Production-only meta CSP injected at build: `default-src 'self';
  connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`
  (TM-006).
- Per-feature security audit archived: docs/security-audits/docx-open-render-security-audit.md
  (0 open findings; decompression-bomb residual accepted per TM-007).

### Data Model
- Restore-path hardening: annotation stores load through a fresh-reconstruction
  validator (drops unknown/out-of-spec fields) and preserve createdAt.
- Feature 6 — local-persistence: annotations persist to localStorage keyed by
  a SHA-256 content hash of the document text (schemaVersion 1). Re-opening the
  same document restores highlights + notes; corrupt/unknown-version data is
  discarded safely; quota/unavailable storage degrade gracefully with a warning.
- Annotation data model types (AnnotationStore/Highlight/TextAnchor/Note,
  schemaVersion 1) defined in src/core/types.ts. No storage behavior yet.

### Added
- Feature 5 — notes-panel-jump: the notes side panel now lists notes in
  document order, clicking a note scrolls to its highlight and emphasizes it
  (outline + pulse, not color-only), and a note whose highlight can't be
  located is kept and marked "⚠ unlocated" (no jump).
- Feature 4 — notes-crud: attach a plain-text note (1-1000 chars) to a
  highlight via the action menu; edit replaces the text, delete removes the
  note but keeps the highlight. Notes appear in the side panel. Empty/over-
  limit saves are blocked with specific messages; a note whose highlight was
  removed mid-edit is discarded with a message. Note text is always rendered
  as text, never HTML.
- Feature 3 — remove-highlight: click a highlight to open a text-labeled
  action menu and remove it; the paragraph returns to normal (text unchanged),
  removal is idempotent, and the menu is keyboard/pointer operable.
- Feature 2 — highlight-apply: select text in the rendered document and apply
  one of 3 labeled colors (Yellow/Green/Blue). Anchor model: UTF-16 code-unit
  offsets within non-empty block elements + exactText verification; no
  overlapping highlights (Manifesto Q1); 5,000-char selection cap; toolbar
  never relies on color alone.
- Feature 1 — docx-open-render: open a .docx (≤10 MB) via file picker and
  render its text read-only. Client-side mammoth conversion, specific error
  banners for invalid/oversized/empty/too-long documents, unicode-safe,
  literal markup in documents stays text.

### Changed

### Fixed
- UAT Session 3 remediation (Features 5-6, found by the exploratory agent):
  - BUG-27 (SEV-3): the store's createdAt is now preserved across changes and
    reloads (the restore no longer triggers a redundant save that overwrote it).
  - BUG-28/29 (SEV-3/4): loadAnnotations now validates INTO fresh typed
    structures (Bible §4 vuln#3 / TM-003) — tampered extra fields are dropped,
    out-of-spec notes are dropped (highlight kept), invalid anchors reject the
    highlight.
  - BUG-30 (SEV-3): parseDocx computes fullText/paragraphCount with the same
    leaf-only block model as the anchor engine, so docHash no longer
    double-counts nested table/list blocks.
  - BUG-31 (SEV-4): the notes panel now shows the highlighted excerpt preview
    (Bible §9), rendered as text.
- UAT Session 2 remediation (Features 3-4, found by the exploratory agent + a
  live browser pass):
  - BUG-20 (SEV-2): NoteEditor now keyed by target highlight, so switching the
    editor between highlights never saves one highlight's draft onto another.
  - BUG-21 (SEV-2): remove-highlight now asks for confirmation when a note
    would be lost (the MVP Cutline requirement that was under-implemented).
  - BUG-22 (SEV-3): deleting a note closes its open editor so a stale Save
    cannot resurrect it.
  - BUG-23 (SEV-3): the note editor validates and counts the trimmed value it
    actually saves — a valid 1000-char note with a trailing newline is no
    longer wrongly blocked.
  - BUG-25 (SEV-4): opening the color toolbar closes any open highlight menu
    (never two popovers at once).
  - BUG-26 (SEV-4): pure setError (outside the state updater); a pristine empty
    editor no longer shows the empty-error; notes preserve line breaks and wrap
    long strings.
  SEV-3 Esc/focus-trap for the new popovers (BUG-24) deferred to Phase 3
  accessibility with BUG-13/14.
- UAT Session 1 remediation (found by automated + exploratory + cross-platform
  agents and a live browser pass):
  - BUG-2/3 (SEV-2): count/select only LEAF blocks, so nested table/list
    paragraphs are no longer double-counted and cross-paragraph selection
    inside one cell is refused.
  - BUG-4 (SEV-2): concurrent-open race — a monotonic token drops a stale
    parse so a slow earlier file can't overwrite a later-picked one.
  - BUG-5 (SEV-2): triple-click a paragraph now highlights in Chrome/Edge
    (clamp a selection ending at the start of the next block back to the
    paragraph); live-confirmed in Chromium.
  - BUG-8 (SEV-3): reject zero-width (equal-offset) anchors.
  - BUG-19 (SEV-4): overlap-guarded functional updater prevents a rapid
    double-click from double-applying a highlight.
- Selection toolbar collapsed the text selection on mousedown (real-browser
  bug caught by the flow tests before commit): toolbar now preventDefaults
  mousedown and stops mouseup propagation.

### Removed

### Infrastructure
- Project scaffold: React 19 + Vite + TypeScript strict, exact-pinned deps,
  ESLint 9 flat config (+security plugin, never-do rules), Vitest+jsdom+RTL,
  BL-125 test-command wired (`npx vitest run`).
- CI phase-gate step downgraded to warn in CI only (documented
  SOIF_PHASE_GATES knob) — see WALK-ISSUE-LOG.md ISSUE-006.

### Documentation
- CONTRIBUTING.md (coding standards pointer), fixture corpus for parser tests
  (valid/empty/no-document .docx).
