import { useMemo, useCallback, useState, useRef } from 'react'
import { useTabStore } from '@/stores/tabStore'
import { MessageSquare, Trash2, X, Search, Upload } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

interface HistoryPanelProps {
  onClose?: () => void
}

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab, updateMessages, renameTab } =
    useTabStore()
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((state) => state.addToast)

  const sortedTabs = useMemo(() => {
    const sorted = [...tabs].sort((a, b) => b.createdAt - a.createdAt)
    if (!searchQuery.trim()) return sorted
    const q = searchQuery.toLowerCase()
    return sorted.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q))
    )
  }, [tabs, searchQuery])

  const handleSelect = useCallback(
    (id: string) => {
      setActiveTab(id)
    },
    [setActiveTab]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (tabs.length <= 1) return
      closeTab(id)
    },
    [closeTab, tabs.length]
  )

  const parseMarkdown = useCallback((content: string) => {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    const sections = content.split(/^## /m).filter((s) => s.trim())

    for (const section of sections) {
      const lines = section.split('\n')
      const header = lines[0].trim()
      const body = lines
        .slice(1)
        .join('\n')
        .replace(/^---\s*$/m, '')
        .trim()

      if (header === 'User' && body) {
        messages.push({ role: 'user', content: body })
      } else if (header === 'Assistant' && body) {
        messages.push({ role: 'assistant', content: body })
      }
    }

    return messages
  }, [])

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const content = await file.text()
        const messages = parseMarkdown(content)
        if (messages.length === 0) return

        const newTabId = addTab()
        const title = file.name.replace(/\.md$/i, '') || '导入对话'
        renameTab(newTabId, title)

        const chatMessages = messages.map((msg, idx) => ({
          id: crypto.randomUUID(),
          role: msg.role,
          content: msg.content,
          status: 'done' as const,
          timestamp: Date.now() - (messages.length - idx) * 60000,
        }))

        updateMessages(newTabId, chatMessages)
        setActiveTab(newTabId)
      } catch (err) {
        debug.error('Import failed:', err)
        addToast('导入对话失败', 'error')
      }

      e.target.value = ''
    },
    [parseMarkdown, addTab, renameTab, updateMessages, setActiveTab]
  )

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200 dark:text-zinc-200 text-gray-800">
            对话历史
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown"
        onChange={handleImport}
        className="hidden"
      />

      <div className="px-3 py-2 border-b border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索对话..."
              className="flex-1 bg-transparent text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="导入对话"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {sortedTabs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">暂无对话</div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-colors group',
                  activeTabId === tab.id
                    ? 'bg-zinc-800 dark:bg-zinc-800 bg-gray-200'
                    : 'hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 dark:text-zinc-200 text-gray-800 truncate">
                      {tab.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">
                        {tab.messages.length} 条消息
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {formatTime(tab.createdAt, 'datetime')}
                      </span>
                    </div>
                  </div>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => handleDelete(e, tab.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all shrink-0"
                      aria-label={`删除 ${tab.title}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
