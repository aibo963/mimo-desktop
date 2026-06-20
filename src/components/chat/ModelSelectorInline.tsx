import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

interface ModelSelectorInlineProps {
  onModelChange?: (model: string) => void
}

export function ModelSelectorInline({ onModelChange }: ModelSelectorInlineProps) {
  const [models, setModels] = useState<string[]>([])
  const [currentModel, setCurrentModel] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadModels = useCallback(async () => {
    try {
      const result = await invoke({ action: 'get_models' })
      if (Array.isArray(result)) {
        setModels(result.map((m) => m.trim()))
      }
      const config = await invoke({ action: 'get_config' })
      if (config?.model) {
        setCurrentModel(config.model.trim())
      }
      setLoadError(null)
    } catch (error: any) {
      debug.error('Failed to load models:', error)
      setLoadError(error.message || '加载模型失败')
    }
  }, [invoke])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models
    const q = searchQuery.toLowerCase()
    return models.filter((m) => m.toLowerCase().includes(q))
  }, [models, searchQuery])

  const handleSelect = useCallback(
    async (model: string) => {
      const prevModel = currentModel
      setCurrentModel(model)
      setIsOpen(false)
      setSearchQuery('')
      try {
        await invoke({ action: 'set_config', key: 'model', value: model })
        onModelChange?.(model)
      } catch (error: any) {
        debug.error('Failed to save model:', error)
        addToast('保存模型选择失败', 'error')
        setCurrentModel(prevModel)
      }
    },
    [currentModel, invoke, onModelChange]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }
  }, [])

  const displayName = currentModel ? currentModel.split('/').pop() : '选择模型'

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-400 dark:text-zinc-400 text-gray-500 hover:text-zinc-300 dark:hover:text-zinc-300 hover:text-gray-700 hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="选择 AI 模型"
      >
        <span className="truncate max-w-[120px]">{loadError ? '加载失败' : displayName}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg bg-zinc-800 dark:bg-zinc-800 bg-white border border-zinc-700 dark:border-zinc-700 border-gray-200 shadow-lg max-h-[350px] flex flex-col"
          role="listbox"
        >
          {models.length > 3 && (
            <div className="px-2 py-1.5 border-b border-zinc-700 dark:border-zinc-700 border-gray-200">
              <div className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-900 bg-gray-50 rounded px-2 py-1">
                <Search className="w-3 h-3 text-zinc-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索模型..."
                  className="flex-1 bg-transparent text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          <div className="overflow-auto flex-1">
            {filteredModels.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-500">
                {loadError || (searchQuery ? '无匹配模型' : '无可用模型')}
              </div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model}
                  onClick={() => handleSelect(model)}
                  role="option"
                  aria-selected={model === currentModel}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-700 dark:hover:bg-zinc-700 hover:bg-gray-100 transition-colors',
                    model === currentModel
                      ? 'text-emerald-400 dark:text-emerald-400 text-emerald-600'
                      : 'text-zinc-300 dark:text-zinc-300 text-gray-700'
                  )}
                >
                  <span className="truncate">{model}</span>
                  {model === currentModel && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
