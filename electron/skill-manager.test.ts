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
  const { SkillManager } = await import('./skill-manager')
  return new SkillManager()
}

describe('SkillManager', () => {
  describe('defaults', () => {
    it('loads default skills on first run', async () => {
      const mgr = await createManager()
      const skills = mgr.getAll()

      expect(skills.length).toBeGreaterThanOrEqual(8)
      expect(skills.some((s) => s.name === '代码审查')).toBe(true)
      expect(skills.some((s) => s.name === '单元测试')).toBe(true)
    })

    it('does not duplicate defaults', async () => {
      const mgr = await createManager()
      const count1 = mgr.getAll().length

      const mgr2 = await createManager()
      const count2 = mgr2.getAll().length

      expect(count1).toBe(count2)
    })
  })

  describe('getAll / add', () => {
    it('adds a skill', async () => {
      const mgr = await createManager()
      const skill = mgr.add({
        name: 'Test Skill',
        description: 'A test skill',
        category: 'general',
        content: 'test content',
        tags: ['test'],
      })

      expect(skill.id).toBeDefined()
      expect(skill.name).toBe('Test Skill')
      expect(skill.useCount).toBe(0)
      expect(skill.createdAt).toBeGreaterThan(0)
    })

    it('saves to file on add', async () => {
      const mgr = await createManager()
      mgr.add({ name: 'S1', description: 'd', category: 'general', content: 'c', tags: [] })

      expect(mockWriteFileSync).toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('finds skill by id', async () => {
      const mgr = await createManager()
      const skill = mgr.add({
        name: 'Find Me',
        description: 'd',
        category: 'general',
        content: 'c',
        tags: [],
      })

      expect(mgr.getById(skill.id)).toBeDefined()
      expect(mgr.getById(skill.id)!.name).toBe('Find Me')
    })

    it('returns undefined for non-existent id', async () => {
      const mgr = await createManager()
      expect(mgr.getById('nonexistent')).toBeUndefined()
    })
  })

  describe('search', () => {
    it('finds by name', async () => {
      const mgr = await createManager()
      const results = mgr.search('代码审查')
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('finds by description', async () => {
      const mgr = await createManager()
      const results = mgr.search('审查代码质量')
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('finds by tag', async () => {
      const mgr = await createManager()
      const results = mgr.search('review')
      expect(results.length).toBeGreaterThanOrEqual(1)
    })

    it('is case insensitive', async () => {
      const mgr = await createManager()
      expect(mgr.search('REVIEW')).toEqual(mgr.search('review'))
    })

    it('returns empty for no match', async () => {
      const mgr = await createManager()
      expect(mgr.search('xyz_nonexistent')).toHaveLength(0)
    })
  })

  describe('getByCategory', () => {
    it('filters by category', async () => {
      const mgr = await createManager()
      const codeSkills = mgr.getByCategory('code')
      expect(codeSkills.length).toBeGreaterThanOrEqual(1)
      expect(codeSkills.every((s) => s.category === 'code')).toBe(true)
    })

    it('returns empty for unused category', async () => {
      const mgr = await createManager()
      mgr.getAll().forEach((s) => {
        if (s.category !== 'code') mgr.remove(s.id)
      })

      const writingSkills = mgr.getByCategory('writing')
      expect(writingSkills).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates skill fields', async () => {
      const mgr = await createManager()
      const skill = mgr.add({
        name: 'Old',
        description: 'old',
        category: 'general',
        content: 'c',
        tags: [],
      })

      const updated = mgr.update(skill.id, { name: 'New', description: 'new' })
      expect(updated!.name).toBe('New')
      expect(updated!.description).toBe('new')
    })

    it('returns undefined for non-existent id', async () => {
      const mgr = await createManager()
      expect(mgr.update('nonexistent', { name: 'x' })).toBeUndefined()
    })
  })

  describe('incrementUse', () => {
    it('increments use count', async () => {
      const mgr = await createManager()
      const skill = mgr.add({
        name: 'Used',
        description: 'd',
        category: 'general',
        content: 'c',
        tags: [],
      })

      mgr.incrementUse(skill.id)
      mgr.incrementUse(skill.id)

      expect(mgr.getById(skill.id)!.useCount).toBe(2)
    })

    it('does nothing for non-existent id', async () => {
      const mgr = await createManager()
      mgr.incrementUse('nonexistent')
    })
  })

  describe('remove', () => {
    it('removes skill by id', async () => {
      const mgr = await createManager()
      const skill = mgr.add({
        name: 'Remove Me',
        description: 'd',
        category: 'general',
        content: 'c',
        tags: [],
      })

      expect(mgr.remove(skill.id)).toBe(true)
      expect(mgr.getById(skill.id)).toBeUndefined()
    })

    it('returns false for non-existent id', async () => {
      const mgr = await createManager()
      expect(mgr.remove('nonexistent')).toBe(false)
    })
  })

  describe('getMostUsed', () => {
    it('returns skills sorted by use count', async () => {
      const mgr = await createManager()
      const s1 = mgr.add({
        name: 'A',
        description: 'd',
        category: 'general',
        content: 'c',
        tags: [],
      })
      const s2 = mgr.add({
        name: 'B',
        description: 'd',
        category: 'general',
        content: 'c',
        tags: [],
      })

      mgr.incrementUse(s1.id)
      mgr.incrementUse(s1.id)
      mgr.incrementUse(s2.id)

      const mostUsed = mgr.getMostUsed(2)
      expect(mostUsed[0].name).toBe('A')
      expect(mostUsed[1].name).toBe('B')
    })

    it('respects limit', async () => {
      const mgr = await createManager()
      const mostUsed = mgr.getMostUsed(3)
      expect(mostUsed).toHaveLength(3)
    })
  })

  describe('load from file', () => {
    it('loads existing data', async () => {
      const data = {
        skills: [
          {
            id: '1',
            name: 'Loaded',
            description: 'd',
            category: 'general',
            content: 'c',
            tags: [],
            useCount: 5,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(data))

      const mgr = await createManager()
      expect(mgr.getAll().some((s) => s.name === 'Loaded')).toBe(true)
    })

    it('handles corrupt file', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('not json')

      const mgr = await createManager()
      expect(mgr.getAll().length).toBeGreaterThanOrEqual(8)
    })
  })
})
