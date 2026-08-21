# @deepseek-ai/dsh-client-ui-nightcity-workbench

Nightcity workbench: one additive `conversation.view` tab whose central pane auto-switches with the live turn — the conversation pane while idle, the execution pane while a terminal-family tool call runs, the trajectory pane for any other in-flight tool activity. A manual pane pick suspends auto-switching until re-armed.

## Model Experience

No model-visible behavior. Pure client presentation; no token or KV-cache impact.

## How it mounts

- `ctx.locale.register('nightcity-workbench', { zh, en })` owns the copy; the tab label binds through `ctx.locale.bind` so it follows the active locale.
- A `conversation.view` entry (`nightcity-workbench`, order 5) reads `runningCalls`, `running`, and `queue` from the session snapshot via the standard `useSession` hook; pane derivation is a pure function (`src/client/panes.ts`).

## Known Limitations and Deferred Work

- The workbench is one view tab, not a replacement of the frame's central surface: upstream exposes no sanctioned write path into the conversation view-ring store from an external plugin, so auto-switching lives inside this tab.
- Terminal detection is name-pattern based (`bash|shell|terminal|exec|command`); a tool-shape signal would be sturdier.
