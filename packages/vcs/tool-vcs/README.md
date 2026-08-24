# @deepseek-ai/dsh-tool-vcs

English | [中文](README.zh.md)

The model-facing VCS tool suite — `repo_map` and `git_workflow` — over the [filesystem](../../fs/fs/README.md) (`ctx.fs`) and [shell](../../shell/shell/README.md) (`ctx.shell`) capability seams, with the workspace root resolved per call from the session cwd or the [sandbox policy](../../sandbox/sandbox-policy/README.md) fallback. It owns model-facing concerns only: tool names, JSON schemas, argument validation, scan and output caps, git status markers, and output formatting. All file reads go through `ctx.fs`; every git command goes through `ctx.shell` (`git` on the resolved workspace root); this package never touches the filesystem or spawns processes directly.

Each tool is registered independently; a product that wants only one disables the other via config (`{ repoMap: false }` / `{ gitWorkflow: false }`).

## Tools

| Tool | Args | Behavior |
|---|---|---|
| `repo_map` | `subdir?`, `focus?`, `max_files?` | Bounded recursive scan of the workspace source tree (VCS metadata, `node_modules`, and build-output directories are skipped). Lists source files with their exported/top-level symbols and `git status --porcelain` markers (`[M]`, `[??]`, …). `focus` keeps only files whose path or a symbol contains the substring; `max_files` bounds the listing; the walk stops after `maxScanDirs` directories. Read-only. |
| `git_workflow` | `action` (required: `status` / `diff` / `commit` / `rollback`), `message?`, `file?` | `status` prints `git status`; `diff` prints the full diff (optionally one `file`); `commit` stages everything (`git add -A`) and commits with the required `message`; `rollback` runs `git reset --hard HEAD`, discarding every uncommitted tracked modification (dangerous; untracked files survive). |

Both tools attach the configured cooperative timeout budget (`timeoutMs`) as `ToolDefinition.timeoutMs` for `@deepseek-ai/dsh-tool-call-timeout-policy` and forward `exec.signal` to every git command. `repo_map` is read-only and opts into concurrent scheduling; `git_workflow` mutates the work tree and does not.

## Config

| Key | Default | Meaning |
|---|---|---|
| `repoMap` | `true` | Register `repo_map`. |
| `gitWorkflow` | `true` | Register `git_workflow`. |
| `maxFiles` | `120` | Upper bound on files listed by one `repo_map` call (the model can lower it per call via `max_files`). |
| `maxScanDirs` | `5000` | Upper bound on directories visited by one `repo_map` scan. |
| `diffMaxChars` | `50000` | Cap on one complete `git_workflow` output value and rendered text (header and truncation notice included). |
| `timeoutMs` | `30000` | Cooperative tool-call timeout budget (ms) for both tools and each git command. |

Every count/character/timeout cap must be a positive integer; an invalid value fails plugin load loudly.

```yaml
- id: tool-vcs
  name: '@deepseek-ai/dsh-tool-vcs'
```

## Model Experience

### System prompt

#### What the model sees

This package registers no system-prompt sections; each tool carries its guidance in the schema `description` the model sees with the tool definition.

#### Token effect

`repo_map` output is bounded by `max_files` (default 120 files, one line each with up to 8 symbols), so one call costs a bounded number of tokens that scales with the configured cap, not the repository size. `git_workflow` output is bounded by `diffMaxChars`; a `diff` of a large change is cut with a truncation notice directing the model to narrow the query (e.g. diff one file).

#### KV Cache effect

Both tools are read paths invoked on demand; neither changes the system prompt or its own schema between calls, so tool use does not invalidate the KV cache prefix. Changing `repoMap`/`gitWorkflow` enablement, `maxFiles` (it appears in the `max_files` schema description), or plugin lifecycle changes the visible schemas and may invalidate reuse from the first changed section.

## Known Limitations and Deferred Work

- `repo_map` lists files in path order; the filesystem seam's version token is opaque, so modification-time ordering is not available to this consumer.
- `rollback` (`git reset --hard HEAD`) does not remove untracked files; a future `clean` action would need its own safety story.
- Symbol extraction is a fixed per-language line-regex approximation over the first 400 lines, not a parser; files over 512,000 characters are listed without symbols.
