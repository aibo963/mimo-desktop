import { useState, useEffect, useCallback } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { FileTreeNode, FileNode } from './FileTreeNode'
import { Search, FolderOpen, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileTreePanelProps {
  onFileSelect?: (path: string) => void
}

export function FileTreePanel({ onFileSelect }: FileTreePanelProps) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [rootPath, setRootPath] = useState<string>('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { invoke } = useMimo()

  const loadTree = useCallback(async (dirPath?: string) => {
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
      console.error('Failed to load file tree:', error)
    } finally {
      setLoading(false)
    }
  }, [invoke])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const handleRefresh = () => {
    loadTree(rootPath || undefined)
  }

  const handleToggleShowAll = async () => {
    const newMode = !showAll
    setShowAll(newMode)
    try {
      await window.mimoAPI.invoke({ action: 'read_file_tree' })
      loadTree(rootPath || undefined)
    } catch (error) {
      console.error('Failed to toggle file mode:', error)
    }
  }

  const handleSelect = useCallback((path: string, type: 'file' | 'directory') => {
    setSelectedPath(path)
    if (type === 'file') {
      onFileSelect?.(path)
    }
  }, [onFileSelect])

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node)
      } else if (node.children) {
        const filtered = filterTree(node.children, query)
        if (filtered.length > 0) {
          acc.push({ ...node, children: filtered })
        }
      }
      return acc
    }, [])
  }

  const filteredTree = filterTree(tree, filter)

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 space-y-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500"
            title="刷新"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <button
            onClick={handleToggleShowAll}
            className={cn(
              'p-1.5 rounded transition-colors',
              showAll ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'
            )}
            title={showAll ? '隐藏依赖文件' : '显示所有文件'}
          >
            {showAll ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1.5 py-0.5">
        {loading && tree.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-zinc-500">
            加载中...
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-zinc-500">
            <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
            {filter ? '无匹配文件' : '空目录'}
          </div>
        ) : (
          filteredTree.map(node => (
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

      <div className="px-3 py-1.5 border-t border-zinc-800/80 shrink-0">
        <p className="text-[10px] text-zinc-600">
          {showAll ? '显示所有文件' : '已隐藏依赖和构建文件'}
        </p>
      </div>
    </div>
  )
}
