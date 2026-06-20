import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
}

interface FileMentionMenuProps {
  query: string
  onSelect: (file: FileItem) => void
  onClose: () => void
  visible: boolean
}

export function FileMentionMenu({ query, onSelect, onClose, visible }: FileMentionMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchFiles = useCallback(async (searchQuery: string) => {
    setLoading(true)
    try {
      const tree = await window.mimoAPI.invoke({ action: 'read_file_tree' })
      if (!Array.isArray(tree)) {
        setFiles([])
        return
      }

      const flattenFiles = (nodes: any[], parentPath = ''): FileItem[] => {
        const result: FileItem[] = []
        for (const node of nodes) {
          const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name
          if (node.type === 'file') {
            result.push({
              name: node.name,
              path: node.path || fullPath,
              type: 'file',
            })
          }
          if (node.children) {
            result.push(...flattenFiles(node.children, fullPath))
          }
        }
        return result
      }

      const allFiles = flattenFiles(tree)
      const filtered = searchQuery
        ? allFiles.filter(
            (f) =>
              f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.path.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allFiles.slice(0, 20)

      setFiles(filtered.slice(0, 15))
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => searchFiles(query), 150)
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current)
    }
  }, [query, searchFiles])

  useEffect(() => {
    setSelectedIndex(0)
  }, [files])

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
    (e: KeyboardEvent) => {
      if (!visible) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(files.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + files.length) % Math.max(files.length, 1))
      } else if (e.key === 'Enter' && files.length > 0) {
        e.preventDefault()
        onSelect(files[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [visible, files, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg overflow-hidden z-50"
      role="menu"
    >
      <div className="px-3 py-2 border-b border-zinc-700">
        <span className="text-xs text-zinc-500">选择文件作为上下文</span>
      </div>
      <div className="overflow-y-auto max-h-52">
        {loading && <div className="px-3 py-4 text-center text-xs text-zinc-500">搜索中...</div>}
        {!loading && files.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-zinc-500">
            {query ? '未找到匹配的文件' : '无可用文件'}
          </div>
        )}
        {!loading &&
          files.map((file, index) => (
            <button
              key={file.path}
              onClick={() => onSelect(file)}
              onMouseEnter={() => setSelectedIndex(index)}
              role="menuitem"
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                index === selectedIndex
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-700/50'
              )}
            >
              {file.type === 'directory' ? (
                <Folder className="w-4 h-4 shrink-0 text-zinc-500" />
              ) : (
                <FileText className="w-4 h-4 shrink-0 text-zinc-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-xs">{file.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{file.path}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}
