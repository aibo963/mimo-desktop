declare const process: { env?: { NODE_ENV?: string } } | undefined
const isDev = typeof process !== 'undefined' ? process.env?.NODE_ENV === 'development' : false

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  data?: unknown
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private persistKey = 'mimo-logs'

  constructor() {
    this.load()
  }

  private load() {
    try {
      const saved = localStorage.getItem(this.persistKey)
      if (saved) {
        this.logs = JSON.parse(saved).slice(-this.maxLogs)
      }
    } catch (e) {
      console.error('[Logger] Failed to load logs', e)
    }
  }

  private save() {
    try {
      localStorage.setItem(this.persistKey, JSON.stringify(this.logs.slice(-this.maxLogs)))
    } catch (e) {
      console.error('[Logger] Failed to save logs', e)
    }
  }

  private add(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    }
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
    this.save()
  }

  log(message: string, data?: unknown) {
    if (isDev) console.log('[DEBUG]', message, data)
    this.add('debug', message, data)
  }

  info(message: string, data?: unknown) {
    if (isDev) console.info('[INFO]', message, data)
    this.add('info', message, data)
  }

  warn(message: string, data?: unknown) {
    if (isDev) console.warn('[WARN]', message, data)
    this.add('warn', message, data)
  }

  error(message: string, data?: unknown) {
    console.error('[ERROR]', message, data)
    this.add('error', message, data)
  }

  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    let filtered = this.logs
    if (level) {
      filtered = filtered.filter((l) => l.level === level)
    }
    return filtered.slice(-limit)
  }

  clearLogs() {
    this.logs = []
    this.save()
  }

  exportLogs(): string {
    return this.logs
      .map((l) => {
        const time = new Date(l.timestamp).toISOString()
        const dataStr = l.data ? ` ${JSON.stringify(l.data)}` : ''
        return `[${time}] [${l.level.toUpperCase()}] ${l.message}${dataStr}`
      })
      .join('\n')
  }
}

export const logger = new Logger()

export const debug = {
  log: (message: string, data?: unknown) => logger.log(message, data),
  warn: (message: string, data?: unknown) => logger.warn(message, data),
  error: (message: string, data?: unknown) => logger.error(message, data),
  info: (message: string, data?: unknown) => logger.info(message, data),
}
