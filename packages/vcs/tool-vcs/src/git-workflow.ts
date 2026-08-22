/**
 * The model-facing `git_workflow` tool: status, diff, commit, and rollback for
 * the session workspace, plus the shared `runGit` shell helper `repo_map`
 * reuses. All git access goes through `ctx.shell`; this module owns only the
 * model-facing schema, argument validation, the output cap, and formatting.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, ToolExecution } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-shell'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import type { GitWorkflowAction, GitWorkflowArgs, GitWorkflowResult } from './types.ts'

/** One completed foreground git run: exit code plus captured output. */
export interface GitRunOutcome {
  /** Git's exit code; `null` when the process died from a signal. */
  exitCode: number | null
  /** Captured stdout text (already tail-truncated by the executor when it overflowed). */
  stdout: string
  /** Captured stderr text. */
  stderr: string
}

/**
 * Quote one shell word with single quotes so no expansion can alter it.
 *
 * @param word - the raw argument value.
 * @returns the POSIX single-quoted form (`'` becomes `'\''`).
 */
function shellQuote(word: string): string {
  return `'${word.replaceAll("'", "'\\''")}'`
}

/**
 * Run one git command in `root` through the shell seam. Nonzero exits resolve
 * with their captured output instead of rejecting — the caller decides whether
 * a nonzero exit is an error (`status` outside a repo is) or a result
 * (`commit` with nothing staged).
 *
 * @param ctx - context whose `shell` executor runs the command.
 * @param root - absolute working directory for git.
 * @param args - git arguments after the `git` verb (already shell-unsafe raw values; they are quoted here).
 * @param timeoutMs - cooperative timeout budget for the command.
 * @param signal - cancellation signal forwarded to the executor.
 * @returns the exit code and captured stdout/stderr.
 */
export async function runGit(
  ctx: Context,
  root: string,
  args: string[],
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<GitRunOutcome> {
  const command = ['git', ...args].map(shellQuote).join(' ')
  const spec = ctx.shell.resolve({ command, workdir: root, timeoutMs, ...signal !== undefined ? { signal } : {} })
  const result = await ctx.shell.run(spec)
  return { exitCode: result.exitCode, stdout: result.stdout.text, stderr: result.stderr.text }
}

/**
 * Validate value constraints the schema DSL can't express: `commit` requires a
 * non-blank `message`, and no other action accepts one.
 *
 * @param args - the schema-validated `git_workflow` arguments.
 * @returns the accepted action/message pair.
 * @throws when `commit` lacks a message or another action carries one.
 */
export function parseGitWorkflowArgs(args: GitWorkflowArgs): { action: GitWorkflowAction; message?: string } {
  if (args.action === 'commit') {
    const message = args.message?.trim()
    if (message === undefined || message.length === 0) throw new Error('commit requires a non-empty message')
    return { action: args.action, message }
  }
  if (args.message !== undefined) throw new Error(`message is only accepted by commit, not ${args.action}`)
  return { action: args.action }
}

/**
 * Build the git command line for one validated action.
 *
 * @param action - the validated action.
 * @param file - the optional `diff` path restriction.
 * @returns the git argument vector (unquoted; `runGit` quotes every word).
 */
function gitArgsFor(action: GitWorkflowAction, file: string | undefined): string[] {
  switch (action) {
    case 'status':
      return ['status']
    case 'diff':
      return ['--no-pager', 'diff', ...file !== undefined ? ['--', file] : []]
    case 'commit':
      return ['add', '-A']
    case 'rollback':
      return ['reset', '--hard', 'HEAD']
  }
}

/**
 * Format a completed `git_workflow` run as model-facing text.
 *
 * @param result - the canonical output value.
 * @returns the git output (status text, diff, or commit/rollback summary), plus a truncation note when cut.
 */
export function formatGitWorkflowOutput(result: GitWorkflowResult, maxChars: number): string {
  const header = `git ${result.action}${result.exitCode !== 0 ? ` (exit ${String(result.exitCode)})` : ''}\n\n`
  const assembled = `${header}${result.output}`
  if (assembled.length <= maxChars) return assembled
  const footer = '\n\nOutput truncated; narrow the query (e.g. diff one file) for the rest.'
  return `${assembled.slice(0, Math.max(header.length, maxChars - footer.length))}${footer}`
}

/**
 * Pending-call presentation: a generic card titled by the action.
 *
 * @param args - the raw tool arguments; only the action feeds the view.
 * @returns the generic card view shown while the call runs.
 */
export function presentGitWorkflowCall(args: GitWorkflowArgs): GenericCallView {
  return { card: 'generic', title: `git ${args.action}`, kind: 'other', rawInput: args.action }
}

/**
 * Resolve the workspace root a git command runs in: the calling agent's
 * session cwd, else the sandbox policy's fallback workspace root.
 *
 * @param ctx - context carrying the `sandboxPolicy` service.
 * @param exec - the tool-execution context supplying the optional agent.
 * @returns the absolute root directory.
 */
export function resolveWorkspaceRoot(ctx: Context, exec: ToolExecution): string {
  return exec.agent?.session.header.cwd ?? ctx.sandboxPolicy.resolve().workspaceRoot
}

/**
 * Register the `git_workflow` tool.
 *
 * @param ctx - context whose `tools`, `shell`, and `sandboxPolicy` services carry the registration.
 * @param maxOutputChars - cap on one complete formatted output.
 * @param timeoutMs - cooperative timeout budget attached to the tool and each git command.
 */
export function applyGitWorkflowTool(ctx: Context, maxOutputChars: number, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'git_workflow',
    description: 'Git workflow over the workspace root (Aider-style): status (porcelain + diff stat), diff (optionally one file), commit (stages everything, message required), rollback (discards uncommitted work; dangerous).',
    parameters: {
      action: { type: 'string', required: true, enum: ['status', 'diff', 'commit', 'rollback'] },
      message: { type: 'string', description: 'commit 时必填的提交信息' },
      file: { type: 'string', description: 'diff 时可选的文件路径' },
    },
    timeoutMs,
    // commit and rollback mutate the work tree.
    isConcurrencySafe: () => false,
    async execute(args: GitWorkflowArgs, exec) {
      const { action, message } = parseGitWorkflowArgs(args)
      const root = resolveWorkspaceRoot(ctx, exec)
      const first = await runGit(ctx, root, gitArgsFor(action, args.file), timeoutMs, exec.signal)
      if (first.exitCode !== 0) {
        throw new Error(`git ${action} failed (exit ${String(first.exitCode)}): ${first.stderr.trim()}`)
      }
      let output = first.stdout.trim()
      if (action === 'commit' && message !== undefined) {
        const second = await runGit(ctx, root, ['commit', '-m', message], timeoutMs, exec.signal)
        if (second.exitCode !== 0) {
          throw new Error(`git commit failed (exit ${String(second.exitCode)}): ${second.stderr.trim()}`)
        }
        output = second.stdout.trim()
      }
      const truncated = output.length > maxOutputChars
      return {
        action,
        output: truncated ? output.slice(0, maxOutputChars) : output,
        truncated,
        // `-1` when git died from a signal (the shell seam reports `null`).
        // The shell seam types this `number`, but a signal death reports `null` at runtime.
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- runtime null from the executor
        exitCode: first.exitCode === null ? -1 : first.exitCode,
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          output: { type: 'string', required: true },
          truncated: { type: 'boolean', required: true },
          exitCode: { type: 'integer' },
        },
      },
      render: (_args, raw) => [{ type: 'text', text: formatGitWorkflowOutput(raw as GitWorkflowResult, maxOutputChars) }],
    },
    presentCall: presentGitWorkflowCall,
  }))
}
