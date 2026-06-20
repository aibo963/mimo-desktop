import { create } from 'zustand'

export interface MemoryEntry {
  id: string
  content: string
  category: 'fact' | 'preference' | 'skill' | 'context'
  source?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

interface MemoryStore {
  entries: MemoryEntry[]
  isLoading: boolean
  setEntries: (entries: MemoryEntry[]) => void
  addEntry: (entry: MemoryEntry) => void
  updateEntry: (id: string, updates: Partial<MemoryEntry>) => void
  removeEntry: (id: string) => void
  clearAll: () => void
  setLoading: (loading: boolean) => void
}

export const useMemoryStore = create<MemoryStore>((set) => ({
  entries: [],
  isLoading: false,
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  removeEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
  clearAll: () => set({ entries: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
