/**
 * Nightcity override stylesheet: both scheme values of every token, the
 * light value on `:root` and the dark value behind the base palette's
 * `body[data-ds-dark-theme]` activation attribute — the same contract the
 * shipped palettes use, so activation stays attribute-only.
 */
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** The base palette's dark-scheme activation attribute selector. */
const DARK_SELECTOR = 'body[data-ds-dark-theme]'

/**
 * Compose the override stylesheet text.
 * @param tokens - token-name → per-scheme value pairs.
 * @returns one stylesheet string carrying both schemes.
 */
export function nightcityStylesheet(tokens: ThemeTokenOverrides): string {
  const declarations = (scheme: 'light' | 'dark'): string =>
    Object.entries(tokens)
      .map(([name, modes]) => `  ${name}: ${modes[scheme]};`)
      .join('\n')
  return `:root {\n${declarations('light')}\n}\n${DARK_SELECTOR} {\n${declarations('dark')}\n}\n`
}
