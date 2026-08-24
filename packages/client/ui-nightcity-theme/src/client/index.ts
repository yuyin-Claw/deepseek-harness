/**
 * Browser half of the nightcity theme plugin: one stylesheet over the base
 * palette — the light overrides on `:root`, the dark overrides behind the
 * same `body[data-ds-dark-theme]` attribute the base palette uses, so the
 * Appearance switch and any attribute-level activation flip the skin with
 * the ordinary CSS cascade (no inline variables that could pin one scheme).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { NIGHTCITY_TOKENS } from './tokens.ts'
import { nightcityStylesheet } from './stylesheet.ts'

/** No service dependencies: the skin is plain CSS, applied in an effect. */
export const inject: string[] = []

/** Style element id — one sheet per document, replaced on re-registration. */
const STYLE_ELEMENT_ID = 'nightcity-theme-override'

/**
 * Client plugin body: install the override stylesheet.
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
}
