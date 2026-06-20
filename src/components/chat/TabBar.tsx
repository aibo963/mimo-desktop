import { useCallback, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useTabStore } from '@/stores/tabStore'
import { cn } from '@/lib/utils'

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, renameTab, reorderTabs } =
    useTabStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDoubleClick = useCallback((id: string, title: string) => {
    setEditingId(id)
    setEditValue(title)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [])

  const handleRenameSubmit = useCallback(() => {
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, renameTab])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRenameSubmit()
      } else if (e.key === 'Escape') {
        setEditingId(null)
      }
    },
    [handleRenameSubmit]
  )

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault()
      const fromIndex = dragIndex
      if (fromIndex !== null && fromIndex !== toIndex) {
        reorderTabs(fromIndex, toIndex)
      }
      setDragIndex(null)
      setOverIndex(null)
    },
    [dragIndex, reorderTabs]
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 dark:bg-zinc-900 bg-gray-50 border-b border-zinc-800 dark:border-zinc-800 border-gray-200 overflow-x-auto">
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
          draggable={editingId !== tab.id}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={cn(
            'group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs cursor-pointer transition-all shrink-0 max-w-[160px]',
            activeTabId === tab.id
              ? 'bg-zinc-800 dark:bg-zinc-800 bg-gray-200 text-white dark:text-white text-gray-900'
              : 'text-zinc-400 dark:text-zinc-400 text-gray-600 hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100 hover:text-zinc-300 dark:hover:text-zinc-300 hover:text-gray-800',
            dragIndex === index && 'opacity-50',
            overIndex === index &&
              dragIndex !== null &&
              dragIndex !== index &&
              'border-t-2 border-emerald-500'
          )}
          aria-selected={activeTabId === tab.id}
          role="tab"
        >
          {editingId === tab.id ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="bg-zinc-700 dark:bg-zinc-700 bg-gray-200 text-white dark:text-white text-gray-900 text-xs px-1 py-0.5 rounded outline-none w-full min-w-0"
              autoFocus
            />
          ) : (
            <span className="truncate">{tab.title}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-700 dark:hover:bg-zinc-700 hover:bg-gray-200 transition-all shrink-0"
            aria-label={`关闭 ${tab.title}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={addTab}
        className="p-1.5 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 dark:text-zinc-500 text-gray-500 hover:text-zinc-300 dark:hover:text-zinc-300 hover:text-gray-700 transition-colors shrink-0"
        aria-label="新建标签页"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
