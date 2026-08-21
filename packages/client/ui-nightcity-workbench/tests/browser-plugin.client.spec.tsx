// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, act } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { WorkbenchView } from '../src/client/WorkbenchView.tsx'
import { isTerminalCall, paneOf } from '../src/client/panes.ts'
import { zh } from '../src/client/locales.ts'

/** Loose component wrapper: feeds partial props without widening the component's own props type. */
type LooseComponent<P> = (props: P) => ReactElement | null
const loose = <P,>(component: LooseComponent<P>) => component as unknown as (props: Record<string, unknown>) => ReactElement | null

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Minimal locale service stand-in. */
function fakeLocale() {
  const registered: unknown[] = []
  const bindCalls: string[] = []
  return {
    registered,
    bindCalls,
    service: {
      register(_ns: string, dictionaries: unknown): () => void {
        registered.push(dictionaries)
        return () => {}
      },
      bind: (ns: string) => {
        bindCalls.push(ns)
        return (key: string): string => key
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
    children: { 'conversation.view': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, locale, declareHoles, disposeHoles }
}

/** Session selector stub: one mutable snapshot the view subscribes to. */
function sessionOf(snapshot: { runningCalls?: { name: string }[]; running?: boolean; queue?: unknown[] }) {
  let current = {
    runningCalls: snapshot.runningCalls ?? [],
    running: snapshot.running ?? false,
    queue: snapshot.queue ?? [],
  }
  const listeners = new Set<() => void>()
  const source = {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    getSnapshot: () => current,
  }
  const bound = bindSnapshotSelector(source)
  return {
    set(next: Partial<typeof current>): void {
      current = { ...current, ...next }
      for (const listener of listeners) listener()
    },
    useSession: (selector: (s: typeof current) => unknown) =>
      bound(selector as (s: typeof current) => typeof current extends never ? never : unknown) as never,
  }
}

const LWorkbenchView = loose(WorkbenchView)

describe('workbench pane derivation', () => {
  it('classifies terminal-family tool names', () => {
    expect(isTerminalCall('bash')).toBe(true)
    expect(isTerminalCall('TerminalSession')).toBe(true)
    expect(isTerminalCall('web_search')).toBe(false)
  })

  it('prefers execution, then trajectory, then conversation', () => {
    expect(paneOf([])).toBe('conversation')
    expect(paneOf([{ name: 'read' }])).toBe('trajectory')
    expect(paneOf([{ name: 'read' }, { name: 'bash' }])).toBe('execution')
  })
})

describe('nightcity workbench plugin', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the view tab with a locale-bound label, removing it on teardown', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(subject.locale.registered).toHaveLength(1)
    expect(subject.locale.bindCalls).toContain('nightcity-workbench')
    const ids = subject.slots.entries('conversation.view').map(e => e.options.id)
    expect(ids).toContain('nightcity-workbench')
    await fiber.dispose()
    expect(subject.slots.entries('conversation.view').map(e => e.options.id)).not.toContain('nightcity-workbench')
  })

  it('contributes after a late declaration', async () => {
    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    after.declareHoles()
    await Promise.resolve()
    expect(after.slots.entries('conversation.view').map(e => e.options.id)).toContain('nightcity-workbench')
  })
})

describe('WorkbenchView', () => {
  const t = (key: string): string => zh[key as keyof typeof zh] ?? key

  it('auto-switches panes with the live turn', async () => {
    const session = sessionOf({})
    const view = render(<LWorkbenchView t={t} useSession={session.useSession} />)
    expect(view.container.textContent).toContain(zh['pane.conversation.idle'])

    act(() => { session.set({ runningCalls: [{ name: 'bash' }], running: true }) })
    expect(view.container.textContent).toContain(zh['pane.execution.active'])
    expect(view.container.textContent).toContain('bash')

    act(() => { session.set({ runningCalls: [{ name: 'subagent' }] }) })
    expect(view.container.textContent).toContain(zh['pane.trajectory.active'])
  })

  it('keeps a manual pane pick until auto-switch is re-armed', async () => {
    const session = sessionOf({ running: true })
    const view = render(<LWorkbenchView t={t} useSession={session.useSession} />)
    await act(async () => { view.getByText(zh['pane.trajectory']).click() })
    act(() => { session.set({ runningCalls: [{ name: 'bash' }] }) })
    expect(view.container.textContent).toContain(zh['pane.trajectory.idle'])

    await act(async () => { view.getByRole('switch').click() })
    expect(view.container.textContent).toContain(zh['pane.execution.active'])
  })

  it('shows the queued-message count on the conversation pane', () => {
    const session = sessionOf({ queue: [{}, {}] })
    const view = render(<LWorkbenchView t={t} useSession={session.useSession} />)
    expect(view.container.textContent).toContain('2')
  })
})

describe('nightcity workbench coverage companions', () => {
  afterEach(() => {
    cleanup()
  })

  it('binds the tab label through the locale thunk', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = subject.slots.entries('conversation.view').find(e => e.options.id === 'nightcity-workbench')
    const label = (entry?.options as { label?: () => string }).label
    expect(label?.()).toBe('view.workbench')
    await fiber.dispose()
  })

  it('shows the idle execution readout on a manual execution pick', async () => {
    const session = sessionOf({})
    const t = (key: string): string => zh[key as keyof typeof zh] ?? key
    const view = render(<LWorkbenchView t={t} useSession={session.useSession} />)
    await act(async () => { view.getByText(zh['pane.execution']).click() })
    expect(view.container.textContent).toContain(zh['pane.execution.idle'])
  })
})
