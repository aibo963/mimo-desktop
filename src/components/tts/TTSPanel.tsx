import { useState, useEffect, useCallback } from 'react'
import {
  Volume2,
  Settings,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Mic,
  Paintbrush,
  Upload,
  VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { useMimo } from '@/hooks/useMimo'
import { useTTS } from '@/hooks/useTTS'
import { debug } from '@/lib/debug'
import { TTS_MODELS, PRESET_VOICES, STYLE_CATEGORIES, type TTSModel } from '@/lib/tts'

type ModelTab = TTSModel

interface TTSConfig {
  apiKey: string
  api: string
  model: string
  voice: string
}

export function TTSPanel() {
  const [activeModel, setActiveModel] = useState<ModelTab>('mimo-v2.5-tts')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<TTSConfig>({
    apiKey: '',
    api: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5-tts',
    voice: 'mimo_default',
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  const loadConfig = useCallback(async () => {
    try {
      const result = await invoke({ action: 'tts_get_config' })
      if (result) {
        setConfig(result)
        setApiKeyInput(result.apiKey || '')
      }
    } catch (err) {
      debug.error('Failed to load TTS config:', err)
    }
  }, [invoke])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSaveConfig = useCallback(async () => {
    setSaving(true)
    try {
      await invoke({
        action: 'tts_set_config',
        apiKey: apiKeyInput,
        api: config.api,
        model: config.model,
        voice: config.voice,
      })
      setConfig((prev) => ({ ...prev, apiKey: apiKeyInput }))
      addToast('TTS 配置已保存', 'success')
    } catch (err: any) {
      addToast(`保存失败: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [apiKeyInput, config, invoke, addToast])

  const isConfigured = !!config.apiKey

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">语音</span>
            {isConfigured && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">
                已配置
              </span>
            )}
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showConfig
                ? 'bg-zinc-800 text-zinc-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            )}
            title="设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex gap-1 bg-zinc-900 rounded-lg p-0.5">
          {Object.entries(TTS_MODELS).map(([id, info]) => (
            <button
              key={id}
              onClick={() => setActiveModel(id as ModelTab)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors',
                activeModel === id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {id === 'mimo-v2.5-tts' && <Volume2 className="w-3 h-3" />}
              {id === 'mimo-v2.5-tts-voicedesign' && <Paintbrush className="w-3 h-3" />}
              {id === 'mimo-v2.5-tts-voiceclone' && <Mic className="w-3 h-3" />}
              {info.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {showConfig ? (
          <ConfigPanel
            config={config}
            apiKeyInput={apiKeyInput}
            showApiKey={showApiKey}
            saving={saving}
            onApiKeyChange={setApiKeyInput}
            onToggleShowKey={() => setShowApiKey(!showApiKey)}
            onSave={handleSaveConfig}
            onConfigChange={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
          />
        ) : activeModel === 'mimo-v2.5-tts' ? (
          <PresetVoicePanel />
        ) : activeModel === 'mimo-v2.5-tts-voicedesign' ? (
          <VoiceDesignPanel />
        ) : (
          <VoiceClonePanel />
        )}
      </div>
    </div>
  )
}

function ConfigPanel({
  config,
  apiKeyInput,
  showApiKey,
  saving,
  onApiKeyChange,
  onToggleShowKey,
  onSave,
  onConfigChange,
}: {
  config: TTSConfig
  apiKeyInput: string
  showApiKey: boolean
  saving: boolean
  onApiKeyChange: (v: string) => void
  onToggleShowKey: () => void
  onSave: () => void
  onConfigChange: (updates: Partial<TTSConfig>) => void
}) {
  return (
    <div className="p-4 space-y-4 overflow-auto">
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">API Key</label>
        <div className="flex gap-1.5">
          <div className="flex-1 relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="输入 TTS API Key"
              className="w-full px-3 py-2 pr-9 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 font-mono focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
            />
            <button
              onClick={onToggleShowKey}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            保存
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-500 block mb-1.5">API 地址</label>
        <input
          type="text"
          value={config.api || ''}
          onChange={(e) => onConfigChange({ api: e.target.value })}
          onBlur={onSave}
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
        />
      </div>
      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
        <p className="text-[10px] text-zinc-500">
          TTS 使用独立的 API 配置。如果未配置，将回退使用聊天的 Xiaomi API Key。
        </p>
      </div>
    </div>
  )
}

function PresetVoicePanel() {
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('mimo_default')
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [history, setHistory] = useState<
    Array<{ id: string; text: string; voice: string; timestamp: number }>
  >([])
  const { play, stop, isPlaying, isGenerating } = useTTS()
  const addToast = useToastStore((state) => state.addToast)

  useEffect(() => {
    const saved = localStorage.getItem('tts_preset_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (_e) {
        /* ignore */
      }
    }
  }, [])

  const handlePlay = useCallback(async () => {
    if (!text.trim()) {
      addToast('请输入要合成的文本', 'error')
      return
    }
    if (isPlaying) {
      stop()
      return
    }

    const style = selectedStyles.length > 0 ? `(${selectedStyles.join(' ')})` : undefined
    await play(text, { voice: selectedVoice, style })

    const record = {
      id: crypto.randomUUID(),
      text: text.trim(),
      voice: selectedVoice,
      timestamp: Date.now(),
    }
    const newHistory = [record, ...history].slice(0, 50)
    setHistory(newHistory)
    localStorage.setItem('tts_preset_history', JSON.stringify(newHistory))
  }, [text, selectedVoice, selectedStyles, play, stop, isPlaying, history, addToast])

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成的文本... 支持 (风格) 标签控制语气"
            className="w-full h-28 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
          <p className="text-[10px] text-zinc-600 mt-1">{text.length} 字符 · Ctrl+Enter 合成</p>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-2">音色</label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={cn(
                  'px-2 py-1.5 rounded-lg text-xs transition-colors text-center',
                  selectedVoice === voice.id
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                )}
              >
                <div>{voice.name}</div>
                {voice.gender && (
                  <div className="text-[9px] text-zinc-600">
                    {voice.gender === 'female' ? '女' : '男'}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-2">
            风格控制 <span className="text-zinc-600">(可选，点击添加)</span>
          </label>
          <div className="space-y-2">
            {STYLE_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <div className="text-[10px] text-zinc-600 mb-1">{cat.label}</div>
                <div className="flex flex-wrap gap-1">
                  {cat.styles.map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleStyle(style)}
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] transition-colors',
                        selectedStyles.includes(style)
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-600/40'
                          : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selectedStyles.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">已选: {selectedStyles.join('、')}</span>
              <button
                onClick={() => setSelectedStyles([])}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div>
            <div className="text-xs text-zinc-500 mb-1">最近合成</div>
            <div className="space-y-1 max-h-32 overflow-auto">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  onClick={() => setText(h.text)}
                  className="w-full text-left px-2 py-1 rounded bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                >
                  <p className="text-[10px] text-zinc-400 truncate">{h.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
        <button
          onClick={handlePlay}
          disabled={isGenerating || !text.trim()}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              合成中...
            </>
          ) : isPlaying ? (
            <>
              <VolumeX className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              合成语音
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function VoiceDesignPanel() {
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')
  const { play, stop, isPlaying, isGenerating } = useTTS()
  const addToast = useToastStore((state) => state.addToast)

  const handlePlay = useCallback(async () => {
    if (!text.trim()) {
      addToast('请输入要合成的文本', 'error')
      return
    }
    if (!description.trim()) {
      addToast('请描述你想要的音色', 'error')
      return
    }
    if (isPlaying) {
      stop()
      return
    }
    await play(text, { model: 'mimo-v2.5-tts-voicedesign', voiceDescription: description })
  }, [text, description, play, stop, isPlaying, addToast])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
          <p className="text-[10px] text-zinc-500">
            用文字描述你想要的音色，AI 会自动生成匹配的语音。
          </p>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">音色描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              '例如：\n- 二十多岁的年轻女性，声音清脆活泼\n- 五十多岁的中年男性，声音低沉沙哑\n- 温柔甜美的女声，语速较慢'
            }
            className="w-full h-28 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">合成文本</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成的文本..."
            className="w-full h-24 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
        <button
          onClick={handlePlay}
          disabled={isGenerating || !text.trim() || !description.trim()}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              合成中...
            </>
          ) : isPlaying ? (
            <>
              <VolumeX className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Paintbrush className="w-4 h-4" />
              设计音色
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function VoiceClonePanel() {
  const [text, setText] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioBase64, setAudioBase64] = useState<string>('')
  const [style, setStyle] = useState('')
  const { play, stop, isPlaying, isGenerating } = useTTS()
  const addToast = useToastStore((state) => state.addToast)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 10 * 1024 * 1024) {
        addToast('音频文件不能超过 10MB', 'error')
        return
      }
      if (!file.type.includes('mp3') && !file.type.includes('wav')) {
        addToast('仅支持 mp3 和 wav 格式', 'error')
        return
      }
      setAudioFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAudioBase64(base64)
      }
      reader.readAsDataURL(file)
    },
    [addToast]
  )

  const handlePlay = useCallback(async () => {
    if (!text.trim()) {
      addToast('请输入要合成的文本', 'error')
      return
    }
    if (!audioBase64) {
      addToast('请上传参考音频', 'error')
      return
    }
    if (isPlaying) {
      stop()
      return
    }
    await play(text, {
      model: 'mimo-v2.5-tts-voiceclone',
      audioBase64,
      audioMimeType: audioFile?.type || 'audio/mpeg',
      style: style || undefined,
    })
  }, [text, audioBase64, audioFile, style, play, stop, isPlaying, addToast])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
          <p className="text-[10px] text-zinc-500">
            上传一段音频样本（mp3/wav，≤10MB），AI 会克隆该音色来合成新语音。
          </p>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">参考音频</label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-400">
                {audioFile ? audioFile.name : '点击上传音频'}
              </span>
              <input
                type="file"
                accept="audio/mpeg,audio/wav,.mp3,.wav"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {audioFile && (
              <button
                onClick={() => {
                  setAudioFile(null)
                  setAudioBase64('')
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                清除
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">
            风格指令 <span className="text-zinc-600">(可选)</span>
          </label>
          <input
            type="text"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="例如：温柔、语速较慢"
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1.5">合成文本</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要合成的文本..."
            className="w-full h-28 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
        <button
          onClick={handlePlay}
          disabled={isGenerating || !text.trim() || !audioBase64}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              克隆中...
            </>
          ) : isPlaying ? (
            <>
              <VolumeX className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              克隆音色
            </>
          )}
        </button>
      </div>
    </div>
  )
}
