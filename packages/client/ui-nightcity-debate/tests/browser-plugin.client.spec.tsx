// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { type ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { apply, inject } from '../src/client/index.ts'
import { DebateView } from '../src/client/DebateView.tsx'
import { deriveDebate } from '../src/client/markers.ts'
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
  return {
    registered,
    service: {
      register(_ns: string, dictionaries: unknown): () => void {
        registered.push(dictionaries)
        return () => {}
      },
      bind: () => (key: string): string => key,
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

const LDebateView = loose(DebateView)

describe('debate marker folding', () => {
  it('returns empty state for a plain transcript', () => {
    expect(deriveDebate(['普通回复', '没有标记的文本'])).toEqual({ topic: undefined, rounds: [], verdict: undefined })
  })

  it('folds topic, sides, rounds, and verdict across messages', () => {
    const state = deriveDebate([
      '辩题：AI 该不该接管代码评审\n⚔️ 第 1 回合\n正方：速度是无情的优势\n反方：上下文是人类的护城河',
      '⚔️ 第 2 回合\n正方：工具链已经闭环\n反方：责任无法自动署名',
      '⚖️ 判决：正方 2:1 胜出',
    ])
    expect(state.topic).toBe('AI 该不该接管代码评审')
    expect(state.rounds).toEqual([
      { round: 1, pro: '速度是无情的优势', con: '上下文是人类的护城河' },
      { round: 2, pro: '工具链已经闭环', con: '责任无法自动署名' },
    ])
    expect(state.verdict).toContain('正方 2:1 胜出')
  })

  it('merges a split round report and ignores side lines before any header', () => {
    const state = deriveDebate([
      '反方：没有回合的漂流意见',
      '⚔️ 第 1 回合\n正方：先声夺人',
      '反方：后发制人',
    ])
    expect(state.rounds).toEqual([{ round: 1, pro: '先声夺人', con: '后发制人' }])
  })

  it('keeps the judge line out of the side cards', () => {
    const state = deriveDebate(['⚔️ 第 1 回合\n裁判：双方持平'])
    expect(state.rounds).toEqual([{ round: 1, pro: undefined, con: undefined }])
    expect(state.verdict).toBeUndefined()
  })
})

describe('nightcity debate plugin', () => {
  it('declares only the services it uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the view tab, then removes it on teardown', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(subject.locale.registered).toHaveLength(1)
    expect(subject.slots.entries('conversation.view').map(e => e.options.id)).toContain('nightcity-debate')
    await fiber.dispose()
    expect(subject.slots.entries('conversation.view').map(e => e.options.id)).not.toContain('nightcity-debate')
  })

  it('binds the tab label through the locale thunk', async () => {
    const subject = await bench()
    const fiber = subject.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    const entry = subject.slots.entries('conversation.view').find(e => e.options.id === 'nightcity-debate')
    expect((entry?.options as { label?: () => string }).label?.()).toBe('view.debate')
    await fiber.dispose()
  })
})

describe('DebateView', () => {
  const t = (key: string): string => zh[key as keyof typeof zh] ?? key

  /** Session selector stub over one mutable node list. */
  function sessionOf(nodes: unknown[]) {
    let current = nodes
    const source = {
      subscribe: () => () => {},
      getSnapshot: () => ({ nodes: current }),
    }
    const bound = bindSnapshotSelector(source)
    return {
      set: (next: unknown[]) => { current = next },
      useSession: bound as unknown as (selector: (s: unknown) => unknown) => never,
    }
  }

  const assistant = (text: string): unknown => ({
    kind: 'assistant',
    blocks: [{ kind: 'text', text }],
  })

  it('shows the empty state before any report', () => {
    const session = sessionOf([assistant('还没开始辩论')])
    const view = render(<LDebateView t={t} useSession={session.useSession} />)
    expect(view.container.textContent).toContain(zh['debate.empty.title'])
  })

  it('renders the scoreboard once a round report lands', () => {
    const session = sessionOf([
      assistant('辩题：夜之城是否宜居\n⚔️ 第 1 回合\n正方：霓虹永不熄灭\n反方：霓虹从不睡眠'),
    ])
    const view = render(<LDebateView t={t} useSession={session.useSession} />)
    expect(view.container.textContent).toContain('夜之城是否宜居')
    expect(view.container.textContent).toContain('霓虹永不熄灭')
    expect(view.container.textContent).toContain('霓虹从不睡眠')
  })

  it('skips non-assistant and non-text nodes', () => {
    const session = sessionOf([
      { kind: 'user', content: [] },
      { kind: 'assistant', blocks: [{ kind: 'reasoning', text: '⚔️ 第 9 回合' }] },
    ])
    const view = render(<LDebateView t={t} useSession={session.useSession} />)
    expect(view.container.textContent).toContain(zh['debate.empty.title'])
  })
})

describe('nightcity debate coverage companions', () => {
  afterEach(() => {
    cleanup()
  })

  it('re-visiting a round header updates the same round', () => {
    const state = deriveDebate([
      '⚔️ 第 1 回合\n正方：旧观点',
      '⚔️ 第 1 回合\n反方：新反驳',
    ])
    expect(state.rounds).toEqual([{ round: 1, pro: '旧观点', con: '新反驳' }])
  })

  it('ignores side lines with empty content', () => {
    const state = deriveDebate(['⚔️ 第 1 回合\n正方：\n反方：  '])
    expect(state.rounds).toEqual([{ round: 1, pro: undefined, con: undefined }])
  })

  it('renders a one-sided round without placeholders breaking', () => {
    const t = (key: string): string => zh[key as keyof typeof zh] ?? key
    const current = { nodes: [{ kind: 'assistant', blocks: [{ kind: 'text', text: '⚔️ 第 1 回合\n正方：孤军奋战' }] }] }
    const bound = bindSnapshotSelector({
      subscribe: () => () => {},
      getSnapshot: () => current,
    })
    const view = render(<LDebateView t={t} useSession={bound as never} />)
    expect(view.container.textContent).toContain('孤军奋战')
    expect(view.container.textContent).toContain('—')
    expect(view.container.textContent).not.toContain(zh['debate.verdict'])
  })
})

describe('nightcity debate rendering arms', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders mixed-sided rounds and a verdict', () => {
    const t = (key: string): string => zh[key as keyof typeof zh] ?? key
    const nodes = [{
      kind: 'assistant',
      blocks: [{ kind: 'text', text: '⚔️ 第 1 回合\n\n正方：全面进攻\n\n⚔️ 第 2 回合\n反方：侧翼包抄\n\n⚖️ 判决：反方险胜' }],
    }]
    const bound = bindSnapshotSelector({
      subscribe: () => () => {},
      getSnapshot: () => ({ nodes }),
    })
    const view = render(<LDebateView t={t} useSession={bound as never} />)
    expect(view.container.textContent).toContain(zh['debate.verdict'])
    expect(view.container.textContent).toContain('侧翼包抄')
  })
})
