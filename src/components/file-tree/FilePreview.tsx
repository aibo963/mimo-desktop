import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { X, Copy, Check, FileText } from 'lucide-react'
import { debug } from '@/lib/debug'

interface FilePreviewProps {
  filePath: string
  onClose?: () => void
}

const LSP_LANGUAGES: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'javascript',
  typescriptreact: 'typescript',
  javascriptreact: 'javascript',
}

export function FilePreview({ filePath, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [language, setLanguage] = useState('plaintext')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { invoke } = useMimo()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const cancelRef = useRef(false)
  const lspStartedRef = useRef<Set<string>>(new Set())

  const fileName = filePath.split(/[/\\]/).pop() || filePath

  useEffect(() => {
    cancelRef.current = false
    const loadFile = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await invoke({ action: 'read_file', filePath })
        if (cancelRef.current) return
        if (result?.content) {
          setContent(result.content)
          setLanguage(result.language || 'plaintext')

          const lspLang = LSP_LANGUAGES[result.language || '']
          if (lspLang && !lspStartedRef.current.has(lspLang)) {
            lspStartedRef.current.add(lspLang)
            invoke({ action: 'lsp_start', language: lspLang }).catch(debug.error)
          }
          if (lspLang) {
            invoke({
              action: 'lsp_open_file',
              filePath,
              content: result.content,
              language: lspLang,
            }).catch(debug.error)
          }
        } else if (result?.content === null) {
          setError('文件过大（>1MB），无法预览')
        } else {
          setError('无法读取文件')
        }
      } catch (err: any) {
        if (cancelRef.current) return
        setError(err.message || '读取文件失败')
      } finally {
        if (!cancelRef.current) setLoading(false)
      }
    }
    loadFile()
    return () => {
      cancelRef.current = true
    }
  }, [filePath, invoke])

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = useCallback(() => {
    if (content) {
      navigator.clipboard.writeText(content).catch((err) => {
        debug.error('Failed to copy:', err)
      })
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }, [content])

  const lines = useMemo(() => content?.split('\n') || [], [content])

  return (
    <div className="h-full flex flex-col bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-mono text-zinc-300">{fileName}</span>
          <span className="text-xs text-zinc-500">{language}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-400 dark:text-zinc-400 text-gray-500"
            title="复制内容"
            aria-label={copied ? '已复制' : '复制内容'}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-400 dark:text-zinc-400 text-gray-500"
              title="关闭"
              aria-label="关闭预览"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-500 text-gray-400">
            加载中...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400">{error}</div>
        ) : content ? (
          <div className="flex">
            <div className="flex-shrink-0 py-3 pr-3 pl-3 text-right select-none" aria-hidden="true">
              {lines.map((_, i) => (
                <div key={i} className="text-xs text-zinc-600 leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
            <pre className="flex-1 p-3 text-sm text-zinc-300 dark:text-zinc-300 text-gray-700 font-mono whitespace-pre overflow-x-auto">
              {content}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="px-3 py-1 border-t border-zinc-800 dark:border-zinc-800 border-gray-200 text-xs text-zinc-500 dark:text-zinc-500 text-gray-400">
        {lines.length} 行 • {content?.length || 0} 字符
      </div>
    </div>
  )
}
