# @deepseek-ai/dsh-tool-vcs

[English](README.md) | 中文

面向模型的版本控制工具套件 —— `repo_map` 与 `git_workflow` —— 构建在[文件系统能力](../../fs/fs/README.zh.md)（`ctx.fs`）与 [shell 能力](../../shell/shell/README.zh.md)（`ctx.shell`）之上，工作区根目录按调用从会话 cwd 或[沙箱策略](../../sandbox/sandbox-policy/README.zh.md)回退值解析。它只负责面向模型的部分：工具名、JSON schema、参数校验、扫描与输出上限、git 状态标记、输出格式化。所有文件读取走 `ctx.fs`；每条 git 命令走 `ctx.shell`（在解析出的工作区根上执行 `git`）；本包不直接触碰文件系统，也不自行起进程。

两个工具独立注册；只想要其中一个的产品通过配置关闭另一个（`{ repoMap: false }` / `{ gitWorkflow: false }`）。

## 工具

| 工具 | 参数 | 行为 |
|---|---|---|
| `repo_map` | `subdir?`、`focus?`、`max_files?` | 对工作区源码树做有界递归扫描（跳过 VCS 元数据、`node_modules` 与构建产物目录）。列出源码文件及其导出/顶层符号，并带 `git status --porcelain` 标记（`[M]`、`[??]`……）。`focus` 只保留路径或符号包含该子串的文件；`max_files` 限制列出数量；目录访问数达到 `maxScanDirs` 后停止遍历。只读。 |
| `git_workflow` | `action`（必填：`status` / `diff` / `commit` / `rollback`）、`message?`、`file?` | `status` 输出 `git status`；`diff` 输出完整 diff（可选限定单个 `file`）；`commit` 先暂存全部（`git add -A`）再用必填的 `message` 提交；`rollback` 执行 `git reset --hard HEAD`，丢弃所有已跟踪文件的未提交修改（危险操作；未跟踪文件保留）。 |

两个工具都把配置的协作超时预算（`timeoutMs`）作为 `ToolDefinition.timeoutMs` 交给 `@deepseek-ai/dsh-tool-call-timeout-policy`，并向每条 git 命令转发 `exec.signal`。`repo_map` 只读，允许并发调度；`git_workflow` 修改工作区，不允许。

## 配置

| 键 | 默认值 | 含义 |
|---|---|---|
| `repoMap` | `true` | 注册 `repo_map`。 |
| `gitWorkflow` | `true` | 注册 `git_workflow`。 |
| `maxFiles` | `120` | 单次 `repo_map` 调用列出的文件数上限（模型可在调用中用 `max_files` 调低）。 |
| `maxScanDirs` | `5000` | 单次 `repo_map` 扫描访问的目录数上限。 |
| `diffMaxChars` | `50000` | 单次 `git_workflow` 输出值与渲染文本的字符上限（含头部与截断提示）。 |
| `timeoutMs` | `30000` | 两个工具及每条 git 命令的协作超时预算（毫秒）。 |

所有数量/字符/超时上限必须是正整数；非法值在插件加载时立即报错。

```yaml
- id: tool-vcs
  name: '@deepseek-ai/dsh-tool-vcs'
```

## Model Experience

### 系统提示

#### 模型看到什么

本包不注册系统提示小节；每个工具的指引直接放在模型可见的 schema `description` 中。

#### Token 影响

`repo_map` 输出受 `max_files` 约束（默认 120 个文件，每个一行、最多 8 个符号），单次调用的 token 成本随配置上限而非仓库规模增长。`git_workflow` 输出受 `diffMaxChars` 约束；大改动的 `diff` 会被截断并提示模型收窄查询（例如只 diff 一个文件）。

#### KV Cache 影响

两个工具都是按需调用的只读路径；既不改动系统提示，也不在调用间改动自身 schema，因此工具使用不会破坏 KV cache 前缀。改动 `repoMap`/`gitWorkflow` 启用项、`maxFiles`（它出现在 `max_files` 的 schema 描述里）或插件生命周期会改变可见 schema，可能从第一个变动的小节起使复用失效。

## 已知限制与后续工作

- `repo_map` 按路径序列出文件；文件系统能力 seam 的 version 令牌是不透明的，本消费者拿不到按修改时间排序。
- `rollback`（`git reset --hard HEAD`）不删除未跟踪文件；未来的 `clean` 动作需要单独的安全设计。
- 符号提取是对每个语言前 400 行的固定行级正则近似，不是解析器；超过 512,000 字符的文件只列路径不提取符号。
