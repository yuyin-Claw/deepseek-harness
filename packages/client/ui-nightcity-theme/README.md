# @deepseek-ai/dsh-client-ui-nightcity-theme

Nightcity cyberpunk skin for the DSH web client: one scheme-invariant token override layer over the active base theme, plus a decorative frame-wide atmosphere (skyline silhouette, perspective grid, corner HUD brackets, scanline sweep) registered into `shell.overlay`.

## How it mounts

- `ctx.theme.overrideTokens('ui-nightcity-theme', NIGHTCITY_TOKENS)` — an override layer, not a selectable theme id, so the settings-scope adoption that governs selectable preferences never reverts the skin, and both base palettes receive the same dark neon values.
- A `shell.overlay` entry (`nightcity-hud`, order −100) renders the atmosphere; all animation is disabled under `prefers-reduced-motion`.

## Model Experience

None, as the token override layer manages browser presentation only.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.


## Known Limitations and Deferred Work

- The skin applies unconditionally; a user-facing on/off switch (settings row) is deferred.
- HUD colors are literal CSS, not alias tokens — they have no themed counterpart by design.
