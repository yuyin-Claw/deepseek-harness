# dsh-client-ui-side-workspace

[English](README.md) | 中文

dsh Web 客户端的右侧侧边工作地面板：固定在右缘的 420px dock，包含三个 tab —— 分叉侧边对话、逐文件 Diff、只读文件浏览。dock 可收起为右缘竖条。

## 注册内容

浏览器插件通过 `ctx.slots.inject` 向 `shell.overlay` slot 注册一个组件（`id: 'side-workspace'`，`order: 100`）。所有宿主访问都经由 `@deepseek-ai/dsh-side-workspace` 提供的 `ctx.api.sideWorkspace` 七个远端方法：

- 对话：气泡式消息列表加输入框。Enter 首次开启会话（`startConversation`）或发送后续消息（`sendFollowup`），随后每 2 秒轮询 `readConversation`，直到状态离开 `running`。
- Diff：带 porcelain 状态码的变更文件列表（`listDiffFiles`）；点击文件渲染其 diff（`readFileDiff`），新增行绿色、删除行红色、`@@` hunk 头灰色；提供返回与刷新。
- 文件：搜索框过滤的文件列表（`listFiles`）与只读内容视图（`readFile`）——`.md` 按正文排版，其余等宽显示，超长截断时提示。

## 模型体验

无模型影响。本面板不向主对话引入任何模型可见输入，也不改变主对话的提示词、工具或 token 计量。侧边对话本身运行在宿主服务拥有的分叉子会话中；其模型用量属于该子会话，由宿主服务完整承载，与本 UI 包无关。

## 已知限制与后续工作

- Web 应用编排行（`packages/bundle/web-app/cordis.patch.yml` 及其 `package.json` 依赖）尚未接入；聚合 `tsconfig.client.json` 引用已注册。
- 对话轮询为固定 2 秒间隔；暂无推送式更新。
- dock 宽度（420px）与 tab 顺序为常量，未做成配置。

## 开发

```sh
pnpm --filter @deepseek-ai/dsh-client-ui-side-workspace bundle   # rebuild lib/client.js
pnpm run test -- packages/client/ui-side-workspace               # package tests
```
