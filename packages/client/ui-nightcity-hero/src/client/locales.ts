/** Nightcity hero landing dictionaries (zh is the product language). */
export type NightcityHeroKey =
  | 'typewriter.label'
  | 'suggestion.0'
  | 'suggestion.1'
  | 'suggestion.2'
  | 'suggestion.3'

/** zh dictionary. */
export const zh: Record<NightcityHeroKey, string> = {
  'typewriter.label': '试试问我',
  'suggestion.0': '今晚的夜之城有什么新任务？',
  'suggestion.1': '帮我把这个仓库改造成霓虹风格',
  'suggestion.2': '用两个模型来一场 VS 辩论',
  'suggestion.3': '生成一份赛博朋克主题的代码审计报告',
}

/** en dictionary. */
export const en: Record<NightcityHeroKey, string> = {
  'typewriter.label': 'Try asking',
  'suggestion.0': 'Any new gigs in Night City tonight?',
  'suggestion.1': 'Reskin this repository in neon',
  'suggestion.2': 'Run a VS debate between two models',
  'suggestion.3': 'Produce a cyberpunk-themed code audit report',
}
