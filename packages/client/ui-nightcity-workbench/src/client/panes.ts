/**
 * Workbench pane derivation: pure functions over the conversation snapshot's
 * running-call table. The execution pane wins while a shell-family tool call
 * is in flight; otherwise any other running tool call selects the trajectory
 * pane; a quiet session stays on the conversation pane.
 */

/** Tool-name patterns that count as terminal/code execution activity. */
const TERMINAL_PATTERN = /bash|shell|terminal|exec|command/i

/** Shape of one running tool call as exposed by the session snapshot. */
export interface RunningCallLike {
  readonly name: string
}

/** The three workbench panes. */
export type WorkbenchPane = 'conversation' | 'execution' | 'trajectory'

/**
 * Classify one running call.
 * @param name - tool call name.
 * @returns true when the name reads as terminal/code execution.
 */
export function isTerminalCall(name: string): boolean {
  return TERMINAL_PATTERN.test(name)
}

/**
 * Derive the auto-switched pane from live conversation facts.
 * @param running - the session's running tool calls.
 * @returns the pane the workbench should show.
 */
export function paneOf(running: readonly RunningCallLike[]): WorkbenchPane {
  if (running.some(call => isTerminalCall(call.name))) return 'execution'
  if (running.length > 0) return 'trajectory'
  return 'conversation'
}
