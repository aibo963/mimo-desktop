import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface BashOutputProps {
  command: string
  output: string
  description?: string
}

export function BashOutput({ command, output, description }: BashOutputProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasOutput = output && output.trim().length > 0

  return (
    <div className="rounded-lg overflow-hidden bg-black">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-sm">$</span>
          <span className="text-zinc-300 font-mono text-sm">{command}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasOutput && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
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
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
            title="复制输出"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
      {description && (
        <div className="px-3 py-1 text-xs text-zinc-500 bg-zinc-950 border-b border-zinc-800">
          {description}
        </div>
      )}
      {expanded && hasOutput && (
        <pre className="p-3 text-sm text-zinc-300 overflow-auto max-h-[400px] font-mono whitespace-pre-wrap break-all">
          {output}
        </pre>
      )}
      {!hasOutput && (
        <div className="px-3 py-2 text-xs text-zinc-600 italic">
          (无输出)
        </div>
      )}
    </div>
  )
}
