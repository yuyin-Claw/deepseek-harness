/**
 * Unit coverage for `@deepseek-ai/dsh-side-workspace`: porcelain parsing,
 * message folding with clipping, traversal refusal, and the file listing,
 * over stub seam implementations.
 */
import { describe, expect, it } from 'vitest'
import SideWorkspaceService from '../src/index.ts'

/** Build the service over stub seams; calls records observable invocations. */
function make(stubs: Record<string, unknown> = {}) {
  const calls: Record<string, unknown[]> = {}
  const rec = (name: string, value: unknown) => { (calls[name] ??= []).push(value); return value }
  const ctx = {
    agents: {
      currentInitiator: () => undefined,
      roots: () => [{ session: { id: 'parent' } }],
      get: (id: string) => (id === 'parent' ? { session: { id: 'parent' }, status: 'idle' } : undefined),
    },
    subagents: {
      startContinuable: async (spec: unknown) => { rec('startContinuable', spec); return { childId: 'child-1', messageId: 'm1' } },
      followup: async (...args: unknown[]) => { rec('followup', args); return 'm2' },
    },
    sessionQuery: { readSurface: async () => ({ events: [], capturedThroughSeq: null, session: {} }) },
    shell: { resolve: (spec: unknown) => spec, run: async () => ({ exitCode: 0, stdout: { text: '' }, stderr: { text: '' } }) },
    fs: { resolve: async (p: string) => p, readText: async (p: string) => `content of ${p}`, listDir: async () => [] },
    sandboxPolicy: { resolve: () => ({ workspaceRoot: '/w' }) },
    ...stubs,
  }
  return { service: new SideWorkspaceService(ctx as never, { maxFileChars: 60_000, diffMaxChars: 30_000, maxScanDirs: 500 }), calls }
}

describe('side conversation', () => {
  it('starts via the fork provider against the last root agent', async () => {
    const { service, calls } = make()
    expect(await service.startConversation('hello')).toEqual({ childId: 'child-1' })
    expect((calls['startContinuable']![0] as { provider: string }).provider).toBe('fork')
  })

  it('refuses a second start', async () => {
    const { service } = make()
    await service.startConversation('first')
    await expect(service.startConversation('again')).rejects.toThrow('already started')
  })

  it('folds user/assistant text and clips at 6000 characters', async () => {
    const long = 'x'.repeat(6500)
    const { service } = make({ sessionQuery: { readSurface: async () => ({ events: [
      { type: 'user/message', seq: 1, data: { message: { content: [{ type: 'text', text: 'hi' }] } } },
      { type: 'tool/result', seq: 2, data: {} },
      { type: 'assistant/message', seq: 3, data: { message: { content: [{ type: 'text', text: long }] } } },
    ] }) } })
    await service.startConversation('hi')
    const { messages, status } = await service.readConversation()
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', text: 'hi', seq: 1 })
    expect(messages[1]!.text.length).toBe(6001)
    expect(status).toBe('idle')
  })

  it('readConversation before start is empty and idle', async () => {
    const { service } = make()
    expect(await service.readConversation()).toEqual({ messages: [], status: 'idle' })
  })
})

describe('workspace views', () => {
  it('parses porcelain rows into path/status pairs', async () => {
    const { service } = make({ shell: { resolve: (s: unknown) => s, run: async () => ({ exitCode: 0,
      stdout: { text: ' M packages/a.ts\n?? "docs/b md.md"\n' }, stderr: { text: '' } }) } })
    expect((await service.listDiffFiles()).files).toEqual([{ status: 'M', path: 'packages/a.ts' }, { status: '??', path: 'docs/b md.md' }])
  })

  it('rejects traversal and reports size without clipping', async () => {
    const { service } = make()
    await expect(service.readFile('../secret')).rejects.toThrow('refusing to read')
    expect(await service.readFile('a.md')).toEqual({ text: 'content of /w/a.md', truncated: false, size: 'content of /w/a.md'.length })
  })

  it('lists readable files only, skipping heavy directories', async () => {
    const dir = (name: string, target: string) => ({ type: 'directory', name, target })
    const file = (name: string) => ({ type: 'file', name, target: `/w/${name}` })
    const { service } = make({ fs: { resolve: async (p: string) => p, readText: async () => '', listDir: async (t: unknown) =>
      t === '/w' ? [dir('node_modules', '/w/nm'), dir('src', '/w/src'), file('README.md'), file('logo.png')] : [file('index.ts')] } })
    expect((await service.listFiles()).files).toEqual(['README.md', 'src/index.ts'])
  })
})
