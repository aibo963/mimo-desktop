import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { Plus, Trash2, MessageSquare, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SessionPanel() {
  const {
    sessions,
    activeSessionId,
    loading,
    fetchSessions,
    setActiveSession,
    deleteSession,
    createNewSession,
  } = useSessionStore()

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个会话吗？')) {
      deleteSession(sessionId)
    }
  }

  const formatDate = (dateStr: string) => {
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
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-1 shrink-0">
        <button
          onClick={createNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          新对话
        </button>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors text-xs text-zinc-500"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-auto px-1.5 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-12 px-4">
            {loading ? '加载中...' : '暂无会话'}
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={cn(
                'flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-colors',
                activeSessionId === session.id
                  ? 'bg-zinc-800/80 text-white'
                  : 'hover:bg-zinc-800/40 text-zinc-400'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug truncate">
                  {session.title || '未命名会话'}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {formatDate(session.updatedAt || session.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 transition-all shrink-0"
              >
                <Trash2 className="w-3 h-3 text-zinc-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
