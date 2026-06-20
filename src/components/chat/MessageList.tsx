import { useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { Message } from '@/hooks/useChat'

interface MessageListProps {
  messages: Message[]
  highlightMessageId?: string | null
  onRegenerate?: (messageIndex: number) => void
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>
  onDeleteMessage?: (messageId: string) => void
}

export function MessageList({
  messages,
  highlightMessageId,
  onRegenerate,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevLengthRef = useRef(messages.length)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      isAtBottomRef.current = atBottom
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    if (messages.length > prevLengthRef.current && isAtBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
    prevLengthRef.current = messages.length
  }, [messages.length])

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto"
      role="log"
      aria-label="消息列表"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">M</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Mimo Desktop</h2>
            <p className="text-zinc-400 dark:text-zinc-400 text-gray-500">输入消息开始对话</p>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="space-y-4">
            {messages.map((msg) => {
              return (
                <div key={msg.id} id={`message-${msg.id}`}>
                  <MessageBubble
                    message={msg}
                    isHighlighted={msg.id === highlightMessageId}
                    onRegenerate={
                      msg.role === 'assistant' && msg.status === 'done' && onRegenerate
                        ? () => onRegenerate(messages.indexOf(msg))
                        : undefined
                    }
                    onEdit={
                      msg.role === 'user' && msg.status === 'done' && onEditMessage
                        ? (newContent) => onEditMessage(msg.id, newContent)
                        : undefined
                    }
                    onDelete={onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
