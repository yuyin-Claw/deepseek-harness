/**
 * Typewriter suggestion readout under the composer card: cycles the hero
 * suggestion copy one character at a time, pausing between lines. Display
 * only — suggestions are prompts for the user to type, not sendable
 * actions, so nothing here touches the composer draft.
 */
import { useEffect, useState, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { SUGGESTION_KEYS, TYPE_INTERVAL_MS, HOLD_MS } from './constants.ts'
import css from './TypewriterDock.module.css'

/** Typewriter dock props: runtime share plus the locale seat. */
export type TypewriterDockProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'nightcity-hero'>

/**
 * Render the typewriter suggestion readout.
 * @param props - framework runtime share plus `t` from the locale seat.
 * @returns one line of cycling suggestion text, static under reduced motion.
 */
export function TypewriterDock(props: TypewriterDockProps): ReactElement | null {
  const reduced = usePrefersReducedMotion()
  const [line, setLine] = useState(0)
  const [chars, setChars] = useState(0)

  // The fallback is unreachable: `line` only ever advances modulo the key list.
  /* v8 ignore next -- defensive index clamp under noUncheckedIndexedAccess */
  const text = props.t(SUGGESTION_KEYS[line] ?? SUGGESTION_KEYS[0])
  const done = chars >= text.length

  useEffect(() => {
    if (reduced) return
    if (!done) {
      const tick = setTimeout(() => { setChars(current => current + 1) }, TYPE_INTERVAL_MS)
      return () => clearTimeout(tick)
    }
    const advance = setTimeout(() => {
      setLine(current => (current + 1) % SUGGESTION_KEYS.length)
      setChars(0)
    }, HOLD_MS)
    return () => clearTimeout(advance)
  }, [reduced, done, chars, line])

  return (
    <p className={css.root} aria-live="off">
      <span className={css.label}>{props.t('typewriter.label')}</span>
      <span className={css.text}>{reduced ? text : text.slice(0, chars)}</span>
      {!reduced && <span className={done ? css.caret + ' ' + css.caretBlink : css.caret} />}
    </p>
  )
}

/** Media-query hook for the reduced-motion posture (component-internal state only). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (): void => { setReduced(query.matches) }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}
