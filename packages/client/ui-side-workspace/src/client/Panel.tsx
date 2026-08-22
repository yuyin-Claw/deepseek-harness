/**
 * Side workspace dock panel: a fixed right dock with three tabs — the forked
 * side conversation, per-file diffs, and read-only file browsing. Reads the
 * host API through the late-bound face exported by `src/client/index.ts`.
 */
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import classes from './Panel.module.css'
import { sideWorkspaceApi } from './index.ts'

/** One folded conversation message served by the host service. */
export interface SideMessage {
  /** `user` or `assistant`. */
  role: 'user' | 'assistant'
  /** Joined text blocks, clipped by the host. */
  text: string
  /** Source session-event seq, for stable list keys. */
  seq: number
}

/** One changed file with its porcelain status code. */
export interface DiffFileEntry {
  /** Workspace-relative path. */
  path: string
  /** Git porcelain status code. */
  status: string
}

/** Inject face: the seven remote methods of `ctx.sideWorkspace`. */
export interface SideWorkspaceInjected {
  /** Start the side conversation by forking the parent agent. */
  startConversation: (text: string) => Promise<{ childId: string }>
  /** Deliver the next user message to the running side conversation. */
  sendFollowup: (text: string) => Promise<{ ok: boolean }>
  /** Fold the side conversation's current surface into panel messages. */
  readConversation: () => Promise<{ messages: SideMessage[]; status: string }>
  /** List the workspace's changed files with status codes. */
  listDiffFiles: () => Promise<{ files: DiffFileEntry[] }>
  /** Read one file's diff against HEAD, clipped by the host. */
  readFileDiff: (file: string) => Promise<{ text: string }>
  /** List readable workspace files, bounded by the host scan budget. */
  listFiles: () => Promise<{ files: string[] }>
  /** Read one listed file's content, clipped by the host. */
  readFile: (path: string) => Promise<{ text: string; truncated: boolean; size: number }>
}

/** Panel tab. */
type Tab = 'chat' | 'diff' | 'files'

/** Extract an Error-typed message from an unknown rejection. */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** CSS class for one diff line: addition, deletion, hunk header, or context. */
function diffLineClass(line: string): string | undefined {
  if (line.startsWith('@@')) return classes.hunk
  if (line.startsWith('+')) return classes.add
  if (line.startsWith('-')) return classes.del
  return classes.context
}

/** Conversation polling interval in milliseconds. */
const POLL_MS = 2000

/**
 * The dock panel component.
 */
export function SideWorkspacePanel(): React.JSX.Element {
  const api = sideWorkspaceApi()
  const [collapsed, setCollapsed] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')
  const [error, setError] = useState('')

  const [messages, setMessages] = useState<SideMessage[]>([])
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  const [diffFiles, setDiffFiles] = useState<DiffFileEntry[] | null>(null)
  const [diffPath, setDiffPath] = useState('')
  const [diffText, setDiffText] = useState('')

  const [allFiles, setAllFiles] = useState<string[] | null>(null)
  const [filter, setFilter] = useState('')
  const [fileView, setFileView] = useState<{ path: string; text: string; truncated: boolean } | null>(null)

  // jsdom lacks Element.scrollIntoView; the narrow face keeps the test double honest.
  useEffect(() => {
    const end = listEndRef.current as { scrollIntoView?: (options: ScrollIntoViewOptions) => void } | null
    if (messages.length > 0) end?.scrollIntoView?.({ block: 'end' })
  }, [messages.length])

  /** Send the current input: first message starts the conversation, later ones follow up. */
  const send = useCallback(async (): Promise<void> => {
    const text = input.trim()
    if (text.length === 0 || running) return
    setInput('')
    setError('')
    setRunning(true)
    try {
      if (!started) {
        await api.startConversation(text)
        setStarted(true)
      } else {
        await api.sendFollowup(text)
      }
    } catch (err) {
      setError(errorMessage(err))
      setRunning(false)
    }
  }, [input, running, started, api])

  // Poll the side conversation every 2s while it runs; the final read lands
  // with the status flip, so no extra fetch is needed.
  useEffect(() => {
    if (!running) return
    let alive = true
    const timer = setInterval(() => {
      void api.readConversation().then((snap) => {
        if (!alive) return
        setMessages(snap.messages)
        if (snap.status !== 'running') setRunning(false)
      }).catch((err: unknown) => {
        if (!alive) return
        setError(errorMessage(err))
        setRunning(false)
      })
    }, POLL_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [running, api])

  // Refresh the transcript when returning to the chat tab while idle.
  useEffect(() => {
    if (tab !== 'chat' || running || !started) return
    void api.readConversation().then((snap) => { setMessages(snap.messages) }).catch(() => {})
  }, [tab, running, started, api])

  // Load the diff file list once per diff-tab visit cycle.
  useEffect(() => {
    if (tab !== 'diff' || diffFiles !== null) return
    void api.listDiffFiles().then((result) => { setDiffFiles(result.files) }).catch((err: unknown) => { setError(errorMessage(err)) })
  }, [tab, diffFiles, api])

  // Load the readable file list once per files-tab visit cycle.
  useEffect(() => {
    if (tab !== 'files' || allFiles !== null) return
    void api.listFiles().then((result) => { setAllFiles(result.files) }).catch((err: unknown) => { setError(errorMessage(err)) })
  }, [tab, allFiles, api])

  /** Open one file's diff view. */
  const openDiff = useCallback(async (path: string): Promise<void> => {
    setError('')
    setDiffPath(path)
    setDiffText('')
    try {
      const result = await api.readFileDiff(path)
      setDiffText(result.text)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [api])

  /** Drop the cached diff list and return to it, reloading from the host. */
  const refreshDiff = useCallback((): (void) => {
    setDiffFiles(null)
    setDiffPath('')
    setDiffText('')
  }, [])

  /** Open one listed file's read-only view. */
  const openFile = useCallback(async (path: string): Promise<void> => {
    setError('')
    try {
      const result = await api.readFile(path)
      setFileView({ path, text: result.text, truncated: result.truncated })
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [api])

  if (collapsed) {
    return (
      <button type="button" className={classes.rail} onClick={() => { setCollapsed(false) }} title="展开侧边工作区">
        侧边工作区
      </button>
    )
  }

  const shownFiles = allFiles?.filter(path => path.toLowerCase().includes(filter.toLowerCase())) ?? []

  return (
    <aside className={classes.dock}>
      <header className={classes.header}>
        <div className={classes.tabs}>
          <button type="button" className={tab === 'chat' ? classes.tabActive : classes.tab} onClick={() => { setTab('chat') }}>对话</button>
          <button type="button" className={tab === 'diff' ? classes.tabActive : classes.tab} onClick={() => { setTab('diff') }}>Diff</button>
          <button type="button" className={tab === 'files' ? classes.tabActive : classes.tab} onClick={() => { setTab('files') }}>文件</button>
        </div>
        <button type="button" className={classes.collapse} onClick={() => { setCollapsed(true) }} title="收起侧边工作区">⟩⟩</button>
      </header>
      {error.length > 0 && <div className={classes.error}>{error}</div>}
      <div className={classes.body}>
        {tab === 'chat' && (
          <div className={classes.chat}>
            <div className={classes.bubbles}>
              {messages.map(message => (
                <div key={message.seq} className={message.role === 'user' ? classes.bubbleUser : classes.bubbleAssistant}>
                  {message.text}
                </div>
              ))}
              {running && <div className={classes.hint}>生成中…</div>}
              {!running && started && messages.length === 0 && <div className={classes.hint}>会话已结束</div>}
              <div ref={listEndRef} />
            </div>
            <div className={classes.composer}>
              <textarea
                className={classes.input}
                value={input}
                rows={3}
                placeholder={started ? '继续对话…（Enter 发送，Shift+Enter 换行）' : '开启侧边对话…（Enter 发送）'}
                onChange={(event) => { setInput(event.target.value) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
              />
            </div>
          </div>
        )}
        {tab === 'diff' && (
          <div className={classes.pane}>
            {diffPath.length === 0
              ? (
                <ul className={classes.fileList}>
                  {(diffFiles ?? []).map(entry => (
                    <li key={entry.path}>
                      <button type="button" className={classes.fileRow} onClick={() => { void openDiff(entry.path) }}>
                        <span className={classes.statusBadge}>{entry.status}</span>
                        <span className={classes.filePath}>{entry.path}</span>
                      </button>
                    </li>
                  ))}
                  {diffFiles !== null && diffFiles.length === 0 && <li className={classes.hint}>没有变更文件</li>}
                </ul>
              )
              : (
                <div className={classes.detail}>
                  <div className={classes.detailBar}>
                    <button type="button" className={classes.linkButton} onClick={refreshDiff}>← 返回</button>
                    <span className={classes.filePath}>{diffPath}</span>
                    <button type="button" className={classes.linkButton} onClick={() => { void openDiff(diffPath) }}>刷新</button>
                  </div>
                  <pre className={classes.diff}>
                    {diffText.split('\n').map((line, index) => (
                      <span key={index} className={diffLineClass(line)}>{line}{'\n'}</span>
                    ))}
                  </pre>
                </div>
              )}
          </div>
        )}
        {tab === 'files' && (
          <div className={classes.pane}>
            {fileView === null
              ? (
                <div className={classes.browser}>
                  <input
                    className={classes.search}
                    type="text"
                    value={filter}
                    placeholder="搜索文件…"
                    onChange={(event) => { setFilter(event.target.value) }}
                  />
                  <ul className={classes.fileList}>
                    {shownFiles.map(path => (
                      <li key={path}>
                        <button type="button" className={classes.fileRow} onClick={() => { void openFile(path) }}>
                          <span className={classes.filePath}>{path}</span>
                        </button>
                      </li>
                    ))}
                    {allFiles !== null && shownFiles.length === 0 && <li className={classes.hint}>没有匹配的文件</li>}
                  </ul>
                </div>
              )
              : (
                <div className={classes.detail}>
                  <div className={classes.detailBar}>
                    <button type="button" className={classes.linkButton} onClick={() => { setFileView(null) }}>← 返回</button>
                    <span className={classes.filePath}>{fileView.path}</span>
                    <span className={classes.spacer} />
                  </div>
                  {fileView.truncated && <div className={classes.hint}>内容过长，已截断</div>}
                  <pre className={fileView.path.endsWith('.md') ? classes.prose : classes.code}>{fileView.text}</pre>
                </div>
              )}
          </div>
        )}
      </div>
    </aside>
  )
}
