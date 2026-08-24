/**
 * VS debate arena view: one conversation.view tab rendering the live debate
 * scoreboard. The host agent runs the debate with subagents and emits round
 * reports into the transcript; this view folds those markers into side
 * cards, a round list, and the judge's verdict banner.
 */
import { useMemo, type ReactElement } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { deriveDebate } from './markers.ts'
import css from './DebateView.module.css'

/** Debate view props: runtime share (useSession) and the locale seat. */
export type DebateViewProps =
  PropsRuntime<'conversation.view'>
  & PropsLocale<'nightcity-debate'>

/**
 * Render the VS debate arena.
 * @param props - `useSession` from the runtime share; `t` from the locale seat.
 * @returns the scoreboard, or the empty-state protocol hint.
 */
export function DebateView(props: DebateViewProps): ReactElement {
  const nodes = props.useSession(s => s.nodes)
  const state = useMemo(() => deriveDebate(assistantTexts(nodes)), [nodes])
  return (
    <div className={css.root}>
      {state.topic !== undefined && (
        <p className={css.topic}>{props.t('debate.topic')}：{state.topic}</p>
      )}
      {state.rounds.length === 0 && state.verdict === undefined
        ? (
          <section className={css.empty}>
            <p className={css.emptyTitle}>{props.t('debate.empty.title')}</p>
            <p className={css.emptyHint}>{props.t('debate.empty.hint')}</p>
          </section>
        )
        : (
          <>
            <div className={css.versus}>
              <SideCard label={props.t('debate.side.pro')} excerpt={state.rounds.at(-1)?.pro} accent="pro" />
              <span className={css.vs}>VS</span>
              <SideCard label={props.t('debate.side.con')} excerpt={state.rounds.at(-1)?.con} accent="con" />
            </div>
            <ol className={css.rounds}>
              {state.rounds.map(round => (
                <li key={round.round}>
                  <span className={css.roundNo}>{props.t('debate.round')} {round.round}</span>
                  <span className={css.roundPro}>{round.pro ?? '—'}</span>
                  <span className={css.roundCon}>{round.con ?? '—'}</span>
                </li>
              ))}
            </ol>
            {state.verdict !== undefined && (
              <p className={css.verdict}>{props.t('debate.verdict')}：{state.verdict}</p>
            )}
          </>
        )}
    </div>
  )
}

/** One side's status card. */
function SideCard({ label, excerpt, accent }: { label: string; excerpt: string | undefined; accent: 'pro' | 'con' }): ReactElement {
  return (
    <div className={accent === 'pro' ? css.card + ' ' + css.cardPro : css.card + ' ' + css.cardCon}>
      <p className={css.cardLabel}>{label}</p>
      <p className={css.cardExcerpt}>{excerpt ?? '—'}</p>
    </div>
  )
}

/** Text shapes this view reads from chat nodes (structural, runtime-checked). */
interface AssistantTextSource {
  readonly kind: string
  readonly blocks?: readonly { readonly kind: string; readonly text?: string }[]
}

/**
 * Extract finalized assistant texts from conversation nodes.
 * @param nodes - the session's chat nodes.
 * @returns text blocks of assistant nodes, in transcript order.
 */
function assistantTexts(nodes: readonly unknown[]): readonly string[] {
  const texts: string[] = []
  for (const node of nodes) {
    const candidate = node as AssistantTextSource
    if (candidate.kind !== 'assistant' || candidate.blocks === undefined) continue
    for (const block of candidate.blocks) {
      if (block.kind === 'text' && block.text !== undefined && block.text !== '') texts.push(block.text)
    }
  }
  return texts
}
