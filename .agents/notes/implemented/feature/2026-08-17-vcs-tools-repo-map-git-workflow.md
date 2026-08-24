# Agent Note: vcs tools — repo_map and git_workflow as a first-class package

Status: implemented

English | [中文](2026-08-17-vcs-tools-repo-map-git-workflow.zh.md)

## Problem

Session-validated dynamic prototypes proved two model-facing workflows — a repository map consulted before grep/read, and an Aider-style git loop (status / diff / commit / rollback). Dynamic packages cannot ship: they die with the process, carry no Config validation, no tests, and no documentation. The tools need a formal home, and no existing family owns VCS concerns.

## Decision

New family `packages/vcs/` with one package, `@deepseek-ai/dsh-tool-vcs` (`tool-vcs`), mirroring the `web/` family's capability-to-tool split collapsed into a single tool package (no new service seam: both tools consume the existing `ctx.fs`, `ctx.shell`, and `ctx.sandboxPolicy` seams, so a separate Service Definition would have exactly one consumer and no providers).

- `repo_map`: bounded recursive scan over `ctx.fs.listDir` (VCS metadata, `node_modules`, and build-output directories skipped), per-file exported-symbol extraction by fixed line regexes, and `git status` markers over `ctx.shell`. Model parameters `subdir` / `focus` / `max_files`; deployment caps `maxFiles` (default 120) and `maxScanDirs` (default 5000).
- `git_workflow`: `status` / `diff` / `commit` / `rollback` over `ctx.shell` in the per-call workspace root (session cwd, else `sandboxPolicy.resolve().workspaceRoot`). `commit` stages everything then commits with a required message; `rollback` is `git reset --hard HEAD`. Output capped by `diffMaxChars` (default 50,000) with a truncation notice.

Shell words are single-quoted (`'\''` escaping) so commit messages cannot expand in the command line.

## Alternatives considered

- **A `vcs` capability seam (Service Definition + providers)**: both tools are the only consumers and the filesystem/shell seams already own the underlying access; a seam would add roles nothing else uses.
- **Spilling oversized listings to a file** (the dynamic prototype's behavior): the package truncates at `max_files` with an inline notice instead, keeping the tool free of side effects.
- **Modification-time ordering** (the dynamic prototype's behavior): the filesystem seam's version token is opaque to consumers, so listings are in path order (recorded as a Known Limitation).

## Consequences

- Tool descriptions are English, consistent with the shipped tool packages; the dynamic prototypes' Chinese texts are not pinned.
- `tsconfig.base.json`'s `@deepseek-ai/dsh-*` wildcard paths list gains `packages/vcs/*/src` (and the `/invariant.ts` companion list), which is what makes the package resolvable on the source plane.
- Tests mount the real registry, `dsh-fs-local`, `dsh-subprocess-local`, `dsh-bash-local`, and `dsh-sandbox-policy` against a throwaway `git init` fixture under the OS temp dir (macOS/Linux replayable, no dependency on any checkout of this repository), including fiber-dispose removal and fail-loud Config validation.
