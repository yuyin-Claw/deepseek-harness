/** Nightcity voice-input dictionaries (zh is the product language). */
export type NightcityVoiceKey =
  | 'mic.toggle.start'
  | 'mic.toggle.stop'
  | 'mic.unsupported.hint'

/** zh dictionary. */
export const zh: Record<NightcityVoiceKey, string> = {
  'mic.toggle.start': '语音输入',
  'mic.toggle.stop': '停止听写',
  'mic.unsupported.hint': '当前浏览器不支持语音输入',
}

/** en dictionary. */
export const en: Record<NightcityVoiceKey, string> = {
  'mic.toggle.start': 'Voice input',
  'mic.toggle.stop': 'Stop dictation',
  'mic.unsupported.hint': 'Speech recognition is unavailable in this browser',
}
