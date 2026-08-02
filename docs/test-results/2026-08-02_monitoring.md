# Monitoring Configuration — DocNote v1.0.0 (Phase 4, monitoring_configured)

**Date:** 2026-08-02 | **App type:** static, client-side, no server, no telemetry.

## What monitoring means for this app

DocNote has **no backend, no database, no accounts, and (by privacy design) no
telemetry or analytics** — nothing leaves the user's browser. The enterprise
monitoring stack from the web module (Sentry error tracking, PostHog analytics)
is intentionally **NOT** used: it would require network calls that the app's CSP
(`connect-src 'none'`) and privacy policy forbid.

So runtime monitoring reduces to two things:

| Signal | Mechanism |
|---|---|
| Client-side crashes | The React **ErrorBoundary** (BUG-11) shows a recovery UI instead of a blank page; the error name is logged to the browser console (no content). There is no server to receive it — this is the deliberate trade-off of a zero-telemetry tool. |
| Site availability | Optional free **UptimeRobot** HTTP(s) monitor on https://kraulerson.github.io/docnote-walkthrough/ at a 5-minute interval. (Account creation is a manual, browser-based step for the Orchestrator; recommended, not blocking for a personal tool.) |

## Deploy monitoring

Release/deploy health is monitored via **GitHub Actions**: the release
workflow's success/failure is visible in the Actions tab and via
`gh run list --workflow=release.yml`. A failed deploy does not affect the
currently-live immutable Pages deployment.

**Status:** Configured to the extent meaningful for a static no-telemetry app.
Runtime error telemetry is deliberately omitted (privacy + no-network design);
availability monitoring via UptimeRobot is recommended as an optional
Orchestrator follow-up.
