# @deepseek-ai/dsh-side-workspace

[English](README.md) | 中文

Host 服务 `ctx.sideWorkspace`，浏览器工作区面板的后端：一个 fork 可持续侧边会话（存活于 fork 子会话，天然与主线程隔离）与只读工作区视图——带 porcelain 状态的变更文件、对 HEAD 的单文件 diff、可读文件列表与内容预览。全部文件与 git 访问经 `fs`/`shell` seam 落在 `sandboxPolicy` 给出的工作区根。每个方法都以 `@Remote` 装饰供 client API 使用。

## Model Experience

无：面板与本服务仅面向用户；不触及任何模型请求，无 token 或 KV-cache 影响。

## Known Limitations and Deferred Work

- 渲染面板的浏览器 client 包推迟；本服务是其完整的 host 半。
- 每个服务实例一个侧边会话；第二个需要重新激活。
