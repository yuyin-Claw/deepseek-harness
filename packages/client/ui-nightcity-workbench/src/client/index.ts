/**
 * Browser half of the nightcity workbench plugin: one conversation.view tab
 * whose central pane auto-switches with the live turn (conversation /
 * execution / trajectory). The tab is additive — the shipped Chat and
 * Trajectory views are untouched, and uninstalling removes only this tab.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the conversation.view seat and the session standard kit,
// plus the locale Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { WorkbenchView } from './WorkbenchView.tsx'
import { en, zh, type NightcityWorkbenchKey } from './locales.ts'

/** Locale namespace owning the workbench copy. */
export const NIGHTCITY_WORKBENCH_NS = 'nightcity-workbench'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The nightcity workbench copy. */
    'nightcity-workbench': NightcityWorkbenchKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the workbench dictionaries and view tab.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NIGHTCITY_WORKBENCH_NS, { zh, en }), 'ui-nightcity-workbench: view dictionaries')
  const t = ctx.locale.bind(NIGHTCITY_WORKBENCH_NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'nightcity-workbench',
    order: 5,
    locale: NIGHTCITY_WORKBENCH_NS,
    label: () => t('view.workbench'),
  }, WorkbenchView))
}
