import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSpawn = vi.fn()

vi.mock('child_process', () => ({
  default: {
    spawn: mockSpawn,
  },
  spawn: mockSpawn,
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
  mockSpawn.mockReturnValue(null)
})

async function createManager() {
  const { LSPManager } = await import('./lsp-manager')
  return new LSPManager()
}

describe('LSPManager', () => {
  describe('getDiagnostics', () => {
    it('returns empty for unknown file', async () => {
      const mgr = await createManager()
      expect(mgr.getDiagnostics('/unknown.ts')).toEqual([])
    })
  })

  describe('isServerRunning', () => {
    it('returns false initially', async () => {
      const mgr = await createManager()
      expect(mgr.isServerRunning('typescript')).toBe(false)
    })
  })

  describe('stopServer', () => {
    it('does nothing if not running', async () => {
      const mgr = await createManager()
      mgr.stopServer('typescript')
      expect(mgr.isServerRunning('typescript')).toBe(false)
    })
  })

  describe('stopAll', () => {
    it('does nothing if nothing running', async () => {
      const mgr = await createManager()
      mgr.stopAll()
    })
  })

  describe('openFile / updateFile / closeFile', () => {
    it('does nothing if server not running', async () => {
      const mgr = await createManager()
      await mgr.openFile('/test.ts', 'content', 'typescript')
      await mgr.updateFile('/test.ts', 'new', 'typescript')
      await mgr.closeFile('/test.ts', 'typescript')
    })
  })

  describe('startServer with unsupported language', () => {
    it('returns false for unsupported language', async () => {
      const mgr = await createManager()
      const result = await mgr.startServer('/workspace', 'python')
      expect(result).toBe(false)
    })
  })

  describe('startServer with supported language', () => {
    it('returns false on spawn error', async () => {
      const { EventEmitter } = await import('events')
      const mockProc = new EventEmitter() as any
      mockProc.stdin = { write: vi.fn(), destroyed: false }
      mockProc.stdout = new EventEmitter()
      mockProc.stderr = new EventEmitter()
      mockProc.kill = vi.fn()
      mockSpawn.mockReturnValue(mockProc)

      const mgr = await createManager()
      const startPromise = mgr.startServer('/workspace', 'typescript')

      setTimeout(() => {
        mockProc.emit('error', new Error('spawn failed'))
      }, 10)

      const result = await startPromise
      expect(result).toBe(false)
    })
  })
})
