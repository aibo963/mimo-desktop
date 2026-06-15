import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { MimoEvent } from './types/ipc'
import path from 'path'
import fs from 'fs'

function getMimoPath(): string {
  const npmGlobalPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'mimo.cmd')
    : 'mimo'
  
  if (fs.existsSync(npmGlobalPath)) {
    return npmGlobalPath
  }
  return 'mimo'
}

interface QueuedMessage {
  id: string
  message: string
  sessionId?: string
  priority: number
  timestamp: number
}

export class ProcessManager {
  private process: ChildProcess | null = null
  private window: BrowserWindow
  private mimoPath: string
  private queue: QueuedMessage[] = []
  private isProcessing = false
  private currentMessageId: string | null = null

  constructor(window: BrowserWindow) {
    this.window = window
    this.mimoPath = getMimoPath()
  }

  async verifyApi(): Promise<{ success: boolean; message: string; user?: string }> {
    try {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      
      const { stdout } = await execAsync(`${this.mimoPath} providers whoami`, {
        timeout: 10000,
      })
      
      if (stdout.includes('User ID')) {
        const userMatch = stdout.match(/User ID:\s*(\d+)/)
        return {
          success: true,
          message: 'API 验证成功',
          user: userMatch ? userMatch[1] : undefined,
        }
      }
      
      return {
        success: false,
        message: '未找到有效的 API 配置',
      }
    } catch (error: any) {
      return {
        success: false,
        message: `API 验证失败: ${error.message}`,
      }
    }
  }

  async sendMessage(message: string, sessionId?: string, priority: number = 0): Promise<string> {
    const messageId = crypto.randomUUID()
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      message,
      sessionId,
      priority,
      timestamp: Date.now(),
    }

    this.queue.push(queuedMessage)
    this.queue.sort((a, b) => b.priority - a.priority)

    this.sendEvent({
      type: 'session_update',
      data: {
        action: 'queued',
        messageId,
        queuePosition: this.queue.length,
        isProcessing: this.isProcessing,
      },
      timestamp: Date.now(),
    })

    if (!this.isProcessing) {
      this.processQueue()
    }

    return messageId
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const queuedMessage = this.queue.shift()!
    this.currentMessageId = queuedMessage.id

    this.sendEvent({
      type: 'session_update',
      data: {
        action: 'processing',
        messageId: queuedMessage.id,
        queueRemaining: this.queue.length,
      },
      timestamp: Date.now(),
    })

    try {
      await this.executeMessage(queuedMessage)
    } catch (error: any) {
      console.error('Failed to process message:', error)
    }

    this.currentMessageId = null
    this.processQueue()
  }

  private async executeMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message, sessionId } = queuedMessage

    const cmdParts = ['run', '--format', 'json']
    if (sessionId) cmdParts.push('--session', sessionId)
    
    const escapedMessage = message.replace(/"/g, '\\"')
    const command = `${this.mimoPath} ${cmdParts.join(' ')} "${escapedMessage}"`

    console.log('Executing command:', command)

    return new Promise((resolve, reject) => {
      this.process = spawn(command, [], {
        shell: true,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      })

      let stdoutData = ''
      let stderrData = ''

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        stdoutData += text
        console.log('stdout:', text)
        
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.trim()) {
            this.handleLine(line.trim())
          }
        }
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString().trim()
        stderrData += text
        console.log('stderr:', text)
        
        if (text && !text.includes('warning') && !text.includes('DEP0')) {
          this.sendEvent({
            type: 'error',
            data: { message: text, messageId: queuedMessage.id },
            timestamp: Date.now(),
          })
        }
      })

      this.process.on('close', (code) => {
        console.log('Process closed with code:', code)
        
        this.sendEvent({
          type: 'done',
          data: {
            exitCode: code,
            messageId: queuedMessage.id,
            queueRemaining: this.queue.length,
          },
          timestamp: Date.now(),
        })
        
        this.process = null
        resolve()
      })

      this.process.on('error', (err) => {
        console.error('Process error:', err)
        this.sendEvent({
          type: 'error',
          data: { message: err.message, messageId: queuedMessage.id },
          timestamp: Date.now(),
        })
        this.process = null
        reject(err)
      })
    })
  }

  cancel(messageId?: string): void {
    if (messageId) {
      this.queue = this.queue.filter(m => m.id !== messageId)
      this.sendEvent({
        type: 'session_update',
        data: {
          action: 'cancelled',
          messageId,
          queueRemaining: this.queue.length,
        },
        timestamp: Date.now(),
      })
    } else if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.sendEvent({
        type: 'done',
        data: { cancelled: true, messageId: this.currentMessageId },
        timestamp: Date.now(),
      })
    }
  }

  getQueueStatus(): { queueLength: number; isProcessing: boolean; currentMessageId: string | null } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentMessageId: this.currentMessageId,
    }
  }

  isRunning(): boolean {
    return this.isProcessing
  }

  private handleLine(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const event = JSON.parse(trimmed)
      this.sendEvent({
        type: this.mapEventType(event),
        data: event,
        timestamp: Date.now(),
      })
    } catch {
      this.sendEvent({
        type: 'text',
        data: { content: trimmed },
        timestamp: Date.now(),
      })
    }
  }

  private mapEventType(event: any): MimoEvent['type'] {
    if (!event || typeof event !== 'object') return 'text'

    const type = event.type || event.kind || ''
    
    switch (type) {
      case 'text':
      case 'content_block_delta':
        return 'text'
      case 'tool_use':
      case 'tool_call':
        return 'tool_use'
      case 'tool_result':
      case 'tool_result_delta':
        return 'tool_result'
      case 'step_start':
      case 'message_start':
        return 'step_start'
      case 'step_finish':
      case 'message_stop':
      case 'message_end':
        return 'step_finish'
      case 'error':
        return 'error'
      case 'permission_request':
      case 'permission':
        return 'permission_request'
      default:
        return 'text'
    }
  }

  private sendEvent(event: MimoEvent): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('mimo:event', event)
    }
  }
}
