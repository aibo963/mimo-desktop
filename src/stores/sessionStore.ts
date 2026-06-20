import { create } from 'zustand'
import { debug } from '@/lib/debug'

export interface Session {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount?: number
}

interface SessionStore {
  sessions: Session[]
  activeSessionId: string | null
  loading: boolean
  error: string | null
  fetchSessions: () => Promise<void>
  setActiveSession: (id: string | null) => void
  deleteSession: (id: string) => Promise<void>
  createNewSession: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null })
    try {
      const result = await window.mimoAPI.invoke({ action: 'list_sessions' })
      if (Array.isArray(result)) {
        set({ sessions: result, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (error: any) {
      debug.error('Failed to fetch sessions:', error)
      set({ loading: false, error: error.message || 'Failed to fetch sessions' })
    }
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id })
  },

  deleteSession: async (id: string) => {
    try {
      await window.mimoAPI.invoke({ action: 'delete_session', sessionId: id })
      const { sessions, activeSessionId } = get()
      const filtered = sessions.filter((s) => s.id !== id)
      set({
        sessions: filtered,
        activeSessionId: activeSessionId === id ? null : activeSessionId,
      })
    } catch (error: any) {
      debug.error('Failed to delete session:', error)
      set({ error: error.message || 'Failed to delete session' })
    }
  },

  createNewSession: () => {
    set({ activeSessionId: null })
  },
}))
