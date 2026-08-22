# Agent Note: side-workspace —— 右侧工作区面板的 host 服务

Status: implemented

[English](2026-08-17-side-workspace.md) | 中文

## 问题

The browser workspace panel needs a host half: an isolated side conversation and read-only workspace views. A session-validated dynamic prototype proved the behavior but cannot ship.

## 决策

`packages/side/side-workspace` provides `ctx.sideWorkspace` (`SideWorkspaceService`, default export). The side conversation is one forked continuable child (`subagents.startContinuable`, provider `fork`) of the current initiator or last root agent; followups deliver user-sourced messages to that child. Workspace views (`listDiffFiles`, `readFileDiff`, `listFiles`, `readFile`) ride the `shell`/`fs` seams in the `sandboxPolicy` workspace root, with caps (6000-char message clip, `diffMaxChars`, `maxFileChars`, `maxScanDirs`) and `..` traversal refusal. Every method is `@Remote`-decorated for the client API.

## 备选方案

- **Package-private RPC handlers** (the dynamic prototype's `harness.handle`): unavailable to source plugins; the Remote service face is the shipped equivalent.
- **A capability seam with providers**: the service only projects other packages' authoritative data (git, filesystem, child session log); there is nothing to provide.

## 后果

- The browser client package is deferred; this service is its complete host half and its API is the client's integration surface.
- Tests cover fork-shape, second-start refusal, message folding with clipping, pre-start emptiness, porcelain parsing, traversal refusal, and the listing's directory/extension filters over stub seams.
