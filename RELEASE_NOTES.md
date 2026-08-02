# Release Notes

## 1.0.0 — 2026-08-02

Live at https://kraulerson.github.io/docnote-walkthrough/

### What This Application Does

DocNote opens a Word (.docx) document read-only in your browser, lets you
highlight passages in three colors and attach short notes to them, and saves
those annotations locally so they reappear next time you open the same
document. Your file is never modified and nothing is uploaded.

### What's New in This Release (first release)

- Open and read a .docx (up to 10 MB) — client-side, read-only.
- Highlight selected text in Yellow, Green, or Blue; remove highlights.
- Attach, edit, and delete short notes (up to 1000 characters) on highlights.
- Notes side panel in document order; click a note to jump to its highlight.
- Highlights and notes persist locally per document across sessions.

### Compatibility

| Requirement | Supported |
|-------------|-----------|
| **Browser** (web) | Last 2 versions of Chrome, Firefox, Safari, Edge (desktop) |
| **Runtime** (to build) | Node.js 20+ |
| **Documents** | .docx only |

### Go-live verification

Deployed via the tag-triggered release workflow (run 30765794342). Production
smoke: HTTP 200, HTTPS, meta-CSP served; Lighthouse on the live URL —
Accessibility 100, Performance 98, Best-Practices 96. See
docs/test-results/2026-08-02_go-live-verification.md.

### Known Limitations

- Embedded document images are not displayed (text-focused rendering).
- Annotations are stored unencrypted in your browser (see SECURITY.md /
  PRIVACY_POLICY.md) — avoid annotating sensitive documents on a shared machine.
- Full keyboard-only text selection depends on the browser's caret-browsing
  mode; clickjacking-protection headers beyond the meta-CSP require a
  header-capable host (documented residuals).

### Reporting Issues

Email kraulerson@gmail.com or open a GitHub issue. Security reports: see
SECURITY.md.

<!--
  For subsequent releases: add a new section above this one (newest first).
  The "What This Application Does" section can be omitted in subsequent releases
  unless the product scope has changed.

  Subsequent release format:
  ## [Version] — YYYY-MM-DD
  ### What Changed
  [User-facing description of changes]
  ### What Was Fixed
  [Bugs fixed, with references to issue numbers if applicable]
  ### Known Issues
  [Anything known-broken in this release]
-->
