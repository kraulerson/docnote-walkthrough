# Feature Reference

<!--
  This document is a living index of all features built during Phase 2.
  Update at Step 2.5 of every Build Loop iteration alongside the CHANGELOG and Bible.
  Purpose: Give someone a quick orientation to what the app does without reading the Bible.
  For detailed analysis, follow the links to ADRs and interface docs.
-->

## Feature 1: docx-open-render

**Phase Built:** 2
**Status:** Complete
**Summary:** Opens a user-picked .docx (≤10 MB) entirely in the browser and renders its text read-only with paragraph structure. Rejects invalid, oversized, empty, and over-long documents with specific banners; hostile converter output is neutralized at the sanitizer choke point. This is the foundation every other feature renders on.
**Key Interfaces:** docs/api and interfaces/core-parse.md (`parseDocx`, `sanitizeToFragment`, `DocNoteError`)
**Related ADRs:** docs/ADR documentation/ADR-0001-architecture-selection.md
**Test Coverage:** Unit (parse pipeline boundaries, sanitizer attack payloads) + Component (App states Empty/Loading/Error/Success, recovery flow). E2E arrives Phase 3.
**Known Limitations:** Embedded images render as blocks/placeholders and are additionally blocked by the production CSP (in-scope simplification). Decompression-bomb residual accepted (TM-007, audit finding #2). Parse runs on the main thread.

---

<!-- Copy the section above for each new feature. Number sequentially. -->
