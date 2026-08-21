/**
 * Neon skyline brand mark for the blank-session hero headline. A pure SVG
 * silhouette — no binary asset — sized by the owner share's `size` prop.
 */
import type { ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/** Brand-mark props: the hero owner share arrives through the runtime share. */
export type NightcityBrandMarkProps = PropsRuntime<'conversation.hero.brand.mark'>

/**
 * Render the nightcity brand mark.
 * @param props - carries `size` and the host `className` from the hero owner.
 * @returns the SVG skyline mark.
 */
export function NightcityBrandMark(props: NightcityBrandMarkProps): ReactElement {
  return (
    <svg
      className={props.className}
      width={props.size}
      height={props.size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Nightcity"
    >
      <defs>
        <linearGradient id="nc-hero-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00f0ff" />
          <stop offset="1" stopColor="#ff2bd6" />
        </linearGradient>
      </defs>
      <path
        d="M6 52 L6 30 L14 30 L14 20 L22 20 L22 34 L30 34 L30 12 L40 12 L40 26 L48 26 L48 18 L58 18 L58 52 Z"
        fill="url(#nc-hero-mark)"
        fillOpacity="0.9"
      />
      <rect x="6" y="52" width="52" height="3" fill="#00f0ff" fillOpacity="0.8" />
      <rect x="33" y="2" width="2" height="6" fill="#f5e663" />
    </svg>
  )
}
