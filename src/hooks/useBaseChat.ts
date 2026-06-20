import { MimoEvent } from '../../electron/types/ipc'
import type { ToolCall } from '../types/tool'

export interface Attachment {
  name: string
  type: string
  size: number
  dataUrl?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  status: 'pending' | 'streaming' | 'done' | 'error' | 'queued'
  timestamp: number
  queuePosition?: number
  isThinking?: boolean
  attachments?: Attachment[]
}

export interface ChatCallbacks {
  onSend: (content: string, sessionId?: string) => Promise<void>
  onCancel?: (sessionId?: string) => Promise<void>
}

export interface UseBaseChatOptions {
  sessionId?: string | null
  subscribe: (cb: (event: MimoEvent) => void) => () => void
  callbacks: ChatCallbacks
}

function extractText(event: MimoEvent): string {
  return event.data?.content || event.data?.text || event.data?.part?.text || ''
}

function extractToolCall(event: MimoEvent): ToolCall {
  const stateStatus = event.data?.state?.status || event.data?.part?.state?.status
  let status: ToolCall['status'] = 'running'
  if (stateStatus === 'completed' || stateStatus === 'done') status = 'done'
  else if (stateStatus === 'error') status = 'error'

  return {
    id: event.data?.id || event.data?.callID || event.data?.part?.id || crypto.randomUUID(),
    name: event.data?.name || event.data?.tool || event.data?.part?.tool || 'unknown',
    input: event.data?.input || event.data?.params || event.data?.part?.input || {},
    output: event.data?.output || event.data?.part?.output,
    status,
  }
}

function extractToolResult(event: MimoEvent): string {
  return (
    event.data?.output ||
    event.data?.result ||
    event.data?.part?.output ||
    JSON.stringify(event.data)
  )
}

function extractErrorMessage(event: MimoEvent): string {
  return event.data?.message || 'Unknown error'
}

export function handleEvent(
  event: MimoEvent,
  messages: Message[],
  currentToolCall: ToolCall | null,
  cleanupSubscription: () => void,
  setIsStreaming: (v: boolean) => void
): { messages: Message[]; toolCall: ToolCall | null } {
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant') return { messages, toolCall: currentToolCall }

  let updatedMessages: Message[]
  let newToolCall = currentToolCall

  switch (event.type) {
    case 'text': {
      updatedMessages = [
        ...messages.slice(0, -1),
        {
          ...last,
          content: last.content + extractText(event),
          status: 'streaming',
          isThinking: event.data?.isThinking || false,
        },
      ]
      break
    }

    case 'tool_use': {
      const tc = extractToolCall(event)
      newToolCall = tc
      updatedMessages = [
        ...messages.slice(0, -1),
        {
          ...last,
          toolCalls: [...(last.toolCalls || []), tc],
          status: 'streaming',
        },
      ]
      break
    }

    case 'tool_result': {
      const resultId =
        event.data?.id || event.data?.callID || event.data?.part?.id || currentToolCall?.id
      const updated = (last.toolCalls || []).map((tc) => {
        if (tc.id === resultId || (tc.status === 'running' && !resultId)) {
          return { ...tc, output: extractToolResult(event), status: 'done' as const }
        }
        return tc
      })
      if (resultId === currentToolCall?.id) {
        newToolCall = null
      }
      updatedMessages = [
        ...messages.slice(0, -1),
        { ...last, toolCalls: updated, status: 'streaming' },
      ]
      break
    }

    case 'step_finish': {
      updatedMessages = [...messages.slice(0, -1), { ...last, status: 'done', isThinking: false }]
      break
    }

    case 'error': {
      updatedMessages = [
        ...messages.slice(0, -1),
        {
          ...last,
          status: 'error',
          content: last.content + '\n\n[Error: ' + extractErrorMessage(event) + ']',
        },
      ]
      break
    }

    case 'done': {
      cleanupSubscription()
      setIsStreaming(false)
      updatedMessages = [
        ...messages.slice(0, -1),
        {
          ...last,
          status: last.status === 'error' ? 'error' : 'done',
          isThinking: false,
        },
      ]
      break
    }

    case 'session_update': {
      if (event.data?.action === 'queued') {
        updatedMessages = [
          ...messages.slice(0, -1),
          {
            ...last,
            status: 'queued',
            queuePosition: event.data.queuePosition,
          },
        ]
      } else if (event.data?.action === 'processing') {
        updatedMessages = [...messages.slice(0, -1), { ...last, status: 'streaming' }]
      } else {
        return { messages, toolCall: currentToolCall }
      }
      break
    }

    default:
      return { messages, toolCall: currentToolCall }
  }

  return { messages: updatedMessages, toolCall: newToolCall }
}

export function createUserMessage(content: string, attachments?: Attachment[]): Message {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    status: 'done',
    timestamp: Date.now(),
    attachments: attachments && attachments.length > 0 ? attachments : undefined,
  }
}

export function createAssistantMessage(): Message {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    toolCalls: [],
    status: 'queued',
    timestamp: Date.now(),
  }
}

export function handleError(err: any, messages: Message[]): Message[] {
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant') return messages
  return [
    ...messages.slice(0, -1),
    {
      ...last,
      status: 'error',
      content: last.content + '\n\n[Error: ' + err.message + ']',
    },
  ]
}
