import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExecMimo = vi.fn()
const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockMkdirSync = vi.fn()
const mockRenameSync = vi.fn()

vi.mock('./utils/mimo-path', () => ({
  getMimoPath: vi.fn().mockReturnValue('mimo'),
  execMimo: mockExecMimo,
}))

vi.mock('./debug', () => ({
  debug: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    renameSync: mockRenameSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  renameSync: mockRenameSync,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mockExistsSync.mockReturnValue(false)
})

async function createConfigManager() {
  const { ConfigManager } = await import('./config-manager')
  return new ConfigManager()
}

describe('ConfigManager', () => {
  describe('getAll', () => {
    it('returns parsed config from file', async () => {
      const config = { provider: { openai: { api: 'https://api.openai.com' } } }
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(config))

      const manager = await createConfigManager()
      const result = manager.getAll()

      expect(result).toEqual(config)
    })

    it('returns empty object when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const manager = await createConfigManager()
      const result = manager.getAll()

      expect(result).toEqual({})
    })

    it('returns empty object on parse error', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('not json')

      const manager = await createConfigManager()
      const result = manager.getAll()

      expect(result).toEqual({})
    })

    it('parses JSONC with comments', async () => {
      const jsonc = `{
        // comment
        "provider": {
          "test": true
        }
      }`
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(jsonc)

      const manager = await createConfigManager()
      const result = manager.getAll()

      expect(result).toEqual({ provider: { test: true } })
    })
  })

  describe('getRaw', () => {
    it('returns raw file content', async () => {
      const content = '{ "key": "value" }'
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(content)

      const manager = await createConfigManager()
      const result = manager.getRaw()

      expect(result).toBe(content)
    })

    it('returns "{}" when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const manager = await createConfigManager()
      const result = manager.getRaw()

      expect(result).toBe('{}')
    })

    it('returns "{}" on read error', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('read failed')
      })

      const manager = await createConfigManager()
      const result = manager.getRaw()

      expect(result).toBe('{}')
    })
  })

  describe('set', () => {
    it('writes config to file', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('{}')

      const manager = await createConfigManager()
      manager.set('theme', 'dark')

      expect(mockWriteFileSync).toHaveBeenCalled()
      const written = mockWriteFileSync.mock.calls[0][1] as string
      expect(written).toContain('"theme"')
      expect(written).toContain('"dark"')
    })

    it('creates directory if not exists', async () => {
      mockExistsSync.mockReturnValue(false)
      mockReadFileSync.mockReturnValue('{}')

      const manager = await createConfigManager()
      manager.set('key', 'value')

      expect(mockMkdirSync).toHaveBeenCalled()
    })

    it('handles nested keys', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('{}')

      const manager = await createConfigManager()
      manager.set('provider.openai.apiKey', 'sk-123')

      expect(mockWriteFileSync).toHaveBeenCalled()
      const written = mockWriteFileSync.mock.calls[0][1] as string
      expect(written).toContain('provider')
      expect(written).toContain('openai')
      expect(written).toContain('sk-123')
    })

    it('handles empty key by writing root value', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('{}')

      const manager = await createConfigManager()
      manager.set('', 'value')

      expect(mockWriteFileSync).toHaveBeenCalled()
    })

    it('preserves existing config', async () => {
      const existing = JSON.stringify({ existing: true })
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(existing)

      const manager = await createConfigManager()
      manager.set('new', 'value')

      const written = mockWriteFileSync.mock.calls[0][1] as string
      expect(written).toContain('"existing"')
      expect(written).toContain('"new"')
    })
  })

  describe('setRaw', () => {
    it('writes valid JSON to file', async () => {
      mockExistsSync.mockReturnValue(true)

      const manager = await createConfigManager()
      const content = JSON.stringify({ test: true })
      manager.setRaw(content)

      expect(mockWriteFileSync).toHaveBeenCalled()
      const written = mockWriteFileSync.mock.calls[0][1] as string
      expect(written).toBe(content)
    })

    it('throws on invalid JSON', async () => {
      const manager = await createConfigManager()

      expect(() => manager.setRaw('not json')).toThrow()
    })

    it('throws on malformed JSON', async () => {
      const manager = await createConfigManager()

      expect(() => manager.setRaw('{ "key": }')).toThrow()
    })
  })

  describe('getModels', () => {
    it('returns parsed model list', async () => {
      mockExecMimo.mockResolvedValue('mimo/mimo-auto\nxiaomi/mimo-v2-pro\nxiaomi/mimo-v2.5\n')

      const manager = await createConfigManager()
      const result = await manager.getModels()

      expect(result).toEqual(['mimo/mimo-auto', 'xiaomi/mimo-v2-pro', 'xiaomi/mimo-v2.5'])
    })

    it('filters out lines without slash', async () => {
      mockExecMimo.mockResolvedValue('mimo/mimo-auto\ninvalid-line\nxiaomi/mimo-v2\n')

      const manager = await createConfigManager()
      const result = await manager.getModels()

      expect(result).toEqual(['mimo/mimo-auto', 'xiaomi/mimo-v2'])
    })

    it('trims whitespace and carriage returns', async () => {
      mockExecMimo.mockResolvedValue('mimo/mimo-auto \r\nxiaomi/mimo-v2\r\n')

      const manager = await createConfigManager()
      const result = await manager.getModels()

      expect(result).toEqual(['mimo/mimo-auto', 'xiaomi/mimo-v2'])
    })

    it('returns empty array on failure', async () => {
      mockExecMimo.mockRejectedValue(new Error('command failed'))

      const manager = await createConfigManager()
      const result = await manager.getModels()

      expect(result).toEqual([])
    })

    it('filters empty lines', async () => {
      mockExecMimo.mockResolvedValue('mimo/mimo-auto\n\n\nxiaomi/mimo-v2\n')

      const manager = await createConfigManager()
      const result = await manager.getModels()

      expect(result).toEqual(['mimo/mimo-auto', 'xiaomi/mimo-v2'])
    })
  })
})
