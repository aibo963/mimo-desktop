import { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'

interface FileDiffProps {
  path: string
  oldString?: string
  newString?: string
  content?: string
}

export function FileDiff({ path, oldString, newString, content }: FileDiffProps) {
  const [expanded, setExpanded] = useState(true)

  const fileName = path.split(/[/\\]/).pop() || path

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-zinc-900 hover:bg-zinc-850 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-400" />
        )}
        <FileText className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-mono text-zinc-300 truncate">{fileName}</span>
        <span className="text-xs text-zinc-500 ml-auto">{path}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800">
          {oldString && newString ? (
            <div className="grid grid-cols-2 divide-x divide-zinc-800">
              <div>
                <div className="px-3 py-1 text-xs text-red-400 bg-red-950/30 border-b border-zinc-800">
                  - 原始内容
                </div>
                <pre className="p-3 text-xs text-red-300/80 overflow-auto max-h-[200px] font-mono whitespace-pre-wrap bg-red-950/10">
                  {oldString}
                </pre>
              </div>
              <div>
                <div className="px-3 py-1 text-xs text-emerald-400 bg-emerald-950/30 border-b border-zinc-800">
                  + 新内容
                </div>
                <pre className="p-3 text-xs text-emerald-300/80 overflow-auto max-h-[200px] font-mono whitespace-pre-wrap bg-emerald-950/10">
                  {newString}
                </pre>
              </div>
            </div>
          ) : content ? (
            <pre className="p-3 text-xs text-zinc-300 overflow-auto max-h-[300px] font-mono whitespace-pre-wrap">
              {content}
            </pre>
          ) : (
            <div className="p-3 text-xs text-zinc-500 italic">
              (无内容)
            </div>
          )}
        </div>
      )}
    </div>
  )
}
