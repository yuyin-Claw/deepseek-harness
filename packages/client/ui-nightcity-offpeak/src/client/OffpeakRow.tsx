/**
 * Off-peak settings row: an arm/disarm switch plus a live schedule readout.
 * State arrives through the declared store (mirrored from the durable
 * settings scope); the phase readout derives purely from the wall clock.
 */
import type { ReactElement } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createOffpeakRowStore } from './settings-store.ts'
import { activePeakWindow } from '../offpeak-settings.ts'
import css from './OffpeakRow.module.css'

/** Row props: runtime share, the declared store, injected toggle callback, and the locale seat. */
export type OffpeakRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsStore<ReturnType<typeof createOffpeakRowStore>>
  & { setEnabled: (enabled: boolean) => void }
  & PropsLocale<'nightcity-offpeak'>

/** Status line the row shows for each schedule phase. */
export type OffpeakStatusKey =
  | 'offpeak.status.running'
  | 'offpeak.status.paused.morning'
  | 'offpeak.status.paused.afternoon'

/**
 * Resolve the status-line key for an instant.
 * @param now - instant to classify (default injection point for tests).
 * @returns the locale key naming the phase.
 */
export function statusKeyOf(now: Date = new Date()): OffpeakStatusKey {
  const peak = activePeakWindow(now)
  if (peak === undefined) return 'offpeak.status.running'
  return peak.endMinutes === 12 * 60 ? 'offpeak.status.paused.morning' : 'offpeak.status.paused.afternoon'
}

/**
 * Render the off-peak settings row.
 * @param props - store-backed armed flag, the toggle callback, and `t`.
 * @returns one settings row: title, subtitle, switch, live phase line.
 */
export function OffpeakRow(props: OffpeakRowProps): ReactElement {
  const enabled = props.useStore(s => s.enabled)
  return (
    <section className={css.row}>
      <div className={css.head}>
        <h4 className={css.title}>{props.t('offpeak.title')}</h4>
        <button
          type="button"
          className={enabled ? css.switch + ' ' + css.on : css.switch}
          role="switch"
          aria-checked={enabled}
          onClick={() => { props.setEnabled(!enabled) }}
        >
          {enabled ? props.t('offpeak.toggle.on') : props.t('offpeak.toggle.off')}
        </button>
      </div>
      <p className={css.subtitle}>{props.t('offpeak.subtitle')}</p>
      {enabled && <p className={css.status}>{props.t(statusKeyOf())}</p>}
    </section>
  )
}
