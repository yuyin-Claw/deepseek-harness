// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, act } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '../src/client/index.ts'
import { VoiceMicButton } from '../src/client/VoiceMicButton.tsx'
import { finalTranscript, speechRecognitionCtor } from '../src/client/speech.ts'
import { zh } from '../src/client/locales.ts'
import type { NightcitySpeechEvent } from '../src/client/speech.ts'

/** Loose component wrapper: feeds partial props without widening the component's own props type. */
type LooseComponent<P> = (props: P) => ReactElement | null
const loose = <P,>(component: LooseComponent<P>) => component as unknown as (props: Record<string, unknown>) => ReactElement | null

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
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
    children: { 'conversation.input.right': { kind: 'list', scope: 'session' } },
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, locale, declareHoles, disposeHoles }
}

/** Recognition event stub carrying one final result. */
function eventOf(transcript: string, isFinal = true): NightcitySpeechEvent {
  return {
    resultIndex: 0,
    results: { length: 1, 0: { isFinal, length: 1, 0: { transcript } } },
  }
}

const LVoiceMicButton = loose(VoiceMicButton)

describe('nightcity voice plugin', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers dictionaries and the tool-row entry, removing them on teardown', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(subject.locale.registered).toHaveLength(1)
    expect(subject.slots.entries('conversation.input.right').map(e => e.options.id)).toContain('nightcity-voice')
    await fiber.dispose()
    expect(subject.slots.entries('conversation.input.right').map(e => e.options.id)).not.toContain('nightcity-voice')
  })

  it('contributes after a late declaration', async () => {
    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    after.declareHoles()
    await Promise.resolve()
    expect(after.slots.entries('conversation.input.right').map(e => e.options.id)).toContain('nightcity-voice')
  })

  it('extracts final transcripts only', () => {
    expect(finalTranscript(eventOf('夜之城'))).toBe('夜之城')
    expect(finalTranscript(eventOf('…', false))).toBe('')
  })

  it('finds the constructor under either vendor prefix', () => {
    expect(speechRecognitionCtor()).toBeUndefined()
    vi.stubGlobal('webkitSpeechRecognition', function WebkitSpeechRecognition() {})
    expect(speechRecognitionCtor()).toBeTypeOf('function')
  })

  it('renders nothing without the API', () => {
    const view = render(<LVoiceMicButton t={(key: string) => zh[key as keyof typeof zh]} />)
    expect(view.container.firstElementChild).toBeNull()
  })

  it('toggles listening and appends final transcripts to the draft', async () => {
    const setDraft = vi.fn()
    let onresult: ((event: NightcitySpeechEvent) => void) | null = null
    vi.stubGlobal('SpeechRecognition', function SpeechRecognition() {
      return {
        lang: '', continuous: false, interimResults: false,
        set onresult(handler: ((event: NightcitySpeechEvent) => void) | null) { onresult = handler },
        get onresult() { return onresult },
        onerror: null,
        onend: null,
        start: vi.fn(),
        stop: vi.fn(),
      }
    })
    const props = {
      t: (key: keyof typeof zh) => zh[key],
      input: { draft: '已有草稿' },
      inputActions: { setDraft },
    }
    const view = render(<LVoiceMicButton {...props} />)
    const button = view.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    await act(async () => { button.click() })
    expect(button.getAttribute('aria-pressed')).toBe('true')

    act(() => { onresult?.(eventOf('新听写')) })
    expect(setDraft).toHaveBeenCalledWith('已有草稿 新听写')
    await act(async () => { button.click() })
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('nightcity voice error paths', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('stops listening on recognition errors and session end', async () => {
    let onerror: (() => void) | null = null
    let onend: (() => void) | null = null
    vi.stubGlobal('SpeechRecognition', function SpeechRecognition() {
      return {
        lang: '', continuous: false, interimResults: false, onresult: null,
        set onerror(handler: (() => void) | null) { onerror = handler },
        get onerror() { return onerror },
        set onend(handler: (() => void) | null) { onend = handler },
        get onend() { return onend },
        start: vi.fn(),
        stop: vi.fn(),
      }
    })
    const props = { t: (key: string) => key, input: { draft: '' }, inputActions: { setDraft: vi.fn() } }
    const view = render(<LVoiceMicButton {...props} />)
    const button = view.getByRole('button')
    await act(async () => { button.click() })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    act(() => { onerror?.() })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    await act(async () => { button.click() })
    act(() => { onend?.() })
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('treats a throwing start as a running session', async () => {
    vi.stubGlobal('SpeechRecognition', function SpeechRecognition() {
      return {
        lang: '', continuous: false, interimResults: false,
        onresult: null, onerror: null, onend: null,
        start: () => { throw new DOMException('already started', 'InvalidStateError') },
        stop: vi.fn(),
      }
    })
    const props = { t: (key: string) => key, input: { draft: '' }, inputActions: { setDraft: vi.fn() } }
    const view = render(<LVoiceMicButton {...props} />)
    const button = view.getByRole('button')
    await act(async () => { button.click() })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('nightcity voice transcript guards', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('ignores empty transcripts and missing actions', async () => {
    let onresult: ((event: NightcitySpeechEvent) => void) | null = null
    vi.stubGlobal('SpeechRecognition', function SpeechRecognition() {
      return {
        lang: '', continuous: false, interimResults: false,
        set onresult(handler: ((event: NightcitySpeechEvent) => void) | null) { onresult = handler },
        get onresult() { return onresult },
        onerror: null, onend: null, start: vi.fn(), stop: vi.fn(),
      }
    })
    const setDraft = vi.fn()
    const view = render(
      <LVoiceMicButton t={(key: string) => key} input={{ draft: '' }} />,
    )
    await act(async () => { view.getByRole('button').click() })

    // Non-final result: empty transcript, ignored.
    act(() => { onresult?.(eventOf('…', false)) })
    expect(setDraft).not.toHaveBeenCalled()

    // No inputActions injected: transcript cannot land anywhere.
    act(() => { onresult?.(eventOf('听写')) })
    expect(setDraft).not.toHaveBeenCalled()
  })
})

describe('nightcity voice draft mirroring', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('seeds an empty draft when the input snapshot is absent', async () => {
    let onresult: ((event: NightcitySpeechEvent) => void) | null = null
    vi.stubGlobal('SpeechRecognition', function SpeechRecognition() {
      return {
        lang: '', continuous: false, interimResults: false,
        set onresult(handler: ((event: NightcitySpeechEvent) => void) | null) { onresult = handler },
        get onresult() { return onresult },
        onerror: null, onend: null, start: vi.fn(), stop: vi.fn(),
      }
    })
    const setDraft = vi.fn()
    const view = render(
      <LVoiceMicButton t={(key: string) => key} inputActions={{ setDraft }} />,
    )
    await act(async () => { view.getByRole('button').click() })
    act(() => { onresult?.(eventOf('冷启动')) })
    expect(setDraft).toHaveBeenCalledWith('冷启动')
  })
})
