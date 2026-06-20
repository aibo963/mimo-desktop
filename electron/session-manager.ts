import { getMimoPath, execMimo } from './utils/mimo-path'
import { debug } from './debug'

function escapeArg(arg: string): string {
  if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
    return `"${arg.replace(/"/g, '\\"')}"`
  }
  return arg
}

function sanitizeSessionId(sessionId: string): string {
  if (!/^[a-f0-9-]{1,64}$/i.test(sessionId)) {
    throw new Error('Invalid session ID format')
  }
  return sessionId
}

export interface Session {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount?: number
}

export class SessionManager {
  private mimoPath: string

  constructor() {
    this.mimoPath = getMimoPath()
  }

  async list(): Promise<Session[]> {
    try {
      const stdout = await execMimo('session list --format json')
      const trimmed = stdout.trim()
      if (!trimmed) return []
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    } catch (error: any) {
      debug.error('[SessionManager] list failed:', error.message)
      return []
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      const safeId = sanitizeSessionId(sessionId)
      await execMimo(`session delete ${escapeArg(safeId)}`)
    } catch (error: any) {
      debug.error('[SessionManager] delete failed:', error.message)
      throw error
    }
  }

  async getHistory(sessionId: string): Promise<any[]> {
    try {
      const safeId = sanitizeSessionId(sessionId)
      const query = `SELECT role, content, created_at FROM part WHERE session_id = '${safeId}' AND type = 'text' ORDER BY created_at`
      const stdout = await execMimo(`db ${escapeArg(query)} --format json`)
      const parsed = JSON.parse(stdout)
      return Array.isArray(parsed) ? parsed : []
    } catch (error: any) {
      debug.error('[SessionManager] getHistory failed:', error.message)
      return []
    }
  }
}
