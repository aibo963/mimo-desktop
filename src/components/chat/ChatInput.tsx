import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square, Paperclip, Loader2 } from 'lucide-react'

interface QueueStatus {
  queueLength: number
  isProcessing: boolean
  currentMessageId: string | null
}

interface ChatInputProps {
  onSend: (message: string) => void
  onCancel: () => void
  isStreaming: boolean
  queueStatus?: QueueStatus
}

export function ChatInput({ onSend, onCancel, isStreaming, queueStatus }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }

  const getPlaceholder = () => {
    if (isStreaming) return '正在处理中...'
    if (queueStatus?.isProcessing && queueStatus.queueLength > 0) {
      return `队列中还有 ${queueStatus.queueLength} 条消息`
    }
    return '输入消息... (Enter 发送)'
  }

  return (
    <div className="border-t border-zinc-800/80 p-3 shrink-0">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={getPlaceholder()}
            className="w-full min-h-[44px] max-h-[160px] resize-none bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors placeholder-zinc-600"
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="absolute left-3 bottom-3 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="附加文件"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors shrink-0"
            title="停止生成"
          >
            <Square className="w-4 h-4 text-red-400" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="发送消息"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {queueStatus && queueStatus.isProcessing && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
          <span className="text-[10px] text-zinc-500">
            处理中... {queueStatus.queueLength > 0 && `(${queueStatus.queueLength} 条排队)`}
          </span>
        </div>
      )}
      
      <p className="text-[10px] text-zinc-600 mt-1 text-center">
        Mimo Desktop • 混合模式 (CLI + 队列)
      </p>
    </div>
  )
}
