# Security Policy — DocNote

## Supported versions

DocNote is a personal-scale, client-side tool. Security fixes are applied to the
latest release only.

| Version | Supported |
|---|---|
| 1.0.x (latest) | ✅ |
| < 1.0 | ❌ |

## Reporting a vulnerability

Please report suspected vulnerabilities privately — **do not open a public
issue**.

- **Email:** kraulerson@gmail.com (subject line: `DocNote security`)
- **Expected response:** acknowledgement within 48 hours; initial assessment
  within 7 days.

**Safe harbor:** good-faith security research on your own copy of DocNote —
testing crafted `.docx` files, tampered `localStorage`, etc. — will not result
in legal action. Do not test against other people's data.

## Security model (what to know before reporting)

DocNote runs entirely in the browser. There is no server, no account, and no
network transmission of your documents or annotations.

- **Documents are never uploaded.** A `.docx` is parsed client-side and held in
  memory only; the original file is never modified.
- **Untrusted document content is sanitized.** Converter output passes through a
  single DOMPurify choke point before it touches the DOM; note text is rendered
  as text, never HTML.
- **Annotations are stored locally and unencrypted.** Highlights and notes
  (including short excerpts of the highlighted passage) live in your browser's
  `localStorage`, keyed by a content hash of the document. Anyone with access to
  your browser profile can read them. This is a **known, accepted limitation**
  for a personal tool (threat TM-005) — do not annotate highly sensitive
  documents on a shared machine.
- **No network at runtime.** A Content-Security-Policy (`connect-src 'none'`) and
  a lint rule that bans network APIs enforce this.

See `PROJECT_BIBLE.md` §4 for the full threat model and
`docs/test-results/2026-08-02_threat-model-validation.md` for the validation of
each threat vector.
