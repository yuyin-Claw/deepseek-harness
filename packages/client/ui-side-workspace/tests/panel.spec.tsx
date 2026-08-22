// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import React from 'react'
import { SideWorkspacePanel, type SideWorkspaceInjected } from '../src/client/Panel.tsx'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** Stubbed inject face recording calls, with idle conversation reads. */
function makeStub(): { stub: SideWorkspaceInjected; sent: string[] } {
  const sent: string[] = []
  const stub: SideWorkspaceInjected = {
    startConversation: async (text) => { sent.push(text); return { childId: 'child-1' } },
    sendFollowup: async (text) => { sent.push(text); return { ok: true } },
    readConversation: async () => {
      if (sent.length === 0) return { messages: [], status: 'idle' }
      return {
        messages: [
          { role: 'user', text: sent.at(-1) ?? '', seq: 1 },
          { role: 'assistant', text: '好的，已处理。', seq: 2 },
        ],
        status: 'idle',
      }
    },
    listDiffFiles: async () => ({ files: [{ path: 'src/a.ts', status: 'M' }] }),
    readFileDiff: async file => ({ text: `@@ -1 +1 @@\n-old\n+new\n context for ${file}` }),
    listFiles: async () => ({ files: ['README.md', 'src/a.ts'] }),
    readFile: async path => ({ text: `content of ${path}`, truncated: false, size: 15 }),
  }
  return { stub, sent }
}

/** Render the panel with a stub inject face spread as props. */
async function render(stub: SideWorkspaceInjected): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    const root: Root = createRoot(container)
    root.render(React.createElement(SideWorkspacePanel, stub))
  })
  return container
}

/** Set a React-controlled textarea value and notify React. */
function setInputValue(input: HTMLTextAreaElement, value: string): void {
  Reflect.set(HTMLTextAreaElement.prototype, 'value', value, input)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('SideWorkspacePanel', () => {
  it('renders the three dock tabs', async () => {
    const { stub } = makeStub()
    const container = await render(stub)
    expect(container.textContent).toContain('对话')
    expect(container.textContent).toContain('Diff')
    expect(container.textContent).toContain('文件')
  })

  it('starts the side conversation on Enter and shows the reply', async () => {
    const { stub, sent } = makeStub()
    const container = await render(stub)
    const input = container.querySelector('textarea')
    expect(input).not.toBeNull()
    await act(async () => {
      setInputValue(input as HTMLTextAreaElement, '帮我看下这个改动')
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(sent).toEqual(['帮我看下这个改动'])
    // Let the 2s poll deliver the folded transcript: flush the interval.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 2100)) })
    expect(container.textContent).toContain('好的，已处理。')
  })

  it('collapses to the right-edge rail and expands back', async () => {
    const { stub } = makeStub()
    const container = await render(stub)
    const collapse = [...container.querySelectorAll('button')].find(button => button.title === '收起侧边工作区')
    expect(collapse).toBeDefined()
    await act(async () => { collapse?.click() })
    const rail = [...container.querySelectorAll('button')].find(button => button.title === '展开侧边工作区')
    expect(rail).toBeDefined()
    await act(async () => { rail?.click() })
    expect(container.textContent).toContain('对话')
  })
})
