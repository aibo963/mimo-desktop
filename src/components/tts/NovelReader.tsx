import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, Upload, FileText, Settings2 } from 'lucide-react'
import { useTTS } from '@/hooks/useTTS'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

interface Segment {
  id: string
  text: string
  type: 'narration' | 'dialogue'
  speaker?: string
  status: 'pending' | 'playing' | 'done' | 'error'
}

interface SpeakerVoice {
  speaker: string
  voice: string
}

const VOICES = [
  { id: 'mimo_default', name: '默认' },
  { id: 'mimo_female', name: '女声' },
  { id: 'mimo_male', name: '男声' },
]

const SPEEDS = [
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
]

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = []
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim())

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    const lines = trimmed.split(/\n/).filter((l) => l.trim())
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      const dialogueMatch = trimmedLine.match(/^[""「」『』【】](.+?)[""」」『』】]/)
      const isDialogue =
        !!dialogueMatch ||
        trimmedLine.startsWith('"') ||
        trimmedLine.startsWith('「') ||
        trimmedLine.startsWith('『') ||
        trimmedLine.startsWith('"') ||
        trimmedLine.startsWith('「')

      if (isDialogue) {
        const speakerMatch = trimmedLine.match(/^(.+?)[说问道喊叫嚷哼哈哎]道?[""「」『』】]/)
        const speaker = speakerMatch ? speakerMatch[1].trim() : undefined

        segments.push({
          id: crypto.randomUUID(),
          text: trimmedLine,
          type: 'dialogue',
          speaker,
          status: 'pending',
        })
      } else {
        segments.push({
          id: crypto.randomUUID(),
          text: trimmedLine,
          type: 'narration',
          status: 'pending',
        })
      }
    }
  }

  return segments
}

function detectSpeakers(segments: Segment[]): string[] {
  const speakers = new Set<string>()
  for (const seg of segments) {
    if (seg.speaker) speakers.add(seg.speaker)
  }
  return Array.from(speakers)
}

interface NovelReaderProps {
  defaultVoice?: string
}

export function NovelReader({ defaultVoice: initialVoice = 'mimo_default' }: NovelReaderProps) {
  const [text, setText] = useState('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [speakerVoices, setSpeakerVoices] = useState<SpeakerVoice[]>([])
  const [defaultVoice, setDefaultVoice] = useState(initialVoice)
  const [showSettings, setShowSettings] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const { play, stop } = useTTS()
  const addToast = useToastStore((state) => state.addToast)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const playbackRef = useRef<{ cancelled: boolean; paused: boolean }>({
    cancelled: false,
    paused: false,
  })

  const speakers = detectSpeakers(segments)

  useEffect(() => {
    setProgress({
      current: segments.filter((s) => s.status === 'done').length,
      total: segments.length,
    })
  }, [segments])

  const handleImportText = useCallback(
    (importedText: string) => {
      setText(importedText)
      const newSegments = splitIntoSegments(importedText)
      setSegments(newSegments)
      setCurrentIndex(-1)
      setIsPlaying(false)
      setIsPaused(false)
      addToast(`已分割为 ${newSegments.length} 个段落`, 'info')
    },
    [addToast]
  )

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = () => {
        handleImportText(reader.result as string)
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [handleImportText]
  )

  const getVoiceForSegment = useCallback(
    (segment: Segment): string => {
      if (segment.speaker) {
        const mapping = speakerVoices.find((sv) => sv.speaker === segment.speaker)
        if (mapping) return mapping.voice
      }
      return defaultVoice
    },
    [speakerVoices, defaultVoice]
  )

  const playSegment = useCallback(
    async (index: number): Promise<boolean> => {
      if (index < 0 || index >= segments.length) return false

      const segment = segments[index]
      const voice = getVoiceForSegment(segment)

      setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'playing' } : s)))
      setCurrentIndex(index)

      try {
        await play(segment.text, { voice })
        setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'done' } : s)))
        return true
      } catch {
        setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'error' } : s)))
        return false
      }
    },
    [segments, play, getVoiceForSegment]
  )

  const playAll = useCallback(async () => {
    if (segments.length === 0) {
      addToast('请先导入文本', 'error')
      return
    }

    playbackRef.current.cancelled = false
    playbackRef.current.paused = false
    setIsPlaying(true)
    setIsPaused(false)

    const startIdx = currentIndex >= 0 ? currentIndex : 0

    for (let i = startIdx; i < segments.length; i++) {
      if (playbackRef.current.cancelled) break

      while (playbackRef.current.paused && !playbackRef.current.cancelled) {
        await new Promise((r) => setTimeout(r, 100))
      }

      if (playbackRef.current.cancelled) break

      await playSegment(i)
      await new Promise((r) => setTimeout(r, 200 / speed))
    }

    setIsPlaying(false)
    setIsPaused(false)
  }, [segments, currentIndex, speed, playSegment, addToast])

  const pausePlayback = useCallback(() => {
    playbackRef.current.paused = true
    setIsPaused(true)
    stop()
  }, [stop])

  const resumePlayback = useCallback(() => {
    playbackRef.current.paused = false
    setIsPaused(false)
  }, [])

  const skipForward = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      stop()
      setCurrentIndex((prev) => prev + 1)
      if (isPlaying) {
        playSegment(currentIndex + 1)
      }
    }
  }, [currentIndex, segments.length, stop, isPlaying, playSegment])

  const skipBackward = useCallback(() => {
    if (currentIndex > 0) {
      stop()
      setCurrentIndex((prev) => prev - 1)
      if (isPlaying) {
        playSegment(currentIndex - 1)
      }
    }
  }, [currentIndex, stop, isPlaying, playSegment])

  const updateSpeakerVoice = useCallback((speaker: string, voice: string) => {
    setSpeakerVoices((prev) => {
      const existing = prev.find((sv) => sv.speaker === speaker)
      if (existing) {
        return prev.map((sv) => (sv.speaker === speaker ? { ...sv, voice } : sv))
      }
      return [...prev, { speaker, voice }]
    })
  }, [])

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-zinc-300">小说朗读</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showSettings
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              )}
              title="设置"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="导入文件"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.text"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>

      {showSettings && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 space-y-3 shrink-0">
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">默认音色</label>
            <div className="flex gap-1.5">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setDefaultVoice(v.id)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors',
                    defaultVoice === v.id
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  )}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {speakers.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">角色音色</label>
              <div className="space-y-1.5 max-h-32 overflow-auto">
                {speakers.map((speaker) => {
                  const currentVoice =
                    speakerVoices.find((sv) => sv.speaker === speaker)?.voice || defaultVoice
                  return (
                    <div key={speaker} className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-20 truncate">{speaker}</span>
                      <select
                        value={currentVoice}
                        onChange={(e) => updateSpeakerVoice(speaker, e.target.value)}
                        className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
                      >
                        {VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">语速</label>
            <div className="flex gap-1.5">
              {SPEEDS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpeed(s.value)}
                  className={cn(
                    'px-2 py-1 rounded text-xs transition-colors',
                    speed === s.value
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400 mb-2">粘贴或导入文本开始朗读</p>
            <p className="text-xs text-zinc-600">支持 TXT 文件导入</p>
            <textarea
              value={text}
              onChange={(e) => handleImportText(e.target.value)}
              placeholder="或在此粘贴文本..."
              className="w-full h-32 mt-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
            />
          </div>
        ) : (
          <div className="space-y-1">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                  index === currentIndex
                    ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-300'
                    : segment.status === 'done'
                      ? 'bg-zinc-900/30 text-zinc-500'
                      : segment.type === 'dialogue'
                        ? 'bg-zinc-900/50 text-zinc-300 border-l-2 border-purple-500/50'
                        : 'bg-zinc-900/30 text-zinc-400'
                )}
                onClick={() => {
                  stop()
                  setCurrentIndex(index)
                }}
              >
                {segment.speaker && (
                  <span className="text-xs text-purple-400 font-medium mr-1">
                    {segment.speaker}：
                  </span>
                )}
                {segment.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {segments.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500">
              {progress.current}/{progress.total} 段
            </span>
            <span className="text-[10px] text-zinc-500">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full mb-3">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={skipBackward}
              disabled={currentIndex <= 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={isPlaying ? (isPaused ? resumePlayback : pausePlayback) : playAll}
              className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={skipForward}
              disabled={currentIndex >= segments.length - 1}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
