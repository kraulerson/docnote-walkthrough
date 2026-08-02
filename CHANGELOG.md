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
- Feature 1 — docx-open-render: open a .docx (≤10 MB) via file picker and
  render its text read-only. Client-side mammoth conversion, specific error
  banners for invalid/oversized/empty/too-long documents, unicode-safe,
  literal markup in documents stays text.

### Changed

### Fixed

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
