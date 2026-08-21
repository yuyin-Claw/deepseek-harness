/**
 * Persona plate for the composer dock: a compact portrait plus nameplate
 * that follows the input phase. The user side renders the user-supplied CG
 * portrait artwork (inlined); the operator side keeps an SVG placeholder on
 * the same phase mapping.
 */
import type { ReactElement } from 'react'
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { USER_PORTRAIT_DATA_URL } from './user-portrait.ts'
import css from './PersonaPlate.module.css'

/** Persona plate props: runtime share (InputZone owner) and the locale seat. */
export type PersonaPlateProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsLocale<'nightcity-persona'>

/** Which persona the plate shows. */
export type PersonaMood = 'netrunner' | 'operator'

/**
 * Map the input phase to the persona whose turn it is.
 * @param phase - the session's live input phase.
 * @returns the active persona mood.
 */
export function moodOf(phase: 'plain' | 'adjudicating' | 'claimed' | 'submitting' | undefined): PersonaMood {
  return phase !== undefined && phase !== 'plain' ? 'operator' : 'netrunner'
}

/**
 * Render the persona plate.
 * @param props - `input` (phase snapshot) from the InputZone owner; `t` from the locale seat.
 * @returns one plate row: portrait, name, tagline.
 */
export function PersonaPlate(props: PersonaPlateProps): ReactElement {
  const mood = moodOf(props.input?.phase)
  return (
    <p className={css.root} aria-live="off">
      {mood === 'netrunner' ? <UserPortrait /> : <OperatorPortrait />}
      <span className={clsx(css.name, mood === 'operator' && css.operator)}>
        {props.t(`persona.${mood}.name` as const)}
      </span>
      <span className={css.line}>{props.t(`persona.${mood}.line` as const)}</span>
    </p>
  )
}

/** User portrait: the user-supplied CG artwork, cover-fit with the face kept near the top. */
function UserPortrait(): ReactElement {
  return (
    <img
      className={css.portrait}
      src={USER_PORTRAIT_DATA_URL}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}

/** Operator portrait: angular silhouette, magenta optic. */
function OperatorPortrait(): ReactElement {
  return (
    <svg className={css.portrait} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#2a1030" />
      <path d="M7 19l5-8 5 8z" fill="#ff2bd6" fillOpacity="0.8" />
      <circle cx="12" cy="8" r="1.6" fill="#ff2bd6" />
    </svg>
  )
}
