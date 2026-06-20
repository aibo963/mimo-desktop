import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import * as jsonc from 'jsonc-parser'
import { MimoEvent } from './types/ipc'
import { getMimoPath, getMimoSpawnArgs } from './utils/mimo-path'
import { sendEventToRenderer } from './utils/event-helper'
import { debug } from './debug'

interface QueuedMessage {
  id: string
  message: string
  sessionId?: string
  priority: number
  timestamp: number
}

const MAX_QUEUE_SIZE = 100
const PROCESS_TIMEOUT_MS = 5 * 60 * 1000

export class ProcessManager {
  private process: ChildProcess | null = null
  private window: BrowserWindow
  private mimoPath: string
  private mimoSpawnArgs: { command: string; args: string[] }
  private queue: QueuedMessage[] = []
  private isProcessing = false
  private currentMessageId: string | null = null
  private processTimeout: NodeJS.Timeout | null = null

  constructor(window: BrowserWindow) {
    this.window = window
    this.mimoPath = getMimoPath()
    this.mimoSpawnArgs = getMimoSpawnArgs()
  }

  async verifyApi(): Promise<{ success: boolean; message: string; user?: string }> {
    try {
      const configPath = path.join(os.homedir(), '.config', 'mimocode', 'mimocode.jsonc')
      let config: Record<string, any> = {}
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        config = jsonc.parse(content) || {}
      }

      const disabledProviders: string[] = config.disabled_providers || []
      const providers = config.provider || {}

      for (const [id, providerConfig] of Object.entries(providers)) {
        if (disabledProviders.includes(id)) continue
        const pc = providerConfig as any
        const apiKey = pc?.options?.apiKey
        const apiBase = pc?.api
        if (apiKey && apiBase && apiKey !== 'anonymous') {
          try {
            const https = require('https')
            const url = new URL(`${apiBase}/models`)
            const result = await new Promise<{ success: boolean; message: string; user?: string }>(
              (resolve) => {
                const req = https.request(
                  url,
                  {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${apiKey}`,
                    },
                    timeout: 10000,
                  },
                  (res: any) => {
                    let data = ''
                    res.on('data', (chunk: Buffer) => {
                      data += chunk.toString()
                    })
                    res.on('end', () => {
                      if (res.statusCode === 200) {
                        try {
                          const parsed = JSON.parse(data)
                          const modelCount = parsed?.data?.length || 0
                          resolve({
                            success: true,
                            message: `API 验证成功 (${id})，可用模型: ${modelCount}`,
                          })
                        } catch {
                          resolve({
                            success: true,
                            message: `API 验证成功 (${id})`,
                          })
                        }
                      } else if (res.statusCode === 401 || res.statusCode === 403) {
                        resolve({
                          success: false,
                          message: `API Key 无效 (HTTP ${res.statusCode})`,
                        })
                      } else {
                        resolve({
                          success: false,
                          message: `API 连接失败 (HTTP ${res.statusCode})`,
                        })
                      }
                    })
                  }
                )
                req.on('error', (err: Error) => {
                  resolve({
                    success: false,
                    message: `API 连接失败: ${err.message}`,
                  })
                })
                req.on('timeout', () => {
                  req.destroy()
                  resolve({
                    success: false,
                    message: 'API 连接超时',
                  })
                })
                req.end()
              }
            )
            return result
          } catch (e: any) {
            return {
              success: false,
              message: `API 验证失败: ${e.message}`,
            }
          }
        }
      }

      return {
        success: false,
        message: '未找到已启用的 API Key 配置',
      }
    } catch (error: any) {
      return {
        success: false,
        message: `API 验证失败: ${error.message}`,
      }
    }
  }

  async sendMessage(message: string, sessionId?: string, priority: number = 0): Promise<string> {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error('Queue is full')
    }

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
    if (this.isProcessing) return

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
      debug.error('Failed to process message:', error)
      this.sendEvent({
        type: 'error',
        data: { message: error.message, messageId: queuedMessage.id },
        timestamp: Date.now(),
      })
    }

    this.currentMessageId = null
    this.isProcessing = false
    this.processQueue()
  }

  private async executeMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message, sessionId } = queuedMessage

    const args = ['run', '--format', 'json']
    if (sessionId) args.push('--session', sessionId)
    args.push(message)

    debug.log(
      `[executeMessage] spawning: command=${this.mimoSpawnArgs.command} args=${JSON.stringify([...this.mimoSpawnArgs.args, ...args])}`
    )

    return new Promise((resolve, reject) => {
      this.process = spawn(this.mimoSpawnArgs.command, [...this.mimoSpawnArgs.args, ...args], {
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      debug.log(`[executeMessage] process spawned, pid=${this.process.pid}`)

      this.processTimeout = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGTERM')
          this.sendEvent({
            type: 'error',
            data: { message: 'Process timed out', messageId: queuedMessage.id },
            timestamp: Date.now(),
          })
        }
      }, PROCESS_TIMEOUT_MS)

      let stdoutData = ''
      let stderrData = ''

      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        stdoutData += text
        debug.log(`[stdout] len=${text.length} preview=${text.substring(0, 300)}`)

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
        debug.log(`[stderr] len=${text.length} preview=${text.substring(0, 300)}`)

        if (text && !text.includes('warning') && !text.includes('DEP0')) {
          this.sendEvent({
            type: 'error',
            data: { message: text, messageId: queuedMessage.id },
            timestamp: Date.now(),
          })
        }
      })

      this.process.on('close', (code) => {
        debug.log('Process closed with code:', code)
        this.clearProcessTimeout()

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
        debug.error('Process error:', err)
        this.clearProcessTimeout()
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

  private clearProcessTimeout(): void {
    if (this.processTimeout) {
      clearTimeout(this.processTimeout)
      this.processTimeout = null
    }
  }

  cancel(messageId?: string): { cancelled: boolean; reason?: string } {
    if (messageId) {
      const before = this.queue.length
      this.queue = this.queue.filter((m) => m.id !== messageId)
      if (this.queue.length < before) {
        this.sendEvent({
          type: 'session_update',
          data: {
            action: 'cancelled',
            messageId,
            queueRemaining: this.queue.length,
          },
          timestamp: Date.now(),
        })
        return { cancelled: true }
      }
      return { cancelled: false, reason: 'Message not found in queue' }
    }

    if (this.process) {
      this.clearProcessTimeout()
      this.process.kill('SIGTERM')
      this.process = null
      this.sendEvent({
        type: 'done',
        data: { cancelled: true, messageId: this.currentMessageId },
        timestamp: Date.now(),
      })
      return { cancelled: true }
    }

    return { cancelled: false, reason: 'Nothing is running' }
  }

  getQueueStatus(): {
    queueLength: number
    isProcessing: boolean
    currentMessageId: string | null
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentMessageId: this.currentMessageId,
    }
  }

  isRunning(): boolean {
    return this.isProcessing
  }

  destroy(): void {
    this.clearProcessTimeout()
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
    this.queue = []
    this.isProcessing = false
  }

  private handleLine(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const event = JSON.parse(trimmed)
      const eventType = this.mapEventType(event)
      debug.log(
        `[handleLine] parsed event type=${eventType}原始type=${event.type || event.kind || 'unknown'}`
      )
      this.sendEvent({
        type: eventType,
        data: event,
        timestamp: Date.now(),
      })
    } catch {
      debug.log(`[handleLine] non-JSON line: ${trimmed.substring(0, 200)}`)
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
    debug.log(`[sendEvent] type=${event.type} window_destroyed=${this.window.isDestroyed()}`)
    sendEventToRenderer(this.window, event)
  }
}
