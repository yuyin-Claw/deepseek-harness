# dsh-client-ui-side-workspace

English | [中文](README.zh.md)

Right-dock side workspace panel for the dsh web client: a fixed 420px dock on the right edge with three tabs — the forked side conversation, per-file diffs, and read-only file browsing. The dock collapses to a vertical rail on the right edge.

## What it registers

The browser plugin registers one component into the `shell.overlay` slot (`id: 'side-workspace'`, `order: 100`) via `ctx.slots.inject`. All host access goes through the seven remote methods of `ctx.api.sideWorkspace` served by `@deepseek-ai/dsh-side-workspace`:

- 对话 (chat): bubble transcript plus composer. Enter starts the conversation (`startConversation`) or sends a followup (`sendFollowup`), then polls `readConversation` every 2 seconds until the status leaves `running`.
- Diff: changed-file list with porcelain status codes (`listDiffFiles`); clicking a file renders its diff (`readFileDiff`) with additions in green, deletions in red, and `@@` hunk headers muted; back and refresh actions included.
- 文件 (files): search-filtered listing (`listFiles`) and read-only content view (`readFile`) — prose rendering for `.md`, monospace otherwise, with a truncation notice.

## Model Experience

No model impact. The panel adds no model-visible input to the main conversation and changes no prompt, tool, or token accounting there. The side conversation itself runs in a forked child session owned by the host service; its model usage is that child's own and is fully captured by the host service, not by this UI package.

## Known Limitations and Deferred Work

- Web-app composition rows (`packages/bundle/web-app/cordis.patch.yml` and its `package.json` dependency) are not wired here; the aggregate `tsconfig.client.json` reference is.
- Conversation polling is a fixed 2-second interval; no push-based updates yet.
- The dock width (420px) and tab order are constants, not configuration.

## Development

```sh
pnpm --filter @deepseek-ai/dsh-client-ui-side-workspace bundle   # rebuild lib/client.js
pnpm run test -- packages/client/ui-side-workspace               # package tests
```
