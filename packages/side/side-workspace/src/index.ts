/**
 * Side workspace host service: the host half of the right-dock workspace panel.
 * Owns one forked continuable side conversation plus read-only workspace views
 * (changed files, per-file diffs, readable-file listing and content) served to
 * the browser client. The conversation is isolated from the main thread by
 * construction: it lives in the forked child session.
 * @module @deepseek-ai/dsh-side-workspace
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-session-query'
import { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-shell'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import { Remote } from '@deepseek-ai/dsh-typert-protocol'

/** One folded conversation message served to the panel. */
export interface SideMessage {
  /** `user` or `assistant`. */
  role: 'user' | 'assistant'
  /** Joined text blocks, clipped to the per-message cap. */
  text: string
  /** Source session-event seq, for stable list keys. */
  seq: number
}

/** Config: caps applied to the read-only views. */
export interface Config {
  maxFileChars: number
  diffMaxChars: number
  maxScanDirs: number
}

/** Directory names the file listing never enters. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'lib', 'build', 'coverage', '.venv', '__pycache__', '.next', 'vendor'])

/** Extensions the file listing admits. */
const READABLE_EXT = new Set(['md', 'py', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'yaml', 'yml', 'txt', 'sh', 'toml', 'csv', 'html', 'css'])

/** Fold one surface event's text blocks; empty when it has none. */
function eventText(event: { type: string; data?: { message?: { content?: Array<{ type: string; text?: string }> } } }): string {
  const blocks = event.data?.message?.content ?? []
  return blocks.filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text).join('\n').trim()
}

/** Side workspace service (`ctx.sideWorkspace`). */
export default class SideWorkspaceService {
  /** The forked child session backing the panel conversation, once started. */
  private childId: SessionId | null = null
  /** The parent session that forked it, for followup authority. */
  private parentSessionId: SessionId | null = null

  /** Construct with the owning context and resolved caps. */
  constructor(private readonly ctx: Context, private readonly config: Config) {}

  /** Start the side conversation by forking the given parent agent. */
  @Remote('startConversation')
  async startConversation(text: string): Promise<{ childId: string }> {
    if (this.childId !== null) throw new Error('side conversation already started')
    if (text.length === 0) throw new Error('side conversation requires non-empty text')
    const agent = this.ctx.agents.currentInitiator() ?? this.ctx.agents.roots().at(-1)
    if (agent === undefined) throw new Error('no live parent agent to fork')
    this.parentSessionId = agent.session.id
    const signal = new AbortController().signal
    const start = await this.ctx.subagents.startContinuable({
      provider: 'fork',
      label: 'side conversation',
      request: { prompt: [{ type: 'text', text }], parent: agent },
      signal,
    })
    this.childId = start.childId
    return { childId: start.childId }
  }

  /** Deliver the next user message to the running side conversation. */
  @Remote('sendFollowup')
  async sendFollowup(text: string): Promise<{ ok: boolean }> {
    if (this.childId === null) throw new Error('side conversation not started')
    if (text.length === 0) throw new Error('followup requires non-empty text')
    const agent = this.parentSessionId !== null
      ? this.ctx.agents.get(this.parentSessionId)
      : undefined
    if (agent === undefined) throw new Error('parent agent is gone')
    await this.ctx.subagents.followup(agent, this.childId, [{ type: 'text', text }],
      { source: { kind: 'user' }, signal: new AbortController().signal })
    return { ok: true }
  }

  /** Fold the side conversation's current surface into panel messages. */
  @Remote('readConversation')
  async readConversation(): Promise<{ messages: SideMessage[]; status: string }> {
    if (this.childId === null) return { messages: [], status: 'idle' }
    const snap = await this.ctx.sessionQuery.readSurface(this.childId)
    const messages: SideMessage[] = []
    for (const event of snap.events) {
      if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
      const text = eventText(
        event as unknown as { type: string; data?: { message?: { content?: Array<{ type: string; text?: string }> } } },
      )
      if (text.length === 0) continue
      messages.push({
        role: event.type === 'user/message' ? 'user' : 'assistant',
        text: text.length > 6000 ? text.slice(0, 6000) + '…' : text,
        seq: event.seq,
      })
    }
    const agent = this.ctx.agents.get(this.childId)
    return { messages, status: agent?.status ?? 'idle' }
  }

  /** Run git in the workspace root and return trimmed stdout. */
  private async git(args: string): Promise<string> {
    const spec = this.ctx.shell.resolve({
      command: `git ${args}`,
      workdir: this.ctx.sandboxPolicy.resolve().workspaceRoot,
      timeoutMs: 20_000,
    })
    const result = await this.ctx.shell.run(spec)
    if (result.exitCode !== 0) throw new Error(`git ${args} failed (exit ${String(result.exitCode)})`)
    return result.stdout.text.trim()
  }

  /** List the workspace's changed files with porcelain status codes. */
  @Remote('listDiffFiles')
  async listDiffFiles(): Promise<{ files: Array<{ path: string; status: string }> }> {
    const out = await this.git('status --porcelain')
    const files: Array<{ path: string; status: string }> = []
    for (const row of out.split('\n')) {
      if (row.length < 4) continue
      const status = row.slice(0, 2).trim()
      const path = row.slice(2).trim().replace(/^"|"$/g, '')
      if (path.length > 0) files.push({ status, path })
    }
    return { files }
  }

  /** Read one file's diff against HEAD, clipped to the diff cap. */
  @Remote('readFileDiff')
  async readFileDiff(file: string): Promise<{ text: string }> {
    const out = await this.git(`diff HEAD -- ${file}`)
    const text = out.length === 0 ? '(no diff)' : out
    return { text: text.length > this.config.diffMaxChars ? text.slice(0, this.config.diffMaxChars) + '\n…(truncated)' : text }
  }

  /** List readable workspace files (path order), bounded by the scan budget. */
  @Remote('listFiles')
  async listFiles(): Promise<{ files: string[] }> {
    const root = this.ctx.sandboxPolicy.resolve().workspaceRoot
    const found: string[] = []
    const queue: Array<{ target: FsTarget; rel: string; depth: number }> = [{ target: await this.ctx.fs.resolve(root), rel: '', depth: 0 }]
    let scanned = 0
    while (queue.length > 0 && scanned < this.config.maxScanDirs && found.length < 800) {
      const dir = queue.shift()
      if (dir === undefined) break
      scanned += 1
      for (const entry of await this.ctx.fs.listDir(dir.target)) {
        if (entry.type === 'directory') {
          if (dir.depth >= 7 || SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
          queue.push({ target: entry.target, rel: dir.rel === '' ? entry.name : `${dir.rel}/${entry.name}`, depth: dir.depth + 1 })
        } else if (entry.type === 'file' && !entry.name.startsWith('.')) {
          const ext = entry.name.slice(entry.name.lastIndexOf('.') + 1)
          if (!READABLE_EXT.has(ext)) continue
          found.push(dir.rel === '' ? entry.name : `${dir.rel}/${entry.name}`)
        }
      }
    }
    found.sort()
    return { files: found }
  }

  /** Read one listed file's content, rejecting traversal and clipping size. */
  @Remote('readFile')
  async readFile(path: string): Promise<{ text: string; truncated: boolean; size: number }> {
    if (path.length === 0 || path.includes('..')) throw new Error(`refusing to read ${path}`)
    const target = await this.ctx.fs.resolve(`${this.ctx.sandboxPolicy.resolve().workspaceRoot}/${path}`)
    const text = await this.ctx.fs.readText(target)
    return {
      text: text.length > this.config.maxFileChars ? text.slice(0, this.config.maxFileChars) + '\n…(truncated)' : text,
      truncated: text.length > this.config.maxFileChars,
      size: text.length,
    }
  }
}
