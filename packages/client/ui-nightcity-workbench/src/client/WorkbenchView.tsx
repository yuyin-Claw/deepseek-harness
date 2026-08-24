/**
 * Workbench view: one conversation.view tab whose central pane auto-switches
 * with the live turn — conversation while idle, execution while a terminal
 * tool call runs, trajectory for any other in-flight tool activity. The
 * auto-switch is a per-session toggle; a manual pane pick suspends it until
 * re-armed.
 */
import { useEffect, useState, type ReactElement } from 'react'
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { paneOf, isTerminalCall, type RunningCallLike, type WorkbenchPane } from './panes.ts'
import css from './WorkbenchView.module.css'

/** Workbench view props: runtime share (useSession) and the locale seat. */
export type WorkbenchViewProps =
  PropsRuntime<'conversation.view'>
  & PropsLocale<'nightcity-workbench'>

/** Ordered pane ids for the picker. */
const PANES: readonly WorkbenchPane[] = ['conversation', 'execution', 'trajectory']

/**
 * Render the workbench view.
 * @param props - `useSession` from the runtime share; `t` from the locale seat.
 * @returns the pane picker and the active pane readout.
 */
export function WorkbenchView(props: WorkbenchViewProps): ReactElement {
  const running = props.useSession(s => s.runningCalls)
  const queued = props.useSession(s => s.queue.length)
  const sessionRunning = props.useSession(s => s.running)
  const [auto, setAuto] = useState(true)
  const [picked, setPicked] = useState<WorkbenchPane>('conversation')
  const derived = paneOf(running)
  const active = auto ? derived : picked

  // A manual pick suspends auto-switching; re-arming returns control.
  useEffect(() => {
    if (auto) setPicked(derived)
  }, [auto, derived])

  return (
    <div className={css.root}>
      <div className={css.bar}>
        {PANES.map(pane => (
          <button
            key={pane}
            type="button"
            className={clsx(css.tab, active === pane && css.selected)}
            onClick={() => { setAuto(false); setPicked(pane) }}
            aria-pressed={active === pane}
          >
            {props.t(`pane.${pane}` as const)}
            {auto && derived === pane && <span className={css.liveDot} />}
          </button>
        ))}
        <button
          type="button"
          className={clsx(css.auto, auto && css.autoOn)}
          role="switch"
          aria-checked={auto}
          onClick={() => { setAuto(current => !current) }}
        >
          {props.t('auto.switch')}
        </button>
      </div>
      <div className={css.pane}>
        {active === 'conversation' && (
          <ConversationPane running={sessionRunning} queued={queued} t={props.t} />
        )}
        {active === 'execution' && <ExecutionPane running={running} t={props.t} />}
        {active === 'trajectory' && <TrajectoryPane running={running} t={props.t} />}
      </div>
    </div>
  )
}

/** Locale translate face subset the panes need. */
type Translate = PropsLocale<'nightcity-workbench'>['t']

/** Conversation pane: turn and queue readout. */
function ConversationPane({ running, queued, t }: { running: boolean; queued: number; t: Translate }): ReactElement {
  return (
    <section>
      <p className={css.line}>
        {running ? t('pane.conversation.running') : t('pane.conversation.idle')}
      </p>
      {queued > 0 && <p className={css.line}>{t('pane.conversation.queued')} ({queued})</p>}
    </section>
  )
}

/** Execution pane: the running terminal-family calls. */
function ExecutionPane({ running, t }: { running: readonly RunningCallLike[]; t: Translate }): ReactElement {
  const terminal = running.filter(call => isTerminalCall(call.name))
  return (
    <section>
      <p className={css.line}>{terminal.length > 0 ? t('pane.execution.active') : t('pane.execution.idle')}</p>
      {terminal.map(call => <p key={call.name} className={css.call}>{call.name}</p>)}
    </section>
  )
}

/** Trajectory pane: every other in-flight call. */
function TrajectoryPane({ running, t }: { running: readonly RunningCallLike[]; t: Translate }): ReactElement {
  const other = running.filter(call => !isTerminalCall(call.name))
  return (
    <section>
      <p className={css.line}>{other.length > 0 ? t('pane.trajectory.active') : t('pane.trajectory.idle')}</p>
      {other.map(call => <p key={call.name} className={css.call}>{call.name}</p>)}
    </section>
  )
}
