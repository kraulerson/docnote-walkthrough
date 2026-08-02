# Security Audit Findings — Feature: notes-crud

**Feature:** notes-crud (Feature 4 — attach / edit / delete a note on a highlight)
**Date:** 2026-08-02
**Auditor Persona:** Senior Security Engineer

---

## Automated Scan Results

| Tool | Config | Result | Findings |
|------|--------|--------|----------|
| Semgrep | p/owasp-top-ten, p/security-audit | Pass | 0 findings across 91 rules / 35 files (src/) |

Pre-commit gates (gitleaks + browser-sink pack + project ruleset): clean.

## Manual Review Findings

| # | Category | Finding | Severity | File:Line | Resolution | Status |
|---|----------|---------|----------|-----------|------------|--------|
| 1 | Stored XSS (TM-003 precursor) | Note text is rendered EXCLUSIVELY as text: NoteEditor uses a controlled `<textarea value>` and NotesPanel renders `{note.text}` as a React child (auto-escaped) — never `innerHTML`. A note containing `<script>` or `<img onerror>` shows as literal characters. This is the invariant Feature 6 persistence depends on. Tested implicitly (note text asserted by textContent). | Low | src/ui/NoteEditor.tsx, src/ui/NotesPanel.tsx | Verified | Fixed |
| 2 | Input Validation | Length + emptiness enforced in the editor: Save disabled on trimmed-empty (message "Note cannot be empty.") and on >1000 chars (over-limit counter + message). onSave passes trimmed text. Boundary tested (0, whitespace, 1001). | Low | src/ui/NoteEditor.tsx | Verified + tested | Fixed |
| 3 | State Integrity | saveNote/deleteNote are pure functional updaters keyed by id. Editing preserves createdAt, updates updatedAt. Deleting a note removes only the `note` field (highlight kept) — tested. Removing a highlight mid-edit is handled: saveNote detects the missing id and shows "The highlight for this note no longer exists." instead of resurrecting it (Manifesto failure state). | Low | src/ui/App.tsx | Verified + tested | Fixed |
| 4 | Logging | note.saved logs a char COUNT only; note.deleted logs nothing sensitive. No note text is ever logged (Bible §10 rule 7). | Low | src/ui/App.tsx | Verified | Fixed |
| 5 | Event Handling | NoteEditor lives inside the document-area; its Save/Cancel are plain buttons. The editor is not a menu, so it does not need the menu's mouseup-stop; verified its clicks are not swallowed (tests pass through Save). | Info | src/ui/App.tsx | Verified | Fixed |

## Threat Model Cross-Reference

| Threat ID | Relevant? | Mitigation Verified? | Notes |
|-----------|-----------|---------------------|-------|
| TM-002 | Yes | Yes | No HTML sink; note text is React-escaped |
| TM-003 | Yes (precursor) | Yes | Text-only rendering is the guarantee the future localStorage restore relies on |
| TM-005 | Partially | Noted | Note text will be stored unencrypted in Feature 6 — already a documented residual risk |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 5 |
| Accepted (with rationale) | 0 |
| Open | 0 |

**All findings resolved:** Yes
