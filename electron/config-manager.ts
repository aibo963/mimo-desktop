import fs from 'fs'
import path from 'path'
import os from 'os'
import * as jsonc from 'jsonc-parser'
import { getMimoPath, execMimo } from './utils/mimo-path'
import { debug } from './debug'
import { encrypt, decrypt, isEncrypted } from './crypto'

const API_KEY_PATHS = [
  'provider.openai.options.apiKey',
  'provider.anthropic.options.apiKey',
  'provider.google.options.apiKey',
  'provider.xiaomi.options.apiKey',
  'provider.deepseek.options.apiKey',
  'provider.openrouter.options.apiKey',
  'tts.apiKey',
]

function getConfigPath(): string {
  const platform = os.platform()
  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, 'mimocode', 'mimocode.jsonc')
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'mimocode', 'mimocode.jsonc')
  }
  return path.join(os.homedir(), '.config', 'mimocode', 'mimocode.jsonc')
}

export class ConfigManager {
  private configPath: string
  private mimoPath: string

  constructor() {
    this.configPath = getConfigPath()
    this.mimoPath = getMimoPath()
  }

  private isApiKeyPath(keyPath: string): boolean {
    return API_KEY_PATHS.some((p) => keyPath === p || keyPath.startsWith(p + '.'))
  }

  private encryptConfigKeys(obj: any, currentPath = ''): any {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'string') {
      return isEncrypted(obj) ? obj : encrypt(obj)
    }
    if (Array.isArray(obj)) {
      return obj.map((item, i) => this.encryptConfigKeys(item, `${currentPath}[${i}]`))
    }
    if (typeof obj === 'object') {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key
        if (
          this.isApiKeyPath(fullPath) &&
          typeof value === 'string' &&
          value &&
          !isEncrypted(value)
        ) {
          result[key] = encrypt(value)
        } else {
          result[key] = this.encryptConfigKeys(value, fullPath)
        }
      }
      return result
    }
    return obj
  }

  private decryptConfigKeys(obj: any, currentPath = ''): any {
    if (obj === null || obj === undefined) return obj
    if (typeof obj === 'string') {
      return isEncrypted(obj) ? decrypt(obj) : obj
    }
    if (Array.isArray(obj)) {
      return obj.map((item, i) => this.decryptConfigKeys(item, `${currentPath}[${i}]`))
    }
    if (typeof obj === 'object') {
      const result: Record<string, any> = {}
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key
        if (this.isApiKeyPath(fullPath) && typeof value === 'string' && isEncrypted(value)) {
          result[key] = decrypt(value)
        } else {
          result[key] = this.decryptConfigKeys(value, fullPath)
        }
      }
      return result
    }
    return obj
  }

  getAll(): Record<string, any> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {}
      }
      const content = fs.readFileSync(this.configPath, 'utf-8')
      const parsed = jsonc.parse(content) || {}
      return this.decryptConfigKeys(parsed)
    } catch (error: any) {
      debug.error('Failed to read config:', error.message)
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
      debug.error('Failed to get raw config:', error.message)
      return '{}'
    }
  }

  private atomicWrite(content: string): void {
    const dir = path.dirname(this.configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const tmpPath = this.configPath + '.tmp'
    fs.writeFileSync(tmpPath, content, 'utf-8')
    fs.renameSync(tmpPath, this.configPath)
  }

  set(key: string, value: any): void {
    try {
      let content = this.getRaw()
      if (!content.trim()) {
        content = '{}'
      }
      // Encrypt API key values before writing
      const finalValue =
        this.isApiKeyPath(key) && typeof value === 'string' && value && !isEncrypted(value)
          ? encrypt(value)
          : value
      const edits = jsonc.modify(content, key.split('.'), finalValue, {
        formattingOptions: { tabSize: 2, insertSpaces: true },
      })
      const newContent = jsonc.applyEdits(content, edits)
      this.atomicWrite(newContent)
    } catch (error: any) {
      debug.error('Failed to set config:', error.message)
      throw error
    }
  }

  setRaw(content: string): void {
    try {
      JSON.parse(content)
      this.atomicWrite(content)
    } catch (error: any) {
      debug.error('Failed to set raw config:', error.message)
      throw error
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const stdout = await execMimo('models')
      return stdout
        .split('\n')
        .map((line) => line.trim().replace(/\r$/, ''))
        .filter((line) => line && line.includes('/'))
    } catch (error: any) {
      debug.error('[ConfigManager] getModels failed:', error.message)
      return []
    }
  }
}
