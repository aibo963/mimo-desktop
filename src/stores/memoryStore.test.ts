import { describe, it, expect, beforeEach } from 'vitest'
import { useMemoryStore } from './memoryStore'

beforeEach(() => {
  useMemoryStore.setState({ entries: [], isLoading: false })
})

describe('useMemoryStore', () => {
  const makeEntry = (id: string, content: string) => ({
    id,
    content,
    category: 'fact' as const,
    tags: ['test'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  it('sets entries', () => {
    const entries = [makeEntry('1', 'hello'), makeEntry('2', 'world')]
    useMemoryStore.getState().setEntries(entries)
    expect(useMemoryStore.getState().entries).toHaveLength(2)
  })

  it('adds an entry at the beginning', () => {
    useMemoryStore.getState().setEntries([makeEntry('1', 'first')])
    useMemoryStore.getState().addEntry(makeEntry('2', 'second'))
    const { entries } = useMemoryStore.getState()
    expect(entries).toHaveLength(2)
    expect(entries[0].content).toBe('second')
  })

  it('updates an entry', () => {
    useMemoryStore.getState().setEntries([makeEntry('1', 'old')])
    useMemoryStore.getState().updateEntry('1', { content: 'new' })
    expect(useMemoryStore.getState().entries[0].content).toBe('new')
  })

  it('removes an entry', () => {
    useMemoryStore.getState().setEntries([makeEntry('1', 'a'), makeEntry('2', 'b')])
    useMemoryStore.getState().removeEntry('1')
    expect(useMemoryStore.getState().entries).toHaveLength(1)
    expect(useMemoryStore.getState().entries[0].id).toBe('2')
  })

  it('clears all entries', () => {
    useMemoryStore.getState().setEntries([makeEntry('1', 'a'), makeEntry('2', 'b')])
    useMemoryStore.getState().clearAll()
    expect(useMemoryStore.getState().entries).toHaveLength(0)
  })

  it('sets loading state', () => {
    useMemoryStore.getState().setLoading(true)
    expect(useMemoryStore.getState().isLoading).toBe(true)
    useMemoryStore.getState().setLoading(false)
    expect(useMemoryStore.getState().isLoading).toBe(false)
  })
})
