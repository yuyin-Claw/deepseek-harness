/**
 * Browser plugin for the side workspace dock: registers the fixed right-dock
 * panel into the `shell.overlay` slot. All host access goes through the
 * `sideWorkspace` remote API exposed by the client runtime.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: the client runtime's Context merge must be in the program for
// the ctx typing to carry `slots`.
import type {} from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the 'shell.overlay' SlotMap row (declared by the slot's owning
// package) must be in the program for the register call to type.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { SideWorkspacePanel, type SideWorkspaceInjected } from './Panel.tsx'

/** Required service: the slot registry that owns `shell.overlay`. */
export const inject = ['slots']

/** Reachable shape of `ctx.api` on the client context. */
type ApiRoot = { api?: { sideWorkspace?: SideWorkspaceInjected } }

/** Late-bound host API face, resolved in apply and read by the panel. */
let apiFace: SideWorkspaceInjected | undefined

/**
 * Read the side-workspace remote API face.
 * @returns the seven-method face the panel calls.
 * @throws before apply has resolved the connection's API root.
 */
export function bindSideWorkspaceApi(face: SideWorkspaceInjected): void {
  apiFace = face
}

export function sideWorkspaceApi(): SideWorkspaceInjected {
  if (apiFace === undefined) throw new Error('ui-side-workspace: ctx.api.sideWorkspace is unavailable')
  return apiFace
}

/**
 * Client plugin body: register the dock panel into the shell overlay slot.
 * The registration rides the slot service's inject wrapper, so plugin unload
 * or slot redeclaration removes the panel.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.slots.inject('shell.overlay', () => {
    apiFace = (ctx as unknown as ApiRoot).api?.sideWorkspace
    return ctx.slots.register({
      name: 'shell.overlay',
      id: 'side-workspace',
      order: 100,
    }, SideWorkspacePanel)
  })
}
