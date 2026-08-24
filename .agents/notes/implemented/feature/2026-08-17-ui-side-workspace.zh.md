# Agent Note: ui-side-workspace 客户端面板

Status: implemented

[English](2026-08-17-ui-side-workspace.md) | 中文

## Problem

宿主服务 `packages/side/side-workspace` 暴露了七个 `@Remote` 方法（`startConversation`、`sendFollowup`、`readConversation`、`listDiffFiles`、`readFileDiff`、`listFiles`、`readFile`），但 Web 客户端没有使用它们的界面：侧边对话、Diff 浏览与文件读取只能通过代码触达，无法通过 GUI。

## Decision

新增 `packages/client/ui-side-workspace`，一个纯消费型浏览器插件，以 list 协议（`{ name: 'shell.overlay', id: 'side-workspace', order: 100 }`）经 `ctx.slots.inject` 向 `shell.overlay` slot 注册一个固定右侧 dock（420px，可收起为右缘竖条）。面板组件的所有宿主访问都经 slot `inject` face 调用 `ctx.api.sideWorkspace`；对话 tab 每 2 秒轮询 `readConversation` 直到状态离开 `running`；diff 行按首字符着色（`+` 绿、`-` 红、`@@` 灰）；文件 tab 在客户端过滤 `listFiles`，`.md` 按正文排版、其余等宽显示并提示截断。

## Alternatives considered

- 用模态对话框替代 dock：否决 —— 侧边工作区应与主对话并列，而非遮盖它。
- 推送式对话更新（事件订阅）替代轮询：暂缓 —— 需要为分叉子会话新增客户端事件通道；2 秒轮询是最小的正确起点。
- 新建专用 slot 而非复用 `shell.overlay`：否决 —— overlay slot 是 shell 级界面的既定组合点。

## Consequences

面板只做呈现：无服务、不写会话日志、不向主线程引入模型可见输入。宿主侧上限（消息/diff/文件截断、扫描预算）约束了面板能显示的一切。Web 应用编排行（`cordis.patch.yml` 与 web-app `package.json` 依赖）仍需接入，面板才能在组装后的应用中启动。
