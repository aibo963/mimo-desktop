import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Settings,
  RefreshCw,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GeneralConfig {
  shell?: string
  logLevel?: string
  username?: string
  share?: string
  autoupdate?: boolean | string
  snapshot?: boolean
  small_model?: string
  default_agent?: string
}

export function GeneralSettings() {
  const [config, setConfig] = useState<GeneralConfig>({})
  const [loading, setLoading] = useState(false)
  const { invoke } = useMimo()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const fullConfig = await invoke({ action: 'get_config' })
      if (fullConfig) {
        setConfig({
          shell: fullConfig.shell,
          logLevel: fullConfig.logLevel,
          username: fullConfig.username,
          share: fullConfig.share,
          autoupdate: fullConfig.autoupdate,
          snapshot: fullConfig.snapshot,
          small_model: fullConfig.small_model,
          default_agent: fullConfig.default_agent,
        })
      }
    } catch (error) {
      console.error('Failed to load general config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    try {
      await invoke({ action: 'set_config', key, value })
    } catch (error) {
      console.error('Failed to update config:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">通用设置</span>
        </div>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">用户名</label>
          <input
            type="text"
            value={config.username ?? ''}
            onChange={(e) => handleUpdate('username', e.target.value || undefined)}
            placeholder="系统用户名"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">默认 Shell</label>
          <input
            type="text"
            value={config.shell ?? ''}
            onChange={(e) => handleUpdate('shell', e.target.value || undefined)}
            placeholder="系统默认"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">小模型</label>
          <input
            type="text"
            value={config.small_model ?? ''}
            onChange={(e) => handleUpdate('small_model', e.target.value || undefined)}
            placeholder="用于标题生成等轻量任务"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">默认 Agent</label>
          <select
            value={config.default_agent ?? ''}
            onChange={(e) => handleUpdate('default_agent', e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">build (默认)</option>
            <option value="build">build</option>
            <option value="plan">plan</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">日志级别</label>
          <select
            value={config.logLevel ?? ''}
            onChange={(e) => handleUpdate('logLevel', e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">默认</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">分享模式</label>
          <select
            value={config.share ?? ''}
            onChange={(e) => handleUpdate('share', e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">默认 (manual)</option>
            <option value="manual">手动</option>
            <option value="auto">自动</option>
            <option value="disabled">禁用</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">自动更新</label>
            <p className="text-xs text-zinc-500">自动检查并更新版本</p>
          </div>
          <button
            onClick={() => handleUpdate('autoupdate', config.autoupdate === false ? true : false)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.autoupdate !== false ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.autoupdate !== false ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">快照追踪</label>
            <p className="text-xs text-zinc-500">记录文件系统快照用于撤销</p>
          </div>
          <button
            onClick={() => handleUpdate('snapshot', config.snapshot === false ? true : false)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.snapshot !== false ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.snapshot !== false ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
