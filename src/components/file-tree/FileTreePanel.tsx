import { useState, useEffect, useCallback, useMemo } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { FileTreeNode, FileNode } from './FileTreeNode'
import { Search, FolderOpen, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

interface FileTreePanelProps {
  onFileSelect?: (path: string) => void
}

export function FileTreePanel({ onFileSelect }: FileTreePanelProps) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  const loadTree = useCallback(
    async (dirPath?: string) => {
      setLoading(true)
      try {
        const result = await invoke({
          action: 'read_file_tree',
          dirPath: dirPath || undefined,
        })
        if (Array.isArray(result)) {
          setTree(result)
        }
      } catch (error) {
        debug.error('Failed to load file tree:', error)
        addToast('加载文件树失败', 'error')
      } finally {
        setLoading(false)
      }
    },
    [invoke]
  )

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const handleRefresh = useCallback(() => {
    loadTree()
  }, [loadTree])

  const handleToggleShowAll = useCallback(async () => {
    const newMode = !showAll
    setShowAll(newMode)
    try {
      await invoke({ action: 'set_config', key: 'file_mode', value: newMode ? 'all' : 'source' })
      loadTree()
    } catch (error) {
      debug.error('Failed to toggle file mode:', error)
      addToast('切换文件显示模式失败', 'error')
      setShowAll(!newMode)
    }
  }, [showAll, invoke, loadTree])

  const handleSelect = useCallback(
    (path: string, type: 'file' | 'directory') => {
      setSelectedPath(path)
      if (type === 'file') {
        onFileSelect?.(path)
      }
    },
    [onFileSelect]
  )

  const filteredTree = useMemo(() => {
    if (!filter) return tree
    const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          acc.push(node)
        } else if (node.children) {
          const filtered = filterNodes(node.children, query)
          if (filtered.length > 0) {
            acc.push({ ...node, children: filtered })
          }
        }
        return acc
      }, [])
    }
    return filterNodes(tree, filter)
  }, [tree, filter])

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 space-y-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 dark:text-zinc-500 text-gray-500"
            title="刷新"
            aria-label="刷新文件树"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-zinc-500 dark:text-zinc-500 text-gray-400" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 rounded bg-zinc-900 dark:bg-zinc-900 bg-white border border-zinc-800 dark:border-zinc-800 border-gray-200 text-xs text-zinc-300 dark:text-zinc-300 text-gray-700 placeholder-zinc-600 dark:placeholder-zinc-600 placeholder-gray-400 focus:outline-none focus:border-zinc-600"
              aria-label="搜索文件"
            />
          </div>
          <button
            onClick={handleToggleShowAll}
            className={cn(
              'p-1.5 rounded transition-colors',
              showAll ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'
            )}
            title={showAll ? '隐藏依赖文件' : '显示所有文件'}
            aria-label={showAll ? '隐藏依赖文件' : '显示所有文件'}
          >
            {showAll ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1.5 py-0.5" role="tree">
        {loading && tree.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 text-xs text-zinc-500 dark:text-zinc-500 text-gray-400"
            role="status"
          >
            加载中...
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-zinc-500 dark:text-zinc-500 text-gray-400">
            <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
            {filter ? '无匹配文件' : '空目录'}
          </div>
        ) : (
          filteredTree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
        <p className="text-[10px] text-zinc-600 dark:text-zinc-600 text-gray-400">
          {showAll ? '显示所有文件' : '已隐藏依赖和构建文件'}
        </p>
      </div>
    </div>
  )
}
