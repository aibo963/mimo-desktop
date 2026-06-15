import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

function getMimoPath(): string {
  const npmGlobalPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'mimo.cmd')
    : 'mimo'
  
  if (fs.existsSync(npmGlobalPath)) {
    return npmGlobalPath
  }
  return 'mimo'
}

function escapeArg(arg: string): string {
  if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
    return `"${arg.replace(/"/g, '\\"')}"`
  }
  return arg
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
      const { stdout } = await execAsync(`${this.mimoPath} session list --format json`, {
        timeout: 10000,
      })
      const parsed = JSON.parse(stdout)
      return Array.isArray(parsed) ? parsed : []
    } catch (error: any) {
      console.error('Failed to list sessions:', error.message)
      return []
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await execAsync(`${this.mimoPath} session delete ${escapeArg(sessionId)}`, {
        timeout: 10000,
      })
    } catch (error: any) {
      console.error('Failed to delete session:', error.message)
      throw error
    }
  }

  async getHistory(sessionId: string): Promise<any[]> {
    try {
      const query = `SELECT role, content, created_at FROM part WHERE session_id = '${sessionId}' AND type = 'text' ORDER BY created_at`
      const { stdout } = await execAsync(`${this.mimoPath} db ${escapeArg(query)} --format json`, {
        timeout: 10000,
      })
      const parsed = JSON.parse(stdout)
      return Array.isArray(parsed) ? parsed : []
    } catch (error: any) {
      console.error('Failed to get session history:', error.message)
      return []
    }
  }
}
