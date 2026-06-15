import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { ChevronDown, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModelSelector() {
  const [models, setModels] = useState<string[]>([])
  const [currentModel, setCurrentModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { invoke } = useMimo()

  useEffect(() => {
    loadModels()
    loadCurrentModel()
  }, [])

  const loadModels = async () => {
    setLoading(true)
    try {
      const result = await invoke({ action: 'get_models' })
      if (Array.isArray(result)) {
        setModels(result.map(m => m.trim()))
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentModel = async () => {
    try {
      const config = await invoke({ action: 'get_config' })
      if (config && typeof config === 'object') {
        setCurrentModel((config.model || config.defaultModel || '').trim())
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const handleSelect = async (model: string) => {
    setCurrentModel(model)
    setIsOpen(false)
    try {
      await invoke({ action: 'set_config', key: 'model', value: model })
    } catch (error) {
      console.error('Failed to save model:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">默认模型</label>
        <button
          onClick={loadModels}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          title="刷新模型列表"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors text-left"
        >
          <span className={cn('text-sm', currentModel ? 'text-white' : 'text-zinc-400')}>
            {currentModel || '选择模型...'}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg max-h-[300px] overflow-auto">
            {models.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">
                {loading ? '加载中...' : '无可用模型'}
              </div>
            ) : (
              models.map(model => (
                <button
                  key={model}
                  onClick={() => handleSelect(model)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-700 transition-colors',
                    model === currentModel ? 'text-emerald-400' : 'text-zinc-300'
                  )}
                >
                  <span className="truncate">{model}</span>
                  {model === currentModel && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        选择要使用的 AI 模型。更改将在下次对话时生效。
      </p>
    </div>
  )
}
