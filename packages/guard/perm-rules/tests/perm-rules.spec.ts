/**
 * Behavior suite for @deepseek-ai/dsh-perm-rules: the pre-execute deny gate
 * (deny / narrow-match transparency / removal recovery), fail-loud config,
 * `perm_rules` management through the same registry pipeline, and fiber
 * disposal removing both registrations.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import * as permRules from '@deepseek-ai/dsh-perm-rules'
import type { Config } from '@deepseek-ai/dsh-perm-rules'

const testToolSignal = new AbortController().signal

/** The plugin fiber handle `ctx.plugin` returns, narrowed to its disposer. */
interface FiberHandle { dispose: () => Promise<void> }

/** Mount the registry + the guard with the given seed config and a probe tool. */
async function setup(config: Config = {}) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const fiber = await ctx.plugin(permRules, config) as unknown as FiberHandle
  ctx.tools.register(defineContentToolFixture({ name: 'probe', description: 'd', parameters: {},
    async execute() { return [{ type: 'text', text: 'ok' }] } }))
  return { ctx, fiber }
}

/** Execute one call against `probe` through the full registry pipeline. */
function callProbe(ctx: Context, args: Record<string, unknown> = {}) {
  return ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'probe', arguments: args })
}

/** The text of a call's first content block. */
function firstText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content[0]?.text ?? ''
}

describe('seeded deny rules', () => {
  it('denies a matching call before the tool body runs, quoting the rule and its removal', async () => {
    const { ctx } = await setup({ rules: [{ tool: '*', pattern: '*file_path=*secret*' }] })
    let bodyRan = false
    ctx.tools.register(defineContentToolFixture({ name: 'probe2', description: 'd', parameters: {},
      async execute() { bodyRan = true; return [{ type: 'text', text: 'ok' }] } }))
    const result = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'probe2', arguments: { file_path: 'a/secret.txt' } })
    expect(result.isError).toBe(true)
    expect(firstText(result)).toContain('permission rule denied this call')
    expect(firstText(result)).toContain('#1')
    expect(firstText(result)).toContain('perm_rules')
    expect(bodyRan).toBe(false)
  })

  it('lets a non-matching call through untouched', async () => {
    const { ctx } = await setup({ rules: [{ tool: '*', pattern: '*file_path=*secret*' }] })
    const result = await callProbe(ctx, { file_path: 'docs/readme.md' })
    expect(result.isError).toBe(false)
    expect(firstText(result)).toBe('ok')
  })

  it('a bare tool-name pattern denies every call of that tool, with or without arguments', async () => {
    const { ctx } = await setup({ rules: [{ tool: 'probe', pattern: 'probe' }] })
    expect((await callProbe(ctx)).isError).toBe(true)
    expect((await callProbe(ctx, { file_path: 'x' })).isError).toBe(true)
  })

  it('`*` wildcards span newlines in a matched command argument', async () => {
    const { ctx } = await setup({ rules: [{ tool: '*', pattern: '*rm -rf*' }] })
    ctx.tools.register(defineContentToolFixture({ name: 'bash', description: 'd', parameters: {},
      async execute() { return [{ type: 'text', text: 'ran' }] } }))
    const result = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'bash',
      arguments: { command: 'echo hi\nrm -rf /\necho bye' } })
    expect(result.isError).toBe(true)
  })

  it('empty tool or pattern in seed config fails loud at plugin load', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await expect(ctx.plugin(permRules, { rules: [{ tool: '', pattern: 'x' }] })).rejects.toThrow('empty `tool`')
    await expect(ctx.plugin(permRules, { rules: [{ tool: 'probe', pattern: '' }] })).rejects.toThrow('empty `pattern`')
  })
})

describe('perm_rules management tool', () => {
  it('add then deny then remove then recover, end to end through the registry', async () => {
    const { ctx } = await setup()
    const add = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'perm_rules',
      arguments: { action: 'add', tool: 'probe', pattern: 'probe file_path=*agent-capability*' } })
    expect(add.isError).toBe(false)
    expect(add.value).toMatchObject({ action: 'add', ok: true, rules: [{ id: 1, tool: 'probe', pattern: 'probe file_path=*agent-capability*' }] })

    const denied = await callProbe(ctx, { file_path: 'agent-capability-analysis.md' })
    expect(denied.isError).toBe(true)

    const remove = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c2'), name: 'perm_rules',
      arguments: { action: 'remove', id: 1 } })
    expect(remove.value).toMatchObject({ action: 'remove', ok: true, rules: [] })

    const recovered = await callProbe(ctx, { file_path: 'agent-capability-analysis.md' })
    expect(recovered.isError).toBe(false)
  })

  it('remove of an unknown id reports failure without changing the table', async () => {
    const { ctx } = await setup({ rules: [{ tool: 'probe', pattern: 'probe' }] })
    const result = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'perm_rules',
      arguments: { action: 'remove', id: 99 } })
    expect(result.value).toMatchObject({ action: 'remove', ok: false })
    expect((result.value as { rules: unknown[] }).rules).toHaveLength(1)
  })

  it('add without pattern defaults to every call of the named tool', async () => {
    const { ctx } = await setup()
    const result = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'perm_rules',
      arguments: { action: 'add', tool: 'probe' } })
    expect(result.value).toMatchObject({ ok: true, rules: [{ id: 1, tool: 'probe', pattern: 'probe' }] })
    expect((await callProbe(ctx)).isError).toBe(true)
    expect((await callProbe(ctx, { file_path: 'x.md' })).isError).toBe(true)
  })

  it('clear empties the table and restores dispatch', async () => {
    const { ctx } = await setup({ rules: [{ tool: 'probe', pattern: 'probe' }] })
    await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'perm_rules', arguments: { action: 'clear' } })
    expect((await callProbe(ctx)).isError).toBe(false)
  })

  it('list reports the seeded table', async () => {
    const { ctx } = await setup({ rules: [{ tool: 'bash', pattern: 'bash *git push*' }] })
    const result = await ctx.tools.execute({ signal: testToolSignal, callId: CallId('c1'), name: 'perm_rules',
      arguments: { action: 'list' } })
    expect(result.value).toMatchObject({ action: 'list', ok: true, rules: [{ id: 1, tool: 'bash', pattern: 'bash *git push*' }] })
  })
})

describe('fiber disposal', () => {
  it('removes both the deny gate and the perm_rules tool with the plugin fiber', async () => {
    const { ctx, fiber } = await setup({ rules: [{ tool: 'probe', pattern: 'probe' }] })
    expect((await callProbe(ctx)).isError).toBe(true)
    expect(ctx.tools.schemas().some(schema => schema.name === 'perm_rules')).toBe(true)

    await fiber.dispose()

    expect((await callProbe(ctx)).isError).toBe(false)
    expect(ctx.tools.schemas().some(schema => schema.name === 'perm_rules')).toBe(false)
  })
})
