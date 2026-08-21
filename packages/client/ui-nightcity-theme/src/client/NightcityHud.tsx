/**
 * Frame-wide nightcity atmosphere: perspective grid floor, skyline
 * silhouette, corner HUD brackets, and a slow scanline sweep. Purely
 * decorative — aria-hidden, click-through, and fully disabled under
 * prefers-reduced-motion.
 */
import type { ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './NightcityHud.module.css'

/** Props of the shell.overlay entry (runtime share only; no copy, no store). */
export type NightcityHudProps = PropsRuntime<'shell.overlay'>

/**
 * Render the nightcity atmosphere overlay.
 * @param _props - framework runtime share; the atmosphere reads nothing.
 * @returns one fixed, pointer-transparent layer over the app frame.
 */
export function NightcityHud(_props: NightcityHudProps): ReactElement {
  return (
    <div className={css.hud} aria-hidden="true">
      <div className={css.skyline} />
      <div className={css.grid} />
      <div className={css.bracket + ' ' + css.tl} />
      <div className={css.bracket + ' ' + css.tr} />
      <div className={css.bracket + ' ' + css.bl} />
      <div className={css.bracket + ' ' + css.br} />
      <div className={css.scanline} />
    </div>
  )
}
