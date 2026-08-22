/**
 * Nightcity token palette. Dark mode is the signature near-black neon skin;
 * light mode is a pale-lavender counterpart with ink-violet text so the
 * base-palette switch keeps working (the alias tokens flip between modes —
 * the skin rides on top of the base theme rather than replacing it).
 */
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Dark neon palette: near-black violet base, cyan/magenta accents. */
const BG = '#0b0714'
const BG_LAYER = '#140d24'
const BG_MODULE = '#191030'
const BG_OVERLAY = '#1d1235'
const BG_SKELETON = '#241640'
const BORDER = '#3b2a66'
const NEON_CYAN = '#00f0ff'
const NEON_MAGENTA = '#ff2bd6'
const NEON_YELLOW = '#f5e663'
const LABEL = '#e8e3ff'
const LABEL_SECONDARY = '#a99cd6'
const LABEL_DIMMED = '#8b7bba'
const CODE_BLOCK = '#120b22'

/** Light neon palette: pale lavender surfaces, ink-violet text, deepened accents. */
const L_BG = '#f2eefc'
const L_BG_LAYER = '#e9e2f8'
const L_BG_MODULE = '#dfd5f2'
const L_BG_OVERLAY = '#d5c8ee'
const L_BG_SKELETON = '#cbbde8'
const L_BORDER = '#b6a4dd'
const L_NEON_CYAN = '#007c8f'
const L_NEON_MAGENTA = '#b01791'
const L_NEON_YELLOW = '#8a7a00'
const L_LABEL = '#241a3a'
const L_LABEL_SECONDARY = '#55447e'
const L_LABEL_DIMMED = '#63538e'
const L_CODE_BLOCK = '#e6ddf6'

/** Dark-mode value paired with a light-mode counterpart. */
const pair = (light: string, dark: string): { light: string; dark: string } => ({ light, dark })

/**
 * Alias-token overrides composing the nightcity skin.
 */
export const NIGHTCITY_TOKENS: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': pair(L_BG, BG),
  '--dsw-alias-bg-layer-1': pair(L_BG_LAYER, BG_LAYER),
  '--dsw-alias-bg-layer-2': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-bg-layer-3': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-bg-module-platform': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-bg-overlay': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-bg-skeleton': pair(L_BG_SKELETON, BG_SKELETON),
  '--dsw-alias-bg-multi-select': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-bg-mask-drop': pair('rgba(242, 238, 252, 0.72)', 'rgba(11, 7, 20, 0.72)'),
  '--dsw-alias-bg-mask-photo': pair('rgba(242, 238, 252, 0.55)', 'rgba(11, 7, 20, 0.55)'),
  '--dsw-alias-border-l': pair(L_BORDER, BORDER),
  '--dsw-alias-border-inverted': pair(L_LABEL, LABEL),
  '--dsw-alias-brand-primary': pair(L_NEON_CYAN, NEON_CYAN),
  '--dsw-alias-brand-primary-invert': pair('#f0fbff', '#001318'),
  '--dsw-alias-brand-text': pair(L_NEON_CYAN, NEON_CYAN),
  '--dsw-alias-button-contrast-fill': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-button-elevated-fill': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-button-floating-fill': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-button-floating-hover': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-button-ghost-active-border': pair(L_NEON_CYAN, NEON_CYAN),
  '--dsw-alias-button-ghost-active-fill': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-button-ghost-active-hover': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-button-primary-fill': pair(L_NEON_CYAN, NEON_CYAN),
  '--dsw-alias-button-primary-hover': pair('#00606e', '#4df6ff'),
  '--dsw-alias-button-primary-dimmed': pair('#9ec4cc', '#0e6f7a'),
  '--dsw-alias-button-tool-bar-fill': pair(L_BG_LAYER, BG_LAYER),
  '--dsw-alias-button-tool-bar-fill-invisible': pair('transparent', 'transparent'),
  '--dsw-alias-button-tool-bar-hover': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-interactive-bg-active': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-interactive-bg-hover': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-interactive-bg-hover-accent': pair('#d3ecf4', '#10283a'),
  '--dsw-alias-interactive-bg-hover-danger': pair('#f4d3dd', '#3a1024'),
  '--dsw-alias-interactive-bg-hover-solid': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-label-primary': pair(L_LABEL, LABEL),
  '--dsw-alias-label-primary-foreground': pair('#f0fbff', '#001318'),
  '--dsw-alias-label-primary-inverted': pair('#f0fbff', '#001318'),
  '--dsw-alias-label-primary-bluish': pair(L_NEON_CYAN, NEON_CYAN),
  '--dsw-alias-label-primary-dimmed': pair(L_LABEL_SECONDARY, LABEL_SECONDARY),
  '--dsw-alias-label-secondary': pair(L_LABEL_SECONDARY, LABEL_SECONDARY),
  '--dsw-alias-label-tertiary': pair(L_LABEL_DIMMED, LABEL_DIMMED),
  '--dsw-alias-label-dimmed': pair(L_LABEL_DIMMED, LABEL_DIMMED),
  '--dsw-alias-label-caption': pair(L_LABEL_DIMMED, LABEL_DIMMED),
  '--dsw-alias-markdown-citation': pair(L_NEON_YELLOW, NEON_YELLOW),
  '--dsw-alias-markdown-code-block': pair(L_CODE_BLOCK, CODE_BLOCK),
  '--dsw-alias-markdown-code-block-banner': pair(L_BG_LAYER, BG_LAYER),
  '--dsw-alias-markdown-code-segment-selected': pair('#cfe9f0', '#123b46'),
  '--dsw-alias-markdown-code-segment-unselected': pair(L_BG_LAYER, BG_LAYER),
  '--dsw-alias-markdown-inline-code': pair(L_CODE_BLOCK, CODE_BLOCK),
  '--dsw-alias-markdown-placeholder': pair(L_LABEL_DIMMED, LABEL_DIMMED),
  '--dsw-alias-markdown-tag': pair(L_NEON_MAGENTA, NEON_MAGENTA),
  '--dsw-alias-scrollbar-bg-l': pair(L_BG_LAYER, BG_LAYER),
  '--dsw-alias-scrollbar-hover-l': pair(L_BG_MODULE, BG_MODULE),
  '--dsw-alias-state-business-primary': pair(L_NEON_CYAN, NEON_CYAN),
  '--dsw-alias-state-business-tertiary': pair(L_LABEL_SECONDARY, LABEL_SECONDARY),
  '--dsw-alias-state-error-primary': pair('#b32747', '#ff5d7a'),
  '--dsw-alias-state-error-secondary': pair('#f4d3dd', '#3a1024'),
  '--dsw-alias-state-success-primary': pair('#0d7a52', '#3dfbb0'),
  '--dsw-alias-state-success-secondary': pair('#d3ecdf', '#0d3327'),
  '--dsw-alias-state-success-tertiary': pair('#6aa88b', '#1d6a52'),
  '--dsw-alias-state-warn-label': pair(L_NEON_YELLOW, NEON_YELLOW),
  '--dsw-alias-state-warn-primary': pair(L_NEON_YELLOW, NEON_YELLOW),
  '--dsw-alias-state-warn-secondary': pair('#f0e8c8', '#33290c'),
  '--dsw-alias-state-warn-tertiary': pair('#a89a52', '#6a5a1d'),
  '--dsw-alias-toast-bg': pair(L_BG_OVERLAY, BG_OVERLAY),
  '--dsw-alias-tooltip-bg': pair(L_BG_OVERLAY, BG_OVERLAY),
}
