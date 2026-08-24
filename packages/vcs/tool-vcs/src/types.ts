/**
 * Type-only vocabulary for `@deepseek-ai/dsh-tool-vcs`: the model-facing
 * argument records of `repo_map` / `git_workflow`, the structured result
 * values both tools return, and the presentation views derived from them.
 * @module @deepseek-ai/dsh-tool-vcs/types
 */

/** Model-facing `repo_map` arguments (all optional). */
export interface RepoMapArgs {
  /** Directory to start from, relative to the workspace root. Defaults to the root. */
  subdir?: string
  /** Only keep files whose path or an exported symbol contains this substring (case-insensitive). */
  focus?: string
  /** Upper bound on listed files for this call. Defaults to the deployment's `maxFiles` config. */
  max_files?: number
}

/** One listed source file. */
export interface RepoMapEntry {
  /** Workspace-relative path of the file, using `/` separators. */
  path: string
  /** Exported or top-level symbol names extracted from the file, in declaration order. */
  symbols: string[]
  /** Two-character `git status --porcelain` code (`M`, `??`, …) when the file differs from HEAD. */
  gitStatus?: string
}

/** Canonical `repo_map` output value. */
export interface RepoMapResult {
  /** Absolute root directory the scan started from. */
  root: string
  /** Matching files, sorted by path. */
  entries: RepoMapEntry[]
  /** True when `max_files` or the `maxScanDirs` budget cut the listing or the scan. */
  truncated: boolean
  /** Number of directories visited (bounded by `maxScanDirs`). */
  scannedDirs: number
  /** True when the root is inside a git work tree and per-file status markers were collected. */
  isGitRepo: boolean
}

/** The closed action set of `git_workflow`. */
export type GitWorkflowAction = 'status' | 'diff' | 'commit' | 'rollback'

/** Model-facing `git_workflow` arguments. */
export interface GitWorkflowArgs {
  /** Which workflow step to run. */
  action: GitWorkflowAction
  /** Commit message; required for `commit`, rejected for every other action. */
  message?: string
  /** Restrict `diff` to one file path. Ignored by other actions. */
  file?: string
}

/** Canonical `git_workflow` output value. */
export interface GitWorkflowResult {
  /** The executed action, echoed for replay and presentation. */
  action: GitWorkflowAction
  /** Human-readable git output (status text, diff, or the commit/rollback summary). */
  output: string
  /** True when `diffMaxChars` cut the output. */
  truncated: boolean
  /** The underlying git exit code; `-1` when git died from a signal. */
  exitCode: number
}
