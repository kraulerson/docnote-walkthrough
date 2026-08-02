# DocNote

Read a Word (`.docx`) document in your browser, highlight passages in three
colors, and attach short notes — **without changing the file and without
uploading anything**. Your highlights and notes are saved locally and reappear
the next time you open the same document.

DocNote runs entirely in your browser: no server, no accounts, no network. Built
with the [Solo Orchestrator Framework](https://github.com/kraulerson/solo-orchestrator).

## Features

- Open a `.docx` read-only (client-side parse; the file is never modified or uploaded)
- Highlight selected text in Yellow / Green / Blue
- Attach, edit, and delete short notes on highlights
- Notes side panel in document order, click a note to jump to its highlight
- Everything persists locally (browser `localStorage`) per document

## Quick start (run it locally)

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and npm, plus a desktop
browser (latest Chrome, Firefox, Safari, or Edge).

```bash
git clone https://github.com/kraulerson/docnote-walkthrough.git
cd docnote-walkthrough
npm install
npm run dev          # open the printed http://localhost:5173 URL
```

Then click **Open a .docx** and pick a Word document.

To try a production build locally:

```bash
npm run build        # outputs a static site to dist/
npm run preview      # serves it at http://localhost:4173
```

## Deploy (GitHub Pages)

DocNote is a static site — the `dist/` folder is all you need to host.

1. Build: `npm run build`.
2. Publish `dist/` to the `gh-pages` branch (or via the release workflow, which
   is triggered by a version tag: `git tag v1.0.0 && git push --tags`).
3. In the repo's **Settings → Pages**, set the source to the `gh-pages` branch.

`vite.config.ts` uses a relative base and injects the production
Content-Security-Policy at build time. See `HANDOFF.md` §3 for the full deploy
notes and go-live header verification.

## Documentation

| Doc | What it is |
|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | How to use DocNote (open, highlight, note, save) |
| [SECURITY.md](SECURITY.md) | Security model + how to report a vulnerability |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | Data practices (short version: nothing leaves your device) |
| [HANDOFF.md](HANDOFF.md) | Maintainer guide: run, build, deploy, maintain |
| `PROJECT_BIBLE.md` | Technical source of truth (architecture, threat model, data model) |

## Development

```bash
npm test       # unit + component + flow tests (Vitest)
npm run lint   # ESLint (flat config + security plugin)
npm run build  # typecheck + build
```

CI (`.github/workflows/ci.yml`) runs the tests, lint, Semgrep, dependency audit,
and license check on every push.

## Scope (what DocNote deliberately is *not*)

Not a document editor · no accounts/server/cloud sync · `.docx` only · no
collaboration · desktop web only.

## License

[MIT](LICENSE) © 2026 Karl Raulerson
