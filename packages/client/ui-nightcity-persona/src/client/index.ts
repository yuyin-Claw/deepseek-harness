/**
 * Browser half of the nightcity persona plugin: an always-on persona plate
 * in the composer dock. The plate shows the persona whose turn it is — the
 * netrunner while the user types (plain phase), the operator while a
 * submission is in flight (adjudicating/claimed/submitting). Portraits are
 * original SVG placeholders standing in for user-supplied CG artwork.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the input seats and the session standard kit, plus the
// locale Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { PersonaPlate } from './PersonaPlate.tsx'
import { en, zh, type NightcityPersonaKey } from './locales.ts'

/** Locale namespace owning the persona plate copy. */
export const NIGHTCITY_PERSONA_NS = 'nightcity-persona'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The nightcity persona plate copy. */
    'nightcity-persona': NightcityPersonaKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the persona dictionaries and the plate entry.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NIGHTCITY_PERSONA_NS, { zh, en }), 'ui-nightcity-persona: plate dictionaries')
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'nightcity-persona',
    order: -100,
    locale: NIGHTCITY_PERSONA_NS,
  }, PersonaPlate))
}
