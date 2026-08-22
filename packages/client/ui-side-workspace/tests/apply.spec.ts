import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/client/index.ts'

interface RegisteredSpec {
  name: string
  id: string
  order: number
}

describe('ui-side-workspace client apply', () => {
  it('declares the slots service dependency', () => {
    expect(inject).toContain('slots')
  })

  it('registers the side-workspace panel into the shell.overlay slot', () => {
    const registrations: RegisteredSpec[] = []
    const disposers: Array<() => void> = []
    const fakeCtx = {
      slots: {
        inject: (_name: string, factory: () => unknown): void => { factory() },
        register: (spec: RegisteredSpec, _component: unknown): (() => void) => {
          registrations.push(spec)
          return () => { registrations.pop() }
        },
      },
    }
    apply(fakeCtx as unknown as Context)
    expect(registrations).toHaveLength(1)
    expect(registrations[0]).toMatchObject({ name: 'shell.overlay', id: 'side-workspace', order: 100 })
    expect(disposers).toHaveLength(0)
  })
})
