import { create } from 'zustand'

export interface Template {
  id: string
  name: string
  content: string
  category: string
  icon?: string
}

const defaultTemplates: Template[] = [
  {
    id: '1',
    name: '代码审查',
    content: '请审查以下代码，指出潜在问题和改进建议：\n\n```\n{code}\n```',
    category: '开发',
  },
  {
    id: '2',
    name: '解释代码',
    content: '请解释以下代码的功能和工作原理：\n\n```\n{code}\n```',
    category: '开发',
  },
  {
    id: '3',
    name: '写测试',
    content: '请为以下代码编写单元测试：\n\n```\n{code}\n```',
    category: '开发',
  },
  {
    id: '4',
    name: '重构建议',
    content: '请分析以下代码并提供重构建议，使代码更简洁、可维护：\n\n```\n{code}\n```',
    category: '开发',
  },
  {
    id: '5',
    name: '翻译',
    content: '请将以下内容翻译成{language}：\n\n{content}',
    category: '通用',
  },
  { id: '6', name: '总结', content: '请总结以下内容的要点：\n\n{content}', category: '通用' },
  {
    id: '7',
    name: '优化性能',
    content: '请分析以下代码的性能问题并提供优化方案：\n\n```\n{code}\n```',
    category: '开发',
  },
  {
    id: '8',
    name: '写文档',
    content: '请为以下代码编写 API 文档：\n\n```\n{code}\n```',
    category: '开发',
  },
]

interface TemplateStore {
  templates: Template[]
  addTemplate: (template: Omit<Template, 'id'>) => void
  removeTemplate: (id: string) => void
  updateTemplate: (id: string, updates: Partial<Template>) => void
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  templates: JSON.parse(localStorage.getItem('templates') || 'null') || defaultTemplates,
  addTemplate: (template) =>
    set((state) => {
      const newTemplates = [...state.templates, { ...template, id: crypto.randomUUID() }]
      localStorage.setItem('templates', JSON.stringify(newTemplates))
      return { templates: newTemplates }
    }),
  removeTemplate: (id) =>
    set((state) => {
      const newTemplates = state.templates.filter((t) => t.id !== id)
      localStorage.setItem('templates', JSON.stringify(newTemplates))
      return { templates: newTemplates }
    }),
  updateTemplate: (id, updates) =>
    set((state) => {
      const newTemplates = state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t))
      localStorage.setItem('templates', JSON.stringify(newTemplates))
      return { templates: newTemplates }
    }),
}))
