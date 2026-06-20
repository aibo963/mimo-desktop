import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { Send, Square, Loader2, FileText, Paperclip, Mic, MicOff } from 'lucide-react'
import { CommandMenu, Command } from './CommandMenu'
import { TemplateMenu } from './TemplateMenu'
import { FileMentionMenu } from './FileMentionMenu'
import { AttachmentPreview } from './AttachmentPreview'
import { useToastStore } from '@/stores/toastStore'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { Attachment } from '@/hooks/useChat'
import { MAX_FILE_CONTENT_LENGTH } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface QueueStatus {
  queueLength: number
  isProcessing: boolean
  currentMessageId: string | null
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void
  onCancel: () => void
  isStreaming: boolean
  onClear: () => void
  onExport: () => void
  onFocusModel: () => void
  onUndo?: () => void
  onToggleAgent?: () => void
  onSearch?: () => void
  onHistory?: () => void
  onSettings?: () => void
  queueStatus?: QueueStatus
}

interface FileMention {
  name: string
  path: string
  content: string
}

function isImageType(type: string): boolean {
  return type.startsWith('image/')
}

function readFileAsAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: isImageType(file.type) ? (reader.result as string) : undefined,
      })
    }
    if (isImageType(file.type)) {
      reader.readAsDataURL(file)
    } else {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
      })
    }
  })
}

export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  onClear,
  onExport,
  onFocusModel,
  onUndo,
  onToggleAgent,
  onSearch,
  onHistory,
  onSettings,
  queueStatus,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [fileMentions, setFileMentions] = useState<FileMention[]>([])
  const [showFileMention, setShowFileMention] = useState(false)
  const [fileMentionQuery, setFileMentionQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToastStore()

  const {
    isListening,
    isSupported: voiceSupported,
    interimTranscript,
    toggleListening,
  } = useVoiceInput({
    onResult: (text) => {
      setInput((prev) => (prev ? prev + ' ' + text : text))
    },
    onError: (error) => {
      addToast(error, 'error')
    },
  })

  const showCommandMenu = input.startsWith('/')

  const handleFileMentionSelect = useCallback(
    async (file: { name: string; path: string }) => {
      try {
        const result = await window.mimoAPI.invoke({ action: 'read_file', filePath: file.path })
        if (result && result.content) {
          const truncated =
            result.content.length > 5000
              ? result.content.slice(0, 5000) + '\n... (文件内容过长，已截断)'
              : result.content

          setFileMentions((prev) => [
            ...prev,
            {
              name: file.name,
              path: file.path,
              content: truncated,
            },
          ])

          const mentionTag = `@${file.name}`
          setInput((prev) => {
            const atIdx = prev.lastIndexOf('@')
            if (atIdx >= 0) {
              return prev.slice(0, atIdx) + mentionTag + ' '
            }
            return prev + mentionTag + ' '
          })

          addToast(`已添加文件: ${file.name}`, 'success')
        } else {
          addToast('无法读取文件内容', 'error')
        }
      } catch (err: any) {
        addToast(`读取文件失败: ${err.message}`, 'error')
      }

      setShowFileMention(false)
      setFileMentionQuery('')
      textareaRef.current?.focus()
    },
    [addToast]
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)

    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0 && (lastAt === 0 || value[lastAt - 1] === ' ' || value[lastAt - 1] === '\n')) {
      const query = value.slice(lastAt + 1)
      if (!query.includes(' ') || query.length < 20) {
        setShowFileMention(true)
        setFileMentionQuery(query)
        return
      }
    }
    setShowFileMention(false)
    setFileMentionQuery('')
  }, [])

  const handleSend = useCallback(() => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return

    let finalMessage = input.trim() || ' '

    if (fileMentions.length > 0) {
      const fileContext = fileMentions
        .map((m) => `\n\n--- 文件: ${m.path} ---\n${m.content}\n--- 文件结束 ---`)
        .join('')
      finalMessage += fileContext
    }

    const currentAttachments = attachments.length > 0 ? attachments : undefined
    onSend(finalMessage, currentAttachments)
    setInput('')
    setAttachments([])
    setFileMentions([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isStreaming, onSend, attachments, fileMentions])

  const handleCommandSelect = useCallback(
    (command: Command) => {
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      switch (command.name) {
        case '/clear':
          onClear()
          break
        case '/export':
          onExport()
          break
        case '/model':
          onFocusModel()
          break
        case '/agent':
          onToggleAgent?.()
          break
        case '/file':
          setInput('@')
          break
        case '/template':
          setShowTemplateMenu(true)
          break
        case '/search':
          onSearch?.()
          break
        case '/history':
          onHistory?.()
          break
        case '/settings':
          onSettings?.()
          break
        case '/help':
          addToast(
            '可用命令: /clear 清空 | /export 导出 | /model 模型 | /agent Agent | /file 文件 | /template 模板 | /search 搜索 | /history 历史 | /settings 设置',
            'info'
          )
          break
      }
    },
    [onClear, onExport, onFocusModel, onToggleAgent, onSearch, onHistory, onSettings, addToast]
  )

  const handleCommandClose = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleTemplateSelect = useCallback((content: string) => {
    setInput(content)
    setShowTemplateMenu(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(content.length, content.length)
      }, 0)
    }
  }, [])

  const handleTemplateClose = useCallback(() => {
    setShowTemplateMenu(false)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const addFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => isImageType(f.type))
      const otherFiles = files.filter((f) => !isImageType(f.type))

      if (imageFiles.length > 5) {
        addToast('最多同时添加 5 张图片', 'error')
        return
      }

      const newAttachments = await Promise.all(
        [...imageFiles, ...otherFiles].map(readFileAsAttachment)
      )
      setAttachments((prev) => [...prev, ...newAttachments])
    },
    [addToast]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      addFiles(files)
      e.target.value = ''
    },
    [addFiles]
  )

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('application/x-mimo-file')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const fileData = e.dataTransfer.getData('application/x-mimo-file')
      if (fileData) {
        try {
          const file = JSON.parse(fileData)
          const result = await window.mimoAPI.invoke({ action: 'read_file', filePath: file.path })
          if (result && result.content) {
            const truncated =
              result.content.length > MAX_FILE_CONTENT_LENGTH
                ? result.content.slice(0, MAX_FILE_CONTENT_LENGTH) + '\n... (文件内容过长，已截断)'
                : result.content

            setFileMentions((prev) => [
              ...prev,
              {
                name: file.name,
                path: file.path,
                content: truncated,
              },
            ])

            setInput((prev) => prev + `@${file.name} `)
            addToast(`已添加文件: ${file.name}`, 'success')
          }
        } catch (err: any) {
          addToast(`读取文件失败: ${err.message}`, 'error')
        }
        return
      }

      const files = Array.from(e.dataTransfer.files)
      addFiles(files)
    },
    [addFiles, addToast]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items)
      const imageFiles: File[] = []

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            imageFiles.push(file)
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault()
        addFiles(imageFiles)
      }
    },
    [addFiles]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (showCommandMenu) return
        handleSend()
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (input.trim()) return
        e.preventDefault()
        onUndo?.()
      }
    },
    [handleSend, showCommandMenu, input, onUndo]
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [])

  const getPlaceholder = () => {
    if (isStreaming) return '正在处理中...'
    if (queueStatus?.isProcessing && queueStatus?.queueLength > 0) {
      return `队列中还有 ${queueStatus.queueLength} 条消息`
    }
    return '输入消息... (Enter 发送，支持粘贴图片)'
  }

  return (
    <div className="border-t border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 p-3 shrink-0">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv,.xlsx,.doc,.docx"
          className="hidden"
          aria-hidden="true"
        />
        <button
          onClick={handleAttachClick}
          disabled={isStreaming}
          className="p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 transition-colors text-zinc-500 dark:text-zinc-500 text-gray-500 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          title="添加附件 (图片/文件)"
          aria-label="添加附件"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <div className="flex-1 relative" role="group" aria-label="消息输入区域">
          <CommandMenu
            query={input}
            onSelect={handleCommandSelect}
            onClose={handleCommandClose}
            visible={showCommandMenu}
          />
          <TemplateMenu
            onSelect={handleTemplateSelect}
            onClose={handleTemplateClose}
            visible={showTemplateMenu}
          />
          {attachments.length > 0 && (
            <div className="mb-2 px-1">
              <AttachmentPreview attachments={attachments} onRemove={handleRemoveAttachment} />
            </div>
          )}
          {fileMentions.length > 0 && (
            <div className="mb-2 px-1 flex flex-wrap gap-1">
              {fileMentions.map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/20 border border-emerald-600/30 text-xs text-emerald-400"
                >
                  <FileText className="w-3 h-3" />
                  {m.name}
                  <button
                    onClick={() => setFileMentions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-1 hover:text-emerald-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <FileMentionMenu
              query={fileMentionQuery}
              onSelect={handleFileMentionSelect}
              onClose={() => {
                setShowFileMention(false)
                textareaRef.current?.focus()
              }}
              visible={showFileMention}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePaste}
              placeholder={getPlaceholder()}
              className="w-full min-h-[44px] max-h-[160px] resize-none bg-zinc-900 dark:bg-zinc-900 bg-white border border-zinc-800 dark:border-zinc-800 border-gray-200 rounded-xl pl-4 pr-4 py-3 text-sm text-zinc-100 dark:text-zinc-100 text-gray-800 focus:outline-none focus:border-zinc-600 transition-colors placeholder-zinc-600 dark:placeholder-zinc-600 placeholder-gray-400"
              rows={1}
              aria-label="消息输入框"
              aria-describedby="input-hints"
              aria-disabled={isStreaming}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </div>
        </div>
        <button
          onClick={() => setShowTemplateMenu(!showTemplateMenu)}
          disabled={isStreaming}
          className="p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 transition-colors text-zinc-500 dark:text-zinc-500 text-gray-500 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          title="使用模板"
          aria-label="使用模板"
        >
          <FileText className="w-4 h-4" />
        </button>
        {voiceSupported && (
          <button
            onClick={toggleListening}
            disabled={isStreaming}
            className={cn(
              'p-2 rounded-xl transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed',
              isListening
                ? 'bg-red-600/20 text-red-400 animate-pulse'
                : 'hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 dark:text-zinc-500 text-gray-500'
            )}
            title={isListening ? '停止录音' : '语音输入'}
            aria-label={isListening ? '停止录音' : '语音输入'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 transition-colors shrink-0"
            title="停止生成"
            aria-label="停止生成"
          >
            <Square className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs text-red-400">停止</span>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() && attachments.length === 0}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            title="发送消息"
            aria-label="发送消息"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="max-w-4xl mx-auto mt-1 h-3">
        {focused && !isStreaming && (
          <span id="input-hints" className="text-[10px] text-zinc-600">
            Shift+Enter 换行 · Ctrl+V 粘贴图片 · @ 引用文件
            {voiceSupported ? ' · 点击麦克风语音输入' : ''}
          </span>
        )}
      </div>

      {isListening && interimTranscript && (
        <div className="max-w-4xl mx-auto mt-1 px-2">
          <span className="text-[10px] text-emerald-400 italic">{interimTranscript}</span>
        </div>
      )}

      {isListening && !interimTranscript && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-zinc-500">正在聆听...</span>
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
          <span className="text-[10px] text-zinc-500">AI 正在思考...</span>
        </div>
      )}

      {!isStreaming && queueStatus?.isProcessing && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
          <span className="text-[10px] text-zinc-500">
            处理中... {queueStatus?.queueLength > 0 && `(${queueStatus.queueLength} 条排队)`}
          </span>
        </div>
      )}
    </div>
  )
}
