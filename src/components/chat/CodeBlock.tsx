import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { useSnippetStore } from '@/stores/snippetStore'
import { useToastStore } from '@/stores/toastStore'
import { useClipboard } from '@/hooks/useClipboard'

interface CodeBlockProps {
  language: string
  value: string
}

const COLLAPSE_THRESHOLD = 20

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [saved, setSaved] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const addSnippet = useSnippetStore((state) => state.addSnippet)
  const addToast = useToastStore((state) => state.addToast)
  const { copied, copy } = useClipboard()

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = useCallback(() => {
    copy(value)
  }, [copy, value])

  const handleSave = useCallback(() => {
    const name = `Code snippet - ${language || 'text'}`
    addSnippet({
      name,
      code: value,
      language: language || 'text',
      tags: [language || 'text'],
    })
    setSaved(true)
    addToast('代码已收藏', 'success')
    setTimeout(() => setSaved(false), 2000)
  }, [value, language, addSnippet, addToast])

  const lineCount = useMemo(() => value.split('\n').length, [value])
  const canCollapse = lineCount > COLLAPSE_THRESHOLD

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-950 dark:bg-zinc-950 bg-gray-900 px-4 py-2 text-xs text-zinc-400 dark:text-zinc-400 text-gray-400">
        <div className="flex items-center gap-2">
          <span>{language || 'text'}</span>
          <span className="text-zinc-600">{lineCount} 行</span>
        </div>
        <div className="flex items-center gap-1">
          {canCollapse && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-opacity"
              aria-label={collapsed ? '展开代码' : '折叠代码'}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>展开</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>折叠</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            aria-label={saved ? '已收藏' : '收藏代码'}
          >
            {saved ? (
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            ) : (
              <Star className="w-3 h-3" />
            )}
            <span>{saved ? '已收藏' : '收藏'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            aria-label={copied ? '已复制' : '复制代码'}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className={collapsed ? 'max-h-[200px] overflow-hidden relative' : ''}>
        <SyntaxHighlighter
          language={language || 'text'}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
          showLineNumbers={lineCount > 5}
        >
          {value}
        </SyntaxHighlighter>
        {collapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950 to-transparent" />
        )}
      </div>
    </div>
  )
}
