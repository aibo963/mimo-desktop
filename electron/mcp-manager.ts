import { ChildProcess, spawn } from 'child_process'
import { EventEmitter } from 'events'
import { debug } from './debug'

export interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  status: 'stopped' | 'starting' | 'running' | 'error'
  error?: string
  tools: MCPTool[]
  resources: MCPResource[]
}

export interface MCPTool {
  name: string
  description: string
  inputSchema?: any
  serverId: string
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  serverId: string
}

export interface MCPRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: number
  result?: any
  error?: { code: number; message: string; data?: any }
}

export class MCPManager extends EventEmitter {
  private servers: Map<string, MCPServer> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private messageId: number = 0
  private pendingRequests: Map<
    number,
    { resolve: (result: any) => void; reject: (error: Error) => void }
  > = new Map()

  constructor() {
    super()
  }

  async addServer(config: {
    id: string
    name: string
    command: string
    args?: string[]
    env?: Record<string, string>
  }): Promise<MCPServer> {
    const server: MCPServer = {
      id: config.id,
      name: config.name,
      command: config.command,
      args: config.args || [],
      env: config.env,
      status: 'stopped',
      tools: [],
      resources: [],
    }
    this.servers.set(server.id, server)
    this.emit('server-added', server)
    return server
  }

  removeServer(id: string): boolean {
    const server = this.servers.get(id)
    if (!server) return false

    this.stopServer(id)
    this.servers.delete(id)
    this.emit('server-removed', id)
    return true
  }

  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id)
  }

  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values())
  }

  async startServer(id: string): Promise<boolean> {
    const server = this.servers.get(id)
    if (!server) return false

    if (server.status === 'running') return true

    server.status = 'starting'
    server.error = undefined
    this.emit('server-status', { id, status: 'starting' })

    try {
      const child = spawn(server.command, server.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...server.env },
      })

      this.processes.set(id, child)

      child.stdout?.on('data', (data: Buffer) => {
        this.handleMessage(id, data.toString())
      })

      child.stderr?.on('data', (data: Buffer) => {
        debug.error(`[MCP] Server ${server.name} stderr:`, data.toString())
      })

      child.on('error', (error: Error) => {
        server.status = 'error'
        server.error = error.message
        this.emit('server-status', { id, status: 'error', error: error.message })
      })

      child.on('exit', (code) => {
        server.status = 'stopped'
        this.processes.delete(id)
        this.emit('server-status', { id, status: 'stopped', code })
      })

      await this.initializeServer(id)
      server.status = 'running'
      this.emit('server-status', { id, status: 'running' })
      return true
    } catch (error: any) {
      server.status = 'error'
      server.error = error.message
      this.emit('server-status', { id, status: 'error', error: error.message })
      return false
    }
  }

  async stopServer(id: string): Promise<boolean> {
    const process = this.processes.get(id)
    if (!process) return true

    return new Promise((resolve) => {
      process.on('exit', () => resolve(true))
      process.kill()
      setTimeout(() => {
        process.kill('SIGKILL')
        resolve(true)
      }, 5000)
    })
  }

  private async initializeServer(id: string): Promise<void> {
    const initResult = await this.sendRequest(id, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
      },
      clientInfo: {
        name: 'mimo-desktop',
        version: '0.1.0',
      },
    })

    await this.sendRequest(id, 'notifications/initialized', {})

    const toolsResult = await this.sendRequest(id, 'tools/list', {})
    const server = this.servers.get(id)
    if (server && toolsResult?.tools) {
      server.tools = toolsResult.tools.map((t: any) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema,
        serverId: id,
      }))
    }

    const resourcesResult = await this.sendRequest(id, 'resources/list', {})
    if (server && resourcesResult?.resources) {
      server.resources = resourcesResult.resources.map((r: any) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
        serverId: id,
      }))
    }
  }

  private async sendRequest(serverId: string, method: string, params?: any): Promise<any> {
    const process = this.processes.get(serverId)
    if (!process || !process.stdin) {
      throw new Error(`Server ${serverId} not running`)
    }

    const id = ++this.messageId
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout: ${method}`))
      }, 30000)

      const originalResolve = this.pendingRequests.get(id)?.resolve
      const originalReject = this.pendingRequests.get(id)?.reject

      if (originalResolve && originalReject) {
        this.pendingRequests.set(id, {
          resolve: (result) => {
            clearTimeout(timeout)
            originalResolve(result)
          },
          reject: (error) => {
            clearTimeout(timeout)
            originalReject(error)
          },
        })
      }

      const stdin = process.stdin
      if (stdin && !stdin.destroyed) {
        stdin.write(JSON.stringify(request) + '\n')
      }
    })
  }

  private handleMessage(serverId: string, data: string): void {
    const lines = data.split('\n').filter((l) => l.trim())

    for (const line of lines) {
      try {
        const message = JSON.parse(line)

        if (message.id && this.pendingRequests.has(message.id)) {
          const pending = this.pendingRequests.get(message.id)!
          this.pendingRequests.delete(message.id)

          if (message.error) {
            pending.reject(new Error(message.error.message))
          } else {
            pending.resolve(message.result)
          }
        } else if (message.method) {
          this.emit('server-message', { serverId, message })
        }
      } catch (e) {
        debug.error(`[MCP] Failed to parse message from ${serverId}:`, e)
      }
    }
  }

  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const server = this.servers.get(serverId)
    if (!server || server.status !== 'running') {
      throw new Error(`Server ${serverId} not running`)
    }

    const result = await this.sendRequest(serverId, 'tools/call', {
      name: toolName,
      arguments: args,
    })

    return result
  }

  async readResource(uri: string): Promise<any> {
    for (const server of this.servers.values()) {
      if (server.status === 'running') {
        try {
          const result = await this.sendRequest(server.id, 'resources/read', { uri })
          return result
        } catch (e) {
          continue
        }
      }
    }
    throw new Error(`No server can read resource: ${uri}`)
  }

  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = []
    for (const server of this.servers.values()) {
      if (server.status === 'running') {
        tools.push(...server.tools)
      }
    }
    return tools
  }

  getAllResources(): MCPResource[] {
    const resources: MCPResource[] = []
    for (const server of this.servers.values()) {
      if (server.status === 'running') {
        resources.push(...server.resources)
      }
    }
    return resources
  }

  async destroy(): Promise<void> {
    for (const [id] of this.processes) {
      await this.stopServer(id)
    }
    this.servers.clear()
    this.processes.clear()
    this.pendingRequests.clear()
  }
}
