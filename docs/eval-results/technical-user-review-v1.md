# DocNote — Technical User (Non-Coder) Review — v1

**Reviewer persona:** Technically literate professional, non-programmer (15+ yrs IT ops / technical PM / sysadmin). Comfortable with terminals, config files, Git basics, and reading docs. Does not write code from scratch.

**What was reviewed:** The `docnote-walkthrough` project — a client-side `.docx` viewer with highlighting and notes — evaluated for whether a technically literate non-coder could **set it up, run it, use it, deploy it, and maintain it from the documentation alone.**

**Method:** Read-only. I read the files in the order a new user would hit them: I looked for a README first, then the user guide, then setup/config, then usage. No builds were run and no files were modified.

---

## Executive Summary (plain language)

DocNote is a genuinely nice little tool: you open a Word document in your browser, highlight bits in three colors, and stick short notes on them. Nothing gets uploaded, nothing gets changed in your file, and your notes come back next time. The problem is that **there is no front door.** If a friend handed me this folder, I would not know how to turn it into a working app, because there is no README and no "install this, then run this command" instructions anywhere a non-coder would look. The one genuinely excellent document — `USER_GUIDE.md` — tells you how to *use* DocNote once it is already open in a browser, but never tells you how to *get* it open. And right now the app isn't published to any website you could just visit, so today the only way to run it is to build it from source, which is a developer task. Great product, near-zero onboarding for a non-coder.

---

## "Can I Actually Use This?" — Honest Answers by Use Case

| I want to... | Can a non-coder do it from the docs? | Reality |
|---|---|---|
| **Understand what DocNote is** | Yes | `USER_GUIDE.md` and `FEATURES.md` explain it clearly in plain language. |
| **Use DocNote if someone gives me a link to it** | Yes, easily | The running app needs zero setup: open a file, highlight, note. This is the product's strength. |
| **Get DocNote running on my own computer** | **No, not from the docs** | No README, no install steps, no "run this command" that a non-coder could find and follow. |
| **Put DocNote on the internet so others can use it** | **No** | Deployment is an unfinished `TODO` stub; the only guidance is generic framework text that mostly describes tools (Vercel/Railway/Supabase) that don't fit this app. |
| **Change the colors, text, or branding** | **No** | All customization lives in source code. No config file, no theme, no admin panel. |
| **Maintain it over time** | Partially | The engineering discipline is excellent, but maintenance requires developer skills (Node, npm, TypeScript). |

**Bottom line:** You can *use* it in seconds if it's already running. You cannot *stand it up yourself* using the documentation as a non-coder.

---

## Phase 1 — Onboarding Experience, Step by Step

**Step 1 — I looked for a README. There isn't one.**
The single most important onboarding finding: **there is no `README.md` in the project root.** A search finds only `docs/archive/README.md` (an internal note about how the archive folder works) and one inside an `evaluation-prompts/` subfolder. For any technical person, the README is the front door — it is the first and often only file we open. Its absence means a new user lands in a folder of ~15 top-level Markdown files and dozens of `docs/` subfolders with no "start here." **This is a hard stop for the target audience.**

**Step 2 — I opened what looked like the user guide.** There are *two* "user guides," and they are easy to confuse:
- `USER_GUIDE.md` (project root) — the **real** DocNote guide. Excellent (see below).
- `docs/reference/user-guide.md` — this is **not** about DocNote at all. It is the 1,600-line user guide for the *Solo Orchestrator build framework* (the methodology used to build DocNote). A non-coder who opens this expecting product help will be badly lost within a paragraph. The naming collision is a real trap.

**Step 3 — I read `USER_GUIDE.md`. This is the high point.** It is clear, plain-language, and non-coder-friendly: how to open a file, how to highlight (with the keyboard alternative noted), how to add/edit/delete notes, how saving works, a privacy note, and a genuinely useful troubleshooting table mapping each error message to a plain-English cause. **But it opens with "Open DocNote in a desktop browser" — and never says where DocNote is or how to make it open.** There is no URL and no local run instruction. For a non-coder this is the gap between the whole guide being useful and being useless: it assumes the hardest step is already done.

**Step 4 — I tried to figure out how to run it.** `package.json` lists scripts (`dev`, `build`, `preview`), and `CONTRIBUTING.md` mentions `npm run lint`, `npm test`, `npm run build`. But:
- Nothing states the prerequisites (Node.js, npm, Git) for *this* app.
- Nothing translates `vite` / `npm run dev` into "this starts the app; then open the address it prints."
- `CONTRIBUTING.md` is written for developers contributing code, not for a user trying to run the thing.
A non-coder would not reliably assemble "install Node → clone → `npm install` → `npm run dev` → open the localhost link" from these scattered, developer-facing crumbs.

**Step 5 — I tried to understand the project structure. It is overwhelming.** The root is dominated by build-framework and process artifacts, not product files: `CLAUDE.md` (20 KB), `PROJECT_BIBLE.md` (26 KB), `PROJECT_INTAKE.md` (33 KB), `APPROVAL_LOG.md`, `BUGS.md`, `CHANGELOG.md`, `WALK-STATE.md`, `WALK-ISSUE-LOG.md`, `sbom.json` (480 KB), plus a `docs/` tree with ~14 subfolders. This is impressive engineering rigor, but for a non-coder looking for "how do I use this," the signal-to-noise ratio is very poor and there is no map pointing them to the two files they actually need (`USER_GUIDE.md`, `FEATURES.md`).

**Step 6 — Config files.** `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json` are all developer build config. None are user-facing settings, none are documented for a non-coder, and none would need touching for normal use — but there is also nothing a non-coder *could* safely change to customize the app.

**Net onboarding verdict:** A non-coder cannot get from "here is the project" to "the app is running" using the documentation alone. They would get stuck at Step 1 (no README) and, even if pointed to the guide, again at "where do I open it."

---

## Phase 2 — Usability Assessment (by category)

### 1. Documentation Quality
- **Experience:** Two tiers. The *product* docs a user actually needs (`USER_GUIDE.md`, `FEATURES.md`, `SECURITY.md`) are clear, honest, and well written. The surrounding *process* docs are voluminous and developer/governance-oriented.
- **Pain Points:** No README/entry point; no quickstart that gets you to a running app; the `docs/reference/user-guide.md` name collides with the real guide; `RELEASE_NOTES.md` is still an empty template with `[Version] — YYYY-MM-DD` placeholders.
- **What Works:** `USER_GUIDE.md` explains concepts without jargon and includes an error → meaning troubleshooting table. `SECURITY.md` is refreshingly honest (e.g., notes are stored *unencrypted* — don't annotate sensitive docs on a shared machine).
- **What is Missing:** A README; a "how to run it" quickstart; a plain-language version/release note.
- **Rating: 3/5** (5 for the end-user guide content; dragged down hard by no entry point and no setup path).

### 2. Setup and Installation
- **Experience:** I could not find setup instructions written for a non-coder anywhere.
- **Pain Points:** Prerequisites (Node.js, npm, Git) are never listed for this app. The run/build commands exist only in `package.json` and developer-facing `CONTRIBUTING.md`. No step-by-step, no platform notes (Windows/macOS/Linux), no "if this fails, do X."
- **What Works:** The commands themselves are standard (`npm install`, `npm run dev`, `npm run build`) — trivial *for a developer*.
- **What is Missing:** A basic "Prerequisites + Run Locally" section. Even five lines would move this from unusable to usable.
- **Rating: 1/5** for a non-coder (cannot set up from docs alone).

### 3. Day-to-Day Workflow
- **Experience:** *Once the app is open*, daily use is excellent and obvious: open a `.docx`, select text, pick a color, click a highlight to add a note, see notes in the side panel, click to jump.
- **Pain Points:** All of this is gated behind the un-documented "get it running" step.
- **What Works:** Autosave (no Save button), clear error banners, notes listed in document order, non-color-only jump emphasis (good for accessibility). Feedback during use is strong.
- **What is Missing:** Nothing at the usage layer — this is well designed.
- **Rating: 5/5** for the running app; N/A until you can launch it.

### 4. Configuration Complexity
- **Experience:** There is essentially nothing for a non-coder to configure — which is good (sensible defaults: 10 MB limit, three fixed colors, autosave) but also means zero customizability without code.
- **Pain Points:** All config files present are developer build config, not user settings.
- **What Works:** Strong "sensible defaults" posture; the user never has to configure anything to use it.
- **What is Missing:** Nothing needed for use; but no user-facing config exists at all.
- **Rating: 4/5** (defaults are great; the low config need is a feature here).

### 5. Learning Curve
- **Experience:** The app itself has almost no learning curve. The *setup* has a steep one because it's undocumented and currently requires building from source.
- **Pain Points:** The gap between "installed" and "running" is entirely unbridged for a non-coder.
- **What Works:** If handed a link, a non-coder is productive in under a minute.
- **What is Missing:** The bridge — a quickstart.
- **Rating: 2/5** (app trivial; getting to the app is not).

### 6. Error Handling and Recovery
- **Experience:** In-app error handling is a genuine strength.
- **Pain Points:** Setup-time errors (Node missing, wrong version, port in use) are undocumented — a non-coder hitting them has no guidance.
- **What Works:** Every runtime failure maps to a specific banner, and `USER_GUIDE.md` has a troubleshooting table for them. `BUGS.md` shows a rigorous, closed-loop bug process (31 tracked, SEV-1 fixed, etc.).
- **What is Missing:** A setup/build troubleshooting section.
- **Rating: 3/5** (excellent at runtime, absent at setup).

### 7. Personal Project Viability
- **Experience:** As a *personal tool to use*, it's compelling — private, no accounts, no server, does one thing well.
- **Pain Points:** To run it privately you must build it yourself today, which a non-coder can't do from the docs.
- **What Works:** Clear, narrow scope; strong privacy story; no ongoing cost.
- **What is Missing:** A hosted link or a copy-paste run recipe.
- **Rating: 3/5** (high value if you can launch it).

### 8. Enterprise / Team Viability
- **Experience:** The evidence trail (threat model, security audits, SBOM, CI, phase gates) is well beyond typical hobby-project quality — this would reassure an IT/security reviewer.
- **Pain Points:** No deployment story yet; a static internal host would need setting up by someone technical. Notes stored unencrypted in the browser is a documented limitation to flag for shared machines.
- **What Works:** `SECURITY.md`, the threat-model validation, and the SBOM make it explainable to a security team. "Nothing leaves the browser" is an easy story to get approved.
- **What is Missing:** A finished deployment path and release.
- **Rating: 3/5** (great governance artifacts; deployment/rollout unfinished).

### 9. Honesty and Expectation Setting
- **Experience:** Where docs exist, they are honest — limitations (unencrypted storage, no overlap highlights, desktop-only, `.docx`-only) are stated plainly.
- **Pain Points:** The docs *quietly overstate readiness by omission*: `USER_GUIDE.md` reads as if the app is ready to use, but there's no way to launch it and no live version. A user would only discover this after investing time.
- **What Works:** No feature is oversold; scope boundaries are explicit in `PRODUCT_MANIFESTO.md`.
- **What is Missing:** A clear "how to run/where to get it" statement, and a status note that it isn't released yet.
- **Rating: 3/5**.

### 10. Comparison to Alternatives
- **Experience:** vs. editing in Word (risk of changing the file) or keeping notes in a separate document, DocNote's "read-only + notes stay with the passage + nothing uploaded" is a real, understandable benefit.
- **Pain Points:** For a non-coder *today*, "just use Word comments" wins purely because Word is already installed and running; DocNote isn't runnable for them yet.
- **What Works:** The value proposition is clear and the complexity (for the user) is genuinely low.
- **What is Missing:** The one thing that would make it beat the alternative for a non-coder — a link you can click.
- **Rating: 3/5**.

### 11. Deployment Accessibility
- **Experience:** I looked for how to publish it. The release workflow's deploy step is literally `echo "TODO — deploy to hosting platform"`.
- **Pain Points:** No DocNote-specific deployment instructions. The generic `docs/platform-modules/web.md` describes Vercel/Railway/Supabase — Railway/Supabase are irrelevant to a static client-side app, and GitHub Pages (which `vite.config.ts` hints is the intended target) has no step-by-step. `RELEASE_NOTES.md` and `CHANGELOG.md` show the app is still `[Unreleased]` (Phase 3/4 not complete per `WALK-STATE.md`).
- **What Works:** It *is* a static site (Vite build → `dist/`), so it's inherently one of the easier things to deploy — once someone writes the four lines explaining how.
- **What is Missing:** A "Deploy to GitHub Pages/Netlify in 5 steps" section aimed at a non-coder.
- **Rating: 1/5** (deployment is an unfinished TODO for the non-coder).

### 12. Customization Without Coding
- **Experience:** None available.
- **Pain Points:** Colors, labels, size limits, and text are all in source; changing any requires editing TypeScript/CSS and rebuilding.
- **What Works:** Nothing to break, at least.
- **What is Missing:** Any config-file or env-var hooks for common tweaks.
- **Rating: 1/5** (100% of customization needs code changes).

---

## Time Investment Estimate (realistic, for a non-coder)

| Task | Time | Notes |
|---|---|---|
| Read the product docs (`USER_GUIDE`, `FEATURES`, `SECURITY`) | 15–25 min | Clear and short; the good part. |
| Figure out how to run it from the docs alone | **∞ (likely blocked)** | No README/quickstart; most non-coders stall here. |
| Run it locally *with outside help* (install Node, clone, `npm install`, `npm run dev`) | 30–90 min | Assumes someone tells you the steps; first-time Node install adds time. |
| Accomplish first real task (highlight + note a document) | **< 5 min** | Once running, it's genuinely fast. |
| Deploy it somewhere others can use | 1–3 hrs + external help | Undocumented; you're improvising GitHub Pages/Netlify. |
| Become comfortable maintaining it | Not realistic without dev skills | Node/npm/TypeScript required. |

---

## Prerequisites Checklist (including items the docs do NOT mention)

**To use a running instance:** just a modern desktop browser (Chrome/Firefox/Safari/Edge, latest two). *(Documented — good.)*

**To run it yourself (NONE of these are stated in accessible docs):**
- [ ] Git installed (to clone the repo) — *not documented for this app*
- [ ] Node.js installed (a current LTS) — *not documented*
- [ ] npm (comes with Node) — *not documented*
- [ ] Comfort with a terminal: `cd`, run commands, read output — *assumed, not stated*
- [ ] Knowing that `npm run dev` prints a `localhost` address you then open — *not stated*
- [ ] For Windows: a working Node/terminal setup — *no platform notes at all*

**To deploy it:**
- [ ] A static host account (GitHub Pages / Netlify / Vercel) — *not documented for DocNote*
- [ ] Knowing the build output is the `dist/` folder — *only inferable from config*

---

## What I Wish Existed

1. **A `README.md` at the root** — the single highest-impact fix. What it is, a screenshot, and a "Run it locally" block: `git clone …`, `npm install`, `npm run dev`, "then open the address it prints."
2. **A "Getting the app" section at the top of `USER_GUIDE.md`** — either a live link or the three run commands, so the guide isn't stranded assuming the app is already open.
3. **A non-coder deployment recipe** — "Deploy to GitHub Pages in 5 steps," since it's a static site and that's clearly the intended target.
4. **Rename or clearly label `docs/reference/user-guide.md`** — it's the *framework's* guide and collides with the real product guide.
5. **A one-line "start here" map** telling users the only files they need are `USER_GUIDE.md` and `FEATURES.md`, so the 15+ process docs don't drown them.
6. **A filled-in `RELEASE_NOTES.md`** with an honest status ("pre-release / build from source") instead of the empty template.
7. **A couple of user-facing settings** (or documented "these are fixed") so customization expectations are set.

---

## Deployment Options (rated by difficulty for a non-coder)

| Method | Difficulty for a non-coder | Reality |
|---|---|---|
| **Use a hosted link** | ★☆☆☆☆ (trivial) — *if it existed* | No live URL is provided today. This is what should exist. |
| **GitHub Pages** | ★★★☆☆ | It's a static app and config hints this is the target, but there is **no step-by-step** — you'd need outside help. |
| **Netlify / Vercel (drag-drop or Git connect)** | ★★★☆☆ | Feasible for a static build, but undocumented for DocNote; you'd be improvising. |
| **Run locally with `npm run dev`** | ★★★★☆ | Standard for a developer; a non-coder can't assemble the steps from these docs. |
| **The provided release pipeline** | ★★★★★ (blocked) | The deploy step is a literal `TODO` echo; not functional yet. |

---

## Overall Usability Rating: **2 / 5** (for the target audience: technically literate non-coder)

**Justification:** This splits sharply into two products. The *running application* is a 5/5 for a non-coder — clear, private, zero-setup, well-documented in `USER_GUIDE.md`, with genuinely thoughtful error handling. But the *project as delivered* is close to a 1/5 for onboarding: there is no README, no prerequisites, no run/build instructions a non-coder could find and follow, no deployment path (it's an unfinished `TODO`), and no live instance to visit. The excellent end-user guide is stranded because it assumes the single hardest step — getting the app open — is already solved. Averaging a superb usage experience against a near-absent onboarding/setup/deployment experience lands at **2/5**. The gap is almost entirely documentation, not product quality — which means a handful of pages (a README, a quickstart, a deployment recipe) would plausibly move this to a 4/5 with no code changes.

---

## Honest Recommendation

- **Who should use this:** People handed a *running* link — they'll love it. And developers/technical folks who are comfortable cloning a repo and running `npm run dev`.
- **Who should not (yet):** Non-coders trying to stand it up themselves from the documentation. Today that requires developer help or developer skills, and the docs don't bridge the gap.
- **Alternatives for a non-coder right now:** Word's own Comments/Highlight features (already installed, zero setup) achieve ~80% of the everyday benefit — DocNote's edge (never modifies the file, nothing uploaded, notes tied to the passage) is real but only pays off once someone provides a runnable/hosted version.
- **The fix is cheap:** This is a documentation-and-deployment gap, not a product gap. A README, a "run it" quickstart, and a GitHub Pages deploy recipe would transform the non-coder experience without touching a line of application code.

---

*Read-only review. No project files were modified. Review written to `docs/eval-results/technical-user-review-v1.md`.*
