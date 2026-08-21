// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'
import { apply, inject } from '../src/client/index.ts'
import { NightcityHud } from '../src/client/NightcityHud.tsx'
import { NIGHTCITY_TOKENS } from '../src/client/tokens.ts'

afterEach(() => {
  cleanup()
})

/** Minimal theme service stand-in: records the one override-layer call. */
function fakeTheme() {
  const calls: Array<{ source: string; tokens: ThemeTokenOverrides }> = []
  let disposed = false
  return {
    calls,
    isDisposed: () => disposed,
    service: {
      overrideTokens(source: string, tokens: ThemeTokenOverrides): () => void {
        calls.push({ source, tokens })
        disposed = false
        return () => { disposed = true }
      },
    },
  }
}

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const theme = fakeTheme()
  ctx.reflect.provide('theme', theme.service)
  const declareHoles = () => slots.register({
    name: 'root',
    children: { 'shell.overlay': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, theme, declareHoles, disposeHoles }
}

describe('nightcity theme plugin', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['theme', 'slots'])
  })

  it('stacks one override layer and disposes it with the fiber', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()

    expect(subject.theme.calls).toHaveLength(1)
    expect(subject.theme.calls[0]?.source).toBe('ui-nightcity-theme')
    expect(subject.theme.calls[0]?.tokens).toBe(NIGHTCITY_TOKENS)
    for (const modes of Object.values(NIGHTCITY_TOKENS)) {
      expect(modes.light).toBe(modes.dark)
    }

    await fiber.dispose()
    expect(subject.theme.isDisposed()).toBe(true)
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
    const view = render(<NightcityHud {...({} as never)} />)
    const layer = view.container.firstElementChild as HTMLElement
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.childElementCount).toBe(7)
  })
})
