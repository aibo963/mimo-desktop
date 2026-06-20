import { create } from 'zustand'
import { Message } from '../hooks/useBaseChat'
import { debug } from '@/lib/debug'

interface Tab {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  agentMode: boolean
  agentSteps?: number
  agentCurrentStep?: number
  agentProcessing?: boolean
}

interface TabStore {
  tabs: Tab[]
  activeTabId: string
  addTab: () => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  renameTab: (id: string, title: string) => void
  getActiveTab: () => Tab | undefined
  updateMessages: (id: string, messages: Message[]) => void
  deleteMessage: (tabId: string, messageId: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  setAgentMode: (id: string, enabled: boolean) => void
  setAgentStatus: (id: string, processing: boolean, steps?: number, currentStep?: number) => void
}

const STORAGE_KEY = 'mimo-tabs'

function loadTabs(): { tabs: Tab[]; activeTabId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data.tabs) && data.tabs.length > 0 && data.activeTabId) {
        return { tabs: data.tabs, activeTabId: data.activeTabId }
      }
    }
  } catch (e) {
    debug.error('Failed to load tabs from localStorage', e)
  }
  return {
    tabs: [{ id: '1', title: '新对话', messages: [], createdAt: Date.now(), agentMode: false }],
    activeTabId: '1',
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function saveTabsDebounced(tabs: Tab[], activeTabId: string) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      const toSave = tabs.map((t) => ({
        ...t,
        messages: t.messages.slice(-100),
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: toSave, activeTabId }))
    } catch (e) {
      debug.error('Failed to save tabs to localStorage', e)
    }
  }, 500)
}

function saveTabsImmediate(tabs: Tab[], activeTabId: string) {
  if (saveTimeout) clearTimeout(saveTimeout)
  try {
    const toSave = tabs.map((t) => ({
      ...t,
      messages: t.messages.slice(-100),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: toSave, activeTabId }))
  } catch (e) {
    debug.error('Failed to save tabs to localStorage', e)
  }
}

const initial = loadTabs()

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: initial.tabs,
  activeTabId: initial.activeTabId,
  addTab: () => {
    const id = crypto.randomUUID()
    const next = {
      tabs: [
        ...get().tabs,
        { id, title: '新对话', messages: [], createdAt: Date.now(), agentMode: false },
      ],
      activeTabId: id,
    }
    set(next)
    saveTabsImmediate(next.tabs, next.activeTabId)
    return id
  },
  closeTab: (id) => {
    const s = get()
    const filtered = s.tabs.filter((t) => t.id !== id)
    let next: { tabs: Tab[]; activeTabId: string }
    if (filtered.length === 0) {
      const newId = crypto.randomUUID()
      next = {
        tabs: [
          { id: newId, title: '新对话', messages: [], createdAt: Date.now(), agentMode: false },
        ],
        activeTabId: newId,
      }
    } else {
      const newActive = s.activeTabId === id ? filtered[filtered.length - 1].id : s.activeTabId
      next = { tabs: filtered, activeTabId: newActive }
    }
    set(next)
    saveTabsImmediate(next.tabs, next.activeTabId)
  },
  setActiveTab: (id) => {
    set({ activeTabId: id })
    saveTabsImmediate(get().tabs, id)
  },
  renameTab: (id, title) => {
    const s = get()
    const next = {
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
      activeTabId: s.activeTabId,
    }
    set({ tabs: next.tabs })
    saveTabsImmediate(next.tabs, next.activeTabId)
  },
  getActiveTab: () => {
    const s = get()
    return s.tabs.find((t) => t.id === s.activeTabId)
  },
  updateMessages: (id, messages) => {
    const s = get()
    const next = {
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, messages } : t)),
      activeTabId: s.activeTabId,
    }
    set({ tabs: next.tabs })
    saveTabsDebounced(next.tabs, next.activeTabId)
  },
  deleteMessage: (tabId, messageId) => {
    const s = get()
    const tab = s.tabs.find((t) => t.id === tabId)
    if (!tab) return
    const messages = tab.messages.filter((m) => m.id !== messageId)
    const next = {
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, messages } : t)),
      activeTabId: s.activeTabId,
    }
    set({ tabs: next.tabs })
    saveTabsDebounced(next.tabs, next.activeTabId)
  },
  reorderTabs: (fromIndex, toIndex) => {
    const s = get()
    const tabs = [...s.tabs]
    const [moved] = tabs.splice(fromIndex, 1)
    tabs.splice(toIndex, 0, moved)
    set({ tabs })
    saveTabsImmediate(tabs, s.activeTabId)
  },
  setAgentMode: (id, enabled) => {
    const s = get()
    const tabs = s.tabs.map((t) => (t.id === id ? { ...t, agentMode: enabled } : t))
    set({ tabs })
    saveTabsImmediate(tabs, s.activeTabId)
  },
  setAgentStatus: (id, processing, steps, currentStep) => {
    const s = get()
    const tabs = s.tabs.map((t) =>
      t.id === id
        ? {
            ...t,
            agentProcessing: processing,
            agentSteps: steps,
            agentCurrentStep: currentStep,
          }
        : t
    )
    set({ tabs })
  },
}))
