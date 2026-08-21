/** Nightcity workbench dictionaries (zh is the product language). */
export type NightcityWorkbenchKey =
  | 'view.workbench'
  | 'pane.conversation'
  | 'pane.execution'
  | 'pane.trajectory'
  | 'pane.conversation.running'
  | 'pane.conversation.idle'
  | 'pane.conversation.queued'
  | 'pane.execution.active'
  | 'pane.execution.idle'
  | 'pane.trajectory.active'
  | 'pane.trajectory.idle'
  | 'auto.switch'

/** zh dictionary. */
export const zh: Record<NightcityWorkbenchKey, string> = {
  'view.workbench': '工作台',
  'pane.conversation': '对话',
  'pane.execution': '执行',
  'pane.trajectory': '轨迹',
  'pane.conversation.running': '本轮正在生成回复',
  'pane.conversation.idle': '等待新的指令',
  'pane.conversation.queued': '队列中有待发消息',
  'pane.execution.active': '检测到终端活动',
  'pane.execution.idle': '当前没有终端活动',
  'pane.trajectory.active': '多智能体 / 工具活动进行中',
  'pane.trajectory.idle': '没有进行中的工具活动',
  'auto.switch': '自动切换',
}

/** en dictionary. */
export const en: Record<NightcityWorkbenchKey, string> = {
  'view.workbench': 'Workbench',
  'pane.conversation': 'Conversation',
  'pane.execution': 'Execution',
  'pane.trajectory': 'Trajectory',
  'pane.conversation.running': 'A turn is generating',
  'pane.conversation.idle': 'Awaiting instructions',
  'pane.conversation.queued': 'Queued messages waiting',
  'pane.execution.active': 'Terminal activity detected',
  'pane.execution.idle': 'No terminal activity',
  'pane.trajectory.active': 'Tool / multi-agent activity in flight',
  'pane.trajectory.idle': 'No tools in flight',
  'auto.switch': 'Auto-switch',
}
