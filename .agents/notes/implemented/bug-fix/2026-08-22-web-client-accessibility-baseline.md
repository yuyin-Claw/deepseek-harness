# Agent Note: Web client accessibility baseline — form reset, focus ring, contrast, input label

Status: implemented

English | [中文](2026-08-22-web-client-accessibility-baseline.zh.md)

## Problem

A browser-audit of the running `dsh web` GUI surfaced several accessibility and typography defects that the token framework did not cover. Buttons rendered at the browser UA default 13.33px rather than the 14px design size because the shell never reset form-control fonts, so two type sizes coexisted across the interface. Keyboard focus fell back to the browser's default blue outline instead of the theme accent, so it read as foreign against the neon palette. Light-mode dimmed labels (`#7d6ca8` on `#f2eefc`) measured 4.02:1, below the WCAG AA 4.5:1 threshold for normal text. The composer textarea had no accessible name except in the workspace-choice state (its only `aria-label` was bound to `workspaceTrigger`), so a screen reader announced it by its placeholder alone.

## Decision

Six targeted changes, all inside the existing theme/token/UI packages:

- **Form-control font reset** in `packages/client/ui-theme/src/styles/base.css`: `button, input, select, textarea { font-family/size/line-height/color: inherit }`. This restores the 14px design size globally in one place; UA default 13.33px buttons are gone.
- **Unified keyboard focus ring** in the same stylesheet: `*:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px }`. `outline` does not shift layout; component-local `:focus-visible` rules (higher specificity) still win where a surface needs its own ring.
- **Contrast fix** in `packages/client/ui-nightcity-theme/src/client/tokens.ts`: `L_LABEL_DIMMED` from `#7d6ca8` to `#63538e` (light: 5.83:1 on base, 5.29:1 on layer-1, 4.73:1 on module) and `LABEL_DIMMED` from `#6f5fa3` to `#8b7bba` (dark: 5.35:1 on base, 5.07:1 on layer-1, 4.87:1 on module) — both palettes clear WCAG AA 4.5:1 on the common surfaces while keeping dimmed below secondary in the hierarchy.
- **Hero heading semantics** in `packages/client/ui-conversation/src/client/skeleton/EmptyHero.tsx`: the headline text is now `role="heading" aria-level={1}`, giving the SPA a single top-level heading for assistive-technology navigation without changing visual layout (the element stays a `span`, so no UA margin resets are needed).
- **Decorative icons hidden from assistive tech** in `packages/client/ui-primitives/src/icons/index.tsx`: all 70 `ic_ds_*` icon SVGs now carry `aria-hidden="true"`. They render exclusively as decorative glyphs inside buttons that already carry `aria-label` (a full-tree scan confirmed no unnamed interactive elements), so hiding them removes the screen-reader double announcement of icon plus button name. The `ui-sidebar` sidebar snapshot baseline was refreshed for this intentional output change.
- **Composer accessible name** in `packages/client/ui-conversation`: added an `input.message` key to `locales.ts` (zh `消息输入框`, en `Message input`) and changed `InputBar.tsx`'s textarea `aria-label` from `workspaceTrigger ? t('hero.chooseWorkspace') : undefined` to always resolve — workspace state keeps its own label, otherwise the message label.

The audit also investigated and deliberately left unchanged: the message column is already centered (`margin: 0 auto`) against an intentionally capped `--dsh-chat-content-width: 748px`; the model menu already ellipsizes with `white-space: nowrap` plus `title`; sidebar session titles already truncate via `flex: 1; min-width: 0` + ellipsis/nowrap; `<html lang>` already follows the active locale through the locale plugin's `syncDocumentLanguage`; and the hero backdrop image correctly uses `aria-hidden` + `alt=""` for a decorative background.

## Alternatives considered

**Font reset per component.** Rejected: the bug is a missing shell reset, not individual button styles; a per-component fix would repeat the reset and leave any unstyled control wrong.

**Focus via `box-shadow` to avoid any outline.** Rejected: component-local `outline: none` (e.g. markdown) and existing ring consumers rely on the outline forms; `outline` does not affect layout, so the ring is safe, and a `*`-level rule is the correct baseline that local rules override by specificity.

**Only fix the contrast on the base surface.** Rejected: the dimmed token is reused on raised surfaces; the chosen value clears AA on the base and sidebar layers without collapsing the secondary/dimmed distinction.

**Always label the textarea with the message text.** Rejected: the workspace-choice state needs its own announce (`hero.chooseWorkspace`), so the label is state-dependent, not constant.

## Consequences

- A single stylesheet reset removes the two-size type artifact GUI-wide, and the focus ring now matches the theme in both palettes.
- Light-mode dimmed captions (timestamps, `Preview`, `Voice input`) clear WCAG AA on the common surfaces; the value is slightly darker than before but stays visually subordinate to secondary text.
- The composer input is now announced by a stable label in both locales; the new `input.message` key is bilingual and checked against the zh key set.
- The changes are presentational; no wire, durable, or model-visible behavior changed, so no session-log or snapshot surface is affected.
