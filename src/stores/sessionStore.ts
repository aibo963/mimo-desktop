import { create } from 'zustand'

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
  fetchSessions: () => Promise<void>
  setActiveSession: (id: string | null) => void
  deleteSession: (id: string) => Promise<void>
  createNewSession: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,

  fetchSessions: async () => {
    set({ loading: true })
    try {
      const result = await window.mimoAPI.invoke({ action: 'list_sessions' })
      if (Array.isArray(result)) {
        set({ sessions: result, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      set({ loading: false })
    }
  },

  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id })
  },

  deleteSession: async (id: string) => {
    try {
      await window.mimoAPI.invoke({ action: 'delete_session', sessionId: id })
      const { sessions, activeSessionId } = get()
      const filtered = sessions.filter(s => s.id !== id)
      set({
        sessions: filtered,
        activeSessionId: activeSessionId === id ? null : activeSessionId,
      })
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  },

  createNewSession: () => {
    set({ activeSessionId: null })
  },
}))
