/**
 * Browser half of the nightcity theme plugin: one stylesheet over the base
 * palette — the light overrides on `:root`, the dark overrides behind the
 * same `body[data-ds-dark-theme]` attribute the base palette uses, so the
 * Appearance switch and any attribute-level activation flip the skin with
 * the ordinary CSS cascade (no inline variables that could pin one scheme).
 * The decorative atmosphere entry rides the shell overlay.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls ui-layout's 'shell.overlay' slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { NightcityHud } from './NightcityHud.tsx'
import { NIGHTCITY_TOKENS } from './tokens.ts'
import { nightcityStylesheet } from './stylesheet.ts'

/** Required service: the slot registry (the skin itself is plain CSS). */
export const inject = ['slots']

/** Style element id — one sheet per document, replaced on re-registration. */
const STYLE_ELEMENT_ID = 'nightcity-theme-override'

/**
 * Client plugin body: install the override stylesheet and register the
 * atmosphere overlay.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const sheet = document.createElement('style')
    sheet.id = STYLE_ELEMENT_ID
    sheet.textContent = nightcityStylesheet(NIGHTCITY_TOKENS)
    document.head.append(sheet)
    return () => { sheet.remove() }
  }, 'ui-nightcity-theme: override stylesheet')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nightcity-hud',
    order: -100,
  }, NightcityHud))
}
