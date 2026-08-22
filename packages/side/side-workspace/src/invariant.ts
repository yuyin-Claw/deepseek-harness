/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-side-workspace`.
 * @module @deepseek-ai/dsh-side-workspace/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-side-workspace'

/** Cordis companion plugin name. */
export const name = 'side-workspace-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the service holds private conversation state and its
 * read-only views project other packages' authoritative data (git, filesystem,
 * the child session log), so there is no package-owned event or snapshot an
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
