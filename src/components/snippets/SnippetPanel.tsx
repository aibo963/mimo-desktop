import { useState, useMemo, useCallback } from 'react'
import { useSnippetStore } from '@/stores/snippetStore'
import { useToastStore } from '@/stores/toastStore'
import { useClipboard } from '@/hooks/useClipboard'
import { Search, Trash2, Copy, Check, X, Pencil } from 'lucide-react'

interface SnippetPanelProps {
  onClose?: () => void
}

export function SnippetPanel({ onClose }: SnippetPanelProps) {
  const { snippets, removeSnippet, updateSnippet } = useSnippetStore()
  const addToast = useToastStore((state) => state.addToast)
  const { copy } = useClipboard()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')

  const filteredSnippets = useMemo(() => {
    if (!searchQuery.trim()) return snippets
    const q = searchQuery.toLowerCase()
    return snippets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [snippets, searchQuery])

  const handleCopy = useCallback(
    async (snippet: (typeof snippets)[0]) => {
      await copy(snippet.code, '代码已复制')
      setCopiedId(snippet.id)
      setTimeout(() => setCopiedId(null), 2000)
    },
    [copy]
  )

  const handleDelete = useCallback(
    (id: string) => {
      removeSnippet(id)
      addToast('代码已删除', 'info')
    },
    [removeSnippet, addToast]
  )

  const handleStartEdit = useCallback((snippet: (typeof snippets)[0]) => {
    setEditingId(snippet.id)
    setEditName(snippet.name)
    setEditCode(snippet.code)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editName.trim()) return
    updateSnippet(editingId, { name: editName.trim(), code: editCode })
    setEditingId(null)
    addToast('代码已更新', 'success')
  }, [editingId, editName, editCode, updateSnippet, addToast])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <h2 className="text-sm font-semibold text-zinc-200 dark:text-zinc-200 text-gray-800">
          代码收藏
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="搜索代码..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-zinc-800 dark:bg-zinc-800 bg-white border border-zinc-700 dark:border-zinc-700 border-gray-300 text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500 dark:text-zinc-500 text-gray-500 text-sm">
              {searchQuery ? '未找到匹配的代码片段' : '暂无收藏的代码'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="p-3 rounded-lg bg-zinc-800/50 dark:bg-zinc-800/50 bg-white border border-zinc-700/50 dark:border-zinc-700/50 border-gray-200 hover:border-zinc-600 dark:hover:border-zinc-600 transition-colors"
              >
                {editingId === snippet.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded bg-zinc-900 dark:bg-zinc-900 bg-gray-100 border border-zinc-700 dark:border-zinc-700 border-gray-300 text-zinc-200 dark:text-zinc-200 text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    <textarea
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full min-h-[100px] px-2 py-1 text-xs font-mono rounded bg-zinc-900 dark:bg-zinc-900 bg-gray-100 border border-zinc-700 dark:border-zinc-700 border-gray-300 text-zinc-300 dark:text-zinc-300 text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-zinc-200 dark:text-zinc-200 text-gray-800 truncate">
                          {snippet.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 dark:bg-zinc-700 bg-gray-200 text-zinc-400 dark:text-zinc-400 text-gray-600">
                            {snippet.language}
                          </span>
                          {snippet.source && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 text-gray-500">
                              {snippet.source}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600 dark:text-zinc-600 text-gray-400">
                            {formatDate(snippet.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleStartEdit(snippet)}
                          className="p-1 rounded hover:bg-zinc-700 dark:hover:bg-zinc-700 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
                          title="编辑"
                          aria-label="编辑代码片段"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(snippet)}
                          className="p-1 rounded hover:bg-zinc-700 dark:hover:bg-zinc-700 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
                          title="复制代码"
                          aria-label="复制代码"
                        >
                          {copiedId === snippet.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(snippet.id)}
                          className="p-1 rounded hover:bg-zinc-700 dark:hover:bg-zinc-700 hover:bg-gray-200 text-zinc-500 hover:text-red-400 transition-colors"
                          title="删除"
                          aria-label="删除代码片段"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 p-2 rounded bg-zinc-900/50 dark:bg-zinc-900/50 bg-gray-100 overflow-x-auto">
                      <pre className="text-xs text-zinc-300 dark:text-zinc-300 text-gray-700 font-mono whitespace-pre-wrap break-all">
                        {snippet.code.length > 200
                          ? snippet.code.slice(0, 200) + '...'
                          : snippet.code}
                      </pre>
                    </div>

                    {snippet.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {snippet.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 dark:bg-zinc-800 bg-gray-200 text-zinc-400 dark:text-zinc-400 text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
