import { useState, useCallback, useRef, useEffect } from 'react'
import { Volume2, VolumeX, Loader2, Trash2, History } from 'lucide-react'
import { useTTS } from '@/hooks/useTTS'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import { debug } from '@/lib/debug'

interface TTSRecord {
  id: string
  text: string
  timestamp: number
}

const VOICES = [
  { id: 'mimo_default', name: '默认' },
  { id: 'mimo_female', name: '女声' },
  { id: 'mimo_male', name: '男声' },
]

interface SimpleTTSProps {
  defaultVoice?: string
}

export function SimpleTTS({ defaultVoice = 'mimo_default' }: SimpleTTSProps) {
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(defaultVoice)
  const [history, setHistory] = useState<TTSRecord[]>([])
  const { play, stop, isPlaying, isGenerating } = useTTS()
  const addToast = useToastStore((state) => state.addToast)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('tts_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {
        debug.error('Failed to load TTS history', e)
      }
    }
  }, [])

  const saveHistory = (records: TTSRecord[]) => {
    setHistory(records)
    localStorage.setItem('tts_history', JSON.stringify(records.slice(0, 50)))
  }

  const handleSpeak = useCallback(async () => {
    if (!text.trim()) {
      addToast('请输入要合成的文本', 'error')
      return
    }

    if (isPlaying) {
      stop()
      return
    }

    await play(text, { voice: selectedVoice })

    const record: TTSRecord = {
      id: crypto.randomUUID(),
      text: text.trim(),
      timestamp: Date.now(),
    }
    saveHistory([record, ...history])
  }, [text, selectedVoice, play, stop, isPlaying, history, addToast])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSpeak()
      }
    },
    [handleSpeak]
  )

  const handleClearHistory = useCallback(() => {
    saveHistory([])
    addToast('历史已清空', 'info')
  }, [addToast])

  const handleSelectHistory = useCallback((record: TTSRecord) => {
    setText(record.text)
    textareaRef.current?.focus()
  }, [])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入要朗读的文本..."
            className="w-full h-32 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
          <p className="text-[10px] text-zinc-600 mt-1">{text.length} 字符 · Ctrl+Enter 朗读</p>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-2">音色</label>
          <div className="flex gap-2">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-colors',
                  selectedVoice === voice.id
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                )}
              >
                {voice.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSpeak}
          disabled={isGenerating || !text.trim()}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              生成中...
            </>
          ) : isPlaying ? (
            <>
              <VolumeX className="w-4 h-4" />
              停止播放
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              朗读
            </>
          )}
        </button>

        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-500">最近朗读</span>
              </div>
              <button
                onClick={handleClearHistory}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-400"
                title="清空历史"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {history.map((record) => (
                <button
                  key={record.id}
                  onClick={() => handleSelectHistory(record)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <p className="text-xs text-zinc-300 truncate">{record.text}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{formatTime(record.timestamp)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
