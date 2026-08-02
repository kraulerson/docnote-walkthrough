# Privacy Policy — DocNote

_Last updated: 2026-08-02_

> **Note on review status:** This is a personal open-source project. This policy
> was drafted with AI assistance and self-reviewed by the author; it has **not**
> been reviewed by an attorney. Per the Solo Orchestrator framework's legal
> notices, AI-generated legal documents should be reviewed by qualified counsel
> before any commercial or organizational deployment. It is published here to
> accurately describe DocNote's (minimal) data practices for a personal tool.

## The short version

DocNote does not collect, transmit, sell, or share any of your data. Everything
happens in your own browser, on your own device.

## What DocNote does with your data

- **Your documents.** When you open a `.docx`, it is read and rendered entirely
  inside your browser. It is **never uploaded** to any server and is **never
  modified**. It is held in memory only while open and discarded when you close
  or open another file. DocNote never stores your document.
- **Your highlights and notes.** These are saved in your browser's local storage
  (`localStorage`) on your device, keyed by a content hash of the document so
  they can be restored when you reopen the same document. They **never leave your
  device**.
- **No accounts.** DocNote has no login, no user profiles, and no identifiers.
- **No network transmission.** DocNote makes no network requests with your
  content at runtime. A Content-Security-Policy (`connect-src 'none'`) enforces
  this.
- **No analytics, no telemetry, no cookies, no tracking.**

## Storage and security

Your highlights and notes (including short excerpts of the passages you
highlight) are stored **unencrypted** in your browser profile. Anyone with access
to your browser profile on your device could read them. Do not annotate highly
sensitive documents on a shared or public computer. See `SECURITY.md`.

You can delete your annotations at any time by removing them in the app or by
clearing your browser's site data for DocNote.

## Children's privacy

DocNote collects no personal information from anyone, including children.

## Changes

Any changes to this policy will be published in this file with an updated date.

## Contact

kraulerson@gmail.com
