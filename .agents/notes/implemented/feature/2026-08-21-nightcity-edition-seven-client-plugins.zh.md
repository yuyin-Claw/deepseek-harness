# Agent Note: 夜之城版 —— 七个纯增量的客户端插件

Status: implemented

[English](2026-08-21-nightcity-edition-seven-client-plugins.md) | 中文

## 问题

夜之城版要为 DSH Web 客户端换肤，并新增辩论、工作台、立绘、语音与错峰界面。参考实现（Neon 分支）为其中若干功能直接修改了上游包 —— 在 ui-conversation 里新增 `conversation.chat.persona` 座位、加入 `viewDefaultFor` provide 通道、并给主题采纳逻辑打了补丁 —— 这些改动干净的上游 fork 无法在不产生合并冲突的前提下承载。问题是：七个功能在零修改上游包的约束下，各应落在哪个扩展点上。

## 决策

七个功能全部以新的 `packages/client/ui-nightcity-*` 包交付，只消费公开扩展点，经 `ctx.slots.inject` 与 `ctx.effect` 注册：

- **theme** 叠加一层 scheme-invariant 的 `overrideTokens` 覆盖层，而不是注册可选主题 id。设置域采纳逻辑只会回退可选偏好，覆盖层不受影响；两种基础配色都收到同一组暗色霓虹值。装饰性氛围层（天际线、透视网格、四角 HUD、扫描线）原本是 `shell.overlay` 条目；后因产品反馈移除——其高饱和霓虹剪影在浅色调色板下呈显眼的彩色线条，如今该包只发布调色板覆盖，hero 保留独立的背景图。
- **hero** 以优先级 −1 遮蔽 `conversation.hero.brand.mark`（低者优先渲染），在 `conversation.input.dock` 增加打字机建议读数，并用 Web Audio 合成启动音（无二进制素材）。
- **persona** 挂在 `conversation.composer.dock`，把 InputZone 阶段映射为当前立绘。逐消息 CG 头像被否决：它需要上游未声明的聊天行座位，而新增该座位正是本版要避免的上游修改。
- **voice** 是 `conversation.input.right` 的开关，通过标准 `inputActions.setDraft` 面追加 SpeechRecognition 的最终听写；API 缺失时渲染为空。
- **offpeak** 通过 `ctx.settingsScope.bind` 持有持久设置 `ui-nightcity-offpeak.enabled`，并在 `settings.general.item` 注册镜像到声明 store 的设置行。执行侧（真正把工作推迟到低峰窗口的 host 侧闸门）延后；本包只持有设置与设置界面。
- **workbench** 是一个增量的 `conversation.view` 标签，内部面板按会话快照的 `runningCalls` 自动切换（对话 / 执行 / 轨迹）。替换框架中央工作面与 persona 同理被否决：上游没有供外部插件写入视图环 store 的合规通道。
- **debate** 是一个增量的 `conversation.view` 标签，用标准 `useSession` 钩子从已定稿的 assistant 文本折叠协议标记（`⚔️ 第 n 回合`、`正方：/反方：`、`⚖️ 判决`）。辩论本身在 host 侧由普通子代理工具按包 README 记录的协议驱动；未新增任何 host API。

放弃的部分：从根本上需要上游座位的功能（逐消息头像、框架级视图自动切换）落在最接近的合规表面上，并把缺口记入 Known Limitations，而不是打上游补丁。

## 备选方案

- 直接基于 Neon 实现二次开发：否决 —— 其新增代码为 PolyForm 非商用许可，且修改上游包，违背干净 fork 的目标。
- 注册可选的 `nightcity` 主题 id：否决 —— 主题服务的设置采纳会在持久化偏好到达时回退进程内扩展主题（正是 Neon 在 ui-theme 里打补丁的缺陷）；覆盖层无需补丁即免疫。
- 补齐缺失的上游座位（`conversation.chat.persona`、视图默认值 provide 通道）：否决 —— 任何上游编辑都会重新引入本版要避免的合并冲突成本。

## Consequences

- 所有注册都走 `ctx.slots.inject`：贡献在归属声明之后安装，并随贡献者 fiber 回滚；每个包的 browser-plugin spec 都验证了处置。
- 标记折叠、面板推导与错峰时间表是纯函数模块，使覆盖率在不借助渲染机制的情况下满足逐文件 100% 门禁。
- tsconfig 引用与三个注册面（聚合 `tsconfig.client.json`、`cordis.patch.yml` 行、web-app 依赖）逐包维护；`verify-client-packages --fix` 可修复 manifest 漂移。
