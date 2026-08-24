/**
 * Real-composition tests for `@deepseek-ai/dsh-tool-vcs`: the real tool
 * registry (`dsh-tools`), real filesystem backend (`dsh-fs-local`), real bash
 * executor (`dsh-bash-local` over `dsh-subprocess-local`), and the real
 * sandbox-policy service, exercised through `ctx.tools.execute()` against a
 * replayable temporary git repository — nothing bypasses the tool registry and
 * no fixture touches any checkout of this repository.
 */

import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { type ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import LocalBashExecutor from '@deepseek-ai/dsh-bash-local'
import SandboxPolicyService from '@deepseek-ai/dsh-sandbox-policy'
import * as ToolVcs from '@deepseek-ai/dsh-tool-vcs'
import { extractSymbols, formatRepoMapOutput, parseGitStatus } from '@deepseek-ai/dsh-tool-vcs'
import type { RepoMapResult } from '@deepseek-ai/dsh-tool-vcs'

/** Narrow the opaque tool result value to its canonical output type. */
function mapValue(out: ToolExecutionResult): RepoMapResult {
  return out.value as unknown as RepoMapResult
}

const execFileAsync = promisify(execFile)
const testToolSignal = new AbortController().signal

let repo: string
let ctx: Context
let fiber: Awaited<ReturnType<Context['plugin']>>

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repo })
  return stdout
}

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), 'dsh-tool-vcs-'))
  await git('init')
  await git('config', 'user.email', 'test@example.test')
  await git('config', 'user.name', 'Test')
  await mkdir(join(repo, 'src'), { recursive: true })
  await writeFile(join(repo, 'src', 'index.ts'), 'export function hello(): void {}\nexport const answer = 42\n')
  await writeFile(join(repo, 'src', 'util.py'), 'def foo():\n    pass\n\nclass Bar:\n    pass\n')
  await writeFile(join(repo, 'README.md'), '# not a source file\n')
  await git('add', '-A')
  await git('commit', '-m', 'initial')

  ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: repo })
  await ctx.plugin(LocalSubprocessRuntime)
  await ctx.plugin(LocalBashExecutor, { cwd: repo })
  await ctx.plugin(SandboxPolicyService, { workspaceRoot: repo })
  fiber = await ctx.plugin(ToolVcs, {})
})

afterEach(async () => {
  await fiber.dispose()
  await rm(repo, { recursive: true, force: true })
})

let counter = 0
function call(name: string, args: unknown): Promise<ToolExecutionResult> {
  counter++
  return ctx.tools.execute({ signal: testToolSignal, callId: CallId(`call-${counter}`), name, arguments: args })
}

function text(out: ToolExecutionResult): string {
  return out.content.map(b => b.type === 'text' ? b.text : '').join('')
}

describe('repo_map', () => {
  beforeEach(async () => {
    await writeFile(join(repo, 'src', 'index.ts'), 'export function hello(): void {}\nexport const answer = 43\n')
    await writeFile(join(repo, 'src', 'new.ts'), 'export const fresh = true\n')
  })

  it('lists source files with symbols and git status markers', async () => {
    const out = await call('repo_map', {})
    expect(out.isError).toBe(false)
    const value = mapValue(out)
    expect(value.isGitRepo).toBe(true)
    const paths = value.entries.map(e => e.path)
    expect(paths).toContain('src/index.ts')
    expect(paths).toContain('src/util.py')
    expect(paths).not.toContain('README.md')
    const index = value.entries.find(e => e.path === 'src/index.ts')
    expect(index?.symbols).toEqual(['hello', 'answer'])
    expect(index?.gitStatus).toBe('M')
    const fresh = value.entries.find(e => e.path === 'src/new.ts')
    expect(fresh?.gitStatus).toBe('??')
    expect(text(out)).toContain('- src/index.ts — exports: hello, answer [M]')
  })

  it('filters by focus on path and symbol', async () => {
    const out = await call('repo_map', { focus: 'util' })
    const value = mapValue(out)
    expect(value.entries.map(e => e.path)).toEqual(['src/util.py'])
    const bySymbol = await call('repo_map', { focus: 'hello' })
    expect(mapValue(bySymbol).entries.map(e => e.path)).toEqual(['src/index.ts'])
  })

  it('reports the empty-result hint when nothing matches', async () => {
    const out = await call('repo_map', { focus: 'no-such-thing' })
    expect(out.isError).toBe(false)
    expect(text(out)).toContain('No source files matched. Adjust subdir or focus.')
  })

  it('truncates the listing at max_files and notes it', async () => {
    const out = await call('repo_map', { max_files: 1 })
    const value = mapValue(out)
    expect(value.entries).toHaveLength(1)
    expect(value.truncated).toBe(true)
    expect(text(out)).toContain('Showing the first 1 matching files.')
  })

  it('reports a clean non-git tree without markers', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'dsh-tool-vcs-plain-'))
    try {
      await writeFile(join(plain, 'a.ts'), 'export const x = 1\n')
      const localCtx = new Context()
      await localCtx.plugin(SystemPrompt)
      await localCtx.plugin(ToolRuntime)
      await localCtx.plugin(LocalFileSystem, { cwd: plain })
      await localCtx.plugin(LocalSubprocessRuntime)
      await localCtx.plugin(LocalBashExecutor, { cwd: plain })
      await localCtx.plugin(SandboxPolicyService, { workspaceRoot: plain })
      const localFiber = await localCtx.plugin(ToolVcs, {})
      const out = await localCtx.tools.execute({ signal: testToolSignal, callId: CallId('plain'), name: 'repo_map', arguments: {} })
      const value = mapValue(out)
      expect(value.isGitRepo).toBe(false)
      expect(value.entries.map(e => e.path)).toEqual(['a.ts'])
      expect(value.entries[0]?.gitStatus).toBeUndefined()
      await localFiber.dispose()
    } finally {
      await rm(plain, { recursive: true, force: true })
    }
  })
})

describe('git_workflow', () => {
  it('reports status including modified and untracked files', async () => {
    await writeFile(join(repo, 'src', 'index.ts'), 'export const answer = 43\n')
    const out = await call('git_workflow', { action: 'status' })
    expect(out.isError).toBe(false)
    expect(text(out)).toContain('git status')
    expect(text(out)).toContain('src/index.ts')
  })

  it('reports the diff of a modified file', async () => {
    await writeFile(join(repo, 'src', 'index.ts'), 'export function hello(): void {}\nexport const answer = 99\n')
    const out = await call('git_workflow', { action: 'diff', file: 'src/index.ts' })
    expect(out.isError).toBe(false)
    expect(text(out)).toContain('-export const answer = 42')
    expect(text(out)).toContain('+export const answer = 99')
  })

  it('commits the whole work tree after staging it', async () => {
    await writeFile(join(repo, 'src', 'extra.ts'), 'export const extra = true\n')
    const out = await call('git_workflow', { action: 'commit', message: 'add extra' })
    expect(out.isError).toBe(false)
    expect((await git('log', '-1', '--format=%s')).trim()).toBe('add extra')
    expect((await git('status', '--porcelain')).length).toBe(0)
  })

  it('rejects commit without a message and message on other actions', async () => {
    const noMessage = await call('git_workflow', { action: 'commit' })
    expect(noMessage.isError).toBe(true)
    expect(text(noMessage)).toContain('commit requires a non-empty message')
    const stray = await call('git_workflow', { action: 'status', message: 'x' })
    expect(stray.isError).toBe(true)
    expect(text(stray)).toContain('message is only accepted by commit')
  })

  it('rolls back uncommitted modifications', async () => {
    await writeFile(join(repo, 'src', 'index.ts'), 'export function broken(\n')
    const out = await call('git_workflow', { action: 'rollback' })
    expect(out.isError).toBe(false)
    expect(await git('status', '--porcelain')).toBe('')
    const content = await readFile(join(repo, 'src', 'index.ts'), 'utf8')
    expect(content).toContain('export const answer = 42')
  })

  it('rejects an action outside the closed set with a structured INVALID_ARGS error', async () => {
    const out = await call('git_workflow', { action: 'push' })
    expect(out.isError).toBe(true)
    expect(out.error?.info?.code).toBe('INVALID_ARGS')
  })
})

describe('registration and disposal', () => {
  it('registers both tools by default and removes them on fiber dispose', async () => {
    const names = () => ctx.tools.schemas().map(s => s.name)
    expect(names()).toContain('repo_map')
    expect(names()).toContain('git_workflow')
    await fiber.dispose()
    expect(names()).not.toContain('repo_map')
    expect(names()).not.toContain('git_workflow')
  })

  it('registers only enabled tools and rejects invalid caps at load', async () => {
    const scoped = new Context()
    await scoped.plugin(SystemPrompt)
    await scoped.plugin(ToolRuntime)
    await scoped.plugin(LocalFileSystem, { cwd: repo })
    await scoped.plugin(LocalSubprocessRuntime)
    await scoped.plugin(LocalBashExecutor, { cwd: repo })
    await scoped.plugin(SandboxPolicyService, { workspaceRoot: repo })
    const onlyMap = await scoped.plugin(ToolVcs, { gitWorkflow: false })
    expect(scoped.tools.schemas().map(s => s.name)).toEqual(['repo_map'])
    await onlyMap.dispose()
    await expect(scoped.plugin(ToolVcs, { maxFiles: 0 })).rejects.toThrow(/tool-vcs: maxFiles must be a positive integer/)
    await expect(scoped.plugin(ToolVcs, { maxScanDirs: -1 })).rejects.toThrow(/tool-vcs: maxScanDirs must be a positive integer/)
    await expect(scoped.plugin(ToolVcs, { diffMaxChars: 1.5 })).rejects.toThrow(/tool-vcs: diffMaxChars must be a positive integer/)
  })

  it('has no default export (namespace plugin export shape)', () => {
    expect('default' in ToolVcs).toBe(false)
  })
})

describe('pure helpers', () => {
  it('extracts bounded, distinct symbols across languages', () => {
    expect(extractSymbols('export function a() {}\nexport const b = 1\nvar local = 2\n')).toEqual(['a', 'b'])
    expect(extractSymbols('def foo():\n    pass\nclass Bar:\n    pass\n')).toEqual(['foo', 'Bar'])
    expect(extractSymbols('')).toEqual([])
  })

  it('parses porcelain -z records including renames', () => {
    const status = parseGitStatus({ exitCode: 0, stdout: 'M  a.ts\0?? b.ts\0R  old.ts -> new.ts\0', stderr: '' })
    expect(status.get('a.ts')).toBe('M')
    expect(status.get('b.ts')).toBe('??')
    expect(status.get('new.ts')).toBe('R')
    expect(parseGitStatus({ exitCode: 128, stdout: 'fatal: not a git repository\n', stderr: '' }).size).toBe(0)
  })

  it('formats the map output with root, markers, and hints', () => {
    expect(formatRepoMapOutput({ root: '/r', entries: [{ path: 'a.ts', symbols: ['x'], gitStatus: 'M' }], truncated: false, scannedDirs: 1, isGitRepo: true }))
      .toContain('- a.ts — exports: x [M]')
    expect(formatRepoMapOutput({ root: '/r', entries: [], truncated: false, scannedDirs: 1, isGitRepo: false }))
      .toContain('No source files matched.')
  })
})
