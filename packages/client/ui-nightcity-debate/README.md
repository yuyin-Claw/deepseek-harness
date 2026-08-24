# @deepseek-ai/dsh-client-ui-nightcity-debate

Nightcity VS debate arena: one additive `conversation.view` tab rendering the live debate scoreboard — pro/con side cards, a round list, and the judge's verdict banner. The debate itself runs on the host side with the session's ordinary subagent tools; this tab only reads the transcript.

## Debate protocol (model-side)

Prompt the host agent with a topic and this protocol; it fans out pro, con, and judge subagents with the existing delegation tools and emits round reports into the transcript using these markers, which the arena view parses (`src/client/markers.ts`):

```text
辩题：<topic>
⚔️ 第 1 回合
正方：<one-line stance>
反方：<one-line stance>
...
⚔️ 判决：<winner and one-line reasoning>
```

A side line updates the most recent round header; reports may split across messages.

## How it mounts

- `ctx.locale.register('nightcity-debate', { zh, en })` owns the copy; the tab label binds through `ctx.locale.bind`.
- A `conversation.view` entry (`nightcity-debate`, order 6) reads finalized assistant text blocks via the standard `useSession` hook and folds markers with a pure function.

## Model Experience

None, as the arena renders already-logged assistant text only.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.


## Known Limitations and Deferred Work

- Subagent identity is not correlated: side cards show the latest stances only, not which model or subagent session produced them (needs a subagent-directory read channel).
- Streaming (partial) assistant text is ignored; stances appear when a message finalizes.
