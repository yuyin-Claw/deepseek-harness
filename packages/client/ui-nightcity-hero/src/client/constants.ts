/** Typewriter pacing constants (protocol-external presentation tunables). */

/** One typed character per interval. */
export const TYPE_INTERVAL_MS = 55

/** Pause on a finished line before the next one. */
export const HOLD_MS = 2400

/** Locale keys cycled by the readout, in order. */
export const SUGGESTION_KEYS = [
  'suggestion.0',
  'suggestion.1',
  'suggestion.2',
  'suggestion.3',
] as const
