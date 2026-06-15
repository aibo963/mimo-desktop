import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Server,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Globe,
  Terminal,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface McpServer {
  name: string
  type: 'local' | 'remote'
  url?: string
  command?: string[]
  enabled: boolean
}

export function McpSettings() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const { invoke } = useMimo()

  useEffect(() => {
    loadMcpConfig()
  }, [])

  const loadMcpConfig = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.mcp) {
        const serverList: McpServer[] = Object.entries(config.mcp).map(([name, cfg]: [string, any]) => ({
          name,
          type: cfg.type || 'local',
          url: cfg.url,
          command: cfg.command,
          enabled: cfg.enabled !== false,
        }))
        setServers(serverList)
      }
    } catch (error) {
      console.error('Failed to load MCP config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await invoke({ action: 'set_config', key: `mcp.${name}.enabled`, value: enabled })
      setServers(prev => prev.map(s => s.name === name ? { ...s, enabled } : s))
    } catch (error) {
      console.error('Failed to toggle MCP server:', error)
    }
  }

  const handleDelete = async (name: string) => {
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.mcp?.[name]) {
        delete config.mcp[name]
        await invoke({ action: 'set_config', key: 'mcp', value: config.mcp })
        setServers(prev => prev.filter(s => s.name !== name))
      }
    } catch (error) {
      console.error('Failed to delete MCP server:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">MCP 服务器</span>
        </div>
        <button
          onClick={loadMcpConfig}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Model Context Protocol 服务器配置
      </p>

      {loading && servers.length === 0 ? (
        <div className="text-center text-zinc-600 text-xs py-4">加载中...</div>
      ) : servers.length === 0 ? (
        <div className="text-center text-zinc-600 text-xs py-8 border border-dashed border-zinc-800 rounded-lg">
          <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无 MCP 服务器</p>
          <p className="mt-1">在配置文件中添加 mcp 配置</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map(server => (
            <div
              key={server.name}
              className="border border-zinc-800 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer"
                onClick={() => setExpanded(expanded === server.name ? null : server.name)}
              >
                {expanded === server.name ? (
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                )}
                {server.type === 'remote' ? (
                  <Globe className="w-4 h-4 text-blue-400" />
                ) : (
                  <Terminal className="w-4 h-4 text-emerald-400" />
                )}
                <span className="flex-1 text-sm text-zinc-300 truncate">
                  {server.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggle(server.name, !server.enabled)
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs transition-colors',
                    server.enabled
                      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  )}
                >
                  {server.enabled ? '已启用' : '已禁用'}
                </button>
              </div>

              {expanded === server.name && (
                <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900/50">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-zinc-500">类型:</span>
                      <span className="ml-2 text-zinc-300">{server.type}</span>
                    </div>
                    {server.url && (
                      <div>
                        <span className="text-zinc-500">URL:</span>
                        <span className="ml-2 text-zinc-300 font-mono break-all">{server.url}</span>
                      </div>
                    )}
                    {server.command && (
                      <div>
                        <span className="text-zinc-500">命令:</span>
                        <span className="ml-2 text-zinc-300 font-mono">
                          {server.command.join(' ')}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleDelete(server.name)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <p className="text-[10px] text-zinc-600">
          在配置文件的 mcp 字段中添加服务器配置
        </p>
      </div>
    </div>
  )
}
