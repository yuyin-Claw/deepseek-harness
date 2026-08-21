/**
 * Off-peak settings row store: a mirror of the durable settings document.
 * The plugin's apply-world adoption listener is the only writer; the row
 * component reads via props.useStore.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** Store state mirrored from the settings scope. */
export interface OffpeakRowState {
  /** Whether deferral is armed. */
  enabled: boolean
  /** Scope revision; -1 until first adoption so revision 0 lands as a change. */
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type OffpeakRowActions = {
  sync: (draft: OffpeakRowState, enabled: boolean, revision: number) => void
}

/**
 * Declares the off-peak row state and write surface.
 * @returns the store handle.
 */
export function createOffpeakRowStore(): EngineStoreHandle<OffpeakRowState, OffpeakRowActions> {
  return defineStore({
    init: (): OffpeakRowState => ({ enabled: false, revision: -1 }),
    actions: {
      sync: (d, enabled: boolean, revision: number) => {
        if (revision <= d.revision) return
        d.enabled = enabled
        d.revision = revision
      },
    },
  })
}
