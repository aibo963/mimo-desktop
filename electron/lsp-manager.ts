import { spawn, ChildProcess } from 'child_process'
import path from 'path'

export interface Diagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  severity: 1 | 2 | 3 | 4
  message: string
  source: string
  code?: string
}

interface LSPMessage {
  jsonrpc: '2.0'
  id?: number
  method?: string
  params?: any
  result?: any
  error?: any
}

interface PendingRequest {
  resolve: (result: any) => void
  reject: (error: any) => void
}

export class LSPManager {
  private servers: Map<string, ChildProcess> = new Map()
  private clients: Map<string, LSPClient> = new Map()
  private diagnostics: Map<string, Diagnostic[]> = new Map()

  async startServer(workspacePath: string, language: string): Promise<boolean> {
    const serverConfig = this.getServerConfig(language)
    if (!serverConfig) return false

    try {
      const client = new LSPClient(workspacePath, serverConfig)
      await client.start()
      this.clients.set(language, client)

      client.onDiagnostics((uri, diags) => {
        this.diagnostics.set(uri, diags)
      })

      return true
    } catch (err) {
      console.error(`[LSPManager] Failed to start ${language} server:`, err)
      return false
    }
  }

  stopServer(language: string): void {
    const client = this.clients.get(language)
    if (client) {
      client.stop()
      this.clients.delete(language)
    }
  }

  stopAll(): void {
    for (const [lang, client] of this.clients) {
      client.stop()
    }
    this.clients.clear()
    this.diagnostics.clear()
  }

  async openFile(filePath: string, content: string, language: string): Promise<void> {
    const client = this.clients.get(language)
    if (client) {
      client.openFile(filePath, content)
    }
  }

  async updateFile(filePath: string, content: string, language: string): Promise<void> {
    const client = this.clients.get(language)
    if (client) {
      client.updateFile(filePath, content)
    }
  }

  async closeFile(filePath: string, language: string): Promise<void> {
    const client = this.clients.get(language)
    if (client) {
      client.closeFile(filePath)
    }
  }

  getDiagnostics(filePath: string): Diagnostic[] {
    return this.diagnostics.get(filePath) || []
  }

  isServerRunning(language: string): boolean {
    return this.clients.has(language)
  }

  private getServerConfig(language: string): { command: string; args: string[] } | null {
    const configs: Record<string, { command: string; args: string[] }> = {
      typescript: {
        command: 'typescript-language-server',
        args: ['--stdio'],
      },
      javascript: {
        command: 'typescript-language-server',
        args: ['--stdio'],
      },
    }
    return configs[language] || null
  }
}

class LSPClient {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests: Map<number, PendingRequest> = new Map()
  private buffer = ''
  private workspacePath: string
  private serverConfig: { command: string; args: string[] }
  private diagnosticsCallback: ((uri: string, diagnostics: Diagnostic[]) => void) | null = null
  private openFiles: Set<string> = new Set()

  constructor(workspacePath: string, serverConfig: { command: string; args: string[] }) {
    this.workspacePath = workspacePath
    this.serverConfig = serverConfig
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.serverConfig.command, this.serverConfig.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: this.workspacePath,
          shell: process.platform === 'win32',
        })

        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleData(data.toString())
        })

        this.process.stderr?.on('data', (data: Buffer) => {
          console.error(`[LSP] stderr: ${data.toString()}`)
        })

        this.process.on('exit', (code) => {
          console.log(`[LSP] Server exited with code ${code}`)
        })

        this.process.on('error', (err) => {
          console.error(`[LSP] Server error:`, err)
          reject(err)
        })

        this.sendRequest('initialize', {
          processId: process.pid,
          rootUri: `file://${this.workspacePath.replace(/\\/g, '/')}`,
          capabilities: {
            textDocument: {
              publishDiagnostics: {
                relatedInformation: true,
              },
              completion: {
                completionItem: {
                  snippetSupport: true,
                },
              },
            },
          },
        })
          .then(() => {
            this.sendNotification('initialized', {})
            resolve()
          })
          .catch(reject)
      } catch (err) {
        reject(err)
      }
    })
  }

  stop(): void {
    if (this.process) {
      this.sendRequest('shutdown', {})
        .then(() => {
          this.sendNotification('exit', {})
          this.process?.kill()
        })
        .catch(() => {
          this.process?.kill()
        })
      this.process = null
    }
  }

  openFile(filePath: string, content: string): void {
    const uri = this.pathToUri(filePath)
    if (this.openFiles.has(uri)) return

    this.openFiles.add(uri)
    this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: this.getLanguageId(filePath),
        version: 1,
        text: content,
      },
    })
  }

  updateFile(filePath: string, content: string): void {
    const uri = this.pathToUri(filePath)
    if (!this.openFiles.has(uri)) {
      this.openFile(filePath, content)
      return
    }

    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version: Date.now() },
      contentChanges: [{ text: content }],
    })
  }

  closeFile(filePath: string): void {
    const uri = this.pathToUri(filePath)
    if (!this.openFiles.has(uri)) return

    this.openFiles.delete(uri)
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    })
  }

  onDiagnostics(callback: (uri: string, diagnostics: Diagnostic[]) => void): void {
    this.diagnosticsCallback = callback
  }

  private handleData(data: string): void {
    this.buffer += data

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) break

      const header = this.buffer.substring(0, headerEnd)
      const contentLengthMatch = header.match(/Content-Length: (\d+)/)
      if (!contentLengthMatch) break

      const contentLength = parseInt(contentLengthMatch[1])
      const messageStart = headerEnd + 4

      if (this.buffer.length < messageStart + contentLength) break

      const messageBody = this.buffer.substring(messageStart, messageStart + contentLength)
      this.buffer = this.buffer.substring(messageStart + contentLength)

      try {
        const message: LSPMessage = JSON.parse(messageBody)
        this.handleMessage(message)
      } catch (err) {
        console.error('[LSP] Failed to parse message:', err)
      }
    }
  }

  private handleMessage(message: LSPMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      if (message.error) {
        pending.reject(message.error)
      } else {
        pending.resolve(message.result)
      }
    } else if (message.method) {
      this.handleNotification(message.method, message.params)
    }
  }

  private handleNotification(method: string, params: any): void {
    if (method === 'textDocument/publishDiagnostics' && this.diagnosticsCallback) {
      this.diagnosticsCallback(params.uri, params.diagnostics)
    }
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      })

      this.pendingRequests.set(id, { resolve, reject })

      const header = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n`
      this.process?.stdin?.write(header + message)

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30000)
    })
  }

  private sendNotification(method: string, params: any): void {
    const message = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    })

    const header = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n`
    this.process?.stdin?.write(header + message)
  }

  private pathToUri(filePath: string): string {
    return `file://${filePath.replace(/\\/g, '/')}`
  }

  private getLanguageId(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.json': 'json',
      '.md': 'markdown',
      '.css': 'css',
      '.html': 'html',
    }
    return map[ext] || 'plaintext'
  }
}
