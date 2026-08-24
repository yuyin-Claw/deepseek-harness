# Agent Note: perm-rules — deny permission rules on the tools/pre-execute waterfall

Status: implemented

English | [中文](2026-08-17-perm-rules-pre-execute-deny.zh.md)

## Problem

A deployment needs per-call deny rules in the spirit of Claude Code permissions: protect secrets from `write`/`read`, keep destructive shell one-liners out of `bash`. The harness already owns a policy pipeline — the `tools/pre-execute` waterfall with allow/deny/ask semantics that runs for every registry dispatch, nested and subagent calls included — but no rule table feeds it, and a model that hits a denial has no in-band way to learn which rule fired or to correct it.

## Decision

`@deepseek-ai/dsh-perm-rules` (`packages/guard/perm-rules`) enforces deny rules directly on the `tools/pre-execute` waterfall. The rule table is plugin-fiber memory seeded from validated config (empty `tool`/`pattern` throws at load). A model-visible `perm_rules` tool lists and edits the table at runtime; the deny reason quotes the rule's id, tool, pattern, and the exact removal call, so the model can correct a wrong rule in its next step. Runtime-added rules are intentionally unpersisted: config is the deployment's authority and a restart reseeds.

Matching runs over an identity text — tool name plus whitelisted string argument fields (`file_path`, `path`, `command`, `description`, `workdir`, `pattern`, `include`) — with `*` wildcards spanning any run including newlines. The whitelist excludes unbounded payloads (a `write` body) so a pattern's meaning cannot depend on megabyte arguments. The first matching rule decides; order is array order.

## Alternatives considered

- **A `tools.guard()` registration**: the registry reserves guards for identity protection, and the dynamic-package façade withholds them; re-exposing that surface adds a second deny path with no new semantics.
- **Persisted runtime rules**: forks authority between config and the session log; the self-correcting deny reason removes the practical need.
- **`allow` effects**: cannot be honored until an approval-policy integration consumes them; deferred rather than stubbed.

## Consequences

- A denial is observable as an ordinary `Error:` tool result with the rule quoted — no new session event, replay-safe.
- `repeat-tool-reminder`'s post-execute loop detection counts denied calls, so a model hammering a denied rule also receives the loop nudge.
- Tests drive the full registry pipeline (`ctx.tools.execute`): seed fail-loud, deny/narrow-match/recovery, management actions, and fiber disposal removing both the gate and the tool.
