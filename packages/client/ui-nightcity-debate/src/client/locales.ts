/** Nightcity VS debate dictionaries (zh is the product language). */
export type NightcityDebateKey =
  | 'view.debate'
  | 'debate.empty.title'
  | 'debate.empty.hint'
  | 'debate.side.pro'
  | 'debate.side.con'
  | 'debate.round'
  | 'debate.verdict'
  | 'debate.topic'

/** zh dictionary. */
export const zh: Record<NightcityDebateKey, string> = {
  'view.debate': 'VS 辩论',
  'debate.empty.title': '还没有辩论记录',
  'debate.empty.hint': '让主智能体按辩论协议派出正方、反方与裁判子代理，战报会实时出现在这里',
  'debate.side.pro': '正方',
  'debate.side.con': '反方',
  'debate.round': '回合',
  'debate.verdict': '判决',
  'debate.topic': '辩题',
}

/** en dictionary. */
export const en: Record<NightcityDebateKey, string> = {
  'view.debate': 'VS Debate',
  'debate.empty.title': 'No debate on record yet',
  'debate.empty.hint': 'Have the host agent fan out pro, con, and judge subagents per the debate protocol; round reports stream here',
  'debate.side.pro': 'Pro',
  'debate.side.con': 'Con',
  'debate.round': 'Round',
  'debate.verdict': 'Verdict',
  'debate.topic': 'Topic',
}
