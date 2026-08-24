# @deepseek-ai/dsh-perm-rules

[English](README.md) | 中文

执行前权限规则：在 `tools/pre-execute` 瀑布上强制执行的 deny 规则，任何工具体运行之前生效。部署从 config 播种初始规则表；模型可见的 `perm_rules` 工具在运行时列出并编辑该表，因此一次拒绝自带解释与自救路径，无需重启。被拒调用不会进入工具体——注册表把规则拒绝文本物化为该调用的 `Error: <reason>` 结果。决策记录：[perm-rules Agent Note](../../../.agents/notes/implemented/feature/2026-08-17-perm-rules-pre-execute-deny.zh.md)。

## 配置

```yaml
- id: perm-rules
  name: '@deepseek-ai/dsh-perm-rules'
  config:
    rules:                       # default: none
      - tool: bash
        pattern: 'bash *git push*'
      - tool: write
        pattern: 'write file_path=*secrets*'
```

种子校验在插件加载时 fail loud：`tool` 或 `pattern` 为空即抛错，绝不静默回退。

## 匹配语义

pattern 是作用于调用**身份文本**的 `*` 通配符：工具名在前，其后是白名单字符串参数字段组成的 `key=value` 对（`file_path`、`path`、`command`、`description`、`workdir`、`pattern`、`include`）。`*` 跨任意字符含换行；其余字符按字面匹配。工具名在前意味着裸 `read` pattern 拒绝每一次 `read` 调用，而 `read file_path=*secret*` 只拒绝匹配目标。白名单有意排除无界载荷（如 `write` 正文），保证匹配确定且廉价。

首条命中的规则作出决定；后续规则对该调用不可达。拒绝理由引用规则的 id、tool、pattern 以及精确的 `perm_rules` 移除调用，模型可在下一步纠正错误规则。

## `perm_rules` 工具

| action | 参数 | 效果 |
|---|---|---|
| `list` | — | 带稳定 id 的完整规则表 |
| `add` | `tool`（默认 `*`）、`pattern`（默认：工具名——即该工具的所有调用） | 追加一条 deny 规则 |
| `remove` | `id` | 恰好移除该规则；未知 id 报失败 |
| `clear` | — | 清空全部规则 |

规则存活于插件 fiber 内存：重启后从 config 重新播种，会话恢复不会还原运行时新增的规则。该工具操作表状态，声明为非并发安全。

## Model Experience

### 工具 schema

#### 模型看到什么

一个 `perm_rules` 工具（action/tool/pattern/id 参数），描述写明通配语义并给出三个典型示例（`"bash *rm -rf*"`、`"write file_path=*secrets*"`、`"read"`）。

##### Token 与 KV cache 影响

启用期间 schema 为每次请求的工具清单增加数百 token；它不改变历史轮次，因此规则变更不破坏 KV cache 前缀——仅清单段移动。禁用插件即完全移除 schema。一次拒绝结果是一段短文本；规则列表每规则一行。

## Known Limitations and Deferred Work

- 规则仅支持 deny；跳过审批服务的 `allow` 短路推迟到存在能兑现它的审批策略集成。
- 身份文本匹配只引用白名单参数字段；需要其他字段值的规则须等该字段加入白名单。
