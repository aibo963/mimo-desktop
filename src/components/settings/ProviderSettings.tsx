import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Globe,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Key,
  Link,
  Check,
  X,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Provider {
  id: string
  name: string
  api?: string
  env?: string[]
  enabled: boolean
  hasApiKey: boolean
  models: string[]
}

const defaultProviders: Provider[] = [
  { id: 'openai', name: 'OpenAI', api: 'https://api.openai.com/v1', env: ['OPENAI_API_KEY'], enabled: true, hasApiKey: false, models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', api: 'https://api.anthropic.com', env: ['ANTHROPIC_API_KEY'], enabled: true, hasApiKey: false, models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  { id: 'google', name: 'Google', api: 'https://generativelanguage.googleapis.com', env: ['GOOGLE_API_KEY'], enabled: true, hasApiKey: false, models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'] },
  { id: 'mimo', name: 'MiMo (小米)', api: 'https://api.xiaomimimo.com/v1', enabled: true, hasApiKey: true, models: ['mimo-v2.5-pro', 'mimo-v2-flash', 'mimo-v2-omni'] },
  { id: 'xiaomi', name: 'Xiaomi', api: 'https://api.xiaomimimo.com/v1', enabled: true, hasApiKey: true, models: ['xiaomi/mimo-v2.5-pro', 'xiaomi/mimo-v2-flash'] },
  { id: 'deepseek', name: 'DeepSeek', api: 'https://api.deepseek.com/v1', env: ['DEEPSEEK_API_KEY'], enabled: true, hasApiKey: false, models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'openrouter', name: 'OpenRouter', api: 'https://openrouter.ai/api/v1', env: ['OPENROUTER_API_KEY'], enabled: true, hasApiKey: false, models: ['openrouter/auto'] },
]

export function ProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>(defaultProviders)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string; user?: string } | null>(null)
  const { invoke } = useMimo()

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.provider) {
        setProviders(prev => prev.map(p => {
          const configProvider = config.provider[p.id] || {}
          const configModels = configProvider.models
          const models = Array.isArray(configModels)
            ? configModels
            : typeof configModels === 'object' && configModels !== null
              ? Object.keys(configModels)
              : p.models

          return {
            ...p,
            api: configProvider.api || p.api,
            name: configProvider.name || p.name,
            models,
            enabled: !config.disabled_providers?.includes(p.id),
          }
        }))
      }
      if (config?.disabled_providers) {
        setProviders(prev => prev.map(p => ({
          ...p,
          enabled: !config.disabled_providers.includes(p.id),
        })))
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyApi = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const result = await invoke({ action: 'verify_api' })
      setVerifyResult(result)
    } catch (error: any) {
      setVerifyResult({ success: false, message: error.message })
    } finally {
      setVerifying(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled } : p))
    try {
      const config = await invoke({ action: 'get_config' })
      const disabled = config?.disabled_providers || []
      const updated = enabled
        ? disabled.filter((d: string) => d !== id)
        : [...disabled, id]
      await invoke({ action: 'set_config', key: 'disabled_providers', value: updated })
    } catch (error) {
      console.error('Failed to toggle provider:', error)
    }
  }

  const handleSaveApiKey = async (providerId: string) => {
    try {
      await invoke({ action: 'set_config', key: `provider.${providerId}.options.apiKey`, value: apiKeyInput })
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, hasApiKey: true } : p
      ))
      setEditingKey(null)
      setApiKeyInput('')
    } catch (error) {
      console.error('Failed to save API key:', error)
    }
  }

  const handleDeleteApiKey = async (providerId: string) => {
    try {
      await invoke({ action: 'set_config', key: `provider.${providerId}.options.apiKey`, value: undefined })
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, hasApiKey: false } : p
      ))
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const handleSaveApiUrl = async (providerId: string, url: string) => {
    try {
      await invoke({ action: 'set_config', key: `provider.${providerId}.api`, value: url })
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, api: url } : p
      ))
    } catch (error) {
      console.error('Failed to save API URL:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">模型供应商</span>
        </div>
        <button
          onClick={loadProviders}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        配置 AI 模型供应商的 API 密钥和接入点
      </p>

      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">API 连接验证</span>
          <button
            onClick={handleVerifyApi}
            disabled={verifying}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 disabled:opacity-50"
          >
            {verifying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            {verifying ? '验证中...' : '验证连接'}
          </button>
        </div>
        {verifyResult && (
          <div className={cn(
            'p-2 rounded text-xs',
            verifyResult.success
              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-800'
              : 'bg-red-950/30 text-red-400 border border-red-800'
          )}>
            <p>{verifyResult.message}</p>
            {verifyResult.user && (
              <p className="mt-1 text-[10px] opacity-70">用户 ID: {verifyResult.user}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {providers.map(provider => (
          <div
            key={provider.id}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer"
              onClick={() => setExpanded(expanded === provider.id ? null : provider.id)}
            >
              {expanded === provider.id ? (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              )}
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="flex-1 text-sm text-zinc-300">{provider.name}</span>
              <div className="flex items-center gap-2">
                {provider.hasApiKey && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800">
                    API Key 已配置
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggle(provider.id, !provider.enabled)
                  }}
                  className={cn(
                    'p-0.5 rounded transition-colors',
                    provider.enabled ? 'text-emerald-400' : 'text-zinc-500'
                  )}
                >
                  {provider.enabled ? (
                    <ToggleRight className="w-7 h-4" />
                  ) : (
                    <ToggleLeft className="w-7 h-4" />
                  )}
                </button>
              </div>
            </div>

            {expanded === provider.id && (
              <div className="px-3 py-3 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    <Link className="w-3 h-3 inline mr-1" />
                    API 地址
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      defaultValue={provider.api}
                      onBlur={(e) => handleSaveApiUrl(provider.id, e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    <Key className="w-3 h-3 inline mr-1" />
                    API Key
                  </label>
                  {editingKey === provider.id ? (
                    <div className="flex gap-1">
                      <div className="flex-1 relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="sk-..."
                          className="w-full px-2 py-1.5 pr-8 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleSaveApiKey(provider.id)}
                        className="px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { setEditingKey(null); setApiKeyInput('') }}
                        className="px-2 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <div className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-500">
                        {provider.hasApiKey ? '••••••••••••••••••••' : '未配置'}
                      </div>
                      <button
                        onClick={() => setEditingKey(provider.id)}
                        className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400"
                      >
                        {provider.hasApiKey ? '修改' : '添加'}
                      </button>
                      {provider.hasApiKey && (
                        <button
                          onClick={() => handleDeleteApiKey(provider.id)}
                          className="px-2 py-1.5 rounded bg-red-950/50 hover:bg-red-950 text-xs text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {provider.env && (
                    <p className="text-[10px] text-zinc-600 mt-1">
                      环境变量: {provider.env.join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">可用模型</label>
                  <div className="flex flex-wrap gap-1">
                    {provider.models.map(model => (
                      <span
                        key={model}
                        className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2">
        <p className="text-[10px] text-zinc-600">
          配置保存在 ~/.config/mimocode/mimocode.jsonc
        </p>
      </div>
    </div>
  )
}
