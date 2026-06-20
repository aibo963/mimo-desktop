import https from 'https'
import http from 'http'
import { BrowserWindow } from 'electron'
import { sendEventToRenderer } from './utils/event-helper'
import { MimoEvent } from './types/ipc'
import { debug } from './debug'
import { MAX_API_MESSAGES, API_REQUEST_TIMEOUT_MS } from './constants'

interface ProviderConfig {
  api: string
  options?: { apiKey?: string }
  models?: string[]
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
  tool_call_id?: string
  tool_calls?: any[]
}

interface StreamChunk {
  choices?: { delta: { content?: string; tool_calls?: any[] }; finish_reason?: string }[]
}

export class APIManager {
  private window: BrowserWindow
  private abortController: AbortController | null = null
  private baseUrl: string = ''
  private apiKey: string = ''
  private model: string = 'xiaomi/mimo-v2.5-pro'
  private messages: ChatMessage[] = []

  constructor(window: BrowserWindow) {
    this.window = window
  }

  configure(provider: ProviderConfig, model: string) {
    this.baseUrl = provider.api
    this.apiKey = provider.options?.apiKey || ''
    this.model = model
    debug.log('[APIManager] configured:', { baseUrl: this.baseUrl, model: this.model })
  }

  private sendEvent(event: MimoEvent) {
    sendEventToRenderer(this.window, event)
  }

  async sendMessage(
    content: string,
    attachments?: Array<{ name: string; type: string; size: number; dataUrl?: string }>
  ): Promise<void> {
    debug.log('[APIManager] sendMessage called', {
      apiKey: this.apiKey ? 'set' : 'not set',
      baseUrl: this.baseUrl,
    })
    if (!this.apiKey || !this.baseUrl) {
      console.error('[APIManager] API not configured')
      this.sendEvent({
        type: 'error',
        data: { message: 'API 未配置，请在设置中配置 API Key' },
        timestamp: Date.now(),
      })
      return
    }

    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    const messageContent: any[] = []

    if (content && content.trim()) {
      messageContent.push({ type: 'text', text: content })
    }

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.dataUrl && att.type.startsWith('image/')) {
          messageContent.push({
            type: 'image_url',
            image_url: { url: att.dataUrl },
          })
        } else {
          messageContent.push({
            type: 'text',
            text: `[附件: ${att.name} (${att.type}, ${(att.size / 1024).toFixed(1)}KB)]`,
          })
        }
      }
    }

    if (messageContent.length === 0) {
      messageContent.push({ type: 'text', text: content })
    }

    const userMessage =
      messageContent.length === 1 && messageContent[0].type === 'text'
        ? { role: 'user' as const, content }
        : { role: 'user' as const, content: messageContent }

    this.messages.push(userMessage)
    if (this.messages.length > MAX_API_MESSAGES) {
      this.messages = this.messages.slice(-MAX_API_MESSAGES)
    }
    this.abortController = new AbortController()

    const messageId = crypto.randomUUID()
    const sessionID = `api_${Date.now()}`

    this.sendEvent({
      type: 'session_update',
      data: { action: 'processing', messageId },
      timestamp: Date.now(),
    })

    try {
      const url = new URL(`${this.baseUrl}/chat/completions`)
      const isHttps = url.protocol === 'https:'

      const body = JSON.stringify({
        model: this.model,
        messages: this.messages,
        stream: true,
        tools: [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query',
                  },
                },
                required: ['query'],
              },
            },
          },
        ],
        tool_choice: 'auto',
      })

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }

      const transport = isHttps ? https : http

      await new Promise<void>((resolve, reject) => {
        const req = transport.request(options, (res) => {
          if (res.statusCode !== 200) {
            let errorData = ''
            res.on('data', (chunk) => {
              errorData += chunk
            })
            res.on('end', () => {
              try {
                const parsed = JSON.parse(errorData)
                const msg = parsed.error?.message || `HTTP ${res.statusCode}`
                this.sendEvent({ type: 'error', data: { message: msg }, timestamp: Date.now() })
              } catch {
                this.sendEvent({
                  type: 'error',
                  data: { message: `HTTP ${res.statusCode}: ${errorData.substring(0, 200)}` },
                  timestamp: Date.now(),
                })
              }
              reject(new Error(`HTTP ${res.statusCode}`))
            })
            return
          }

          let buffer = ''
          let hasToolCalls = false
          let doneSent = false
          const toolCallsMap = new Map<number, any>()

          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith('data: ')) continue
              const data = trimmed.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed: StreamChunk = JSON.parse(data)
                const choice = parsed.choices?.[0]
                if (!choice) continue

                const delta = choice.delta

                if (delta.content) {
                  this.sendEvent({
                    type: 'text',
                    data: { content: delta.content, part: { text: delta.content } },
                    timestamp: Date.now(),
                  })
                }

                if (delta.tool_calls) {
                  hasToolCalls = true
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index || 0
                    if (!toolCallsMap.has(idx)) {
                      toolCallsMap.set(idx, {
                        id: tc.id || `call_${crypto.randomUUID()}`,
                        type: 'function',
                        function: { name: '', arguments: '' },
                      })
                    }
                    const existing = toolCallsMap.get(idx)!
                    if (tc.id) existing.id = tc.id
                    if (tc.function?.name) existing.function.name += tc.function.name
                    if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
                  }
                }

                if (choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls') {
                  if (!doneSent) {
                    doneSent = true
                    if (hasToolCalls && toolCallsMap.size > 0) {
                      const toolCalls = Array.from(toolCallsMap.values())
                      for (const tc of toolCalls) {
                        this.sendEvent({
                          type: 'tool_use',
                          data: {
                            id: tc.id,
                            name: tc.function.name,
                            input: JSON.parse(tc.function.arguments || '{}'),
                            part: {
                              id: tc.id,
                              tool: tc.function.name,
                              input: JSON.parse(tc.function.arguments || '{}'),
                            },
                          },
                          timestamp: Date.now(),
                        })
                      }

                      if (choice.finish_reason === 'tool_calls') {
                        this.sendEvent({
                          type: 'step_finish',
                          data: { reason: 'tool_calls' },
                          timestamp: Date.now(),
                        })
                        this.sendEvent({
                          type: 'done',
                          data: { exitCode: 0 },
                          timestamp: Date.now(),
                        })
                        resolve()
                        return
                      }
                    }

                    this.sendEvent({
                      type: 'step_finish',
                      data: { reason: 'stop' },
                      timestamp: Date.now(),
                    })
                    this.sendEvent({ type: 'done', data: { exitCode: 0 }, timestamp: Date.now() })
                    resolve()
                  }
                }
              } catch (e) {
                debug.log('[APIManager] parse error:', e)
              }
            }
          })

          res.on('end', () => {
            if (!this.abortController?.signal.aborted && !doneSent) {
              doneSent = true
              this.sendEvent({ type: 'done', data: { exitCode: 0 }, timestamp: Date.now() })
              resolve()
            }
          })
        })

        req.on('error', (err) => {
          this.sendEvent({ type: 'error', data: { message: err.message }, timestamp: Date.now() })
          reject(err)
        })

        req.on('timeout', () => {
          req.destroy()
          this.sendEvent({ type: 'error', data: { message: '请求超时' }, timestamp: Date.now() })
          reject(new Error('Timeout'))
        })

        req.setTimeout(API_REQUEST_TIMEOUT_MS)
        req.write(body)
        req.end()
      })
    } catch (err: any) {
      debug.error('[APIManager] send failed:', err.message)
    } finally {
      this.abortController = null
    }
  }

  cancel() {
    this.abortController?.abort()
    this.abortController = null
    this.sendEvent({ type: 'done', data: { exitCode: 0 }, timestamp: Date.now() })
  }

  clearMessages() {
    this.messages = []
  }
}
