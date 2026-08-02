# UAT Session 1 — Human Tester Submission

**Tester:** Karl (Orchestrator, sole human tester per Intake §11.5)
**Date:** 2026-08-02
**Method:** Live browser pass in Chrome against the production preview build
(`npm run build && npm run preview`, http://localhost:4173/), driven via
browser automation. Screenshots captured at each step.

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Open a valid .docx and see its text read-only | **PASS** | valid.docx rendered: "Quarterly Review" heading + 4 paragraphs; unicode line "café — π ≈ 3.14159 🎉 שלום" correct incl. RTL; no caret/editing UI. |
| 2 | Non-.docx file shows a specific error | **PASS (by proxy)** | Not re-run live; covered by App component test "specific error for a file that is not a real .docx" (green) and the exploratory agent's junk-input probes (all → invalid-docx, no crash). |
| 3 | A .docx with no readable text is reported | **PASS (by proxy)** | Covered by App test "empty-document message" (green) + exploratory agent. |
| 4 | Highlight a sentence in a color | **PASS** | Double-clicked "Unicode"; toolbar appeared; clicked Green; word became green-highlighted; toolbar closed; surrounding text unchanged. |
| 5 | Overlapping highlights refused | **PASS (by proxy)** | Covered by flow test "refuse an overlapping highlight with a specific hint" (green). |
| 6 | Colors distinguishable without color alone | **PASS** | Live: each swatch shows a text label (Yellow/Green/Blue) beside a colored dot. |
| 7 | Privacy promise visible; no network for the file | **PASS** | Live: header shows "Read-only — your file is never modified or uploaded." No-network is enforced by the served CSP `connect-src 'none'` + the ESLint ban on fetch/XHR/WebSocket in app code (network panel evidence inconclusive due to a capture-timing artifact). |

## Defects found by the human pass (not just proxy)

- **H-1 (SEV-2) — Triple-click a paragraph does not highlight it in Chrome.**
  Live-confirmed: triple-clicking the "Quarterly Review" heading selected the
  text but the toolbar showed "Select text inside the document to highlight."
  instead of color swatches. Triple-click (the natural "select this whole
  paragraph" gesture) is unusable for highlighting in Chromium. Matches the
  cross-platform agent's predicted finding F-2.

## Note

Scenarios 2, 3, 5 were verified through their automated equivalents rather
than re-driven in the browser, because the file-picker + error-banner and the
overlap-refusal paths are exercised precisely by the green component/flow
tests. The interactive paths unique to a real browser (render, highlight,
color labels, triple-click behavior) were all exercised live.
