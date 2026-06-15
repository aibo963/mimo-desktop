import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ConfigEditor() {
  const [config, setConfig] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { invoke } = useMimo()

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const raw = await invoke({ action: 'get_config_raw' })
      if (typeof raw === 'string') {
        setConfig(raw)
      } else {
        setConfig(JSON.stringify(raw, null, 2))
      }
    } catch (err: any) {
      setError(err.message || '加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      JSON.parse(config)
      await invoke({ action: 'set_config_raw', content: config })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('JSON 格式错误: ' + err.message)
      } else {
        setError(err.message || '保存配置失败')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(config)
      setConfig(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch (err: any) {
      setError('JSON 格式错误: ' + err.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">配置文件</label>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConfig}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            重新加载
          </button>
          <button
            onClick={handleFormat}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            格式化
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={config}
          onChange={(e) => {
            setConfig(e.target.value)
            setError(null)
          }}
          className="w-full h-[400px] p-4 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-sm text-zinc-300 resize-none focus:outline-none focus:border-emerald-500 transition-colors"
          spellCheck={false}
          placeholder="加载中..."
          disabled={loading}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-400">配置已保存</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        配置文件位置: ~/.config/mimocode/mimocode.jsonc
      </p>
    </div>
  )
}
