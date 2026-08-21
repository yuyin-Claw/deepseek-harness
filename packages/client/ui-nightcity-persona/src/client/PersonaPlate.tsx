/**
 * Persona plate for the composer dock: a compact portrait plus nameplate
 * that follows the input phase. Both sides render the user-supplied CG
 * portrait artwork (inlined); the phase mapping stays independent of the art.
 */
import type { ReactElement } from 'react'
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { USER_PORTRAIT_DATA_URL } from './user-portrait.ts'
import { OPERATOR_PORTRAIT_DATA_URL } from './operator-portrait.ts'
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

/** Operator (assistant) portrait: the user-supplied CG artwork, same cover-fit frame. */
function OperatorPortrait(): ReactElement {
  return (
    <img
      className={css.portrait}
      src={OPERATOR_PORTRAIT_DATA_URL}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
