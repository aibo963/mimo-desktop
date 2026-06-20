import { useCallback, useEffect, useMemo, useRef } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModelSelectorInline } from './ModelSelectorInline'
import { AgentIndicator, AgentToggle } from './AgentIndicator'
import { useChat, Message } from '@/hooks/useChat'
import { useTabStore } from '@/stores/tabStore'
import { useThemeStore } from '@/stores/themeStore'
import { useConfirm } from '@/hooks/useConfirm'
import { useNotification } from '@/hooks/useNotification'
import { TOKEN_CHARS_RATIO, COST_PER_MILLION_TOKENS, MAX_TAB_TITLE_LENGTH } from '@/lib/constants'
import { Trash2, Download, Sun, Moon } from 'lucide-react'

interface ChatPanelProps {
  highlightMessageId?: string | null
  clearChatRef?: React.MutableRefObject<(() => void) | null>
  onSearch?: () => void
  onHistory?: () => void
  onSettings?: () => void
}

export function ChatPanel({
  highlightMessageId,
  clearChatRef,
  onSearch,
  onHistory,
  onSettings,
}: ChatPanelProps) {
  const { activeTabId, getActiveTab, updateMessages, deleteMessage, renameTab, setAgentMode } =
    useTabStore()
  const activeTab = getActiveTab()

  const titleRef = useRef(activeTab?.title)
  titleRef.current = activeTab?.title

  const handleMessagesChange = useCallback(
    (messages: Message[]) => {
      if (activeTabId) {
        updateMessages(activeTabId, messages)
        const firstUserMsg = messages.find((m) => m.role === 'user')
        if (firstUserMsg && titleRef.current === '新对话') {
          const title =
            firstUserMsg.content.slice(0, MAX_TAB_TITLE_LENGTH) +
            (firstUserMsg.content.length > MAX_TAB_TITLE_LENGTH ? '...' : '')
          renameTab(activeTabId, title)
        }
      }
    },
    [activeTabId, updateMessages, renameTab]
  )

  const chat = useChat({
    externalMessages: activeTab?.messages,
    onMessagesChange: handleMessagesChange,
    tabId: activeTabId,
  })

  const { theme, toggle } = useThemeStore()
  const modelSelectorRef = useRef<HTMLDivElement>(null)
  const { confirm } = useConfirm()
  const { notify } = useNotification()
  const prevStreamingRef = useRef(chat.isStreaming)

  const agentMode = activeTab?.agentMode ?? false

  const handleSend = useCallback(
    (
      content: string,
      attachments?: Array<{ name: string; type: string; size: number; dataUrl?: string }>
    ) => {
      chat.send(content, undefined, attachments, agentMode)
    },
    [chat, agentMode]
  )

  const handleClear = useCallback(() => {
    if (chat.messages.length === 0) return
    if (confirm('确定要清空当前对话吗？此操作不可撤销。')) {
      chat.clearMessages()
    }
  }, [chat, chat.messages.length, confirm])

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (activeTabId) {
        deleteMessage(activeTabId, messageId)
      }
    },
    [activeTabId, deleteMessage]
  )

  useEffect(() => {
    if (clearChatRef) {
      clearChatRef.current = handleClear
    }
    return () => {
      if (clearChatRef) {
        clearChatRef.current = null
      }
    }
  }, [clearChatRef, handleClear])

  const tokenEstimate = useMemo(() => {
    const totalChars = chat.messages.reduce((sum, m) => sum + m.content.length, 0)
    const tokens = Math.ceil(totalChars * TOKEN_CHARS_RATIO)
    const cost = (tokens / 1000000) * COST_PER_MILLION_TOKENS
    return { tokens, cost }
  }, [chat.messages])

  const handleExport = useCallback(() => {
    if (chat.messages.length === 0) return

    const timestamp = new Date().toISOString()
    const dateStr = new Date().toISOString().slice(0, 10)

    let markdown = `# 对话导出\n\n`
    markdown += `**时间**: ${timestamp}\n`
    markdown += `**Token估算**: ~${tokenEstimate.tokens} tokens (约$${tokenEstimate.cost.toFixed(2)})\n\n`
    markdown += `---\n\n`

    chat.messages.forEach((message) => {
      const role = message.role === 'user' ? 'User' : 'Assistant'
      markdown += `## ${role}\n\n${message.content}\n\n---\n\n`
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${dateStr}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [chat.messages, tokenEstimate])

  const handleFocusModel = useCallback(() => {
    modelSelectorRef.current?.querySelector('button')?.click()
  }, [])

  const handleAgentToggle = useCallback(
    (enabled: boolean) => {
      if (activeTabId) {
        setAgentMode(activeTabId, enabled)
      }
    },
    [activeTabId, setAgentMode]
  )

  const handleToggleAgent = useCallback(() => {
    handleAgentToggle(!agentMode)
  }, [agentMode, handleAgentToggle])

  const lastAssistantMsg = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      if (chat.messages[i].role === 'assistant' && chat.messages[i].status === 'done') {
        return chat.messages[i]
      }
    }
    return null
  }, [chat.messages])

  useEffect(() => {
    if (prevStreamingRef.current && !chat.isStreaming && lastAssistantMsg) {
      const preview =
        lastAssistantMsg.content.slice(0, 50) + (lastAssistantMsg.content.length > 50 ? '...' : '')
      notify('Mimo Desktop', { body: preview || 'AI 已完成回复' })
    }
    prevStreamingRef.current = chat.isStreaming
  }, [chat.isStreaming, lastAssistantMsg, notify])

  return (
    <div className="flex flex-col h-full bg-zinc-950 dark:bg-zinc-950 bg-white">
      <div className="flex items-center justify-between px-4 h-11 border-b border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-zinc-300 truncate">{activeTab?.title || '新对话'}</span>
          {chat.messages.length > 0 && (
            <span className="text-[10px] text-zinc-500">
              ~
              {tokenEstimate.tokens >= 1000
                ? `${(tokenEstimate.tokens / 1000).toFixed(1)}k`
                : tokenEstimate.tokens}{' '}
              tokens · ${tokenEstimate.cost.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div ref={modelSelectorRef}>
            <ModelSelectorInline />
          </div>
          <AgentToggle
            enabled={agentMode}
            onToggle={handleAgentToggle}
            disabled={chat.isStreaming}
          />
          <button
            onClick={toggle}
            className="p-1.5 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 transition-colors text-zinc-500 dark:text-zinc-500 text-gray-500"
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleExport}
            disabled={chat.messages.length === 0}
            className="p-1.5 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 transition-colors text-zinc-500 dark:text-zinc-500 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="导出对话"
            aria-label="导出对话"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 transition-colors text-zinc-500 dark:text-zinc-500 text-gray-500"
            title="清空当前对话"
            aria-label="清空当前对话"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <AgentIndicator
        isActive={agentMode}
        isProcessing={activeTab?.agentProcessing}
        steps={activeTab?.agentSteps}
        currentStep={activeTab?.agentCurrentStep}
      />
      <MessageList
        messages={chat.messages}
        highlightMessageId={highlightMessageId}
        onRegenerate={() => {
          chat.regenerate()
        }}
        onEditMessage={chat.editMessage}
        onDeleteMessage={handleDeleteMessage}
      />
      <ChatInput
        onSend={handleSend}
        onCancel={chat.cancel}
        isStreaming={chat.isStreaming}
        onClear={handleClear}
        onExport={handleExport}
        onFocusModel={handleFocusModel}
        onUndo={chat.undo}
        onToggleAgent={handleToggleAgent}
        onSearch={onSearch}
        onHistory={onHistory}
        onSettings={onSettings}
      />
    </div>
  )
}
