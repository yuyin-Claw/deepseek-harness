/**
 * Nightcity off-peak plugin, node half: registers the durable
 * `ui-nightcity-offpeak` settings section so the browser row's writes
 * persist. Without this registration the settings service drops writes to
 * the unknown namespace and the toggle cannot arm.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { OFFPEAK_SETTINGS_NAMESPACE, type OffpeakSettings } from './offpeak-settings.ts'

/** The durable section's schema: one boolean arm switch, default off. */
const Section = z.object({
  enabled: z.boolean().default(false),
}) as z<OffpeakSettings>

/**
 * Host plugin body: register the settings section with its default.
 * @param ctx - host root context.
 */
export function apply(ctx: Context): void {
  installSettingsSection(
    ctx,
    settingsNamespace(OFFPEAK_SETTINGS_NAMESPACE),
    Section,
    { enabled: false },
    { setSource: () => {}, onChange: () => {} },
  )
}
