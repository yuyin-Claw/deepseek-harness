# @deepseek-ai/dsh-client-ui-nightcity-hero

Nightcity blank-session hero: a neon SVG skyline brand mark shadowing `conversation.hero.brand.mark` (priority −1), a typewriter suggestion readout in `conversation.input.dock`, and a one-shot synthesized boot chime on the first pointer gesture. No binary assets — the mark is SVG, the chime is Web Audio.

## How it mounts

- `ctx.locale.register('nightcity-hero', { zh, en })` owns the suggestion copy (Chinese product copy).
- The brand mark registers at priority −1 (lowest renders), shadowing any priority-0 occupant without conflicting with it.
- The typewriter readout is display-only: suggestions guide the user's typing and never write the composer draft.

## Model Experience

None, as the hero landing is browser presentation only.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.


## Known Limitations and Deferred Work

- Suggestions are not clickable/sendable; wiring them into the composer draft needs a sanctioned cross-package channel that does not exist yet.
- User-supplied skyline artwork (`assets/nightcity/` per the design) will replace the SVG silhouette; the placeholder is original code.
