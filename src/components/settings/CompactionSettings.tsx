import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { Layers, RefreshCw, Info, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

interface CompactionConfig {
  auto?: boolean
  prune?: boolean
  tail_turns?: number
  preserve_recent_tokens?: number
  reserved?: number
}

export function CompactionSettings() {
  const [config, setConfig] = useState<CompactionConfig>({
    auto: true,
    prune: false,
    tail_turns: 2,
  })
  const [loading, setLoading] = useState(false)
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const fullConfig = await invoke({ action: 'get_config' })
      if (fullConfig?.compaction) {
        setConfig(fullConfig.compaction)
      }
    } catch (error) {
      debug.error('Failed to load compaction config:', error)
      addToast('加载压缩配置失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (key: string, value: any) => {
    const updated = { ...config, [key]: value }
    setConfig(updated)
    try {
      await invoke({ action: 'set_config', key: `compaction.${key}`, value })
    } catch (error) {
      debug.error('Failed to update compaction config:', error)
      addToast('更新压缩配置失败', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">压缩设置</span>
        </div>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/50">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400/80">
            当对话上下文过长时，压缩功能会自动总结历史消息以节省 token。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">自动压缩</label>
            <p className="text-xs text-zinc-500">上下文满时自动压缩</p>
          </div>
          <button
            onClick={() => handleUpdate('auto', !config.auto)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.auto ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.auto ? <ToggleRight className="w-8 h-5" /> : <ToggleLeft className="w-8 h-5" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">修剪旧输出</label>
            <p className="text-xs text-zinc-500">压缩时修剪旧的工具输出</p>
          </div>
          <button
            onClick={() => handleUpdate('prune', !config.prune)}
            className={cn(
              'p-0.5 rounded transition-colors',
              config.prune ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {config.prune ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">
            保留最近轮数 ({config.tail_turns ?? 2})
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={config.tail_turns ?? 2}
            onChange={(e) => handleUpdate('tail_turns', parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-zinc-600 mt-1">压缩时保留最近 N 轮对话的完整内容</p>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">保留最近 Token 数</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={config.preserve_recent_tokens ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value)
              handleUpdate('preserve_recent_tokens', isNaN(n) ? undefined : n)
            }}
            placeholder="不限制"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">预留 Token 缓冲</label>
          <input
            type="number"
            min="0"
            step="1000"
            value={config.reserved ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value)
              handleUpdate('reserved', isNaN(n) ? undefined : n)
            }}
            placeholder="默认值"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
          <p className="text-[10px] text-zinc-600 mt-1">为压缩过程预留的 token 缓冲区</p>
        </div>
      </div>
    </div>
  )
}
