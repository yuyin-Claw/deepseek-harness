/**
 * Browser half of the nightcity off-peak plugin: the durable
 * `ui-nightcity-offpeak.enabled` setting plus its General-settings row. The
 * row arms/disarms deferral and shows the live schedule phase; the armed
 * value is durable through the settings scope.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings.general.item seat and the session standard
// kit, plus the locale and settings-scope Context merges.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { OffpeakRow } from './OffpeakRow.tsx'
import { createOffpeakRowStore } from './settings-store.ts'
import { en, zh, type NightcityOffpeakKey } from './locales.ts'
import {
  OFFPEAK_ENABLED_FIELD, OFFPEAK_SETTINGS_NAMESPACE, type OffpeakSettings,
} from '../offpeak-settings.ts'

/** Locale namespace owning the off-peak row copy. */
export const NIGHTCITY_OFFPEAK_NS = 'nightcity-offpeak'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The nightcity off-peak settings row copy. */
    'nightcity-offpeak': NightcityOffpeakKey
  }
}

/** Required services: slots, locale, and the settings scope. */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Client plugin body: bind the durable setting, mirror it into the row
 * store, provide the copy, and register the General-settings row.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const host = ctx.settingsScope.bind<OffpeakSettings>({ namespace: OFFPEAK_SETTINGS_NAMESPACE })
  ctx.effect(() => ctx.locale.register(NIGHTCITY_OFFPEAK_NS, { zh, en }), 'ui-nightcity-offpeak: row dictionaries')

  const store = createOffpeakRowStore()
  let actions: undefined | ReturnType<typeof store.create>['actions']
  const adopt = (): void => {
    const snapshot = host.getSnapshot()
    // The pre-registration adopt runs with no baked store yet; the optional
    // call keeps the first subscription notification harmless.
    /* v8 ignore next -- actions are absent only before the row instantiates */
    actions?.sync(snapshot.value?.enabled === true, snapshot.revision ?? 0)
  }
  ctx.effect(() => host.subscribe(adopt), 'ui-nightcity-offpeak: settings adoption')
  adopt()
  const injected = (): { setEnabled: (enabled: boolean) => void } => ({
    setEnabled: (enabled) => { void host.set(OFFPEAK_ENABLED_FIELD, enabled) },
  })
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'nightcity-offpeak',
    order: 30,
    store,
    locale: NIGHTCITY_OFFPEAK_NS,
    inject: (bound: ReturnType<typeof store.create>['actions']) => {
      actions = bound
      adopt()
      return injected()
    },
  }, OffpeakRow))
}
