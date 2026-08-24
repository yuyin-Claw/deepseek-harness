# @deepseek-ai/dsh-perm-rules

English | [中文](README.zh.md)

Pre-execution permission rules: deny rules enforced on the `tools/pre-execute` waterfall before any tool body runs. A deployment seeds the initial table from config; the model-visible `perm_rules` tool lists and edits it at runtime, so a denial is self-explaining and self-correctable without a restart. A denied call never reaches the tool body — the registry materializes the rule's rejection text as the call's `Error: <reason>` result. Decision record: [the perm-rules Agent Note](../../../.agents/notes/implemented/feature/2026-08-17-perm-rules-pre-execute-deny.md).

## Config

```yaml
- id: perm-rules
  name: '@deepseek-ai/dsh-perm-rules'
  config:
    rules:                       # default: none
      - tool: bash
        pattern: 'bash *git push*'
      - tool: write
        pattern: 'write file_path=*secrets*'
```

Seed validation fails loud at plugin load: an empty `tool` or `pattern` throws, never a silent fall-back.

## Matching semantics

A pattern is a `*`-wildcard over the call's **identity text**: the tool name followed by whitelisted string argument fields as `key=value` pairs (`file_path`, `path`, `command`, `description`, `workdir`, `pattern`, `include`). `*` spans any run of characters including newlines; every other character matches literally. The tool name leads, so a bare `read` pattern denies every `read` call while `read file_path=*secret*` denies only matching targets. The whitelist deliberately excludes unbounded payloads (e.g. a `write` body) so matching stays deterministic and cheap.

The first matching rule decides; later rules are unreachable for that call. The deny reason quotes the rule's id, tool, and pattern plus the exact `perm_rules` removal call, so the model can correct a wrong rule in the next step.

## The `perm_rules` tool

| action | parameters | effect |
|---|---|---|
| `list` | — | the full table with stable ids |
| `add` | `tool` (default `*`), `pattern` (default: the tool name — every call of that tool) | append one deny rule |
| `remove` | `id` | remove exactly that rule; unknown id reports failure |
| `clear` | — | drop every rule |

Rules live in plugin-fiber memory: a restart reseeds from config, and session resume does not restore runtime-added rules. The tool is not concurrency-safe (table mutation) and declares so.

## Model Experience

### Tool schema

#### What the model sees

One `perm_rules` tool (action/tool/pattern/id parameters) with a description that states the wildcard semantics and gives the three canonical examples (`"bash *rm -rf*"`, `"write file_path=*secrets*"`, `"read"`).

##### Token and KV-cache effect

The schema adds a few hundred tokens to the tool listing on every request while enabled; it changes nothing about prior turns, so the KV cache prefix stays valid across rule changes — only the listing segment shifts. Disable the plugin to remove the schema entirely. A deny result is one short text block; a rule listing is one line per rule.

## Known Limitations and Deferred Work

- Rules are deny-only; `allow` short-circuits that skip the approval service are deferred until an approval-policy integration exists that can honor them.
- Identity-text matching quotes only whitelisted argument fields; a rule that needs another field's value must wait for that field to join the whitelist.
