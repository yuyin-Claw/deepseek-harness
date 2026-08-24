import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { describe, expect, it } from 'vitest'
import * as OffpeakInvariant from '../src/invariant.ts'
import { apply as nodeApply } from '../src/index.ts'

describe('nightcity offpeak invariant companion', () => {
  it('reserves package ownership with an explained empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })

    await expect(ctx.plugin(OffpeakInvariant).await()).resolves.toBeDefined()
  })

  it('registers the durable settings section on the node half', async () => {
    const ctx = new Context()
    const file = await import('node:fs/promises')
    const os = await import('node:os')
    const path = await import('node:path')
    const tempHome = await file.mkdtemp(path.join(os.tmpdir(), 'nc-offpeak-'))
    const settingsFile = (await import('@deepseek-ai/dsh-settings-file')).default
    await ctx.plugin(settingsFile, { path: path.join(tempHome, 'settings.yaml') }).await()

    await expect(ctx.plugin({ name: 'nightcity-offpeak-node', apply: nodeApply }).await()).resolves.toBeDefined()
    const settings = ctx.get('settings') as { describe(): Array<{ ns: string }> }
    expect(settings.describe().map(d => d.ns)).toContain('ui-nightcity-offpeak')
    await file.rm(tempHome, { recursive: true, force: true })
  })
})
