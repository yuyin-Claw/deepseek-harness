/**
 * Browser half of the nightcity theme plugin: one token override layer over
 * whatever base theme is active (the skin is dark-only and scheme-invariant,
 * so it stays legible under both base palettes and is never touched by the
 * settings-scope adoption that governs selectable theme ids) plus the
 * decorative atmosphere entry in the frame-wide shell overlay.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the theme service Context merge (ctx.theme).
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
// Type-only: pulls ui-layout's 'shell.overlay' slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { NightcityHud } from './NightcityHud.tsx'
import { NIGHTCITY_TOKENS } from './tokens.ts'

/** Required services: the theme registry and the slot registry. */
export const inject = ['theme', 'slots']

/** Override-layer source identity (one layer per source). */
const OVERRIDE_SOURCE = 'ui-nightcity-theme'

/**
 * Client plugin body: stack the nightcity token layer and register the
 * atmosphere overlay.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.theme.overrideTokens(OVERRIDE_SOURCE, NIGHTCITY_TOKENS), 'ui-nightcity-theme: token override layer')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nightcity-hud',
    order: -100,
  }, NightcityHud))
}
