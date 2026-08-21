# @deepseek-ai/dsh-client-ui-nightcity-persona

Nightcity persona plate: a composer-dock row showing the persona whose turn it is — the netrunner while the input phase is `plain`, the operator while a submission is in flight. Portraits are original SVG placeholders for user-supplied CG artwork.

## Model Experience

No model-visible behavior. Pure client presentation; no token or KV-cache impact.

## How it mounts

- `ctx.locale.register('nightcity-persona', { zh, en })` owns the nameplate copy.
- A `conversation.composer.dock` entry (`nightcity-persona`, order −100) maps the InputZone phase to the persona mood.

## Known Limitations and Deferred Work

- Per-message CG avatars need a chat-row seat the upstream conversation does not declare; the plate is the sanctioned surface until one exists (design used Neon's fork-added `conversation.chat.persona` seat, which upstream lacks).
- User-supplied CG artwork will replace the SVG silhouettes.
