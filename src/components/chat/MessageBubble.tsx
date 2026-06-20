import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { ToolCallCard } from '../tools/ToolCallCard'
import { MessageActions } from './MessageActions'
import { AttachmentList } from './AttachmentList'
import { Message } from '@/hooks/useChat'
import { ToolCall } from '@/types/tool'
import { cn } from '@/lib/utils'
import { useSnippetStore } from '@/stores/snippetStore'
import { useToastStore } from '@/stores/toastStore'
import { useTTS } from '@/hooks/useTTS'
import { useSkill } from '@/hooks/useSkill'
import { useConfirm } from '@/hooks/useConfirm'
import { formatTime } from '@/lib/utils'

const LANGUAGE_REGEX = /language-(\w+)/

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = LANGUAGE_REGEX.exec(className || '')
    const isInline = !match && !String(children).includes('\n')
    if (isInline) {
      return (
        <code className="bg-zinc-700 px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      )
    }
    return <CodeBlock language={match?.[1] || 'text'} value={String(children).replace(/\n$/, '')} />
  },
  p({ children }: any) {
    return <p className="mb-2 last:mb-0 text-inherit">{children}</p>
  },
  ul({ children }: any) {
    return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  },
  ol({ children }: any) {
    return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  },
  a({ href, children }: any) {
    const safeHref = href && /^(https?:\/\/|mailto:|#)/i.test(href) ? href : undefined
    if (!safeHref) return <span className="text-zinc-500">{children}</span>
    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-500 dark:text-emerald-400 hover:underline"
      >
        {children}
      </a>
    )
  },
  h1({ children }: any) {
    return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>
  },
  h2({ children }: any) {
    return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>
  },
  h3({ children }: any) {
    return <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-400 my-2">
        {children}
      </blockquote>
    )
  },
  hr() {
    return <hr className="border-zinc-700 my-4" />
  },
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border border-zinc-700">{children}</table>
      </div>
    )
  },
  th({ children }: any) {
    return <th className="border border-zinc-700 px-3 py-2 bg-zinc-900 text-left">{children}</th>
  },
  td({ children }: any) {
    return <td className="border border-zinc-700 px-3 py-2">{children}</td>
  },
  input({ checked, ...props }: any) {
    return (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mr-2 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
        {...props}
      />
    )
  },
  li({ children, ...props }: any) {
    const content = Array.isArray(children) ? children : [children]
    const hasCheckbox = content.some(
      (child: any) => child?.type === 'input' || (child?.props && child.props.type === 'checkbox')
    )
    if (hasCheckbox)
      return (
        <li className="list-none" {...props}>
          {children}
        </li>
      )
    return <li {...props}>{children}</li>
  },
}

interface MessageBubbleProps {
  message: Message
  isHighlighted?: boolean
  onRegenerate?: () => void
  onEdit?: (newContent: string) => Promise<void>
  onDelete?: () => void
}

function areEqual(prev: MessageBubbleProps, next: MessageBubbleProps) {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.isHighlighted === next.isHighlighted &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete
  )
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isHighlighted,
  onRegenerate,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const addSnippet = useSnippetStore((state) => state.addSnippet)
  const addToast = useToastStore((state) => state.addToast)
  const { play, stop, isPlaying, isGenerating } = useTTS()
  const { add: addSkill } = useSkill()
  const { confirm } = useConfirm()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      addToast('已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    })
  }, [message.content, addToast])

  const handleSave = useCallback(() => {
    addSnippet({
      name: `Assistant message - ${new Date().toLocaleDateString('zh-CN')}`,
      code: message.content,
      language: 'markdown',
      tags: ['assistant', 'message'],
    })
    setSaved(true)
    addToast('消息已收藏', 'success')
    setTimeout(() => setSaved(false), 2000)
  }, [message.content, addSnippet, addToast])

  const handleTTS = useCallback(() => {
    play(message.content)
  }, [play, message.content])

  const handleSaveAsSkill = useCallback(async () => {
    const name = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '')
    await addSkill(name, '', 'general', message.content, ['从对话保存'])
    addToast('已保存为技能', 'success')
  }, [message.content, addSkill, addToast])

  const handleEditSave = useCallback(async () => {
    if (!editContent.trim() || editContent === message.content) {
      setEditing(false)
      return
    }
    await onEdit?.(editContent.trim())
    setEditing(false)
  }, [editContent, message.content, onEdit])

  const handleEditCancel = useCallback(() => {
    setEditContent(message.content)
    setEditing(false)
  }, [message.content])

  const handleDelete = useCallback(() => {
    if (confirm('确定删除这条消息？')) {
      onDelete?.()
      addToast('消息已删除', 'success')
    }
  }, [confirm, onDelete, addToast])

  const handleEditStart = useCallback(() => {
    setEditContent(message.content)
    setEditing(true)
  }, [message.content])

  return (
    <div className={cn('flex gap-3 px-4 py-3 group', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white shrink-0"
          role="img"
          aria-label="AI 助手"
        >
          M
        </div>
      )}
      <div className="max-w-[80%] relative">
        <div
          className={cn(
            'rounded-xl px-4 py-3 transition-all duration-300',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 dark:bg-zinc-800 bg-gray-100 text-zinc-100 dark:text-zinc-100 text-gray-800',
            message.status === 'error' && 'border border-red-500/50',
            isHighlighted && 'ring-2 ring-emerald-400/80 bg-emerald-900/20'
          )}
        >
          {isUser ? (
            editing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[80px] bg-blue-700 text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleEditSave()
                    } else if (e.key === 'Escape') handleEditCancel()
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleEditCancel}
                    className="px-3 py-1 text-xs rounded-lg bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="px-3 py-1 text-xs rounded-lg bg-white text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    发送
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          <AttachmentList attachments={message.attachments || []} />

          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-700">
              {message.toolCalls.length > 3 && message.status !== 'streaming' ? (
                <ToolCallsSummary toolCalls={message.toolCalls} />
              ) : (
                message.toolCalls.map((tc) => <ToolCallCard key={tc.id} tool={tc} />)
              )}
            </div>
          )}

          {message.status === 'streaming' && (
            <span
              className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1"
              aria-label="正在输入"
            />
          )}
        </div>

        {!isUser && message.status === 'done' && message.content && (
          <MessageActions
            isUser={false}
            copied={copied}
            saved={saved}
            isPlaying={isPlaying}
            isGenerating={isGenerating}
            onCopy={handleCopy}
            onSave={handleSave}
            onTTS={handleTTS}
            onRegenerate={onRegenerate}
            onDelete={onDelete ? handleDelete : undefined}
          />
        )}

        {isUser && message.status === 'done' && onEdit && !editing && (
          <MessageActions
            isUser={true}
            copied={copied}
            saved={false}
            isPlaying={false}
            isGenerating={false}
            onCopy={handleCopy}
            onEdit={handleEditStart}
            onDelete={onDelete ? handleDelete : undefined}
            onSaveAsSkill={handleSaveAsSkill}
          />
        )}
      </div>
      <div
        className={cn(
          'text-[10px] text-zinc-600 dark:text-zinc-600 text-gray-400 mt-1',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        {formatTime(message.timestamp)}
      </div>
    </div>
  )
}, areEqual)

function ToolCallsSummary({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false)
  const running = toolCalls.filter((tc) => tc.status === 'running').length
  const done = toolCalls.filter((tc) => tc.status === 'done').length
  const error = toolCalls.filter((tc) => tc.status === 'error').length

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors text-xs text-zinc-400"
      >
        {expanded ? '▼' : '▶'}
        <span className="font-medium">{toolCalls.length} 个工具调用</span>
        {running > 0 && <span className="text-yellow-400">{running} 运行中</span>}
        {done > 0 && <span className="text-emerald-400">{done} 完成</span>}
        {error > 0 && <span className="text-red-400">{error} 失败</span>}
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} tool={tc} />
          ))}
        </div>
      )}
    </div>
  )
}
