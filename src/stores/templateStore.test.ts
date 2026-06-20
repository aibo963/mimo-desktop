import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from './templateStore'

beforeEach(() => {
  localStorage.clear()
  useTemplateStore.setState({
    templates: JSON.parse(localStorage.getItem('templates') || 'null') || [
      { id: '1', name: '代码审查', content: '审查代码', category: '开发' },
      { id: '2', name: '翻译', content: '翻译内容', category: '通用' },
    ],
  })
})

describe('useTemplateStore', () => {
  it('adds a template', () => {
    useTemplateStore.getState().addTemplate({
      name: 'New',
      content: 'content',
      category: 'Custom',
    })
    const { templates } = useTemplateStore.getState()
    expect(templates.length).toBeGreaterThanOrEqual(3)
    const added = templates.find((t) => t.name === 'New')
    expect(added).toBeDefined()
    expect(added!.id).toBeDefined()
  })

  it('removes a template', () => {
    const before = useTemplateStore.getState().templates.length
    useTemplateStore.getState().removeTemplate('1')
    expect(useTemplateStore.getState().templates).toHaveLength(before - 1)
  })

  it('updates a template', () => {
    useTemplateStore.getState().updateTemplate('1', { name: 'Updated Review' })
    const t = useTemplateStore.getState().templates.find((t) => t.id === '1')
    expect(t?.name).toBe('Updated Review')
  })

  it('persists to localStorage', () => {
    useTemplateStore.getState().addTemplate({ name: 'X', content: 'y', category: 'z' })
    const saved = localStorage.getItem('templates')
    expect(saved).toBeTruthy()
  })
})
