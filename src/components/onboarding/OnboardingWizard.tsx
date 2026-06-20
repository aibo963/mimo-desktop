import { useState, useCallback } from 'react'
import { Bot, Key, Cpu, MessageSquare, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { debug } from '@/lib/debug'

interface OnboardingWizardProps {
  onComplete: () => void
}

const STEPS = [
  {
    id: 'welcome',
    title: '欢迎使用 Mimo Desktop',
    description: 'AI 驱动的智能助手桌面客户端',
    icon: Bot,
  },
  {
    id: 'api-key',
    title: '配置 API Key',
    description: '输入你的小米 MiMo API Key 以开始使用',
    icon: Key,
  },
  {
    id: 'model',
    title: '选择模型',
    description: '选择适合你需求的 AI 模型',
    icon: Cpu,
  },
  {
    id: 'features',
    title: '核心功能',
    description: '了解 Mimo Desktop 的主要功能',
    icon: MessageSquare,
  },
]

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('xiaomi/mimo-v2.5-pro')
  const [isCompleting, setIsCompleting] = useState(false)

  const step = STEPS[currentStep]
  const Icon = step.icon

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleComplete = useCallback(async () => {
    setIsCompleting(true)
    try {
      if (apiKey) {
        await window.mimoAPI.invoke({
          action: 'set_config',
          key: 'provider.xiaomi.options.apiKey',
          value: apiKey,
        })
      }
      await window.mimoAPI.invoke({
        action: 'set_config',
        key: 'model',
        value: selectedModel,
      })
      localStorage.setItem('mimo-onboarding-complete', 'true')
      onComplete()
    } catch (err) {
      debug.error('Failed to save settings:', err)
      onComplete()
    } finally {
      setIsCompleting(false)
    }
  }, [apiKey, selectedModel, onComplete])

  const canNext = currentStep === 0 || (currentStep === 1 && apiKey) || currentStep > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
              <Icon className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-center text-white mb-2">{step.title}</h2>
          <p className="text-sm text-center text-zinc-400 mb-8">{step.description}</p>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入你的 API Key"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="mt-2 text-xs text-zinc-500">你可以在小米开发者平台获取 API Key</p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-3">
              {[
                {
                  id: 'xiaomi/mimo-v2.5-pro',
                  name: 'MiMo V2.5 Pro',
                  description: '最强性能，推荐使用',
                },
                { id: 'xiaomi/mimo-v2.5', name: 'MiMo V2.5', description: '平衡性能与速度' },
                {
                  id: 'xiaomi/mimo-v2.5-lite',
                  name: 'MiMo V2.5 Lite',
                  description: '快速响应，适合简单任务',
                },
              ].map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    'w-full p-4 rounded-lg border text-left transition-colors',
                    selectedModel === model.id
                      ? 'bg-emerald-600/20 border-emerald-500/50'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{model.name}</div>
                      <div className="text-xs text-zinc-400 mt-1">{model.description}</div>
                    </div>
                    {selectedModel === model.id && <Check className="w-5 h-5 text-emerald-400" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              {[
                { title: '@file 文件引用', description: '在聊天中输入 @ 引用项目文件作为上下文' },
                { title: 'Agent 模式', description: '开启后 AI 可自主执行多步任务' },
                { title: '多标签页', description: '同时处理多个对话，支持拖拽排序' },
                { title: '语音输入', description: '点击麦克风图标进行语音输入' },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-white">{feature.title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex gap-2">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentStep ? 'bg-emerald-400' : 'bg-zinc-600'
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.setItem('mimo-onboarding-complete', 'true')
                onComplete()
              }}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              跳过
            </button>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                上一步
              </button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isCompleting ? '保存中...' : '开始使用'}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function shouldShowOnboarding(): boolean {
  return localStorage.getItem('mimo-onboarding-complete') !== 'true'
}
