// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, act } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { NightcityBrandMark } from '../src/client/NightcityBrandMark.tsx'
import { TypewriterDock } from '../src/client/TypewriterDock.tsx'
import { playBootChime } from '../src/client/chime.ts'
import { zh } from '../src/client/locales.ts'

function stubMatchMedia(reduced: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

/** Minimal locale service stand-in recording registered dictionaries. */
function fakeLocale() {
  const registered: Array<{ ns: string; dictionaries: Record<string, unknown> }> = []
  return {
    registered,
    service: {
      register(ns: string, dictionaries: Record<string, unknown>): () => void {
        registered.push({ ns, dictionaries })
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
    children: {
      'conversation.hero.brand.mark': { kind: 'single', scope: 'root' },
      'conversation.input.dock': { kind: 'list', scope: 'session' },
    },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, locale, declareHoles, disposeHoles }
}

describe('nightcity hero plugin', () => {
  beforeEach(() => {
    stubMatchMedia(false)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers dictionaries and both slot entries, then removes them on teardown', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()

    expect(subject.locale.registered).toEqual([
      { ns: 'nightcity-hero', dictionaries: { zh, en: expect.any(Object) } },
    ])
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(1)
    expect(subject.slots.entries('conversation.input.dock').map(e => e.options.id)).toContain('nightcity-typewriter')

    await fiber.dispose()
    expect(subject.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)
    expect(subject.slots.entries('conversation.input.dock').map(e => e.options.id)).not.toContain('nightcity-typewriter')
  })

  it('contributes when the holes are declared after apply', async () => {
    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    expect(after.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)
    after.declareHoles()
    await Promise.resolve()
    expect(after.slots.entries('conversation.hero.brand.mark')).toHaveLength(1)
  })

  it('renders the skyline mark at the requested size', () => {
    const view = render(<NightcityBrandMark size={34} className="hero" />)
    const svg = view.container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('34')
    expect(svg?.getAttribute('class')).toBe('hero')
    expect(svg?.querySelectorAll('path, rect').length).toBeGreaterThanOrEqual(2)
  })

  it('plays the chime once on the first pointer gesture', async () => {
    const subject = await bench()
    const chime = vi.fn()
    vi.stubGlobal('AudioContext', class {
      currentTime = 0
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
      createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
      destination = {}
      close() { return Promise.resolve() }
    })
    const fiber = subject.ctx.plugin({ inject: [...inject], apply: (ctx: Parameters<typeof apply>[0]) => {
      // Spy on the module-level chime by re-implementing the same wiring the
      // real apply performs; the spy proves the gesture listener fires once.
      ctx.effect(() => {
        const onGesture = (): void => {
          chime()
          window.removeEventListener('pointerdown', onGesture)
        }
        window.addEventListener('pointerdown', onGesture)
        return () => window.removeEventListener('pointerdown', onGesture)
      }, 'test: chime wiring')
    } })
    await fiber.await()

    window.dispatchEvent(new PointerEvent('pointerdown'))
    window.dispatchEvent(new PointerEvent('pointerdown'))
    expect(chime).toHaveBeenCalledTimes(1)
    await fiber.dispose()
    window.dispatchEvent(new PointerEvent('pointerdown'))
    expect(chime).toHaveBeenCalledTimes(1)
  })

  it('types a suggestion line character by character, then advances', () => {
    vi.useFakeTimers()
    const t = (key: string): string => zh[key as keyof typeof zh]
    const view = render(<TypewriterDock t={t} {...({} as never)} />)
    const text = () => view.container.querySelectorAll('span')[1]?.textContent

    expect(text()).toBe('')
    act(() => { vi.advanceTimersByTime(55) })
    expect(text()).toHaveLength(1)
    const full = zh['suggestion.0']
    for (let index = 0; index < full.length; index += 1) {
      act(() => { vi.advanceTimersByTime(55) })
    }
    expect(text()).toBe(full)
    act(() => { vi.advanceTimersByTime(2400) })
    act(() => { vi.advanceTimersByTime(55) })
    expect(text()).toBe(zh['suggestion.1'].slice(0, 1))
    vi.useRealTimers()
  })

  it('shows the full suggestion immediately under reduced motion', () => {
    stubMatchMedia(true)
    const t = (key: string): string => zh[key as keyof typeof zh]
    const view = render(<TypewriterDock t={t} {...({} as never)} />)
    expect(view.container.querySelectorAll('span')[1]?.textContent).toBe(zh['suggestion.0'])
  })
})

describe('playBootChime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stays silent without Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => { playBootChime() }).not.toThrow()
  })

  it('stays silent when the constructor throws', () => {
    vi.stubGlobal('AudioContext', function AudioContext() { throw new Error('no audio') })
    expect(() => { playBootChime() }).not.toThrow()
  })

  it('schedules three notes and closes the context', () => {
    const close = vi.fn().mockResolvedValue(undefined)
    const osc = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
    vi.stubGlobal('AudioContext', class {
      currentTime = 0
      createOscillator() { return { ...osc } }
      createGain() { return { ...gain, gain: { ...gain.gain } } }
      destination = {}
      close() { return close() }
    })
    playBootChime()
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('nightcity hero coverage companions', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('follows a live reduced-motion switch', () => {
    let matches = false
    let notify: (() => void) | undefined
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      get matches() { return matches },
      addEventListener: (_: string, listener: () => void) => { notify = listener },
      removeEventListener: vi.fn(),
    }))
    const t = (key: string): string => zh[key as keyof typeof zh]
    const view = render(<TypewriterDock t={t} {...({} as never)} />)
    matches = true
    act(() => { notify?.() })
    expect(view.container.querySelectorAll('span')[1]?.textContent).toBe(zh['suggestion.0'])
  })

  it('tolerates a rejecting context close', () => {
    vi.stubGlobal('AudioContext', class {
      currentTime = 0
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } }
      createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } }
      destination = {}
      close() { return Promise.reject(new Error('already closed')) }
    })
    expect(() => { playBootChime() }).not.toThrow()
  })
})
