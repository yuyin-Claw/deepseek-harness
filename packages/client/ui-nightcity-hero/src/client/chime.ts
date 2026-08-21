/**
 * One-shot boot chime: a short synthesized arpeggio (no audio asset). No-op
 * outside the browser or when Web Audio is unavailable.
 */

/** Chime frequencies (Hz): neon major arpeggio. */
const CHIME_HZ = [523.25, 659.25, 987.77] as const

/** Per-note duration. */
const NOTE_MS = 120

/**
 * Play the boot chime once. Swallows every failure: the chime is strictly
 * cosmetic, so unsupported or suspended audio contexts degrade to silence
 * rather than surfacing an error.
 * @returns nothing; failures are intentionally silent.
 */
export function playBootChime(): void {
  try {
    const AudioCtor = globalThis.AudioContext
    if (AudioCtor === undefined) return
    const context = new AudioCtor()
    const start = context.currentTime
    CHIME_HZ.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + index * NOTE_MS / 1000)
      gain.gain.exponentialRampToValueAtTime(0.06, start + (index * NOTE_MS + 20) / 1000)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + ((index + 1) * NOTE_MS) / 1000)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start + index * NOTE_MS / 1000)
      oscillator.stop(start + ((index + 1) * NOTE_MS) / 1000)
    })
    void context.close().catch(() => {
      // close() rejection only races an already-closed context: silence is
      // the intended outcome either way.
    })
  } catch {
    // Cosmetic feature: unsupported environments stay silent.
  }
}
