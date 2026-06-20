import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { useTemplateStore } from '@/stores/templateStore'
import { cn } from '@/lib/utils'

interface TemplateMenuProps {
  onSelect: (content: string) => void
  onClose: () => void
  visible: boolean
}

export function TemplateMenu({ onSelect, onClose, visible }: TemplateMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { templates } = useTemplateStore()

  const filtered = templates.filter(
    (t) => t.name.includes(query) || t.content.toLowerCase().includes(query.toLowerCase())
  )

  const categories = Array.from(new Set(filtered.map((t) => t.category)))

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!visible) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1))
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        onSelect(filtered[selectedIndex].content)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [visible, filtered, selectedIndex, onSelect, onClose]
  )

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleManageTemplates = () => {
    window.dispatchEvent(new CustomEvent('open-settings', { detail: 'templates' }))
    onClose()
  }

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-80 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg overflow-hidden z-50"
      role="menu"
    >
      <div className="p-2 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="搜索模板..."
            className="flex-1 bg-transparent text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="max-h-64 overflow-auto">
        {categories.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">暂无模板</div>
        ) : (
          categories.map((category) => {
            const categoryTemplates = filtered.filter((t) => t.category === category)
            const isExpanded = expandedCategories.has(category)
            let flatIndex = 0
            for (const cat of categories) {
              if (cat === category) break
              flatIndex += filtered.filter((t) => t.category === cat).length
            }

            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700/50"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {category}
                  <span className="text-zinc-600">({categoryTemplates.length})</span>
                </button>
                {isExpanded &&
                  categoryTemplates.map((template, i) => {
                    const idx = flatIndex + i
                    return (
                      <button
                        key={template.id}
                        onClick={() => onSelect(template.content)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        role="menuitem"
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                          idx === selectedIndex
                            ? 'bg-zinc-700 text-zinc-100'
                            : 'text-zinc-400 hover:bg-zinc-700/50'
                        )}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-zinc-500 truncate">
                            {template.content.slice(0, 50)}...
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-zinc-700">
        <button
          onClick={handleManageTemplates}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-700/50 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          管理模板
        </button>
      </div>
    </div>
  )
}
