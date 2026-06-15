import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModelSelectorInline } from './ModelSelectorInline'
import { useChat } from '@/hooks/useChat'
import { useSessionStore } from '@/stores/sessionStore'
import { Trash2, Cpu } from 'lucide-react'

interface ChatPanelProps {
  sessionId?: string | null
}

export function ChatPanel({ sessionId }: ChatPanelProps) {
  const { messages, send, cancel, clearMessages, isStreaming, queueStatus } = useChat()
  const { sessions } = useSessionStore()

  const currentSession = sessions.find(s => s.id === sessionId)

  const handleSend = (content: string) => {
    send(content, sessionId || undefined)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center justify-between px-4 h-11 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-emerald-600/20 flex items-center justify-center">
            <Cpu className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-sm text-zinc-300 truncate">
            {currentSession?.title || '新对话'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelectorInline />
          <button
            onClick={clearMessages}
            className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-500"
            title="清空当前对话"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <MessageList messages={messages} />
      <ChatInput 
        onSend={handleSend} 
        onCancel={cancel} 
        isStreaming={isStreaming}
        queueStatus={queueStatus}
      />
    </div>
  )
}
