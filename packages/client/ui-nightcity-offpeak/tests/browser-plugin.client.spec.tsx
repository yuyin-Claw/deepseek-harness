// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, act } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { OffpeakRow, statusKeyOf } from '../src/client/OffpeakRow.tsx'
import { createOffpeakRowStore } from '../src/client/settings-store.ts'
import { zh } from '../src/client/locales.ts'
import {
  activePeakWindow, beijingMinutes, isOffPeakWindow,
} from '../src/offpeak-settings.ts'

/** Loose component wrapper: feeds partial props without widening the component's own props type. */
type LooseComponent<P> = (props: P) => ReactElement | null
const loose = <P,>(component: LooseComponent<P>) => component as unknown as (props: Record<string, unknown>) => ReactElement | null

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Minimal settings-scope stand-in: one durable boolean. */
function fakeSettingsScope(enabled: boolean) {
  const listeners: Array<() => void> = []
  const calls: unknown[] = []
  return {
    calls,
    service: {
      bind: () => ({
        getSnapshot: () => ({ value: { enabled }, revision: 0 }),
        subscribe: (listener: () => void) => {
          listeners.push(listener)
          return () => {}
        },
        set: (field: string, value: unknown) => {
          calls.push({ field, value })
          return Promise.resolve()
        },
      }),
    },
  }
}

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

async function bench(enabled = false, declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const scope = fakeSettingsScope(enabled)
  const locale = fakeLocale()
  ctx.reflect.provide('settingsScope', scope.service)
  ctx.reflect.provide('locale', locale.service)
  const declareHoles = () => slots.register({
    name: 'root',
    children: { 'settings.general.item': { kind: 'list', scope: 'root' } },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, scope, locale, declareHoles, disposeHoles }
}

const LOffpeakRow = loose(OffpeakRow)

describe('offpeak schedule model', () => {
  it('converts instants to Beijing minutes', () => {
    expect(beijingMinutes(new Date('2026-08-21T16:30:00Z'))).toBe(30)
    expect(beijingMinutes(new Date('2026-08-21T20:00:00Z'))).toBe(4 * 60)
  })

  it('classifies peak and off-peak instants', () => {
    const peak = new Date('2026-08-21T03:30:00Z') // Beijing 11:30
    const off = new Date('2026-08-21T13:30:00Z') // Beijing 21:30
    expect(activePeakWindow(peak)?.endMinutes).toBe(12 * 60)
    expect(isOffPeakWindow(off)).toBe(true)
    expect(isOffPeakWindow(peak)).toBe(false)
  })
})

describe('nightcity offpeak plugin', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale', 'settingsScope'])
  })

  it('registers the general-item row and writes through the scope', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(subject.slots.entries('settings.general.item').map(e => e.options.id)).toContain('nightcity-offpeak')
    expect(subject.locale.registered).toHaveLength(1)
    await fiber.dispose()
    expect(subject.slots.entries('settings.general.item').map(e => e.options.id)).not.toContain('nightcity-offpeak')
  })

  it('names the schedule phase in the status key', () => {
    expect(statusKeyOf(new Date('2026-08-21T03:30:00Z'))).toBe('offpeak.status.paused.morning')
    expect(statusKeyOf(new Date('2026-08-21T08:30:00Z'))).toBe('offpeak.status.paused.afternoon')
    expect(statusKeyOf(new Date('2026-08-21T13:30:00Z'))).toBe('offpeak.status.running')
  })

  it('renders the row from the store and toggles the durable setting', () => {
    vi.setSystemTime(new Date('2026-08-21T03:30:00Z'))
    const store = createOffpeakRowStore().create()
    store.actions.sync(true, 0)
    const setEnabled = vi.fn()
    const t = (key: string): string => zh[key as keyof typeof zh]
    const view = render(
      <LOffpeakRow
        t={t}
        setEnabled={setEnabled}
        useStore={bindSnapshotSelector(store)}

      />,
    )
    const control = view.getByRole('switch')
    expect(control.getAttribute('aria-checked')).toBe('true')
    expect(view.container.textContent).toContain(zh['offpeak.status.paused.morning'])
    act(() => { control.click() })
    expect(setEnabled).toHaveBeenCalledWith(false)
  })
})

describe('nightcity offpeak inject face', () => {
  afterEach(() => {
    cleanup()
  })

  it('bakes the store, hands actions to the inject factory, and writes through the scope', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = subject.slots.entries('settings.general.item').find(e => e.options.id === 'nightcity-offpeak')
    expect(entry).toBeDefined()
    const handle = entry?.store as ReturnType<typeof createOffpeakRowStore>
    const instance = handle.create()
    const face = (entry?.inject as unknown as (actions: typeof instance.actions)
    => { setEnabled: (enabled: boolean) => void })(instance.actions)
    face.setEnabled(true)
    expect(subject.scope.calls).toEqual([{ field: 'enabled', value: true }])

    // The stale-revision guard drops an older adoption.
    instance.actions.sync(true, 5)
    instance.actions.sync(false, 3)
    expect(instance.store.getSnapshot().enabled).toBe(true)

    await fiber.dispose()
  })
})

describe('nightcity offpeak adoption arms', () => {
  afterEach(() => {
    cleanup()
  })

  it('adopts an absent document without writing anything', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.get('slots') as SlotRegistry
    ctx.reflect.provide('locale', fakeLocale().service)
    ctx.reflect.provide('settingsScope', {
      bind: () => ({
        getSnapshot: () => ({ value: undefined, revision: undefined }),
        subscribe: () => () => {},
        set: () => Promise.resolve(),
      }),
    })
    slots.register({
      name: 'root',
      children: { 'settings.general.item': { kind: 'list', scope: 'root' } },
    } as never, () => null)
    const fiber = await ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('settings.general.item').map(e => e.options.id)).toContain('nightcity-offpeak')
    await fiber.dispose()
  })

  it('renders the row disarmed without the status line', () => {
    const store = createOffpeakRowStore().create()
    store.actions.sync(false, 0)
    const t = (key: string): string => zh[key as keyof typeof zh]
    const view = render(
      <LOffpeakRow t={t} setEnabled={() => {}} useStore={bindSnapshotSelector(store)} />,
    )
    expect(view.container.textContent).not.toContain(zh['offpeak.status.running'])
  })
})
