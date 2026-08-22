# Agent Note: perm-rules —— tools/pre-execute 瀑布上的 deny 权限规则

Status: implemented

[English](2026-08-17-perm-rules-pre-execute-deny.md) | 中文

## 问题

部署需要 Claude Code permissions 式的按调用 deny 规则：保护密钥不被 `write`/`read` 触碰、把破坏性 shell 单行挡在 `bash` 之外。harness 已拥有策略管线——带 allow/deny/ask 语义的 `tools/pre-execute` 瀑布，覆盖每一次注册表分发（含嵌套与子代理调用）——但没有规则表喂数据，且模型撞上拒绝后没有带内途径知道是哪条规则、更无法纠正它。

## 决策

`@deepseek-ai/dsh-perm-rules`（`packages/guard/perm-rules`）直接在 `tools/pre-execute` 瀑布上执行 deny 规则。规则表是插件 fiber 内存，由校验后的 config 播种（`tool`/`pattern` 为空在加载时抛错）。模型可见的 `perm_rules` 工具在运行时列出并编辑规则表；拒绝理由引用规则的 id、tool、pattern 与精确的移除调用，模型可在下一步纠正错误规则。运行时新增规则有意不做持久化：config 是部署的权威，重启后重新播种。

匹配作用于身份文本——工具名加白名单字符串参数字段（`file_path`、`path`、`command`、`description`、`workdir`、`pattern`、`include`）——`*` 通配跨任意字符含换行。白名单排除无界载荷（`write` 正文），pattern 的含义因此不依赖兆级参数。首条命中规则作出决定；顺序即数组顺序。

## 被否决的备选

- **`tools.guard()` 注册**：注册表把 guard 留给身份保护，动态包 façade 有意不暴露；重开该表面只会增加第二条无新语义的 deny 路径。
- **持久化运行时规则**：会在 config 与会话日志之间分裂权威；自纠正的拒绝理由消除了实际需要。
- **`allow` 效果**：在存在能兑现它的审批策略集成之前无法兑现；推迟而非占位。

## 后果

- 拒绝以普通 `Error:` 工具结果呈现并引用规则——无新会话事件，重放安全。
- `repeat-tool-reminder` 的 post-execute 循环检测计入被拒调用，因此反复撞击 deny 规则的模型也会收到循环提醒。
- 测试驱动完整注册表管线（`ctx.tools.execute`）：种子 fail-loud、拒绝/窄匹配/恢复、管理动作、fiber 销毁同时移除门与工具。
