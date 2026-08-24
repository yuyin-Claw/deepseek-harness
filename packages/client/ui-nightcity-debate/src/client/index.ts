/**
 * Browser half of the nightcity VS debate plugin: one conversation.view tab
 * rendering the live debate scoreboard. The host agent runs the debate with
 * subagent fan-out (pro / con / judge) and emits protocol round reports into
 * the transcript; this tab folds those markers into side cards, a round
 * list, and the verdict banner.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the conversation.view seat and the session standard kit,
// plus the locale Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { DebateView } from './DebateView.tsx'
import { en, zh, type NightcityDebateKey } from './locales.ts'

/** Locale namespace owning the VS debate copy. */
export const NIGHTCITY_DEBATE_NS = 'nightcity-debate'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The nightcity VS debate copy. */
    'nightcity-debate': NightcityDebateKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the debate dictionaries and view tab.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NIGHTCITY_DEBATE_NS, { zh, en }), 'ui-nightcity-debate: view dictionaries')
  const t = ctx.locale.bind(NIGHTCITY_DEBATE_NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'nightcity-debate',
    order: 6,
    locale: NIGHTCITY_DEBATE_NS,
    label: () => t('view.debate'),
  }, DebateView))
}
