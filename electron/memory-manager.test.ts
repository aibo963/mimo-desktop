import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockMkdirSync = vi.fn()

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-userdata',
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mockExistsSync.mockReturnValue(false)
  mockWriteFileSync.mockImplementation(() => {})
})

async function createManager() {
  const { MemoryManager } = await import('./memory-manager')
  return new MemoryManager()
}

describe('MemoryManager', () => {
  describe('getAll / add', () => {
    it('starts empty', async () => {
      const mgr = await createManager()
      expect(mgr.getAll()).toEqual([])
    })

    it('adds entry and returns it', async () => {
      const mgr = await createManager()
      const entry = mgr.add({ content: 'test fact', category: 'fact', tags: ['tag1'] })

      expect(entry.id).toBeDefined()
      expect(entry.content).toBe('test fact')
      expect(entry.category).toBe('fact')
      expect(entry.tags).toEqual(['tag1'])
      expect(entry.createdAt).toBeGreaterThan(0)
      expect(entry.updatedAt).toBeGreaterThan(0)
    })

    it('prepends new entries', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'first', category: 'fact', tags: [] })
      mgr.add({ content: 'second', category: 'fact', tags: [] })

      const all = mgr.getAll()
      expect(all[0].content).toBe('second')
      expect(all[1].content).toBe('first')
    })

    it('saves to file on add', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'test', category: 'fact', tags: [] })

      expect(mockWriteFileSync).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('finds entry by id', async () => {
      const mgr = await createManager()
      const entry = mgr.add({ content: 'find me', category: 'fact', tags: [] })

      expect(mgr.getById(entry.id)).toBeDefined()
      expect(mgr.getById(entry.id)!.content).toBe('find me')
    })

    it('returns undefined for non-existent id', async () => {
      const mgr = await createManager()
      expect(mgr.getById('nonexistent')).toBeUndefined()
    })
  })

  describe('search', () => {
    it('finds by content', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'TypeScript is great', category: 'fact', tags: [] })
      mgr.add({ content: 'Python is great', category: 'fact', tags: [] })

      const results = mgr.search('TypeScript')
      expect(results).toHaveLength(1)
      expect(results[0].content).toContain('TypeScript')
    })

    it('finds by tag', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'hello', category: 'fact', tags: ['important'] })

      const results = mgr.search('important')
      expect(results).toHaveLength(1)
    })

    it('is case insensitive', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'Hello World', category: 'fact', tags: [] })

      expect(mgr.search('hello')).toHaveLength(1)
      expect(mgr.search('HELLO')).toHaveLength(1)
    })

    it('returns empty for no match', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'hello', category: 'fact', tags: [] })

      expect(mgr.search('xyz')).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates content', async () => {
      const mgr = await createManager()
      const entry = mgr.add({ content: 'old', category: 'fact', tags: [] })

      const updated = mgr.update(entry.id, { content: 'new' })
      expect(updated!.content).toBe('new')
    })

    it('updates category', async () => {
      const mgr = await createManager()
      const entry = mgr.add({ content: 'test', category: 'fact', tags: [] })

      const updated = mgr.update(entry.id, { category: 'preference' })
      expect(updated!.category).toBe('preference')
    })

    it('updates tags', async () => {
      const mgr = await createManager()
      const entry = mgr.add({ content: 'test', category: 'fact', tags: ['old'] })

      const updated = mgr.update(entry.id, { tags: ['new'] })
      expect(updated!.tags).toEqual(['new'])
    })

    it('returns undefined for non-existent id', async () => {
      const mgr = await createManager()
      expect(mgr.update('nonexistent', { content: 'x' })).toBeUndefined()
    })
  })

  describe('remove', () => {
    it('removes entry by id', async () => {
      const mgr = await createManager()
      const entry = mgr.add({ content: 'remove me', category: 'fact', tags: [] })

      expect(mgr.remove(entry.id)).toBe(true)
      expect(mgr.getAll()).toHaveLength(0)
    })

    it('returns false for non-existent id', async () => {
      const mgr = await createManager()
      expect(mgr.remove('nonexistent')).toBe(false)
    })
  })

  describe('clear', () => {
    it('removes all entries', async () => {
      const mgr = await createManager()
      mgr.add({ content: 'a', category: 'fact', tags: [] })
      mgr.add({ content: 'b', category: 'fact', tags: [] })

      mgr.clear()
      expect(mgr.getAll()).toHaveLength(0)
    })
  })

  describe('extractFromConversation', () => {
    it('extracts personal info', async () => {
      const mgr = await createManager()
      const results = mgr.extractFromConversation([
        { role: 'user', content: '我叫张三，是一名工程师' },
      ])

      expect(results).toHaveLength(1)
      expect(results[0].category).toBe('fact')
      expect(results[0].tags).toContain('个人信息')
    })

    it('extracts preferences', async () => {
      const mgr = await createManager()
      const results = mgr.extractFromConversation([
        { role: 'user', content: '我喜欢用 Vim 编辑代码' },
      ])

      expect(results).toHaveLength(1)
      expect(results[0].category).toBe('preference')
    })

    it('extracts remember requests', async () => {
      const mgr = await createManager()
      const results = mgr.extractFromConversation([
        { role: 'user', content: '帮我记住：明天有会议' },
      ])

      expect(results).toHaveLength(1)
      expect(results[0].category).toBe('context')
      expect(results[0].content).toBe('明天有会议')
    })

    it('ignores assistant messages', async () => {
      const mgr = await createManager()
      const results = mgr.extractFromConversation([{ role: 'assistant', content: '我叫张三' }])

      expect(results).toHaveLength(0)
    })

    it('ignores short messages', async () => {
      const mgr = await createManager()
      const results = mgr.extractFromConversation([{ role: 'user', content: 'hi' }])

      expect(results).toHaveLength(0)
    })

    it('ignores long messages', async () => {
      const mgr = await createManager()
      const results = mgr.extractFromConversation([{ role: 'user', content: '我叫'.repeat(300) }])

      expect(results).toHaveLength(0)
    })
  })

  describe('autoExtractAndSave', () => {
    it('saves extracted entries', async () => {
      const mgr = await createManager()
      const saved = mgr.autoExtractAndSave([
        { role: 'user', content: '我叫李四，是一名软件工程师' },
      ])

      expect(saved).toHaveLength(1)
      expect(mgr.getAll()).toHaveLength(1)
    })

    it('deduplicates by content', async () => {
      const mgr = await createManager()
      mgr.add({ content: '我叫李四，是一名软件工程师', category: 'fact', tags: [] })

      const saved = mgr.autoExtractAndSave([
        { role: 'user', content: '我叫李四，是一名软件工程师' },
      ])

      expect(saved).toHaveLength(0)
      expect(mgr.getAll()).toHaveLength(1)
    })
  })

  describe('knowledge index', () => {
    it('indexes a file', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/app.ts', 'console.log("hello")')

      const files = mgr.getIndexedFiles()
      expect(files).toHaveLength(1)
      expect(files[0].filePath).toBe('/src/app.ts')
    })

    it('updates existing file index', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/app.ts', 'v1')
      mgr.indexFile('/src/app.ts', 'v2')

      const files = mgr.getIndexedFiles()
      expect(files).toHaveLength(1)
      expect(files[0].content).toBe('v2')
    })

    it('removes file index', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/app.ts', 'content')

      expect(mgr.removeFileIndex('/src/app.ts')).toBe(true)
      expect(mgr.getIndexedFiles()).toHaveLength(0)
    })

    it('returns false for non-existent file', async () => {
      const mgr = await createManager()
      expect(mgr.removeFileIndex('/nonexistent')).toBe(false)
    })

    it('searches knowledge by content', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/app.ts', 'TypeScript compiler options')
      mgr.indexFile('/src/util.ts', 'JavaScript utility functions')

      const results = mgr.searchKnowledge('TypeScript')
      expect(results).toHaveLength(1)
      expect(results[0].filePath).toBe('/src/app.ts')
    })

    it('searches knowledge by file path', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/config.ts', 'some content')

      const results = mgr.searchKnowledge('config')
      expect(results).toHaveLength(1)
    })

    it('returns empty for no match', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/app.ts', 'hello')

      expect(mgr.searchKnowledge('xyz')).toHaveLength(0)
    })

    it('respects maxResults', async () => {
      const mgr = await createManager()
      mgr.indexFile('/a.ts', 'test content')
      mgr.indexFile('/b.ts', 'test content')
      mgr.indexFile('/c.ts', 'test content')

      const results = mgr.searchKnowledge('test', 2)
      expect(results).toHaveLength(2)
    })

    it('sorts by relevance', async () => {
      const mgr = await createManager()
      mgr.indexFile('/config.ts', 'config file')
      mgr.indexFile('/app.ts', 'config settings in app')

      const results = mgr.searchKnowledge('config')
      expect(results[0].filePath).toBe('/config.ts')
    })
  })

  describe('getKnowledgeContext', () => {
    it('returns formatted context', async () => {
      const mgr = await createManager()
      mgr.indexFile('/src/app.ts', 'TypeScript code here')

      const ctx = mgr.getKnowledgeContext('TypeScript')
      expect(ctx).toContain('src/app.ts')
      expect(ctx).toContain('TypeScript code here')
    })

    it('returns empty for no matches', async () => {
      const mgr = await createManager()
      expect(mgr.getKnowledgeContext('xyz')).toBe('')
    })

    it('respects maxTokens', async () => {
      const mgr = await createManager()
      mgr.indexFile('/a.ts', 'a'.repeat(1000))
      mgr.indexFile('/b.ts', 'b'.repeat(1000))

      const ctx = mgr.getKnowledgeContext('content', 500)
      expect(ctx.length).toBeLessThan(2000)
    })
  })

  describe('load from file', () => {
    it('loads existing data', async () => {
      const data = {
        entries: [
          { id: '1', content: 'loaded', category: 'fact', tags: [], createdAt: 1, updatedAt: 1 },
        ],
        knowledgeIndex: [],
        lastCleanup: 1,
      }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(data))

      const mgr = await createManager()
      expect(mgr.getAll()).toHaveLength(1)
      expect(mgr.getAll()[0].content).toBe('loaded')
    })

    it('handles corrupt file', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('not json')

      const mgr = await createManager()
      expect(mgr.getAll()).toEqual([])
    })
  })
})
