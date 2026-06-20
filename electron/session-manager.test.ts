import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExecMimo = vi.fn()
const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockMkdirSync = vi.fn()

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
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

async function createSessionManager() {
  const { SessionManager } = await import('./session-manager')
  return new SessionManager()
}

describe('SessionManager', () => {
  describe('list', () => {
    it('returns parsed sessions from stdout', async () => {
      const sessions = [
        { id: 'ses_123', title: 'Test Session', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ]
      mockExecMimo.mockResolvedValue(JSON.stringify(sessions))

      const manager = await createSessionManager()
      const result = await manager.list()

      expect(result).toEqual(sessions)
      expect(mockExecMimo).toHaveBeenCalledWith('session list --format json')
    })

    it('returns empty array on parse error', async () => {
      mockExecMimo.mockResolvedValue('not json')

      const manager = await createSessionManager()
      const result = await manager.list()

      expect(result).toEqual([])
    })

    it('returns empty array on execMimo failure', async () => {
      mockExecMimo.mockRejectedValue(new Error('command failed'))

      const manager = await createSessionManager()
      const result = await manager.list()

      expect(result).toEqual([])
    })

    it('returns empty array for empty stdout', async () => {
      mockExecMimo.mockResolvedValue('')

      const manager = await createSessionManager()
      const result = await manager.list()

      expect(result).toEqual([])
    })

    it('returns empty array when stdout is not an array', async () => {
      mockExecMimo.mockResolvedValue(JSON.stringify({ not: 'array' }))

      const manager = await createSessionManager()
      const result = await manager.list()

      expect(result).toEqual([])
    })
  })

  describe('delete', () => {
    it('deletes session with valid id', async () => {
      mockExecMimo.mockResolvedValue('')

      const manager = await createSessionManager()
      await manager.delete('abc123-def456')

      expect(mockExecMimo).toHaveBeenCalledWith('session delete abc123-def456')
    })

    it('throws on invalid session id', async () => {
      const manager = await createSessionManager()

      await expect(manager.delete('invalid id!')).rejects.toThrow('Invalid session ID format')
    })

    it('throws on execMimo failure', async () => {
      mockExecMimo.mockRejectedValue(new Error('delete failed'))

      const manager = await createSessionManager()

      await expect(manager.delete('abc123')).rejects.toThrow('delete failed')
    })

    it('sanitizes session id with special chars', async () => {
      mockExecMimo.mockResolvedValue('')

      const manager = await createSessionManager()
      await manager.delete('abc-123-def')

      expect(mockExecMimo).toHaveBeenCalledWith('session delete abc-123-def')
    })
  })

  describe('getHistory', () => {
    it('returns parsed history', async () => {
      const history = [
        { role: 'user', content: 'hello', created_at: '2026-01-01' },
        { role: 'assistant', content: 'hi', created_at: '2026-01-01' },
      ]
      mockExecMimo.mockResolvedValue(JSON.stringify(history))

      const manager = await createSessionManager()
      const result = await manager.getHistory('abc123')

      expect(result).toEqual(history)
      expect(mockExecMimo).toHaveBeenCalledWith(expect.stringContaining("session_id = 'abc123'"))
    })

    it('returns empty array on failure', async () => {
      mockExecMimo.mockRejectedValue(new Error('db error'))

      const manager = await createSessionManager()
      const result = await manager.getHistory('abc123')

      expect(result).toEqual([])
    })

    it('returns empty array on invalid session id', async () => {
      const manager = await createSessionManager()
      const result = await manager.getHistory('invalid id')

      expect(result).toEqual([])
    })

    it('returns empty array when result is not array', async () => {
      mockExecMimo.mockResolvedValue(JSON.stringify({ error: 'no data' }))

      const manager = await createSessionManager()
      const result = await manager.getHistory('abc123')

      expect(result).toEqual([])
    })
  })
})
