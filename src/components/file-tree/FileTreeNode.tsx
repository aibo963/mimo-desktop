import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  selectedPath?: string | null
  onSelect?: (path: string, type: 'file' | 'directory') => void
}

export function FileTreeNode({ node, depth, selectedPath, onSelect }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      setExpanded(!expanded)
    }
    onSelect?.(node.path, node.type)
  }, [node, expanded, onSelect])

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (node.type === 'file') {
        e.dataTransfer.setData(
          'application/x-mimo-file',
          JSON.stringify({
            name: node.name,
            path: node.path,
            type: node.type,
          })
        )
        e.dataTransfer.effectAllowed = 'copy'
      }
    },
    [node]
  )

  const isSelected = selectedPath === node.path

  return (
    <div>
      <div
        onClick={handleClick}
        draggable={node.type === 'file'}
        onDragStart={handleDragStart}
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors text-sm',
          isSelected
            ? 'bg-zinc-700 dark:bg-zinc-700 bg-blue-100 text-white dark:text-white text-gray-900'
            : 'hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100 text-zinc-300 dark:text-zinc-300 text-gray-700',
          node.type === 'file' && 'cursor-grab active:cursor-grabbing'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === 'directory' ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-zinc-500" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.type === 'directory' ? (
          expanded ? (
            <FolderOpen className="w-4 h-4 shrink-0 text-blue-400" />
          ) : (
            <Folder className="w-4 h-4 shrink-0 text-blue-400" />
          )
        ) : (
          <FileIcon name={node.name} />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {expanded &&
        node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
    </div>
  )
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || ''

  const colorMap: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    py: 'text-green-400',
    json: 'text-orange-400',
    md: 'text-zinc-400',
    css: 'text-purple-400',
    html: 'text-red-400',
    svg: 'text-pink-400',
    gitignore: 'text-zinc-600',
  }

  const color = colorMap[ext] || 'text-zinc-400'

  return <File className={cn('w-4 h-4 shrink-0', color)} />
}
