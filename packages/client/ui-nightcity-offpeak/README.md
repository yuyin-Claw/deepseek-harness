# @deepseek-ai/dsh-client-ui-nightcity-offpeak

Nightcity off-peak execution: a General-settings row arming the durable `ui-nightcity-offpeak.enabled` setting, plus a live schedule readout. Peak windows are Beijing wall-clock 09:00–12:00 and 14:00–18:00.

## Model Experience

No model-visible behavior. The toggle is a durable user setting consumed by future host-side gating; no token or KV-cache impact.

## How it mounts

- `ctx.settingsScope.bind({ namespace: 'ui-nightcity-offpeak' })` owns the durable `enabled` field.
- A `settings.general.item` entry (`nightcity-offpeak`, order 30) mirrors the setting into a declared store; the status line derives purely from the wall clock (`src/offpeak-settings.ts`, node-safe pure logic).

## Known Limitations and Deferred Work

- Enforcement (actually deferring scheduled jobs through the peak windows) requires a host-side gate plugin reading the same setting; this package owns the setting and its settings surface only.
