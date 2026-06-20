import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Trash2,
  Download,
  Cpu,
  HelpCircle,
  Bot,
  FileText,
  LayoutTemplate,
  Search,
  History,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Command {
  name: string
  description: string
  icon: React.ElementType
}

const commands: Command[] = [
  { name: '/clear', description: '清空当前对话', icon: Trash2 },
  { name: '/export', description: '导出对话', icon: Download },
  { name: '/model', description: '切换模型', icon: Cpu },
  { name: '/agent', description: '切换 Agent 模式', icon: Bot },
  { name: '/file', description: '引用文件 (@file)', icon: FileText },
  { name: '/template', description: '使用模板', icon: LayoutTemplate },
  { name: '/search', description: '搜索对话', icon: Search },
  { name: '/history', description: '查看历史', icon: History },
  { name: '/settings', description: '打开设置', icon: Settings },
  { name: '/help', description: '显示帮助', icon: HelpCircle },
]

interface CommandMenuProps {
  query: string
  onSelect: (command: Command) => void
  onClose: () => void
  visible: boolean
}

export function CommandMenu({ query, onSelect, onClose, visible }: CommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = commands.filter(
    (cmd) => cmd.name.includes(query.toLowerCase()) || cmd.description.includes(query)
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

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
        setSelectedIndex((i) => (i + 1) % Math.max(filtered.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1))
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault()
        onSelect(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [visible, filtered, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!visible || filtered.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-72 rounded-lg bg-zinc-800 border border-zinc-700 shadow-lg overflow-hidden z-50"
      role="menu"
    >
      {filtered.map((cmd, index) => {
        const Icon = cmd.icon
        return (
          <button
            key={cmd.name}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(index)}
            role="menuitem"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
              index === selectedIndex
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-700/50'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">{cmd.name}</div>
              <div className="text-xs text-zinc-500 truncate">{cmd.description}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
