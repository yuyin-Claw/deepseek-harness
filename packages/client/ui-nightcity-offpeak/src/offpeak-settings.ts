/**
 * Off-peak schedule model (node-safe pure logic). Peak windows are Beijing
 * wall-clock blocks during which deferred work waits: the working lunch
 * block and the evening block. Everything downstream derives from these.
 */

/** Default peak windows in Beijing time: 09:00–12:00 and 14:00–18:00. */
export interface PeakWindow {
  /** Inclusive start, minutes from midnight. */
  startMinutes: number
  /** Exclusive end, minutes from midnight. */
  endMinutes: number
}

/** The shipped schedule; a validated Config field would override per deployment. */
export const DEFAULT_PEAK_WINDOWS: readonly PeakWindow[] = [
  { startMinutes: 9 * 60, endMinutes: 12 * 60 },
  { startMinutes: 14 * 60, endMinutes: 18 * 60 },
]

/** Beijing offset from UTC in minutes (no DST in China Standard Time). */
const BEIJING_OFFSET_MINUTES = 8 * 60

/** Durable settings document for the nightcity off-peak feature. */
export interface OffpeakSettings {
  /** Whether deferral is armed (default false: everything runs immediately). */
  enabled: boolean
}

/** Settings namespace owning {@link OffpeakSettings}. */
export const OFFPEAK_SETTINGS_NAMESPACE = 'ui-nightcity-offpeak'

/** Field name of the toggle inside the settings document. */
export const OFFPEAK_ENABLED_FIELD = 'enabled'

/** Beijing-time minutes from midnight of the given instant. */
export function beijingMinutes(now: Date): number {
  const minutes = now.getUTCMinutes() + now.getUTCHours() * 60 + BEIJING_OFFSET_MINUTES
  return minutes % (24 * 60)
}

/**
 * The peak window currently active at `now`, if any.
 * @param now - instant to classify.
 * @param windows - schedule to check against.
 * @returns the covering window, or undefined outside every block.
 */
export function activePeakWindow(
  now: Date,
  windows: readonly PeakWindow[] = DEFAULT_PEAK_WINDOWS,
): PeakWindow | undefined {
  const minutes = beijingMinutes(now)
  return windows.find(window => minutes >= window.startMinutes && minutes < window.endMinutes)
}

/**
 * Whether new work may run now under the schedule.
 * @param now - instant to classify.
 * @param windows - schedule to check against.
 * @returns true outside every peak block.
 */
export function isOffPeakWindow(
  now: Date,
  windows: readonly PeakWindow[] = DEFAULT_PEAK_WINDOWS,
): boolean {
  return activePeakWindow(now, windows) === undefined
}
