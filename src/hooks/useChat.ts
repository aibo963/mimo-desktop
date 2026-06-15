import { useState, useCallback, useRef, useEffect } from 'react'
import { useMimo } from './useMimo'
import { MimoEvent } from '../../electron/types/ipc'

export interface ToolCall {
  id: string
  name: string
  input: Record<string, any>
  output?: string
  status: 'pending' | 'running' | 'done' | 'error' | 'denied'
  duration?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  status: 'pending' | 'streaming' | 'done' | 'error' | 'queued'
  timestamp: number
  queuePosition?: number
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [queueStatus, setQueueStatus] = useState({ queueLength: 0, isProcessing: false, currentMessageId: null })
  const { invoke, subscribe } = useMimo()
  const currentToolCall = useRef<ToolCall | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await invoke({ action: 'get_queue_status' as any })
        setQueueStatus(status)
      } catch {}
    }, 1000)

    return () => clearInterval(interval)
  }, [invoke])

  const send = useCallback(async (content: string, sessionId?: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      status: 'done',
      timestamp: Date.now(),
    }
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      toolCalls: [],
      status: 'queued',
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    const unsub = subscribe((event: MimoEvent) => {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (!last || last.role !== 'assistant') return prev

        switch (event.type) {
          case 'text': {
            const textContent = event.data.content || event.data.text || ''
            return [...prev.slice(0, -1), {
              ...last,
              content: last.content + textContent,
              status: 'streaming',
            }]
          }

          case 'tool_use': {
            const toolCall: ToolCall = {
              id: event.data.callID || event.data.id || crypto.randomUUID(),
              name: event.data.tool || event.data.name || 'unknown',
              input: event.data.input || event.data.params || {},
              status: 'running',
            }
            currentToolCall.current = toolCall
            return [...prev.slice(0, -1), {
              ...last,
              toolCalls: [...(last.toolCalls || []), toolCall],
              status: 'streaming',
            }]
          }

          case 'tool_result': {
            const toolCalls = last.toolCalls || []
            const updated = toolCalls.map(tc => {
              if (tc.id === currentToolCall.current?.id) {
                return {
                  ...tc,
                  output: event.data.output || event.data.result || JSON.stringify(event.data),
                  status: 'done' as const,
                }
              }
              return tc
            })
            currentToolCall.current = null
            return [...prev.slice(0, -1), { ...last, toolCalls: updated, status: 'streaming' }]
          }

          case 'step_finish': {
            return [...prev.slice(0, -1), {
              ...last,
              status: 'done',
            }]
          }

          case 'error': {
            return [...prev.slice(0, -1), {
              ...last,
              status: 'error',
              content: last.content + '\n\n[Error: ' + (event.data.message || 'Unknown error') + ']',
            }]
          }

          case 'done': {
            unsubRef.current?.()
            unsubRef.current = null
            setIsStreaming(false)
            return [...prev.slice(0, -1), {
              ...last,
              status: last.status === 'error' ? 'error' : 'done',
            }]
          }

          case 'session_update': {
            if (event.data.action === 'queued') {
              return [...prev.slice(0, -1), {
                ...last,
                status: 'queued',
                queuePosition: event.data.queuePosition,
              }]
            }
            if (event.data.action === 'processing') {
              return [...prev.slice(0, -1), {
                ...last,
                status: 'streaming',
              }]
            }
            return prev
          }

          default:
            return prev
        }
      })
    })

    unsubRef.current = unsub

    try {
      await invoke({ action: 'send_message', message: content, sessionId })
    } catch (err: any) {
      unsub()
      unsubRef.current = null
      setIsStreaming(false)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (!last || last.role !== 'assistant') return prev
        return [...prev.slice(0, -1), {
          ...last,
          status: 'error',
          content: last.content + '\n\n[Error: ' + err.message + ']',
        }]
      })
    }
  }, [invoke, subscribe])

  const cancel = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
    setIsStreaming(false)
    invoke({ action: 'cancel' })
  }, [invoke])

  const clearMessages = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
    setMessages([])
    setIsStreaming(false)
  }, [])

  return { messages, send, cancel, clearMessages, isStreaming, queueStatus }
}
