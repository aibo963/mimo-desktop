import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReaddirSync = vi.fn()
const mockStatSync = vi.fn()
const mockReadFileSync = vi.fn()

vi.mock('fs', () => ({
  default: {
    readdirSync: mockReaddirSync,
    statSync: mockStatSync,
    readFileSync: mockReadFileSync,
  },
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  readFileSync: mockReadFileSync,
}))

vi.mock('./debug', () => ({
  debug: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

async function createFileManager() {
  const { FileManager } = await import('./file-manager')
  return new FileManager()
}

describe('FileManager', () => {
  describe('getFileExtension', () => {
    it('returns extension without dot', async () => {
      const fm = await createFileManager()
      expect(fm.getFileExtension('file.ts')).toBe('ts')
    })

    it('returns lowercase extension', async () => {
      const fm = await createFileManager()
      expect(fm.getFileExtension('file.TS')).toBe('ts')
    })

    it('returns empty string for no extension', async () => {
      const fm = await createFileManager()
      expect(fm.getFileExtension('Makefile')).toBe('')
    })
  })

  describe('getLanguage', () => {
    it('maps ts to typescript', async () => {
      const fm = await createFileManager()
      expect(fm.getLanguage('ts')).toBe('typescript')
    })

    it('maps js to javascript', async () => {
      const fm = await createFileManager()
      expect(fm.getLanguage('js')).toBe('javascript')
    })

    it('maps py to python', async () => {
      const fm = await createFileManager()
      expect(fm.getLanguage('py')).toBe('python')
    })

    it('maps unknown to plaintext', async () => {
      const fm = await createFileManager()
      expect(fm.getLanguage('xyz')).toBe('plaintext')
    })

    it('maps vue to vue', async () => {
      const fm = await createFileManager()
      expect(fm.getLanguage('vue')).toBe('vue')
    })

    it('maps rs to rust', async () => {
      const fm = await createFileManager()
      expect(fm.getLanguage('rs')).toBe('rust')
    })
  })

  describe('readFile', () => {
    it('returns file content', async () => {
      mockStatSync.mockReturnValue({ size: 100 })
      mockReadFileSync.mockReturnValue('file content')

      const fm = await createFileManager()
      const result = fm.readFile('/path/to/file.txt')

      expect(result).toBe('file content')
    })

    it('returns null for large files', async () => {
      mockStatSync.mockReturnValue({ size: 2 * 1024 * 1024 })

      const fm = await createFileManager()
      const result = fm.readFile('/path/to/large.bin')

      expect(result).toBeNull()
    })

    it('returns null on read error', async () => {
      mockStatSync.mockImplementation(() => {
        throw new Error('not found')
      })

      const fm = await createFileManager()
      const result = fm.readFile('/nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('readDirectory', () => {
    it('returns sorted file nodes', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'b.ts', isDirectory: () => false },
        { name: 'a.ts', isDirectory: () => false },
        { name: 'src', isDirectory: () => true },
      ])
      mockReaddirSync.mockReturnValueOnce([
        { name: 'b.ts', isDirectory: () => false },
        { name: 'a.ts', isDirectory: () => false },
        { name: 'src', isDirectory: () => true },
      ])
      mockReaddirSync.mockReturnValueOnce([])

      const fm = await createFileManager()
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('src')
      expect(result[1].name).toBe('a.ts')
      expect(result[2].name).toBe('b.ts')
    })

    it('ignores node_modules', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'node_modules', isDirectory: () => true },
        { name: 'src', isDirectory: () => true },
      ])

      const fm = await createFileManager()
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('src')
    })

    it('ignores .git', async () => {
      mockReaddirSync.mockReturnValue([
        { name: '.git', isDirectory: () => true },
        { name: 'src', isDirectory: () => true },
      ])

      const fm = await createFileManager()
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
    })

    it('ignores lock files', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'package-lock.json', isDirectory: () => false },
        { name: 'index.ts', isDirectory: () => false },
      ])

      const fm = await createFileManager()
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('index.ts')
    })

    it('respects max depth', async () => {
      mockReaddirSync.mockReturnValue([{ name: 'sub', isDirectory: () => true }])

      const fm = await createFileManager()
      const result = fm.readDirectory('/project', 5)

      expect(result).toHaveLength(0)
    })

    it('returns empty on error', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('permission denied')
      })

      const fm = await createFileManager()
      const result = fm.readDirectory('/noaccess')

      expect(result).toEqual([])
    })

    it('source mode filters binary files', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'image.png', isDirectory: () => false },
        { name: 'index.ts', isDirectory: () => false },
      ])

      const fm = await createFileManager()
      fm.setMode('source')
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('index.ts')
    })

    it('all mode includes binary files', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'image.png', isDirectory: () => false },
        { name: 'index.ts', isDirectory: () => false },
      ])

      const fm = await createFileManager()
      fm.setMode('all')
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(2)
    })

    it('source mode filters minified files', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'app.min.js', isDirectory: () => false },
        { name: 'app.js', isDirectory: () => false },
      ])

      const fm = await createFileManager()
      fm.setMode('source')
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('app.js')
    })

    it('source mode filters .map files', async () => {
      mockReaddirSync.mockReturnValue([
        { name: 'app.js.map', isDirectory: () => false },
        { name: 'app.js', isDirectory: () => false },
      ])

      const fm = await createFileManager()
      fm.setMode('source')
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('app.js')
    })
  })

  describe('setMode', () => {
    it('sets mode to all', async () => {
      mockReaddirSync.mockReturnValue([{ name: 'image.png', isDirectory: () => false }])

      const fm = await createFileManager()
      fm.setMode('all')
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(1)
    })

    it('sets mode to source', async () => {
      mockReaddirSync.mockReturnValue([{ name: 'image.png', isDirectory: () => false }])

      const fm = await createFileManager()
      fm.setMode('source')
      const result = fm.readDirectory('/project')

      expect(result).toHaveLength(0)
    })
  })
})
