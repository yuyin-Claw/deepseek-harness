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
    <p className={css.root} aria-label={`${props.t('typewriter.label')} ${text}`}>
      {/*
        The animated partial and caret ride aria-hidden: mid-typing excerpts
        are timing-dependent and must stay out of the accessible tree the
        e2e goldens capture; the full line rides the paragraph's label.
      */}
      <span className={css.label} aria-hidden="true">{props.t('typewriter.label')}</span>
      <span className={css.text} aria-hidden="true">{reduced ? text : text.slice(0, chars)}</span>
      {!reduced && <span className={done ? css.caret + ' ' + css.caretBlink : css.caret} aria-hidden="true" />}
    </p>
  )
}

/** Media-query hook for the reduced-motion posture (component-internal state only). */
function usePrefersReducedMotion(): boolean {
  const readQuery = (): MediaQueryList | undefined =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : undefined
  const [query] = useState(readQuery)
  // A missing media API degrades to the reduced posture: the full line
  // renders statically instead of animating in an unknown environment.
  const [reduced, setReduced] = useState(() => query?.matches !== false)
  useEffect(() => {
    if (query === undefined) return
    const onChange = (): void => { setReduced(query.matches) }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [query])
  return reduced
}
