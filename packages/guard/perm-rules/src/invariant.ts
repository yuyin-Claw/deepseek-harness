/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-perm-rules`.
 * @module @deepseek-ai/dsh-perm-rules/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-perm-rules'

/** Cordis companion plugin name. */
export const name = 'perm-rules-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the rule table is private in-memory plugin state and the deny decision rides
 * the registry's own `tool/result` events, so the package owns no separate event or snapshot an
 * independent companion could cross-check.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
