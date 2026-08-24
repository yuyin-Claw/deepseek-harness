/**
 * The model-facing `repo_map` tool: a bounded recursive source-tree scan over
 * `ctx.fs` with per-file exported-symbol extraction and `git status` markers
 * over `ctx.shell`. This module owns the model-facing schema, the file-count
 * and directory-budget caps, filtering, and output formatting — never direct
 * filesystem or git access.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-fs'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import type { GitRunOutcome } from './git-workflow.ts'
import { resolveWorkspaceRoot, runGit } from './git-workflow.ts'
import type { RepoMapArgs, RepoMapEntry, RepoMapResult } from './types.ts'

/** Default cap on files listed by one call (the `maxFiles` config). */
export const REPO_MAP_MAX_FILES = 120

/** Default cap on directories visited by one scan (the `maxScanDirs` config). */
export const REPO_MAP_MAX_SCAN_DIRS = 5000

/** Directory names never entered by the scan. */
const SKIPPED_DIRS = new Set(['.git', '.hg', '.svn', 'node_modules', 'dist', 'build', 'lib', 'out', 'coverage', 'target', '__pycache__', '.venv', '.next'])

/** File extensions treated as source files. */
const SOURCE_EXTENSIONS = new Set(['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'rb', 'php', 'cs', 'swift', 'kt', 'scala', 'sh', 'c', 'h', 'cpp', 'hpp', 'cc', 'vue', 'svelte'])

/** Lines of a file scanned for symbols. */
const SYMBOL_SCAN_LINES = 400

/** Symbols reported per file. */
const SYMBOLS_PER_FILE = 8

/** Files larger than this are listed without symbol extraction. */
const MAX_SYMBOL_FILE_CHARS = 512_000

/**
 * Symbol declarations, tried in order per non-blank line. `undefined` captures
 * mean the pattern did not match; group 1 is the symbol name.
 */
const SYMBOL_PATTERNS: RegExp[] = [
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/,
  /^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/,
  /^(?:async\s+)?def\s+([A-Za-z_]\w*)/,
  /^class\s+([A-Za-z_]\w*)/,
  /^func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)/,
  /^(?:pub\s+)?(?:async\s+)?(?:fn|struct|enum|trait)\s+([A-Za-z_]\w*)/,
  /^(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:class|interface|enum)\s+([A-Za-z_]\w*)/,
]

/**
 * Extract exported or top-level symbol names from source text.
 *
 * @param content - the file's decoded text.
 * @returns up to {@link SYMBOLS_PER_FILE} distinct symbol names in declaration order.
 */
export function extractSymbols(content: string): string[] {
  if (content.length > MAX_SYMBOL_FILE_CHARS) return []
  const symbols: string[] = []
  const seen = new Set<string>()
  for (const line of content.split('\n', SYMBOL_SCAN_LINES)) {
    if (symbols.length >= SYMBOLS_PER_FILE) break
    const trimmed = line.trimStart()
    if (trimmed.length === 0 || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue
    for (const pattern of SYMBOL_PATTERNS) {
      const match = pattern.exec(trimmed)
      if (match !== null) {
        const name = match[1] ?? ''
        if (!seen.has(name)) {
          seen.add(name)
          symbols.push(name)
        }
        break
      }
    }
  }
  return symbols
}

/** Whether a listed entry is a source file this scan reports. */
function isSourceFile(name: string): boolean {
  const dot = name.lastIndexOf('.')
  return dot > 0 && SOURCE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

/**
 * Parse `git status --porcelain` output into a path→status-code map.
 *
 * @param outcome - the completed `git status --porcelain` run.
 * @returns relative path to the two-character code; empty outside a work tree.
 */
export function parseGitStatus(outcome: GitRunOutcome): Map<string, string> {
  const status = new Map<string, string>()
  if (outcome.exitCode !== 0 || outcome.stdout.trim().length === 0) return status
  for (const record of outcome.stdout.split('\0')) {
    if (record.length === 0) continue
    // One `-z` record is `XY <path>`; renames carry `XY ORIG -> PATH` — take the tail.
    const code = record.slice(0, 2).trim()
    let path = record.slice(3)
    const arrow = path.indexOf(' -> ')
    if (arrow >= 0) path = path.slice(arrow + 4)
    if (code.length > 0) status.set(path, code)
  }
  return status
}

/** Bounded result of one recursive directory walk. */
interface ScanOutcome {
  /** Source files found as resolved target plus scan-root-relative path, in walk order. */
  files: { target: FsTarget; path: string }[]
  /** Directories visited, including skipped-by-name children that were counted then not entered. */
  scannedDirs: number
  /** True when {@link maxScanDirs} stopped the walk early. */
  budgetExhausted: boolean
}

/**
 * Walk the tree depth-first over `ctx.fs.listDir`, collecting source files with
 * their scan-root-relative paths and counting every visited directory against
 * the scan budget.
 *
 * @param ctx - context whose `fs` service lists directories.
 * @param root - resolved target of the scan root.
 * @param maxScanDirs - upper bound on directories visited.
 * @param signal - cancellation signal forwarded to every listing.
 */
async function scanTree(
  ctx: Context,
  root: FsTarget,
  maxScanDirs: number,
  signal: AbortSignal | undefined,
): Promise<ScanOutcome> {
  const outcome: ScanOutcome = { files: [], scannedDirs: 0, budgetExhausted: false }
  const stack: { target: FsTarget; rel: string }[] = [{ target: root, rel: '' }]
  while (stack.length > 0) {
    if (outcome.scannedDirs >= maxScanDirs) {
      outcome.budgetExhausted = true
      break
    }
    const dir = stack.pop()
    if (dir === undefined) break
    outcome.scannedDirs++
    const children = await ctx.fs.listDir(dir.target, signal)
    for (const entry of children) {
      const rel = dir.rel.length === 0 ? entry.name : `${dir.rel}/${entry.name}`
      if (entry.type === 'directory') {
        if (!SKIPPED_DIRS.has(entry.name)) stack.push({ target: entry.target, rel })
      } else if (entry.type === 'file' && isSourceFile(entry.name)) {
        outcome.files.push({ target: entry.target, path: rel })
      }
    }
  }
  return outcome
}

/**
 * Format a completed `repo_map` run as model-facing text.
 *
 * @param result - the canonical output value.
 * @returns the root line, one `- path — exports: … [status]` line per file, and a truncation note when cut.
 */
export function formatRepoMapOutput(result: RepoMapResult): string {
  const parts = [`Repository map (root: ${result.root})`]
  for (const entry of result.entries) {
    const exports = entry.symbols.length > 0 ? ` — exports: ${entry.symbols.join(', ')}` : ''
    const marker = entry.gitStatus !== undefined ? ` [${entry.gitStatus}]` : ''
    parts.push(`- ${entry.path}${exports}${marker}`)
  }
  if (result.entries.length === 0) parts.push('No source files matched. Adjust subdir or focus.')
  else if (result.truncated) parts.push(`(Showing the first ${result.entries.length} matching files. Narrow with focus or subdir.)`)
  return parts.join('\n')
}

/**
 * Pending-call presentation: a generic card titled by the scan scope.
 *
 * @param args - the raw tool arguments; only subdir/focus feed the view.
 * @returns the generic card view shown while the call runs.
 */
export function presentRepoMapCall(args: RepoMapArgs): GenericCallView {
  const title = args.focus !== undefined ? `repo map: ${args.focus}` : 'repo map'
  return { card: 'generic', title, kind: 'search', rawInput: args.subdir ?? '.' }
}

/**
 * Register the `repo_map` tool.
 *
 * @param ctx - context whose `tools`, `fs`, `shell`, and `sandboxPolicy` services carry the registration.
 * @param maxFiles - deployment cap on files listed by one call.
 * @param maxScanDirs - deployment cap on directories visited by one scan.
 * @param timeoutMs - cooperative timeout budget attached to the tool and its git status call.
 */
export function applyRepoMapTool(ctx: Context, maxFiles: number, maxScanDirs: number, timeoutMs: number): void {
  ctx.tools.register(defineTool({
    name: 'repo_map',
    description: 'Build a repo map (Aider-style): source-file paths, exported-symbol summaries, and git status markers. Consult it before grep/read to locate code precisely and save context.',
    parameters: {
      subdir: { type: 'string', description: 'Directory to start from, relative to the workspace root. Defaults to the root.' },
      focus: { type: 'string', description: 'Keep only files whose path or an exported symbol contains this substring (case-insensitive).' },
      max_files: { type: 'integer', description: `Upper bound on listed files for this call. Defaults to ${String(maxFiles)}.` },
    },
    timeoutMs,
    // A read-only scan does not mutate parent-agent state.
    isConcurrencySafe: () => true,
    async execute(args: RepoMapArgs, exec) {
      const rootPath = resolveWorkspaceRoot(ctx, exec)
      const start = args.subdir !== undefined && args.subdir.length > 0 ? args.subdir : '.'
      const root = await ctx.fs.resolve(start, { cwd: rootPath, signal: exec.signal })
      const scan = await scanTree(ctx, root, maxScanDirs, exec.signal)
      const focus = args.focus?.toLowerCase()
      const limit = Math.max(1, args.max_files ?? maxFiles)
      const statusRun = await runGit(ctx, rootPath, ['-c', 'core.quotepath=false', 'status', '--porcelain', '-z'], timeoutMs, exec.signal)
      const gitStatus = parseGitStatus(statusRun)
      const entries: RepoMapEntry[] = []
      let truncated = scan.budgetExhausted
      const candidates = [...scan.files].sort((a, b) => a.path.localeCompare(b.path))
      // git status paths are repo-root-relative; a subdir scan must re-prefix its paths.
      const prefix = start === '.' ? '' : `${start.replace(/\/+$/, '')}/`
      for (const candidate of candidates) {
        if (entries.length >= limit) {
          truncated = true
          break
        }
        const path = candidate.path
        const content = await ctx.fs.readText(candidate.target, exec.signal)
        const symbols = extractSymbols(content)
        if (focus !== undefined && !path.toLowerCase().includes(focus) && !symbols.some(s => s.toLowerCase().includes(focus))) continue
        const code = gitStatus.get(`${prefix}${path}`)
        entries.push({ path, symbols, ...code !== undefined ? { gitStatus: code } : {} })
      }
      const value: RepoMapResult = {
        root: root.displayPath,
        entries,
        truncated,
        scannedDirs: scan.scannedDirs,
        isGitRepo: statusRun.exitCode === 0,
      }
      return value
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          root: { type: 'string', required: true },
          entries: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                path: { type: 'string', required: true },
                symbols: { type: 'array', required: true, items: { type: 'string' } },
                gitStatus: { type: 'string' },
              },
            },
          },
          truncated: { type: 'boolean', required: true },
          scannedDirs: { type: 'integer', required: true },
          isGitRepo: { type: 'boolean', required: true },
        },
      },
      render: (_args, raw) => [{ type: 'text', text: formatRepoMapOutput(raw as RepoMapResult) }],
    },
    presentCall: presentRepoMapCall,
  }))
}
