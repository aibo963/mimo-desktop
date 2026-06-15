import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModelSelectorInlineProps {
  onModelChange?: (model: string) => void
}

export function ModelSelectorInline({ onModelChange }: ModelSelectorInlineProps) {
  const [models, setModels] = useState<string[]>([])
  const [currentModel, setCurrentModel] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { invoke } = useMimo()

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const result = await invoke({ action: 'get_models' })
      if (Array.isArray(result)) {
        setModels(result.map(m => m.trim()))
      }
      const config = await invoke({ action: 'get_config' })
      if (config?.model) {
        setCurrentModel(config.model.trim())
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const handleSelect = async (model: string) => {
    setCurrentModel(model)
    setIsOpen(false)
    try {
      await invoke({ action: 'set_config', key: 'model', value: model })
      onModelChange?.(model)
    } catch (error) {
      console.error('Failed to save model:', error)
    }
  }

  const displayName = currentModel ? currentModel.split('/').pop() : '选择模型'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <span className="truncate max-w-[120px]">{displayName}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg max-h-[300px] overflow-auto">
            {models.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-500">无可用模型</div>
            ) : (
              models.map(model => (
                <button
                  key={model}
                  onClick={() => handleSelect(model)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-700 transition-colors',
                    model === currentModel ? 'text-emerald-400' : 'text-zinc-300'
                  )}
                >
                  <span className="truncate">{model}</span>
                  {model === currentModel && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
