# Agent Note: vcs 工具 —— repo_map 与 git_workflow 成为正式包

Status: implemented

[English](2026-08-17-vcs-tools-repo-map-git-workflow.md) | 中文

## 问题

会话级动态原型验证了两个面向模型的工作流——grep/read 之前先看的仓库地图，以及 Aider 式 git 循环（status / diff / commit / rollback）。动态包无法发布：随进程消失、没有 Config 校验、没有测试与文档。这两个工具需要正式归宿，而现有家族无一拥有 VCS 职责。

## 决策

新建 `packages/vcs/` 家族与唯一的包 `@deepseek-ai/dsh-tool-vcs`（`tool-vcs`），参照 `web/` 家族的能力到工具拆分但收敛为单一工具包（不新增 service seam：两个工具都消费既有的 `ctx.fs`、`ctx.shell`、`ctx.sandboxPolicy`，单独的 Service Definition 只会有一个消费者且没有 provider）。

- `repo_map`：经 `ctx.fs.listDir` 的有界递归扫描（跳过 VCS 元数据、`node_modules` 与构建产物目录），按固定行正则提取每个文件的导出符号，经 `ctx.shell` 取 `git status` 标记。模型参数 `subdir` / `focus` / `max_files`；部署上限 `maxFiles`（默认 120）与 `maxScanDirs`（默认 5000）。
- `git_workflow`：在每次调用的工作区根（会话 cwd，否则 `sandboxPolicy.resolve().workspaceRoot`）经 `ctx.shell` 执行 `status` / `diff` / `commit` / `rollback`。`commit` 先全量暂存再以必填 message 提交；`rollback` 是 `git reset --hard HEAD`。输出受 `diffMaxChars`（默认 50,000）截断并附截断提示。

shell 词以单引号包裹（`'\''` 转义），提交信息无法在命令行展开。

## 备选方案

- **`vcs` 能力 seam（Service Definition + provider）**：两个工具是唯一消费者且 fs/shell seam 已拥有底层访问；seam 只会增加无人使用的角色。
- **超大列表落盘**（动态原型行为）：包改为在 `max_files` 处内联截断提示，工具保持无副作用。
- **按修改时间排序**（动态原型行为）：文件系统 seam 的版本 token 对消费者不透明，列表按路径序（记为 Known Limitation）。

## 后果

- 工具描述为英文，与已发布工具包一致；动态原型的中文文本不被钉住。
- `tsconfig.base.json` 的 `@deepseek-ai/dsh-*` 通配 paths 列表新增 `packages/vcs/*/src`（及 `/invariant.ts` 伴生列表），这是包在源码面可解析的关键。
- 测试挂载真实 registry、`dsh-fs-local`、`dsh-subprocess-local`、`dsh-bash-local`、`dsh-sandbox-policy`，对 OS 临时目录中一次性 `git init` 夹具重放（macOS/Linux 可重放，不依赖本仓库任何检出），含 fiber 销毁移除与 fail-loud Config 校验。
