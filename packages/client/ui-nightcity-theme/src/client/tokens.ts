/**
 * Nightcity token palette. Values repeat across both base schemes on
 * purpose: the nightcity skin is dark-only, so a user on the light base
 * still receives the neon-dark values and legibility never depends on the
 * base palette.
 */
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Near-black violet base with cyan/magenta neon accents. */
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
const LABEL_DIMMED = '#6f5fa3'
const CODE_BLOCK = '#120b22'

/** Same value for both modes — see the module doc. */
const both = (value: string): { light: string; dark: string } => ({ light: value, dark: value })

/**
 * Alias-token overrides composing the nightcity skin.
 */
export const NIGHTCITY_TOKENS: ThemeTokenOverrides = {
  '--dsw-alias-bg-base': both(BG),
  '--dsw-alias-bg-layer-1': both(BG_LAYER),
  '--dsw-alias-bg-layer-2': both(BG_MODULE),
  '--dsw-alias-bg-layer-3': both(BG_OVERLAY),
  '--dsw-alias-bg-module-platform': both(BG_MODULE),
  '--dsw-alias-bg-overlay': both(BG_OVERLAY),
  '--dsw-alias-bg-skeleton': both(BG_SKELETON),
  '--dsw-alias-bg-multi-select': both(BG_MODULE),
  '--dsw-alias-bg-mask-drop': both('rgba(11, 7, 20, 0.72)'),
  '--dsw-alias-bg-mask-photo': both('rgba(11, 7, 20, 0.55)'),
  '--dsw-alias-border-l': both(BORDER),
  '--dsw-alias-border-inverted': both(NEON_CYAN),
  '--dsw-alias-brand-primary': both(NEON_CYAN),
  '--dsw-alias-brand-primary-invert': both('#001318'),
  '--dsw-alias-brand-text': both(NEON_CYAN),
  '--dsw-alias-button-contrast-fill': both(BG_MODULE),
  '--dsw-alias-button-elevated-fill': both(BG_OVERLAY),
  '--dsw-alias-button-floating-fill': both(BG_MODULE),
  '--dsw-alias-button-floating-hover': both(BG_OVERLAY),
  '--dsw-alias-button-ghost-active-border': both(NEON_CYAN),
  '--dsw-alias-button-ghost-active-fill': both(BG_MODULE),
  '--dsw-alias-button-ghost-active-hover': both(BG_OVERLAY),
  '--dsw-alias-button-primary-fill': both(NEON_CYAN),
  '--dsw-alias-button-primary-hover': both('#4df6ff'),
  '--dsw-alias-button-primary-dimmed': both('#0e6f7a'),
  '--dsw-alias-button-tool-bar-fill': both(BG_LAYER),
  '--dsw-alias-button-tool-bar-fill-invisible': both('transparent'),
  '--dsw-alias-button-tool-bar-hover': both(BG_MODULE),
  '--dsw-alias-interactive-bg-active': both(BG_OVERLAY),
  '--dsw-alias-interactive-bg-hover': both(BG_MODULE),
  '--dsw-alias-interactive-bg-hover-accent': both('#10283a'),
  '--dsw-alias-interactive-bg-hover-danger': both('#3a1024'),
  '--dsw-alias-interactive-bg-hover-solid': both(BG_OVERLAY),
  '--dsw-alias-label-primary': both(LABEL),
  '--dsw-alias-label-primary-foreground': both('#001318'),
  '--dsw-alias-label-primary-inverted': both('#001318'),
  '--dsw-alias-label-primary-bluish': both(NEON_CYAN),
  '--dsw-alias-label-primary-dimmed': both(LABEL_SECONDARY),
  '--dsw-alias-label-secondary': both(LABEL_SECONDARY),
  '--dsw-alias-label-tertiary': both(LABEL_DIMMED),
  '--dsw-alias-label-dimmed': both(LABEL_DIMMED),
  '--dsw-alias-label-caption': both(LABEL_DIMMED),
  '--dsw-alias-markdown-citation': both(NEON_YELLOW),
  '--dsw-alias-markdown-code-block': both(CODE_BLOCK),
  '--dsw-alias-markdown-code-block-banner': both(BG_LAYER),
  '--dsw-alias-markdown-code-segment-selected': both('#123b46'),
  '--dsw-alias-markdown-code-segment-unselected': both(BG_LAYER),
  '--dsw-alias-markdown-inline-code': both(CODE_BLOCK),
  '--dsw-alias-markdown-placeholder': both(LABEL_DIMMED),
  '--dsw-alias-markdown-tag': both(NEON_MAGENTA),
  '--dsw-alias-scrollbar-bg-l': both(BG_LAYER),
  '--dsw-alias-scrollbar-hover-l': both(BG_MODULE),
  '--dsw-alias-state-business-primary': both(NEON_CYAN),
  '--dsw-alias-state-business-tertiary': both(LABEL_SECONDARY),
  '--dsw-alias-state-error-primary': both('#ff5d7a'),
  '--dsw-alias-state-error-secondary': both('#3a1024'),
  '--dsw-alias-state-success-primary': both('#3dfbb0'),
  '--dsw-alias-state-success-secondary': both('#0d3327'),
  '--dsw-alias-state-success-tertiary': both('#1d6a52'),
  '--dsw-alias-state-warn-label': both(NEON_YELLOW),
  '--dsw-alias-state-warn-primary': both(NEON_YELLOW),
  '--dsw-alias-state-warn-secondary': both('#33290c'),
  '--dsw-alias-state-warn-tertiary': both('#6a5a1d'),
  '--dsw-alias-toast-bg': both(BG_OVERLAY),
  '--dsw-alias-tooltip-bg': both(BG_OVERLAY),
}
