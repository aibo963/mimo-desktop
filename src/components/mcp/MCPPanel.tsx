import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Play, Square, Wrench, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

interface MCPServer {
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

interface MCPTool {
  name: string
  description: string
  inputSchema?: any
  serverId: string
}

interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  serverId: string
}

interface MCPPanelProps {
  onClose?: () => void
}

export function MCPPanel({ onClose }: MCPPanelProps) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServer, setNewServer] = useState({ name: '', command: '', args: '' })
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [testingTool, setTestingTool] = useState<string | null>(null)
  const [toolResult, setToolResult] = useState<any>(null)
  const addToast = useToastStore((state) => state.addToast)

  const loadServers = useCallback(async () => {
    try {
      const result = await window.mimoAPI.invoke({ action: 'mcp_list_servers' })
      setServers(Array.isArray(result) ? result : [])
    } catch (err) {
      debug.error('Failed to load MCP servers:', err)
    }
  }, [])

  const loadTools = useCallback(async () => {
    try {
      await window.mimoAPI.invoke({ action: 'mcp_list_tools' })
    } catch (err) {
      debug.error('Failed to load MCP tools:', err)
    }
  }, [])

  const loadResources = useCallback(async () => {
    try {
      await window.mimoAPI.invoke({ action: 'mcp_list_resources' })
    } catch (err) {
      debug.error('Failed to load MCP resources:', err)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadServers(), loadTools(), loadResources()])
      setLoading(false)
    }
    load()
  }, [loadServers, loadTools, loadResources])

  const handleAddServer = useCallback(async () => {
    if (!newServer.name || !newServer.command) return

    try {
      const id = `mcp-${Date.now()}`
      await window.mimoAPI.invoke({
        action: 'mcp_add_server',
        id,
        name: newServer.name,
        command: newServer.command,
        args: newServer.args ? newServer.args.split(' ').filter(Boolean) : [],
      })
      setNewServer({ name: '', command: '', args: '' })
      setShowAddForm(false)
      await loadServers()
      addToast('MCP 服务器已添加', 'success')
    } catch (err: any) {
      debug.error('Failed to add MCP server:', err)
      addToast(`添加 MCP 服务器失败: ${err.message}`, 'error')
    }
  }, [newServer, loadServers, addToast])

  const handleRemoveServer = useCallback(
    async (id: string) => {
      try {
        await window.mimoAPI.invoke({ action: 'mcp_remove_server', serverId: id })
        await loadServers()
        await loadTools()
        await loadResources()
        addToast('MCP 服务器已删除', 'success')
      } catch (err: any) {
        debug.error('Failed to remove MCP server:', err)
        addToast(`删除 MCP 服务器失败: ${err.message}`, 'error')
      }
    },
    [loadServers, loadTools, loadResources, addToast]
  )

  const handleStartServer = useCallback(
    async (id: string) => {
      try {
        await window.mimoAPI.invoke({ action: 'mcp_start_server', serverId: id })
        await loadServers()
        await loadTools()
        await loadResources()
        addToast('MCP 服务器已启动', 'success')
      } catch (err: any) {
        debug.error('Failed to start MCP server:', err)
        addToast(`启动 MCP 服务器失败: ${err.message}`, 'error')
      }
    },
    [loadServers, loadTools, loadResources, addToast]
  )

  const handleStopServer = useCallback(
    async (id: string) => {
      try {
        await window.mimoAPI.invoke({ action: 'mcp_stop_server', serverId: id })
        await loadServers()
        await loadTools()
        await loadResources()
        addToast('MCP 服务器已停止', 'success')
      } catch (err: any) {
        debug.error('Failed to stop MCP server:', err)
        addToast(`停止 MCP 服务器失败: ${err.message}`, 'error')
      }
    },
    [loadServers, loadTools, loadResources, addToast]
  )

  const handleTestTool = useCallback(async (serverId: string, toolName: string) => {
    setTestingTool(toolName)
    setToolResult(null)
    try {
      const result = await window.mimoAPI.invoke({
        action: 'mcp_call_tool',
        serverId,
        toolName,
        args: {},
      })
      setToolResult(result)
    } catch (err: any) {
      setToolResult({ error: err.message })
    } finally {
      setTestingTool(null)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Check className="w-4 h-4 text-emerald-400" />
      case 'starting':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Square className="w-4 h-4 text-zinc-500" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200 dark:text-zinc-200 text-gray-800">
            MCP 管理
          </span>
          <span className="text-[10px] text-zinc-500">({servers.length} 服务器)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="添加服务器"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
          <div className="space-y-3">
            <input
              type="text"
              value={newServer.name}
              onChange={(e) => setNewServer((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="服务器名称"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={newServer.command}
              onChange={(e) => setNewServer((prev) => ({ ...prev, command: e.target.value }))}
              placeholder="命令 (如: npx @modelcontextprotocol/server-filesystem)"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={newServer.args}
              onChange={(e) => setNewServer((prev) => ({ ...prev, args: e.target.value }))}
              placeholder="参数 (空格分隔)"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddServer}
                disabled={!newServer.name || !newServer.command}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                添加
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-zinc-500 text-sm">加载中...</div>
        ) : servers.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p>暂无 MCP 服务器</p>
            <p className="text-xs mt-1">点击 + 添加服务器</p>
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              className={cn(
                'border rounded-lg overflow-hidden',
                selectedServer === server.id
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-zinc-800 bg-zinc-800/50'
              )}
            >
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setSelectedServer(selectedServer === server.id ? null : server.id)}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(server.status)}
                  <div>
                    <div className="font-medium text-sm text-white">{server.name}</div>
                    <div className="text-[10px] text-zinc-500">{server.command}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {server.tools.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 rounded">
                      {server.tools.length} 工具
                    </span>
                  )}
                  {server.resources.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                      {server.resources.length} 资源
                    </span>
                  )}
                  {server.status === 'running' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStopServer(server.id)
                      }}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                      title="停止"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartServer(server.id)
                      }}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-emerald-400 transition-colors"
                      title="启动"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveServer(server.id)
                    }}
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {selectedServer === server.id && (
                <div className="border-t border-zinc-800 p-3 space-y-3">
                  {server.error && (
                    <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                      {server.error}
                    </div>
                  )}

                  {server.tools.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-2">工具</div>
                      <div className="space-y-1">
                        {server.tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="flex items-center justify-between p-2 bg-zinc-900 rounded text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-white">{tool.name}</div>
                              <div className="text-zinc-500 truncate">{tool.description}</div>
                            </div>
                            <button
                              onClick={() => handleTestTool(server.id, tool.name)}
                              disabled={testingTool === tool.name}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors disabled:opacity-50"
                            >
                              {testingTool === tool.name ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                '测试'
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {server.resources.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-zinc-400 mb-2">资源</div>
                      <div className="space-y-1">
                        {server.resources.map((resource) => (
                          <div key={resource.uri} className="p-2 bg-zinc-900 rounded text-xs">
                            <div className="font-medium text-white">{resource.name}</div>
                            <div className="text-zinc-500 truncate">{resource.uri}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {toolResult && (
          <div className="border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">工具测试结果</span>
              <button
                onClick={() => setToolResult(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="text-xs text-zinc-300 bg-zinc-900 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(toolResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
