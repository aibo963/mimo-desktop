import { useState, useCallback, useEffect, useRef } from 'react'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { debug } from '@/lib/debug'

interface BashOutputProps {
  command: string
  output: string
  description?: string
}

export function BashOutput({ command, output, description }: BashOutputProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output).catch((err) => {
      debug.error('Failed to copy:', err)
    })
    setCopied(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [output])

  const hasOutput = output && output.trim().length > 0

  return (
    <div className="rounded-lg overflow-hidden bg-black dark:bg-black bg-gray-900">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-sm">$</span>
          <span className="text-zinc-300 font-mono text-sm">{command}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasOutput && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-700 text-zinc-400 dark:text-zinc-400 text-gray-400"
              aria-expanded={expanded}
              aria-label={expanded ? '折叠输出' : '展开输出'}
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-700 text-zinc-400 dark:text-zinc-400 text-gray-400"
            title="复制输出"
            aria-label={copied ? '已复制' : '复制输出'}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
      {description && (
        <div className="px-3 py-1 text-xs text-zinc-500 dark:text-zinc-500 text-gray-400 bg-zinc-950 dark:bg-zinc-950 bg-gray-800 border-b border-zinc-800 dark:border-zinc-800 border-gray-700">
          {description}
        </div>
      )}
      {expanded && hasOutput && (
        <pre className="p-3 text-sm text-zinc-300 overflow-auto max-h-[400px] font-mono whitespace-pre-wrap break-words">
          {output}
        </pre>
      )}
      {!hasOutput && <div className="px-3 py-2 text-xs text-zinc-600 italic">(无输出)</div>}
    </div>
  )
}
