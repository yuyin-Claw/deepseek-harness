/**
 * Pre-execute permission-rule guard: deny rules enforced on the `tools/pre-execute`
 * waterfall, seeded from deployment config and managed at runtime through the
 * model-visible `perm_rules` tool. A denied call never reaches the tool body; the
 * registry materializes the deny as an `Error: <reason>` tool result. Configuration
 * and matching semantics live in the package README; rationale lives in the
 * perm-rules Agent Note.
 * @module @deepseek-ai/dsh-perm-rules
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import type { PermRule, PermRuleView, PermRulesValue } from './types.ts'

export type { PermRule, PermRuleView, PermRulesValue } from './types.ts'

export const name = 'perm-rules'
export const inject = ['tools']

/**
 * Plugin config, validated by the same-named schemastery schema plus the
 * load-time checks in `apply` (misconfiguration fails loud: an empty `tool`
 * or `pattern` string throws at plugin load, never a silent fall-back). The
 * seeded rules form the initial runtime table; the `perm_rules` tool may add
 * or remove rules afterward.
 */
export interface Config {
  /** Deny rules active at load. Defaults to none. */
  readonly rules?: PermRule[]
}

export const Config: z<Config> = z.object({
  rules: z.array(z.object({
    tool: z.string().required(),
    pattern: z.string().required(),
  })).default([]),
})

/**
 * Argument fields the match text quotes, in a fixed order. The whitelist keeps
 * matching deterministic and cheap: only fields that identify the call's target
 * (a path, a command, a workdir) participate, never unbounded payloads like a
 * `write` body.
 */
const MATCHED_ARGUMENT_FIELDS = [
  'file_path', 'path', 'command', 'description', 'workdir', 'pattern', 'include',
] as const

/** One live deny rule: its configured text plus the compiled matcher and stable id. */
interface CompiledRule extends PermRuleView {
  /** Anchored RegExp compiled from `pattern`; `*` spans any run including newlines. */
  readonly matcher: RegExp
}

/**
 * Compile one `*`-wildcard pattern to a start-anchored RegExp (prefix semantics:
 * the pattern must match the identity text from its first character, but may
 * stop before its end, so a bare `read` denies every `read` call while
 * `read file_path=*secret*` denies only matching targets). Every other regex
 * metacharacter matches literally; `*` becomes `[\s\S]*` so multi-line
 * commands stay matchable.
 * @param pattern - the configured wildcard pattern.
 * @returns the start-anchored RegExp for {@link CompiledRule.matcher}.
 */
function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, String.raw`\$&`)
  return new RegExp(`^${escaped.replaceAll('*', '[\\s\\S]*')}`)
}

/**
 * Identity text one call is matched against: the tool name followed by each
 * whitelisted argument field present on the call, as `key=value` pairs. The
 * tool name leads so a bare `read` pattern denies every `read` call while
 * `read file_path=*secret*` denies only matching targets.
 * @param exec - the call about to dispatch.
 * @returns the match text.
 */
function identityText(exec: ToolExecution): string {
  const args = exec.arguments
  const parts: string[] = [exec.name]
  if (args !== null && typeof args === 'object') {
    const record = args as Record<string, unknown>
    for (const field of MATCHED_ARGUMENT_FIELDS) {
      const value = record[field]
      if (typeof value === 'string') parts.push(`${field}=${value}`)
    }
  }
  return parts.join(' ')
}

/**
 * Validate one configured rule per the fail-loud contract and compile it.
 * @param rule - the configured rule text.
 * @param id - the stable id to assign.
 * @returns the compiled rule.
 * @throws when `tool` or `pattern` is empty.
 */
function compileRule(rule: PermRule, id: number): CompiledRule {
  if (rule.tool.length === 0) {
    throw new Error(`perm-rules: rule #${id} has an empty \`tool\``)
  }
  if (rule.pattern.length === 0) {
    throw new Error(`perm-rules: rule #${id} has an empty \`pattern\``)
  }
  return { id, tool: rule.tool, pattern: rule.pattern, matcher: wildcardToRegExp(rule.pattern) }
}

/**
 * Register the `tools/pre-execute` deny gate and the `perm_rules` management
 * tool. Both registrations belong to the plugin fiber and are removed with it.
 * @param ctx - plugin context carrying the tool registry.
 * @param config - validated {@link Config}; seed rules are re-checked fail-loud here.
 */
export function apply(ctx: Context, config: Config): void {
  const rules: CompiledRule[] = []
  let nextId = 1
  for (const rule of config.rules ?? []) {
    rules.push(compileRule(rule, nextId))
    nextId += 1
  }

  /** The listing the tool returns: rule text without the compiled matcher. */
  function viewRules(): PermRuleView[] {
    return rules.map(({ id, tool, pattern }) => ({ id, tool, pattern }))
  }

  /** First rule whose matcher accepts the call's identity text, or undefined. */
  function firstHit(exec: ToolExecution): CompiledRule | undefined {
    const text = identityText(exec)
    return rules.find(rule => rule.matcher.test(text))
  }

  ctx.on('tools/pre-execute', (exec: ToolExecution, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> => {
    const hit = firstHit(exec)
    if (hit === undefined) return next()
    return Promise.resolve({
      kind: 'deny',
      reason: 'permission rule denied this call: '
        + `#${hit.id} (${hit.tool} :: ${hit.pattern}). `
        + `Remove it with perm_rules {"action":"remove","id":${hit.id}} if this call should proceed.`,
    })
  })

  ctx.tools.register(defineTool({
    name: 'perm_rules',
    description: 'Fine-grained permission rules: deny rules enforced on the '
      + 'tools/pre-execute gate. A denied call is rejected before execution. '
      + '`pattern` is a `*`-wildcard matched against the call\'s identity text '
      + '(tool name plus key argument fields), e.g. "bash *rm -rf*", '
      + '"write file_path=*secrets*", "read". Actions: list / add / remove / clear.',
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['list', 'add', 'remove', 'clear'],
        description: 'The management action to run.',
      },
      tool: {
        type: 'string',
        description: 'add: target tool name, or * for every tool. Defaults to *.',
      },
      pattern: {
        type: 'string',
        description: 'add: wildcard pattern for the identity text. Defaults to every call of `tool`.',
      },
      id: {
        type: 'number',
        description: 'remove: the rule id quoted by the deny message.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string' },
          ok: { type: 'boolean' },
          out: { type: 'string' },
          rules: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'number' },
                tool: { type: 'string' },
                pattern: { type: 'string' },
              },
            },
          },
        },
      },
      render: (_args, raw) => {
        const value = raw as PermRulesValue
        return [{
          type: 'text',
          text: [`perm_rules ${value.action} ${value.ok ? '✓' : '✗'}: ${value.out}`]
            .concat(value.rules.map(rule => `#${rule.id} [deny] ${rule.tool} :: ${rule.pattern}`))
            .join('\n'),
        }]
      },
    },
    execute(args) {
      const action = args.action
      if (action === 'list') {
        const value = { action, ok: true, out: `${rules.length} rule(s)`, rules: viewRules() }
        return Promise.resolve(value)
      }
      if (action === 'add') {
        const tool = typeof args.tool === 'string' && args.tool.length > 0 ? args.tool : '*'
        // Prefix semantics make a bare tool name cover every call of that tool.
        const fallbackPattern = tool === '*' ? '*' : tool
        const pattern = typeof args.pattern === 'string' && args.pattern.length > 0 ? args.pattern : fallbackPattern
        const rule = compileRule({ tool, pattern }, nextId)
        nextId += 1
        rules.push(rule)
        const value = { action, ok: true, out: `added deny rule #${rule.id}: ${pattern}`, rules: viewRules() }
        return Promise.resolve(value)
      }
      if (action === 'remove') {
        const id = args.id
        const index = rules.findIndex(rule => rule.id === id)
        if (index < 0) {
          const value = { action, ok: false, out: `no rule #${String(id)}`, rules: viewRules() }
          return Promise.resolve(value)
        }
        rules.splice(index, 1)
        const value = { action, ok: true, out: `removed rule #${String(id)}`, rules: viewRules() }
        return Promise.resolve(value)
      }
      // `clear` and the schema-exhaustive remainder: the enum admits exactly
      // these four actions, so `clear` is the only remaining value.
      const removed = rules.length
      rules.length = 0
      const value = { action: 'clear', ok: true, out: `cleared ${removed} rule(s)`, rules: viewRules() }
      return Promise.resolve(value)
    },
    presentCall: args => ({ card: 'generic', title: 'Manage permission rules', kind: 'other', rawInput: args }),
  }))
}
