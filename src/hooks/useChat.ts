import { useState, useCallback, useRef, useEffect } from 'react'
import { useMimo } from './useMimo'
import { debug } from '@/lib/debug'
import {
  MAX_MESSAGES,
  MAX_UNDO_HISTORY,
  STREAMING_TIMEOUT_MS,
  AGENT_TIMEOUT_MS,
} from '@/lib/constants'
import {
  Message,
  Attachment,
  handleEvent,
  createUserMessage,
  createAssistantMessage,
  handleError,
} from './useBaseChat'

export type { Message, Attachment } from './useBaseChat'

interface UseChatOptions {
  externalMessages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
  tabId?: string
}

export function useChat(options?: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [queueStatus, setQueueStatus] = useState({
    queueLength: 0,
    isProcessing: false,
    currentMessageId: null as string | null,
  })
  const { invoke, subscribe } = useMimo()
  const currentToolCallRef = useRef<import('../types/tool').ToolCall | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRef = useRef<Message[][]>([])
  const maxHistory = MAX_UNDO_HISTORY
  const [canUndo, setCanUndo] = useState(false)
  const activeTabIdRef = useRef(options?.tabId)

  useEffect(() => {
    activeTabIdRef.current = options?.tabId
  }, [options?.tabId])

  const updateMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const trimmed = next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
      return trimmed
    })
  }, [])

  const pushHistory = useCallback((msgs: Message[]) => {
    historyRef.current.push(msgs)
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift()
    }
    setCanUndo(true)
  }, [])

  const messagesRef = useRef<Message[]>([])
  messagesRef.current = messages
  const syncingFromExternalRef = useRef(false)

  useEffect(() => {
    if (options?.externalMessages) {
      syncingFromExternalRef.current = true
      setMessages(options.externalMessages)
      if (!isStreaming) {
        setIsStreaming(false)
      }
    }
  }, [options?.externalMessages])

  useEffect(() => {
    if (syncingFromExternalRef.current) {
      syncingFromExternalRef.current = false
      return
    }
    if (activeTabIdRef.current === options?.tabId && messages.length > 0) {
      options?.onMessagesChange?.(messages)
    }
  }, [messages, options?.onMessagesChange, options?.tabId])

  const cleanupSubscription = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current)
      streamingTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await invoke({ action: 'get_queue_status' })
        if (status && typeof status === 'object') {
          setQueueStatus((prev) => {
            if (
              prev.queueLength === status.queueLength &&
              prev.isProcessing === status.isProcessing &&
              prev.currentMessageId === status.currentMessageId
            ) {
              return prev
            }
            return status
          })
        }
      } catch (err: unknown) {
        debug.error('Failed to poll queue status:', err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [invoke])

  const startStreaming = useCallback(
    (timeoutMs: number = STREAMING_TIMEOUT_MS) => {
      setIsStreaming(true)

      const unsub = subscribe((event) => {
        updateMessages((prev) => {
          const result = handleEvent(
            event,
            prev,
            currentToolCallRef.current,
            cleanupSubscription,
            setIsStreaming
          )
          currentToolCallRef.current = result.toolCall
          return result.messages
        })
      })

      unsubRef.current = unsub

      if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current)
      streamingTimeoutRef.current = setTimeout(() => {
        cleanupSubscription()
        setIsStreaming(false)
        updateMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.status === 'streaming') {
            return [
              ...prev.slice(0, -1),
              { ...last, status: 'error', content: last.content + '\n\n[超时：AI 响应超时]' },
            ]
          }
          return prev
        })
      }, timeoutMs)

      return unsub
    },
    [subscribe, cleanupSubscription, updateMessages]
  )

  const handleStreamingError = useCallback(
    (err: any, unsub: () => void) => {
      unsub()
      unsubRef.current = null
      setIsStreaming(false)
      updateMessages((prev) => handleError(err, prev))
    },
    [updateMessages]
  )

  const send = useCallback(
    async (
      content: string,
      sessionId?: string,
      attachments?: Attachment[],
      agentMode?: boolean
    ) => {
      cleanupSubscription()
      pushHistory(messagesRef.current)
      updateMessages((prev) => [
        ...prev,
        createUserMessage(content, attachments),
        createAssistantMessage(),
      ])

      const unsub = startStreaming(agentMode ? AGENT_TIMEOUT_MS : STREAMING_TIMEOUT_MS)

      try {
        await invoke({
          action: 'send_message',
          message: content,
          sessionId,
          attachments,
          agentMode,
        })
      } catch (err: any) {
        handleStreamingError(err, unsub)
      }
    },
    [invoke, cleanupSubscription, updateMessages, startStreaming, handleStreamingError]
  )

  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current)
    }
  }, [])

  const cancel = useCallback(() => {
    cleanupSubscription()
    setIsStreaming(false)
    invoke({ action: 'cancel' }).catch(debug.error)
  }, [invoke, cleanupSubscription])

  const clearMessages = useCallback(() => {
    cleanupSubscription()
    updateMessages([])
    setIsStreaming(false)
  }, [cleanupSubscription, updateMessages])

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      cleanupSubscription()
      pushHistory(messagesRef.current)

      updateMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === messageId)
        if (idx === -1) return prev
        const truncated = prev.slice(0, idx)
        return [...truncated, { ...prev[idx], content: newContent }, createAssistantMessage()]
      })

      const unsub = startStreaming()

      try {
        await invoke({ action: 'send_message', message: newContent })
      } catch (err: any) {
        handleStreamingError(err, unsub)
      }
    },
    [invoke, cleanupSubscription, updateMessages, startStreaming, handleStreamingError]
  )

  const regenerate = useCallback(() => {
    cleanupSubscription()
    setIsStreaming(false)

    let lastUserContent = ''
    updateMessages((prev) => {
      let lastUserIdx = -1
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === 'user') {
          lastUserIdx = i
          break
        }
      }
      if (lastUserIdx === -1) return prev

      lastUserContent = prev[lastUserIdx].content
      const trimmed = prev.slice(0, lastUserIdx + 1)
      return [...trimmed, createAssistantMessage()]
    })

    if (!lastUserContent) return

    requestAnimationFrame(() => {
      const unsub = startStreaming()

      invoke({ action: 'send_message', message: lastUserContent }).catch((err: any) => {
        handleStreamingError(err, unsub)
      })
    })
  }, [invoke, cleanupSubscription, updateMessages, startStreaming, handleStreamingError])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return false
    cleanupSubscription()
    const prevMessages = historyRef.current.pop()!
    updateMessages(prevMessages)
    setIsStreaming(false)
    setCanUndo(historyRef.current.length > 0)
    return true
  }, [cleanupSubscription, updateMessages])

  return {
    messages,
    send,
    cancel,
    clearMessages,
    editMessage,
    regenerate,
    undo,
    canUndo,
    isStreaming,
    queueStatus,
  }
}
