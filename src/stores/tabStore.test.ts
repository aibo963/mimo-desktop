import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from './tabStore'

beforeEach(() => {
  localStorage.clear()
  useTabStore.setState({
    tabs: [{ id: '1', title: '新对话', messages: [], createdAt: Date.now(), agentMode: false }],
    activeTabId: '1',
  })
})

describe('useTabStore', () => {
  it('initializes with one default tab', () => {
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(activeTabId).toBe('1')
  })

  it('adds a new tab', () => {
    const id = useTabStore.getState().addTab()
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(2)
    expect(activeTabId).toBe(id)
    expect(tabs[1].title).toBe('新对话')
  })

  it('closes a tab and creates new one if last', () => {
    useTabStore.getState().closeTab('1')
    const { tabs, activeTabId } = useTabStore.getState()
    expect(tabs).toHaveLength(1)
    expect(activeTabId).not.toBe('1')
  })

  it('closes a tab and switches to adjacent', () => {
    const id2 = useTabStore.getState().addTab()
    useTabStore.getState().addTab()
    useTabStore.getState().closeTab(id2)
    const { tabs } = useTabStore.getState()
    expect(tabs).toHaveLength(2)
  })

  it('sets active tab', () => {
    const id2 = useTabStore.getState().addTab()
    useTabStore.getState().setActiveTab(id2)
    expect(useTabStore.getState().activeTabId).toBe(id2)
  })

  it('renames a tab', () => {
    useTabStore.getState().renameTab('1', 'My Chat')
    expect(useTabStore.getState().tabs[0].title).toBe('My Chat')
  })

  it('updates messages for a tab', () => {
    const msgs = [
      {
        id: 'm1',
        role: 'user' as const,
        content: 'hi',
        status: 'done' as const,
        timestamp: Date.now(),
      },
    ]
    useTabStore.getState().updateMessages('1', msgs)
    expect(useTabStore.getState().tabs[0].messages).toEqual(msgs)
  })

  it('deletes a message from a tab', () => {
    const msgs = [
      {
        id: 'm1',
        role: 'user' as const,
        content: 'hi',
        status: 'done' as const,
        timestamp: Date.now(),
      },
      {
        id: 'm2',
        role: 'assistant' as const,
        content: 'hello',
        status: 'done' as const,
        timestamp: Date.now(),
      },
    ]
    useTabStore.getState().updateMessages('1', msgs)
    useTabStore.getState().deleteMessage('1', 'm1')
    expect(useTabStore.getState().tabs[0].messages).toHaveLength(1)
    expect(useTabStore.getState().tabs[0].messages[0].id).toBe('m2')
  })

  it('reorders tabs', () => {
    const id2 = useTabStore.getState().addTab()
    const id3 = useTabStore.getState().addTab()
    useTabStore.getState().reorderTabs(0, 2)
    const { tabs } = useTabStore.getState()
    expect(tabs[0].id).toBe(id2)
    expect(tabs[1].id).toBe(id3)
    expect(tabs[2].id).toBe('1')
  })

  it('sets agent mode for a tab', () => {
    useTabStore.getState().setAgentMode('1', true)
    expect(useTabStore.getState().tabs[0].agentMode).toBe(true)
  })

  it('getActiveTab returns current tab', () => {
    const tab = useTabStore.getState().getActiveTab()
    expect(tab?.id).toBe('1')
  })

  it('persists to localStorage', () => {
    useTabStore.getState().renameTab('1', 'Persisted')
    const saved = localStorage.getItem('mimo-tabs')
    expect(saved).toBeTruthy()
    const parsed = JSON.parse(saved!)
    expect(parsed.tabs[0].title).toBe('Persisted')
  })
})
