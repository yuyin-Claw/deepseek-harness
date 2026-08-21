# @deepseek-ai/dsh-client-ui-nightcity-persona

Nightcity persona plate: a composer-dock row showing the persona whose turn it is — the netrunner while the input phase is `plain`, the operator while a submission is in flight. The user side shows the user-supplied CG portrait artwork (inlined as a data URL); the operator side keeps a placeholder until its art is supplied.

## How it mounts

- `ctx.locale.register('nightcity-persona', { zh, en })` owns the nameplate copy.
- A `conversation.composer.dock` entry (`nightcity-persona`, order −100) maps the InputZone phase to the persona mood.

## Model Experience

None, as the persona plate maps input phase to browser presentation.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.


## Known Limitations and Deferred Work

- Per-message CG avatars need a chat-row seat the upstream conversation does not declare; the plate is the sanctioned surface until one exists (design used Neon's fork-added `conversation.chat.persona` seat, which upstream lacks).
- The user artwork is inlined as a base64 data URL (the base client build serves plugin factories, not sibling asset directories), adding ~545 KB to the bundle. The source PNG lives at `src/client/assets/nightcity/user-portrait.png`; the operator-side avatar is still an SVG placeholder until its art is supplied.
