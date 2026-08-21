// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { type ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { PersonaPlate, moodOf } from '../src/client/PersonaPlate.tsx'
import { zh } from '../src/client/locales.ts'

/** Loose component wrapper: feeds partial props without widening the component's own props type. */
type LooseComponent<P> = (props: P) => ReactElement | null
const loose = <P,>(component: LooseComponent<P>) => component as unknown as (props: Record<string, unknown>) => ReactElement | null

afterEach(() => {
  cleanup()
})

/** Minimal locale service stand-in. */
function fakeLocale() {
  const registered: unknown[] = []
  return {
    registered,
    service: {
      register(_ns: string, dictionaries: unknown): () => void {
        registered.push(dictionaries)
        return () => {}
      },
    },
  }
}

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const locale = fakeLocale()
  ctx.reflect.provide('locale', locale.service)
  const declareHoles = () => slots.register({
    name: 'root',
    children: { 'conversation.composer.dock': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, locale, declareHoles, disposeHoles }
}

const LPersonaPlate = loose(PersonaPlate)

describe('nightcity persona plugin', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers dictionaries and the dock entry, removing them on teardown', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(subject.locale.registered).toHaveLength(1)
    expect(subject.slots.entries('conversation.composer.dock').map(e => e.options.id)).toContain('nightcity-persona')
    await fiber.dispose()
    expect(subject.slots.entries('conversation.composer.dock').map(e => e.options.id)).not.toContain('nightcity-persona')
  })

  it('maps every input phase to a persona', () => {
    expect(moodOf(undefined)).toBe('netrunner')
    expect(moodOf('plain')).toBe('netrunner')
    expect(moodOf('adjudicating')).toBe('operator')
    expect(moodOf('claimed')).toBe('operator')
    expect(moodOf('submitting')).toBe('operator')
  })

  it('shows the netrunner while plain and the operator while submitting', () => {
    const t = (key: string): string => zh[key as keyof typeof zh]
    const plain = render(<LPersonaPlate t={t} input={{ phase: 'plain' }} />)
    expect(plain.container.textContent).toContain(zh['persona.netrunner.name'])
    // The user side renders the real CG portrait, cover-fit in the plate frame.
    const userPortrait = plain.container.querySelector('img')
    expect(userPortrait?.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/)
    expect(userPortrait?.getAttribute('aria-hidden')).toBe('true')

    const busy = render(<LPersonaPlate t={t} input={{ phase: 'submitting' }} />)
    expect(busy.container.textContent).toContain(zh['persona.operator.name'])
    // The operator side renders its own supplied CG portrait.
    const operatorPortrait = busy.container.querySelector('img')
    expect(operatorPortrait?.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/)
  })
})
