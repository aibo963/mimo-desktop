import { describe, it, expect, beforeEach } from 'vitest'
import { useSnippetStore } from './snippetStore'

beforeEach(() => {
  localStorage.clear()
  useSnippetStore.setState({ snippets: [] })
})

describe('useSnippetStore', () => {
  it('adds a snippet', () => {
    useSnippetStore.getState().addSnippet({
      name: 'Test',
      code: 'console.log("hi")',
      language: 'javascript',
      tags: ['test'],
    })
    const { snippets } = useSnippetStore.getState()
    expect(snippets).toHaveLength(1)
    expect(snippets[0].name).toBe('Test')
    expect(snippets[0].id).toBeDefined()
    expect(snippets[0].createdAt).toBeGreaterThan(0)
  })

  it('removes a snippet', () => {
    useSnippetStore.getState().addSnippet({
      name: 'Test',
      code: 'code',
      language: 'js',
      tags: [],
    })
    const id = useSnippetStore.getState().snippets[0].id
    useSnippetStore.getState().removeSnippet(id)
    expect(useSnippetStore.getState().snippets).toHaveLength(0)
  })

  it('updates a snippet', () => {
    useSnippetStore.getState().addSnippet({
      name: 'Original',
      code: 'code',
      language: 'js',
      tags: [],
    })
    const id = useSnippetStore.getState().snippets[0].id
    useSnippetStore.getState().updateSnippet(id, { name: 'Updated' })
    expect(useSnippetStore.getState().snippets[0].name).toBe('Updated')
  })

  it('searches snippets by name', () => {
    useSnippetStore
      .getState()
      .addSnippet({ name: 'React hook', code: 'useState', language: 'ts', tags: [] })
    useSnippetStore
      .getState()
      .addSnippet({ name: 'CSS grid', code: 'display: grid', language: 'css', tags: [] })
    const results = useSnippetStore.getState().searchSnippets('react')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('React hook')
  })

  it('searches snippets by code content', () => {
    useSnippetStore
      .getState()
      .addSnippet({ name: 'A', code: 'flexbox center', language: 'css', tags: [] })
    const results = useSnippetStore.getState().searchSnippets('flexbox')
    expect(results).toHaveLength(1)
  })

  it('searches snippets by tags', () => {
    useSnippetStore
      .getState()
      .addSnippet({ name: 'A', code: 'code', language: 'js', tags: ['important'] })
    const results = useSnippetStore.getState().searchSnippets('important')
    expect(results).toHaveLength(1)
  })

  it('persists to localStorage', () => {
    useSnippetStore.getState().addSnippet({ name: 'X', code: 'y', language: 'z', tags: [] })
    const saved = localStorage.getItem('snippets')
    expect(saved).toBeTruthy()
    expect(JSON.parse(saved!)).toHaveLength(1)
  })
})
