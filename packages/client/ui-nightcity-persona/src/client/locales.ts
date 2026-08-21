/** Nightcity persona plate dictionaries (zh is the product language). */
export type NightcityPersonaKey =
  | 'persona.netrunner.name'
  | 'persona.netrunner.line'
  | 'persona.operator.name'
  | 'persona.operator.line'

/** zh dictionary. */
export const zh: Record<NightcityPersonaKey, string> = {
  'persona.netrunner.name': 'V',
  'persona.netrunner.line': '网络行者 · 待命中',
  'persona.operator.name': '银手',
  'persona.operator.line': '操作员 · 正在执行',
}

/** en dictionary. */
export const en: Record<NightcityPersonaKey, string> = {
  'persona.netrunner.name': 'V',
  'persona.netrunner.line': 'Netrunner · standing by',
  'persona.operator.name': 'Silverhand',
  'persona.operator.line': 'Operator · executing',
}
