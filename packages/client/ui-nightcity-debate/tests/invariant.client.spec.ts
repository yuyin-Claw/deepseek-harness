import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { describe, expect, it } from 'vitest'
import * as DebateInvariant from '../src/invariant.ts'
import { apply as nodeApply } from '../src/index.ts'

describe('nightcity debate invariant companion', () => {
  it('reserves package ownership with an explained empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })

    await expect(ctx.plugin(DebateInvariant).await()).resolves.toBeDefined()
  })

  it('keeps the node half as an inert Loader seat', () => {
    expect(() => { nodeApply() }).not.toThrow()
  })
})
