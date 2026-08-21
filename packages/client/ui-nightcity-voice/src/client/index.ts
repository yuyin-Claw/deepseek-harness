/**
 * Browser half of the nightcity voice-input plugin: a mic toggle at the
 * right end of the composer tool row. Feature-detects SpeechRecognition and
 * renders nothing where the API is absent; final transcripts append to the
 * composer draft through the standard input-actions face.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the input seats and the session standard kit (useInput /
// inputActions), plus the locale Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { VoiceMicButton } from './VoiceMicButton.tsx'
import { en, zh, type NightcityVoiceKey } from './locales.ts'

/** Locale namespace owning the mic toggle copy. */
export const NIGHTCITY_VOICE_NS = 'nightcity-voice'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The nightcity voice-input toggle. */
    'nightcity-voice': NightcityVoiceKey
  }
}

/** Required services: the slot registry and the locale runtime. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: register the toggle dictionaries and the mic entry.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NIGHTCITY_VOICE_NS, { zh, en }), 'ui-nightcity-voice: toggle dictionaries')
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'nightcity-voice',
    order: 20,
    locale: NIGHTCITY_VOICE_NS,
  }, VoiceMicButton))
}
