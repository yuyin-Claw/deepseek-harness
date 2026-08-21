// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { NightcityHud } from '../src/client/NightcityHud.tsx'
import { nightcityStylesheet } from '../src/client/stylesheet.ts'
import { NIGHTCITY_TOKENS } from '../src/client/tokens.ts'

afterEach(() => {
  cleanup()
})

/** Loose component wrapper: feeds partial props without widening the component's own props type. */
type LooseComponent<P> = (props: P) => ReactElement | null
const loose = <P,>(component: LooseComponent<P>) => component as unknown as (props: Record<string, unknown>) => ReactElement | null

const LNightcityHud = loose(NightcityHud)

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const declareHoles = () => slots.register({
    name: 'root',
    children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, declareHoles, disposeHoles }
}

const SHEET_ID = 'nightcity-theme-override'

describe('nightcity theme plugin', () => {
  it('declares only the slot service (the skin is plain CSS)', () => {
    expect(inject).toEqual(['slots'])
  })

  it('installs one stylesheet with both schemes and removes it with the fiber', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()

    const sheet = document.getElementById(SHEET_ID)
    expect(sheet?.textContent).toBe(nightcityStylesheet(NIGHTCITY_TOKENS))
    expect(sheet?.textContent).toContain('body {')
    expect(sheet?.textContent).toContain('body[data-ds-dark-theme] {')

    await fiber.dispose()
    expect(document.getElementById(SHEET_ID)).toBeNull()
  })

  it('adds the hud overlay entry and removes it with the fiber', async () => {
    const before = await bench()
    const fiber = before.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(before.slots.entries('shell.overlay').map(entry => entry.options.id)).toContain('nightcity-hud')

    await fiber.dispose()
    expect(before.slots.entries('shell.overlay').map(entry => entry.options.id)).not.toContain('nightcity-hud')

    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    expect(after.slots.entries('shell.overlay')).toHaveLength(0)
    after.declareHoles()
    await Promise.resolve()
    expect(after.slots.entries('shell.overlay').map(entry => entry.options.id)).toContain('nightcity-hud')
  })

  it('renders the atmosphere as one aria-hidden layer', () => {
    const view = render(<LNightcityHud />)
    const layer = view.container.firstElementChild as HTMLElement
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.childElementCount).toBe(7)
  })
})

describe('nightcity stylesheet', () => {
  it('carries both scheme values for every token', () => {
    const sheet = nightcityStylesheet(NIGHTCITY_TOKENS)
    for (const [name, modes] of Object.entries(NIGHTCITY_TOKENS)) {
      expect(sheet).toContain(`${name}: ${modes.light};`)
      expect(sheet).toContain(`${name}: ${modes.dark};`)
    }
    // The base token must flip between schemes so the attribute cascade moves it.
    expect(NIGHTCITY_TOKENS['--dsw-alias-bg-base']?.light)
      .not.toBe(NIGHTCITY_TOKENS['--dsw-alias-bg-base']?.dark)
  })
})
