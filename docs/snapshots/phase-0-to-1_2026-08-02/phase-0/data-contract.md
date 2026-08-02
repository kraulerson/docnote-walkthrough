# Data Contract — DocNote (docnote-walkthrough)

<!--
  Phase 0 Step 0.3 output. This document captures the full data input/output
  specification before it is summarized into the Product Manifesto Section 4.

  Save as: docs/phase-0/data-contract.md

  This defines WHAT data flows through the system, not HOW (architecture is Phase 1).
-->

**Date:** 2026-08-02
**Status:** Complete (synthesized from PROJECT_INTAKE.md §5 via the With-Intake validation prompt)

---

## Data Inputs

| # | Input | Source | Format | Validation Rules | Sensitivity |
|---|-------|--------|--------|-----------------|-------------|
| 1 | Document file | User (file picker) | .docx (ZIP container + WordprocessingML XML) | Required. Must parse as .docx; ≤10 MB; processed entirely client-side; never transmitted | Internal |
| 2 | Highlight | User (text selection + color pick) | App data: anchored text range + color id | Range must anchor to existing document text; color must be in the defined palette; ranges must not intersect existing highlights | Internal |
| 3 | Note text | User (note editor) | Plain text (UTF-8) | 1-1000 characters; stored and rendered as plain text only (never interpreted as HTML) | Internal |

*Inputs implied by features but not listed in the Intake (validation finding):*

| # | Input | Source | Format | Validation Rules | Sensitivity |
|---|-------|--------|--------|-----------------|-------------|
| 4 | Document identity | Derived (hash of extracted text content) | String digest | Deterministic; computed client-side; used as the localStorage key for annotation sets | Internal (derived) |

---

## Data Transformations

| # | Input(s) | Transformation | Output | Error Behavior |
|---|----------|---------------|--------|----------------|
| 1 | Document file | Parse .docx → extract text + paragraph structure | In-memory document model for rendering | Parse failure → specific error banner; app returns to picker state; no partial render |
| 2 | Document model | Render to read-only view | Scrollable document view | Render failure → error banner; document model discarded |
| 3 | Document model | Hash extracted text content | Document identity key | Hash failure (should be impossible) → session-only mode with warning |
| 4 | Highlight/Note actions | Serialize annotation set to JSON | localStorage record keyed by document identity (versioned schema) | Quota/unavailable → in-memory only + user warning; write failures never crash |
| 5 | localStorage record | Deserialize + validate schema version → re-anchor ranges onto rendered document | Restored highlights and notes | Corrupt/unknown version → discard with user message; unanchorable items → marked "unlocated," never silently dropped |

---

## Data Outputs

| # | Output | Destination | Format | Retention | Sensitivity |
|---|--------|-------------|--------|-----------|-------------|
| 1 | Rendered document view | Screen | HTML (read-only) | Ephemeral (session) | Internal |
| 2 | Notes side panel | Screen | HTML list, document order | Ephemeral (session) | Internal |
| 3 | Annotation set | Browser localStorage | Versioned JSON | Until user deletes (in-app removal or clearing browser storage) | Internal |

---

## Third-Party Integrations

| # | Service | Data Sent | Data Received | Fallback if Unavailable |
|---|---------|-----------|---------------|------------------------|
| — | None | — | — | — |

*None — this product operates entirely offline/self-contained at runtime. (A .docx parsing library is a build-time dependency, not a runtime service.)*

---

## State Boundaries

| Data | Lifecycle | Persistence | Backup Required |
|------|-----------|-------------|-----------------|
| Document content | Created on file open → destroyed on close/new open | Memory only — NEVER stored by the app | No (user owns the file) |
| Document identity key | Computed on open → persists as storage key | localStorage (as key) | No |
| Highlights + notes | Created by user actions → destroyed by user deletion | localStorage (versioned JSON) | No (accepted risk, personal tool — Intake §5.4) |
| UI state (scroll, active color, open editors) | Session | Memory only | No |

**Boundary rule:** the document itself is ephemeral by design (integrity guarantee); only user-created annotations persist, and only locally.

---

## Sensitivity Classification Summary

| Classification | Data Items | Handling Requirements |
|---------------|------------|----------------------|
| **PII** | None identified as a data category. (Caveat: user documents MAY contain anything, including PII — mitigated by the local-only rule below.) | — |
| **Sensitive** | None | — |
| **Internal** | Document content (memory only), highlights, notes, document identity key | Never transmitted off the device; no analytics, no telemetry, no network calls at runtime; note text always treated as plain text (XSS-safe rendering) |
| **Public** | Application code/assets | None |

**Project-level `data_classification`: `internal`** (highest across rows — matches Intake §5.1.1, with `zdr_attested=false` + documented exception reason).

---

## Review Checklist

- [x] Every input has a defined source and validation rules
- [x] Every transformation has an error/fallback behavior
- [x] Every output has a defined destination and retention policy
- [x] PII is identified and handling requirements are specified (none as a category; local-only rule covers incidental PII in user documents)
- [x] Third-party integrations have fallback behavior defined (none exist)
- [x] State boundaries are clear (ephemeral vs. persistent)
