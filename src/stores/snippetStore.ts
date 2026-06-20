import { create } from 'zustand'

interface Snippet {
  id: string
  name: string
  code: string
  language: string
  source?: string // which conversation (optional)
  createdAt: number
  tags: string[]
}

interface SnippetStore {
  snippets: Snippet[]
  addSnippet: (snippet: Omit<Snippet, 'id' | 'createdAt'>) => void
  removeSnippet: (id: string) => void
  updateSnippet: (id: string, updates: Partial<Snippet>) => void
  searchSnippets: (query: string) => Snippet[]
}

export const useSnippetStore = create<SnippetStore>((set, get) => ({
  snippets: JSON.parse(localStorage.getItem('snippets') || '[]'),
  addSnippet: (snippet) =>
    set((state) => {
      const newSnippets = [
        { ...snippet, id: crypto.randomUUID(), createdAt: Date.now() },
        ...state.snippets,
      ]
      localStorage.setItem('snippets', JSON.stringify(newSnippets))
      return { snippets: newSnippets }
    }),
  removeSnippet: (id) =>
    set((state) => {
      const newSnippets = state.snippets.filter((s) => s.id !== id)
      localStorage.setItem('snippets', JSON.stringify(newSnippets))
      return { snippets: newSnippets }
    }),
  updateSnippet: (id, updates) =>
    set((state) => {
      const newSnippets = state.snippets.map((s) => (s.id === id ? { ...s, ...updates } : s))
      localStorage.setItem('snippets', JSON.stringify(newSnippets))
      return { snippets: newSnippets }
    }),
  searchSnippets: (query) => {
    const q = query.toLowerCase()
    return get().snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    )
  },
}))
