/**
 * Minimal structural typing of the Web Speech API surface this plugin
 * consumes. The DOM lib types on some engine ranges lack SpeechRecognition,
 * so the plugin declares exactly the members it reads.
 */

/** One recognition result alternative. */
export interface NightcitySpeechAlternative {
  readonly transcript: string
}

/** One recognition result; final results carry complete utterances. */
export interface NightcitySpeechResult {
  readonly isFinal: boolean
  readonly 0: NightcitySpeechAlternative
  readonly length: number
}

/** Result list handed to the result event handler. */
export interface NightcitySpeechResultList {
  readonly length: number
  readonly [index: number]: NightcitySpeechResult
}

/** The recognition event: `result[i][0].transcript` per alternative. */
export interface NightcitySpeechEvent {
  readonly resultIndex: number
  readonly results: NightcitySpeechResultList
}

/** Recognition session handle: event targets plus lifecycle verbs. */
export interface NightcitySpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: NightcitySpeechEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

/** Constructor face discovered on the global object. */
export type NightcitySpeechRecognitionCtor =
  new () => NightcitySpeechRecognition

/** Read the SpeechRecognition constructor, whichever vendor prefix exposes it. */
export function speechRecognitionCtor(): NightcitySpeechRecognitionCtor | undefined {
  const scope = globalThis as Record<string, unknown>
  const candidate = scope.SpeechRecognition ?? scope.webkitSpeechRecognition
  return typeof candidate === 'function' ? candidate as NightcitySpeechRecognitionCtor : undefined
}

/**
 * Extract the concatenated final transcript from one result event.
 * @param event - the recognition result event.
 * @returns every final alternative's transcript joined with spaces.
 */
export function finalTranscript(event: NightcitySpeechEvent): string {
  const parts: string[] = []
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index] as NightcitySpeechResult | undefined
    if (result !== undefined && result.isFinal) parts.push(result[0].transcript)
  }
  return parts.join(' ').trim()
}
