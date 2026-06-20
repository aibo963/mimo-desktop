import { useState, useCallback, useEffect } from 'react'
import {
  Paintbrush,
  Loader2,
  Download,
  Copy,
  Trash2,
  Settings,
  X,
  Eye,
  EyeOff,
  Check,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { useMimo } from '@/hooks/useMimo'
import { debug } from '@/lib/debug'

interface ImageHistory {
  id: string
  prompt: string
  imageData: string
  format: string
  timestamp: number
  backend: string
}

interface BackendConfig {
  id: string
  name: string
  description: string
  baseUrl: string
  apiKey: string
  enabled: boolean
  requiresApiKey: boolean
}

const DEFAULT_BACKENDS: BackendConfig[] = [
  {
    id: 'sd-webui',
    name: 'Stable Diffusion WebUI',
    description: '本地部署，A1111 WebUI',
    baseUrl: 'http://127.0.0.1:7860',
    apiKey: '',
    enabled: true,
    requiresApiKey: false,
  },
  {
    id: 'comfyui',
    name: 'ComfyUI',
    description: '本地部署，工作流引擎',
    baseUrl: 'http://127.0.0.1:8188',
    apiKey: '',
    enabled: false,
    requiresApiKey: false,
  },
  {
    id: 'openai',
    name: 'OpenAI DALL-E',
    description: '云端 API，DALL-E 3',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: false,
    requiresApiKey: true,
  },
  {
    id: 'siliconflow',
    name: 'Silicon Flow',
    description: '国内云端，多种模型',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    enabled: false,
    requiresApiKey: true,
  },
]

const PRESET_SIZES = [
  { label: '512×512', width: 512, height: 512 },
  { label: '768×768', width: 768, height: 768 },
  { label: '1024×1024', width: 1024, height: 1024 },
  { label: '768×1024', width: 768, height: 1024 },
  { label: '1024×768', width: 1024, height: 768 },
  { label: '1920×1080', width: 1920, height: 1080 },
]

const PRESET_PROMPTS = [
  'A futuristic cityscape at sunset, cyberpunk style',
  'A serene mountain landscape with a lake',
  'Portrait of a wise wizard with a long beard',
  'A cute robot sitting in a coffee shop',
  'Abstract art with vibrant colors and geometric shapes',
]

function loadBackendConfigs(): BackendConfig[] {
  try {
    const saved = localStorage.getItem('image_backends')
    if (saved) {
      const parsed = JSON.parse(saved)
      return DEFAULT_BACKENDS.map((d) => {
        const s = parsed.find((p: BackendConfig) => p.id === d.id)
        return s
          ? {
              ...d,
              baseUrl: s.baseUrl || d.baseUrl,
              apiKey: s.apiKey || '',
              enabled: s.enabled ?? d.enabled,
            }
          : d
      })
    }
  } catch (_e) {
    /* ignore */
  }
  return DEFAULT_BACKENDS
}

export function ImagePanel() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedSize, setSelectedSize] = useState(0)
  const [steps, setSteps] = useState(20)
  const [cfgScale, setCfgScale] = useState(7)
  const [seed] = useState(-1)
  const [selectedBackend, setSelectedBackend] = useState('sd-webui')
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState<ImageHistory[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showDevNotice, setShowDevNotice] = useState(true)
  const [previewImage, setPreviewImage] = useState<ImageHistory | null>(null)
  const [backends, setBackends] = useState<BackendConfig[]>(loadBackendConfigs)
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  useEffect(() => {
    const saved = localStorage.getItem('image_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (_err) {
        /* ignore */
      }
    }
  }, [])

  const saveBackendConfigs = useCallback((configs: BackendConfig[]) => {
    setBackends(configs)
    localStorage.setItem('image_backends', JSON.stringify(configs))
  }, [])

  const updateBackend = useCallback(
    (id: string, updates: Partial<BackendConfig>) => {
      const newConfigs = backends.map((b) => (b.id === id ? { ...b, ...updates } : b))
      saveBackendConfigs(newConfigs)
    },
    [backends, saveBackendConfigs]
  )

  const enabledBackends = backends.filter((b) => b.enabled)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      addToast('请输入图像描述', 'error')
      return
    }
    if (isGenerating) return

    const backend = backends.find((b) => b.id === selectedBackend)
    if (!backend?.enabled) {
      addToast('请选择已启用的后端', 'error')
      return
    }
    if (backend.requiresApiKey && !backend.apiKey) {
      addToast(`${backend.name} 需要配置 API Key`, 'error')
      return
    }

    setIsGenerating(true)
    try {
      const result = await invoke({
        action: 'image_generate',
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: PRESET_SIZES[selectedSize].width,
        height: PRESET_SIZES[selectedSize].height,
        steps,
        cfgScale,
        seed,
        backend: selectedBackend,
      })

      if (result?.error) {
        addToast(`生成失败: ${result.error}`, 'error')
        return
      }

      if (result?.images?.length > 0) {
        const record: ImageHistory = {
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          imageData: result.images[0].data,
          format: result.images[0].format,
          timestamp: Date.now(),
          backend: selectedBackend,
        }
        const newHistory = [record, ...history].slice(0, 50)
        setHistory(newHistory)
        localStorage.setItem('image_history', JSON.stringify(newHistory))
        setPreviewImage(record)
        addToast('图像生成成功', 'success')
      }
    } catch (err: any) {
      debug.error('Image generation failed:', err)
      addToast(`生成失败: ${err.message}`, 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [
    prompt,
    negativePrompt,
    selectedSize,
    steps,
    cfgScale,
    seed,
    selectedBackend,
    invoke,
    addToast,
    history,
    isGenerating,
    backends,
  ])

  const handleDownload = useCallback((record: ImageHistory) => {
    const a = document.createElement('a')
    a.href = `data:image/${record.format};base64,${record.imageData}`
    a.download = `mimo-image-${Date.now()}.${record.format}`
    a.click()
  }, [])

  const handleCopy = useCallback(
    async (record: ImageHistory) => {
      try {
        const blob = await (
          await fetch(`data:image/${record.format};base64,${record.imageData}`)
        ).blob()
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
        addToast('已复制到剪贴板', 'success')
      } catch {
        addToast('复制失败', 'error')
      }
    },
    [addToast]
  )

  const handleDelete = useCallback(
    (id: string) => {
      const newHistory = history.filter((h) => h.id !== id)
      setHistory(newHistory)
      localStorage.setItem('image_history', JSON.stringify(newHistory))
      if (previewImage?.id === id) setPreviewImage(null)
    },
    [history, previewImage]
  )

  const handleClearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem('image_history')
    setPreviewImage(null)
    addToast('历史已清空', 'info')
  }, [addToast])

  const handleTestConnection = useCallback(
    async (backend: BackendConfig) => {
      if (backend.requiresApiKey && !backend.apiKey) {
        addToast('请先配置 API Key', 'error')
        return
      }
      try {
        await invoke({
          action: 'image_generate',
          prompt: 'test',
          width: 64,
          height: 64,
          steps: 1,
          backend: backend.id,
        })
        addToast(`${backend.name} 连接成功`, 'success')
      } catch (err: any) {
        addToast(`${backend.name} 连接失败: ${err.message}`, 'error')
      }
    },
    [invoke, addToast]
  )

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-zinc-300">绘图</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800/50">
              开发中
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showSettings
                ? 'bg-zinc-800 text-zinc-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {showSettings ? (
          <BackendSettings
            backends={backends}
            onUpdate={updateBackend}
            onTest={handleTestConnection}
            onClose={() => setShowSettings(false)}
          />
        ) : showDevNotice ? (
          <div className="w-full flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
              <Paintbrush className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">绘图功能开发中</h3>
            <p className="text-sm text-zinc-500 text-center max-w-md mb-4">
              图像生成功能正在开发中。支持 Stable Diffusion WebUI、ComfyUI、OpenAI DALL-E、Silicon
              Flow 等后端。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
              >
                配置后端
              </button>
              <button
                onClick={() => setShowDevNotice(false)}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm text-white transition-colors"
              >
                预览界面
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'flex flex-col',
                previewImage ? 'w-1/2 border-r border-zinc-800' : 'w-full'
              )}
            >
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">图像描述</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述你想要生成的图像..."
                    className="w-full h-24 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 resize-none focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(p)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-500 border border-zinc-800 hover:text-zinc-300 transition-colors"
                      >
                        {p.substring(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">
                    反向提示词 <span className="text-zinc-600">(可选)</span>
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="不想要的元素..."
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">尺寸</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_SIZES.map((size, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSize(i)}
                        className={cn(
                          'px-2 py-1.5 rounded-lg text-[10px] transition-colors',
                          selectedSize === i
                            ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        )}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">步数: {steps}</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">CFG: {cfgScale}</label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1.5">后端</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {backends.map((backend) => (
                      <button
                        key={backend.id}
                        onClick={() => backend.enabled && setSelectedBackend(backend.id)}
                        disabled={!backend.enabled}
                        className={cn(
                          'px-2.5 py-2 rounded-lg text-left transition-colors',
                          !backend.enabled
                            ? 'bg-zinc-900/50 text-zinc-600 border border-zinc-800/50 cursor-not-allowed'
                            : selectedBackend === backend.id
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        )}
                      >
                        <div className="text-[11px] font-medium">{backend.name}</div>
                        <div className="text-[9px] text-zinc-600 mt-0.5">{backend.description}</div>
                      </button>
                    ))}
                  </div>
                  {enabledBackends.length === 0 && (
                    <p className="text-[10px] text-zinc-600 mt-1.5">请在设置中启用至少一个后端</p>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || enabledBackends.length === 0}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors',
                    'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Paintbrush className="w-4 h-4" />
                      生成图像
                    </>
                  )}
                </button>
              </div>
            </div>

            {previewImage && (
              <div className="w-1/2 flex flex-col bg-zinc-900">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400 truncate flex-1">
                    {previewImage.prompt}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleDownload(previewImage)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="下载"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopy(previewImage)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="复制"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(previewImage.id)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="关闭"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                  <img
                    src={`data:image/${previewImage.format};base64,${previewImage.imageData}`}
                    alt={previewImage.prompt}
                    className="max-w-full max-h-full rounded-lg object-contain"
                  />
                </div>
              </div>
            )}

            {!previewImage && history.length > 0 && (
              <div className="w-1/2 border-l border-zinc-800 flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                  <span className="text-xs text-zinc-400">历史 ({history.length})</span>
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-2 grid grid-cols-2 gap-1.5 content-start">
                  {history.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => setPreviewImage(record)}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
                    >
                      <img
                        src={`data:image/${record.format};base64,${record.imageData}`}
                        alt={record.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                        <p className="text-[9px] text-zinc-300 line-clamp-2">{record.prompt}</p>
                        <p className="text-[8px] text-zinc-600 mt-0.5">{record.backend}</p>
                      </div>
                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(record)
                          }}
                          className="p-0.5 rounded bg-black/60 text-zinc-400 hover:text-zinc-200"
                        >
                          <Download className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(record.id)
                          }}
                          className="p-0.5 rounded bg-black/60 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BackendSettings({
  backends,
  onUpdate,
  onTest,
  onClose,
}: {
  backends: BackendConfig[]
  onUpdate: (id: string, updates: Partial<BackendConfig>) => void
  onTest: (backend: BackendConfig) => void
  onClose: () => void
}) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  return (
    <div className="w-full overflow-auto p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-300">后端配置</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {backends.map((backend) => (
        <div
          key={backend.id}
          className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-zinc-300">{backend.name}</div>
              <div className="text-[10px] text-zinc-600">{backend.description}</div>
            </div>
            <button
              onClick={() => onUpdate(backend.id, { enabled: !backend.enabled })}
              className={cn(
                'p-0.5 rounded transition-colors',
                backend.enabled ? 'text-purple-400' : 'text-zinc-600'
              )}
            >
              {backend.enabled ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {backend.enabled && (
            <>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">API 地址</label>
                <input
                  type="text"
                  value={backend.baseUrl}
                  onChange={(e) => onUpdate(backend.id, { baseUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
                />
              </div>

              {backend.requiresApiKey && (
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">API Key</label>
                  <div className="flex gap-1">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[backend.id] ? 'text' : 'password'}
                        value={backend.apiKey}
                        onChange={(e) => onUpdate(backend.id, { apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full px-2.5 py-1.5 pr-7 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
                      />
                      <button
                        onClick={() =>
                          setShowKeys((prev) => ({ ...prev, [backend.id]: !prev[backend.id] }))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showKeys[backend.id] ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => onTest(backend)}
                className="w-full px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
              >
                测试连接
              </button>
            </>
          )}
        </div>
      ))}

      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
        <p className="text-[10px] text-zinc-500">
          本地后端需先启动服务。SD WebUI 启动命令:{' '}
          <code className="bg-zinc-800 px-1 rounded">python launch.py --api</code>
          <br />
          ComfyUI 默认端口 8188。
          <br />
          云端后端需要 API Key，可在对应平台获取。
        </p>
      </div>
    </div>
  )
}
