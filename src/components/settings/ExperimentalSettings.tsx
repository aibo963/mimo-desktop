import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Beaker,
  RefreshCw,
  Info,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExperimentalConfig {
  disable_paste_summary?: boolean
  batch_tool?: boolean
  openTelemetry?: boolean
  continue_loop_on_deny?: boolean
  mcp_timeout?: number
}

export function ExperimentalSettings() {
  const [config, setConfig] = useState<ExperimentalConfig>({})
  const [loading, setLoading] = useState(false)
  const { invoke } = useMimo()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const fullConfig = await invoke({ action: 'get_config' })
      if (fullConfig?.experimental) {
        setConfig(fullConfig.experimental)
      }
    } catch (error) {
      console.error('Failed to load experimental config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: string, value: boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    try {
      await invoke({ action: 'set_config', key: `experimental.${key}`, value })
    } catch (error) {
      console.error('Failed to update experimental config:', error)
    }
  }

  const handleUpdate = async (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    try {
      await invoke({ action: 'set_config', key: `experimental.${key}`, value })
    } catch (error) {
      console.error('Failed to update experimental config:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">实验性功能</span>
        </div>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="p-3 rounded-lg bg-yellow-950/20 border border-yellow-900/50">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-400/80">
            这些功能可能不稳定，使用风险自负。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">批量工具</label>
            <p className="text-xs text-zinc-500">启用批量工具调用</p>
          </div>
          <button
            onClick={() => handleToggle('batch_tool', !config.batch_tool)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.batch_tool ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.batch_tool ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">拒绝后继续循环</label>
            <p className="text-xs text-zinc-500">工具调用被拒绝后继续执行</p>
          </div>
          <button
            onClick={() => handleToggle('continue_loop_on_deny', !config.continue_loop_on_deny)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.continue_loop_on_deny ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.continue_loop_on_deny ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">禁用粘贴摘要</label>
            <p className="text-xs text-zinc-500">粘贴内容时不自动生成摘要</p>
          </div>
          <button
            onClick={() => handleToggle('disable_paste_summary', !config.disable_paste_summary)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.disable_paste_summary ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.disable_paste_summary ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">OpenTelemetry</label>
            <p className="text-xs text-zinc-500">启用遥测追踪</p>
          </div>
          <button
            onClick={() => handleToggle('openTelemetry', !config.openTelemetry)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.openTelemetry ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.openTelemetry ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">
            MCP 超时 (ms)
          </label>
          <input
            type="number"
            min="1000"
            step="1000"
            value={config.mcp_timeout ?? ''}
            onChange={(e) => handleUpdate('mcp_timeout', parseInt(e.target.value) || undefined)}
            placeholder="5000"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>
    </div>
  )
}
