/**
 * Nightcity hero landing pieces: a neon brand mark for the blank-session
 * headline, a typewriter suggestion readout under the composer card, and a
 * one-shot boot chime on the first user gesture. All decorative surfaces
 * respect prefers-reduced-motion; the chime is a synthesized Web Audio
 * arpeggio, so the package ships no binary assets.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the conversation slot declarations (hero brand mark,
// input dock) and the locale Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { NightcityBrandMark } from './NightcityBrandMark.tsx'
import { TypewriterDock } from './TypewriterDock.tsx'
import { playBootChime } from './chime.ts'
import { en, zh, type NightcityHeroKey } from './locales.ts'

/** Locale namespace owning the hero landing copy. */
export const NIGHTCITY_HERO_NS = 'nightcity-hero'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The nightcity hero landing copy. */
    'nightcity-hero': NightcityHeroKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: hero dictionaries, brand-mark shadow registration
 * (priority -1: lowest renders, so it shadows any priority-0 occupant), the
 * typewriter dock entry, and the one-shot boot chime listener.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NIGHTCITY_HERO_NS, { zh, en }), 'ui-nightcity-hero: landing dictionaries')
  ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
    name: 'conversation.hero.brand.mark',
    priority: -1,
  }, NightcityBrandMark))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'nightcity-typewriter',
    order: -100,
    locale: NIGHTCITY_HERO_NS,
  }, TypewriterDock))
  // Autoplay policies require a user gesture before audio; the chime rides
  // the first pointerdown and removes its own listener.
  ctx.effect(() => {
    const onFirstGesture = (): void => {
      playBootChime()
      window.removeEventListener('pointerdown', onFirstGesture)
    }
    window.addEventListener('pointerdown', onFirstGesture)
    return () => window.removeEventListener('pointerdown', onFirstGesture)
  }, 'ui-nightcity-hero: boot chime')
}
