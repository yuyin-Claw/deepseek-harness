/**
 * Type declarations for `@deepseek-ai/dsh-perm-rules`. Types only — no runtime code.
 * @module @deepseek-ai/dsh-perm-rules/types
 */

/** One configured deny rule as it appears in `Config.rules` and in `perm_rules` listings. */
export interface PermRule {
  /** Tool name the rule targets, or `*` for every tool. */
  readonly tool: string
  /** `*`-wildcard pattern matched against the call's identity text (tool name + whitelisted argument fields). */
  readonly pattern: string
}

/** The rule-table view the `perm_rules` tool returns: a live rule plus its stable id. */
export interface PermRuleView {
  /** Stable id within one plugin activation; quoted by deny messages and accepted by `perm_rules remove`. */
  readonly id: number
  readonly tool: string
  readonly pattern: string
}

/** Canonical value of the `perm_rules` tool. */
export interface PermRulesValue {
  /** The action that ran, or `error` when execute failed. */
  readonly action: string
  /** Whether the action reached its intended effect. */
  readonly ok: boolean
  /** One-line human-readable account of the action. */
  readonly out: string
  /** The full rule table after the action. */
  readonly rules: readonly PermRuleView[]
}
