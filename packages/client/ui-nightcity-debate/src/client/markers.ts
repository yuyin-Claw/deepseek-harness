/**
 * VS debate marker parsing: pure functions over assistant message text. The
 * debate protocol (documented in the README) has the host agent emit round
 * reports containing `⚔️ 第 n 回合` headers, `正方：…` / `反方：…` side
 * lines, a `辩题：…` topic line, and a final `⚖️ 判决` verdict line; this
 * module folds those markers into the state the arena view renders.
 */

/** One debate round with the sides' latest one-line stances. */
export interface DebateRound {
  /** Round number parsed from the header. */
  round: number
  /** Pro-side stance line, when reported. */
  pro: string | undefined
  /** Con-side stance line, when reported. */
  con: string | undefined
}

/** Derived debate state over a session transcript. */
export interface DebateState {
  /** Topic line (`辩题：…`) when the transcript names one. */
  topic: string | undefined
  /** Rounds in ascending order. */
  rounds: readonly DebateRound[]
  /** Judge's verdict line (`⚖️ 判决…`). */
  verdict: string | undefined
}

/** Round header: `⚔️ 第 n 回合`. */
const ROUND_PATTERN = /^⚔️\s*第\s*(\d+)\s*回合/

/** Side stance line: `正方：…` / `反方：…` / `裁判：…`. */
const SIDE_PATTERN = /^(正方|反方|裁判)[：:]\s*(.*)$/

/** Topic line: `辩题：…`. */
const TOPIC_PATTERN = /^辩题[：:]\s*(.*)$/

/** Verdict marker. */
const VERDICT_PATTERN = /⚖️/

/** Mutable accumulator shape the fold writes into. */
interface DebateAccumulator {
  topic: string | undefined
  rounds: DebateRound[]
  verdict: string | undefined
  /** Round receiving side lines until the next header, across messages. */
  lastRound: DebateRound | undefined
}

/**
 * Fold one assistant text into the debate state. Side lines after a round
 * header update that round — including side lines that arrive in later
 * messages before the next header; side lines before any header are ignored.
 * @param state - mutable accumulator over the transcript.
 * @param text - one assistant message's text.
 */
function foldText(state: DebateAccumulator, text: string): void {
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const roundMatch = ROUND_PATTERN.exec(line)
    if (roundMatch !== null) {
      const round = Number(roundMatch[1])
      let current = state.rounds.find(item => item.round === round)
      if (current === undefined) {
        current = { round, pro: undefined, con: undefined }
        state.rounds.push(current)
        state.rounds.sort((left, right) => left.round - right.round)
      }
      state.lastRound = current
      continue
    }
    const topicMatch = TOPIC_PATTERN.exec(line)
    if (topicMatch !== null) {
      state.topic = topicMatch[1]
      continue
    }
    const sideMatch = SIDE_PATTERN.exec(line)
    if (sideMatch !== null) {
      const content = sideMatch[2]
      if (content !== undefined && content !== '' && state.lastRound !== undefined) {
        if (sideMatch[1] === '正方') state.lastRound.pro = content
        if (sideMatch[1] === '反方') state.lastRound.con = content
      }
      continue
    }
    if (VERDICT_PATTERN.test(line)) state.verdict = line
  }
}

/**
 * Derive the debate state from assistant message texts, in transcript order.
 * @param texts - finalized assistant message texts.
 * @returns the folded debate state (empty when nothing matches).
 */
export function deriveDebate(texts: readonly string[]): DebateState {
  const state: DebateAccumulator = { topic: undefined, rounds: [], verdict: undefined, lastRound: undefined }
  for (const text of texts) foldText(state, text)
  return { topic: state.topic, rounds: state.rounds, verdict: state.verdict }
}
