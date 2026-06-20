import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  Search,
  Globe,
  Cpu,
  BookOpen,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { BashOutput } from './BashOutput'
import { FileDiff } from './FileDiff'
import { cn } from '@/lib/utils'
import { ToolCallCardProps } from '@/types/tool'

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  bash: Terminal,
  read: FileText,
  write: FileText,
  edit: FileText,
  grep: Search,
  glob: Search,
  webfetch: Globe,
  websearch: Globe,
  actor: Cpu,
  skill: BookOpen,
  memory: BookOpen,
  task: FileText,
}

const toolLabels: Record<string, string> = {
  bash: '终端命令',
  read: '读取文件',
  write: '写入文件',
  edit: '编辑文件',
  grep: '搜索内容',
  glob: '搜索文件',
  webfetch: '获取网页',
  websearch: '网络搜索',
  actor: '子代理',
  skill: '技能',
  memory: '记忆',
  task: '任务',
}

const statusConfig = {
  pending: {
    icon: Loader2,
    color: 'text-zinc-400',
    bg: 'bg-zinc-800 dark:bg-zinc-800 bg-gray-100',
    label: '等待中',
    animate: false,
  },
  running: {
    icon: Loader2,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/30 dark:bg-yellow-950/30 bg-yellow-50',
    label: '运行中',
    animate: true,
  },
  done: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/30 dark:bg-emerald-950/30 bg-emerald-50',
    label: '完成',
    animate: false,
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-950/30 dark:bg-red-950/30 bg-red-50',
    label: '错误',
    animate: false,
  },
  denied: {
    icon: XCircle,
    color: 'text-orange-400',
    bg: 'bg-orange-950/30 dark:bg-orange-950/30 bg-orange-50',
    label: '已拒绝',
    animate: false,
  },
}

export function ToolCallCard({ tool }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const Icon = toolIcons[tool.name] || Terminal
  const label = toolLabels[tool.name] || tool.name
  const status = statusConfig[tool.status] || statusConfig.pending
  const StatusIcon = status.icon

  const renderContent = () => {
    if (!expanded) return null

    switch (tool.name) {
      case 'bash':
        return (
          <div className="p-3">
            <BashOutput
              command={tool.input.command || ''}
              output={tool.output || ''}
              description={tool.input.description}
            />
          </div>
        )

      case 'edit':
        return (
          <div className="p-3">
            <FileDiff
              path={tool.input.filePath || tool.input.path || ''}
              oldString={tool.input.oldString}
              newString={tool.input.newString}
            />
          </div>
        )

      case 'write':
        return (
          <div className="p-3">
            <FileDiff
              path={tool.input.filePath || tool.input.path || ''}
              content={tool.input.content}
            />
          </div>
        )

      case 'read':
        return (
          <div className="p-3">
            <FileDiff path={tool.input.filePath || tool.input.path || ''} content={tool.output} />
          </div>
        )

      case 'grep':
      case 'glob':
        return (
          <div className="p-3">
            <div className="text-xs text-zinc-400 mb-2">
              模式: <code className="bg-zinc-800 px-1 rounded">{tool.input.pattern || ''}</code>
            </div>
            <pre className="p-3 rounded bg-zinc-900 text-xs text-zinc-300 overflow-auto max-h-[300px] font-mono whitespace-pre-wrap">
              {tool.output || '(无结果)'}
            </pre>
          </div>
        )

      default:
        return (
          <div className="p-3">
            <div className="text-xs text-zinc-400 mb-2">输入:</div>
            <pre className="p-3 rounded bg-zinc-900 text-xs text-zinc-300 overflow-auto max-h-[150px] font-mono mb-2">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
            {tool.output && (
              <>
                <div className="text-xs text-zinc-400 mb-2">输出:</div>
                <pre className="p-3 rounded bg-zinc-900 text-xs text-zinc-300 overflow-auto max-h-[200px] font-mono whitespace-pre-wrap">
                  {tool.output}
                </pre>
              </>
            )}
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden my-2',
        status.bg,
        'border-zinc-700/50 dark:border-zinc-700/50 border-gray-200'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-zinc-800/30 dark:hover:bg-zinc-800/30 hover:bg-gray-200/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-400" />
        )}
        <Icon className={cn('w-4 h-4', status.color)} />
        <span className="text-sm font-mono text-zinc-300">{label}</span>
        <div className="flex items-center gap-1 ml-auto">
          <StatusIcon className={cn('w-3 h-3', status.color, status.animate && 'animate-spin')} />
          <span className={cn('text-xs', status.color)}>{status.label}</span>
        </div>
        {tool.duration && <span className="text-xs text-zinc-500 ml-2">{tool.duration}ms</span>}
      </button>
      {renderContent()}
    </div>
  )
}
