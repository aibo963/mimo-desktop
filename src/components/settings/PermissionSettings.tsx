import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Shield,
  RefreshCw,
  Terminal,
  FileText,
  Search,
  Globe,
  Cpu,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PermissionAction = 'ask' | 'allow' | 'deny'

interface ToolPermission {
  name: string
  icon: any
  label: string
  action: PermissionAction
}

const defaultTools: ToolPermission[] = [
  { name: 'bash', icon: Terminal, label: '终端命令', action: 'ask' },
  { name: 'read', icon: FileText, label: '读取文件', action: 'allow' },
  { name: 'write', icon: FileText, label: '写入文件', action: 'ask' },
  { name: 'edit', icon: FileText, label: '编辑文件', action: 'ask' },
  { name: 'glob', icon: Search, label: '搜索文件', action: 'allow' },
  { name: 'grep', icon: Search, label: '搜索内容', action: 'allow' },
  { name: 'webfetch', icon: Globe, label: '获取网页', action: 'ask' },
  { name: 'websearch', icon: Globe, label: '网络搜索', action: 'ask' },
]

const actionColors: Record<PermissionAction, { bg: string; text: string; label: string }> = {
  ask: { bg: 'bg-yellow-950/50 border-yellow-800', text: 'text-yellow-400', label: '询问' },
  allow: { bg: 'bg-emerald-950/50 border-emerald-800', text: 'text-emerald-400', label: '允许' },
  deny: { bg: 'bg-red-950/50 border-red-800', text: 'text-red-400', label: '拒绝' },
}

export function PermissionSettings() {
  const [tools, setTools] = useState<ToolPermission[]>(defaultTools)
  const [loading, setLoading] = useState(false)
  const [globalAction, setGlobalAction] = useState<PermissionAction>('ask')
  const { invoke } = useMimo()

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.permission) {
        if (typeof config.permission === 'string') {
          setGlobalAction(config.permission as PermissionAction)
        } else if (typeof config.permission === 'object') {
          setTools(prev => prev.map(t => ({
            ...t,
            action: config.permission[t.name] || t.action,
          })))
        }
      }
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (name: string, action: PermissionAction) => {
    try {
      await invoke({ action: 'set_config', key: `permission.${name}`, value: action })
      setTools(prev => prev.map(t => t.name === name ? { ...t, action } : t))
    } catch (error) {
      console.error('Failed to update permission:', error)
    }
  }

  const handleGlobalAction = async (action: PermissionAction) => {
    try {
      await invoke({ action: 'set_config', key: 'permission', value: action })
      setGlobalAction(action)
      setTools(prev => prev.map(t => ({ ...t, action })))
    } catch (error) {
      console.error('Failed to update global permission:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">权限设置</span>
        </div>
        <button
          onClick={loadPermissions}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="p-3 rounded-lg bg-yellow-950/20 border border-yellow-900/50">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-400/80">
            权限设置控制 MimoCode 执行工具时的行为。修改后需要重启生效。
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-2">全局默认权限</label>
        <div className="flex gap-1">
          {(['ask', 'allow', 'deny'] as PermissionAction[]).map(action => {
            const config = actionColors[action]
            return (
              <button
                key={action}
                onClick={() => handleGlobalAction(action)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs border transition-colors',
                  globalAction === action
                    ? `${config.bg} ${config.text}`
                    : 'border-zinc-800 text-zinc-500 hover:bg-zinc-800/50'
                )}
              >
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-500">单工具权限</label>
        {tools.map(tool => {
          const config = actionColors[tool.action]
          return (
            <div
              key={tool.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800"
            >
              <tool.icon className="w-4 h-4 text-zinc-400" />
              <span className="flex-1 text-sm text-zinc-300">{tool.label}</span>
              <div className="flex gap-0.5">
                {(['ask', 'allow', 'deny'] as PermissionAction[]).map(action => {
                  const ac = actionColors[action]
                  return (
                    <button
                      key={action}
                      onClick={() => handleToggle(tool.name, action)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] transition-colors',
                        tool.action === action
                          ? `${ac.bg} ${ac.text}`
                          : 'text-zinc-600 hover:text-zinc-400'
                      )}
                    >
                      {ac.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
