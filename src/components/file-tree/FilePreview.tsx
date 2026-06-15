import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { X, Copy, Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  filePath: string
  onClose?: () => void
}

export function FilePreview({ filePath, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null)
  const [language, setLanguage] = useState('plaintext')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { invoke } = useMimo()

  const fileName = filePath.split(/[/\\]/).pop() || filePath

  useEffect(() => {
    loadFile()
  }, [filePath])

  const loadFile = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await invoke({ action: 'read_file', filePath })
      if (result?.content) {
        setContent(result.content)
        setLanguage(result.language || 'plaintext')
      } else if (result?.content === null) {
        setError('文件过大（>1MB），无法预览')
      } else {
        setError('无法读取文件')
      }
    } catch (err: any) {
      setError(err.message || '读取文件失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const lines = content?.split('\n') || []

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-mono text-zinc-300">{fileName}</span>
          <span className="text-xs text-zinc-500">{language}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
            title="复制内容"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            加载中...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400">
            {error}
          </div>
        ) : content ? (
          <div className="flex">
            <div className="flex-shrink-0 py-3 pr-3 pl-3 text-right select-none">
              {lines.map((_, i) => (
                <div key={i} className="text-xs text-zinc-600 leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
            <pre className="flex-1 p-3 text-sm text-zinc-300 font-mono whitespace-pre overflow-x-auto">
              {content}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="px-3 py-1 border-t border-zinc-800 text-xs text-zinc-500">
        {lines.length} 行 • {content?.length || 0} 字符
      </div>
    </div>
  )
}
