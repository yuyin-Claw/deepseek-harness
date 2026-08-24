/** Nightcity off-peak dictionaries (zh is the product language). */
export type NightcityOffpeakKey =
  | 'offpeak.title'
  | 'offpeak.subtitle'
  | 'offpeak.toggle.on'
  | 'offpeak.toggle.off'
  | 'offpeak.status.running'
  | 'offpeak.status.paused.morning'
  | 'offpeak.status.paused.afternoon'

/** zh dictionary. */
export const zh: Record<NightcityOffpeakKey, string> = {
  'offpeak.title': '错峰执行',
  'offpeak.subtitle': '高峰时段（北京时间 9–12 点、14–18 点）暂缓新任务，低峰自动恢复',
  'offpeak.toggle.on': '已开启',
  'offpeak.toggle.off': '已关闭',
  'offpeak.status.running': '当前处于低峰时段，任务照常执行',
  'offpeak.status.paused.morning': '当前处于高峰时段，将持续至 12:00',
  'offpeak.status.paused.afternoon': '当前处于高峰时段，将持续至 18:00',
}

/** en dictionary. */
export const en: Record<NightcityOffpeakKey, string> = {
  'offpeak.title': 'Off-peak execution',
  'offpeak.subtitle': 'Hold new work through peak windows (Beijing 09–12 and 14–18); resume automatically off-peak',
  'offpeak.toggle.on': 'Armed',
  'offpeak.toggle.off': 'Off',
  'offpeak.status.running': 'Off-peak now — work runs normally',
  'offpeak.status.paused.morning': 'Peak window — held until 12:00',
  'offpeak.status.paused.afternoon': 'Peak window — held until 18:00',
}
