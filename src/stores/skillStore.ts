import { create } from 'zustand'

export interface Skill {
  id: string
  name: string
  description: string
  category: 'code' | 'writing' | 'analysis' | 'general'
  content: string
  tags: string[]
  useCount: number
  createdAt: number
  updatedAt: number
}

interface SkillStore {
  skills: Skill[]
  isLoading: boolean
  setSkills: (skills: Skill[]) => void
  addSkill: (skill: Skill) => void
  updateSkill: (id: string, updates: Partial<Skill>) => void
  removeSkill: (id: string) => void
  incrementUse: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useSkillStore = create<SkillStore>((set) => ({
  skills: [],
  isLoading: false,
  setSkills: (skills) => set({ skills }),
  addSkill: (skill) => set((state) => ({ skills: [...state.skills, skill] })),
  updateSkill: (id, updates) =>
    set((state) => ({
      skills: state.skills.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  removeSkill: (id) =>
    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id),
    })),
  incrementUse: (id) =>
    set((state) => ({
      skills: state.skills.map((s) => (s.id === id ? { ...s, useCount: s.useCount + 1 } : s)),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}))
