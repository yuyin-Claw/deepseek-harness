/**
 * Model-facing VCS tools over the filesystem and shell seams: `repo_map`
 * (bounded source-tree scan with exported symbols and git status markers) and
 * `git_workflow` (status / diff / commit / rollback). This package owns tool
 * schemas, argument validation, caps, and output presentation — all file and
 * git access goes through `ctx.fs` and `ctx.shell`.
 * @module @deepseek-ai/dsh-tool-vcs
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { applyGitWorkflowTool } from './git-workflow.ts'
import { applyRepoMapTool, REPO_MAP_MAX_FILES, REPO_MAP_MAX_SCAN_DIRS } from './repo-map.ts'

export {
  applyGitWorkflowTool,
  formatGitWorkflowOutput,
  parseGitWorkflowArgs,
  presentGitWorkflowCall,
  runGit,
} from './git-workflow.ts'
export type { GitRunOutcome } from './git-workflow.ts'
export {
  applyRepoMapTool,
  extractSymbols,
  formatRepoMapOutput,
  parseGitStatus,
  presentRepoMapCall,
  REPO_MAP_MAX_FILES,
  REPO_MAP_MAX_SCAN_DIRS,
} from './repo-map.ts'
export type { RepoMapArgs, RepoMapEntry, RepoMapResult, GitWorkflowAction, GitWorkflowArgs, GitWorkflowResult } from './types.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-vcs'

/** Services required by the VCS tool suite. */
export const inject = ['tools', 'fs', 'shell', 'sandboxPolicy']

/** Default cooperative tool-call timeout budget (ms) for the VCS tools. */
export const DEFAULT_VCS_TOOL_TIMEOUT_MS = 30_000

/** Default cap on one `git_workflow` output. */
export const DEFAULT_DIFF_MAX_CHARS = 50_000

/** Plugin config: which VCS tools to register and their scan/output/timeout bounds. */
export interface Config {
  /** Register `repo_map`. Defaults to true. */
  repoMap?: boolean
  /** Register `git_workflow`. Defaults to true. */
  gitWorkflow?: boolean
  /** Upper bound on files listed by one `repo_map` call. Defaults to 120. */
  maxFiles?: number
  /** Upper bound on directories visited by one `repo_map` scan. Defaults to 5000. */
  maxScanDirs?: number
  /** Cap on one complete `git_workflow` output (diff, status, commit summary). Defaults to 50000. */
  diffMaxChars?: number
  /** Cooperative timeout budget (ms) for both tools and each git command. Defaults to 30000. */
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  repoMap: z.boolean().default(true),
  gitWorkflow: z.boolean().default(true),
  maxFiles: z.number().default(REPO_MAP_MAX_FILES),
  maxScanDirs: z.number().default(REPO_MAP_MAX_SCAN_DIRS),
  diffMaxChars: z.number().default(DEFAULT_DIFF_MAX_CHARS),
  timeoutMs: z.number().default(DEFAULT_VCS_TOOL_TIMEOUT_MS),
})

/** Complete config after schemastery applies every field default. */
type ResolvedConfig = Required<Config>

/** Configured count and character caps must be positive integers. */
function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`tool-vcs: ${name} must be a positive integer`)
  }
}

/**
 * Register the enabled VCS tools. `repoMap`/`gitWorkflow` default to true; a
 * product that wants only one disables the other in config. The tools'
 * disposers are fiber-scoped (the effect-based registry cleans up on dispose),
 * so no manual teardown is needed.
 */
export function apply(ctx: Context, config: Config): void {
  // schemastery (Config) has already filled every defaulted field.
  const resolved = config as ResolvedConfig
  assertPositiveInteger('maxFiles', resolved.maxFiles)
  assertPositiveInteger('maxScanDirs', resolved.maxScanDirs)
  assertPositiveInteger('diffMaxChars', resolved.diffMaxChars)
  assertPositiveInteger('timeoutMs', resolved.timeoutMs)
  if (resolved.repoMap) applyRepoMapTool(ctx, resolved.maxFiles, resolved.maxScanDirs, resolved.timeoutMs)
  if (resolved.gitWorkflow) applyGitWorkflowTool(ctx, resolved.diffMaxChars, resolved.timeoutMs)
}
