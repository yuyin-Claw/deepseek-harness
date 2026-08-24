// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { type ReactElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
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

  it('maps turn facts to a persona', () => {
    expect(moodOf(undefined)).toBe('netrunner')
    expect(moodOf('plain')).toBe('netrunner')
    expect(moodOf('adjudicating')).toBe('operator')
    expect(moodOf('claimed')).toBe('operator')
    expect(moodOf('submitting')).toBe('operator')
    // Subagent-family tool activity wins over the input phase.
    expect(moodOf('plain', [{ name: 'subagent_fork' }])).toBe('subagent')
    expect(moodOf('submitting', [{ name: 'web_search' }])).toBe('operator')
    expect(moodOf('submitting', [{ name: 'subagent' }])).toBe('subagent')
  })

  it('shows the netrunner, operator, and subagent personas with their CG portraits', () => {
    const t = (key: string): string => zh[key as keyof typeof zh]
    const stub = (running: { name: string }[]) => sessionsOf(running).useSession

    const plain = render(<LPersonaPlate t={t} input={{ phase: 'plain' }} useSession={stub([])} />)
    expect(plain.container.textContent).toContain(zh['persona.netrunner.name'])
    expect(plain.container.querySelector('img')?.getAttribute('aria-hidden')).toBe('true')

    const busy = render(<LPersonaPlate t={t} input={{ phase: 'submitting' }} useSession={stub([])} />)
    expect(busy.container.textContent).toContain(zh['persona.operator.name'])
    expect(busy.container.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/)

    const crew = render(
      <LPersonaPlate t={t} input={{ phase: 'plain' }} useSession={stub([{ name: 'subagent_fork' }])} />,
    )
    expect(crew.container.textContent).toContain(zh['persona.subagent.name'])
    expect(crew.container.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/)
  })
})

/** Session selector stub carrying a fixed running-call table. */
function sessionsOf(running: { name: string }[]) {
  const source = {
    subscribe: () => () => {},
    getSnapshot: () => ({ runningCalls: running }),
  }
  return { useSession: bindSnapshotSelector(source) as never }
}
