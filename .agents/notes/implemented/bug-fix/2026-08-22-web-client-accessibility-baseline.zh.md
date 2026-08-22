# Agent Note: Web 客户端可访问性基线 — 表单重置、焦点环、对比度、输入框标签

Status: implemented

[English](2026-08-22-web-client-accessibility-baseline.md) | 中文

## Problem

对运行中的 `dsh web` GUI 做浏览器审计后，发现了几处 token 框架未覆盖的可访问性与排版缺陷。按钮渲染为浏览器 UA 默认的 13.33px，而非 14px 设计字号，因为 shell 从未重置表单控件字体，导致界面上并存两套字号。键盘焦点回退到浏览器默认蓝色 outline，而不是主题强调色，在霓虹调色板下显得格格不入。浅色模式下的 dimmed 标签（`#7d6ca8` 配 `#f2eefc`）测得 4.02:1，低于普通文本 WCAG AA 的 4.5:1 阈值。composer 输入框除了工作区选择态外没有可访问名称（它唯一的 `aria-label` 绑定在 `workspaceTrigger` 上），因此屏幕阅读器只能靠 placeholder 来播报它。

## Decision

六项针对性改动，全部落在现有的 theme/token/UI 包内：

- **表单控件字体重置**，位于 `packages/client/ui-theme/src/styles/base.css`：`button, input, select, textarea { font-family/size/line-height/color: inherit }`。这在一处恢复了 14px 设计字号；UA 默认的 13.33px 按钮消失。
- **统一键盘焦点环**，位于同一样式表：`*:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px }`。`outline` 不改变布局；组件局部的 `:focus-visible` 规则（更高优先级）在需要自有焦点环的表面仍然生效。
- **对比度修复**，位于 `packages/client/ui-nightcity-theme/src/client/tokens.ts`：把 `L_LABEL_DIMMED` 从 `#7d6ca8` 改为 `#63538e`（浅色：主表面 5.83:1、layer-1 5.29:1、module 4.73:1），把 `LABEL_DIMMED` 从 `#6f5fa3` 改为 `#8b7bba`（暗色：主表面 5.35:1、layer-1 5.07:1、module 4.87:1）——两种调色板在常见表面上都清除 WCAG AA 4.5:1，同时保留 dimmed 低于 secondary 的层级。
- **Hero heading 语义**，位于 `packages/client/ui-conversation/src/client/skeleton/EmptyHero.tsx`：标题文本现在带 `role="heading" aria-level={1}`，为 SPA 提供一个顶级标题供辅助技术导航，且不改变视觉布局（元素仍是 `span`，因此无需 UA margin 重置）。
- **装饰图标对辅助技术隐藏**，位于 `packages/client/ui-primitives/src/icons/index.tsx`：70 个 `ic_ds_*` 图标 SVG 全部带 `aria-hidden="true"`。它们全部作为装饰 glyph 出现在已带 `aria-label` 的按钮内（全库扫描确认无缺名的可交互元素），隐藏它们消除屏幕阅读器对图标与按钮名的重复朗读。`ui-sidebar` 的 sidebar 快照基线随此意图内输出变化刷新。
- **Composer 可访问名称**，位于 `packages/client/ui-conversation`：在 `locales.ts` 新增 `input.message` 键（中文 `消息输入框`、英文 `Message input`），并把 `InputBar.tsx` 的 textarea `aria-label` 从 `workspaceTrigger ? t('hero.chooseWorkspace') : undefined` 改为始终解析——工作区状态保留自己的标签，否则使用消息标签。

审计还探查并刻意保留不变：消息列已经居中（`margin: 0 auto`），针对有意设上限的 `--dsh-chat-content-width: 748px`；模型菜单已用 `white-space: nowrap` 加 `title` 做省略；侧栏会话标题已通过 `flex: 1; min-width: 0` 加 ellipsis/nowrap 截断；`<html lang>` 已由 locale 插件的 `syncDocumentLanguage` 正确跟随活动 locale；hero 背景图正确使用 `aria-hidden` 加 `alt=""` 表示装饰性背景。

## Alternatives considered

**逐组件字体重置。** 不采用：缺陷是缺少 shell 重置，而非单个按钮样式；逐组件修复会重复重置，并让任何未加样式的控件仍然出错。

**焦点用 `box-shadow` 以避免任何 outline。** 不采用：组件局部的 `outline: none`（如 markdown）和现有焦点环消费方依赖 outline 形式；`outline` 不影响布局，因而焦点环是安全的，而 `*` 级规则是正确的基线，局部规则通过优先级覆盖它。

**只修主表面的对比度。** 不采用：dimmed token 会在抬升表面上复用；所选值在不破坏 secondary/dimmed 区分的前提下，在主表面和侧栏表面都清除 AA。

**始终用消息文本作为 textarea 标签。** 不采用：工作区选择态需要自己的播报（`hero.chooseWorkspace`），因此标签是状态相关的，而非恒定。

## Consequences

- 一处样式表重置就在整个 GUI 移除了两字号缺陷，焦点环现在在两种调色板下都与主题一致。
- 浅色模式 dimmed 说明文字（时间戳、`Preview`、`Voice input`）在常见表面上清除 WCAG AA；该值比以前略深，但视觉上仍然从属于次要文本。
- composer 输入框现在在两种语言下都由稳定的标签播报；新增的 `input.message` 键是双语的，并对照中文键集合检查。
- 改动是表现性的；wire、持久化或模型可见行为都没有变化，因此不涉及会话日志或快照表面。
