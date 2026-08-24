# @deepseek-ai/dsh-client-ui-nightcity-hero

Nightcity blank-session hero: a full-bleed user-supplied backdrop shown only during the hero phase, a typewriter suggestion readout in `conversation.input.dock`, and a one-shot synthesized boot chime on the first pointer gesture. The backdrop is the user-supplied artwork (九天应元雷声普化天尊) inlined as a data URL; the chime is Web Audio.

## How it mounts

- `ctx.locale.register('nightcity-hero', { zh, en })` owns the suggestion copy (Chinese product copy).
- A `shell.overlay` entry (`nightcity-hero-backdrop`, order −200) renders the artwork while the current session is absent or still blank (derived through the global `useSessions` hook) and hides once a conversation is current; click-through and aria-hidden.
- The typewriter readout is display-only: suggestions guide the user's typing and never write the composer draft.

## Model Experience

None, as the hero landing is browser presentation only.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.


## Known Limitations and Deferred Work

- Suggestions are not clickable/sendable; wiring them into the composer draft needs a sanctioned cross-package channel that does not exist yet.
- The artwork is inlined as a base64 data URL (the base client build serves plugin factories, not sibling asset directories), so the bundled JPEG adds ~630 KB to the plugin bundle. The full-resolution source PNG is kept at `src/client/assets/nightcity/hero-backdrop.png`; replacing the art means regenerating `src/client/hero-backdrop.ts` with a new data URL.
