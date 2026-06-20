import { Bot, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentIndicatorProps {
  isActive: boolean
  isProcessing?: boolean
  steps?: number
  currentStep?: number
}

export function AgentIndicator({
  isActive,
  isProcessing,
  steps,
  currentStep,
}: AgentIndicatorProps) {
  if (!isActive) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors',
        isProcessing
          ? 'bg-emerald-600/20 border border-emerald-600/30 text-emerald-400'
          : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
      )}
    >
      {isProcessing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Bot className="w-3.5 h-3.5" />
      )}
      <span className="font-medium">Agent 模式</span>
      {isProcessing && steps !== undefined && currentStep !== undefined && (
        <span className="text-emerald-300/70">
          步骤 {currentStep}/{steps}
        </span>
      )}
      {isProcessing && (
        <div className="flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]" />
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]" />
        </div>
      )}
    </div>
  )
}

interface AgentToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

export function AgentToggle({ enabled, onToggle, disabled }: AgentToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
        enabled
          ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
          : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={
        enabled ? '关闭 Agent 模式 (可自主执行多步任务)' : '开启 Agent 模式 (可自主执行多步任务)'
      }
      aria-label={enabled ? '关闭 Agent 模式' : '开启 Agent 模式'}
    >
      <Zap className={cn('w-3.5 h-3.5', enabled && 'text-emerald-400')} />
      <span>Agent</span>
    </button>
  )
}
