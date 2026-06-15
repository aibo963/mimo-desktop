import fs from 'fs'
import path from 'path'
import os from 'os'
import * as jsonc from 'jsonc-parser'
import { exec } from 'child_process'
import { promisify } from 'util'

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

export class ConfigManager {
  private configPath: string
  private mimoPath: string

  constructor() {
    this.configPath = path.join(os.homedir(), '.config', 'mimocode', 'mimocode.jsonc')
    this.mimoPath = getMimoPath()
  }

  getAll(): Record<string, any> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {}
      }
      const content = fs.readFileSync(this.configPath, 'utf-8')
      return jsonc.parse(content) || {}
    } catch (error: any) {
      console.error('Failed to read config:', error.message)
      return {}
    }
  }

  getRaw(): string {
    try {
      if (!fs.existsSync(this.configPath)) {
        return '{}'
      }
      return fs.readFileSync(this.configPath, 'utf-8')
    } catch (error: any) {
      console.error('Failed to read config:', error.message)
      return '{}'
    }
  }

  set(key: string, value: any): void {
    try {
      const content = this.getRaw()
      const edits = jsonc.modify(content, key.split('.'), value, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      })
      const newContent = jsonc.applyEdits(content, edits)
      fs.writeFileSync(this.configPath, newContent, 'utf-8')
    } catch (error: any) {
      console.error('Failed to set config:', error.message)
      throw error
    }
  }

  setRaw(content: string): void {
    try {
      JSON.parse(content)
      fs.writeFileSync(this.configPath, content, 'utf-8')
    } catch (error: any) {
      console.error('Failed to set config:', error.message)
      throw error
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`${this.mimoPath} models`, {
        timeout: 10000,
      })
      return stdout.split('\n')
        .map(line => line.trim().replace(/\r$/, ''))
        .filter(line => line && line.includes('/'))
    } catch (error: any) {
      console.error('Failed to get models:', error.message)
      return []
    }
  }
}
