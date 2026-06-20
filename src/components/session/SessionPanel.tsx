import { useEffect, useCallback, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useConfirm } from '@/hooks/useConfirm'
import { Plus, Trash2, MessageSquare, RefreshCw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SessionPanel() {
  const { confirm } = useConfirm()
  const {
    sessions,
    activeSessionId,
    loading,
    error,
    fetchSessions,
    setActiveSession,
    deleteSession,
    createNewSession,
  } = useSessionStore()

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true
    const title = (session.title || '未命名会话').toLowerCase()
    return title.includes(searchQuery.toLowerCase())
  })

  const handleDelete = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation()
      if (confirm('确定要删除这个会话吗？')) {
        deleteSession(sessionId)
      }
    },
    [deleteSession]
  )

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      if (isToday) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-1 shrink-0">
        <button
          onClick={createNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 dark:text-emerald-400 transition-colors text-sm"
          aria-label="新建对话"
        >
          <Plus className="w-4 h-4" />
          新对话
        </button>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100 transition-colors text-xs text-zinc-500 dark:text-zinc-500 text-gray-500"
          aria-label="刷新会话列表"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          刷新
        </button>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 dark:text-zinc-600 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 rounded bg-zinc-900 dark:bg-zinc-900 bg-white border border-zinc-800 dark:border-zinc-800 border-gray-200 text-xs text-zinc-300 dark:text-zinc-300 text-gray-700 placeholder-zinc-600 dark:placeholder-zinc-600 placeholder-gray-400 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1.5 space-y-0.5" role="list">
        {error && (
          <div className="px-2 py-1.5 text-xs text-red-400 bg-red-950/20 rounded" role="alert">
            {error}
          </div>
        )}
        {filteredSessions.length === 0 ? (
          <div className="text-center text-zinc-600 dark:text-zinc-600 text-gray-400 text-xs py-12 px-4">
            {loading ? '加载中...' : searchQuery ? '无匹配会话' : '暂无会话'}
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              role="listitem"
              className={cn(
                'flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-colors',
                activeSessionId === session.id
                  ? 'bg-zinc-800/80 dark:bg-zinc-800/80 bg-gray-100 text-white dark:text-white text-gray-900'
                  : 'hover:bg-zinc-800/40 dark:hover:bg-zinc-800/40 hover:bg-gray-100 text-zinc-400 dark:text-zinc-400 text-gray-600'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug truncate">{session.title || '未命名会话'}</p>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-600 text-gray-400 mt-0.5">
                  {formatDate(session.updatedAt || session.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-0.5 rounded hover:bg-zinc-700 dark:hover:bg-zinc-700 hover:bg-gray-200 transition-all shrink-0"
                aria-label={`删除会话 ${session.title || '未命名'}`}
              >
                <Trash2 className="w-3 h-3 text-zinc-500 dark:text-zinc-500 text-gray-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
