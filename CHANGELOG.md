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
- Annotation data model types (AnnotationStore/Highlight/TextAnchor/Note,
  schemaVersion 1) defined in src/core/types.ts. No storage behavior yet.

### Added
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
