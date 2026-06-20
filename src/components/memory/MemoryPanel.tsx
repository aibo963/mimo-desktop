import { useState, useEffect, useCallback } from 'react'
import { Brain, Search, Plus, Trash2, X, Tag } from 'lucide-react'
import { useMemory, MemoryEntry } from '@/hooks/useMemory'
import { useConfirm } from '@/hooks/useConfirm'
import { cn, formatTime } from '@/lib/utils'

interface MemoryPanelProps {
  onClose?: () => void
}

const CATEGORY_LABELS: Record<MemoryEntry['category'], string> = {
  fact: '事实',
  preference: '偏好',
  skill: '技能',
  context: '上下文',
}

const CATEGORY_COLORS: Record<MemoryEntry['category'], string> = {
  fact: 'bg-blue-900/30 text-blue-400',
  preference: 'bg-purple-900/30 text-purple-400',
  skill: 'bg-emerald-900/30 text-emerald-400',
  context: 'bg-amber-900/30 text-amber-400',
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const { entries, isLoading, loadAll, search, add, remove, clear } = useMemory()
  const { confirm } = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<MemoryEntry['category']>('context')
  const [newTags, setNewTags] = useState('')
  const [filteredEntries, setFilteredEntries] = useState<MemoryEntry[]>([])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries)
    } else {
      search(searchQuery).then(setFilteredEntries)
    }
  }, [searchQuery, entries, search])

  const handleAdd = useCallback(async () => {
    if (!newContent.trim()) return
    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await add(newContent.trim(), newCategory, tags)
    setNewContent('')
    setNewTags('')
    setShowAdd(false)
  }, [newContent, newCategory, newTags, add])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd]
  )

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200 dark:text-zinc-200 text-gray-800">
            记忆
          </span>
          <span className="text-[10px] text-zinc-500">{entries.length} 条</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="添加记忆"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50">
        <div className="flex items-center gap-2 bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索记忆..."
            className="flex-1 bg-transparent text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {showAdd && (
        <div className="px-3 py-2 border-b border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50 space-y-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入记忆内容..."
            className="w-full min-h-[60px] bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded-lg px-3 py-2 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as MemoryEntry['category'])}
              className="bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-2 py-1 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 focus:outline-none"
            >
              <option value="fact">事实</option>
              <option value="preference">偏好</option>
              <option value="skill">技能</option>
              <option value="context">上下文</option>
            </select>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="标签 (逗号分隔)"
              className="flex-1 bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-2 py-1 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">加载中...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {searchQuery ? '未找到匹配的记忆' : '暂无记忆，对话中说"帮我记住"可自动保存'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="group p-2.5 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 line-clamp-3">
                      {entry.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          CATEGORY_COLORS[entry.category]
                        )}
                      >
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                      {entry.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-zinc-600" />
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] text-zinc-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-600 ml-auto">
                        {formatTime(entry.createdAt, 'date')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('确定删除这条记忆？')) {
                        remove(entry.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all shrink-0"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="px-3 py-2 border-t border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50">
          <button
            onClick={() => {
              if (confirm('确定清空所有记忆？')) {
                clear()
              }
            }}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            清空所有记忆
          </button>
        </div>
      )}
    </div>
  )
}
