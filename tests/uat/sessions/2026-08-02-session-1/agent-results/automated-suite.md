# Automated Suite — UAT Session 1 (2026-08-02)

Run from project root: `/Users/karl/Documents/Claude Projects/test-walk/docnote-walkthrough`

## Summary

| Command | Verdict |
| --- | --- |
| `npx vitest run` | PASS — 53/53 tests, 7/7 files |
| `npm run lint` | PASS — 0 errors, 6 warnings (eslint-plugin-security) |
| `npm run build` | PASS — tsc clean, Vite build OK, 1 chunk-size warning |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |

## Details

### vitest (exit 0)
```
Test Files  7 passed (7)
     Tests  53 passed (53)
  Duration  783ms
```

### lint (exit 0) — 6 warnings, all from `eslint-plugin-security`
- `src/core/errors.ts:23` — Generic Object Injection Sink (`security/detect-object-injection`)
- `src/core/log.ts:52` — Function Call Object Injection Sink (`security/detect-object-injection`)
- `src/ui/SelectionToolbar.tsx:46` — Generic Object Injection Sink (`security/detect-object-injection`)
- `src/core/parseDocx.test.ts:14`, `src/ui/App.test.tsx:15`, `src/ui/highlightFlow.test.tsx:19` — `readFile` with non-literal path (`security/detect-non-literal-fs-filename`); test-only fixture loading.

### build (exit 0) — `tsc --noEmit && vite build`
```
dist/index.html                   0.60 kB │ gzip:   0.38 kB
dist/assets/index-CdpTW86r.css    2.35 kB │ gzip:   0.88 kB
dist/assets/index-Bh6CQ-LL.js   723.93 kB │ gzip: 198.22 kB
(!) Some chunks are larger than 500 kB after minification.
```
Warning suggests dynamic `import()` / code-splitting or raising `build.chunkSizeWarningLimit`.

### audit (exit 0)
```
found 0 vulnerabilities
```
(Production dependencies only: dompurify 3.4.12, mammoth 1.12.0, react 19.2.8, react-dom 19.2.8.)

## Bugs/Concerns

- No failures. Two low-priority items for triage awareness, neither blocking:
  1. **Bundle size**: single JS chunk is 723.93 kB minified (198.22 kB gzip), above Vite's 500 kB warning threshold — largely the mammoth .docx parser. Consider code-splitting if load performance becomes a concern.
  2. **Lint security warnings (6)**: the three `detect-object-injection` hits in `errors.ts`, `log.ts`, `SelectionToolbar.tsx` look like keyed-lookup false positives typical of this rule, and the three `detect-non-literal-fs-filename` hits are test fixture reads. Worth a one-time human glance to confirm, then suppress or leave as-is.
