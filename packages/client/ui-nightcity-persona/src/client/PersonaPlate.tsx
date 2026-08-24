/**
 * Persona plate for the composer dock: a compact portrait plus nameplate
 * that follows the turn. Three personas, each with the user-supplied CG
 * portrait artwork (inlined): the netrunner while the user types, the
 * operator while the assistant submits, and the subagent crew while a
 * subagent-family tool call (subagent / workflow / delegate / fork) is in
 * flight.
 */
import type { ReactElement } from 'react'
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { USER_PORTRAIT_DATA_URL } from './user-portrait.ts'
import { OPERATOR_PORTRAIT_DATA_URL } from './operator-portrait.ts'
import { SUBAGENT_PORTRAIT_DATA_URL } from './subagent-portrait.ts'
import css from './PersonaPlate.module.css'

/** Persona plate props: runtime share (InputZone owner + useSession) and the locale seat. */
export type PersonaPlateProps =
  PropsRuntime<'conversation.composer.dock'>
  & PropsLocale<'nightcity-persona'>

/** Which persona the plate shows. */
export type PersonaMood = 'netrunner' | 'operator' | 'subagent'

/** Tool-name pattern that counts as subagent delegation activity. */
const SUBAGENT_PATTERN = /subagent|workflow|delegate|fork|agent/i

/** Structural shape of one running-call row the plate reads. */
interface RunningCallLike {
  readonly name: string
}

/**
 * Map live turn facts to the persona whose turn it is: subagent activity
 * wins, then an in-flight submission, then the idle user.
 * @param phase - the session's live input phase.
 * @param running - the session's running tool calls.
 * @returns the active persona mood.
 */
export function moodOf(
  phase: 'plain' | 'adjudicating' | 'claimed' | 'submitting' | undefined,
  running: readonly RunningCallLike[] = [],
): PersonaMood {
  if (running.some(call => SUBAGENT_PATTERN.test(call.name))) return 'subagent'
  return phase !== undefined && phase !== 'plain' ? 'operator' : 'netrunner'
}

/**
 * Render the persona plate.
 * @param props - `input` (owner InputZone) and `useSession` from the runtime share; `t` from the locale seat.
 * @returns one plate row: portrait, name, tagline.
 */
export function PersonaPlate(props: PersonaPlateProps): ReactElement {
  const phase = props.input?.phase
  const running = props.useSession(s => s.runningCalls)
  const mood = moodOf(phase, running)
  return (
    <p className={css.root} aria-live="off">
      <PersonaPortrait mood={mood} />
      <span className={clsx(css.name, (mood === 'operator' || mood === 'subagent') && css.operator)}>
        {props.t(`persona.${mood}.name` as const)}
      </span>
      <span className={css.line}>{props.t(`persona.${mood}.line` as const)}</span>
    </p>
  )
}

/** One persona's CG portrait, cover-fit in the plate frame. */
function PersonaPortrait({ mood }: { mood: PersonaMood }): ReactElement {
  const src = mood === 'netrunner' ? USER_PORTRAIT_DATA_URL
    : mood === 'operator' ? OPERATOR_PORTRAIT_DATA_URL
      : SUBAGENT_PORTRAIT_DATA_URL
  return (
    <img
      className={css.portrait}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  )
}
