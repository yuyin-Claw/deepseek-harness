/**
 * Mic toggle for the composer tool row: starts and stops one SpeechRecognition
 * session; each final utterance appends to the composer draft through the
 * standard input-actions face. Renders nothing where the API is absent.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react'
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  finalTranscript, speechRecognitionCtor, type NightcitySpeechRecognition,
} from './speech.ts'
import css from './VoiceMicButton.module.css'

/** The standard input-actions face handed to session-scope slot components. */
type VoiceInputActions = PropsRuntime<'conversation.input.right'>['inputActions']

/** Mic button props: runtime share (InputZone owner + inputActions) and the locale seat. */
export type VoiceMicButtonProps =
  PropsRuntime<'conversation.input.right'>
  & PropsLocale<'nightcity-voice'>

/**
 * Render the voice-input toggle.
 * @param props - `input` (draft snapshot) and `inputActions` from the standard session kit; `t` from the locale seat.
 * @returns the toggle button, or null where SpeechRecognition is unavailable.
 */
export function VoiceMicButton(props: VoiceMicButtonProps): ReactElement | null {
  const Ctor = speechRecognitionCtor()
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<NightcitySpeechRecognition | undefined>(undefined)
  const actionsRef = useRef<VoiceInputActions | undefined>(undefined)
  actionsRef.current = props.inputActions
  const draftRef = useRef('')
  draftRef.current = props.input?.draft ?? ''

  useEffect(() => {
    if (Ctor === undefined) return
    const recognition = new Ctor()
    recognition.lang = navigator.language
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const text = finalTranscript(event)
      if (text === '') return
      const actions = actionsRef.current
      if (actions === undefined) return
      const draft = draftRef.current
      actions.setDraft(draft === '' ? text : `${draft} ${text}`)
    }
    recognition.onerror = () => { setListening(false) }
    recognition.onend = () => { setListening(false) }
    recognitionRef.current = recognition
    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
      recognitionRef.current = undefined
    }
  }, [Ctor])

  if (Ctor === undefined) return null

  const toggle = (): void => {
    // The effect assigns the ref before this button can receive a click.
    /* v8 ignore start -- the ref is always set when the toggle renders */
    if (recognitionRef.current === undefined) return
    const recognition = recognitionRef.current
    /* v8 ignore stop */
    if (listening) {
      recognition.stop()
      setListening(false)
      return
    }
    try {
      recognition.start()
      setListening(true)
    } catch {
      // start() throws on an already-active session (Safari double gesture);
      // the button simply reflects the still-running session.
      setListening(true)
    }
  }

  return (
    <button
      type="button"
      className={clsx(css.mic, listening && css.listening)}
      onClick={toggle}
      aria-pressed={listening}
      title={listening ? props.t('mic.toggle.stop') : props.t('mic.toggle.start')}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" fill="currentColor" />
        <path
          d="M3.5 7.5a4.5 4.5 0 0 0 9 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect x="7.4" y="12" width="1.2" height="2.5" fill="currentColor" />
      </svg>
      <span className={css.label}>{listening ? props.t('mic.toggle.stop') : props.t('mic.toggle.start')}</span>
    </button>
  )
}
