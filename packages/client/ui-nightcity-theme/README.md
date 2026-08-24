# @deepseek-ai/dsh-client-ui-nightcity-theme

Nightcity cyberpunk skin for the DSH web client: one override stylesheet over the base palette (signature dark neon behind `body[data-ds-dark-theme]`, a pale-lavender counterpart on `body` — the same selectors the shipped palettes use, so the override wins by document order in both schemes), plus a decorative frame-wide atmosphere (skyline silhouette, perspective grid, corner HUD brackets, scanline sweep) registered into `shell.overlay`.

## How it mounts

- The stylesheet carries both scheme values behind the base palette's own `body[data-ds-dark-theme]` activation attribute, so the Appearance switch and any attribute-level activation flip the skin through the ordinary cascade — no inline variables pin one scheme, and the settings-scope adoption that governs selectable theme ids is never involved.
- A `shell.overlay` entry (`nightcity-hud`, order −100) renders the atmosphere; all animation is disabled under `prefers-reduced-motion`.

## Model Experience

None, as the token override layer manages browser presentation only.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.


## Known Limitations and Deferred Work

- The skin applies unconditionally; a user-facing on/off switch (settings row) is deferred.
- HUD colors are literal CSS, not alias tokens — they have no themed counterpart by design.
