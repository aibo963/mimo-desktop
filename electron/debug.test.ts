import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()

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
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}))

function createLogFile(lines: string[]) {
  mockExistsSync.mockReturnValue(true)
  mockReadFileSync.mockReturnValue(lines.join('\n'))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

async function createLogger() {
  const { getLogger } = await import('./debug')
  return getLogger()
}

describe('ElectronLogger', () => {
  describe('load', () => {
    it('loads valid log lines', async () => {
      const now = new Date().toISOString()
      createLogFile([
        `[${now}] [DEBUG] test message {"key":"value"}`,
        `[${now}] [INFO] another message`,
      ])

      const logger = await createLogger()
      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].message).toBe('test message')
      expect(logs[0].data).toEqual({ key: 'value' })
      expect(logs[1].message).toBe('another message')
      expect(logs[1].data).toBeUndefined()
    })

    it('handles non-JSON data gracefully', async () => {
      const now = new Date().toISOString()
      createLogFile([
        `[${now}] [DEBUG] node=D:\\nodestuff is not valid JSON`,
        `[${now}] [ERROR] real error {"code":500}`,
      ])

      const logger = await createLogger()
      const logs = logger.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].message).toBe('node=D:\\nodestuff is not valid JSON')
      expect(logs[0].data).toBeUndefined()
      expect(logs[1].data).toEqual({ code: 500 })
    })

    it('skips lines that do not match log format', async () => {
      const now = new Date().toISOString()
      createLogFile(['random garbage line', `[${now}] [WARN] valid line`, ''])

      const logger = await createLogger()
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('valid line')
    })

    it('handles missing log file', async () => {
      mockExistsSync.mockReturnValue(false)

      const logger = await createLogger()
      const logs = logger.getLogs()
      expect(logs).toHaveLength(0)
    })

    it('truncates to maxLogs on load', async () => {
      const now = new Date().toISOString()
      const lines = Array.from({ length: 10 }, (_, i) => `[${now}] [INFO] message ${i}`)
      createLogFile(lines)

      const logger = await createLogger()
      const logs = logger.getLogs(undefined, 100)
      expect(logs.length).toBeLessThanOrEqual(5000)
    })
  })

  describe('log levels', () => {
    it('adds debug log', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.log('debug msg', { foo: 1 })

      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('debug')
      expect(logs[0].message).toBe('debug msg')
      expect(logs[0].data).toEqual({ foo: 1 })
    })

    it('adds info log', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.info('info msg')

      const logs = logger.getLogs()
      expect(logs[0].level).toBe('info')
    })

    it('adds warn log', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.warn('warn msg')

      const logs = logger.getLogs()
      expect(logs[0].level).toBe('warn')
    })

    it('adds error log', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.error('error msg')

      const logs = logger.getLogs()
      expect(logs[0].level).toBe('error')
    })
  })

  describe('getLogs', () => {
    it('filters by level', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.log('d1')
      logger.info('i1')
      logger.warn('w1')
      logger.error('e1')

      expect(logger.getLogs('debug')).toHaveLength(1)
      expect(logger.getLogs('info')).toHaveLength(1)
      expect(logger.getLogs('warn')).toHaveLength(1)
      expect(logger.getLogs('error')).toHaveLength(1)
    })

    it('respects limit', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      for (let i = 0; i < 20; i++) logger.log(`msg ${i}`)

      expect(logger.getLogs(undefined, 5)).toHaveLength(5)
    })
  })

  describe('clearLogs', () => {
    it('clears all logs', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.log('msg1')
      logger.log('msg2')
      expect(logger.getLogs()).toHaveLength(2)

      logger.clearLogs()
      expect(logger.getLogs()).toHaveLength(0)
    })
  })

  describe('exportLogs', () => {
    it('exports logs as formatted string', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.info('hello', { a: 1 })

      const exported = logger.exportLogs()
      expect(exported).toContain('[INFO]')
      expect(exported).toContain('hello')
      expect(exported).toContain('{"a":1}')
    })

    it('exports non-JSON data as raw string', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.log('raw data', 'not json')

      const exported = logger.exportLogs()
      expect(exported).toContain('not json')
    })
  })

  describe('save', () => {
    it('writes logs to file', async () => {
      mockExistsSync.mockReturnValue(false)
      mockWriteFileSync.mockImplementation(() => {})

      const logger = await createLogger()
      logger.info('saved msg')

      expect(mockWriteFileSync).toHaveBeenCalled()
      const written = mockWriteFileSync.mock.calls[0][1] as string
      expect(written).toContain('saved msg')
    })
  })
})
