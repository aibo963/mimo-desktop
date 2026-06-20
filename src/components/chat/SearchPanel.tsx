import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Search, X, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react'
import { useTabStore } from '@/stores/tabStore'
import { cn } from '@/lib/utils'

interface SearchResult {
  tabId: string
  tabTitle: string
  messageId: string
  role: 'user' | 'assistant'
  content: string
  snippet: string
  matchStart: number
  matchEnd: number
  timestamp: number
}

interface SearchPanelProps {
  onClose: () => void
  onJumpToMessage: (tabId: string, messageId: string) => void
}

function highlightMatch(
  text: string,
  start: number,
  end: number
): { before: string; match: string; after: string } {
  return {
    before: text.slice(Math.max(0, start - 40), start),
    match: text.slice(start, end),
    after: text.slice(end, Math.min(text.length, end + 60)),
  }
}

const PAGE_SIZE = 20

export function SearchPanel({ onClose, onJumpToMessage }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [page, setPage] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const tabs = useTabStore((s) => s.tabs)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const matches: SearchResult[] = []

    for (const tab of tabs) {
      for (const msg of tab.messages) {
        const content = msg.content.toLowerCase()
        let searchStart = 0
        while (searchStart < content.length) {
          const idx = content.indexOf(q, searchStart)
          if (idx === -1) break
          matches.push({
            tabId: tab.id,
            tabTitle: tab.title,
            messageId: msg.id,
            role: msg.role,
            content: msg.content,
            snippet: msg.content.slice(
              Math.max(0, idx - 40),
              Math.min(msg.content.length, idx + q.length + 60)
            ),
            matchStart: idx,
            matchEnd: idx + q.length,
            timestamp: msg.timestamp,
          })
          searchStart = idx + 1
          if (matches.length > 200) break
        }
        if (matches.length > 200) break
      }
      if (matches.length > 200) break
    }

    return matches
  }, [query, tabs])

  useEffect(() => {
    setSelectedIndex(0)
    setPage(0)
  }, [results])

  const totalPages = Math.ceil(results.length / PAGE_SIZE)
  const pagedResults = useMemo(() => {
    const start = page * PAGE_SIZE
    return results.slice(start, start + PAGE_SIZE)
  }, [results, page])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (selectedIndex < pagedResults.length - 1) {
          setSelectedIndex((i) => i + 1)
        } else if (page < totalPages - 1) {
          setPage((p) => p + 1)
          setSelectedIndex(0)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (selectedIndex > 0) {
          setSelectedIndex((i) => i - 1)
        } else if (page > 0) {
          setPage((p) => p - 1)
          setSelectedIndex(PAGE_SIZE - 1)
        }
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        const r = results[page * PAGE_SIZE + selectedIndex]
        if (r) onJumpToMessage(r.tabId, r.messageId)
      }
    },
    [results, pagedResults, selectedIndex, page, totalPages, onClose, onJumpToMessage]
  )

  const formatTime = useCallback((ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }, [])

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索所有对话内容..."
          className="flex-1 bg-transparent text-sm text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
        />
        {query && <span className="text-[10px] text-zinc-500">{results.length} 个结果</span>}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="关闭搜索"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {!query.trim() ? (
          <div className="text-center py-12 text-zinc-500 text-sm">输入关键词搜索所有对话</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">未找到匹配内容</div>
        ) : (
          <div className="p-2 space-y-1">
            {pagedResults.map((result, index) => {
              const { before, match, after } = highlightMatch(
                result.content,
                result.matchStart,
                result.matchEnd
              )
              return (
                <button
                  key={`${result.messageId}-${result.matchStart}`}
                  onClick={() => onJumpToMessage(result.tabId, result.messageId)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors',
                    index === selectedIndex
                      ? 'bg-zinc-800 dark:bg-zinc-800 bg-gray-200'
                      : 'hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500 truncate">{result.tabTitle}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1 py-0.5 rounded',
                        result.role === 'user'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-emerald-900/30 text-emerald-400'
                      )}
                    >
                      {result.role === 'user' ? 'User' : 'AI'}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {formatTime(result.timestamp)}
                    </span>
                    <ChevronRight className="w-3 h-3 text-zinc-600 ml-auto" />
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 text-gray-600 line-clamp-2">
                    {before && <span className="text-zinc-500">...{before}</span>}
                    <span className="text-emerald-400 font-medium bg-emerald-900/20 rounded px-0.5">
                      {match}
                    </span>
                    {after && <span className="text-zinc-500">{after}...</span>}
                  </p>
                </button>
              )
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-zinc-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
