# @deepseek-ai/dsh-client-ui-nightcity-voice

Nightcity voice input: a mic toggle at the right end of the composer tool row. Web Speech API dictation appends each final utterance to the composer draft through the standard input-actions face; the entry renders nothing where SpeechRecognition is unavailable.

## Model Experience

No model-visible behavior. Pure client presentation; no token or KV-cache impact.

## How it mounts

- `ctx.locale.register('nightcity-voice', { zh, en })` owns the toggle copy.
- A `conversation.input.right` entry (`nightcity-voice`, order 20) reads the InputZone draft snapshot and writes through `inputActions.setDraft(draft + ' ' + transcript)`.

## Known Limitations and Deferred Work

- Interim (non-final) results are not surfaced live; only final utterances land.
- Continuous mode stays on until the user toggles off; no silence timeout.
