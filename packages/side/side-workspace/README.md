# @deepseek-ai/dsh-side-workspace

English | [中文](README.zh.md)

Host service `ctx.sideWorkspace` for the browser workspace panel: one forked continuable side conversation (isolated from the main thread by living in the forked child session) plus read-only workspace views — changed files with porcelain status, per-file diffs against HEAD, and a readable-file listing with content preview. All filesystem and git access rides the `fs`/`shell` seams in the workspace root from `sandboxPolicy`. Every method is `@Remote`-decorated for the client API.

## Model Experience

None: the panel and this service are user-facing only; nothing reaches a model request, so there is no token or KV-cache effect.

## Known Limitations and Deferred Work

- The browser client package that renders the panel is deferred; this service is its complete host half.
- One side conversation per service instance; a second requires a fresh activation.
