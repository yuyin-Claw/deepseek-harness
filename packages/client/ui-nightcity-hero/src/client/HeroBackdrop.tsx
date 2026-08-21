/**
 * Hero backdrop: the full-bleed user-supplied artwork shown while the app
 * sits in the blank/hero phase (no current session, or a still-blank one),
 * and hidden as soon as a real conversation is current. Click-through and
 * aria-hidden, so it never blocks the hero controls or the accessibility
 * tree.
 */
import type { ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { HERO_BACKDROP_DATA_URL } from './hero-backdrop.ts'
import css from './HeroBackdrop.module.css'

/** Backdrop props: the root-scope runtime share (global useSessions). */
export type HeroBackdropProps = PropsRuntime<'shell.overlay'>

/** Current-session shape this backdrop reads (structural, runtime-checked). */
interface HeroSessionRow {
  readonly blank?: boolean
}

/**
 * Whether the hero phase is active: no session, or a current session still
 * blank.
 * @param state - the session-list snapshot.
 * @returns true while the app shows the blank-session hero.
 */
export function heroPhaseActive(state: {
  readonly current: string | undefined
  readonly byId: Readonly<Record<string, HeroSessionRow>>
}): boolean {
  const current = state.byId[state.current as string]
  return current === undefined || current.blank === true
}

/**
 * Render the hero backdrop.
 * @param props - `useSessions` from the runtime share.
 * @returns the full-bleed image layer during the hero phase, null otherwise.
 */
export function HeroBackdrop(props: HeroBackdropProps): ReactElement | null {
  const hero = props.useSessions(heroPhaseActive)
  if (!hero) return null
  return (
    <div className={css.root} aria-hidden="true">
      <img className={css.img} src={HERO_BACKDROP_DATA_URL} alt="" decoding="async" />
      <div className={css.vignette} />
    </div>
  )
}
