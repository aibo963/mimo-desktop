import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: number
  level: LogLevel
  message: string
  data?: unknown
}

class ElectronLogger {
  private logs: LogEntry[] = []
  private maxLogs = 5000
  private logFile: string

  constructor() {
    const userDataPath = app.getPath('userData')
    this.logFile = path.join(userDataPath, 'app.log')
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, 'utf-8')
        const lines = content.split('\n').filter((l) => l.trim())
        this.logs = lines
          .slice(-this.maxLogs)
          .map((line) => {
            const match = line.match(/^\[(.+?)\] \[(.+?)\] (.+)/)
            if (match) {
              let message = match[3]
              let data: unknown
              const jsonStart = message.lastIndexOf(' {')
              if (jsonStart > 0) {
                const potentialJson = message.slice(jsonStart + 1)
                try {
                  data = JSON.parse(potentialJson)
                  message = message.slice(0, jsonStart)
                } catch {
                  // not JSON, keep as message
                }
              }
              return {
                timestamp: new Date(match[1]).getTime(),
                level: match[2].toLowerCase() as LogLevel,
                message,
                data,
              }
            }
            return null
          })
          .filter(Boolean) as LogEntry[]
      }
    } catch (e) {
      console.error('[ElectronLogger] Failed to load logs', e)
    }
  }

  private save() {
    try {
      const content = this.logs
        .slice(-this.maxLogs)
        .map((l) => {
          const time = new Date(l.timestamp).toISOString()
          const dataStr = l.data ? ` ${JSON.stringify(l.data)}` : ''
          return `[${time}] [${l.level.toUpperCase()}] ${l.message}${dataStr}`
        })
        .join('\n')
      fs.writeFileSync(this.logFile, content, 'utf-8')
    } catch (e) {
      console.error('[ElectronLogger] Failed to save logs', e)
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
    this.add('debug', message, data)
  }

  info(message: string, data?: unknown) {
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

let logger: ElectronLogger | null = null

export function getLogger(): ElectronLogger {
  if (!logger) {
    logger = new ElectronLogger()
  }
  return logger
}

export const debug = {
  log: (message: string, data?: unknown) => getLogger().log(message, data),
  warn: (message: string, data?: unknown) => getLogger().warn(message, data),
  error: (message: string, data?: unknown) => getLogger().error(message, data),
  info: (message: string, data?: unknown) => getLogger().info(message, data),
}
