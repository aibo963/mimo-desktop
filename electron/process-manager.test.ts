import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

const mockSend = vi.fn()
const mockIsDestroyed = vi.fn().mockReturnValue(false)
const mockWebContents = { send: mockSend }
const mockWindow = { isDestroyed: mockIsDestroyed, webContents: mockWebContents }

const mockSpawn = vi.fn()
const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockSendEventToRenderer = vi.fn()

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}))

vi.mock('child_process', () => ({
  default: {
    spawn: mockSpawn,
  },
  spawn: mockSpawn,
}))

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}))

vi.mock('./utils/mimo-path', () => ({
  getMimoPath: vi.fn().mockReturnValue('mimo'),
  getMimoSpawnArgs: vi.fn().mockReturnValue({ command: 'node', args: ['mimo.js'] }),
}))

vi.mock('./utils/event-helper', () => ({
  sendEventToRenderer: mockSendEventToRenderer,
}))

vi.mock('./debug', () => ({
  debug: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function createMockProcess() {
  const proc = new EventEmitter() as any
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.pid = 12345
  proc.kill = vi.fn()
  return proc
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mockExistsSync.mockReturnValue(false)
  mockIsDestroyed.mockReturnValue(false)
})

async function createManager() {
  const { ProcessManager } = await import('./process-manager')
  return new ProcessManager(mockWindow as any)
}

describe('ProcessManager', () => {
  describe('event type mapping', () => {
    it('maps tool_use events', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'tool_use', tool: 'bash' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const toolEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'tool_use'
      )
      expect(toolEvent).toBeDefined()
    })

    it('maps step_start events', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'step_start' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const stepEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'step_start'
      )
      expect(stepEvent).toBeDefined()
    })

    it('maps step_finish events', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'step_finish' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const stepEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'step_finish'
      )
      expect(stepEvent).toBeDefined()
    })

    it('maps error events', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'error', message: 'fail' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const errEvent = mockSendEventToRenderer.mock.calls.find((c: any) => c[1].type === 'error')
      expect(errEvent).toBeDefined()
    })

    it('maps permission_request events', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'permission_request' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const permEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'permission_request'
      )
      expect(permEvent).toBeDefined()
    })

    it('maps tool_result events', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'tool_result' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const resultEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'tool_result'
      )
      expect(resultEvent).toBeDefined()
    })

    it('maps unknown types to text', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'unknown_type' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const textEvent = mockSendEventToRenderer.mock.calls.find((c: any) => c[1].type === 'text')
      expect(textEvent).toBeDefined()
    })

    it('handles non-JSON lines as text', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from('plain text output\n'))
      mockProc.emit('close', 0)

      const textEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'text' && c[1].data.content === 'plain text output'
      )
      expect(textEvent).toBeDefined()
    })

    it('handles content_block_delta as text', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      const jsonLine = JSON.stringify({ type: 'content_block_delta' })
      ;(mockProc.stdout as EventEmitter).emit('data', Buffer.from(jsonLine + '\n'))
      mockProc.emit('close', 0)

      const textEvent = mockSendEventToRenderer.mock.calls.find((c: any) => c[1].type === 'text')
      expect(textEvent).toBeDefined()
    })
  })

  describe('queue', () => {
    it('adds message to queue and returns messageId', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      const id = await manager.sendMessage('hello')
      expect(id).toBeDefined()
      expect(typeof id).toBe('string')

      mockProc.emit('close', 0)
    })

    it('reports queue status', async () => {
      const manager = await createManager()
      const status = manager.getQueueStatus()
      expect(status).toEqual({
        queueLength: 0,
        isProcessing: false,
        currentMessageId: null,
      })
    })

    it('throws when queue is full', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('first')
      ;(manager as any).queue = Array.from({ length: 100 }, (_, i) => ({
        id: `filler-${i}`,
        message: `filler ${i}`,
        priority: 0,
        timestamp: Date.now(),
      }))

      await expect(manager.sendMessage('overflow')).rejects.toThrow('Queue is full')

      mockProc.emit('close', 0)
    })

    it('sends queued event on sendMessage', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('hello')

      const queuedEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'session_update' && c[1].data.action === 'queued'
      )
      expect(queuedEvent).toBeDefined()

      mockProc.emit('close', 0)
    })
  })

  describe('cancel', () => {
    it('cancels a queued message by id', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('first')
      const secondId = await manager.sendMessage('second')
      const result = manager.cancel(secondId)
      expect(result.cancelled).toBe(true)

      mockProc.emit('close', 0)
    })

    it('returns false for non-existent message', async () => {
      const manager = await createManager()
      const result = manager.cancel('non-existent-id')
      expect(result.cancelled).toBe(false)
      expect(result.reason).toBe('Message not found in queue')
    })

    it('cancels current process when no messageId', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('hello')

      const result = manager.cancel()
      expect(result.cancelled).toBe(true)
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('returns false when nothing is running', async () => {
      const manager = await createManager()
      const result = manager.cancel()
      expect(result.cancelled).toBe(false)
      expect(result.reason).toBe('Nothing is running')
    })
  })

  describe('destroy', () => {
    it('kills process and clears queue', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('hello')
      manager.destroy()

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM')
      expect(manager.getQueueStatus().queueLength).toBe(0)
      expect(manager.isRunning()).toBe(false)
    })
  })

  describe('isRunning', () => {
    it('returns false initially', async () => {
      const manager = await createManager()
      expect(manager.isRunning()).toBe(false)
    })

    it('returns true while processing', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('hello')
      expect(manager.isRunning()).toBe(true)

      mockProc.emit('close', 0)
    })
  })

  describe('process execution', () => {
    it('spawns process with correct args', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('hello world')

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['mimo.js', 'run', '--format', 'json', 'hello world'],
        expect.objectContaining({
          env: expect.objectContaining({ NO_COLOR: '1', FORCE_COLOR: '0' }),
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      )

      mockProc.emit('close', 0)
    })

    it('includes sessionId when provided', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('hello', 'ses_123')

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        ['mimo.js', 'run', '--format', 'json', '--session', 'ses_123', 'hello'],
        expect.any(Object)
      )

      mockProc.emit('close', 0)
    })

    it('sends done event on process close', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      mockProc.emit('close', 0)

      const doneEvent = mockSendEventToRenderer.mock.calls.find((c: any) => c[1].type === 'done')
      expect(doneEvent).toBeDefined()
    })

    it('sends error event on process error', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      mockProc.emit('error', new Error('spawn failed'))

      const errEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'error' && c[1].data.message === 'spawn failed'
      )
      expect(errEvent).toBeDefined()
    })

    it('handles stderr output', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      ;(mockProc.stderr as EventEmitter).emit('data', Buffer.from('fatal error occurred'))
      mockProc.emit('close', 0)

      const errEvent = mockSendEventToRenderer.mock.calls.find(
        (c: any) => c[1].type === 'error' && c[1].data.message === 'fatal error occurred'
      )
      expect(errEvent).toBeDefined()
    })

    it('filters warning messages from stderr', async () => {
      const manager = await createManager()
      const mockProc = createMockProcess()
      mockSpawn.mockReturnValue(mockProc)

      await manager.sendMessage('test')
      ;(mockProc.stderr as EventEmitter).emit(
        'data',
        Buffer.from('DEP0012: some deprecation warning')
      )
      mockProc.emit('close', 0)

      const errEvent = mockSendEventToRenderer.mock.calls.find((c: any) => c[1].type === 'error')
      expect(errEvent).toBeUndefined()
    })
  })
})
