# Agent Note: ui-side-workspace client panel

Status: implemented

English | [中文](2026-08-17-ui-side-workspace.zh.md)

## Problem

The host service `packages/side/side-workspace` exposes seven `@Remote` methods (`startConversation`, `sendFollowup`, `readConversation`, `listDiffFiles`, `readFileDiff`, `listFiles`, `readFile`) but the web client had no surface to use them: the side conversation, diff browsing, and file reading were reachable only through code, not the GUI.

## Decision

Add `packages/client/ui-side-workspace`, a pure-consumer browser plugin that registers one fixed right dock (420px, collapsible to a right-edge rail) into the `shell.overlay` slot with the list protocol (`{ name: 'shell.overlay', id: 'side-workspace', order: 100 }`) via `ctx.slots.inject`. The panel component receives all host access through the slot `inject` face calling `ctx.api.sideWorkspace`; chat polls `readConversation` every 2 seconds until the status leaves `running`; diff lines color by leading character (`+` green, `-` red, `@@` muted); the files tab filters `listFiles` client-side and renders `.md` as prose and everything else monospace with a truncation notice.

## Alternatives considered

- A modal dialog instead of a dock: rejected — the side workspace is meant to sit beside the main conversation, not cover it.
- Push-based conversation updates (event subscription) instead of polling: deferred — requires a new client-side event channel from the forked child session; the 2s poll is the smallest correct start.
- Registering the panel from a new dedicated slot instead of `shell.overlay`: rejected — the overlay slot is the established composition point for shell-level chrome.

## Consequences

The panel is presentational only: no service, no session-log writes, no model-visible input on the main thread. Host-side caps (message/diff/file clipping, scan budget) bound everything the panel can display. Web-app bundle rows (`cordis.patch.yml` + web-app `package.json` dependency) still need wiring before the panel boots in the assembled app.
